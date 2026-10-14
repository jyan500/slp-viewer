import { useEffect, useMemo, useRef, useState } from "react";
import type { FrameSnapshot, ReplayData, StadiumCollision } from "../../../shared/types";
import type { AnimationsByZip } from "../hooks/useCharacterAnimations";
import { useStadiumCollision } from "../hooks/useStadiumCollision";
import { getStadiumLabel, getStadiumState, getStadiumTerrain, type TerrainLine } from "../lib/stadium";
import { getStageGeometry, getViewBounds, type Bounds, type StageGeometry } from "../lib/stages";
import { getPortColor } from "../lib/format";
import { createViewport, type Viewport } from "../lib/viewport";
import { boundsToView, computeCameraTrack, type CameraMode, type CameraView } from "../lib/camera";
import { drawCharacter, drawLabels, type CharacterLabel } from "../lib/drawCharacter";
import { drawItems } from "../lib/drawItems";

const STAGE_FILL = "#262b36";
const STAGE_STROKE = "#9aa3b5";
// Randall is lighter so it reads as separate from the stage.
const CLOUD_STROKE = "#d6dbe6";

// Terrain that is sinking or rising is drawn faded: the vertical scaling is an estimate.
const MOVING_TERRAIN_ALPHA = 0.55;

function drawTerrainLines(context: CanvasRenderingContext2D, viewport: Viewport, lines: TerrainLine[]) {
    context.strokeStyle = STAGE_STROKE;
    context.lineCap = "round";
    for (const line of lines) {
        context.globalAlpha = line.isMoving ? MOVING_TERRAIN_ALPHA : 1;
        context.lineWidth = line.kind === "floor" ? 3 : 1.5;
        context.beginPath();
        context.moveTo(viewport.toScreenX(line.x1), viewport.toScreenY(line.y1));
        context.lineTo(viewport.toScreenX(line.x2), viewport.toScreenY(line.y2));
        context.stroke();
    }
    context.globalAlpha = 1;
}

function drawStage(
    context: CanvasRenderingContext2D,
    viewport: Viewport,
    geometry: StageGeometry,
    bounds: Bounds,
    replay: ReplayData,
    frame: number,
    stadiumCollision: StadiumCollision | null,
) {
    const { toScreenX, toScreenY } = viewport;
    // Pokemon Stadium with extracted geometry: the middle of the stage comes from the
    // active transformation's collision lines instead of the fixed outline's flat top.
    const terrain =
        replay.stadiumEvents && stadiumCollision
            ? getStadiumTerrain(getStadiumState(frame, replay.stadiumEvents), stadiumCollision)
            : null;

    context.save();
    context.setLineDash([6, 6]);
    context.strokeStyle = "rgba(255, 255, 255, 0.15)";
    context.lineWidth = 1;
    context.strokeRect(
        toScreenX(bounds.left),
        toScreenY(bounds.top),
        (bounds.right - bounds.left) * viewport.scale,
        (bounds.top - bounds.bottom) * viewport.scale,
    );
    context.restore();

    const drawLine = (left: number, right: number, y: number) => {
        context.beginPath();
        context.moveTo(toScreenX(left), toScreenY(y));
        context.lineTo(toScreenX(right), toScreenY(y));
        context.stroke();
    };

    // Moving platforms go first so the stage covers them when they pass behind or sink
    // into it (Randall's top run, Fountain of Dreams' lowered platforms), as in the game.
    context.lineWidth = 3;
    context.lineCap = "round";
    for (const platform of geometry.getMovingPlatforms?.(frame, replay) ?? []) {
        context.strokeStyle = platform.style === "cloud" ? CLOUD_STROKE : STAGE_STROKE;
        context.setLineDash(platform.isEstimated ? [4, 6] : []);
        drawLine(platform.left, platform.right, platform.y);
    }
    context.setLineDash([]);

    const traceOutline = (isClosed: boolean) => {
        context.beginPath();
        geometry.outline.forEach(([x, y], index) => {
            if (index === 0) {
                context.moveTo(toScreenX(x), toScreenY(y));
            } else {
                context.lineTo(toScreenX(x), toScreenY(y));
            }
        });
        if (isClosed) {
            context.closePath();
        }
    };
    traceOutline(true);
    context.fillStyle = STAGE_FILL;
    context.fill();
    // With terrain, leave the closing segment (Stadium's flat top edge) unstroked: the
    // terrain lines draw the real floor there.
    traceOutline(!terrain);
    context.strokeStyle = STAGE_STROKE;
    context.lineWidth = 2;
    context.stroke();

    if (terrain) {
        drawTerrainLines(context, viewport, terrain);
        return;
    }
    context.lineWidth = 3;
    for (const platform of geometry.platforms) {
        drawLine(platform.left, platform.right, platform.height);
    }
}

