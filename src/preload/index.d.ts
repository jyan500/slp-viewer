import type {
    DirectoryListing,
    LibrarySearchResponse,
    LoadReplayResult,
    SavestateEnvironment,
    SavestateExportRequest,
    SavestateExportResult,
    SavestateSettings,
    StadiumCollision,
} from "../shared/types";

declare global {
    interface Window {
        api: {
            getInitialReplayPath: () => Promise<string | null>;
            openReplayDialog: () => Promise<string | null>;
            loadReplay: (filePath: string) => Promise<LoadReplayResult>;
            getPathForFile: (file: File) => string;
            loadAnimationZip: (zipName: string) => Promise<Uint8Array | null>;
            getSavestateSettings: () => Promise<SavestateEnvironment>;
            saveSavestateSettings: (settings: SavestateSettings) => Promise<void>;
            chooseExportFolder: (currentFolder: string | null) => Promise<string | null>;
            exportSavestate: (request: SavestateExportRequest) => Promise<SavestateExportResult>;
            loadStadiumCollision: () => Promise<StadiumCollision | null>;
            getDefaultLibraryFolder: () => Promise<string>;
            listDirectory: (directoryPath: string) => Promise<DirectoryListing>;
            searchLibrary: (rootPath: string, query: string) => Promise<LibrarySearchResponse>;
            chooseLibraryFolder: (currentFolder: string | null) => Promise<string | null>;
        };
    }
}

export {};
