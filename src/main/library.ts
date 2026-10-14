// File-system access for the replay browser side panel: lazily listing one folder at
// a time, and a recursive name search under the chosen root.
import { readdir } from "fs/promises";
import { join, relative } from "path";
import { dialog, ipcMain } from "electron";
import type { DirectoryListing, LibraryEntry, LibrarySearchResponse, LibrarySearchResult } from "../shared/types";
import { getDefaultReplayDirectory } from "./paths";

const MAX_SEARCH_RESULTS = 500;

const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function byName(first: LibraryEntry, second: LibraryEntry): number {
    return nameCollator.compare(first.name, second.name);
}

function isReplayFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith(".slp");
}

async function listDirectory(directoryPath: string): Promise<DirectoryListing> {
    try {
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
        return { folders: folders.sort(byName), files: files.sort(byName) };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { folders: [], files: [], error: message };
    }
}

// Breadth-first, so shallow matches (e.g. a month folder) come before deep ones.
// Unreadable folders are skipped rather than failing the whole search.
async function searchLibrary(rootPath: string, query: string): Promise<LibrarySearchResponse> {
    const needle = query.trim().toLowerCase();
    const results: LibrarySearchResult[] = [];
    if (!needle) {
        return { results, isTruncated: false };
    }
    const queue = [rootPath];
    while (queue.length > 0) {
        const directoryPath = queue.shift() as string;
        let entries;
        try {
            entries = await readdir(directoryPath, { withFileTypes: true });
        } catch {
            continue;
        }
        const parentPath = relative(rootPath, directoryPath);
        const subfolders: string[] = [];
        const matches: LibrarySearchResult[] = [];
        for (const entry of entries) {
            const entryPath = join(directoryPath, entry.name);
            const isFolder = entry.isDirectory();
            if (isFolder) {
                subfolders.push(entryPath);
            } else if (!entry.isFile() || !isReplayFile(entry.name)) {
                continue;
            }
            if (entry.name.toLowerCase().includes(needle)) {
                matches.push({ name: entry.name, path: entryPath, kind: isFolder ? "folder" : "file", parentPath });
            }
        }
        matches.sort((first, second) =>
            first.kind === second.kind ? byName(first, second) : first.kind === "folder" ? -1 : 1,
        );
        for (const match of matches) {
            results.push(match);
            if (results.length >= MAX_SEARCH_RESULTS) {
                return { results, isTruncated: true };
            }
        }
        queue.push(...subfolders.sort((first, second) => nameCollator.compare(first, second)));
    }
    return { results, isTruncated: false };
}

export function registerLibraryHandlers(): void {
    ipcMain.handle("library:default-folder", (): string => getDefaultReplayDirectory());

    ipcMain.handle("library:list", (_event, directoryPath: string) => listDirectory(directoryPath));

    ipcMain.handle("library:search", (_event, rootPath: string, query: string) => searchLibrary(rootPath, query));

    ipcMain.handle("library:choose-folder", async (_event, currentFolder: string | null): Promise<string | null> => {
        const result = await dialog.showOpenDialog({
            title: "Choose replay folder",
            defaultPath: currentFolder ?? getDefaultReplayDirectory(),
            properties: ["openDirectory"],
        });
        return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
    });
}
