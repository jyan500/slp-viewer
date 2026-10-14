import { useEffect } from "react";
import type { Playback } from "./usePlayback";

const LARGE_STEP = 10;

function isTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target instanceof HTMLInputElement) {
        return target.type !== "range";
    }
    return target.isContentEditable || target instanceof HTMLTextAreaElement;
}

interface KeyboardShortcutOptions {
    playback: Playback;
    firstFrame: number;
    lastFrame: number;
    onToggleCamera: () => void;
    // False while a modal is open, so keys don't drive playback behind it.
    isEnabled: boolean;
}

// ←/→ step one frame (Shift: 10), Space plays/pauses, Home/End jump to the ends,
// C toggles the follow camera.
export function useKeyboardShortcuts({
    playback,
    firstFrame,
    lastFrame,
    onToggleCamera,
    isEnabled,
}: KeyboardShortcutOptions): void {
    const { step, seek, togglePlay } = playback;

    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (isTextEntry(event.target)) {
                return;
            }
            const stepSize = event.shiftKey ? LARGE_STEP : 1;
            switch (event.key) {
                case "ArrowRight":
                    step(stepSize);
                    break;
                case "ArrowLeft":
                    step(-stepSize);
                    break;
                case " ":
                    if (!event.repeat) {
                        togglePlay();
                    }
                    break;
                case "Home":
                    seek(firstFrame);
                    break;
                case "End":
                    seek(lastFrame);
                    break;
                case "c":
                case "C":
                    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
                        return;
                    }
                    onToggleCamera();
                    break;
                default:
                    return;
            }
            // Stop focused controls (seek bar, buttons) from also reacting to the key.
            event.preventDefault();
        };

        // A focused button activates on Space keyup; cancel that so Space only toggles once.
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === " " && !isTextEntry(event.target)) {
                event.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [step, seek, togglePlay, firstFrame, lastFrame, onToggleCamera, isEnabled]);
}
