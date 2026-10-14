import type { FrameSnapshot, PlayerInfo } from "../../../shared/types";
import { getActionStateName } from "../lib/actionStates";
import { getPortColor } from "../lib/format";

interface PlayerHudProps {
    players: PlayerInfo[];
    snapshot: FrameSnapshot | undefined;
}

export function PlayerHud({ players, snapshot }: PlayerHudProps) {
    return (
        <div className="player-hud">
            {players.map((player) => {
                const state = snapshot?.players[player.playerIndex] ?? null;
                const color = getPortColor(player.playerIndex);
                return (
                    <div key={player.playerIndex} className="player-card" style={{ borderColor: color }}>
                        <div className="player-card-header">
                            <span className="player-port" style={{ background: color }}>
                                P{player.port}
                            </span>
                            <span className="player-character">{player.characterName}</span>
                            <span className="player-name" title={player.connectCode}>
                                {player.displayName || player.connectCode}
                            </span>
                        </div>
                        <div className="player-card-body">
                            <span className="player-percent">
                                {state ? `${Math.floor(state.percent)}%` : "—"}
                            </span>
                            <span className="player-stocks" aria-label={`${state?.stocks ?? 0} stocks`}>
                                {Array.from({ length: state?.stocks ?? 0 }, (_unused, index) => (
                                    <span key={index} className="stock-dot" style={{ background: color }} />
                                ))}
                            </span>
                        </div>
                        <div className="player-action" title="Action state">
                            {state
                                ? `${getActionStateName(state.actionStateId, state.internalCharacterId)} (${state.actionStateId})`
                                : "No data"}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
