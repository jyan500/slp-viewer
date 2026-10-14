import { strFromU8, unzipSync } from "fflate";

export interface AnimationFrame {
    path: Path2D;
    // Height of the silhouette's highest point above the character's position, in
    // world units before the character's scale is applied (ignores rotation).
    topOffset: number;
}

const PATH_TOKEN = /[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const COMMAND_TOKEN = /^[a-zA-Z]$/;
// Number of parameters per SVG path command.
const PARAMETER_COUNTS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 };
// Which parameters of each command are y coordinates (control points included, which
// gives a slightly generous but safe bound).
const Y_PARAMETER_INDEXES: Record<string, number[]> = {
    m: [1], l: [1], v: [0], c: [1, 3, 5], s: [1, 3], q: [1, 3], t: [1], a: [6], h: [],
};

// Smallest y (the top, since model space is y-down) reached by an SVG path.
function getPathMinY(pathData: string): number {
    const tokens = pathData.match(PATH_TOKEN) ?? [];
    let command = "";
    let currentX = 0;
    let currentY = 0;
    let subpathStartX = 0;
    let subpathStartY = 0;
    let minY = Infinity;
    let tokenIndex = 0;
    while (tokenIndex < tokens.length) {
        const token = tokens[tokenIndex];
        if (COMMAND_TOKEN.test(token)) {
            command = token;
            tokenIndex++;
            if (command === "z" || command === "Z") {
                currentX = subpathStartX;
                currentY = subpathStartY;
            }
            continue;
        }
        const lowerCommand = command.toLowerCase();
        const parameterCount = PARAMETER_COUNTS[lowerCommand];
        if (!parameterCount) {
            tokenIndex++;
            continue;
        }
        const parameters = tokens.slice(tokenIndex, tokenIndex + parameterCount).map(Number);
        tokenIndex += parameterCount;
        const isRelative = command === lowerCommand;
        for (const yIndex of Y_PARAMETER_INDEXES[lowerCommand]) {
            minY = Math.min(minY, isRelative ? currentY + parameters[yIndex] : parameters[yIndex]);
        }
        // Advance the current point to the command's endpoint.
        if (lowerCommand === "h") {
            currentX = isRelative ? currentX + parameters[0] : parameters[0];
        } else if (lowerCommand === "v") {
            currentY = isRelative ? currentY + parameters[0] : parameters[0];
        } else {
            const endX = parameters[parameterCount - 2];
            const endY = parameters[parameterCount - 1];
            currentX = isRelative ? currentX + endX : endX;
            currentY = isRelative ? currentY + endY : endY;
        }
        if (lowerCommand === "m") {
            subpathStartX = currentX;
            subpathStartY = currentY;
            // Extra coordinate pairs after a moveto are implicit linetos.
            command = isRelative ? "l" : "L";
        }
    }
    return minY;
}

// One character's animation zip. Each `<AnimationName>.json` inside is an array with
// one SVG path string per animation frame, in a 1000x1000 model space. Duplicate
// frames are stored as "frameN", a reference back to frame N.
export class CharacterAnimations {
    private readonly files: Record<string, Uint8Array>;
    private readonly framesByAnimation = new Map<string, string[] | null>();
    private readonly frameCache = new Map<string, AnimationFrame>();

    constructor(zipBytes: Uint8Array) {
        this.files = unzipSync(zipBytes);
    }

    // Parsed lazily: a zip holds ~200 animations but a replay uses a fraction of them.
    private getFrames(animationName: string): string[] | null {
        let frames = this.framesByAnimation.get(animationName);
        if (frames === undefined) {
            const file = this.files[`${animationName}.json`];
            frames = file ? (JSON.parse(strFromU8(file)) as string[]) : null;
            this.framesByAnimation.set(animationName, frames);
        }
        return frames;
    }

    // Slippi Lab's frame selection: floor the (possibly fractional) action counter,
    // treat -1 as 0, and loop for animations that repeat (Wait, Guard, ...).
    getFrame(animationName: string, actionStateCounter: number): AnimationFrame | null {
        const frames = this.getFrames(animationName);
        if (!frames || frames.length === 0) {
            return null;
        }
        let frameIndex = Math.floor(Math.max(0, actionStateCounter)) % frames.length;
        let pathData = frames[frameIndex];
        if (pathData.startsWith("frame")) {
            frameIndex = Number(pathData.slice("frame".length));
            pathData = frames[frameIndex];
        }
        if (!pathData) {
            return null;
        }
        const cacheKey = `${animationName}/${frameIndex}`;
        let frame = this.frameCache.get(cacheKey);
        if (!frame) {
            // Model space maps to world units via translate(-500 -500) then scale(.1 -.1).
            frame = { path: new Path2D(pathData), topOffset: (500 - getPathMinY(pathData)) * 0.1 };
            this.frameCache.set(cacheKey, frame);
        }
        return frame;
    }
}

const loadedAnimations = new Map<string, Promise<CharacterAnimations | null>>();

// Resolves null when the zip hasn't been downloaded (see `npm run fetch-animations`).
export function loadCharacterAnimations(zipName: string): Promise<CharacterAnimations | null> {
    let pending = loadedAnimations.get(zipName);
    if (!pending) {
        pending = window.api.loadAnimationZip(zipName).then((bytes) => {
            if (!bytes) {
                // Don't cache misses, so fetching the zips and reopening a replay works.
                loadedAnimations.delete(zipName);
                return null;
            }
            return new CharacterAnimations(bytes);
        });
        loadedAnimations.set(zipName, pending);
    }
    return pending;
}
