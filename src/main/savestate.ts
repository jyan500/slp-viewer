// Savestate export through Melee-Improover's slippi_analyzer.dll. The DLL and a copy of
// Melee-Improover's config.txt live in an improover/ folder (see paths.ts for where that
// is in dev vs. packaged builds, and scripts/import-improover.mjs for how it's filled).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { app, dialog, ipcMain, utilityProcess } from "electron";
import { getBundledImprooverDirectory, getImprooverDirectory, seedImprooverFile } from "./paths";
import type {
    SavestateEnvironment,
    SavestateExportRequest,
    SavestateExportResult,
    SavestateSettings,
} from "../shared/types";
import type { WorkerRequest } from "./savestateWorker";

// slp_parser stores Slippi frame n at index n + 123 (file_parser.rs: `frame + 123`),
// and create_savestate_at_frame takes that index. The viewer shows true Slippi frame
// numbers, so unlike Melee-Improover's VIEWER_FRAME_OFFSET this mapping is exact.
const SLP_FRAME_INDEX_OFFSET = 123;
const WORKER_TIMEOUT_MS = 60_000;
const DEFAULT_CLIP_LENGTH = 360;

// Melee-Improover's config.txt is 5 lines; "NONE" marks an unset path.
const CONFIG_LINE_EXPORT_FOLDER = 0;
const CONFIG_LINE_NAMING_STYLE = 3;
const CONFIG_LINE_CLIP_LENGTH = 4;
const DEFAULT_CONFIG_LINES = ["NONE", "NONE", "0", "0", String(DEFAULT_CLIP_LENGTH)];
const UNSET_PATH = "NONE";

const DLL_FILE_NAME = "slippi_analyzer.dll";
const CONFIG_FILE_NAME = "config.txt";

// A DLL in the writable improover folder wins over the bundled one, so a packaged build
// can pick up a rebuilt DLL dropped beside the .exe without repackaging.
function getDllPath(): string {
    const override = join(getImprooverDirectory(), DLL_FILE_NAME);
    return existsSync(override) ? override : join(getBundledImprooverDirectory(), DLL_FILE_NAME);
}

function getMissingDllMessage(): string {
    return app.isPackaged
        ? `slippi_analyzer.dll not found. Place it in ${getImprooverDirectory()}.`
        : `slippi_analyzer.dll not found at ${getDllPath()}. Run "npm run import-improover" to copy it from Melee-Improover.`;
}

// Seeded from the bundled copy on first use in a packaged build, so the user's settings
// are kept somewhere writable.
function getConfigPath(): string {
    return seedImprooverFile(CONFIG_FILE_NAME);
}

interface ConfigFile {
    lines: string[];
    lineEnding: string;
    hasTrailingNewline: boolean;
}

function readConfig(): ConfigFile {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
        return { lines: [...DEFAULT_CONFIG_LINES], lineEnding: "\n", hasTrailingNewline: false };
    }
    const text = readFileSync(configPath, "utf8");
    const lineEnding = text.includes("\r\n") ? "\r\n" : "\n";
    const hasTrailingNewline = text.endsWith(lineEnding);
    const lines = (hasTrailingNewline ? text.slice(0, -lineEnding.length) : text).split(lineEnding);
    while (lines.length < DEFAULT_CONFIG_LINES.length) {
        lines.push(DEFAULT_CONFIG_LINES[lines.length]);
    }
    return { lines, lineEnding, hasTrailingNewline };
}

function parseInteger(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function readSettings(): SavestateSettings {
    const { lines } = readConfig();
    const exportFolder = lines[CONFIG_LINE_EXPORT_FOLDER];
    return {
        exportFolder: exportFolder && exportFolder !== UNSET_PATH ? exportFolder : null,
        namingStyle: parseInteger(lines[CONFIG_LINE_NAMING_STYLE], 0),
        clipLength: parseInteger(lines[CONFIG_LINE_CLIP_LENGTH], DEFAULT_CLIP_LENGTH),
    };
}

// Only the lines the viewer uses are rewritten; the rest (import folder, clip button)
// are kept so the file stays a valid Melee-Improover config.
function writeSettings(settings: SavestateSettings): void {
    const config = readConfig();
    config.lines[CONFIG_LINE_EXPORT_FOLDER] = settings.exportFolder || UNSET_PATH;
    config.lines[CONFIG_LINE_NAMING_STYLE] = String(settings.namingStyle);
    config.lines[CONFIG_LINE_CLIP_LENGTH] = String(settings.clipLength);
    const text = config.lines.join(config.lineEnding) + (config.hasTrailingNewline ? config.lineEnding : "");
    const configPath = getConfigPath();
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, text, "utf8");
}

function getEnvironment(): SavestateEnvironment {
    const dllPath = getDllPath();
    const dllFound = existsSync(dllPath);
    return {
        ...readSettings(),
        dllFound,
        dllPath,
        configPath: getConfigPath(),
        missingDllMessage: dllFound ? null : getMissingDllMessage(),
    };
}

