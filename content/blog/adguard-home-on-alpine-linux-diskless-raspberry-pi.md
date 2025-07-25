---
title: Setting up AdGuard Home on a Raspberry Pi with Alpine Linux in diskless mode
date: '2025-07-25'
comments: true
---

Remember the good old days when ads were just annoying banners on websites? Well those days are long gone. Now your smart toaster probably wants to show you ads for bread, and don't get me started on what your TV is trying to sell you. Since we can't exactly install uBlock Origin on every IoT device in our homes, network-wide ad blocking has become essential.

While Pi-hole has been the go-to solution for years, AdGuard Home has been quietly building a reputation as an excellent alternative. It offers a modern web interface and built-in DNS-over-HTTPS support that makes it worth considering for your home network.

## Why Alpine Linux in diskless mode?

Now, you might be wondering why I'm not just recommending Raspberry Pi OS like many other tutorials. Alpine Linux is like the Swiss Army knife of Linux distributions—small, efficient, and surprisingly capable.

But here's the real kicker: diskless mode. This isn't just a fancy name—the entire operating system runs from RAM. Yes, you read that right. Your Pi basically becomes a very expensive RAM disk that happens to block ads. The beauty of this approach is that your SD card doesn't get hammered with constant writes, which means it might actually survive longer than a mayfly.

More importantly, once you set this up, it's basically bulletproof. This is the kind of setup you can give to your non-technical friends or shove in a closet and forget about for years. No weekly updates, no mysterious crashes, no "why is my Pi running slow?" calls at 11 PM. It just works, quietly doing its job like a digital janitor cleaning up the internet's mess.

## Prerequisites

Before we dive into this adventure, make sure you have:

