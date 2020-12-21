---
title: 'Tech stack #10YearChallenge'
date: '2020-12-21'
comments: true
---

[#10YearChallenge](https://twitter.com/search?q=%2310yearchallenge) has been trending for a while, so I thought it would be fun to do a 10 year challenge for programming and take a look at the technology I used back in 2010.

## 2010

10 years ago covers my final year in high school, and my first year in university. Both used completely different programming languages and tech stacks, so it's an interesting place to look back at.

I was running Windows on my personal machine, but the computers in the engineering department at my university were running Linux (SUSE if I recall correctly). It wasn't my first exposure to Linux, but I was still more comfortable using Windows at this point.

### VB.NET

I started learning how to program in my final few years of high school. My computer science teacher started us off with Visual Basic .NET. We were actually the first year group to use this stack. Previously my school used Delpi and Pascal, so it was new to everyone.

For my final year project, I built a system for a hairdresser complete with appointment scheduling, customer database, and inventory management!

![A screenshot of my high school project](/img/vb-net.png)

### MATLAB

The first week of university we got thrown into the deep end with a week-long Lego Mindstorms coursework project. There were no real limitations except for your imagination... and your MATLAB skills. In the end, our team built a robot with an automatic gearbox.

![A Lego Mindstorms car](/img/lego.png)

Despite MATLAB's reputation for not being a 'real' programming language, I used it a lot throughout all four years at university, including for my Master's thesis! I'd really recommend [MATLAB Cody](https://www.mathworks.com/matlabcentral/cody/) if you're looking to improve your MATLAB skills.

### C++

Still one of the favourite languages for teaching undergraduates. C++ was used extensively, but one of my proudest pieces of work in C++ is still the logic simulator I wrote for a coursework project.

![A screenshot of a logic simulator](/img/logic-emulator.png)

I really got to cut my teeth on C++ during my first ever internship, working on an H.265/HEVC video encoder at Cisco. To this day, it was some of the most challenging (in a good way) work I've done. Or to use someone else's words ["H.264 is Magic"](https://sidbala.com/h-264-is-magic/).

## 2020

Flash forward to 2020 and I've been programming professionally for almost 6 years now. In that time, I've used a lot of different languages including Java, Python, and even a year working in [X++](https://docs.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/dev-ref/xpp-language-reference) (despite my attempts to forget it!).

Even though I work at Microsoft, I've been running Arch Linux as my daily driver for over 3 years. Yes, I still need to use Windows in a VM from time to time, but the fact that I can achieve my developer workflow almost entirely from Linux just goes to show that Microsoft ♥ Linux isn't just an empty platitude.

## C#

It's only in the last year or so that I've come back to working on a .NET stack, but already I've deployed applications on Azure Functions, [ASP.NET](http://asp.NET) Core running in Kubernetes, and most recently Service Fabric. C# is a real breath of fresh air coming from 4 years of Java, and I am really excited to see where the language goes after C# 8 and .NET 5.

## TypeScript

If you're doing front-end work nowadays, I think TypeScript is the best way to do it. It papers over the cracks of JavaScipt, and gives you much more confidence, especially when working in a large codebase. The most common stack I work in now is React + TypeScript, and it is a million times better than the jQuery days.

I've also used TypeScript for some back-end work too – most notably for [Renovate](https://github.com/renovatebot/renovate). The type system really lends itself well to these sorts of back-end tasks, and I wouldn't discount it over some of the more conventional stacks.

## DevOps

Okay, so this one isn't a programming language, but it's definitely something that has changed the way I work. In this context, DevOps means a couple of things to me: testing, continuous integration/continuous delivery (CI/CD) and monitoring.

In 2010, testing meant manual testing. I remember for my hairdresser management system I had to document my manual test plan. It was a requirement of the marking scheme. Nowadays, it's easier to think of testing as a pyramid with unit tests at the base, integration tests and E2E tests in the middle, and a small number of manual tests at the top. [Ham Vocke's](https://twitter.com/hamvocke) [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) is the definitive guide for testing in 2020.

CI/CD has been one of my favourite topics lately. Even though the [agile manifesto](https://agilemanifesto.org/) talked about it almost 20 years ago, only recently has the barrier to entry gotten so low. Between Github Actions, Gitlab CI, Travis CI and all the rest it's a no-brainer. I use GitHub Actions in almost every side project I build.

Monitoring is such an important tool for running a successful service. You can use it to pre-emptively fix problems before they become problems or choose what areas to work on based on customer usage. Like CI/CD it's become so easy now. For most platforms all you need to do is include an SDK!

## 2030?

Who knows what 2030 will bring? Maybe Rust will replace C++ everywhere? Maybe AI will have replaced programmers? Maybe Go will finally get generics?
