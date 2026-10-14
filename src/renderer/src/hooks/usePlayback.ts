import { useCallback, useEffect, useState } from "react";
import { FRAMES_PER_SECOND } from "../lib/format";

const FRAME_DURATION_MS = 1000 / FRAMES_PER_SECOND;

export interface Playback {
    frame: number;
    isPlaying: boolean;
    speed: number;
    seek: (targetFrame: number) => void;
    step: (delta: number) => void;
    togglePlay: () => void;
    setSpeed: (speed: number) => void;
}

// Single source of truth for the current frame. `frame` is always an integer Slippi
// frame number within [firstFrame, lastFrame]; every way of changing it (stepping,
// seeking, playing) goes through the same clamp so the readout and seek bar agree.
export function usePlayback(firstFrame: number, lastFrame: number): Playback {
    const [frame, setFrame] = useState(firstFrame);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);

    const clampFrame = useCallback(
        (value: number) => Math.min(lastFrame, Math.max(firstFrame, Math.round(value))),
        [firstFrame, lastFrame],
    );

    const seek = useCallback(
        (targetFrame: number) => {
            if (Number.isNaN(targetFrame)) {
                return;
            }
            setIsPlaying(false);
            setFrame(clampFrame(targetFrame));
        },
        [clampFrame],
    );

    const step = useCallback(
        (delta: number) => {
            setIsPlaying(false);
            setFrame((current) => clampFrame(current + delta));
        },
        [clampFrame],
    );

    const togglePlay = useCallback(() => {
        setIsPlaying((playing) => {
            if (!playing) {
                // Restart from the beginning when play is pressed at the end.
                setFrame((current) => (current >= lastFrame ? firstFrame : current));
            }
            return !playing;
        });
    }, [firstFrame, lastFrame]);

    useEffect(() => {
        if (!isPlaying) {
            return;
        }
        let animationHandle = 0;
        let previousTime = performance.now();
        let accumulatedMs = 0;

        const tick = (now: number) => {
            accumulatedMs += (now - previousTime) * speed;
            previousTime = now;
            const framesToAdvance = Math.floor(accumulatedMs / FRAME_DURATION_MS);
            if (framesToAdvance > 0) {
                accumulatedMs -= framesToAdvance * FRAME_DURATION_MS;
                setFrame((current) => Math.min(lastFrame, current + framesToAdvance));
            }
            animationHandle = requestAnimationFrame(tick);
        };

        animationHandle = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationHandle);
    }, [isPlaying, speed, lastFrame]);

    useEffect(() => {
        if (isPlaying && frame >= lastFrame) {
            setIsPlaying(false);
        }
    }, [isPlaying, frame, lastFrame]);

    return { frame, isPlaying, speed, seek, step, togglePlay, setSpeed };
}
