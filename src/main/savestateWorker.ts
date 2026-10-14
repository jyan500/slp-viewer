// Runs in an Electron utility process (see savestate.ts). Loading the DLL here means a
// Rust panic/abort only kills this process, not the viewer, and the DLL is released
// when the process exits so it can be replaced while the viewer is open.
import koffi from "koffi";

export interface WorkerRequest {
    dllPath: string;
    exportFolder: string;
    slpPath: string;
    gameName: string;
    customName: string;
    hmnPlayer: number;
    targetFrame: number;
    clipLength: number;
    namingStyle: number;
    endOnFrame: number;
}

process.parentPort.once("message", (event) => {
    const request = event.data as WorkerRequest;
    const library = koffi.load(request.dllPath);
    // slippi_analyzer/src/lib.rs: create_savestate_at_frame
    const createSavestateAtFrame = library.func(
        "int32 create_savestate_at_frame(str, str, str, str, int32, int32, int32, int32, int32)",
    );
    const status: number = createSavestateAtFrame(
        request.exportFolder,
        request.slpPath,
        request.gameName,
        request.customName,
        request.hmnPlayer,
        request.targetFrame,
        request.clipLength,
        request.namingStyle,
        request.endOnFrame,
    );
    process.parentPort.postMessage({ status });
    library.unload();
    process.exit(0);
});
