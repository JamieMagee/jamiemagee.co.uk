---
title: Are we attested yet?
date: '2026-02-02'
comments: true
---

npm has supported provenance attestations since April 2023. That's almost three years. Trusted publishing went GA in July 2025. So when I saw [the GitHub announcement](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/), I wanted to know: how many of the most-downloaded packages in the ecosystem have actually adopted this?

The answer is disappointing.

I built [Are we attested yet?](https://jamiemagee.github.io/are-we-attested-yet/) to track the top 500 npm packages and their attestation status. It's inspired by Trail of Bits' [Are we PEP 740 yet?](https://trailofbits.github.io/are-we-pep740-yet/), which does the same thing for Python. The results for npm aren't pretty.

## The state of attestations

The site breaks packages into four categories:

- **Green**: has attestations for the latest release
- **Grey**: last published before attestations existed (April 2023)
- **Yellow**: published from a supported platform, but no attestations
- **Pink**: published from somewhere that can't generate attestations

Grey and pink are understandable. If a package hasn't been updated since 2022, or if the maintainer publishes from their laptop, there's no way to have attestations. But yellow? Those are packages that could have attestations today, with minimal effort, and don't.

Some of the most downloaded packages in the npm ecosystem are yellow. These aren't obscure utilities. They're packages with millions of weekly downloads, backed by well-funded companies with dedicated engineering teams. Enabling attestations is a one-time setup that takes maybe fifteen minutes. For packages already publishing from GitHub Actions, it's often just adding `--provenance` to the publish command.

## What attestations actually give you

When a package has attestations, you can verify:

- Which repository the code came from
- Which commit was built
- Which CI workflow published it
- That nobody tampered with the package between build and registry

This matters because supply chain attacks are real. The [event-stream incident](https://blog.npmjs.org/post/180565383195/details-about-the-event-stream-incident) in 2018 showed how a compromised maintainer account could inject malicious code. The [xz utils backdoor](https://en.wikipedia.org/wiki/XZ_Utils_backdoor) in 2024 showed how patient attackers can be. Attestations don't prevent everything, but they create an audit trail that makes certain attacks much harder to pull off quietly.

## Why adoption is still low

Part of the blame falls on npm itself. Enabling trusted publishing requires navigating to your package settings on npmjs.com, finding the right section, and configuring the trust relationship. It's not hard, but it's also not obvious. There's no prompt when you publish without attestations. No warning. No nudge.

Compare this to how GitHub handles security features. Enable Dependabot? One click. Enable secret scanning? One click. npm could email maintainers of popular packages. They could add a banner to the package page. They could make attestation status visible to users who are deciding whether to trust a package. Instead, you have to actively seek out the feature.

The `--provenance` flag has been available for almost three years now. If you're publishing from GitHub Actions, adding it costs nothing. You don't need to change your auth setup. You don't need to adopt trusted publishing. Just add `--provenance` to your publish command and you're done. And yet.

## Enabling attestations for your packages

If you maintain npm packages, here's the short version:

Already using GitHub Actions or GitLab CI to publish? Add `--provenance` to your `npm publish` command. That's it. You'll get attestations on your next release.

Want to go further? Set up trusted publishing. You'll get attestations automatically, plus you can delete your npm tokens entirely. The setup is:

1. Go to package settings on npmjs.com
2. Add a trusted publisher (org, repo, workflow filename)
3. Add `id-token: write` permission to your workflow
4. Remove your `NPM_TOKEN` secret

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
      - run: npm ci
      - run: npm publish
```

No token. No `--provenance` flag. It just works.

## What's next

I'll keep updating [the site](https://jamiemagee.github.io/are-we-attested-yet/) as packages adopt attestations. Hopefully the yellow section shrinks over time. If npm decides to make this more visible, or nudges maintainers in the right direction, adoption could accelerate.

Until then, if you see a package you depend on in the yellow list, consider opening an issue. Sometimes all it takes is someone asking.
