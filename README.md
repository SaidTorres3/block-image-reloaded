# Block Image Reloaded

This extension is an updated version of the **[Block image](https://chromewebstore.google.com/detail/Block%20image/pehaalcefcjfccdpbckoablngfkfgfgj)** extension. The original extension, developed by Gyuyeon Hwang on 2013, provides a simple way to block images on web pages. However, the creator has not updated the extension for several years and does not seem likely to make updates in the future.

![Showcase Image](https://raw.githubusercontent.com/SaidTorres3/block-image-reloaded/refs/heads/master/showcase.jpg)

## Why This Update?

The primary reason for this update is that the original extension is based on **Manifest V2**, which is now being deprecated by Chrome. Since Chrome is removing Manifest V2 extensions, I decided to create a fork and update the extension to **Manifest V3**, ensuring compatibility with current and future versions of Chrome.

## How It Works

This updated version, `"Block Image Reloaded"`, functions almost exactly as the original extension did:
- Blocks or hides images on a webpage based on user interaction.
- Saves the extension's "on" or "off" state between sessions for convenience.

## Features

- Updated to **Manifest V3** for compatibility with the latest version of Chrome.
- Maintains the core functionality of blocking images to provide a distraction-free browsing experience.
- If you enable/disable the extension, the current tab will be reloaded automatically to apply the changes.

## Acknowledgments

Thanks to Gyuyeon Hwang (the original creator of **Block image**) for providing the initial code and inspiration for this extension. This update is built on their work to maintain functionality for Chrome users in the Manifest V3 environment.
