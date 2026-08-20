import { createSettlementLayout } from "./settlementLayout.js";

// Door cardinal_direction must rotate one quarter-turn counterclockwise from the visual frontage.
const DOOR_STATE_DIRECTIONS = {
    north: "west",
    east: "north",
    south: "east",
    west: "south",
};

function block(location, typeId, states = undefined) {
    return states === undefined ? { ...location, typeId } : { ...location, typeId, states };
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
    };
}

/**
 * Produces one disposable layout at an invoking player's floored location and facing. It has no
 * registry side effects: the synthetic ID is only required by the pure layout validation contract.
 */
export function createPlayerFacingTestLayout(origin, playerFacing) {
    return createInitialSettlementBuildPlan({
        id: 1,
        dimensionId: "minecraft:overworld",
        center: origin,
        orientation: playerFacing,
    });
}
