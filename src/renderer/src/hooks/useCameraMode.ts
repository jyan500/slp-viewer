import { useCallback, useState } from "react";
import type { CameraMode } from "../lib/camera";

const STORAGE_KEY = "slp-viewer.cameraMode";

function readStoredMode(): CameraMode {
    try {
        return localStorage.getItem(STORAGE_KEY) === "stage" ? "stage" : "follow";
    } catch {
        return "follow";
    }
}

// Remembered across replays and app restarts.
export function useCameraMode(): [CameraMode, () => void] {
    const [cameraMode, setCameraMode] = useState<CameraMode>(readStoredMode);

    const toggleCameraMode = useCallback(() => {
        setCameraMode((current) => {
            const next = current === "follow" ? "stage" : "follow";
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // Storage unavailable; the choice just won't persist.
            }
            return next;
        });
    }, []);

    return [cameraMode, toggleCameraMode];
}
