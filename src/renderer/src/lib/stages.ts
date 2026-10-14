// Legal stage geometry in Melee world units. Outlines, platforms and blast zones come
// from Slippi Lab's Stage.tsx (MIT, see THIRD_PARTY_NOTICES.md).
import type { ReplayData } from "../../../shared/types";
import { FOD_INITIAL_LEFT_PLATFORM_HEIGHT, FOD_INITIAL_RIGHT_PLATFORM_HEIGHT } from "../../../shared/stages";
import { getRandallSegment, type PlatformSegment } from "./randall";

export interface Platform {
    left: number;
    right: number;
    height: number;
}

export interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface MovingPlatform extends PlatformSegment {
    // Randall is drawn as a cloud; others like the stage's regular platforms.
    style: "cloud" | "platform";
    // True when the real position isn't known (drawn dashed).
    isEstimated: boolean;
}

export interface StageGeometry {
    // Main stage polygon as (x, y) points; closed automatically.
    outline: Array<[number, number]>;
    platforms: Platform[];
    blastZones: Bounds;
    // Platforms whose position depends on the frame (`frame` is the Slippi frame number).
    getMovingPlatforms?: (frame: number, replay: ReplayData) => MovingPlatform[];
}

// Fountain of Dreams side platforms move; replays 3.18+ record their raw heights, which
// this factor converts to world units (checked against characters standing on them).
const FOD_PLATFORM_HEIGHT_SCALE = 0.80625;

function getFountainPlatforms(frame: number, replay: ReplayData): MovingPlatform[] {
    const heights = replay.fodPlatformHeights;
    const frameIndex = Math.min(Math.max(frame - replay.firstFrame, 0), replay.frames.length - 1);
    const leftRaw = heights ? heights.left[frameIndex] : FOD_INITIAL_LEFT_PLATFORM_HEIGHT;
    const rightRaw = heights ? heights.right[frameIndex] : FOD_INITIAL_RIGHT_PLATFORM_HEIGHT;
    const isEstimated = heights === null;
    return [
        { left: -49.5, right: -21, y: leftRaw * FOD_PLATFORM_HEIGHT_SCALE, style: "platform", isEstimated },
        { left: 21, right: 49.5, y: rightRaw * FOD_PLATFORM_HEIGHT_SCALE, style: "platform", isEstimated },
    ];
}

