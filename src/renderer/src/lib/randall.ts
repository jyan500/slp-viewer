// Randall, the cloud platform on Yoshi's Story. It isn't in the replay data, but its
// motion is a fixed 1200-frame loop that starts with the match, so its position is a
// function of the frame number. Ported from Slippi Lab's Stage.tsx (MIT, see
// THIRD_PARTY_NOTICES.md): straight runs at a constant speed, with sampled positions
// for the eight-frame turns at each corner.
//
// Checked against replays: characters standing on Randall sit at the computed height
// and within its span.

export interface PlatformSegment {
    left: number;
    right: number;
    // The two ends share a height for Randall, so one y is enough.
    y: number;
}

const LAP_FRAMES = 1200;
const WIDTH = 11.9;
const SPEED = 0.35484;

// Turning frames: frameInLap -> [y, left x].
const CORNER_POSITIONS: Record<number, [number, number]> = {
    416: [-33.184478759765625, 89.75263977050781],
    417: [-33.04470443725586, 90.07878112792969],
    418: [-32.904930114746094, 90.40492248535156],
    419: [-32.76515197753906, 90.73107147216797],
    420: [-32.49260711669922, 90.92455291748047],
    421: [-32.16635513305664, 91.06437683105469],
    422: [-31.84010314941406, 91.20419311523438],
    423: [-31.513851165771484, 91.3440170288086],
    469: [-15.1948881149292, 91.3371353149414],
    470: [-14.868742942810059, 91.1973648071289],
    471: [-14.542601585388184, 91.05758666992188],
    472: [-14.216456413269043, 90.91781616210938],
    473: [-13.967143058776855, 90.71036529541016],
    474: [-13.869664192199707, 90.36917877197266],
    475: [-13.772183418273926, 90.02799224853516],
    476: [-13.674698829650879, 89.68680572509766],
    1016: [-13.679760932922363, -101.919677734375],
    1017: [-13.819535255432129, -102.24581909179688],
    1018: [-13.959305763244629, -102.57196044921875],
    1019: [-14.099089622497559, -102.8981018066406],
    1020: [-14.320136070251465, -103.1476135253906],
    1021: [-14.6375150680542, -103.3063049316406],
    1022: [-14.954894065856934, -103.4649963378906],
    1069: [-31.59004211425781, -103.554931640625],
    1070: [-31.907413482666016, -103.39625549316406],
    1071: [-32.22478485107422, -103.23756408691406],
    1072: [-32.54215621948242, -103.07887268066406],
    1073: [-32.7216796875, -102.77439880371094],
    1074: [-32.89775085449219, -102.46626281738281],
    1075: [-33.07382583618164, -102.15814208984375],
};

// `frame` is the Slippi frame number (-123 = first frame).
export function getRandallSegment(frame: number): PlatformSegment {
    const frameInLap = ((frame % LAP_FRAMES) + LAP_FRAMES) % LAP_FRAMES;

    // Top run, right to left.
    if (frameInLap > 476 && frameInLap < 1016) {
        const right = 101.235443115234 - SPEED * (frameInLap - 477);
        return { left: right - WIDTH, right, y: -13.64989 };
    }
    // Left side, moving down.
    if (frameInLap > 1022 && frameInLap < 1069) {
        return { left: -103.6, right: -91.7, y: -15.2778692245483 - 0.354839325 * (frameInLap - 1023) };
    }
    // Bottom run, left to right (wraps around the end of the lap).
    if (frameInLap > 1075 || frameInLap < 416) {
        const framesIntoRun = frameInLap < 416 ? frameInLap + 125 : frameInLap - 1076;
        const left = -101.850006103516 + SPEED * framesIntoRun;
        return { left, right: left + WIDTH, y: -33.2489 };
    }
    // Right side, moving up.
    if (frameInLap > 423 && frameInLap < 469) {
        return { left: 91.35, right: 103.25, y: -31.16023254394531 + 0.354839325 * (frameInLap - 424) };
    }
    const [y, left] = CORNER_POSITIONS[frameInLap];
    return { left, right: left + WIDTH, y };
}
