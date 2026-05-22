---
title: "A new way to catch a vulnerable .NET SDK"
date: 2026-05-22
---

When NuGet finds a vulnerable package in your project, it tells you. [`NU1901` through `NU1904`](https://learn.microsoft.com/nuget/reference/errors-and-warnings/nu1901-nu1904) have warned about CVEs in your dependencies for a while now. The SDK that runs the build, though? That's been a blind spot. You can sit on a perfectly patched set of packages and still be running `dotnet build` with an SDK that went end of life last May.

That always struck me as a gap worth closing. So I decided to fix it.

## What you get

In the 11.0 preview 5 SDK, you opt in with one property:

```xml
<PropertyGroup>
  <CheckSdkVulnerabilities>true</CheckSdkVulnerabilities>
</PropertyGroup>
```

Drop that into your `Directory.Build.props` and the next build checks the SDK you're using. If anything's off, you get one of three warnings:

- `NETSDK1238`: the SDK has known CVEs
- `NETSDK1239`: the SDK is end of life
- `NETSDK1240`: your feature band has no newer release, even though the channel is still supported

It's the same data [`dotnet sdk check`](https://learn.microsoft.com/dotnet/core/tools/dotnet-sdk-check) already surfaces, just folded into the build so it lands in your CI logs and your editor's Problems pane without anyone having to remember a separate command.

The point isn't to nag. It's that "is my toolchain patched?" should be answerable by the build, the same way "are my packages patched?" already is. If you scan your dependency graph for CVEs but not your compiler, you're only checking half of the supply chain.

## Suppressing the noise

If you genuinely need to pin to an out-of-support SDK for a bit, suppress the specific code rather than the whole check:

```xml
<NoWarn>$(NoWarn);NETSDK1239</NoWarn>
```

That keeps `NETSDK1238` firing for real CVEs while you sort out the EOL story on your own timeline.

## What's next

Opt-in is the right starting point, but it isn't the end goal. I'd like to wire this into `dotnetup` so the warning can point you at an upgrade you can actually run, rather than a download page. Once that lands, flipping the default to on becomes a much easier conversation.

In the meantime, give it a go on `11.0.100-preview.5`.
