export const FRAMES_PER_SECOND = 60;

// Port colors match the in-game P1-P4 HUD colors.
const PORT_COLORS = ["#f15959", "#6565fe", "#fec65f", "#4ce44c"];

export function getPortColor(playerIndex: number): string {
    return PORT_COLORS[playerIndex] ?? "#cccccc";
}

function pad(value: number, length = 2): string {
    return String(value).padStart(length, "0");
}

function formatFrameCount(totalFrames: number): string {
    const clamped = Math.max(0, totalFrames);
    const minutes = Math.floor(clamped / (FRAMES_PER_SECOND * 60));
    const seconds = Math.floor(clamped / FRAMES_PER_SECOND) % 60;
    const centiseconds = Math.floor(((clamped % FRAMES_PER_SECOND) * 100) / FRAMES_PER_SECOND);
    return `${minutes}:${pad(seconds)}.${pad(centiseconds)}`;
}

// The in-game clock: counts down from the starting timer once the game starts at
// frame 0. Frames before 0 are the countdown and show the full starting time.
export function formatGameTimer(frame: number, startingTimerSeconds: number | null): string {
    if (startingTimerSeconds == null || startingTimerSeconds <= 0) {
        return formatFrameCount(frame);
    }
    return formatFrameCount(startingTimerSeconds * FRAMES_PER_SECOND - Math.max(0, frame));
}
