import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CharacterAnimations, loadCharacterAnimations } from "../lib/animations";
import { getCharacterModel } from "../lib/characters";

export type AnimationsByZip = Record<string, CharacterAnimations>;

// Loads the animation zips for every character in the replay. Characters render as
// simple markers until their zip is ready (or if it is missing).
export function useCharacterAnimations(internalCharacterIds: number[]): AnimationsByZip {
    const [animationsByZip, setAnimationsByZip] = useState<AnimationsByZip>({});

    useEffect(() => {
        let isCancelled = false;
        const zipNames = new Set<string>();
        for (const internalCharacterId of internalCharacterIds) {
            const model = getCharacterModel(internalCharacterId);
            if (model) {
                zipNames.add(model.zipName);
            }
        }

        Promise.all(
            [...zipNames].map(async (zipName) => [zipName, await loadCharacterAnimations(zipName)] as const),
        )
            .then((results) => {
                if (isCancelled) {
                    return;
                }
                const loaded: AnimationsByZip = {};
                const missing: string[] = [];
                for (const [zipName, animations] of results) {
                    if (animations) {
                        loaded[zipName] = animations;
                    } else {
                        missing.push(zipName);
                    }
                }
                setAnimationsByZip(loaded);
                if (missing.length > 0) {
                    toast.error("Animation data not found", {
                        id: "animations-missing",
                        description: `Missing: ${missing.join(", ")}. Run "npm run fetch-animations" and reopen the replay.`,
                    });
                }
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                toast.error("Couldn't load animations", { id: "animations-error", description: message });
            });

        return () => {
            isCancelled = true;
        };
    }, [internalCharacterIds]);

    return animationsByZip;
}
