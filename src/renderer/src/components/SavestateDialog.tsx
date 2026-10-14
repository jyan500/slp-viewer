import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Loader2, Save, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import type { PlayerInfo, ReplayData, SavestateEnvironment } from "../../../shared/types";
import { FRAMES_PER_SECOND, getPortColor } from "../lib/format";

const MAX_CLIP_LENGTH = 3600;
const NAMING_STYLES = ["Game Info", "Name + State Number", "Name + Frame Number"];

type ClipMode = "end" | "start";

interface SavestateDialogProps {
    replay: ReplayData;
    initialFrame: number;
    onClose: () => void;
}

// Mirrors the drop-in/duration clamping in create_savestate_at_frame (slippi_analyzer
// lib.rs), converted back to viewer frame numbers.
function getClipRange(replay: ReplayData, frame: number, mode: ClipMode, clipLength: number) {
    const index = frame - replay.firstFrame;
    const lastIndex = replay.lastFrame - replay.firstFrame;
    if (mode === "end") {
        const startIndex = Math.max(0, index - clipLength);
        const duration = Math.max(1, Math.min(index, clipLength));
        return { from: startIndex + replay.firstFrame, to: startIndex + duration + replay.firstFrame };
    }
    return { from: frame, to: Math.min(lastIndex, index + Math.max(1, clipLength)) + replay.firstFrame };
}

function getPlayerLabel(player: PlayerInfo): string {
    const name = player.displayName || player.connectCode;
    return name ? `${player.characterName} · ${name}` : player.characterName;
}

