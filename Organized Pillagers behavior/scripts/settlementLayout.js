const PARK_BOUNDS = { minU: -20, maxU: -4, minV: -20, maxV: -4 };
const ROAD_BOUNDS = [
    { id: "mainStreet", minU: -34, maxU: 37, minV: -1, maxV: 1 },
    { id: "centralAvenue", minU: -1, maxU: 1, minV: -27, maxV: 80 },
    { id: "westAvenue", minU: -27, maxU: -23, minV: -27, maxV: 80 },
    { id: "northStreet", minU: -27, maxU: 37, minV: 71, maxV: 73 },
];
const LOT_BOUNDS = [
    { id: "W1", minU: -20, maxU: -4, minV: 38, maxV: 54 },
    { id: "W2", minU: -20, maxU: -4, minV: 21, maxV: 37 },
    { id: "W3", minU: -20, maxU: -4, minV: 4, maxV: 20 },
    { id: "E2", minU: 4, maxU: 20, minV: 21, maxV: 37 },
    { id: "E3", minU: 4, maxU: 20, minV: 4, maxV: 20 },
    { id: "governorPalace", minU: 4, maxU: 30, minV: 38, maxV: 68 },
];
const LOT_CLEARANCE_HEIGHT = 14;

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
        center === null || typeof center !== "object"
        || !Number.isInteger(center.x) || !Number.isInteger(center.y) || !Number.isInteger(center.z)
    ) {
        throw new Error("Settlement layout requires an integer block-grid center.");
    }
}

function getOrientationVectors(orientation) {
    const vectors = ORIENTATION_VECTORS[orientation];
    if (vectors === undefined) throw new Error(`Unknown settlement orientation: ${orientation}.`);
    return vectors;
}

function toWorldLocation(center, vectors, u, v) {
    return {
        x: center.x + u * vectors.east.x + v * vectors.north.x,
        y: center.y,
        z: center.z + u * vectors.east.z + v * vectors.north.z,
    };
}

function createArea(center, vectors, { id, minU, maxU, minV, maxV }) {
    const footprint = [];
    const outline = [];
    const interior = [];
    for (let v = maxV; v >= minV; v -= 1) {
        for (let u = minU; u <= maxU; u += 1) {
            const location = toWorldLocation(center, vectors, u, v);
            footprint.push(location);
            if (u === minU || u === maxU || v === minV || v === maxV) outline.push(location);
            else interior.push(location);
        }
    }
    return {
        id,
        localBounds: { minU, maxU, minV, maxV },
        footprint,
        outline,
        interior,
    };
}

/**
 * Produces the permanent road, park, and lot geometry around the registered settlement center.
 * The center is the mathematical road intersection; every coordinate below is local to the
 * governor-facing orientation stored on the authoritative settlement record.
 */
export function createSettlementLayout(settlement, orientation = settlement?.orientation ?? "north") {
    validateSettlement(settlement);
    const vectors = getOrientationVectors(orientation);
    const { center } = settlement;
    const park = createArea(center, vectors, { id: "park", ...PARK_BOUNDS });
    const roads = ROAD_BOUNDS.map((road) => createArea(center, vectors, road));
    const lots = LOT_BOUNDS.map((lot) => {
        const area = createArea(center, vectors, lot);
        return {
            ...area,
            clearanceHeight: LOT_CLEARANCE_HEIGHT,
            frontageCenter: toWorldLocation(center, vectors, (lot.minU + lot.maxU) / 2, lot.minV),
        };
    });

    return {
        version: 2,
        settlementId: settlement.id,
        centerIntersection: { x: center.x, y: center.y, z: center.z },
        orientation,
        park,
        roads,
        lots,
        governorRow: {
            westLots: lots.filter((lot) => lot.id.startsWith("W")),
            eastLots: lots.filter((lot) => lot.id.startsWith("E")),
            governorPalace: lots.find((lot) => lot.id === "governorPalace"),
        },
    };
}
