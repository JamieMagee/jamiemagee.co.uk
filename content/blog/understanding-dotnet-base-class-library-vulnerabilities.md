---
title: Understanding .NET Base Class Library Vulnerabilities
date: '2025-07-17'
comments: true
---

When you create a new .NET project and start writing code, you might find yourself using classes like `System.Text.Json.JsonSerializer` without ever explicitly adding a reference to `System.Text.Json` in your `.csproj` file. This isn't magic—it's because these Base Class Libraries (BCLs) are shipped as part of the .NET runtime itself, making them implicit references that are automatically available to your application.

But this convenience comes with a hidden security implication that many developers don't realize: when a vulnerability is discovered in one of these implicit dependencies, patching it isn't as straightforward as updating a NuGet package reference.

## The invisible dependency problem

Let's start with a real-world example. In October 2024, Microsoft disclosed [CVE-2024-43485](https://github.com/advisories/GHSA-8g4q-xg66-9fp4), a high-severity denial of service vulnerability in `System.Text.Json`. The vulnerability affects applications that deserialize input to a model with a `[JsonExtensionData]` property.

Here's the catch: if you look at your `.csproj` file, you probably won't see any explicit reference to `System.Text.Json`. Yet your application might still be vulnerable. This is because `System.Text.Json` is part of the .NET runtime's Base Class Library, making it an implicit dependency that's automatically available to all .NET applications.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  
  <!-- No explicit System.Text.Json reference, but you can still use it -->
</Project>
```

## Two paths to patching

When facing a vulnerability in an implicit dependency like this, you have two main options to ensure your application is secure:

### Option 1: Add an explicit reference

The most obvious solution is to add an explicit package reference to the vulnerable library:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  
  <PackageReference Include="System.Text.Json" Version="8.0.5" />
</Project>
```

This approach leverages NuGet's ["direct dependency wins"](https://learn.microsoft.com/en-us/nuget/concepts/dependency-resolution#direct-dependency-wins) rule. When your application has both an implicit dependency (from the runtime) and an explicit dependency (from your `.csproj`), the explicit one takes precedence.

While this works, it's not a scalable long-term solution. The .NET runtime includes hundreds of libraries, and making all implicit references explicit would significantly clutter your project files and create a maintenance burden.

### Option 2: Set a minimum SDK version with global.json

A more sustainable approach is to use `global.json` to specify a minimum .NET SDK version that includes the patched libraries:

```json
{
  "sdk": {
    "version": "8.0.110",
    "rollForward": "latestFeature"
  }
}
```

This ensures that anyone building your project—whether locally, in CI/CD, or when deploying—uses at least the specified SDK version, which includes the security patches for all Base Class Libraries.

## The self-contained deployment consideration

This distinction becomes even more critical if you're shipping [self-contained applications](https://learn.microsoft.com/en-us/dotnet/core/deploying/#publish-self-contained). When you publish a self-contained app, the .NET runtime is bundled with your application, including all the Base Class Libraries. If you build your self-contained app with an older SDK that contains vulnerable libraries, those vulnerabilities get shipped with your application.

For self-contained deployments, ensuring you're building with an up-to-date SDK isn't just about development convenience—it's a security requirement. A `global.json` file becomes essential for maintaining a security baseline across your entire deployment pipeline.

## The current developer experience pain

Currently, if you don't have the correct SDK version installed and try to build a project with a `global.json` requirement, you'll encounter an often inscrutable error message.

The good news is that the .NET team is aware of the problem. There's an ongoing effort tracked in [dotnet/cli-lab#390](https://github.com/dotnet/cli-lab/issues/390) to create a .NET bootstrapper that will improve SDK acquisition and provide better error messages. This work aims to make .NET 10 much more user-friendly when dealing with SDK version mismatches.

## A familiar challenge in other runtimes

This pattern of implicit runtime dependencies isn't unique to .NET. Java developers face a remarkably similar challenge with the Java standard library. When a vulnerability is discovered in a core Java package like `java.util` or `java.security`, the remediation path typically involves updating the entire Java Runtime Environment (JRE) or Java Development Kit (JDK).

For example, when CVE-2022-21449 was discovered in Java's elliptic curve signature verification, applications using ECDSA signatures were vulnerable regardless of whether they explicitly imported the affected classes. The fix required updating to a patched version of the JRE.

However, Java's ecosystem has traditionally been more rigid in this regard. While .NET allows you to override BCL versions with explicit NuGet references (leveraging the "direct dependency wins" rule), Java applications are typically bound to whatever version of the standard library comes with their runtime. This makes the `global.json` approach even more critical in the .NET world, as it's often your most practical option.

The key difference is that .NET's package management system provides more flexibility—you can sometimes work around runtime library issues with explicit package references, whereas Java applications usually have no choice but to update their entire runtime environment.

## The path forward

The implicit nature of .NET's Base Class Libraries provides excellent developer productivity, but it also creates a unique security challenge. Unlike traditional NuGet dependencies that appear in your project file, BCL vulnerabilities require a different approach to remediation.

By understanding this distinction and adopting `global.json` as part of your security strategy, you can ensure your applications stay protected against vulnerabilities in both explicit and implicit dependencies. And with the improvements coming in .NET 10, this process should become much more seamless for developers.
