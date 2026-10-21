import { basename } from "path";
import { FodPlatformSide, Frames, SlippiGame, characters, stages } from "@slippi/slippi-js/node";
import type {
    ItemUpdateType,
    MetadataType,
    PlayerType,
    PostFrameUpdateType,
    PreFrameUpdateType,
} from "@slippi/slippi-js/node";
import type { CharacterState, FrameSnapshot, ItemState, PlayerInfo, ReplayData, StadiumEvent } from "../shared/types";
import {
    FOD_INITIAL_LEFT_PLATFORM_HEIGHT,
    FOD_INITIAL_RIGHT_PLATFORM_HEIGHT,
    FOUNTAIN_OF_DREAMS_STAGE_ID,
    POKEMON_STADIUM_STAGE_ID,
} from "../shared/stages";

const MAX_PLAYERS = 4;

interface FrameUpdate {
    pre: PreFrameUpdateType;
    post: PostFrameUpdateType;
}

// `previous` is this character's state on the prior frame (null after a gap), used to
// carry start-of-action values forward. Mirrors Slippi Lab's getStartOfAction: a new
// action begins when the action state changes or its frame counter goes backwards.
function toCharacterState(
    update: FrameUpdate | undefined,
    previous: CharacterState | null,
): CharacterState | null {
    const post = update?.post;
    const pre = update?.pre;
    if (!post || post.positionX == null || post.positionY == null) {
        return null;
    }
    const actionStateId = post.actionStateId ?? 0;
    const actionStateCounter = post.actionStateCounter ?? 0;
    const facing = post.facingDirection ?? 1;
    const joystickX = pre?.joystickX ?? 0;
    const joystickY = pre?.joystickY ?? 0;
    const trigger = pre?.trigger ?? 0;
    const lCancelStatus = post.lCancelStatus ?? 0;

    const isNewAction =
        !previous ||
        previous.actionStateId !== actionStateId ||
        previous.actionStateCounter > actionStateCounter;

    return {
        internalCharacterId: post.internalCharacterId ?? 0,
        x: post.positionX,
        y: post.positionY,
        facing,
        actionStateId,
        actionStateCounter,
        percent: post.percent ?? 0,
        stocks: post.stocksRemaining ?? 0,
        shieldSize: post.shieldSize ?? 0,
        isAirborne: post.isAirborne ?? false,
        hurtboxCollisionState: post.hurtboxCollisionState ?? 0,
        lCancelStatus,
        joystickX,
        joystickY,
        trigger,
        startFacing: isNewAction ? facing : previous.startFacing,
        startJoystickX: isNewAction ? joystickX : previous.startJoystickX,
        startJoystickY: isNewAction ? joystickY : previous.startJoystickY,
        startTrigger: isNewAction ? trigger : previous.startTrigger,
        startLCancelStatus: isNewAction ? lCancelStatus : previous.startLCancelStatus,
    };
}

function toItemState(item: ItemUpdateType): ItemState | null {
    if (item.typeId == null || item.positionX == null || item.positionY == null) {
        return null;
    }
    return {
        typeId: item.typeId,
        state: item.state ?? 0,
        x: item.positionX,
        y: item.positionY,
        velocityX: item.velocityX ?? 0,
        velocityY: item.velocityY ?? 0,
        facing: item.facingDirection ?? 1,
        owner: item.owner ?? -1,
        missileType: item.missileType ?? 0,
        chargePower: item.chargePower ?? 0,
    };
}

export function safeName(lookup: () => string, fallback: string): string {
    try {
        return lookup();
    } catch {
        return fallback;
    }
}

// Older replays only have names in the metadata block; offline games fall back to the
// in-game nametag.
export function getPlayerIdentity(
    player: PlayerType,
    metadata: MetadataType | undefined,
): { displayName: string; connectCode: string } {
    const metadataNames = metadata?.players?.[player.playerIndex]?.names;
    return {
        displayName: player.displayName || metadataNames?.netplay || player.nametag || "",
        connectCode: player.connectCode || metadataNames?.code || "",
    };
}

