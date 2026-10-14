// Projectiles and items. The shapes and hitbox sizes for the named types are ported
// from Slippi Lab's Item.tsx (MIT, see THIRD_PARTY_NOTICES.md); every other item gets a
// small labeled marker so nothing on screen is invisible.
import type { FrameSnapshot, ItemState } from "../../../shared/types";
import { getPortColor } from "./format";
import { itemNamesById, type ItemName } from "./itemNames";
import type { Viewport } from "./viewport";

// Item coordinates are world units, but hitbox sizes are in hitbox space (1/256 unit).
const HITBOX_SCALE = 1 / 256;

const PROJECTILE_COLOR = "#a9a9a9";
const LASER_COLOR = "#ff3b3b";
const FLY_GUY_COLOR = "#aa0000";
const UNOWNED_ITEM_COLOR = "#c8ccd4";

// Held turnips/eggs are drawn at the owner's position, raised this many world units.
const HELD_ITEM_HEIGHT = 8;
const LASER_HITBOX_SIZE = 300;
// Fox's laser also has a 4th first-frame-only hitbox at -3600 that Slippi Lab skips.
const FOX_LASER_OFFSETS = [-200, -933, -1666];
const FALCO_LASER_OFFSETS = [-200, -933, -1666, -2400];
// Samus charge shot hitbox size by charge level 0-7.
const CHARGE_SHOT_SIZES = [300, 400, 500, 600, 700, 800, 900, 1200];

const MARKER_RADIUS = 2.5;
const MIN_MARKER_RADIUS_PX = 3;

// Drawn by the character model already (the gun in hand, the side-B afterimage).
const HIDDEN_ITEMS = new Set<ItemName>([
    "Fox's Blaster",
    "Falco's Blaster",
    "Fox's shadow",
    "Falco's shadow",
    "Kirby copy Fox's Blaster (B)",
    "Kirby copy Falco's Blaster (B)",
]);

interface ItemContext {
    context: CanvasRenderingContext2D;
    viewport: Viewport;
    snapshot: FrameSnapshot;
}

function drawCircle(
    { context, viewport }: ItemContext,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha = 1,
) {
    context.beginPath();
    context.arc(viewport.toScreenX(x), viewport.toScreenY(y), radius * viewport.scale, 0, Math.PI * 2);
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fill();
    context.globalAlpha = 1;
}

// A laser is a short line of hitboxes trailing behind its position, angled along its
// velocity (thrown or reflected lasers aren't horizontal). Slippi Lab's Fox version also
// multiplies by facingDirection, which double-flips left-moving lasers so their hitboxes
// lead instead of trail; both lasers use the velocity direction alone here.
function drawLaser(itemContext: ItemContext, item: ItemState, offsets: number[]) {
    const { context, viewport } = itemContext;
    const direction = Math.atan2(item.velocityY, item.velocityX);
    const points = offsets.map((offset) => {
        const distance = offset * HITBOX_SCALE;
        return { x: item.x + distance * Math.cos(direction), y: item.y + distance * Math.sin(direction) };
    });
    const first = points[0];
    const last = points[points.length - 1];
    context.beginPath();
    context.moveTo(viewport.toScreenX(first.x), viewport.toScreenY(first.y));
    context.lineTo(viewport.toScreenX(last.x), viewport.toScreenY(last.y));
    context.strokeStyle = LASER_COLOR;
    context.lineWidth = 1;
    context.stroke();
    for (const point of points) {
        drawCircle(itemContext, point.x, point.y, LASER_HITBOX_SIZE * HITBOX_SCALE, LASER_COLOR);
    }
}

// Turnips and eggs report state 0 while held; their own position isn't meaningful then.
function getHeldOrOwnPosition({ snapshot }: ItemContext, item: ItemState) {
    const owner = item.state === 0 ? snapshot.players[item.owner] : null;
    return owner ? { x: owner.x, y: owner.y + HELD_ITEM_HEIGHT } : { x: item.x, y: item.y };
}

type ItemDrawer = (itemContext: ItemContext, item: ItemState) => void;