// Pokemon Stadium: name the current transformation and phase in the corner.
function drawStadiumLabel(context: CanvasRenderingContext2D, replay: ReplayData, frame: number) {
    if (!replay.stadiumEvents) {
        return;
    }
    const label = getStadiumLabel(getStadiumState(frame, replay.stadiumEvents));
    if (!label) {
        return;
    }
    context.font = "600 12px system-ui, sans-serif";
    const paddingX = 8;
    const width = context.measureText(label).width + paddingX * 2;
    context.fillStyle = "rgba(15, 17, 21, 0.75)";
    context.beginPath();
    context.roundRect(12, 12, width, 22, 6);
    context.fill();
    context.fillStyle = "#e6e8ee";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(label, 12 + paddingX, 23);
}

function drawFrame(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    replay: ReplayData,
    bounds: Bounds,
    view: CameraView,
    frameIndex: number,
    animationsByZip: AnimationsByZip,
    stadiumCollision: StadiumCollision | null,
) {
    context.clearRect(0, 0, width, height);
    const viewport = createViewport(view, width, height);
    const geometry = getStageGeometry(replay.stageId);
    const frame = replay.firstFrame + frameIndex;
    if (geometry) {
        drawStage(context, viewport, geometry, bounds, replay, frame, stadiumCollision);
    }
    drawStadiumLabel(context, replay, frame);
    const snapshot = replay.frames[frameIndex];
    if (!snapshot) {
        return;
    }
    const getEarlierSnapshot = (framesBack: number): FrameSnapshot | undefined =>
        replay.frames[frameIndex - framesBack];

    const labels: CharacterLabel[] = [];
    for (const player of replay.players) {
        const index = player.playerIndex;
        const color = getPortColor(index);
        const follower = snapshot.followers[index];
        if (follower) {
            drawCharacter(context, viewport, {
                state: follower,
                getEarlierState: (framesBack) => getEarlierSnapshot(framesBack)?.followers[index] ?? null,
                color,
                label: "",
                isFollower: true,
                animationsByZip,
            });
        }
        const state = snapshot.players[index];
        if (state) {
            const label = drawCharacter(context, viewport, {
                state,
                getEarlierState: (framesBack) => getEarlierSnapshot(framesBack)?.players[index] ?? null,
                color,
                label: `P${player.port}`,
                isFollower: false,
                animationsByZip,
            });
            if (label) {
                labels.push(label);
            }
        }
    }
    drawItems(context, viewport, snapshot);
    drawLabels(context, labels);
}

interface StageCanvasProps {
    replay: ReplayData;
    frame: number;
    animationsByZip: AnimationsByZip;
    cameraMode: CameraMode;
}

export function StageCanvas({ replay, frame, animationsByZip, cameraMode }: StageCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const bounds = useMemo(() => getViewBounds(replay), [replay]);
    const cameraTrack = useMemo(() => computeCameraTrack(replay), [replay]);
    const stadiumCollision = useStadiumCollision(replay.stageId);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setSize({ width: Math.floor(width), height: Math.floor(height) });
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context || size.width === 0 || size.height === 0) {
            return;
        }
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = size.width * pixelRatio;
        canvas.height = size.height * pixelRatio;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        const frameIndex = frame - replay.firstFrame;
        const view = cameraMode === "follow" ? cameraTrack[frameIndex] : boundsToView(bounds);
        drawFrame(
            context,
            size.width,
            size.height,
            replay,
            bounds,
            view,
            frameIndex,
            animationsByZip,
            stadiumCollision,
        );
    }, [replay, bounds, cameraTrack, cameraMode, frame, size, animationsByZip, stadiumCollision]);

    return (
        <div ref={containerRef} className="stage-canvas">
            <canvas ref={canvasRef} style={{ width: size.width, height: size.height }} />
        </div>
    );
}
