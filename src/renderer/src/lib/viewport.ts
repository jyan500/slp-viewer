import type { CameraView } from "./camera";

const PADDING_PX = 16;

// Maps Melee world units (y up) onto canvas pixels (y down).
export interface Viewport {
    scale: number;
    toScreenX: (x: number) => number;
    toScreenY: (y: number) => number;
}

// Fits `view` inside the canvas, preserving aspect ratio.
export function createViewport(view: CameraView, width: number, height: number): Viewport {
    const scale = Math.min((width - PADDING_PX * 2) / view.width, (height - PADDING_PX * 2) / view.height);
    return {
        scale,
        toScreenX: (x) => width / 2 + (x - view.centerX) * scale,
        toScreenY: (y) => height / 2 - (y - view.centerY) * scale,
    };
}
