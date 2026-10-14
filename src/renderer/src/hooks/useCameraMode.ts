import { useCallback } from "react";
import type { CameraMode } from "../lib/camera";
import { usePersistentState } from "./usePersistentState";

function isCameraMode(value: unknown): value is CameraMode {
    return value === "follow" || value === "stage";
}

// Remembered across replays and app restarts.
export function useCameraMode(): [CameraMode, () => void] {
    const [cameraMode, setCameraMode] = usePersistentState<CameraMode>("slp-viewer.cameraMode", "follow", isCameraMode);

    const toggleCameraMode = useCallback(() => {
        setCameraMode((current) => (current === "follow" ? "stage" : "follow"));
    }, [setCameraMode]);

    return [cameraMode, toggleCameraMode];
}
