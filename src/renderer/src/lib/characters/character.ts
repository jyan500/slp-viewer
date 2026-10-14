// Vendored from Slippi Lab (MIT, see THIRD_PARTY_NOTICES.md)
// https://github.com/frankborden/slippilab/blob/ba4e09172344d1e7957de2d8a6eebab31632d92f/src/viewer/characters/character.ts
import { ActionName } from "../actionNames";

export interface Character {
    scale: number;
    shieldOffset: [number, number];
    // Model Size * Shield Size attributes
    shieldSize: number;
    animationMap: Map<ActionName, string>;
    specialsMap: Map<number, string>;
}
