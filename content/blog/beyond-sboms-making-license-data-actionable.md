---
title: 'Beyond SBOMs: making license data actionable with ClearlyDefined'
date: '2026-06-03'
comments: true
---

You're about to ship a product. Legal asks for the third-party notices, so you generate an SBOM, and half the dependencies come back as `NOASSERTION`. You can't put that in a NOTICE file, and legal won't sign off on it. I've spent a lot of late nights writing those files by hand, so this is the talk I gave about the project that saves me from most of them: ClearlyDefined.

SBOMs are great at telling you what's in your software. They're much worse at telling you what you're allowed to do with it. The license fields come from package metadata, and most generators never scan the source, so you get whatever the registry happened to say. Sometimes that's nothing. Sometimes it's wrong.

Take `uuid@9.0.0`. Its `package.json` declares MIT, and your SBOM believes it. But three files in `dist` bundle a tiny md5 implementation Paul Johnston wrote back in 1999, and that's BSD-3-Clause, which has a real attribution clause. Ship uuid without it and your NOTICE file owes him a line you didn't know about. One `curl` to the ClearlyDefined API turns up the discovered licenses and every copyright holder, and if it's still wrong you can file a curation and fix it for everyone downstream.

In the talk I cover where SBOMs fall short, how ClearlyDefined harvests and curates the data, and the handful of ways you're probably already using it (GitHub's license data is built on it). If you maintain an open source library, your definition is how every compliance pipeline sees your project, so it's worth five minutes to check.

{{< lite-youtube videoid="gUF1kgGmFx4" videotitle="Beyond SBOMs: making license data actionable with ClearlyDefined" />}}
