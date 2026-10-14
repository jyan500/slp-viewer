import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
    ChevronDown,
    ChevronRight,
    ChevronsLeft,
    File,
    Folder,
    FolderInput,
    FolderOpen,
    Loader2,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import type { DirectoryListing, LibraryEntry, LibrarySearchResponse } from "../../../shared/types";
import { isNumber, isStringOrNull, usePersistentState } from "../hooks/usePersistentState";

const MIN_WIDTH = 200;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 300;
const SEARCH_DEBOUNCE_MS = 250;
const INDENT_PX = 14;

function getBaseName(path: string): string {
    return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

// Windows paths compare case-insensitively, and replays opened from the command line or
// a drop can use "/" while directory listings use "\".
function normalizePath(path: string): string {
    return path.replace(/\//g, "\\").toLowerCase();
}

interface TreeContext {
    // Normalized (see normalizePath).
    currentFilePath: string | null;
    onOpenFile: (filePath: string) => void;
    // Bumped by the refresh button; loaded folders re-read their contents.
    refreshToken: number;
}

function FileRow({ entry, depth, subtitle, tree }: { entry: LibraryEntry; depth: number; subtitle?: string; tree: TreeContext }) {
    const isActive = normalizePath(entry.path) === tree.currentFilePath;
    return (
        <button
            className={`tree-row file-row${isActive ? " active" : ""}`}
            style={{ paddingLeft: 8 + depth * INDENT_PX + 18 }}
            onClick={() => tree.onOpenFile(entry.path)}
            title={entry.path}
        >
            <File size={14} className="tree-icon" />
            <span className="tree-label">
                <span className="tree-name">{entry.name}</span>
                {subtitle !== undefined && <span className="tree-subtitle">{subtitle || "(root)"}</span>}
            </span>
        </button>
    );
}

function FolderContents({ listing, depth, tree }: { listing: DirectoryListing; depth: number; tree: TreeContext }) {
    if (listing.error) {
        return (
            <div className="tree-message" style={{ paddingLeft: 8 + depth * INDENT_PX + 18 }} title={listing.error}>
                Can't read this folder
            </div>
        );
    }
    if (listing.folders.length === 0 && listing.files.length === 0) {
        return (
            <div className="tree-message" style={{ paddingLeft: 8 + depth * INDENT_PX + 18 }}>
                No replays or folders
            </div>
        );
    }
    return (
        <>
            {listing.folders.map((folder) => (
                <FolderNode key={folder.path} entry={folder} depth={depth} tree={tree} />
            ))}
            {listing.files.map((file) => (
                <FileRow key={file.path} entry={file} depth={depth} tree={tree} />
            ))}
        </>
    );
}

// Loads `path` the first time `isEnabled` is true, and again whenever the refresh token
// changes while enabled.
function useDirectoryListing(path: string, isEnabled: boolean, refreshToken: number) {
    const [listing, setListing] = useState<DirectoryListing | null>(null);
    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        let isCancelled = false;
        window.api.listDirectory(path).then((result) => {
            if (!isCancelled) {
                setListing(result);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [path, isEnabled, refreshToken]);
    return listing;
}

function FolderNode({ entry, depth, subtitle, tree }: { entry: LibraryEntry; depth: number; subtitle?: string; tree: TreeContext }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const listing = useDirectoryListing(entry.path, isExpanded, tree.refreshToken);
    const containsActiveFile = tree.currentFilePath?.startsWith(normalizePath(entry.path) + "\\") ?? false;

    return (
        <>
            <button
                className={`tree-row folder-row${isExpanded ? " expanded" : ""}${containsActiveFile ? " has-active" : ""}`}
                style={{ paddingLeft: 8 + depth * INDENT_PX }}
                onClick={() => setIsExpanded((current) => !current)}
                aria-expanded={isExpanded}
                title={entry.path}
            >
                {isExpanded ? <ChevronDown size={14} className="tree-chevron" /> : <ChevronRight size={14} className="tree-chevron" />}
                {isExpanded ? <FolderOpen size={14} className="tree-icon" /> : <Folder size={14} className="tree-icon" />}
                <span className="tree-label">
                    <span className="tree-name">{entry.name}</span>
                    {subtitle !== undefined && <span className="tree-subtitle">{subtitle || "(root)"}</span>}
                </span>
            </button>
            {isExpanded &&
                (listing ? (
                    <FolderContents listing={listing} depth={depth + 1} tree={tree} />
                ) : (
                    <div className="tree-message" style={{ paddingLeft: 8 + (depth + 1) * INDENT_PX + 18 }}>
                        Loading…
                    </div>
                ))}
        </>
    );
}

function SearchResults({ rootPath, query, tree }: { rootPath: string; query: string; tree: TreeContext }) {
    const [response, setResponse] = useState<LibrarySearchResponse | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        setIsSearching(true);
        const timer = setTimeout(() => {
            window.api.searchLibrary(rootPath, query).then((result) => {
                if (!isCancelled) {
                    setResponse(result);
                    setIsSearching(false);
                }
            });
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [rootPath, query, tree.refreshToken]);

    if (!response || (isSearching && response.results.length === 0)) {
        return (
            <div className="tree-message">
                <Loader2 size={14} className="spin" /> Searching…
            </div>
        );
    }
    if (response.results.length === 0) {
        return <div className="tree-message">No matches for “{query}”</div>;
    }
    return (
        <>
            {response.results.map((result) =>
                result.kind === "folder" ? (
                    <FolderNode key={result.path} entry={result} depth={0} subtitle={result.parentPath} tree={tree} />
                ) : (
                    <FileRow key={result.path} entry={result} depth={0} subtitle={result.parentPath} tree={tree} />
                ),
            )}
            {response.isTruncated && (
                <div className="tree-message">Showing the first {response.results.length} matches — refine your search</div>
            )}
        </>
    );
}

interface ReplayBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilePath: string | null;
    onOpenFile: (filePath: string) => void;
}

export function ReplayBrowser({ isOpen, onClose, currentFilePath, onOpenFile }: ReplayBrowserProps) {
    const [rootPath, setRootPath] = usePersistentState<string | null>("slp-viewer.libraryRoot", null, isStringOrNull);
    const [width, setWidth] = usePersistentState("slp-viewer.libraryWidth", DEFAULT_WIDTH, isNumber);
    const [query, setQuery] = useState("");
    const [refreshToken, setRefreshToken] = useState(0);
    const panelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (rootPath === null) {
            window.api.getDefaultLibraryFolder().then(setRootPath);
        }
    }, [rootPath, setRootPath]);

    const rootListing = useDirectoryListing(rootPath ?? "", rootPath !== null, refreshToken);

    const chooseRoot = async () => {
        const chosen = await window.api.chooseLibraryFolder(rootPath);
        if (chosen) {
            setRootPath(chosen);
            setQuery("");
        }
    };

    const handleResizeStart = useCallback(
        (event: ReactPointerEvent<HTMLDivElement>) => {
            const handle = event.currentTarget;
            const left = panelRef.current?.getBoundingClientRect().left ?? 0;
            handle.setPointerCapture(event.pointerId);
            const handleMove = (moveEvent: PointerEvent) => {
                setWidth(Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, moveEvent.clientX - left))));
            };
            const handleUp = () => {
                handle.removeEventListener("pointermove", handleMove);
                handle.removeEventListener("pointerup", handleUp);
            };
            handle.addEventListener("pointermove", handleMove);
            handle.addEventListener("pointerup", handleUp);
        },
        [setWidth],
    );

    const tree: TreeContext = {
        currentFilePath: currentFilePath ? normalizePath(currentFilePath) : null,
        onOpenFile,
        refreshToken,
    };
    const isSearching = query.trim().length > 0;

    return (
        <aside className={`replay-browser${isOpen ? " open" : ""}`} ref={panelRef} style={{ width }} aria-hidden={!isOpen}>
            <div className="browser-header">
                <span className="browser-root" title={rootPath ?? undefined}>
                    {rootPath ? getBaseName(rootPath) : "No folder"}
                </span>
                <button className="icon-button" onClick={() => setRefreshToken((current) => current + 1)} title="Refresh">
                    <RefreshCw size={14} />
                </button>
                <button className="icon-button" onClick={chooseRoot} title="Open folder…">
                    <FolderInput size={14} />
                </button>
                <button className="icon-button browser-close" onClick={onClose} title="Hide replay browser" aria-label="Hide replay browser">
                    <ChevronsLeft size={16} />
                </button>
            </div>

            <div className="browser-search">
                <Search size={14} className="browser-search-icon" />
                <input
                    type="text"
                    value={query}
                    placeholder="Search folders and replays"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Escape" && setQuery("")}
                />
                {query && (
                    <button className="icon-button" onClick={() => setQuery("")} aria-label="Clear search">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="browser-tree" role="tree">
                {rootPath === null ? null : isSearching ? (
                    <SearchResults rootPath={rootPath} query={query.trim()} tree={tree} />
                ) : rootListing ? (
                    <FolderContents listing={rootListing} depth={0} tree={tree} />
                ) : (
                    <div className="tree-message">Loading…</div>
                )}
            </div>

            <div className="browser-resize-handle" onPointerDown={handleResizeStart} role="separator" aria-orientation="vertical" />
        </aside>
    );
}
