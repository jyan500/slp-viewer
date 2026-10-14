import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { app } from "electron";

// Read-only files that ship with the app. In development they live in the project
// folder; a packaged build copies them next to app.asar via electron-builder's
// extraResources (see electron-builder.yml), since the archive can't hold files that
// are loaded by native code (the DLL) and shouldn't hold ~90 MB of zips.
//   devPath:  path relative to the project root
//   resource: folder name under process.resourcesPath in a packaged build
export function getBundledPath(devPath: string, resource: string): string {
    return app.isPackaged ? join(process.resourcesPath, resource) : join(app.getAppPath(), devPath);
}

// Folder the user can edit and that survives restarts:
//   dev:      <project>/improover (managed by `npm run import-improover`)
//   portable: improover/ next to the .exe (the portable build unpacks itself to a new
//             temp folder each launch, so anything written beside the app is lost)
//   other packaged builds: <userData>/improover
export function getImprooverDirectory(): string {
    if (!app.isPackaged) {
        return join(app.getAppPath(), "improover");
    }
    const portableDirectory = process.env.PORTABLE_EXECUTABLE_DIR;
    return join(portableDirectory || app.getPath("userData"), "improover");
}

// The bundled copy of improover/ shipped inside a packaged build.
export function getBundledImprooverDirectory(): string {
    return getBundledPath("improover", "improover");
}

// Ensures `fileName` exists in the writable improover folder, copying the bundled
// version the first time. Returns the writable path either way.
export function seedImprooverFile(fileName: string): string {
    const target = join(getImprooverDirectory(), fileName);
    const bundled = join(getBundledImprooverDirectory(), fileName);
    if (!existsSync(target) && target !== bundled && existsSync(bundled)) {
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(bundled, target);
    }
    return target;
}
