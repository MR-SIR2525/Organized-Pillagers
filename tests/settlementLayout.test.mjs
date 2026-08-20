import test from "node:test";
import assert from "node:assert/strict";

import { createSettlementLayout } from "../Organized Pillagers behavior/scripts/settlementLayout.js";

const settlement = {
    id: 7,
    dimensionId: "minecraft:overworld",
    center: { x: 100, y: 70, z: -200 },
    orientation: "north",
};

test("createSettlementLayout puts the mathematical road intersection at the registered center", () => {
    const layout = createSettlementLayout(settlement);

    assert.equal(layout.settlementId, 7);
    assert.deepEqual(layout.centerIntersection, settlement.center);
    assert.deepEqual(layout.park.localBounds, { minU: -20, maxU: -4, minV: -20, maxV: -4 });
    assert.equal(layout.park.footprint.length, 289);
    assert.equal(layout.park.outline.length, 64);
    assert.equal(layout.park.interior.length, 225);
});

test("createSettlementLayout makes the specified three-wide and five-wide grass-path roads", () => {
    const layout = createSettlementLayout(settlement);
    const boundsById = Object.fromEntries(layout.roads.map((road) => [road.id, road.localBounds]));

    assert.deepEqual(boundsById.mainStreet, { minU: -34, maxU: 37, minV: -1, maxV: 1 });
    assert.deepEqual(boundsById.centralAvenue, { minU: -1, maxU: 1, minV: -27, maxV: 80 });
    assert.deepEqual(boundsById.westAvenue, { minU: -27, maxU: -23, minV: -27, maxV: 80 });
    assert.deepEqual(boundsById.northStreet, { minU: -27, maxU: 37, minV: 71, maxV: 73 });
});

test("createSettlementLayout relocates Governor's Row lots and preserves road buffers", () => {
    const layout = createSettlementLayout(settlement);
    const boundsById = Object.fromEntries(layout.lots.map((lot) => [lot.id, lot.localBounds]));

    assert.deepEqual(boundsById.W1, { minU: -20, maxU: -4, minV: 38, maxV: 54 });
    assert.deepEqual(boundsById.W2, { minU: -20, maxU: -4, minV: 21, maxV: 37 });
    assert.deepEqual(boundsById.W3, { minU: -20, maxU: -4, minV: 4, maxV: 20 });
    assert.deepEqual(boundsById.E2, { minU: 4, maxU: 20, minV: 21, maxV: 37 });
    assert.deepEqual(boundsById.E3, { minU: 4, maxU: 20, minV: 4, maxV: 20 });
    assert.deepEqual(boundsById.governorPalace, { minU: 4, maxU: 30, minV: 38, maxV: 68 });
    assert.equal(boundsById.governorPalace.maxU - boundsById.governorPalace.minU + 1, 27);
    assert.equal(boundsById.governorPalace.maxV - boundsById.governorPalace.minV + 1, 31);
    assert.equal(layout.lots.every((lot) => lot.clearanceHeight === 14), true);
});

test("createSettlementLayout rotates park and Governor's Row from persisted orientation", () => {
    const layout = createSettlementLayout({ ...settlement, orientation: "east" });
    const palace = layout.lots.find((lot) => lot.id === "governorPalace");

    assert.equal(layout.orientation, "east");
    assert.deepEqual(layout.centerIntersection, settlement.center);
    assert.deepEqual(palace.frontageCenter, { x: 138, y: 70, z: -183 });
});
