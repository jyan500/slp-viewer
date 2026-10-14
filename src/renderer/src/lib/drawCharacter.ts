// Character rendering. The animated path follows Slippi Lab's computeRenderData
// (MIT, see THIRD_PARTY_NOTICES.md), translated from SVG transforms to canvas calls.
import type { CharacterState } from "../../../shared/types";
import type { AnimationsByZip } from "../hooks/useCharacterAnimations";
import type { AnimationFrame } from "./animations";
import { getAnimationName, isDeadActionState } from "./actionStates";
import { getCharacterModel, isSpacie, type Character } from "./characters";
import type { Viewport } from "./viewport";

// Fallback marker size in world units.
const MARKER_HALF_WIDTH = 4;
const MARKER_HEIGHT = 14;
// Animated characters: the label sits this far above the silhouette's highest point,
// and never closer to the position than MIN_LABEL_HEIGHT world units.
const LABEL_GAP_PX = 6;
const MIN_LABEL_HEIGHT = 4;
const OUTLINE_WIDTH_PX = 1.5;

const SHIELD_ANIMATIONS = new Set(["GuardOn", "Guard", "GuardReflect", "GuardDamage"]);
const SPACIE_UP_B_ACTION_STATES = new Set([355, 356]);
const SHINE_COLOR = "#8abce9";
const SHINE_RADIUS = 6;
const SHINE_HOLE_RATIO = 0.6;

const OUTLINE_DEFAULT = "#0b0c10";
const OUTLINE_MISSED_L_CANCEL = "#ff2020";
const OUTLINE_INVULNERABLE = "#3b82f6";

// States with no animation data (notably every Thrown* state: in Melee the thrown
// character's pose comes from the thrower's bones) hold the most recent animated pose,
// faded, instead of disappearing. Looks back at most this many frames.
const MAX_POSE_LOOKBACK_FRAMES = 240;
const HELD_POSE_ALPHA = 0.55;

export interface CharacterDrawOptions {
    state: CharacterState;
    // Same character's state `framesBack` frames earlier, or null if unavailable. Used for
    // DamageFlyRoll rotation and to find a pose for states without animation data.
    getEarlierState: (framesBack: number) => CharacterState | null;
    color: string;
    label: string;
    // Nana is drawn slightly translucent.
    isFollower: boolean;
    animationsByZip: AnimationsByZip;
}

// Jumps and up-specials follow the current facing direction; every other animation
// keeps the facing from the start of the action, because facingDirection can flip
// partway through animations that turn the character around.
function followsCurrentFacing(animationName: string): boolean {
    return animationName.includes("Jump") || animationName === "SpecialHi" || animationName === "SpecialAirHi";
}

function toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}

function getRotationDegrees(animationName: string, state: CharacterState, previousState: CharacterState | null): number {
    if (animationName === "DamageFlyRoll" && previousState) {
        // The animation's default orientation is (0, 1); rotate it along the travel path.
        return toDegrees(Math.atan2(state.y - previousState.y, state.x - previousState.x)) - 90;
    }
    if (isSpacie(state.internalCharacterId) && SPACIE_UP_B_ACTION_STATES.has(state.actionStateId)) {
        // Fox/Falco up-B travels in the direction held when it started.
        const joystickDegrees =
            state.startJoystickX === 0 && state.startJoystickY === 0
                ? 90
                : toDegrees(Math.atan2(state.startJoystickY, state.startJoystickX));
        return joystickDegrees - (state.startFacing === -1 ? 180 : 0);
    }
    return 0;
}

function getOutlineColor(state: CharacterState): string {
    if (state.startLCancelStatus === 2) {
        return OUTLINE_MISSED_L_CANCEL;
    }
    if (state.hurtboxCollisionState !== 0) {
        return OUTLINE_INVULNERABLE;
    }
    return OUTLINE_DEFAULT;
}

// Where a character's port label goes. Labels are drawn after every character so a
// body drawn later can't cover an earlier character's label.
export interface CharacterLabel {
    text: string;
    color: string;
    screenX: number;
    screenY: number;
}

