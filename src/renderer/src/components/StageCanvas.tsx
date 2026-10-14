import { useEffect, useMemo, useRef, useState } from "react";
import type { FrameSnapshot, ReplayData } from "../../../shared/types";
import type { AnimationsByZip } from "../hooks/useCharacterAnimations";
import { getStageGeometry, getViewBounds, type Bounds, type StageGeometry } from "../lib/stages";
import { getPortColor } from "../lib/format";
import { createViewport, type Viewport } from "../lib/viewport";
import { boundsToView, computeCameraTrack, type CameraMode, type CameraView } from "../lib/camera";
import { drawCharacter, drawLabels, type CharacterLabel } from "../lib/drawCharacter";
import { drawItems } from "../lib/drawItems";

const STAGE_DEPTH = 30;

function drawStage(context: CanvasRenderingContext2D, viewport: Viewport, geometry: StageGeometry, bounds: Bounds) {
    const { toScreenX, toScreenY } = viewport;

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

    const inset = geometry.edge * 0.2;
    context.beginPath();
    context.moveTo(toScreenX(-geometry.edge), toScreenY(0));
    context.lineTo(toScreenX(geometry.edge), toScreenY(0));
    context.lineTo(toScreenX(geometry.edge - inset), toScreenY(-STAGE_DEPTH));
    context.lineTo(toScreenX(-geometry.edge + inset), toScreenY(-STAGE_DEPTH));
    context.closePath();
    context.fillStyle = "#262b36";
    context.fill();
    context.strokeStyle = "#9aa3b5";
    context.lineWidth = 2;
    context.stroke();

    context.lineWidth = 3;
    context.lineCap = "round";
    for (const platform of geometry.platforms) {
        context.beginPath();
        context.moveTo(toScreenX(platform.left), toScreenY(platform.height));
        context.lineTo(toScreenX(platform.right), toScreenY(platform.height));
        context.stroke();
    }
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
) {
    context.clearRect(0, 0, width, height);
    const viewport = createViewport(view, width, height);
    const geometry = getStageGeometry(replay.stageId);
    if (geometry) {
        drawStage(context, viewport, geometry, bounds);
    }
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
        );
    }, [replay, bounds, cameraTrack, cameraMode, frame, size, animationsByZip]);

    return (
        <div ref={containerRef} className="stage-canvas">
            <canvas ref={canvasRef} style={{ width: size.width, height: size.height }} />
        </div>
    );
}
