import { readFile } from "fs/promises";
import { join } from "path";
import { app, ipcMain } from "electron";

const ZIP_NAME_PATTERN = /^[A-Za-z]+$/;

function getAnimationsDirectory(): string {
    return join(app.getAppPath(), "resources", "animations");
}

// Serves the raw (still compressed) zip; the renderer unzips it. Sending compressed
// bytes over IPC is far cheaper than tens of MB of parsed SVG path strings.
export function registerAnimationHandlers(): void {
    ipcMain.handle("animations:load", async (_event, zipName: string): Promise<Uint8Array | null> => {
        if (!ZIP_NAME_PATTERN.test(zipName)) {
            return null;
        }
        try {
            return await readFile(join(getAnimationsDirectory(), `${zipName}.zip`));
        } catch {
            return null;
        }
    });
}
