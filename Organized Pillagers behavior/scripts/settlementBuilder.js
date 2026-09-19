import { createSettlementLayout } from "./settlementLayout.js";

// Door cardinal_direction must rotate one quarter-turn counterclockwise from the visual frontage.
const DOOR_STATE_DIRECTIONS = {
    north: "west",
    east: "north",
    south: "east",
    west: "south",
};

const HOUSE_LONG_STRUCTURE_ID = "house_long";
const HOUSE_LONG_STREET_SPAN = 12;
const HOUSE_LONG_DEPTH = 8;
const HOUSE_LONG_ROTATION_BY_LOT_SIDE_AND_LAYOUT_ORIENTATION = {
    // house_long faces east at zero degrees. W lots front local east; E lots front local west.
    W: { north: "None", east: "Rotate90", south: "Rotate180", west: "Rotate270" },
    E: { north: "Rotate180", east: "Rotate270", south: "None", west: "Rotate90" },
};

const GROUND_SIGN_DIRECTIONS = {
    // Base facing is rotated 180 degrees so the label reads toward the intended observation side.
    south: 8,
    west: 12,
    north: 0,
    east: 4,
};

const LAYOUT_VECTORS = {
    north: { north: { x: 0, z: -1 }, east: { x: 1, z: 0 } },
    east: { north: { x: 1, z: 0 }, east: { x: 0, z: 1 } },
    south: { north: { x: 0, z: 1 }, east: { x: -1, z: 0 } },
    west: { north: { x: -1, z: 0 }, east: { x: 0, z: -1 } },
};

function toWorld(center, orientation, u, v, yOffset = 0) {
    const vectors = LAYOUT_VECTORS[orientation];
    if (vectors === undefined) throw new Error(`Unknown layout orientation: ${orientation}.`);
    return {
        x: center.x + u * vectors.east.x + v * vectors.north.x,
        y: center.y + yOffset,
        z: center.z + u * vectors.east.z + v * vectors.north.z,
    };
}

function block(location, typeId, states = undefined) {
    return states === undefined ? { ...location, typeId } : { ...location, typeId, states };
}

/**
 * Converts a player's fractional location to the ground layer for a disposable layout. Subtracting
 * three quarters before flooring accommodates the shorter collision tops of grass paths and mud.
 */
export function resolveTestLayoutOrigin(location) {
    if (!Number.isFinite(location?.x) || !Number.isFinite(location?.y) || !Number.isFinite(location?.z)) {
        throw new Error("Test layout origin requires finite player coordinates.");
    }
    return {
        x: Math.floor(location.x),
        y: Math.floor(location.y - 0.75),
        z: Math.floor(location.z),
    };
}

/**
 * Uses the game's setblock grammar for doors rather than emulating its multi-block placement.
 */
export function createDoorSetblockCommand(location, orientation) {
    const direction = DOOR_STATE_DIRECTIONS[orientation];
    if (direction === undefined) throw new Error(`Unknown door orientation: ${orientation}.`);
    return `setblock ${location.x} ${location.y} ${location.z} minecraft:wooden_door ["minecraft:cardinal_direction"="${direction}"]`;
}

/**
 * Separates structural writes from multi-block door commands so every non-door block is settled
 * before vanilla command handling creates the doors.
 */
export function splitBuildPlacements(placements) {
    return {
        structure: placements.filter((placement) => placement.typeId !== "minecraft:wooden_door"),
        doors: placements.filter((placement) => placement.typeId === "minecraft:wooden_door"),
    };
}

/**
 * Converts an intended local footprint into the lowest world-space corner passed to StructureManager.
 * The resulting house rectangle stays within its lot while its front touches the inner street-side edge.
 */
function structureOriginForLocalBounds(center, orientation, localBounds) {
    const corners = [
        toWorld(center, orientation, localBounds.minU, localBounds.minV),
        toWorld(center, orientation, localBounds.minU, localBounds.maxV),
        toWorld(center, orientation, localBounds.maxU, localBounds.minV),
        toWorld(center, orientation, localBounds.maxU, localBounds.maxV),
    ];
    return {
        x: Math.min(...corners.map((corner) => corner.x)),
        y: center.y,
        z: Math.min(...corners.map((corner) => corner.z)),
    };
}

