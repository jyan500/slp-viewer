import { useEffect, useState } from "react";
import type { StadiumCollision } from "../../../shared/types";
import { POKEMON_STADIUM_STAGE_ID } from "../../../shared/stages";

let cachedCollision: Promise<StadiumCollision | null> | null = null;

// Loads the extracted Pokemon Stadium transformation geometry (once per session) when
// the replay is on Stadium. Null if it hasn't been extracted.
export function useStadiumCollision(stageId: number): StadiumCollision | null {
    const [collision, setCollision] = useState<StadiumCollision | null>(null);

    useEffect(() => {
        if (stageId !== POKEMON_STADIUM_STAGE_ID) {
            return;
        }
        let isCancelled = false;
        cachedCollision ??= window.api.loadStadiumCollision();
        cachedCollision.then((loaded) => {
            if (!loaded) {
                // Allow a retry after `npm run extract-stadium` without restarting.
                cachedCollision = null;
            }
            if (!isCancelled) {
                setCollision(loaded);
            }
        });
        return () => {
            isCancelled = true;
        };
    }, [stageId]);

    return collision;
}
