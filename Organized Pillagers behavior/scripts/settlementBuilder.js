import { createSettlementLayout } from "./settlementLayout.js";

const CARDINAL_VECTORS = {
    north: { forward: { x: 0, z: -1 }, right: { x: 1, z: 0 } },
    east: { forward: { x: 1, z: 0 }, right: { x: 0, z: 1 } },
    south: { forward: { x: 0, z: 1 }, right: { x: -1, z: 0 } },
    west: { forward: { x: -1, z: 0 }, right: { x: 0, z: -1 } },
};

function getVectors(orientation) {
    const vectors = CARDINAL_VECTORS[orientation];
    if (vectors === undefined) throw new Error(`Unknown orientation: ${orientation}.`);
    return vectors;
}

function toWorld(center, vectors, u, v, yOffset = 0) {
    return {
        x: center.x + u * vectors.right.x + v * vectors.forward.x,
        y: center.y + yOffset,
        z: center.z + u * vectors.right.z + v * vectors.forward.z,
    };
}

function block(location, typeId) {
    return { ...location, typeId };
}

/**
 * Produces the first physical settlement stage: a cobblestone town square and a compact dirt
 * governor house inside the permanently reserved lot. It is pure so callers can preflight it.
 */
export function createInitialSettlementBuildPlan(settlement, orientation = settlement?.orientation ?? "north") {
    const layout = createSettlementLayout(settlement, orientation);
    const vectors = getVectors(orientation);
    const placements = [];

    for (const location of layout.townSquare.footprint) {
        placements.push(block(location, "minecraft:cobblestone"));
    }

    const house = layout.governorLot.levelZeroHouse;
    const bounds = house.localBounds;
    for (let v = bounds.minV; v <= bounds.maxV; v += 1) {
        for (let u = bounds.minU; u <= bounds.maxU; u += 1) {
            const location = toWorld(settlement.center, vectors, u, v);
            placements.push(block(location, "minecraft:dirt"));

            const isWall = u === bounds.minU || u === bounds.maxU || v === bounds.minV || v === bounds.maxV;
            if (isWall) {
                for (let yOffset = 1; yOffset <= 3; yOffset += 1) {
                    placements.push(block({ ...location, y: location.y + yOffset }, "minecraft:dirt"));
                }
            }
            placements.push(block({ ...location, y: location.y + 4 }, "minecraft:oak_planks"));
        }
    }

    // The first local-north wall is the street frontage. Replace its center two wall blocks with a door.
    const door = house.frontDoor;
    for (let yOffset = 1; yOffset <= 2; yOffset += 1) {
        const index = placements.findIndex((placement) =>
            placement.x === door.x && placement.y === door.y + yOffset && placement.z === door.z
        );
        placements[index] = block({ ...door, y: door.y + yOffset }, "minecraft:oak_door");
    }

    return {
        settlementId: settlement.id,
        center: { ...settlement.center },
        orientation,
        placements,
    };
}

/**
 * Creates four test builds in a two-by-two grid relative to the invoking player's facing.
 */
export function createOrientationTestGrid(origin, playerFacing, spacing = 64) {
    if (!Number.isInteger(origin?.x) || !Number.isInteger(origin?.y) || !Number.isInteger(origin?.z)) {
        throw new Error("Orientation test grid requires an integer block-grid origin.");
    }
    if (!Number.isInteger(spacing) || spacing < 1) {
        throw new Error("Orientation test grid spacing must be a positive integer.");
    }

    const vectors = getVectors(playerFacing);
    const variants = ["north", "east", "south", "west"];
    return variants.map((orientation, index) => {
        const forwardSteps = index >= 2 ? spacing : 0;
        const rightSteps = index % 2 === 1 ? spacing : 0;
        const center = {
            x: origin.x + forwardSteps * vectors.forward.x + rightSteps * vectors.right.x,
            y: origin.y,
            z: origin.z + forwardSteps * vectors.forward.z + rightSteps * vectors.right.z,
        };
        const label = orientation[0].toUpperCase() + orientation.slice(1);
        return {
            orientation,
            center,
            label,
            labelMarker: {
                stone: block({ ...center, y: center.y + 10 }, "minecraft:stone"),
                sign: block({ ...center, y: center.y + 11 }, "minecraft:oak_sign"),
            },
        };
    });
}
