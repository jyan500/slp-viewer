// Copies Melee-Improover's config.txt and slippi_analyzer.dll into improover/, where
// the viewer's savestate export uses them. The viewer never touches the Melee-Improover
// folder itself at runtime.
//
//   npm run import-improover                       copy config (if absent) + DLL
//   npm run import-improover -- --dll-only         refresh just the DLL after a rebuild
//   npm run import-improover -- --force            also overwrite an existing config
//   npm run import-improover -- --improover <dir>  Melee-Improover location
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const DEFAULT_IMPROOVER_DIR = "D:\\Melee-Improover";

function parseArgs(argv) {
    const options = { improoverDir: DEFAULT_IMPROOVER_DIR, isDllOnly: false, isForce: false };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === "--dll-only") {
            options.isDllOnly = true;
        } else if (arg === "--force") {
            options.isForce = true;
        } else if (arg === "--improover") {
            options.improoverDir = argv[++index];
        } else {
            console.error(`Unknown option: ${arg}`);
            process.exit(1);
        }
    }
    return options;
}

const options = parseArgs(process.argv.slice(2));
const targetDir = join(dirname(fileURLToPath(import.meta.url)), "..", "improover");
mkdirSync(targetDir, { recursive: true });

const dllSource = join(options.improoverDir, "slippi_analyzer", "target", "release", "slippi_analyzer.dll");
const configSource = join(options.improoverDir, "MeleeImprooverApp", "MeleeImprooverApp", "bin", "Debug", "config.txt");
const dllTarget = join(targetDir, "slippi_analyzer.dll");
const configTarget = join(targetDir, "config.txt");

let hasFailure = false;

if (existsSync(dllSource)) {
    copyFileSync(dllSource, dllTarget);
    console.log(`DLL:    ${dllSource} -> ${dllTarget}`);
} else {
    hasFailure = true;
    console.error(`DLL not found at ${dllSource}. Build it with "cargo build --release" in slippi_analyzer.`);
}

if (!options.isDllOnly) {
    if (existsSync(configTarget) && !options.isForce) {
        console.log(`Config: ${configTarget} already exists, keeping it (use --force to overwrite)`);
    } else if (existsSync(configSource)) {
        copyFileSync(configSource, configTarget);
        console.log(`Config: ${configSource} -> ${configTarget}`);
    } else {
        console.log(`Config: ${configSource} not found; the viewer will create improover/config.txt on first save`);
    }
}

process.exit(hasFailure ? 1 : 0);