- A Raspberry Pi 3B or newer (you'll want at least 1GB of RAM for this setup)
- An SD card (4GB minimum, though larger is recommended for package storage)
- A computer to prepare the SD card
- Basic familiarity with Linux commands

## Preparing the SD card

First, grab the Alpine Linux image for your Pi from the [Alpine downloads page](https://alpinelinux.org/downloads/). For most modern Pis, you'll want the `aarch64` (64-bit) version. If you're using an older Pi 3, `armv7` will work fine too.

Alpine takes a different approach than most distributions—instead of providing an `.img` file, they give you a tarball that you extract directly to the SD card:

```bash
# Format SD card as FAT32 (replace /dev/sdX1 with your actual device)
sudo mkfs.fat -F32 /dev/sdX1

# Mount the SD card
sudo mount /dev/sdX1 /mnt

# Extract Alpine directly to the SD card
sudo tar -xzf alpine-rpi-*-aarch64.tar.gz -C /mnt --strip-components=1

# Unmount cleanly
sudo umount /mnt
```

Make sure the partition is marked as bootable—the Raspberry Pi's firmware requires this to boot properly.

## Initial Alpine setup

Pop that SD card into your Pi and power it up. You'll be greeted with a login prompt—just type `root` with no password to get started.

Now it's time to run the Alpine setup wizard:

```bash
setup-alpine
```

Work through the configuration prompts:

1. **Keyboard layout**: Choose `us` for US layout
2. **Hostname**: Something like `adguard-pi` works well
3. **Network interface**: Configure `eth0` for wired networking
4. **Root password**: Set a strong password for security
5. **Timezone**: Select your local timezone
6. **Proxy**: Usually none unless you're behind a corporate proxy
7. **NTP client**: Choose `chrony` for time synchronization
8. **SSH server**: Install `openssh` for remote access

Here's the crucial part: when you get to the disk setup, select `none` to configure diskless mode. This is what makes the whole setup special.

## Setting up persistent storage

Now here's the thing about diskless mode—it's great for running the OS, but AdGuard Home is going to want somewhere to store its configuration and logs. Unless you enjoy reconfiguring everything after each reboot (spoiler: you don't), we need to set up some persistent storage.

Time to get acquainted with your SD card and create a second partition:

```bash
# Install some essential tools
apk add cfdisk e2fsprogs

# Open the partition editor
cfdisk /dev/mmcblk0

# Format the new partition as ext4
mkfs.ext4 /dev/mmcblk0p2

# Create a mount point and mount it
mkdir /media/mmcblk0p2
mount /dev/mmcblk0p2 /media/mmcblk0p2
```

Now we need to tell Alpine's Local Backup Utility (lbu) where to store our configuration files:

```bash
# Tell lbu where to store backups
echo 'LBU_MEDIA="mmcblk0p2"' >> /etc/lbu/lbu.conf

# Set up package cache for faster reinstalls
mkdir /media/mmcblk0p2/cache
setup-apkcache /media/mmcblk0p2/cache

# Download packages to cache
apk cache download

# Save everything (this is important!)
lbu commit
```

## Installing AdGuard Home

AdGuard Home is available in Alpine's edge repository, specifically in the testing branch. We need to add this repository to install it:

```bash
# Add the edge testing repository
echo "https://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

# Update the package index
apk update

# Install AdGuard Home from edge/testing
apk add adguardhome@testing
```

The `@testing` suffix ensures we get the package from the correct repository branch.

## Configuring AdGuard Home

Time to start AdGuard Home:

```bash
# Enable the service to start on boot
rc-update add adguardhome

# Start the service
rc-service adguardhome start
```

AdGuard Home will now be listening on port 3000 for initial configuration. Navigate to `http://your-pi-ip:3000` in your browser to access the setup wizard.

The setup process is straightforward:

1. **Admin interface**: Port 80 is clean, but 3000 works fine too
2. **DNS server**: Port 53 is the standard
3. **Admin credentials**: Choose a secure username and password
4. **Upstream DNS**: Cloudflare's 1.1.1.1 or Quad9's 9.9.9.9 are both excellent choices

Tip: Avoid using your router's DNS as upstream—it's better to connect directly to a public DNS service.

## Enhancing your setup with blocklists

Now for the fun part—adding quality blocklists! Out of the box, AdGuard Home comes with some basic lists, but you can significantly improve protection by adding specialized blocklists.

The [HaGeZi DNS blocklists](https://github.com/hagezi/dns-blocklists/) are particularly well-maintained and offer different levels of protection:

- **Multi Normal**: Good for most users
- **Multi Pro**: Extended protection (recommended for most setups)
- **Multi Pro++**: Maximum protection for power users
- **Threat Intelligence Feeds**: Blocks malware, phishing, and other threats

To add these blocklists:

1. Go to **Filters** → **DNS blocklists** in the web interface
2. Click **Add blocklist** → **Add a custom list**
3. Add the URLs for your chosen protection level:
   - Multi Pro: `https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@release/adblock/pro.txt`
   - Threat Intelligence: `https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@release/adblock/tif.txt`

I recommend starting with Multi Pro—it provides excellent protection while minimizing false positives.

## Making it permanent

Here's an important step: committing your changes! Since we're running in diskless mode, any changes made during runtime will be lost on reboot unless we save them.

```bash
# Save all changes to persistent storage
lbu commit
```

Make this command a habit. After making configuration changes, always run `lbu commit` to ensure they persist across reboots.

## Configuring your network

To make AdGuard Home effective network-wide, you need to configure your router to use it as the primary DNS server. Access your router's configuration interface and set the DNS server to your Pi's IP address.

Alternatively, you can configure individual devices to use your AdGuard Home instance, though this requires more manual work and doesn't provide network-wide protection.

Once configured, every device on your network will automatically benefit from ad blocking. You'll notice faster page loading and cleaner browsing across all your devices.

## Troubleshooting common issues

**AdGuard Home refuses to start**: Check that no other services are using port 53. Alpine sometimes includes a local DNS resolver that needs to be stopped.

```bash
# Check what's using port 53
netstat -tulnp | grep :53

# Stop conflicting services if needed
rc-service dnsmasq stop
rc-update del dnsmasq
```

**Configuration lost after reboot**: This usually means you forgot to run `lbu commit` after making changes. In diskless mode, you need to explicitly save configuration changes.

**Performance issues**: Monitor your RAM usage. AdGuard Home with extensive blocklists can use several hundred MB, and remember that your entire OS is also running in RAM.

## Updating your system

Updating a diskless Alpine system requires a few additional steps:

```bash
# Update the package database
apk update

# Upgrade packages (this happens in RAM)
apk upgrade

# For kernel updates, use the update-kernel command
apk add mkinitfs
update-kernel /media/mmcblk0p1/boot/

# Save the changes
lbu commit

# Reboot to apply kernel updates
reboot
```

The beauty of this setup is that if something goes wrong during an update, you can always reboot back to your last committed state.

## Conclusion

Setting up AdGuard Home on Alpine Linux in diskless mode creates a robust, low-maintenance solution for network-wide ad blocking. While it requires more initial setup than a standard installation, the benefits are significant.

You now have a network-wide ad blocker that boots from a minimal footprint, runs entirely in RAM, and should provide years of reliable service. The diskless configuration means excellent stability and easy recovery if anything goes wrong.

The best part is watching the blocked request counter climb as your network becomes cleaner and faster. It's a satisfying reminder that your setup is working hard to improve your digital experience.

Just remember: `lbu commit` is your friend. Always commit your changes to ensure your configuration persists across reboots.
