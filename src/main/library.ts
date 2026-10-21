// File-system access for the replay browser side panel: lazily listing one folder at a
// time (paged), reading replay summaries for the rows, and a per-folder player search.
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { dialog, ipcMain } from "electron";
import { Frames, SlippiGame, characters, stages } from "@slippi/slippi-js/node";
import type { DirectoryListing, FolderSearchResponse, LibraryEntry, LibraryFileEntry, ReplaySummary } from "../shared/types";
import { getDefaultReplayDirectory } from "./paths";
import { getPlayerIdentity, safeName } from "./replay";

// Replays are read synchronously by slippi-js; yield between small batches so a large
// folder doesn't stall the main process.
const SUMMARY_BATCH_SIZE = 8;

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function byName(first: LibraryEntry, second: LibraryEntry): number {
    return nameCollator.compare(first.name, second.name);
}

function isReplayFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith(".slp");
}

// Keyed by path; a changed size or mtime (e.g. a replay still being written) re-reads it.
const summaryCache = new Map<string, { mtimeMs: number; size: number; summary: ReplaySummary | null }>();

// Only the Game Start event and the metadata block are read, not the frames.
function readReplaySummary(filePath: string): ReplaySummary | null {
    try {
        const game = new SlippiGame(filePath);
        const settings = game.getSettings();
        if (!settings) {
            return null;
        }
        const metadata = game.getMetadata();
        const stageId = settings.stageId ?? 0;
        const lastFrame = metadata?.lastFrame;
        return {
            players: settings.players.map((player) => {
                const characterId = player.characterId ?? 0;
                return {
                    port: player.port,
                    ...getPlayerIdentity(player, metadata),
                    characterName: safeName(() => characters.getCharacterShortName(characterId), "Unknown"),
                    teamId: settings.isTeams ? (player.teamId ?? null) : null,
                };
            }),
            stageName: safeName(() => stages.getStageName(stageId), `Stage ${stageId}`),
            startAt: metadata?.startAt ?? null,
            durationSeconds: lastFrame != null ? Math.max(0, (lastFrame - Frames.FIRST) / 60) : null,
        };
    } catch {
        return null;
    }
}

async function getReplaySummary(filePath: string): Promise<ReplaySummary | null> {
    let fileStat;
    try {
        fileStat = await stat(filePath);
    } catch {
        return null;
    }
    const cached = summaryCache.get(filePath);
    if (cached && cached.mtimeMs === fileStat.mtimeMs && cached.size === fileStat.size) {
        return cached.summary;
    }
    const summary = readReplaySummary(filePath);
    summaryCache.set(filePath, { mtimeMs: fileStat.mtimeMs, size: fileStat.size, summary });
    return summary;
}

async function withSummaries(files: LibraryEntry[]): Promise<LibraryFileEntry[]> {
    const results: LibraryFileEntry[] = [];
    for (let start = 0; start < files.length; start += SUMMARY_BATCH_SIZE) {
        const batch = files.slice(start, start + SUMMARY_BATCH_SIZE);
        const summaries = await Promise.all(batch.map((file) => getReplaySummary(file.path)));
        batch.forEach((file, index) => results.push({ ...file, summary: summaries[index] }));
        await new Promise((resolve) => setImmediate(resolve));
    }
    return results;
}

// Slippi names replays "Game_YYYYMMDDTHHMMSS.slp" (local time, when the game started).
const REPLAY_TIMESTAMP_PATTERN = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/;

// When a replay was played, without opening it: the timestamp in its name, or else its
// modified time (renamed replays). Unreadable files sort last.
async function getReplayTime(file: LibraryEntry): Promise<number> {
    const match = REPLAY_TIMESTAMP_PATTERN.exec(file.name);
    if (match) {
        const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
        const time = new Date(year, month - 1, day, hour, minute, second).getTime();
        if (!Number.isNaN(time)) {
            return time;
        }
    }
    try {
        return (await stat(file.path)).mtimeMs;
    } catch {
        return -Infinity;
    }
}

// Most recent first; ties (e.g. a renamed copy) fall back to the name.
async function sortByMostRecent(files: LibraryEntry[]): Promise<LibraryEntry[]> {
    const times = new Map(await Promise.all(files.map(async (file) => [file, await getReplayTime(file)] as const)));
    return files.sort((first, second) => (times.get(second) as number) - (times.get(first) as number) || byName(first, second));
}

async function readFolder(directoryPath: string): Promise<{ folders: LibraryEntry[]; files: LibraryEntry[] }> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const folders: LibraryEntry[] = [];
    const files: LibraryEntry[] = [];
    for (const entry of entries) {
        const entryPath = join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            folders.push({ name: entry.name, path: entryPath });
        } else if (entry.isFile() && isReplayFile(entry.name)) {
            files.push({ name: entry.name, path: entryPath });
        }
    }
    return { folders: folders.sort(byName), files: await sortByMostRecent(files) };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function listDirectory(directoryPath: string, offset: number, limit: number): Promise<DirectoryListing> {
    try {
        const { folders, files } = await readFolder(directoryPath);
        return {
            folders,
            files: await withSummaries(files.slice(offset, offset + limit)),
            totalFiles: files.length,
        };
    } catch (error) {
        return { folders: [], files: [], totalFiles: 0, error: errorMessage(error) };
    }
}

// Matches the connect code or display name of any player, among the replays directly in
// `folderPath` (subfolders aren't searched).
async function searchFolder(folderPath: string, query: string, offset: number, limit: number): Promise<FolderSearchResponse> {
    const needle = query.trim().toLowerCase();
    if (!needle) {
        return { files: [], totalMatches: 0 };
    }
    try {
        const { files } = await readFolder(folderPath);
        const matches = (await withSummaries(files)).filter(
            (file) =>
                file.summary?.players.some(
                    (player) =>
                        player.connectCode.toLowerCase().includes(needle) ||
                        player.displayName.toLowerCase().includes(needle),
                ) ?? false,
        );
        return { files: matches.slice(offset, offset + limit), totalMatches: matches.length };
    } catch (error) {
        return { files: [], totalMatches: 0, error: errorMessage(error) };
    }
}

export function registerLibraryHandlers(): void {
    ipcMain.handle("library:default-folder", (): string => getDefaultReplayDirectory());

    ipcMain.handle("library:list", (_event, directoryPath: string, offset: number, limit: number) =>
        listDirectory(directoryPath, offset, limit),
    );

    ipcMain.handle("library:search", (_event, folderPath: string, query: string, offset: number, limit: number) =>
        searchFolder(folderPath, query, offset, limit),
    );

    ipcMain.handle("library:choose-folder", async (_event, currentFolder: string | null): Promise<string | null> => {
        const result = await dialog.showOpenDialog({
            title: "Choose replay folder",
            defaultPath: currentFolder ?? getDefaultReplayDirectory(),
            properties: ["openDirectory"],
        });
        return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
    });
}
