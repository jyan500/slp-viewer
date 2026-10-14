// Run before packaging: fails if the files bundled via extraResources are missing,
// so a build without animations or the savestate DLL isn't produced by accident.
import { existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];

const animationsDir = join(root, "resources", "animations");
const zipCount = existsSync(animationsDir) ? readdirSync(animationsDir).filter((name) => name.endsWith(".zip")).length : 0;
if (zipCount < 26) {
    problems.push(`Found ${zipCount}/26 animation zips in resources/animations. Run "npm run fetch-animations".`);
}

if (!existsSync(join(root, "improover", "slippi_analyzer.dll"))) {
    problems.push(`improover/slippi_analyzer.dll is missing. Run "npm run import-improover".`);
}
if (!existsSync(join(root, "improover", "config.txt"))) {
    console.warn("Note: improover/config.txt is missing; the packaged app will start with default savestate settings.");
}

if (problems.length > 0) {
    for (const problem of problems) {
        console.error(problem);
    }
    process.exit(1);
}
console.log("Build resources OK.");
