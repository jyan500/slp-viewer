# Third-party notices

## Slippi Lab

Character animation data and rendering logic are adapted from Slippi Lab
(https://github.com/frankborden/slippilab, commit `ba4e09172344d1e7957de2d8a6eebab31632d92f`):

- `src/renderer/src/lib/characters/*.ts` and `src/renderer/src/lib/actionNames.ts` are
  vendored from that commit, re-indented, and with their import paths changed.
- `src/renderer/src/lib/drawCharacter.ts` and `src/renderer/src/lib/animations.ts` port
  its animation selection, transform, shield and shine logic.
- `src/renderer/src/lib/camera.ts` adapts its follow camera (padding, minimum size and
  easing constants).
- `src/renderer/src/lib/itemNames.ts` is vendored from that commit, and
  `src/renderer/src/lib/drawItems.ts` ports its projectile shapes and hitbox sizes.
- `src/renderer/src/lib/randall.ts` ports its Randall (Yoshi's Story cloud) motion, and
  the stage outlines, platforms and Fountain of Dreams platform-height scaling in
  `src/renderer/src/lib/stages.ts` (plus the initial heights in `src/shared/stages.ts`)
  come from its stage data.
- `scripts/fetch-animations.mjs` downloads its pre-extracted animation zips into
  `resources/animations/`, which is not committed to this repository. The animation data
  in those zips is derived from Super Smash Bros. Melee.

## Pokémon Stadium transformations

`scripts/extract-stadium.mjs` reads the transformation collision lines from the user's own
Melee ISO (`GrPs.dat`) into `resources/stadium/` (not committed). Which collision groups
belong to which form follows the layout documented in
[ericvanlare/melee-web's POKEMON_STADIUM_PORT_NOTES.md](https://github.com/ericvanlare/melee-web/pull/161);
no code or data from that repository is included.

## Slippi Lab license

```
MIT License

Copyright (c) 2023 Frank Borden

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
