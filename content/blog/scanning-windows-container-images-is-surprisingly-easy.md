---
title: Scanning Windows container images is (surprisingly) easy!
date: '2023-01-02'
comments: true
---

When it comes to Linux containers, there are plenty of tools out there that can scan container images, generate Software Bill of Materials (SBOM), or list vulnerabilities. However, Windows container images are more like the forgotten stepchild in the container ecosystem. And that means we’re forgetting the countless developers using Windows containers, too.

I wanted to see what I’d need to make scanning tools for Windows container images. Turns out it’s pretty easy. So easy, in fact, I think the existing container tools should add support for Windows container images.

## What version of Windows am I running?

The first question I needed to answer was: what version of Windows was the container image based on? This tells me what date the container image is from, what updates are applicable, and what vulnerabilities it has.

Container images are really just `tar` files, and Windows container images are no different. So first I saved a Windows container image locally using skopeo:

```shell
$ skopeo --insecure-policy --override-os windows copy docker://mcr.microsoft.com/windows/nanoserver:ltsc2022 dir:///tmp/nanoserver
$ ls /tmp/nanoserver
0db1879370e5c72dae7bff5d013772cbbfb95f30bfe1660dcef99e0176752f1c  7d843aa7407d9a5b1678482851d2e81f78b08185b72c18ffb6dfabcfed383858 manifest.json version
```

Next, I inspected the manifest using jq to find the layer that had the Windows files.

```shell
$ jq . manifest.json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "config": {
    "mediaType": "application/vnd.docker.container.image.v1+json",
    "size": 638,
    "digest": "sha256:0db1879370e5c72dae7bff5d013772cbbfb95f30bfe1660dcef99e0176752f1c"
  },
  "layers": [
    {
      "mediaType": "application/vnd.docker.image.rootfs.foreign.diff.tar",
      "size": 304908800,
      "digest": "sha256:7d843aa7407d9a5b1678482851d2e81f78b08185b72c18ffb6dfabcfed383858"
    }
  ]
}
```

I then extracted the layer and fixed the permissions.

```shell
$ mkdir layer
$ tar -xf 7d843aa7407d9a5b1678482851d2e81f78b08185b72c18ffb6dfabcfed383858 -C ./layer/
$ sudo find ./layer -type f -exec chmod 0644 {} \;
$ sudo find ./layer -type d -exec chmod 0755 {} \;
$ ls -lah layer/
total 16K
drwxr-xr-x 4 jamie users 4.0K Dec 28 15:05 .
drwxr-xr-x 3 jamie users 4.0K Dec 28 15:00 ..
drwxr-xr-x 5 jamie users 4.0K Dec  9 01:18 Files
drwxr-xr-x 3 jamie users 4.0K Dec  9 01:22 UtilityVM
$ ls -lah layer/Files/
total 28K
drwxr-xr-x  5 jamie users 4.0K Dec  9 01:18 .
drwxr-xr-x  4 jamie users 4.0K Dec 28 15:05 ..
-rw-r--r--  1 jamie users 5.6K Dec  9 01:18 License.txt
drwxr-xr-x  4 jamie users 4.0K May  7  2021 ProgramData
drwxr-xr-x  6 jamie users 4.0K Dec  9 01:19 Users
drwxr-xr-x 20 jamie users 4.0K Dec  9 01:19 Windows
```

Inside the extracted layer there are two directories: `Files` and `UtilityVM`. `Files` had the filesystem of the Windows container image, while `UtilityVM` is used by Hyper-V behind the scenes. So I just needed to focus on `Files`.

How did I figure out the specific version of Windows the container is running? From the registry of course! The `SOFTWARE` registry hive contained information about installed software, including Windows itself, and was found at `Files/Windows/System32/config/SOFTWARE`.

Thankfully, there’s a great NuGet package called [Registry](https://github.com/EricZimmerman/Registry) that let me easily load and parse the registry, but there are also packages for [Go](https://pkg.go.dev/golang.org/x/sys/windows/registry), [Rust](https://github.com/bbqsrc/registry-rs), and even [Node.js](https://github.com/ironSource/node-regedit).

{{< gist JamieMagee a12ce294862eb96135c123381a6aa438 "windows-1.cs" >}}

Running this code, I got version `10.0.20348.1366` which was [apparently released on 13th December 2022](https://twitter.com/ChangeWindows/status/1602752823116333056).

## What about Windows updates?

The version of Windows doesn’t tell the whole story. There are also updates that can be applied on top. You might have seen them referred to by their KB number, for example KB1234567. Information on what updates have been applied is also stored in the registry.

By extending my earlier code, I can find out what updates this container image has.

{{< gist JamieMagee a12ce294862eb96135c123381a6aa438 "windows-2.cs" >}}

Running this gave me a single update: `KB5020373: 20348.1300.1.0`. Searching online for [KB5020373](https://support.microsoft.com/en-gb/topic/november-8-2022-kb5020613-cumulative-update-for-net-framework-3-5-and-4-8-for-windows-10-version-20h2-windows-10-version-21h1-windows-10-version-21h2-and-windows-10-version-22h2-3880a78d-3b33-429a-93fc-eeb0c40b4ad4) led me to the documentation for the update. It’s the November 2022 security update for .NET Framework and has a fix for [CVE-2022-41064](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2022-41064).

## Done! ...Now what if we scaled this?

It turns out it’s not that difficult to find out info about Windows container images. It took me a couple of hours to figure out, but that’s only because no one seems to have done this before. The actual code is only about 30 lines.

Windows containers are widely used for legacy applications, like .NET Framework applications, that haven’t been rewritten but could benefit from the cloud. All of the big three cloud providers offer managed Kubernetes services that support Windows nodes out of the box (yes, [Kubernetes supports Windows nodes](https://kubernetes.io/docs/concepts/windows/intro/#windows-os-version-support)). There is clearly a demand for Windows containers, but there is a gap in the kind of container tooling that has sprung up for Linux containers.

Instead of allowing this gap to widen further, I think that container tool authors—especially SBOM tools and vulnerability scanners—should add support for Windows container images. These tools should then correlate the extracted information with the [Microsoft Security Research Center (MSRC) API](https://api.msrc.microsoft.com/cvrf/v2.0/swagger/index). MSRC publishes information every month on security updates. Comparing the Windows version from a container image with the fixed versions provided by the MSRC API, you could easily see your container image’s security vulnerabilities.

As my proof-of-concept has shown, it’s low-hanging fruit. A small addition that would have a big impact for the many forgotten developers and the applications they work on.