const STAGES: Record<number, StageGeometry> = {
    // Fountain of Dreams
    2: {
        outline: [
            [-63.33, 0.62], [-53.5, 0.62], [-51, 0], [51, 0], [53.5, 0.62], [63.33, 0.62],
            [63.35, 0.62], [63.35, -4.5], [59.33, -15], [56.9, -19.5], [55, -27], [52, -32],
            [48, -38], [41, -42], [19, -49.5], [13, -54.5], [10, -62], [8.8, -72], [8.8, -150],
            [-8.8, -150], [-8.8, -72], [-10, -62], [-13, -54.5], [-19, -49.5], [-41, -42],
            [-48, -38], [-52, -32], [-55, -27], [-56.9, -19.5], [-59.33, -15], [-63.35, -4.5],
        ],
        // The side platforms move; see getMovingPlatforms.
        platforms: [{ left: -14.25, right: 14.25, height: 42.75 }],
        blastZones: { left: -198.75, right: 198.75, top: 202.5, bottom: -146.25 },
        getMovingPlatforms: getFountainPlatforms,
    },
    // Pokemon Stadium (transformations aren't modeled; this is the neutral layout)
    3: {
        outline: [
            [87.75, 0], [87.75, -4], [73.75, -15], [73.75, -17.75], [60, -17.75], [60, -38],
            [15, -60], [15, -112], [-15, -112], [-15, -60], [-60, -38], [-60, -17.75],
            [-73.75, -17.75], [-73.75, -15], [-87.75, -4], [-87.75, 0],
        ],
        platforms: [
            { left: -55, right: -25, height: 25 },
            { left: 25, right: 55, height: 25 },
        ],
        blastZones: { left: -230, right: 230, top: 180, bottom: -111 },
    },
    // Yoshi's Story. The top is flat from -39 to 39, then slopes down to y = -3.5 at the
    // ledges. Randall, the cloud, moves on a fixed loop (see randall.ts).
    8: {
        outline: [
            [-54, -91], [-54, -47], [-53, -46], [-53, -31], [-54, -30], [-54, -28], [-53, -27],
            [-53, -12], [-54, -11], [-55, -8], [-56, -7], [-56, -3.5], [-39, 0], [39, 0],
            [56, -3.5], [56, -7], [55, -8], [54, -11], [53, -12], [53, -27], [54, -28],
            [54, -30], [53, -31], [53, -46], [54, -47], [54, -91],
        ],
        platforms: [
            { left: -59.5, right: -28, height: 23.45 },
            { left: 28, right: 59.5, height: 23.45 },
            { left: -15.75, right: 15.75, height: 42 },
        ],
        blastZones: { left: -175.7, right: 173.6, top: 168, bottom: -91 },
        getMovingPlatforms: (frame) => [{ ...getRandallSegment(frame), style: "cloud", isEstimated: false }],
    },
    // Dream Land N64 (the side platforms are at slightly different heights)
    28: {
        outline: [[-76.5, -11], [-77.25, 0], [77.25, 0], [76.5, -11], [65.75, -36], [-65.75, -36]],
        platforms: [
            { left: -61.393, right: -31.725, height: 30.142 },
            { left: 31.704, right: 63.075, height: 30.243 },
            { left: -19.018, right: 19.017, height: 51.425 },
        ],
        blastZones: { left: -255, right: 255, top: 250, bottom: -123 },
    },
    // Battlefield
    31: {
        outline: [
            [-68.4, 0], [68.4, 0], [65, -6], [36, -19], [39, -21], [33, -25], [30, -29],
            [29, -35], [10, -40], [10, -30], [-10, -30], [-10, -40], [-29, -35], [-30, -29],
            [-33, -25], [-39, -21], [-36, -19], [-65, -6],
        ],
        platforms: [
            { left: -57.6, right: -20, height: 27.2 },
            { left: 20, right: 57.6, height: 27.2 },
            { left: -18.8, right: 18.8, height: 54.4 },
        ],
        blastZones: { left: -224, right: 224, top: 200, bottom: -108.8 },
    },
    // Final Destination
    32: {
        outline: [
            [-85.6, 0], [85.6, 0], [85.6, -10], [65, -20], [65, -30], [60, -47], [50, -55],
            [45, -56], [-45, -56], [-50, -55], [-60, -47], [-65, -30], [-65, -20], [-85.6, -10],
        ],
        platforms: [],
        blastZones: { left: -246, right: 246, top: 188, bottom: -140 },
    },
};

export function getStageGeometry(stageId: number): StageGeometry | null {
    return STAGES[stageId] ?? null;
}

// The area to fit on screen: the stage's blast zones, or for unknown stages the
// extent of every position any character reached during the replay.
export function getViewBounds(replay: ReplayData): Bounds {
    const geometry = getStageGeometry(replay.stageId);
    if (geometry) {
        return geometry.blastZones;
    }
    const bounds: Bounds = { left: -100, right: 100, top: 100, bottom: -50 };
    for (const snapshot of replay.frames) {
        for (const state of [...snapshot.players, ...snapshot.followers]) {
            if (!state) {
                continue;
            }
            bounds.left = Math.min(bounds.left, state.x);
            bounds.right = Math.max(bounds.right, state.x);
            bounds.top = Math.max(bounds.top, state.y);
            bounds.bottom = Math.min(bounds.bottom, state.y);
        }
    }
    return {
        left: bounds.left - 20,
        right: bounds.right + 20,
        top: bounds.top + 30,
        bottom: bounds.bottom - 20,
    };
}
