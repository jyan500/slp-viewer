// Extracts Pokemon Stadium's transformation collision lines from your own Melee ISO into
// resources/stadium/stadium-collision.json (gitignored; it's derived from game files).
//
//   npm run extract-stadium                    ISO path from Slippi Launcher's settings
//   npm run extract-stadium -- --iso <path>    or give it explicitly
//
// All forms live in GrPs.dat's coll_data, grouped into collision "areas" that the game
// switches on per form (layout documented in ericvanlare/melee-web's
// POKEMON_STADIUM_PORT_NOTES.md). Area 0 (Water's rotating windmill) is skipped: its
// lines are relative to a moving 3D model this script doesn't read.
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { fileURLToPath } from "url";

const EXPECTED_GAME_ID = "GALE01";
const COLL_DATA_ROOT = "coll_data";
const KINDS = ["floor", "ceiling", "wall", "wall", "dynamic"];
// Collision area -> what it is (verified against replays: characters standing during each
// finished form sit on that form's floor lines).
const AREA_GROUPS = { 6: "base", 4: "normal", 1: "fire", 2: "fire", 3: "grass", 5: "rock", 7: "water" };

function parseArgs(argv) {
    const options = { isoPath: null };
    for (let index = 0; index < argv.length; index++) {
        if (argv[index] === "--iso") {
            options.isoPath = argv[++index];
        } else {
            console.error(`Unknown option: ${argv[index]}`);
            process.exit(1);
        }
    }
    return options;
}

function findIsoFromSlippiLauncher() {
    const settingsPath = join(process.env.APPDATA ?? "", "Slippi Launcher", "Settings");
    try {
        return JSON.parse(readFileSync(settingsPath, "utf8")).settings?.isoPath ?? null;
    } catch {
        return null;
    }
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

const options = parseArgs(process.argv.slice(2));
const isoPath = options.isoPath ?? findIsoFromSlippiLauncher();
if (!isoPath || !existsSync(isoPath)) {
    fail(`Melee ISO not found${isoPath ? ` at ${isoPath}` : ""}. Pass it with: npm run extract-stadium -- --iso "<path>"`);
}

const fileHandle = openSync(isoPath, "r");
const read = (offset, length) => {
    const buffer = Buffer.alloc(length);
    readSync(fileHandle, buffer, 0, length, offset);
    return buffer;
};

// Disc header and file system table (FST).
const header = read(0, 0x440);
const gameId = header.toString("ascii", 0, 6);
if (gameId !== EXPECTED_GAME_ID) {
    fail(`Expected an NTSC Melee ISO (${EXPECTED_GAME_ID}), found game id "${gameId}".`);
}
const fst = read(header.readUInt32BE(0x424), header.readUInt32BE(0x428));
const entryCount = fst.readUInt32BE(8);
const stringTable = entryCount * 12;
let stageFile = null;
for (let index = 1; index < entryCount && !stageFile; index++) {
    const base = index * 12;
    if (fst[base] === 1) {
        continue; // directory
    }
    const nameStart = stringTable + (fst.readUInt32BE(base) & 0xffffff);
    let nameEnd = nameStart;
    while (fst[nameEnd] !== 0) {
        nameEnd++;
    }
    if (fst.toString("latin1", nameStart, nameEnd) === "GrPs.dat") {
        stageFile = { offset: fst.readUInt32BE(base + 4), size: fst.readUInt32BE(base + 8) };
    }
}
if (!stageFile) {
    fail("GrPs.dat not found in the ISO.");
}
const dat = read(stageFile.offset, stageFile.size);
closeSync(fileHandle);

// HSD .dat archive: 0x20-byte header, data block, relocation table, root symbols.
const dataSize = dat.readUInt32BE(4);
const relocationCount = dat.readUInt32BE(8);
const rootCount = dat.readUInt32BE(12);
const referenceCount = dat.readUInt32BE(16);
const data = dat.subarray(0x20, 0x20 + dataSize);
const rootTable = 0x20 + dataSize + relocationCount * 4;
const symbolTable = rootTable + (rootCount + referenceCount) * 8;
let collOffset = null;
for (let index = 0; index < rootCount; index++) {
    const nameStart = symbolTable + dat.readUInt32BE(rootTable + index * 8 + 4);
    let nameEnd = nameStart;
    while (dat[nameEnd] !== 0) {
        nameEnd++;
    }
    if (dat.toString("latin1", nameStart, nameEnd) === COLL_DATA_ROOT) {
        collOffset = dat.readUInt32BE(rootTable + index * 8);
    }
}
if (collOffset === null) {
    fail("coll_data not found in GrPs.dat.");
}

// coll_data: vertex array (x, y floats), link array (0x10 each: vertex indices first),
// type ranges, then area table (0x28 each: start/count per link type).
const vertexPointer = data.readUInt32BE(collOffset);
const vertexCount = data.readUInt32BE(collOffset + 4);
const linkPointer = data.readUInt32BE(collOffset + 8);
const linkCount = data.readUInt32BE(collOffset + 12);
const areaPointer = data.readUInt32BE(collOffset + 0x24);
const areaCount = data.readUInt32BE(collOffset + 0x28);
if (vertexCount !== 155 || linkCount !== 136 || areaCount !== 8) {
    fail(`Unexpected Pokemon Stadium collision layout (${vertexCount} vertices, ${linkCount} lines, ${areaCount} areas); is this a modded ISO?`);
}

const round = (value) => Math.round(value * 10000) / 10000;
const vertex = (index) => [data.readFloatBE(vertexPointer + index * 8), data.readFloatBE(vertexPointer + index * 8 + 4)];
const groups = { base: [], normal: [], fire: [], grass: [], rock: [], water: [] };
for (let area = 0; area < areaCount; area++) {
    const group = AREA_GROUPS[area];
    if (!group) {
        continue;
    }
    const areaBase = areaPointer + area * 0x28;
    for (let kind = 0; kind < 4; kind++) {
        const start = data.readInt16BE(areaBase + kind * 4);
        const count = data.readInt16BE(areaBase + kind * 4 + 2);
        for (let link = start; link < start + count; link++) {
            const [x1, y1] = vertex(data.readUInt16BE(linkPointer + link * 0x10));
            const [x2, y2] = vertex(data.readUInt16BE(linkPointer + link * 0x10 + 2));
            groups[group].push({ x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2), kind: KINDS[kind] });
        }
    }
}

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "resources", "stadium");
mkdirSync(outputDirectory, { recursive: true });
const outputPath = join(outputDirectory, "stadium-collision.json");
writeFileSync(
    outputPath,
    JSON.stringify({ source: `GrPs.dat coll_data from ${basename(isoPath)}`, groups }, null, 1),
);
const summary = Object.entries(groups).map(([name, lines]) => `${name} ${lines.length}`).join(", ");
console.log(`Wrote ${outputPath}\n  lines per group: ${summary}`);