export function SavestateDialog({ replay, initialFrame, onClose }: SavestateDialogProps) {
    const [environment, setEnvironment] = useState<SavestateEnvironment | null>(null);
    const [frameText, setFrameText] = useState(String(initialFrame));
    const [player, setPlayer] = useState<"low" | "high">("low");
    const [mode, setMode] = useState<ClipMode>("end");
    const [clipLengthText, setClipLengthText] = useState("360");
    const [namingStyle, setNamingStyle] = useState(0);
    const [name, setName] = useState("");
    const [exportFolder, setExportFolder] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // The DLL identifies players as the lower or higher of the two ports.
    const playersByPort = useMemo(() => [...replay.players].sort((first, second) => first.port - second.port), [replay]);

    useEffect(() => {
        window.api
            .getSavestateSettings()
            .then((loaded) => {
                setEnvironment(loaded);
                setClipLengthText(String(loaded.clipLength));
                setNamingStyle(loaded.namingStyle);
                setExportFolder(loaded.exportFolder);
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                toast.error("Couldn't load savestate settings", { description: message });
            });
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isExporting) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isExporting, onClose]);

    const frame = Number.parseInt(frameText, 10);
    const clipLength = Number.parseInt(clipLengthText, 10);
    const isFrameValid = Number.isInteger(frame) && frame >= replay.firstFrame && frame <= replay.lastFrame;
    const isClipLengthValid = Number.isInteger(clipLength) && clipLength >= 1 && clipLength <= MAX_CLIP_LENGTH;

    let blockingReason: string | null = null;
    if (!environment) {
        blockingReason = "Loading settings…";
    } else if (!environment.dllFound) {
        blockingReason = "slippi_analyzer.dll is missing.";
    } else if (!isFrameValid) {
        blockingReason = `Frame must be between ${replay.firstFrame} and ${replay.lastFrame}.`;
    } else if (!isClipLengthValid) {
        blockingReason = `Clip length must be between 1 and ${MAX_CLIP_LENGTH} frames.`;
    } else if (!exportFolder) {
        blockingReason = "Choose an export folder.";
    }

    const range = isFrameValid && isClipLengthValid ? getClipRange(replay, frame, mode, clipLength) : null;

    const chooseFolder = async () => {
        const chosen = await window.api.chooseExportFolder(exportFolder);
        if (chosen) {
            setExportFolder(chosen);
        }
    };

    const handleExport = async () => {
        if (blockingReason || !exportFolder) {
            return;
        }
        setIsExporting(true);
        try {
            await window.api.saveSavestateSettings({ exportFolder, namingStyle, clipLength });
            const result = await window.api.exportSavestate({
                slpPath: replay.filePath,
                frame,
                player,
                mode,
                clipLength,
                namingStyle,
                name,
                exportFolder,
            });
            if (result.ok) {
                const fileName = result.outputPath?.split(/[\\/]/).pop();
                toast.success(fileName ? `Saved ${fileName}` : "Savestate exported", {
                    description: result.exportFolder,
                });
                onClose();
            } else {
                toast.error("Savestate export failed", { description: result.error });
                if (result.detail) {
                    console.warn("slippi_analyzer:", result.detail);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error("Savestate export failed", { description: message });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="modal-backdrop" onMouseDown={() => !isExporting && onClose()}>
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="savestate-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="savestate-title">Export savestate</h2>
                    <button className="icon-button" onClick={onClose} disabled={isExporting} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="field">
                        <span className="field-label">Take control of</span>
                        <div className="player-choice">
                            {playersByPort.map((info, index) => {
                                const value = index === 0 ? "low" : "high";
                                return (
                                    <button
                                        key={info.playerIndex}
                                        className={`player-option${player === value ? " selected" : ""}`}
                                        style={{ borderColor: player === value ? getPortColor(info.playerIndex) : undefined }}
                                        onClick={() => setPlayer(value)}
                                    >
                                        <span className="player-port" style={{ background: getPortColor(info.playerIndex) }}>
                                            P{info.port}
                                        </span>
                                        {getPlayerLabel(info)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="field-row">
                        <label className="field">
                            <span className="field-label">Frame</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={frameText}
                                onChange={(event) => setFrameText(event.target.value)}
                            />
                        </label>
                        <label className="field">
                            <span className="field-label">Clip length (frames)</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={clipLengthText}
                                onChange={(event) => setClipLengthText(event.target.value)}
                            />
                            <span className="field-hint">
                                {isClipLengthValid ? `${(clipLength / FRAMES_PER_SECOND).toFixed(1)} s` : "1–3600"}
                            </span>
                        </label>
                    </div>

                    <div className="field">
                        <span className="field-label">This frame is the…</span>
                        <label className="radio">
                            <input type="radio" checked={mode === "end"} onChange={() => setMode("end")} />
                            End of the clip — drop in {isClipLengthValid ? clipLength : "N"} frames earlier and play up to it (like D-Pad Down)
                        </label>
                        <label className="radio">
                            <input type="radio" checked={mode === "start"} onChange={() => setMode("start")} />
                            Start of the clip — drop in here and play forward
                        </label>
                        {range && (
                            <span className="field-hint">
                                Drop in at frame {range.from}, recorded opponent inputs play until frame {range.to}
                            </span>
                        )}
                    </div>

                    <div className="field-row">
                        <label className="field">
                            <span className="field-label">Name (optional)</span>
                            <input
                                type="text"
                                value={name}
                                placeholder="Uses the naming style when blank"
                                onChange={(event) => setName(event.target.value)}
                            />
                        </label>
                        <label className="field">
                            <span className="field-label">Naming style</span>
                            <select value={namingStyle} onChange={(event) => setNamingStyle(Number(event.target.value))}>
                                {NAMING_STYLES.map((label, index) => (
                                    <option key={label} value={index}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="field">
                        <span className="field-label">Export folder</span>
                        <div className="folder-row">
                            <span className="folder-path" title={exportFolder ?? undefined}>
                                {exportFolder ?? "Not set"}
                            </span>
                            <button onClick={chooseFolder} disabled={isExporting}>
                                <FolderOpen size={14} />
                                Browse
                            </button>
                        </div>
                    </div>

                    {environment && !environment.dllFound && (
                        <div className="notice warning">
                            <TriangleAlert size={16} />
                            <span>
                                slippi_analyzer.dll not found in improover/. Run <code>npm run import-improover</code> to
                                copy it from Melee-Improover.
                            </span>
                        </div>
                    )}
                    {environment && (
                        <div className="field-hint" title={`${environment.configPath}\n${environment.dllPath}`}>
                            Settings: improover/config.txt · Exporter: improover/slippi_analyzer.dll
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <span className="field-hint">{blockingReason}</span>
                    <button onClick={onClose} disabled={isExporting}>
                        Cancel
                    </button>
                    <button className="primary" onClick={handleExport} disabled={isExporting || blockingReason !== null}>
                        {isExporting ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}
