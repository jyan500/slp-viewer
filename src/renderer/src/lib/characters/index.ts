import type { Character } from "./character";
import { bowser } from "./bowser";
import { captainFalcon } from "./captainFalcon";
import { doctorMario } from "./doctorMario";
import { donkeyKong } from "./donkeyKong";
import { falco } from "./falco";
import { fox } from "./fox";
import { ganondorf } from "./ganondorf";
import { iceClimbers } from "./iceClimbers";
import { jigglypuff } from "./jigglypuff";
import { kirby } from "./kirby";
import { link } from "./link";
import { luigi } from "./luigi";
import { mario } from "./mario";
import { marth } from "./marth";
import { mewtwo } from "./mewtwo";
import { mrGameAndWatch } from "./mrGameAndWatch";
import { ness } from "./ness";
import { peach } from "./peach";
import { pichu } from "./pichu";
import { pikachu } from "./pikachu";
import { roy } from "./roy";
import { samus } from "./samus";
import { sheik } from "./sheik";
import { yoshi } from "./yoshi";
import { youngLink } from "./youngLink";
import { zelda } from "./zelda";

export type { Character };

export interface CharacterModel {
    // Basename of the animation zip in resources/animations/.
    zipName: string;
    character: Character;
}

// Indexed by Melee's *internal* character ID (the ID in post-frame updates), which
// differs from the external CSS ordering. Order from Slippi Lab's actionMapByInternalId.
const MODELS_BY_INTERNAL_ID: CharacterModel[] = [
    { zipName: "mario", character: mario },
    { zipName: "fox", character: fox },
    { zipName: "captainFalcon", character: captainFalcon },
    { zipName: "donkeyKong", character: donkeyKong },
    { zipName: "kirby", character: kirby },
    { zipName: "bowser", character: bowser },
    { zipName: "link", character: link },
    { zipName: "sheik", character: sheik },
    { zipName: "ness", character: ness },
    { zipName: "peach", character: peach },
    { zipName: "iceClimbers", character: iceClimbers }, // Popo
    { zipName: "iceClimbers", character: iceClimbers }, // Nana
    { zipName: "pikachu", character: pikachu },
    { zipName: "samus", character: samus },
    { zipName: "yoshi", character: yoshi },
    { zipName: "jigglypuff", character: jigglypuff },
    { zipName: "mewtwo", character: mewtwo },
    { zipName: "luigi", character: luigi },
    { zipName: "marth", character: marth },
    { zipName: "zelda", character: zelda },
    { zipName: "youngLink", character: youngLink },
    { zipName: "doctorMario", character: doctorMario },
    { zipName: "falco", character: falco },
    { zipName: "pichu", character: pichu },
    { zipName: "mrGameAndWatch", character: mrGameAndWatch },
    { zipName: "ganondorf", character: ganondorf },
    { zipName: "roy", character: roy },
];

const SPACIE_INTERNAL_IDS = new Set([1, 22]); // Fox, Falco

export function getCharacterModel(internalCharacterId: number): CharacterModel | null {
    return MODELS_BY_INTERNAL_ID[internalCharacterId] ?? null;
}

export function isSpacie(internalCharacterId: number): boolean {
    return SPACIE_INTERNAL_IDS.has(internalCharacterId);
}
