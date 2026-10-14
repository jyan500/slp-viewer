import { readFile } from "fs/promises";
import { join } from "path";
import { ipcMain } from "electron";
import type { StadiumCollision } from "../shared/types";
import { getBundledPath } from "./paths";

// Pokemon Stadium transformation geometry, produced by `npm run extract-stadium` from the
// user's own ISO. Null when it hasn't been extracted; the viewer then draws the default
// layout only.
export function registerStadiumHandlers(): void {
    ipcMain.handle("stadium:load", async (): Promise<StadiumCollision | null> => {
        const filePath = join(getBundledPath(join("resources", "stadium"), "stadium"), "stadium-collision.json");
        try {
            return JSON.parse(await readFile(filePath, "utf8")) as StadiumCollision;
        } catch {
            return null;
        }
    });
}
