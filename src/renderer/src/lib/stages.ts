import type { ReplayData } from "../../../shared/types";

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

export interface StageGeometry {
    // Main stage surface spans [-edge, +edge] at y = 0.
    edge: number;
    platforms: Platform[];
    blastZones: Bounds;
}

// Melee in-game units, legal stages only. FoD platforms move during the game; the
// heights here are their resting positions.
const STAGES: Record<number, StageGeometry> = {
    // Fountain of Dreams
    2: {
        edge: 63.35,
        platforms: [
            { left: -49.5, right: -21, height: 16.125 },
            { left: 21, right: 49.5, height: 22.125 },
            { left: -14.25, right: 14.25, height: 42.75 },
        ],
        blastZones: { left: -198.75, right: 198.75, top: 202.5, bottom: -146.25 },
    },
    // Pokemon Stadium
    3: {
        edge: 87.75,
        platforms: [
            { left: -55, right: -25, height: 25 },
            { left: 25, right: 55, height: 25 },
        ],
        blastZones: { left: -230, right: 230, top: 180, bottom: -111 },
    },
    // Yoshi's Story
    8: {
        edge: 56,
        platforms: [
            { left: -59.5, right: -28, height: 23.45 },
            { left: 28, right: 59.5, height: 23.45 },
            { left: -15.75, right: 15.75, height: 42 },
        ],
        blastZones: { left: -175.7, right: 173.6, top: 168, bottom: -91 },
    },
    // Dream Land N64
    28: {
        edge: 77.27,
        platforms: [
            { left: -61.39, right: -31.73, height: 30.24 },
            { left: 31.7, right: 63.08, height: 30.24 },
            { left: -19.02, right: 19.02, height: 51.43 },
        ],
        blastZones: { left: -255, right: 255, top: 250, bottom: -123 },
    },
    // Battlefield
    31: {
        edge: 68.4,
        platforms: [
            { left: -57.6, right: -20, height: 27.2 },
            { left: 20, right: 57.6, height: 27.2 },
            { left: -18.8, right: 18.8, height: 54.4 },
        ],
        blastZones: { left: -224, right: 224, top: 200, bottom: -108.8 },
    },
    // Final Destination
    32: {
        edge: 85.5657,
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
