---
title: A survey of robots.txt - part one
date: '2017-09-19'
comments: true
---

After reading [CollinMorris's analysis of favicons](https://www.kaggle.com/colinmorris/unusual-favicons-a-brief-survey) of the top 1 million sites on the web, I thought it would be interesting to do the same for other common parts of websites that often get overlooked.

<!--more-->

The `robots.txt` file is a plain text file found at on most websites which communicates information to web crawlers and spiders about how to scan a website.. For example, here's an excerpt from `robots.txt` for `google.com`

```txt
User-agent: *
Disallow: /search
Allow: /search/about
Allow: /search/howsearchworks
...
```

The above excerpt tells all web crawlers not to scan the `/search` path, but allows them to scan `/search/about` and `/search/howsearchworks` paths. There are a few more supported keywords, but these are the most common. Following these instructions is not required, but it is considered good internet etiquette. If you want to read more about the standard, Wikipedia has a great page [here](https://en.wikipedia.org/wiki/Robots_exclusion_standard).

In order to do an analysis of `robots.txt`, first I need to crawl the web for them – ironic, I know.

## Scraping

I wrote a scraper using [scrapy](https://scrapy.org/) to make a request for `robots.txt` for each of the domains in Alexa's top 1 million websites. If the response code was 200, the `Content-Type` header contained `text/plain`, and the response body was not empty, I stored the response body in a file, with the same name as the domain name.

One complication I encountered was that not all domains respond on the same protocol or subdomain. For example, some websites respond on `http://{domain_name}` while others require `http://www.{domain_name}`. If a website doesn't automatically redirect you to the correct protocol or subdomain, the only way to find the correct one, is to try them all! So I wrote a small class, extending scrapy's `RetryMiddleware`, to do this:

```python
COMMON_PREFIXES = {'http://', 'https://', 'http://www.', 'https://www.'}

class PrefixRetryMiddleware(RetryMiddleware):

    def process_exception(self, request, exception, spider):
            prefixes_tried = request.meta['prefixes']
            if COMMON_PREFIXES == prefixes_tried:
                return exception

            new_prefix = choice(tuple(COMMON_PREFIXES - prefixes_tried))
            request = self.update_request(request, new_prefix)

            return self._retry(request, exception, spider)

```

The rest of the scraper itself is quite simple, but you can read the full code [on GitHub](https://github.com/JamieMagee/robots-txt).

## Results

Scraping the full Alexa top 1 million websites list took around 24 hours. Once it was finished, I had just under 700k robots.txt files

```bash
$ find -type f | wc -l
677686
```

totalling 493MB

```bash
$ du -sh
493M    .
```

The smallest `robots.txt` was 1 byte[^1], but the largest was over 5MB.

```bash
$ find -type f -exec du -Sh {} + | sort -rh | head -n 1
5.6M    ./haberborsa.com.tr

$ find -not -empty -type f -exec du -b {} + | sort -h | head -n 1
1    ./0434.cc
```

The full data set is released under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1.0/) and can be found [on GitHub](https://github.com/JamieMagee/robots-txt)

## What's next?

In the next part of this blog series I'm going to analyse all the `robots.txt` to see if I can find anything interesting. In particular I'd like to know why exactly someone needs a `robots.txt` file over 5MB in size, what is the most common web crawler listed (either allowed or disallowed), and are there any sites practising security by obscurity by trying to keep links out of search engines!

[^1]: I needed to include `-not -empty` when looking for the smallest file, as there were errors when decoding the response body for some domains. I've included the empty files in the dataset for posterity, but I will exclude them from further analysis.
