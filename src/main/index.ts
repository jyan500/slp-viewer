import { existsSync } from "fs";
import { dirname, join } from "path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { parseReplay } from "./replay";
import { registerAnimationHandlers } from "./animations";
import { registerSavestateHandlers } from "./savestate";
import type { LoadReplayResult } from "../shared/types";

const DEFAULT_REPLAY_DIR = "D:\\All Slippi Replays";

let lastOpenedDirectory: string | null = null;

function getDefaultDirectory(): string {
    if (lastOpenedDirectory) {
        return lastOpenedDirectory;
    }
    return existsSync(DEFAULT_REPLAY_DIR) ? DEFAULT_REPLAY_DIR : app.getPath("documents");
}

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        show: false,
        backgroundColor: "#0f1115",
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
        },
    });

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

registerAnimationHandlers();
registerSavestateHandlers();

// A replay passed on the command line, e.g. `slp-viewer path/to/game.slp` or "Open with".
ipcMain.handle("replay:initial-path", (): string | null => {
    const filePath = process.argv.slice(1).find((arg) => arg.toLowerCase().endsWith(".slp"));
    return filePath && existsSync(filePath) ? filePath : null;
});

ipcMain.handle("replay:open", async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
        title: "Open Slippi replay",
        defaultPath: getDefaultDirectory(),
        properties: ["openFile"],
        filters: [{ name: "Slippi replays", extensions: ["slp"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle("replay:load", async (_event, filePath: string): Promise<LoadReplayResult> => {
    try {
        const replay = parseReplay(filePath);
        lastOpenedDirectory = dirname(filePath);
        return { ok: true, replay };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, error: message };
    }
});

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.jyan500.slp-viewer");

    app.on("browser-window-created", (_event, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
