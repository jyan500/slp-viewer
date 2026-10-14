import { useCallback, useState } from "react";

function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
    try {
        const stored = localStorage.getItem(key);
        if (stored === null) {
            return fallback;
        }
        let parsed: unknown = stored;
        try {
            parsed = JSON.parse(stored);
        } catch {
            // Older values were stored as raw strings (e.g. the camera mode); use as-is.
        }
        return isValid(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

// useState backed by localStorage, for per-viewer preferences (remembered across
// replays and restarts). Storage failures are ignored: the value just won't persist.
export function usePersistentState<T>(
    key: string,
    fallback: T,
    isValid: (value: unknown) => value is T,
): [T, (next: T | ((current: T) => T)) => void] {
    const [value, setValue] = useState<T>(() => readStored(key, fallback, isValid));

    const setPersistentValue = useCallback(
        (next: T | ((current: T) => T)) => {
            setValue((current) => {
                const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
                try {
                    localStorage.setItem(key, JSON.stringify(resolved));
                } catch {
                    // Storage unavailable.
                }
                return resolved;
            });
        },
        [key],
    );

    return [value, setPersistentValue];
}

export function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
}

export function isNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export function isStringOrNull(value: unknown): value is string | null {
    return value === null || typeof value === "string";
}
