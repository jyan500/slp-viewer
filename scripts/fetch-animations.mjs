// Downloads Slippi Lab's pre-extracted character animation zips (MIT, see
// THIRD_PARTY_NOTICES.md) into resources/animations/. Safe to re-run: existing
// files are skipped.
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const SLIPPI_LAB_COMMIT = "ba4e09172344d1e7957de2d8a6eebab31632d92f";
const BASE_URL = `https://raw.githubusercontent.com/frankborden/slippilab/${SLIPPI_LAB_COMMIT}/public/zips`;

const ZIP_NAMES = [
    "bowser", "captainFalcon", "doctorMario", "donkeyKong", "falco", "fox", "ganondorf",
    "iceClimbers", "jigglypuff", "kirby", "link", "luigi", "mario", "marth", "mewtwo",
    "mrGameAndWatch", "ness", "peach", "pichu", "pikachu", "roy", "samus", "sheik",
    "yoshi", "youngLink", "zelda",
];

const outputDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "resources", "animations");
mkdirSync(outputDirectory, { recursive: true });

let failures = 0;
for (const [index, name] of ZIP_NAMES.entries()) {
    const destination = join(outputDirectory, `${name}.zip`);
    const progress = `[${index + 1}/${ZIP_NAMES.length}]`;
    if (existsSync(destination)) {
        console.log(`${progress} ${name}.zip already present, skipping`);
        continue;
    }
    try {
        const response = await fetch(`${BASE_URL}/${name}.zip`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        writeFileSync(destination, bytes);
        console.log(`${progress} ${name}.zip (${(bytes.length / 1024 / 1024).toFixed(1)} MB)`);
    } catch (error) {
        failures++;
        console.error(`${progress} ${name}.zip FAILED: ${error.message}`);
    }
}

if (failures > 0) {
    console.error(`${failures} download(s) failed. Re-run to retry.`);
    process.exit(1);
}
console.log(`Animations ready in ${outputDirectory}`);
