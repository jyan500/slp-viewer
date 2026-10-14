import { useCallback, useEffect, useState, type DragEvent } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import type { ReplayData } from "../../shared/types";
import { ReplayViewer } from "./components/ReplayViewer";

export function App() {
    const [replay, setReplay] = useState<ReplayData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const loadReplay = useCallback(async (filePath: string) => {
        setIsLoading(true);
        try {
            const result = await window.api.loadReplay(filePath);
            if (result.ok) {
                setReplay(result.replay);
            } else {
                toast.error("Couldn't open replay", { description: result.error });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error("Couldn't open replay", { description: message });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isCancelled = false;
        window.api.getInitialReplayPath().then((filePath) => {
            if (filePath && !isCancelled) {
                loadReplay(filePath);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [loadReplay]);

    const openFromDialog = useCallback(async () => {
        const filePath = await window.api.openReplayDialog();
        if (filePath) {
            await loadReplay(filePath);
        }
    }, [loadReplay]);

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files[0];
        if (!file) {
            return;
        }
        if (!file.name.toLowerCase().endsWith(".slp")) {
            toast.error("Not a Slippi replay", { description: `${file.name} is not a .slp file.` });
            return;
        }
        loadReplay(window.api.getPathForFile(file));
    };

    return (
        <div
            className={`app${isDragging ? " dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <header className="app-header">
                <button className="open-button" onClick={openFromDialog} disabled={isLoading}>
                    {isLoading ? <Loader2 size={16} className="spin" /> : <FolderOpen size={16} />}
                    Open replay
                </button>
                {replay && (
                    <div className="replay-title">
                        <span className="replay-file" title={replay.filePath}>
                            {replay.fileName}
                        </span>
                        <span className="replay-stage">{replay.stageName}</span>
                    </div>
                )}
            </header>

            <main className="app-main">
                {replay ? (
                    <ReplayViewer key={replay.filePath} replay={replay} />
                ) : (
                    <div className="empty-state">
                        <FolderOpen size={48} />
                        <p>Open a .slp replay or drop one anywhere in this window.</p>
                    </div>
                )}
            </main>

            <Toaster theme="dark" richColors position="top-right" />
        </div>
    );
}
