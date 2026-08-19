const TOWN_SQUARE_HALF_SIZE = 8;
const GOVERNOR_LOT_HALF_WIDTH = 13;
const GOVERNOR_LOT_FRONT_V = 9;
const GOVERNOR_LOT_DEPTH = 31;
const LEVEL_ZERO_HOUSE_HALF_WIDTH = 2;
const LEVEL_ZERO_HOUSE_FRONT_V = 13;
const LEVEL_ZERO_HOUSE_DEPTH = 7;

const ORIENTATION_VECTORS = {
    north: { north: { x: 0, z: -1 }, east: { x: 1, z: 0 } },
    east: { north: { x: 1, z: 0 }, east: { x: 0, z: 1 } },
    south: { north: { x: 0, z: 1 }, east: { x: -1, z: 0 } },
    west: { north: { x: -1, z: 0 }, east: { x: 0, z: -1 } },
};

function validateSettlement(settlement) {
    if (settlement === null || typeof settlement !== "object") {
        throw new Error("Settlement layout requires a settlement record.");
    }

    const { id, center } = settlement;
    if (!Number.isInteger(id) || id < 1) {
        throw new Error("Settlement layout requires a positive integer settlement ID.");
    }
    if (
        center === null ||
        typeof center !== "object" ||
        !Number.isInteger(center.x) ||
        !Number.isInteger(center.y) ||
        !Number.isInteger(center.z)
    ) {
        throw new Error("Settlement layout requires an integer block-grid center.");
    }
}

function getOrientationVectors(orientation) {
    const vectors = ORIENTATION_VECTORS[orientation];
    if (vectors === undefined) {
        throw new Error(`Unknown settlement orientation: ${orientation}.`);
    }
    return vectors;
}

function toWorldLocation(center, vectors, u, v) {
    return {
        x: center.x + u * vectors.east.x + v * vectors.north.x,
        y: center.y,
        z: center.z + u * vectors.east.z + v * vectors.north.z,
    };
}

function createFootprint(center, vectors, localBounds) {
    const footprint = [];
    for (let v = localBounds.maxV; v >= localBounds.minV; v -= 1) {
        for (let u = localBounds.minU; u <= localBounds.maxU; u += 1) {
            footprint.push(toWorldLocation(center, vectors, u, v));
        }
    }
    return footprint;
}

/**
 * Produces a deterministic, world-write-free settlement layout plan.
 *
 * The existing settlement center is the exact middle block of the 17 by 17 town square. The
 * governor's 27 by 31 future palace lot is reserved on local north from the first build stage,
 * allowing level upgrades to grow backward and sideways without moving their street frontage.
 */
export function createSettlementLayout(settlement, orientation = settlement?.orientation ?? "north") {
    validateSettlement(settlement);
    const vectors = getOrientationVectors(orientation);
    const { center } = settlement;

    const townSquareBounds = {
        minU: -TOWN_SQUARE_HALF_SIZE,
        maxU: TOWN_SQUARE_HALF_SIZE,
        minV: -TOWN_SQUARE_HALF_SIZE,
        maxV: TOWN_SQUARE_HALF_SIZE,
    };
    const governorLotBounds = {
        minU: -GOVERNOR_LOT_HALF_WIDTH,
        maxU: GOVERNOR_LOT_HALF_WIDTH,
        minV: GOVERNOR_LOT_FRONT_V,
        maxV: GOVERNOR_LOT_FRONT_V + GOVERNOR_LOT_DEPTH - 1,
    };
    const levelZeroHouseBounds = {
        minU: -LEVEL_ZERO_HOUSE_HALF_WIDTH,
        maxU: LEVEL_ZERO_HOUSE_HALF_WIDTH,
        minV: LEVEL_ZERO_HOUSE_FRONT_V,
        maxV: LEVEL_ZERO_HOUSE_FRONT_V + LEVEL_ZERO_HOUSE_DEPTH - 1,
    };

    return {
        version: 1,
        settlementId: settlement.id,
        center: { x: center.x, y: center.y, z: center.z },
        orientation,
        townSquare: {
            center: { x: center.x, y: center.y, z: center.z },
            localBounds: townSquareBounds,
            footprint: createFootprint(center, vectors, townSquareBounds),
        },
        governorLot: {
            localBounds: governorLotBounds,
            footprint: createFootprint(center, vectors, governorLotBounds),
            frontageCenter: toWorldLocation(center, vectors, 0, GOVERNOR_LOT_FRONT_V),
            levelZeroHouse: {
                localBounds: levelZeroHouseBounds,
                footprint: createFootprint(center, vectors, levelZeroHouseBounds),
                frontDoor: toWorldLocation(center, vectors, 0, LEVEL_ZERO_HOUSE_FRONT_V),
            },
        },
    };
}
