> If this plugin helps you, I'd really appreciate your support. You can [buy me a coffee here. ](https://www.buymeacoffee.com/sawhney17)




# Automatic Linker for Logseq
![GitHub all releases](https://img.shields.io/github/downloads/sawhney17/logseq-automatic-linker/total) ![version](https://img.shields.io/github/package-json/v/sawhney17/logseq-automatic-linker)

A plugin to automatically create links while typing.

Requires logseq version 0.67 and above to function properly
![Screen Recording 2022-05-11 at 8 03 24 AM](https://user-images.githubusercontent.com/80150109/167770331-a89d9939-888f-466c-9738-29daa263e724.gif)

## Instructions

1. Install the plugin from the marketplace
2. Use the keyboard shortcut <kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd> to enable automatic mode
3. Else, Use <kbd>Command</kbd>+<kbd>P</kbd> to parse the current block
4. Else, right click the bullet and click parse block for links
5. Watch as the links are automatically made!!

## Customization

- Ignoring specific pages from being auto linked
  1. Add a property. `automatic-ignore:: true`
  2. This page, and all its aliases, will now be ignored from auto linking! (Thanks [@trashhalo](https://github.com/trashhalo))

## Development

1.  Fork the repo.
2.  Install dependencies and build the dev version:

        yarn install && yarn run dev

3.  Open Logseq and navigate to the plugins dashboard: `t` `p`.
4.  Click `Load unpacked plugin button`, then select the repo directory to load it.

After every change you make in the code:

1.  Rebuild the dev version:

        yarn run dev

2.  Open Logseq and navigate to the plugins dashboard: `t` `p`.
3.  Find the plugin and click on "Reload".
4.  Ignore the error messages about keyboard shortcut conflicts.

To run tests:

    yarn test


## Thank you
Thank you to all contributors to the project!
- @jwoo0122
- @adxsoft
- @falense
- @andreoliwa
- @jjaychen1e
- @trashhalo
- @Laptop765
- @robotii
- @mortein