// Pokemon Stadium transformations. Which form is active comes from the replay's stage
// events; the shapes come from collision lines extracted from the user's ISO
// (scripts/extract-stadium.mjs). Water's rotating windmill isn't included.
import type { StadiumCollision, StadiumCollisionLine, StadiumEvent } from "../../../shared/types";

type FormName = keyof StadiumCollision["groups"];

const FORM_BY_ID: Record<number, FormName> = { 3: "fire", 4: "grass", 5: "normal", 6: "rock", 9: "water" };
const FORM_LABELS: Record<FormName, string> = {
    base: "",
    normal: "Normal",
    fire: "Fire",
    grass: "Grass",
    rock: "Rock",
    water: "Water",
};

const EVENT_ON_MONITOR = 3;
const EVENT_RECEDING = 4;
const EVENT_RISING = 5;
const EVENT_FINISH = 6;
// Typical phase lengths, used when the replay ends before the phase does.
const DEFAULT_RECEDE_FRAMES = 181;
const DEFAULT_RISE_FRAMES = 121;

export interface StadiumState {
    phase: "settled" | "monitor" | "receding" | "rising";
    // The form whose terrain is currently up (or going down / coming up).
    form: FormName;
    // The form that will appear next, during monitor/receding.
    nextForm: FormName | null;
    // 0..1 through the receding or rising phase.
    progress: number;
}

function findNextEventFrame(events: StadiumEvent[], afterFrame: number, eventType: number): number | null {
    return events.find((event) => event.frame > afterFrame && event.event === eventType)?.frame ?? null;
}

export function getStadiumState(frame: number, events: StadiumEvent[]): StadiumState {
    let settled: FormName = "normal";
    let state: StadiumState = { phase: "settled", form: settled, nextForm: null, progress: 1 };
    for (const event of events) {
        if (event.frame > frame) {
            break;
        }
        const form = FORM_BY_ID[event.transformation] ?? "normal";
        if (event.event === EVENT_ON_MONITOR) {
            state = { phase: "monitor", form: settled, nextForm: form, progress: 0 };
        } else if (event.event === EVENT_RECEDING) {
            const end = findNextEventFrame(events, event.frame, EVENT_RISING) ?? event.frame + DEFAULT_RECEDE_FRAMES;
            state = { phase: "receding", form: settled, nextForm: form, progress: (frame - event.frame) / (end - event.frame) };
        } else if (event.event === EVENT_RISING) {
            const end = findNextEventFrame(events, event.frame, EVENT_FINISH) ?? event.frame + DEFAULT_RISE_FRAMES;
            state = { phase: "rising", form, nextForm: null, progress: (frame - event.frame) / (end - event.frame) };
        } else if (event.event === EVENT_FINISH) {
            settled = form;
            state = { phase: "settled", form, nextForm: null, progress: 1 };
        }
    }
    return { ...state, progress: Math.min(1, Math.max(0, state.progress)) };
}

// Short description for the canvas, or null on the plain stage.
export function getStadiumLabel(state: StadiumState): string | null {
    const current = FORM_LABELS[state.form];
    const next = state.nextForm ? FORM_LABELS[state.nextForm] : "";
    switch (state.phase) {
        case "monitor":
            return `${current} · ${next} next`;
        case "receding":
            return `${current} sinking → ${next}`;
        case "rising":
            return `${current} rising`;
        default:
            return state.form === "normal" ? null : current;
    }
}

export interface TerrainLine extends StadiumCollisionLine {
    // True while the terrain is sinking or rising (the vertical scaling is approximate).
    isMoving: boolean;
}

// The stage's lines for this frame: the permanent outer edges plus the active form,
// which is scaled vertically toward the floor while it sinks or rises.
export function getStadiumTerrain(state: StadiumState, collision: StadiumCollision): TerrainLine[] {
    let scale = 1;
    if (state.phase === "receding") {
        scale = 1 - state.progress;
    } else if (state.phase === "rising") {
        scale = state.progress;
    }
    const isMoving = scale < 1;
    const formLines = collision.groups[state.form].map((line) => ({
        ...line,
        y1: line.y1 * scale,
        y2: line.y2 * scale,
        isMoving,
    }));
    const baseLines = collision.groups.base.map((line) => ({ ...line, isMoving: false }));
    return [...baseLines, ...formLines];
}
