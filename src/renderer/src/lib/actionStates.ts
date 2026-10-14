import { actionNameById, type ActionName } from "./actionNames";
import { getCharacterModel } from "./characters";

export function getActionName(actionStateId: number): ActionName | undefined {
    return actionNameById[actionStateId];
}

// Character-specific states (341+) are named via the character's specials map,
// e.g. Fox 355 -> "SpecialHi".
export function getActionStateName(actionStateId: number, internalCharacterId?: number): string {
    const common = getActionName(actionStateId);
    if (common) {
        return common;
    }
    if (internalCharacterId !== undefined) {
        const special = getCharacterModel(internalCharacterId)?.character.specialsMap.get(actionStateId);
        if (special) {
            return special;
        }
    }
    return `State ${actionStateId}`;
}

export function isDeadActionState(actionStateId: number): boolean {
    return actionStateId <= 10;
}

// The animation to show for an action state, following Slippi Lab's lookup order.
// Returns "" when the character has no animation for the state.
export function getAnimationName(actionStateId: number, internalCharacterId: number): string {
    const character = getCharacterModel(internalCharacterId)?.character;
    const actionName = getActionName(actionStateId);
    const mapped =
        (actionName !== undefined ? character?.animationMap.get(actionName) : undefined) ??
        character?.specialsMap.get(actionStateId);
    return mapped ?? actionName ?? "";
}