function createLabel(options: CharacterDrawOptions, screenX: number, screenY: number): CharacterLabel | null {
    return options.label ? { text: options.label, color: options.color, screenX, screenY } : null;
}

export function drawLabels(context: CanvasRenderingContext2D, labels: CharacterLabel[]) {
    context.font = "bold 12px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    // Dark halo keeps labels legible where they overlap a character.
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.strokeStyle = OUTLINE_DEFAULT;
    for (const label of labels) {
        context.strokeText(label.text, label.screenX, label.screenY);
        context.fillStyle = label.color;
        context.fillText(label.text, label.screenX, label.screenY);
    }
}

// Shield size formulas from https://www.ssbwiki.com/Shield#Shield_statistics
function drawShield(
    context: CanvasRenderingContext2D,
    viewport: Viewport,
    state: CharacterState,
    character: Character,
    animationName: string,
    color: string,
) {
    // Shield-stun ignores trigger changes, so read the trigger from the start of it. A
    // trigger of 0 means it was released while the shield is still forced active.
    const rawTrigger = animationName === "GuardDamage" ? state.startTrigger : state.trigger;
    const trigger = rawTrigger === 0 ? 1 : rawTrigger;
    const triggerMultiplier = 1 - (0.5 * (trigger - 0.3)) / 0.7;
    const sizeMultiplier = ((state.shieldSize * triggerMultiplier) / 60) * 0.85 + 0.15;
    const centerX = state.x + character.shieldOffset[0] * state.facing;
    const centerY = state.y + character.shieldOffset[1];

    context.beginPath();
    context.arc(
        viewport.toScreenX(centerX),
        viewport.toScreenY(centerY),
        character.shieldSize * sizeMultiplier * viewport.scale,
        0,
        Math.PI * 2,
    );
    context.fillStyle = color;
    context.globalAlpha = 0.6;
    context.fill();
    context.globalAlpha = 1;
}

function drawShine(context: CanvasRenderingContext2D, viewport: Viewport, state: CharacterState, character: Character) {
    // Slippi Lab's estimate of the shine's height: 3/4 of the shield offset.
    const centerX = viewport.toScreenX(state.x);
    const centerY = viewport.toScreenY(state.y + (character.shieldOffset[1] * 3) / 4);
    const radius = SHINE_RADIUS * viewport.scale;
    context.beginPath();
    for (const ringRadius of [radius, radius * SHINE_HOLE_RATIO]) {
        for (let corner = 0; corner < 6; corner++) {
            const angle = (Math.PI / 3) * corner;
            const pointX = centerX + ringRadius * Math.sin(angle);
            const pointY = centerY - ringRadius * Math.cos(angle);
            if (corner === 0) {
                context.moveTo(pointX, pointY);
            } else {
                context.lineTo(pointX, pointY);
            }
        }
        context.closePath();
    }
    context.fillStyle = SHINE_COLOR;
    context.fill("evenodd");
}

function drawMarker(context: CanvasRenderingContext2D, viewport: Viewport, options: CharacterDrawOptions): CharacterLabel | null {
    const { state, color, isFollower } = options;
    const sizeMultiplier = isFollower ? 0.75 : 1;
    const { scale, toScreenX, toScreenY } = viewport;
    const halfWidth = MARKER_HALF_WIDTH * sizeMultiplier * scale;
    const height = MARKER_HEIGHT * sizeMultiplier * scale;
    const screenX = toScreenX(state.x);
    const feetY = toScreenY(state.y);
    const centerY = feetY - height / 2;

    context.beginPath();
    context.ellipse(screenX, centerY, halfWidth, height / 2, 0, 0, Math.PI * 2);
    context.fillStyle = color;
    context.globalAlpha = isFollower ? 0.7 : 0.9;
    context.fill();
    context.globalAlpha = 1;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.stroke();

    // Facing arrow at head height
    const headY = feetY - height * 0.75;
    const arrowLength = halfWidth * 1.6;
    context.beginPath();
    context.moveTo(screenX + state.facing * (halfWidth + arrowLength), headY);
    context.lineTo(screenX + state.facing * halfWidth * 0.6, headY - arrowLength * 0.55);
    context.lineTo(screenX + state.facing * halfWidth * 0.6, headY + arrowLength * 0.55);
    context.closePath();
    context.fillStyle = "#ffffff";
    context.fill();

    return createLabel(options, screenX, feetY - height - 4);
}