export function parseReplay(filePath: string): ReplayData {
    const game = new SlippiGame(filePath);
    const settings = game.getSettings();
    if (!settings) {
        throw new Error("Replay has no game start data (the file may be corrupt).");
    }

    const frames = game.getFrames();
    const latestFrame = game.getLatestFrame();
    if (!latestFrame) {
        throw new Error("Replay contains no frames.");
    }

    const firstFrame: number = Frames.FIRST;
    const lastFrame = latestFrame.frame;
    const metadata = game.getMetadata();

    const players: PlayerInfo[] = settings.players.map((player) => {
        const characterId = player.characterId ?? 0;
        return {
            playerIndex: player.playerIndex,
            port: player.port,
            characterId,
            characterName: safeName(() => characters.getCharacterShortName(characterId), "Unknown"),
            ...getPlayerIdentity(player, metadata),
            teamId: settings.isTeams ? (player.teamId ?? null) : null,
        };
    });

    const stageId = settings.stageId ?? 0;
    const isFountainOfDreams = stageId === FOUNTAIN_OF_DREAMS_STAGE_ID;
    // FoD platform heights only change via stage events (replays 3.18+); carry the last
    // known value forward so every frame has one.
    const fodPlatformHeights = { left: [] as number[], right: [] as number[] };
    let fodLeftHeight = FOD_INITIAL_LEFT_PLATFORM_HEIGHT;
    let fodRightHeight = FOD_INITIAL_RIGHT_PLATFORM_HEIGHT;
    let hasFodEvents = false;
    const isPokemonStadium = stageId === POKEMON_STADIUM_STAGE_ID;
    const stadiumEvents: StadiumEvent[] = [];

    const snapshots: FrameSnapshot[] = [];
    const internalCharacterIds = new Set<number>();
    let previous: FrameSnapshot = { players: [], followers: [], items: [] };
    for (let frameNumber = firstFrame; frameNumber <= lastFrame; frameNumber++) {
        const entry = frames[frameNumber];
        if (isFountainOfDreams) {
            for (const event of entry?.stageEvents ?? []) {
                if (!("platform" in event) || event.platform === undefined || event.height === undefined) {
                    continue;
                }
                hasFodEvents = true;
                if (event.platform === FodPlatformSide.LEFT) {
                    fodLeftHeight = event.height;
                } else {
                    fodRightHeight = event.height;
                }
            }
            fodPlatformHeights.left.push(fodLeftHeight);
            fodPlatformHeights.right.push(fodRightHeight);
        }
        if (isPokemonStadium) {
            for (const event of entry?.stageEvents ?? []) {
                if ("transformation" in event && event.event !== undefined && event.transformation !== undefined) {
                    stadiumEvents.push({ frame: frameNumber, event: event.event, transformation: event.transformation });
                }
            }
        }
        if (!entry) {
            // Missing frame (e.g. a truncated replay): repeat the last known state so
            // frame numbers stay aligned with array indices.
            snapshots.push(previous);
            continue;
        }
        const snapshot: FrameSnapshot = { players: [], followers: [], items: [] };
        for (const item of entry.items ?? []) {
            const itemState = toItemState(item);
            if (itemState) {
                snapshot.items.push(itemState);
            }
        }
        for (let playerIndex = 0; playerIndex < MAX_PLAYERS; playerIndex++) {
            // slippi-js omits `followers` on frames with no Ice Climbers follower.
            const player = toCharacterState(
                entry.players?.[playerIndex],
                previous.players[playerIndex] ?? null,
            );
            const follower = toCharacterState(
                entry.followers?.[playerIndex],
                previous.followers[playerIndex] ?? null,
            );
            for (const state of [player, follower]) {
                if (state) {
                    internalCharacterIds.add(state.internalCharacterId);
                }
            }
            snapshot.players.push(player);
            snapshot.followers.push(follower);
        }
        snapshots.push(snapshot);
        previous = snapshot;
    }

    return {
        filePath,
        fileName: basename(filePath),
        stageId,
        stageName: safeName(() => stages.getStageName(stageId), `Stage ${stageId}`),
        startingTimerSeconds: settings.startingTimerSeconds ?? null,
        firstFrame,
        lastFrame,
        players,
        internalCharacterIds: [...internalCharacterIds],
        fodPlatformHeights: isFountainOfDreams && hasFodEvents ? fodPlatformHeights : null,
        stadiumEvents: isPokemonStadium ? stadiumEvents : null,
        frames: snapshots,
    };
}
