import { useCallback, useState } from "react";
import type { ReplayData } from "../../../shared/types";
import { usePlayback } from "../hooks/usePlayback";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useCharacterAnimations } from "../hooks/useCharacterAnimations";
import { useCameraMode } from "../hooks/useCameraMode";
import { StageCanvas } from "./StageCanvas";
import { PlayerHud } from "./PlayerHud";
import { PlaybackControls } from "./PlaybackControls";
import { SavestateDialog } from "./SavestateDialog";

interface ReplayViewerProps {
    replay: ReplayData;
}

// Keyed by file path in App, so playback state resets whenever a new replay loads.
export function ReplayViewer({ replay }: ReplayViewerProps) {
    const playback = usePlayback(replay.firstFrame, replay.lastFrame);
    const [cameraMode, toggleCameraMode] = useCameraMode();
    const [isSavestateOpen, setIsSavestateOpen] = useState(false);
    useKeyboardShortcuts({
        playback,
        firstFrame: replay.firstFrame,
        lastFrame: replay.lastFrame,
        onToggleCamera: toggleCameraMode,
        isEnabled: !isSavestateOpen,
    });
    const animationsByZip = useCharacterAnimations(replay.internalCharacterIds);
    const snapshot = replay.frames[playback.frame - replay.firstFrame];

    const { isPlaying, togglePlay } = playback;
    const openSavestate = useCallback(() => {
        if (isPlaying) {
            togglePlay();
        }
        setIsSavestateOpen(true);
    }, [isPlaying, togglePlay]);
    const closeSavestate = useCallback(() => setIsSavestateOpen(false), []);

    return (
        <div className="replay-viewer">
            <StageCanvas
                replay={replay}
                frame={playback.frame}
                animationsByZip={animationsByZip}
                cameraMode={cameraMode}
            />
            <PlayerHud players={replay.players} snapshot={snapshot} />
            <PlaybackControls
                playback={playback}
                firstFrame={replay.firstFrame}
                lastFrame={replay.lastFrame}
                startingTimerSeconds={replay.startingTimerSeconds}
                cameraMode={cameraMode}
                onToggleCameraMode={toggleCameraMode}
                // create_savestate_at_frame only supports two-player games.
                canExportSavestate={replay.players.length === 2}
                onExportSavestate={openSavestate}
            />
            {isSavestateOpen && (
                <SavestateDialog replay={replay} initialFrame={playback.frame} onClose={closeSavestate} />
            )}
        </div>
    );
}
