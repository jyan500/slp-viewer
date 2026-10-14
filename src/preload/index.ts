import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
    LoadReplayResult,
    SavestateEnvironment,
    SavestateExportRequest,
    SavestateExportResult,
    SavestateSettings,
} from "../shared/types";

contextBridge.exposeInMainWorld("api", {
    getInitialReplayPath: (): Promise<string | null> => ipcRenderer.invoke("replay:initial-path"),
    openReplayDialog: (): Promise<string | null> => ipcRenderer.invoke("replay:open"),
    loadReplay: (filePath: string): Promise<LoadReplayResult> =>
        ipcRenderer.invoke("replay:load", filePath),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
    loadAnimationZip: (zipName: string): Promise<Uint8Array | null> =>
        ipcRenderer.invoke("animations:load", zipName),
    getSavestateSettings: (): Promise<SavestateEnvironment> => ipcRenderer.invoke("savestate:get-settings"),
    saveSavestateSettings: (settings: SavestateSettings): Promise<void> =>
        ipcRenderer.invoke("savestate:save-settings", settings),
    chooseExportFolder: (currentFolder: string | null): Promise<string | null> =>
        ipcRenderer.invoke("savestate:choose-folder", currentFolder),
    exportSavestate: (request: SavestateExportRequest): Promise<SavestateExportResult> =>
        ipcRenderer.invoke("savestate:export", request),
});