// Status codes documented on create_savestate_at_frame in slippi_analyzer/src/lib.rs;
// wording follows Melee-Improover's Form1.cs.
function getStatusMessage(status: number, frame: number): string {
    switch (status) {
        case 1:
            return "The exporter received an invalid argument (null or non-UTF-8 path).";
        case 2:
            return "The replay file could not be read or parsed.";
        case 3:
            return "This game isn't a standard two-player match, or the selected player port isn't available.";
        case 4:
            return `Frame ${frame} is outside this replay's range.`;
        case 5:
            return "The savestate couldn't be built for this frame.";
        case 6:
            return "The savestate couldn't be written to the export folder. Check the export folder path.";
        case 10:
            return "This replay is too old for savestate export (Training Mode requires Slippi replay version 3.16 or newer).";
        case 11:
            return "The replay engine doesn't see this as a two-player game.";
        case 12:
            return "The chosen frame/duration is out of bounds for this replay.";
        case 13:
            return "The clip length is too long (max 3600 frames / 60 seconds). Lower the clip length.";
        case 14:
            return "The generated savestate name is too long. Try a shorter name or a different naming style.";
        case 15:
            return "The generated savestate name has non-ASCII characters. Try a different name or naming style.";
        case 16:
            return "The character is in a special action state at this frame, which can't be exported yet. Try a nearby frame.";
        case 17:
            return `No exportable game state was found at or before frame ${frame} (for example mid-throw, mid-attack, or too early in the match). Try a later frame.`;
        case 18:
            return "The opponent (CPU) is Zelda, which Training Mode can't export due to an UnclePunch bug.";
        default:
            return `Internal error (code ${status}).`;
    }
}

interface WorkerOutcome {
    status: number | null;
    stderr: string;
    failure: string | null;
}

function runWorker(request: WorkerRequest): Promise<WorkerOutcome> {
    return new Promise((resolve) => {
        const child = utilityProcess.fork(join(__dirname, "savestateWorker.js"), [], {
            serviceName: "Savestate exporter",
            stdio: "pipe",
        });
        let status: number | null = null;
        let stderr = "";
        let failure: string | null = null;
        child.stdout?.on("data", () => {
            // The DLL prints "Savestate file ... created"; nothing to do with it.
        });
        child.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        const timer = setTimeout(() => {
            failure = "The exporter timed out.";
            child.kill();
        }, WORKER_TIMEOUT_MS);
        child.on("message", (message: { status: number }) => {
            status = message.status;
        });
        child.on("exit", (exitCode) => {
            clearTimeout(timer);
            if (status === null && !failure) {
                failure = `The exporter crashed (exit code ${exitCode}).`;
            }
            resolve({ status, stderr: stderr.trim(), failure });
        });
        child.postMessage(request);
    });
}

// The DLL builds the file name itself (from the naming style), so find what it wrote.
function findNewestSavestate(folder: string, sinceMs: number): string | null {
    let newest: { path: string; modifiedMs: number } | null = null;
    for (const entry of readdirSync(folder)) {
        if (extname(entry).toLowerCase() !== ".gci") {
            continue;
        }
        const fullPath = join(folder, entry);
        const modifiedMs = statSync(fullPath).mtimeMs;
        if (modifiedMs >= sinceMs && (!newest || modifiedMs > newest.modifiedMs)) {
            newest = { path: fullPath, modifiedMs };
        }
    }
    return newest?.path ?? null;
}

async function exportSavestate(request: SavestateExportRequest): Promise<SavestateExportResult> {
    const dllPath = getDllPath();
    if (!existsSync(dllPath)) {
        return { ok: false, error: getMissingDllMessage() };
    }
    if (!request.exportFolder || !existsSync(request.exportFolder) || !statSync(request.exportFolder).isDirectory()) {
        return { ok: false, error: `Export folder not found: ${request.exportFolder || "(not set)"}` };
    }

    // File times can be coarser than Date.now(); allow a little slack.
    const startedMs = Date.now() - 2000;
    const outcome = await runWorker({
        dllPath,
        exportFolder: request.exportFolder,
        slpPath: request.slpPath,
        gameName: basename(request.slpPath, extname(request.slpPath)),
        customName: request.name.trim(),
        hmnPlayer: request.player === "high" ? 1 : 0,
        targetFrame: request.frame + SLP_FRAME_INDEX_OFFSET,
        clipLength: request.clipLength,
        namingStyle: request.namingStyle,
        endOnFrame: request.mode === "end" ? 1 : 0,
    });

    if (outcome.failure) {
        return { ok: false, error: outcome.failure, detail: outcome.stderr || undefined };
    }
    if (outcome.status !== 0) {
        return {
            ok: false,
            error: getStatusMessage(outcome.status ?? -1, request.frame),
            detail: outcome.stderr || undefined,
        };
    }
    return {
        ok: true,
        outputPath: findNewestSavestate(request.exportFolder, startedMs),
        exportFolder: request.exportFolder,
    };
}

export function registerSavestateHandlers(): void {
    ipcMain.handle("savestate:get-settings", (): SavestateEnvironment => getEnvironment());

    ipcMain.handle("savestate:save-settings", (_event, settings: SavestateSettings): void => {
        writeSettings(settings);
    });

    ipcMain.handle("savestate:choose-folder", async (_event, currentFolder: string | null): Promise<string | null> => {
        const result = await dialog.showOpenDialog({
            title: "Choose savestate export folder",
            defaultPath: currentFolder ?? undefined,
            properties: ["openDirectory"],
        });
        return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
    });

    ipcMain.handle("savestate:export", (_event, request: SavestateExportRequest) => exportSavestate(request));
}
