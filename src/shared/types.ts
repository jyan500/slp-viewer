export interface PlayerInfo {
    playerIndex: number;
    port: number;
    characterId: number;
    characterName: string;
    displayName: string;
    connectCode: string;
    teamId: number | null;
}

export interface CharacterState {
    // Changes mid-game on a Zelda/Sheik transform, so it is tracked per frame.
    internalCharacterId: number;
    x: number;
    y: number;
    facing: number;
    actionStateId: number;
    // Frames elapsed in the current action; may be fractional (e.g. L-cancels).
    actionStateCounter: number;
    percent: number;
    stocks: number;
    shieldSize: number;
    isAirborne: boolean;
    // 0 = vulnerable, 1 = invulnerable, 2 = intangible
    hurtboxCollisionState: number;
    // 0 = none, 1 = successful, 2 = missed
    lCancelStatus: number;
    joystickX: number;
    joystickY: number;
    trigger: number;
    // Values captured on the first frame of the current action.
    startFacing: number;
    startJoystickX: number;
    startJoystickY: number;
    startTrigger: number;
    startLCancelStatus: number;
}

// Pokemon Stadium transformation event (slippi-js StadiumTransformationType). `event`:
// 2 initiate, 3 on monitor, 4 old form receding, 5 new form rising, 6 finished.
// `transformation`: 3 fire, 4 grass, 5 normal, 6 rock, 9 water.
export interface StadiumEvent {
    frame: number;
    event: number;
    transformation: number;
}

// Collision lines extracted from the user's ISO (scripts/extract-stadium.mjs).
export interface StadiumCollisionLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    kind: "floor" | "ceiling" | "wall";
}

export interface StadiumCollision {
    source: string;
    groups: Record<"base" | "normal" | "fire" | "grass" | "rock" | "water", StadiumCollisionLine[]>;
}

// A projectile or item on a frame (slippi-js ItemUpdateType).
export interface ItemState {
    // Index into Slippi Lab's itemNamesById, e.g. 55 = Falco's Laser.
    typeId: number;
    state: number;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    facing: number;
    // playerIndex of the character that owns it, or -1 for stage/game items.
    owner: number;
    // Samus: 0 = homing, 1 = super missile.
    missileType: number;
    // Samus charge shot charge level, 0-7.
    chargePower: number;
}

export interface FrameSnapshot {
    // Indexed by playerIndex (0-3); null when that port has no data this frame.
    players: Array<CharacterState | null>;
    // Ice Climbers' Nana, indexed the same way.
    followers: Array<CharacterState | null>;
    items: ItemState[];
}

export interface ReplayData {
    filePath: string;
    fileName: string;
    stageId: number;
    stageName: string;
    startingTimerSeconds: number | null;
    // Slippi frame numbers start at -123; frames[index] is frame (firstFrame + index).
    firstFrame: number;
    lastFrame: number;
    players: PlayerInfo[];
    // Every internal character ID that appears, so animations can be preloaded.
    internalCharacterIds: number[];
    // Fountain of Dreams side-platform heights per frame (same indexing as `frames`), in
    // the game's raw units. Null for other stages, or replays older than 3.18 that don't
    // record platform movement.
    fodPlatformHeights: { left: number[]; right: number[] } | null;
    // Pokemon Stadium transformation events in frame order; null for other stages.
    stadiumEvents: StadiumEvent[] | null;
    frames: FrameSnapshot[];
}

// Savestate export settings, persisted in improover/config.txt.
export interface SavestateSettings {
    exportFolder: string | null;
    // 0 = Game Info, 1 = Name + State Number, 2 = Name + Frame Number
    namingStyle: number;
    clipLength: number;
}

export interface SavestateEnvironment extends SavestateSettings {
    dllFound: boolean;
    dllPath: string;
    configPath: string;
    // How to fix a missing DLL; differs between dev and packaged builds.
    missingDllMessage: string | null;
}

export interface SavestateExportRequest {
    slpPath: string;
    // Viewer (Slippi) frame number, e.g. -123 for the first frame.
    frame: number;
    // Which of the two players to take over: the lower or higher port.
    player: "low" | "high";
    // Whether `frame` is the end of the clip (like D-Pad Down) or its start.
    mode: "end" | "start";
    clipLength: number;
    namingStyle: number;
    // Optional savestate name; blank uses the naming style.
    name: string;
    exportFolder: string;
}

export type SavestateExportResult =
    | { ok: true; outputPath: string | null; exportFolder: string }
    | { ok: false; error: string; detail?: string };

// Replay browser (side panel) entries.
export interface LibraryEntry {
    name: string;
    path: string;
}

export interface DirectoryListing {
    folders: LibraryEntry[];
    // Only .slp files.
    files: LibraryEntry[];
    error?: string;
}

export interface LibrarySearchResult extends LibraryEntry {
    kind: "folder" | "file";
    // Parent folder relative to the search root, for display ("" = the root itself).
    parentPath: string;
}

export interface LibrarySearchResponse {
    results: LibrarySearchResult[];
    // True when the result limit was hit and the search stopped early.
    isTruncated: boolean;
}

export type LoadReplayResult =
    | { ok: true; replay: ReplayData }
    | { ok: false; error: string };
