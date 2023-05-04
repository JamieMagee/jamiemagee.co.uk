---
title: 'Container Plumbing Days 2023—Windows containers: The forgotten stepchild'
date: '2023-05-05'
comments: true
---

When it comes to Linux containers, there are plenty of tools out there that can scan container images, generate Software Bill of Materials (SBOM), or list vulnerabilities. However, Windows container images are more like the forgotten stepchild in the container ecosystem. And that means we’re forgetting the countless developers using Windows containers, too.

Instead of allowing this gap to widen further, container tool authors—especially SBOM tools and vulnerability scanners—need to add support for Windows container images.

In my presentation at [Container Plumbing Days 2023](https://containerplumbing.org/) I showed how to extract version information from Windows containers images that can be used to generate SBOMs, as well as how to integrate with the Microsoft Security Updates API which can provide detailed vulnerability information.

<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }</style><div class='embed-container'><iframe src='https://www.youtube.com/embed/RZ4PBDjtrc0' frameborder='0' allowfullscreen></iframe></div>