interface ResolvedPose {
    character: Character;
    animationName: string;
    frame: AnimationFrame;
}

function resolvePose(state: CharacterState, animationsByZip: AnimationsByZip): ResolvedPose | null {
    const model = getCharacterModel(state.internalCharacterId);
    const animations = model ? animationsByZip[model.zipName] : undefined;
    const animationName = getAnimationName(state.actionStateId, state.internalCharacterId);
    if (!model || !animations || !animationName) {
        return null;
    }
    const frame = animations.getFrame(animationName, state.actionStateCounter);
    return frame ? { character: model.character, animationName, frame } : null;
}

// Draws the character's body (and shield/shine) and returns where its label belongs.
export function drawCharacter(
    context: CanvasRenderingContext2D,
    viewport: Viewport,
    options: CharacterDrawOptions,
): CharacterLabel | null {
    const { state, getEarlierState, color, isFollower, animationsByZip } = options;
    if (isDeadActionState(state.actionStateId)) {
        return null;
    }

    // `poseState` supplies the silhouette and its orientation; `state` the position.
    let pose = resolvePose(state, animationsByZip);
    let poseState = state;
    let poseFramesBack = 0;
    for (let framesBack = 1; !pose && framesBack <= MAX_POSE_LOOKBACK_FRAMES; framesBack++) {
        const earlier = getEarlierState(framesBack);
        if (!earlier || isDeadActionState(earlier.actionStateId)) {
            break;
        }
        pose = resolvePose(earlier, animationsByZip);
        poseState = earlier;
        poseFramesBack = framesBack;
    }
    if (!pose) {
        return drawMarker(context, viewport, options);
    }

    const { character, animationName, frame } = pose;
    const isHeldPose = poseFramesBack > 0;
    const facing = followsCurrentFacing(animationName) ? poseState.facing : poseState.startFacing;
    const rotationDegrees = getRotationDegrees(animationName, poseState, getEarlierState(poseFramesBack + 1));
    const rotation = (rotationDegrees * Math.PI) / 180;
    const screenX = viewport.toScreenX(state.x);
    const screenY = viewport.toScreenY(state.y);
    const modelToScreen = viewport.scale * character.scale * 0.1;
    const baseAlpha = isFollower ? 0.8 : 1;

    context.save();
    // Same order as Slippi Lab's SVG transform list:
    // translate(x y) rotate(r 0 8) scale(s) scale(facing 1) scale(.1 -.1) translate(-500 -500)
    context.translate(screenX, screenY);
    context.scale(viewport.scale, -viewport.scale);
    context.translate(0, 8);
    context.rotate(rotation);
    context.translate(0, -8);
    context.scale(character.scale, character.scale);
    context.scale(facing, 1);
    context.scale(0.1, -0.1);
    context.translate(-500, -500);
    context.globalAlpha = isHeldPose ? baseAlpha * HELD_POSE_ALPHA : baseAlpha;
    context.fillStyle = color;
    context.fill(frame.path);
    context.globalAlpha = isHeldPose ? HELD_POSE_ALPHA : 1;
    context.lineWidth = OUTLINE_WIDTH_PX / modelToScreen;
    context.lineJoin = "round";
    context.strokeStyle = getOutlineColor(state);
    context.stroke(frame.path);
    context.restore();

    // Shield and shine belong to the held pose's old action, not the current one.
    if (!isHeldPose) {
        if (SHIELD_ANIMATIONS.has(animationName)) {
            drawShield(context, viewport, state, character, animationName, color);
        }
        const isShining = animationName.includes("SpecialLw") || animationName.includes("SpecialAirLw");
        if (isSpacie(state.internalCharacterId) && isShining) {
            drawShine(context, viewport, state, character);
        }
    }
    const headHeight = Math.max(frame.topOffset * character.scale, MIN_LABEL_HEIGHT);
    return createLabel(options, screenX, screenY - headHeight * viewport.scale - LABEL_GAP_PX);
}
