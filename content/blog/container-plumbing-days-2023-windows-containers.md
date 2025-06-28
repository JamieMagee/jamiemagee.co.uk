---
title: 'Container Plumbing Days 2023—Windows containers: The forgotten stepchild'
date: '2023-05-05'
comments: true
---

When it comes to Linux containers, there are plenty of tools out there that can scan container images, generate Software Bill of Materials (SBOM), or list vulnerabilities. However, Windows container images are more like the forgotten stepchild in the container ecosystem. And that means we’re forgetting the countless developers using Windows containers, too.

Instead of allowing this gap to widen further, container tool authors—especially SBOM tools and vulnerability scanners—need to add support for Windows container images.

In my presentation at [Container Plumbing Days 2023](https://containerplumbing.org/) I showed how to extract version information from Windows containers images that can be used to generate SBOMs, as well as how to integrate with the Microsoft Security Updates API which can provide detailed vulnerability information.

{{< lite-youtube videoid="RZ4PBDjtrc0" videotitle="Container Plumbing Days 2023: Windows Containers" />}}