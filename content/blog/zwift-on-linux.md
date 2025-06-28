---
title: Zwift on Linux
date: '2020-04-07'
comments: true
---

Getting Zwift to run on Linux was a journey I started [just over a year ago](https://bugs.winehq.org/show_bug.cgi?id=46313). I didn't get very far with my effort, but since then a lot of progress has been made by the Wine developers and others in the community, and Zwift is now (mostly) playable on Linux. I'll admit there are some workarounds required. Like having to use the [Zwift companion app](https://support.zwift.com/en_us/using-the-zwift-companion-app-Hybn8qzPr) to connect sensors. But on the whole, it works well. So I wanted to summarise the process for anyone who wants to try it for themselves.

I'm using [Lutris](https://lutris.net/), a gaming client for Linux, to script out all the steps needed to make games playable on Linux. If you've never used it before, I'd really recommend it for gaming on Linux in general. First things first, you're going to have to download and install Lutris for your Linux distribution. Thankfully Lutris has a great [help page](https://lutris.net/downloads/) explaining how to do this for most distributions.

## Installation

Once you've got Lutris installed, installing Zwift is pretty easy. In Lutris search for Zwift, select the only result, and click the “Install” button to start the installation process. You can also start the installer from the command line by running `lutris install/zwift-windows`.

![Lutris Installer](/img/ZoL.png)

This might take a while, and depending on your internet speed could be anywhere from 10 minutes to around an hour.

Once the Zwift launcher has finished downloading and updating, we've hit the first hurdle that can't be scripted with Lutris.

{{< lite-youtube videoid="punu7GdyrsE" videotitle="Zwift on Linux - Part Two" />}}

The launcher will appear as a blank white window. Actually, the launcher is displaying a web page, but Wine can't render properly. Thankfully all the files are already downloaded, so all you need to do is quit the launcher window, and exit Zwift from the Wine system menu. After that, the Lutris installer should complete.

## Running Zwift

Zwift requires the Launcher to be running all the time while in-game. However, Lutris only allows 1 application to launch from the “Play” button. So before you hit the play button, first you need to click “Run EXE inside wine prefix” and browse to `drive_c\Program Files (x86)\Zwift\ZwiftLauncher`. You should see that familiar blank white screen.

Finally, you can hit the “Play” button and Ride On 👍

{{< lite-youtube videoid="GhTK0sI1AXA" videotitle="Zwift on Linux - Part Three" />}}
