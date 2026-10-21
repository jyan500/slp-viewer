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
import type {
    DirectoryListing,
    FolderSearchResponse,
    LibraryEntry,
    LibraryFileEntry,
    ReplaySummary,
    ReplaySummaryPlayer,
} from "../../../shared/types";
import { isNumber, isStringOrNull, usePersistentState } from "../hooks/usePersistentState";

const MIN_WIDTH = 200;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 300;
const SEARCH_DEBOUNCE_MS = 250;
const INDENT_PX = 14;
// Replays per page in a folder listing or search; summaries are only read for these.
const PAGE_SIZE = 100;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function getBaseName(path: string): string {
    return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

// Windows paths compare case-insensitively, and replays opened from the command line or
// a drop can use "/" while directory listings use "\".
function normalizePath(path: string): string {
    return path.replace(/\//g, "\\").toLowerCase();
}

function formatPlayer(player: ReplaySummaryPlayer): string {
    return `${player.connectCode || player.displayName || `P${player.port}`} (${player.characterName})`;
}

// "A vs B", or "A & B vs C & D" for teams (in order of each team's first player).
function formatMatchup(players: ReplaySummaryPlayer[]): string {
    if (!players.some((player) => player.teamId !== null)) {
        return players.map(formatPlayer).join(" vs ");
    }
    const teams = new Map<number | null, string[]>();
    for (const player of players) {
        const team = teams.get(player.teamId) ?? [];
        team.push(formatPlayer(player));
        teams.set(player.teamId, team);
    }
    return [...teams.values()].map((team) => team.join(" & ")).join(" vs ");
}

function formatDuration(totalSeconds: number): string {
    const seconds = Math.floor(totalSeconds);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// Stage · date played · game length, skipping whatever the replay doesn't record.
function formatDetails(summary: ReplaySummary): string {
    const startDate = summary.startAt ? new Date(summary.startAt) : null;
    return [
        summary.stageName,
        startDate && !Number.isNaN(startDate.getTime()) ? dateFormat.format(startDate) : null,
        summary.durationSeconds !== null ? formatDuration(summary.durationSeconds) : null,
    ]
        .filter(Boolean)
        .join(" · ");
}

interface TreeContext {
    // Normalized (see normalizePath).
    currentFilePath: string | null;
    onOpenFile: (filePath: string) => void;
    // Normalized; the folder the player search runs in.
    selectedFolderPath: string | null;
    onSelectFolder: (folderPath: string) => void;
    // Bumped by the refresh button; loaded folders re-read their contents.
    refreshToken: number;
}

function FileRow({ entry, depth, tree }: { entry: LibraryFileEntry; depth: number; tree: TreeContext }) {
    const isActive = normalizePath(entry.path) === tree.currentFilePath;
    const { summary } = entry;
    return (
        <button
            className={`tree-row file-row${isActive ? " active" : ""}`}
            style={{ paddingLeft: 8 + depth * INDENT_PX + 18 }}
            onClick={() => tree.onOpenFile(entry.path)}
            title={`${entry.name}\n${entry.path}`}
        >
            <File size={14} className="tree-icon" />
            <span className="tree-label">
                <span className="tree-name">
                    {summary && summary.players.length > 0 ? formatMatchup(summary.players) : entry.name}
                </span>
                {summary && <span className="tree-subtitle">{formatDetails(summary)}</span>}
            </span>
        </button>
    );
}

interface LoadMoreRowProps {
    shown: number;
    total: number;
    depth: number;
    isLoading: boolean;
    onLoadMore: () => void;
}

function LoadMoreRow({ shown, total, depth, isLoading, onLoadMore }: LoadMoreRowProps) {
    if (shown >= total) {
        return null;
    }
    return (
        <button
            className="tree-row load-more-row"
            style={{ paddingLeft: 8 + depth * INDENT_PX + 18 }}
            onClick={onLoadMore}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 size={14} className="spin" /> : <ChevronDown size={14} className="tree-icon" />}
            Show {Math.min(PAGE_SIZE, total - shown)} more ({shown} of {total})
        </button>
    );
}

interface PagedFiles<T> {
    // The first page's response, which carries the totals.
    firstPage: T;
    // Every page loaded so far.
    files: LibraryFileEntry[];
}

// Fetches the first page whenever `requestKey` changes (after `delayMs`), and appends
// later pages on `loadMore`. `isStale` is true while the data shown is for an older key.
function usePagedFiles<T extends { files: LibraryFileEntry[] }>(
    requestKey: string | null,
    fetchPage: (offset: number) => Promise<T>,
    delayMs = 0,
) {
    const [state, setState] = useState<(PagedFiles<T> & { key: string }) | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;

    useEffect(() => {
        if (requestKey === null) {
            return;
        }
        let isCancelled = false;
        const timer = setTimeout(() => {
            fetchPageRef.current(0).then((result) => {
                if (!isCancelled) {
                    setState({ key: requestKey, firstPage: result, files: result.files });
                }
            });
        }, delayMs);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [requestKey, delayMs]);

    const loadMore = () => {
        if (!state || isLoadingMore) {
            return;
        }
        const { key } = state;
        setIsLoadingMore(true);
        fetchPageRef.current(state.files.length).then((result) => {
            setState((current) =>
                current && current.key === key ? { ...current, files: [...current.files, ...result.files] } : current,
            );
            setIsLoadingMore(false);
        });
    };

    return { data: state as PagedFiles<T> | null, isStale: state?.key !== requestKey, isLoadingMore, loadMore };
}

// Loads `path` the first time `isEnabled` is true, and again from the first page whenever
// the refresh token changes while enabled.
function useDirectoryListing(path: string, isEnabled: boolean, refreshToken: number) {
    return usePagedFiles<DirectoryListing>(isEnabled ? `${path}\0${refreshToken}` : null, (offset) =>
        window.api.listDirectory(path, offset, PAGE_SIZE),
    );
}

function FolderContents({ path, depth, tree }: { path: string; depth: number; tree: TreeContext }) {
    const { data, isLoadingMore, loadMore } = useDirectoryListing(path, true, tree.refreshToken);
    const messagePadding = 8 + depth * INDENT_PX + 18;
    if (!data) {
        return (
            <div className="tree-message" style={{ paddingLeft: messagePadding }}>
                Loading…
            </div>
        );
    }
    const listing = data.firstPage;
    if (listing.error) {
        return (
            <div className="tree-message" style={{ paddingLeft: messagePadding }} title={listing.error}>
                Can't read this folder
            </div>
        );
    }
    if (listing.folders.length === 0 && listing.totalFiles === 0) {
        return (
            <div className="tree-message" style={{ paddingLeft: messagePadding }}>
                No replays or folders
            </div>
        );
    }
    return (
        <>
            {listing.folders.map((folder) => (
                <FolderNode key={folder.path} entry={folder} depth={depth} tree={tree} />
            ))}
            {data.files.map((file) => (
                <FileRow key={file.path} entry={file} depth={depth} tree={tree} />
            ))}
            <LoadMoreRow
                shown={data.files.length}
                total={listing.totalFiles}
                depth={depth}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
            />
        </>
    );
}

function FolderNode({ entry, depth, tree }: { entry: LibraryEntry; depth: number; tree: TreeContext }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const normalizedPath = normalizePath(entry.path);
    const containsActiveFile = tree.currentFilePath?.startsWith(normalizedPath + "\\") ?? false;
    const isSelected = tree.selectedFolderPath === normalizedPath;

    return (
        <>
            <button
                className={`tree-row folder-row${isExpanded ? " expanded" : ""}${containsActiveFile ? " has-active" : ""}${isSelected ? " selected" : ""}`}
                style={{ paddingLeft: 8 + depth * INDENT_PX }}
                onClick={() => {
                    setIsExpanded((current) => !current);
                    tree.onSelectFolder(entry.path);
                }}
                aria-expanded={isExpanded}
                title={entry.path}
            >
                {isExpanded ? <ChevronDown size={14} className="tree-chevron" /> : <ChevronRight size={14} className="tree-chevron" />}
                {isExpanded ? <FolderOpen size={14} className="tree-icon" /> : <Folder size={14} className="tree-icon" />}
                <span className="tree-label">
                    <span className="tree-name">{entry.name}</span>
                </span>
            </button>
            {isExpanded && <FolderContents path={entry.path} depth={depth + 1} tree={tree} />}
        </>
    );
}

function SearchResults({ folderPath, query, tree }: { folderPath: string; query: string; tree: TreeContext }) {
    const { data, isStale, isLoadingMore, loadMore } = usePagedFiles<FolderSearchResponse>(
        `${folderPath}\0${query}\0${tree.refreshToken}`,
        (offset) => window.api.searchFolder(folderPath, query, offset, PAGE_SIZE),
        SEARCH_DEBOUNCE_MS,
    );

    if (!data || (isStale && data.files.length === 0)) {
        return (
            <div className="tree-message">
                <Loader2 size={14} className="spin" /> Searching…
            </div>
        );
    }
    if (data.firstPage.error) {
        return (
            <div className="tree-message" title={data.firstPage.error}>
                Can't read this folder
            </div>
        );
    }
    if (data.files.length === 0) {
        return (
            <div className="tree-message">
                No players matching “{query}” in {getBaseName(folderPath)}
            </div>
        );
    }
    return (
        <>
            {data.files.map((file) => (
                <FileRow key={file.path} entry={file} depth={0} tree={tree} />
            ))}
            <LoadMoreRow
                shown={data.files.length}
                total={data.firstPage.totalMatches}
                depth={0}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
            />
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
    // Null means the root folder.
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [refreshToken, setRefreshToken] = useState(0);
    const panelRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (rootPath === null) {
            window.api.getDefaultLibraryFolder().then(setRootPath);
        }
    }, [rootPath, setRootPath]);

    const chooseRoot = async () => {
        const chosen = await window.api.chooseLibraryFolder(rootPath);
        if (chosen) {
            setRootPath(chosen);
            setSelectedFolder(null);
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

    const searchFolderPath = selectedFolder ?? rootPath;
    const tree: TreeContext = {
        currentFilePath: currentFilePath ? normalizePath(currentFilePath) : null,
        onOpenFile,
        selectedFolderPath: searchFolderPath ? normalizePath(searchFolderPath) : null,
        onSelectFolder: setSelectedFolder,
        refreshToken,
    };
    const isSearching = query.trim().length > 0;
    const isRootSelected = selectedFolder === null;

    return (
        <aside className={`replay-browser${isOpen ? " open" : ""}`} ref={panelRef} style={{ width }} aria-hidden={!isOpen}>
            <div className="browser-header">
                <button
                    className={`browser-root${isRootSelected ? " selected" : ""}`}
                    onClick={() => setSelectedFolder(null)}
                    title={rootPath ? `${rootPath}\nClick to search this folder` : undefined}
                    disabled={rootPath === null}
                >
                    {rootPath ? getBaseName(rootPath) : "No folder"}
                </button>
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
                    placeholder={searchFolderPath ? `Search players in ${getBaseName(searchFolderPath)}` : "Search players"}
                    title="Matches connect codes and display names in the selected folder (not its subfolders)"
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
                {rootPath === null || searchFolderPath === null ? null : isSearching ? (
                    <SearchResults folderPath={searchFolderPath} query={query.trim()} tree={tree} />
                ) : (
                    <FolderContents path={rootPath} depth={0} tree={tree} />
                )}
            </div>

            <div className="browser-resize-handle" onPointerDown={handleResizeStart} role="separator" aria-orientation="vertical" />
        </aside>
    );
}
