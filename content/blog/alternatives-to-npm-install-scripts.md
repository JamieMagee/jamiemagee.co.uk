---
title: What to use instead of npm install scripts
date: 2026-06-09
draft: true
---

I wrote [the npm RFC](https://github.com/npm/rfcs/blob/main/accepted/0054-make-scripts-install-opt-in.md) that's about to break your `postinstall`. Sorry.

From npm v12, dependency install scripts stop running by default. If you maintain a package that does anything at install time, that includes yours: your `postinstall` won't fire on anyone else's machine unless they go out of their way to allow it. The good news is that almost everything people reach for an install script to do has a better home, and most of the ecosystem moved there years ago. Almost none of it needs an install script anymore.

## What's actually changing

[npm v12](https://github.blog/changelog/2026-06-09-upcoming-breaking-changes-for-npm-v12/), estimated for July 2026, makes dependency install scripts opt-in instead of opt-out. When someone runs `npm install`, npm stops running the `preinstall`, `install`, and `postinstall` scripts from your package. That includes the implicit `node-gyp rebuild` npm fires when it spots a `binding.gyp`, and the `prepare` script when your package is installed straight from a git URL. It's already in npm 11.16.0 behind warnings, so you can see what breaks today.

Consumers opt back in per package, with a new `allowScripts` map in their `package.json`:

```json
{
  "allowScripts": {
    "esbuild": true,
    "core-js": false
  }
}
```

They build that list with `npm approve-scripts`, and preview what's currently blocked with `npm approve-scripts --allow-scripts-pending`. Your own project's scripts still run; this only ever applies to dependencies. And `--ignore-scripts` still turns everything off, same as before.

None of this is my invention. npm is the last of the big package managers to flip the default: pnpm blocks build scripts unless you list them in `onlyBuiltDependencies`, and Yarn and Bun have their own allowlists in `dependenciesMeta` and `trustedDependencies`. A good chunk of the RFC was just writing down what already worked everywhere else.

The reason I bothered: an install script runs arbitrary code the moment a package lands in `node_modules`, before you've imported a single line of it. event-stream, the chalk and debug hijack, the Shai-Hulud worm — every one of them executed on `npm install`, on machines whose owners never knowingly ran the malicious code. Making it opt-in won't stop supply-chain attacks, but it takes the laziest path off the table. That was the pitch, and the npm team agreed.

## Where the work should actually go

Strip away the security argument and almost every install script is doing one of two jobs: producing a file, or fetching one. Both have a better home than your install step.

If the script produces a static artifact, like compiled JS or generated types, do it once at publish time and ship the result in your tarball. If it sets up or fetches something that's only needed when the package actually runs, defer it to first use or an explicit command. The one thing you can't count on anymore is running code on someone else's `npm install`. Work backwards from that and the alternatives mostly pick themselves.

## Shipping native binaries

You already see this everywhere: esbuild, Rollup, turbo, Biome, lightningcss. Instead of compiling or downloading a binary in a `postinstall`, publish one package per platform and list them all in `optionalDependencies`:

```json
{
  "optionalDependencies": {
    "@esbuild/darwin-arm64": "0.28.0",
    "@esbuild/linux-x64": "0.28.0",
    "@esbuild/win32-x64": "0.28.0"
  }
}
```

Each platform package declares the platform it's built for, so npm installs only the one that matches:

```json
{
  "name": "@esbuild/darwin-arm64",
  "os": ["darwin"],
  "cpu": ["arm64"]
}
```

At runtime your main package works out which one npm installed and `require.resolve()`s the binary out of it. No script anywhere — the binary is just sitting in `node_modules`.

One caveat. esbuild, `@swc/core`, and sharp still ship a `postinstall`, so don't copy them without looking. In their case the script is only a fallback for source builds and unusual platforms; the binary itself still arrives through `optionalDependencies`. turbo, Biome, Rollup, and lightningcss drop the script entirely, and that's the target to aim for.

This is also where `node-gyp` tooling bites you. `node-gyp-build`, `prebuild-install`, and `node-pre-gyp` all hang their work off an `install` script, so they stop working under the new default. If you can't ship a prebuilt binary for some platform, a WASM build like `esbuild-wasm` is a script-free fallback that runs anywhere.

## Downloading big things

If your package needs a browser, a model file, or any other large blob, don't grab it in a `postinstall`. Fetch it on first run, or make the user ask for it.

[Playwright](https://playwright.dev/docs/browsers#install-browsers) is the model here. Installing the npm package downloads zero browsers. You run `npx playwright install` when you want them, and if you forget, the first test tells you exactly what to run. Puppeteer and Cypress still default to a `postinstall` download, but both give you an opt-out (`PUPPETEER_SKIP_DOWNLOAD`, `CYPRESS_INSTALL_BINARY=0`) and an explicit install command. Under opt-in scripts the auto-download won't fire anyway, so the explicit path is the one worth documenting.

## Building your package

If you compile TypeScript in a `prepare` or `postinstall` so people can install from your git repo, just ship the build instead. Compile at publish time and include the output with the `files` field:

```json
{
  "main": "./dist/index.js",
  "files": ["dist"]
}
```

Run the build from `prepublishOnly`, and the registry tarball already contains `dist/`. axios and zod both work this way: the published package is prebuilt, with nothing to run on the consumer's side. The only reason to keep a build-on-install path is `prepare`, and only for people installing your package straight from git rather than the registry.

## Patching a dependency

`patch-package` is the classic `postinstall`, and it's exactly the kind of thing that's about to stop working. It's also no longer actively maintained. Every package manager now patches natively: pnpm has `pnpm patch` writing to `patchedDependencies`, Yarn has its `patch:` protocol, and npm has native patching on the way via [an accepted RFC](https://github.com/npm/rfcs/blob/main/accepted/0053-native-dependency-patching.md), though it hasn't shipped yet. And if you only need to pin or swap a transitive dependency rather than edit its code, npm `overrides` already does that today with no script at all.

## Git hooks

husky, lefthook, and the rest used to install git hooks from a `postinstall`. But hooks only matter to people working on your repo, not to anyone installing your package, so set them up in your own project's `prepare` script, which still runs. `npx husky init` does exactly this, writing `"prepare": "husky"` into your `package.json`. If you publish the package, add `pinst` so that `prepare` script gets stripped from the tarball and never reaches consumers. With no tooling at all, you can commit a hooks directory and point git at it with `git config core.hooksPath`.

## Checking the Node version

If you've got a `preinstall` that checks the Node version, delete it and use `engines`:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

It's data instead of code. npm warns on a mismatch by default, and a consumer who wants a hard failure sets `engine-strict=true`. If you genuinely need to block an unsupported runtime, a one-line check at the top of your entry point does it without going anywhere near install.

## Funding messages

And the one everyone loves to hate: the `postinstall` that prints a donation banner. OpenCollective itself [stopped recommending these back in 2019](https://github.com/opencollective/opencollective/issues/2391), and the replacement is the [`funding` field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#funding):

```json
{
  "funding": {
    "type": "opencollective",
    "url": "https://opencollective.com/your-project"
  }
}
```

Anyone can run `npm fund` to see the funding links across their whole dependency tree, on demand, instead of having your message printed in their terminal on every install. core-js still ships the banner. Most of the ecosystem moved on.

## The short version

| If you used a script to... | Do this instead |
| --- | --- |
| compile or download a native binary | `optionalDependencies` with per-platform `os`/`cpu` packages, or a WASM build |
| download a browser or large asset | fetch on first run, or behind an explicit install command |
| build your package for git installs | ship a prebuilt `dist/` via `files`, built in `prepublishOnly` |
| patch a dependency | `npm overrides`, `pnpm patch`, or Yarn's `patch:` |
| install git hooks | your own `prepare` script, or `git config core.hooksPath` |
| check the Node version | the `engines` field |
| print a funding message | the `funding` field and `npm fund` |

None of these are new, which is exactly why I felt OK proposing the change. The ecosystem has been drifting off install scripts for years; v12 just makes the drift official. So if you maintain something with a `postinstall`, install npm 11.16.0, run it against your own package, and see what lights up. Far nicer to find out now, on your own terms, than when v12 lands and your users find out for you.
