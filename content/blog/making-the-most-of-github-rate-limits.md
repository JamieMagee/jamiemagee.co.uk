---
title: Making the most of GitHub rate limits
date: 2022-07-26T08:19:08.672Z
comments: true
---
The GitHub documentation has a lot of good advice about rate limits for its API, and how to make the most of them. However, since using the GitHub API, there are some things I’ve discovered that the documentation doesn’t cover, or doesn’t cover so well.

## Conditional requests

This topic is actually covered very well in [the GitHub documentation](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#conditional-requests). To summarise, all REST API requests will return `ETag` headers, and most will return `Last-Modified`. You can make use of these by making subsequent requests with the `If-None-Match` and `If-Modified-Since` headers respectively. If the resource hasn’t been modified, you’ll get back a `304 Not Modified` response, and the request won't count against your rate limit.

To show you what I mean, here’s a short example:

```bash
$ curl -I -H "Authorization: token ..." "https://api.github.com/user
< HTTP/2 200
< etag: "0c05f6422602a76a6671b28fc70af0ff9775ee41c80aca7d527814bb79a0fc2c"
< last-modified: Mon, 21 Feb 2022 17:25:59 GMT
< x-ratelimit-limit: 5000
< x-ratelimit-remaining: 4993
< x-ratelimit-reset: 1645482669

$ curl -I -H "If-None-Match: \"0c05f6422602a76a6671b28fc70af0ff9775ee41c80aca7d527814bb79a0fc2c\"" -H "Authorization: token ..." "https://api.github.com/user"
< HTTP/2 304
< etag: "0c05f6422602a76a6671b28fc70af0ff9775ee41c80aca7d527814bb79a0fc2c"
< last-modified: Mon, 21 Feb 2022 17:25:59 GMT
< x-ratelimit-limit: 5000
< x-ratelimit-remaining: 4993
< x-ratelimit-reset: 1645482669

$ curl -I -H "If-Modified-Since: Mon, 21 Feb 2022 17:25:59 GMT" -H "Authorization: token ..." "https://api.github.com/user"
< HTTP/2 304
< last-modified: Mon, 21 Feb 2022 17:25:59 GMT
< x-ratelimit-limit: 5000
< x-ratelimit-remaining: 4993
< x-ratelimit-reset: 1645482669
```

The first request uses one request of my rate limit, taking it from 4994 to 4993. But the next two requests use `If-None-Match` and `If-Modified-Since` headers, so my rate limit is still 4993.

Unfortunately, conditional requests are only available for the REST API. HTTP caching over GraphQL is [not a simple problem](https://www.apollographql.com/blog/backend/caching/graphql-caching-the-elephant-in-the-room/), and it’s unlikely that GitHub will ever support it.

## Prefer `If-Modified-Since`

The GitHub REST API documentation covers conditional requests pretty well. The reason I'm mentioning it? Well, the documentation says that you can use `ETag` or `If-Modified-Since` interchangeably—but they're not equivalent. Take a look at this example:

```bash
$ curl -I -H "Authorization:token ..." "https://api.github.com/repos/renovatebot/renovate/releases/latest"
< HTTP/2 200
< etag: "70eb55000ec3e69bc2d88079714612000a955d4afaf02643b6602d99fb60dd8d"
< last-modified: Mon, 21 Feb 2022 21:47:30 GMT
```

And if I make the same request a little bit later…

```bash
$ curl -I -H "Authorization:token ..." "https://api.github.com/repos/renovatebot/renovate/releases/latest"
< HTTP/2 200
< etag: "85f04330d7bca80e6e0d62ac1b41b6d57e2ff11744565655e46732d44736dba6"
< last-modified: Mon, 21 Feb 2022 21:47:30 GMT
```

The ETag is different but the Last-Modified time is still the same as before. Based on [this StackOverflow question](https://stackoverflow.com/questions/28060116/which-is-more-reliable-for-github-api-conditional-requests-etag-or-last-modifie/57309763#57309763), it appears as if this has been an issue for a while. So if a response has both an `ETag` and a `Last-Modified` time, I’d recommend using the `Last-Modified` time to make conditional requests.

## Both REST and GraphQL

Saying “rate limit” isn’t really accurate. What I actually mean is “rate limits”. GitHub actually has nine different rate limits. Some are for very specific use cases, like [`integration_manifest`](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app-from-a-manifest#3-you-exchange-the-temporary-code-to-retrieve-the-app-configuration) for the GitHub App Manifest code conversion endpoint. But the two that are most useful are `core` (AKA REST) and `graphql`.

If I make a request to the [rate limit endpoint](https://docs.github.com/en/rest/rate-limit), you can see all the different rate limits.

```json
{
  "resources": {
    "core": {
      "limit": 5000,
      "used": 0,
      "remaining": 5000,
      "reset": 1656981763
    },
    "search": {
      "limit": 30,
      "used": 0,
      "remaining": 30,
      "reset": 1656978223
    },
    "graphql": {
      "limit": 5000,
      "used": 38,
      "remaining": 4962,
      "reset": 1656979534
    },
    "integration_manifest": {
      "limit": 5000,
      "used": 0,
      "remaining": 5000,
      "reset": 1656981763
    },
    "source_import": {
      "limit": 100,
      "used": 0,
      "remaining": 100,
      "reset": 1656978223
    },
    "code_scanning_upload": {
      "limit": 1000,
      "used": 0,
      "remaining": 1000,
      "reset": 1656981763
    },
    "actions_runner_registration": {
      "limit": 10000,
      "used": 0,
      "remaining": 10000,
      "reset": 1656981763
    },
    "scim": {
      "limit": 15000,
      "used": 0,
      "remaining": 15000,
      "reset": 1656981763
    },
    "dependency_snapshots": {
      "limit": 100,
      "used": 0,
      "remaining": 100,
      "reset": 1656978223
    }
  },
  "rate": {
    "limit": 5000,
    "used": 0,
    "remaining": 5000,
    "reset": 1656981763
  }
}
```

The REST API has a rate limit of [5000 requests per hour](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting). Separately, the GraphQL API has a rate limit of [5000 points per hour](https://docs.github.com/en/graphql/overview/resource-limitations#rate-limit).

Depending on what API calls you want to make, you can intelligently split them across the REST and GraphQL APIs to achieve a higher overall limit. For example, if a GraphQL call is going to cost a lower number of points than the number of REST calls required to get the same data, you should make those calls via the GraphQL API. You should also bear in mind that you can make conditional requests to the REST API, but not to the GraphQL API.

## Maximise page size

Whenever you’re making a request to an endpoint with pagination, you should check what the maximum results per page are and set your query parameter to that size.

The default size for most endpoints is 30 results, but the maximum size is often 100. If you forget to set this you might need to make four times as many requests to get the same number of results.

## Use sorting

Most API calls allow you to sort them based on a date field when querying an endpoint. If you use this—and do some caching on your end as well—you can avoid having to fetch all pages for a request whenever you have a cache request.

For example, if you need to fetch the most recently changed pull requests for a repository, you should be sorting by `updated` and storing a local cache of pull requests. That way a conditional request cache miss won’t require you to fetch all the pages of a request. You can compare each page to your local cache, and only fetch the next page if required.

## Use `HEAD` requests

This tip isn’t strictly about rate limits, but is useful when you’re eking out every last bit of performance. Nearly all GitHub REST API endpoints support `HEAD` requests, in addition to the other HTTP verbs. If you’re already using conditional requests, you can avoid having the body of a request sent over the wire by sending a `HEAD` request instead.

For example, here’s the header and body size for a `GET` request:

```bash
$ curl -w \%{size_header}:\%{size_download} -s -o /dev/null -H "Authorization:token ..." "https://api.github.com/repos/renovatebot/renovate/releases"
1448:137229
```

And here’s the header and body size for the `HEAD` equivalent:

```bash
$ curl -w \%{size_header}:\%{size_download} -s -o /dev/null -H "Authorization:token ..." "https://api.github.com/repos/renovatebot/renovate/releases"
1448:0
```

By making a `HEAD` request instead of a `GET` request, you can avoid being sent 137KB.

There is a trade-off, though. If you use conditional requests and have a cache miss, you’ll have to make the `GET` request anyway.

## Summing up

Using these methods I’ve managed to eke out every bit of performance of the GitHub API for my integrations. Let me know what methods you use, or if there’s anything I’ve missed.