const ITEM_DRAWERS: Partial<Record<ItemName, ItemDrawer>> = {
    "Fox's Laser": (itemContext, item) => drawLaser(itemContext, item, FOX_LASER_OFFSETS),
    "Kirby copy Fox's Laser (B)": (itemContext, item) => drawLaser(itemContext, item, FOX_LASER_OFFSETS),
    "Falco's Laser": (itemContext, item) => drawLaser(itemContext, item, FALCO_LASER_OFFSETS),
    "Kirby copy Falco's Laser (B)": (itemContext, item) => drawLaser(itemContext, item, FALCO_LASER_OFFSETS),
    "Needle(thrown)": (itemContext, item) => drawCircle(itemContext, item.x, item.y, 500 * HITBOX_SCALE, PROJECTILE_COLOR),
    "Mario's fire": (itemContext, item) => drawCircle(itemContext, item.x, item.y, 600 * HITBOX_SCALE, PROJECTILE_COLOR),
    "Luigi's fire": (itemContext, item) => drawCircle(itemContext, item.x, item.y, 500 * HITBOX_SCALE, PROJECTILE_COLOR),
    // missileType: 0 = homing, 1 = super missile
    Missile: (itemContext, item) =>
        drawCircle(itemContext, item.x, item.y, (item.missileType === 0 ? 500 : 600) * HITBOX_SCALE, PROJECTILE_COLOR),
    // state 3 = exploding
    "Samus's bomb": (itemContext, item) =>
        drawCircle(itemContext, item.x, item.y, (item.state === 3 ? 1536 : 500) * HITBOX_SCALE, PROJECTILE_COLOR),
    "Samus's chargeshot": (itemContext, item) => {
        const level = Math.min(Math.max(item.chargePower, 0), CHARGE_SHOT_SIZES.length - 1);
        drawCircle(itemContext, item.x, item.y, CHARGE_SHOT_SIZES[level] * HITBOX_SCALE, PROJECTILE_COLOR);
    },
    // state 0 = held, 2 = thrown
    Turnip: (itemContext, item) => {
        const position = getHeldOrOwnPosition(itemContext, item);
        drawCircle(itemContext, position.x, position.y, 600 * HITBOX_SCALE, PROJECTILE_COLOR, item.state === 0 ? 0.5 : 1);
    },
    // state 0 = held, 1 = thrown, 2 = exploded
    "Yoshi's egg(thrown)": (itemContext, item) => {
        const position = getHeldOrOwnPosition(itemContext, item);
        const radius = (item.state === 2 ? 2500 : 1000) * HITBOX_SCALE;
        drawCircle(itemContext, position.x, position.y, radius, PROJECTILE_COLOR, item.state === 1 ? 1 : 0.5);
    },
    "Shyguy (Heiho)": (itemContext, item) => drawCircle(itemContext, item.x, item.y, 5 * 0.85, FLY_GUY_COLOR),
};

function getItemLabel(item: ItemState): string {
    return itemNamesById[item.typeId] || `Item ${item.typeId}`;
}

// Anything without a dedicated shape: a diamond in the owner's port color, labeled.
function drawGenericItem({ context, viewport }: ItemContext, item: ItemState) {
    const screenX = viewport.toScreenX(item.x);
    const screenY = viewport.toScreenY(item.y);
    const radius = Math.max(MARKER_RADIUS * viewport.scale, MIN_MARKER_RADIUS_PX);
    const color = item.owner >= 0 && item.owner <= 3 ? getPortColor(item.owner) : UNOWNED_ITEM_COLOR;

    context.beginPath();
    context.moveTo(screenX, screenY - radius);
    context.lineTo(screenX + radius, screenY);
    context.lineTo(screenX, screenY + radius);
    context.lineTo(screenX - radius, screenY);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    // Light outline + dark label halo: items often sit on top of their owner, who is
    // drawn in the same port color.
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.stroke();

    const label = getItemLabel(item);
    const labelY = screenY - radius - 2;
    context.font = "10px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.lineWidth = 3;
    context.lineJoin = "round";
    context.strokeStyle = "#0b0c10";
    context.strokeText(label, screenX, labelY);
    context.fillStyle = color;
    context.fillText(label, screenX, labelY);
}

export function drawItems(context: CanvasRenderingContext2D, viewport: Viewport, snapshot: FrameSnapshot) {
    const itemContext: ItemContext = { context, viewport, snapshot };
    for (const item of snapshot.items) {
        const name = itemNamesById[item.typeId] as ItemName | undefined;
        if (name && HIDDEN_ITEMS.has(name)) {
            continue;
        }
        const drawer = name ? ITEM_DRAWERS[name] : undefined;
        if (drawer) {
            drawer(itemContext, item);
        } else {
            drawGenericItem(itemContext, item);
        }
    }
}