function createHouseLocalBounds(lot) {
    const lotSide = lot.id[0];
    const minV = lot.localBounds.minV + Math.floor((17 - HOUSE_LONG_STREET_SPAN) / 2);
    const maxV = minV + HOUSE_LONG_STREET_SPAN - 1;
    if (lotSide === "W") {
        return {
            minU: lot.localBounds.maxU - HOUSE_LONG_DEPTH,
            maxU: lot.localBounds.maxU - 1,
            minV,
            maxV,
        };
    }
    if (lotSide === "E") {
        return {
            minU: lot.localBounds.minU + 1,
            maxU: lot.localBounds.minU + HOUSE_LONG_DEPTH,
            minV,
            maxV,
        };
    }
    throw new Error(`Normal Governor's Row lot must start with W or E, got ${lot.id}.`);
}

/**
 * Plans the normal Governor's Row houses inside their own lots. The row follows local north/south,
 * so W and E lots must face inward toward opposite sides of the central avenue rather than share a
 * single orientation. The twelve-block street span has the intentional two/three-block centering gap.
 */
export function createGovernorRowHouseStructurePlan(settlement, orientation = settlement?.orientation ?? "north") {
    const layout = createSettlementLayout(settlement, orientation);

    return layout.lots
        .filter((lot) => lot.id !== "governorPalace")
        .map((lot) => {
            const lotSide = lot.id[0];
            const rotation = HOUSE_LONG_ROTATION_BY_LOT_SIDE_AND_LAYOUT_ORIENTATION[lotSide]?.[orientation];
            if (rotation === undefined) throw new Error(`Unknown ${lotSide}-lot rotation for ${orientation}.`);
            return {
                lotId: lot.id,
                structureId: HOUSE_LONG_STRUCTURE_ID,
                location: structureOriginForLocalBounds(
                    settlement.center,
                    orientation,
                    createHouseLocalBounds(lot)
                ),
                rotation,
            };
        });
}

/**
 * Produces the first physical settlement stage: roads, the bordered park, and the bordered empty
 * lots. Lots deliberately receive fourteen clear air blocks above each ground cell, reserving the
 * volume for later structures while keeping a rebuild deterministic.
 */
export function createInitialSettlementBuildPlan(settlement, orientation = settlement?.orientation ?? "north") {
    const layout = createSettlementLayout(settlement, orientation);
    const placementsByPosition = new Map();
    const add = (location, typeId) => {
        placementsByPosition.set(`${location.x},${location.y},${location.z}`, block(location, typeId));
    };

    for (const road of layout.roads) {
        for (const location of road.footprint) add(location, "minecraft:grass_path");
    }
    for (const location of layout.park.outline) add(location, "minecraft:stone");
    for (const location of layout.park.interior) add(location, "minecraft:grass_block");

    for (const lot of layout.lots) {
        for (const location of lot.outline) add(location, "minecraft:gray_concrete");
        for (const location of lot.interior) add(location, "minecraft:grass_block");
        for (const location of lot.footprint) {
            for (let yOffset = 1; yOffset <= lot.clearanceHeight; yOffset += 1) {
                add({ ...location, y: location.y + yOffset }, "minecraft:air");
            }
        }
    }

    return {
        settlementId: settlement.id,
        center: { ...settlement.center },
        orientation,
        placements: [...placementsByPosition.values()],
        structurePlacements: createGovernorRowHouseStructurePlan(settlement, orientation),
    };
}

/**
 * Produces one disposable layout at an invoking player's floored location and facing. It has no
 * registry side effects: the synthetic ID is only required by the pure layout validation contract.
 */
export function createPlayerFacingTestLayout(origin, playerFacing) {
    const plan = createInitialSettlementBuildPlan({
        id: 1,
        dimensionId: "minecraft:overworld",
        center: origin,
        orientation: playerFacing,
    });
    const label = playerFacing[0].toUpperCase() + playerFacing.slice(1);
    const orientationMarker = {
        stone: block({ ...origin, y: origin.y + 4 }, "minecraft:stone"),
        sign: block(
            { ...origin, y: origin.y + 5 },
            "minecraft:standing_sign",
            { "ground_sign_direction": GROUND_SIGN_DIRECTIONS[playerFacing] }
        ),
        text: label + " orientation",
    };
    return {
        ...plan,
        placements: [...plan.placements, orientationMarker.stone, orientationMarker.sign],
        orientationMarker,
    };
}
