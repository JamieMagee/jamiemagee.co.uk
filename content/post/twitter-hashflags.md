---
title: Twitter Hashflags (_Hash-what?_)
date: '2018-03-28'
comments: true
---

Have you ever tweeted out a hastag, and discovered a small image attached to the side of it? It could be for [#StPatricksDay](https://twitter.com/HashflagArchive/status/972005822388514818), [#MarchForOurLives](https://twitter.com/HashflagArchive/status/972170656912723969), or whatever [#白白白白白白白白白白](https://twitter.com/HashflagArchive/status/960529700442566656) is meant to be. These are hashflags.

<!--more-->

A hashflag, sometimes called Twitter emoji, is a small image that appears after a #hashtag for special events. They are not regular emoji, and you can only use them on the Twitter website, or the official Twitter apps. For example:

{{< tweet 965399443733278720 >}}

If you're a company, and [you have enough money](http://www.adweek.com/digital/twitters-branded-emojis-come-million-dollar-commitment-169327/), you can buy your own hashflag as well! That's exactly what Disney did for the release of Star Wars: The Last Jedi.

{{< tweet 935573161051152385 >}}

If you spend the money to buy a hashflag, it's important that you launch it correctly—otherwise they can flop. [#白白白白白白白白白白](https://twitter.com/HashflagArchive/status/960529700442566656) is an example of what not to do. At time of writing, it has only 10 uses.

Hashflags aren't exclusive to English, and they can help add context to a tweet in another language. I don't speak any Russian, but I do know that this image is of BB-8!

{{< tweet 956184319206273024 >}}

Unfortunately hashflags are temporary, so any context they add to a tweet can sometimes be lost at a later date. Currently Twitter doesn't provide an official API for hashflags, and there is no canonical list of currently active hashflags. [@hashflaglist](https://twitter.com/hashflaglist) tracks hashflags, but it's easy to miss one—this is where Azure Functions come in.

It turns out that on [Twitter.com](https://twitter.com) the list of currently active hashflags is sent as a JSON object in the HTML as initial data. All I need to do is fetch Twitter.com, and extract the JSON object from the HTML.

```bash
$ curl https://twitter.com -v --silent 2>&1 | grep -o -P '.{6}activeHashflags.{6}'

&quot;activeHashflags&quot;
```

I wrote [some C#](https://github.com/JamieMagee/hashflags-function/blob/master/hashflags/ActiveHashflags.cs) to parse and extract the `activeHashflags` JSON object, and store it in an Azure blob. You can find it [here](https://hashflags.blob.core.windows.net/json/activeHashflags). Using Azure Functions I can run this code on a timer, so the Azure blob is always up to date with the latest Twitter hashflags. This means the blob can be used as an unofficial Twitter hashflags API—but I didn't want to stop there.

I wanted to solve some of the issues with hashflags around both discovery and durability. Azure Functions is the perfect platform for these small, single purpose pieces of code. I ended up writing five Azure Functions in total—all of which can be found [on GitHub](https://github.com/JamieMagee/hashflags-function).

[![Screenshot of hashflags-function GitHub page](/img/hashflags-function-github.png)](https://github.com/JamieMagee/hashflags-function)

1. `ActiveHashflags` fetches the active hashflags from Twitter, and stores them in a JSON object in an Azure Storage Blob. You can find the list of current hashflags [here](https://hashflags.blob.core.windows.net/json/activeHashflags).
2. `UpdateHashflagState` reads the JSON, and updates the hashflag table with the current state of each hashflag.
3. `StoreHashflagImage` downloads the hashflag image, and stores it in a blob store.
4. `CreateHeroImage` creates a hero image of the hashtag and hashflag.
5. `TweetHashflag` tweets the hashtag and hero image.

Say hello to [@HashflagArchive](https://twitter.com/HashflagArchive)!

[![Screenshot of HashflagArchive Twitter stream](/img/hashflag-archive.png)](https://twitter.com/HashflagArchive)

@HashflagArchive solves both the issues I have with hashflags: it tweets out new hashflags the same hour they are activated on twitter, which solves the issue of discovery; and it tweets an image of the hashtag and hashflag, which solves the issue of hashflags being temporary.

So this is great, but there's still one issue—how to use hashflags outside of Twitter.com and the official Twitter apps. This is where the JSON blob comes in. I can build a wrapper library around that, and then using that library, build applications with Twitter hashflags. So that's exactly what I did.

[![Screenshot of hashflags-node GitHub page](/img/hashflags-node-github.png)](https://github.com/JamieMagee/hashflags-node)

I wrote an npm package called [`hashflags`](https://www.npmjs.com/package/hashflags). It's pretty simple to use, and integrates nicely with the official [`twitter-text` ](https://www.npmjs.com/package/twitter-text) npm package.

```ts
import { Hashflags } from 'hashflags';

let hf: Hashflags;
Hashflags.FETCH().then((val: Map<string, string>) => {
  hf = new Hashflags(val);
  console.log(hf.activeHashflags);
});
```

I wrote it in TypeScript, but it can also be used from plain old JS as well.

```js
const Hashflags = require('hashflags').Hashflags;

let hf;
Hashflags.FETCH().then(val => {
  hf = new Hashflags(val);
  console.log(hf.activeHashflags);
});
```

So there you have it, a quick introduction to Twitter hashflags via Azure Functions and an npm library. If you've got any questions please leave a comment below, or reach out to me on Twitter [@Jamie_Magee](https://twitter.com/Jamie_Magee).
