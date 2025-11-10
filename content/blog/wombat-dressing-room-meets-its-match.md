---
title: Wombat Dressing Room meets its match
date: '2025-11-10'
comments: true
---

Back in January 2020, Google [open sourced Wombat Dressing Room](https://opensource.googleblog.com/2020/01/wombat-dressing-room-npm-publication_10.html), an npm proxy that solved a fundamental problem: how do you maintain two-factor authentication for npm packages while still using automation? For teams managing dozens or hundreds of packages, manually entering 2FA codes for every publish wasn't just inconvenient—it was a dealbreaker. Fast forward to 2025, and npm has finally introduced native support for trusted publishing using OIDC. Which begs the question: is Wombat Dressing Room still necessary?

## The problem Wombat Dressing Room solved

npm has supported two-factor authentication for a long time. But 2FA presents a fundamental challenge for automation. You need "something you know" (a password) and "something you have" (a code from an authenticator app). That second factor is difficult to automate, leading many teams to simply disable 2FA in their CI/CD pipelines.

Wombat Dressing Room took a different approach. Rather than bypassing 2FA, it created a shared proxy server that managed 2FA centrally and provided three key security features:

### Per-package tokens

The proxy could generate authentication tokens tied to specific GitHub repositories. If a token leaked, an attacker could only compromise the single package associated with that token—not your entire npm account.

### Limited lifetime tokens

Tokens could be configured with a 24 hour lifespan. Even if compromised, the window of vulnerability was limited.

### GitHub Releases as 2FA

This was the clever bit. Packages could only be published if a corresponding GitHub release with a matching tag existed. This introduced a true "second factor", proving access to both the proxy and the GitHub repository.

## Enter npm trusted publishing

In 2025, npm rolled out [trusted publishing](https://docs.npmjs.com/trusted-publishers/), implementing the [OpenSSF trusted publishers standard](https://repos.openssf.org/trusted-publishers-for-all-package-repositories). It uses OpenID Connect (OIDC) to create a trust relationship between npm and your CI/CD provider. When configured, npm accepts publishes from authorized workflows without requiring long-lived tokens.

The security benefits are immediately obvious. Traditional npm tokens can be accidentally exposed in CI logs, require manual rotation, and provide persistent access until revoked. Trusted publishing eliminates all of this by using short-lived tokens that are specific to your workflow and can't be extracted or reused.

## Setting it up

The setup process is pretty straightforward. First, you configure a trusted publisher on npmjs.com by specifying your GitHub organization, repository, and workflow filename. Then you update your workflow to request the necessary OIDC permissions:

```yaml
name: Publish Package
on:
  push:
    tags:
      - 'v*'

permissions:
  id-token: write  # Required for OIDC
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - run: npm ci

      - run: npm publish
```

That's it. No more `NPM_TOKEN` secrets, no more token rotation, no more worrying about accidentally leaking credentials. The npm CLI automatically detects the OIDC environment and handles authentication.

There's one critical requirement: you need npm CLI version 11.5.1 or later. But if you're using a reasonably recent version of Node.js, you're already covered.

## Automatic provenance generation

One bonus feature of trusted publishing deserves special mention: automatic provenance generation. When you publish using OIDC from a public repository, npm automatically generates and publishes [provenance attestations](https://docs.npmjs.com/generating-provenance-statements) for your package. You don't need to add the `--provenance` flag—it just happens.

Provenance provides cryptographic proof of where and how your package was built, allowing users to verify its authenticity. This transparency is becoming increasingly important as supply chain attacks grow more sophisticated.

## Looking ahead

The introduction of trusted publishing represents a significant maturation of the npm ecosystem. By implementing the OpenSSF standard, npm joins PyPI, RubyGems, and other major package registries in offering OIDC-based publishing. This standardisation makes it easier for developers working across multiple ecosystems to apply consistent security practices.

Wombat Dressing Room served the community well for over five years, bridging the gap between security requirements and automation needs. Now that npm has addressed those needs natively, the project's retirement feels less like an ending and more like a success story. The best infrastructure tools are those that eventually become unnecessary because their functionality gets absorbed into the platform itself.

If you're still using long-lived npm tokens in your CI/CD pipelines, trusted publishing is worth the upgrade. The setup is straightforward, the security benefits are substantial, and you'll never have to worry about token rotation again. And if you need any additional validation beyond what trusted publishing provides, you can always implement those checks directly in your workflow.
