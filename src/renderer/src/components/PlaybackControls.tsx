import { useEffect, useState, type KeyboardEvent } from "react";
import { ChevronFirst, ChevronLast, Focus, Maximize, Pause, Play, Save, StepBack, StepForward } from "lucide-react";
import type { Playback } from "../hooks/usePlayback";
import type { CameraMode } from "../lib/camera";
import { formatGameTimer } from "../lib/format";

const SPEEDS = [0.25, 0.5, 1, 2];

interface PlaybackControlsProps {
    playback: Playback;
    firstFrame: number;
    lastFrame: number;
    startingTimerSeconds: number | null;
    cameraMode: CameraMode;
    onToggleCameraMode: () => void;
    canExportSavestate: boolean;
    onExportSavestate: () => void;
}

export function PlaybackControls({
    playback,
    firstFrame,
    lastFrame,
    startingTimerSeconds,
    cameraMode,
    onToggleCameraMode,
    canExportSavestate,
    onExportSavestate,
}: PlaybackControlsProps) {
    const { frame, isPlaying, speed, seek, step, togglePlay, setSpeed } = playback;
    const [frameDraft, setFrameDraft] = useState(String(frame));

    useEffect(() => {
        setFrameDraft(String(frame));
    }, [frame]);

    const commitFrameDraft = () => {
        const parsed = Number.parseInt(frameDraft, 10);
        if (Number.isNaN(parsed)) {
            setFrameDraft(String(frame));
            return;
        }
        seek(parsed);
        // seek() clamps; show the clamped value even if the frame didn't change.
        setFrameDraft(String(Math.min(lastFrame, Math.max(firstFrame, parsed))));
    };

    const handleFrameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            commitFrameDraft();
            event.currentTarget.blur();
        } else if (event.key === "Escape") {
            // Not blurring here: onBlur would commit the stale draft before the reset lands.
            setFrameDraft(String(frame));
        }
    };

    return (
        <div className="playback-controls">
            <input
                className="seek-bar"
                type="range"
                min={firstFrame}
                max={lastFrame}
                step={1}
                value={frame}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Seek"
            />
            <div className="controls-row">
                <div className="button-group">
                    <button onClick={() => seek(firstFrame)} title="First frame (Home)">
                        <ChevronFirst size={18} />
                    </button>
                    <button onClick={() => step(-1)} title="Previous frame (←, Shift+← for 10)">
                        <StepBack size={18} />
                    </button>
                    <button className="play-button" onClick={togglePlay} title="Play / pause (Space)">
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button onClick={() => step(1)} title="Next frame (→, Shift+→ for 10)">
                        <StepForward size={18} />
                    </button>
                    <button onClick={() => seek(lastFrame)} title="Last frame (End)">
                        <ChevronLast size={18} />
                    </button>
                </div>

                <label className="frame-readout">
                    Frame
                    <input
                        className="frame-input"
                        type="text"
                        inputMode="numeric"
                        value={frameDraft}
                        onChange={(event) => setFrameDraft(event.target.value)}
                        onBlur={commitFrameDraft}
                        onKeyDown={handleFrameKeyDown}
                        aria-label="Current frame"
                    />
                    <span className="frame-total">/ {lastFrame}</span>
                </label>

                <span className="game-timer" title="In-game timer">
                    {formatGameTimer(frame, startingTimerSeconds)}
                </span>

                <div className="speed-group" role="group" aria-label="Playback speed">
                    {SPEEDS.map((option) => (
                        <button
                            key={option}
                            className={option === speed ? "active" : undefined}
                            onClick={() => setSpeed(option)}
                        >
                            {option}×
                        </button>
                    ))}
                </div>

                <button
                    className="camera-toggle"
                    onClick={onToggleCameraMode}
                    title={
                        cameraMode === "follow"
                            ? "Camera follows the action. Click for the whole stage (C)"
                            : "Showing the whole stage. Click to follow the action (C)"
                    }
                >
                    {cameraMode === "follow" ? <Focus size={16} /> : <Maximize size={16} />}
                    {cameraMode === "follow" ? "Follow" : "Full stage"}
                </button>

                <button
                    className="savestate-button"
                    onClick={onExportSavestate}
                    disabled={!canExportSavestate}
                    title={
                        canExportSavestate
                            ? "Export a Training Mode savestate at this frame (Melee-Improover)"
                            : "Savestate export only supports two-player games"
                    }
                >
                    <Save size={16} />
                    Savestate
                </button>
            </div>
        </div>
    );
}
