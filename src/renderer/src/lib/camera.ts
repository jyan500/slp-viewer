// Follow camera, adapted from Slippi Lab's Camera.tsx (MIT, see THIRD_PARTY_NOTICES.md).
// Slippi Lab eases toward the target on every render, so the view depends on how you
// reached a frame. Here the same easing runs once over the whole replay, so every
// frame has a fixed camera and stepping/seeking is deterministic.
import type { ReplayData } from "../../../shared/types";
import { isDeadActionState } from "./actionStates";
import type { Bounds } from "./stages";

// "follow" tracks the characters; "stage" shows the whole stage out to the blast zones.
export type CameraMode = "follow" | "stage";

// A world-space rectangle to fit on screen.
export interface CameraView {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
}

// Fraction of the remaining distance the camera moves each frame.
const FOLLOW_SPEED = 0.04;
// World units kept around the outermost characters.
const PADDING = 25;
// Smallest area the camera zooms in to.
const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;
// Extra room beyond the padded box, matching Slippi Lab's 730x600 viewBox fitting a
// 640x480 target.
const MARGIN = 1.15;
// Action state 11 (Sleep) is the off-screen wait between stocks.
const SLEEP_ACTION_STATE = 11;

function smooth(from: number, to: number, byFraction: number): number {
    return from + (to - from) * byFraction;
}

function getTargetView(replay: ReplayData, frameIndex: number): CameraView | null {
    const snapshot = replay.frames[frameIndex];
    let left = Infinity;
    let right = -Infinity;
    let bottom = Infinity;
    let top = -Infinity;
    for (const state of snapshot.players) {
        // Dead and respawn-waiting characters sit far off-screen; following them would
        // zoom the camera out to the blast zones on every death.
        if (!state || isDeadActionState(state.actionStateId) || state.actionStateId === SLEEP_ACTION_STATE) {
            continue;
        }
        left = Math.min(left, state.x);
        right = Math.max(right, state.x);
        bottom = Math.min(bottom, state.y);
        top = Math.max(top, state.y);
    }
    if (left === Infinity) {
        return null;
    }
    left -= PADDING;
    right += PADDING;
    bottom -= PADDING;
    top += PADDING;
    return {
        centerX: (left + right) / 2,
        centerY: (bottom + top) / 2,
        width: Math.max(right - left, MIN_WIDTH) * MARGIN,
        height: Math.max(top - bottom, MIN_HEIGHT) * MARGIN,
    };
}

// One camera view per replay frame (same indexing as replay.frames).
export function computeCameraTrack(replay: ReplayData): CameraView[] {
    const track: CameraView[] = [];
    let current: CameraView | null = null;
    for (let frameIndex = 0; frameIndex < replay.frames.length; frameIndex++) {
        const target = getTargetView(replay, frameIndex) ?? current;
        if (!target) {
            track.push({ centerX: 0, centerY: 0, width: MIN_WIDTH * MARGIN, height: MIN_HEIGHT * MARGIN });
            continue;
        }
        const previous: CameraView = current ?? target;
        current = {
            centerX: smooth(previous.centerX, target.centerX, FOLLOW_SPEED),
            centerY: smooth(previous.centerY, target.centerY, FOLLOW_SPEED),
            width: smooth(previous.width, target.width, FOLLOW_SPEED),
            height: smooth(previous.height, target.height, FOLLOW_SPEED),
        };
        track.push(current);
    }
    return track;
}

export function boundsToView(bounds: Bounds): CameraView {
    return {
        centerX: (bounds.left + bounds.right) / 2,
        centerY: (bounds.top + bounds.bottom) / 2,
        width: bounds.right - bounds.left,
        height: bounds.top - bounds.bottom,
    };
}
