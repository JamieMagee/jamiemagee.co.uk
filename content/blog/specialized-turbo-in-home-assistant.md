---
title: Specialized Turbo e-bikes in Home Assistant
date: '2026-02-16'
comments: true
---

I ride a Specialized Vado SL 4.0. It has a TCU (Turbo Connect Unit) that broadcasts telemetry over Bluetooth Low Energy — battery level, speed, motor power, cadence, temperature, the works. Specialized has their own Mission Control app for this, but I wanted the data in Home Assistant.

So I built a custom integration.

## The protocol

Specialized's BLE protocol isn't documented anywhere official. Fortunately, [Sepp62](https://github.com/Sepp62/LevoEsp32Ble) had already reverse-engineered it for an ESP32 project. The protocol is called "TURBOHMI2017", and the UUID base literally encodes this string backwards in ASCII, which I find weirdly charming. Messages are dead simple: one byte for sender, one byte for channel, and 1-4 bytes of little-endian data.

I ported the protocol to Python as [`specialized-turbo`](https://github.com/JamieMagee/specialized-turbo), an async library built on [bleak](https://github.com/hbldh/bleak). It handles scanning for nearby bikes, pairing (the bike shows a 6-digit PIN on its display), and streaming telemetry. There's also a CLI if you want to poke around without writing code:

```bash
$ specialized-turbo scan
Found: My Vado SL (AA:BB:CC:DD:EE:FF)

$ specialized-turbo telemetry --address AA:BB:CC:DD:EE:FF
battery_charge_pct: 73
speed_kmh: 24.5
rider_power_w: 185
motor_power_w: 120
cadence_rpm: 82
```

## The Home Assistant integration

[ha-specialized-turbo](https://github.com/JamieMagee/ha-specialized-turbo) uses Home Assistant's Bluetooth auto-discovery. Turn on your bike near your HA instance and it shows up. Enter the pairing PIN from the TCU screen and you're done.

It exposes 18 sensors:

- Battery: charge %, capacity, remaining Wh, health, temperature, charge cycles, voltage, current
- Motor: speed, rider power, motor power, cadence, odometer, motor temperature
- Settings: assist level (Off/Eco/Trail/Turbo), plus the tuning percentages for each level

All data is pushed locally over BLE. No cloud, no polling after the initial connection.

## Installation

Install via [HACS](https://hacs.xyz) as a custom repository, or copy the `custom_components/specialized_turbo` folder into your HA config directory. You'll need a Bluetooth adapter on your HA host and a Specialized Turbo bike from 2017 or later (Vado, Levo, Creo, or other models with a TCU).

## What's next

The library supports write commands too, like changing the assist level from HA. I haven't wired that up to the integration yet, but it's on the list.

- [`specialized-turbo` on PyPI](https://pypi.org/project/specialized-turbo/)
- [`specialized-turbo` on GitHub](https://github.com/JamieMagee/specialized-turbo)
- [`ha-specialized-turbo` on GitHub](https://github.com/JamieMagee/ha-specialized-turbo)
