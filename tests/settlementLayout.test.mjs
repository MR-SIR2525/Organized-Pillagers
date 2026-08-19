import test from "node:test";
import assert from "node:assert/strict";

import { createSettlementLayout } from "../Organized Pillagers behavior/scripts/settlementLayout.js";

test("createSettlementLayout centers a 17 by 17 town square on the settlement center", () => {
    const settlement = {
        id: 7,
        dimensionId: "minecraft:overworld",
        center: { x: 100, y: 70, z: -200 },
    };

    const layout = createSettlementLayout(settlement);

    assert.equal(layout.settlementId, 7);
    assert.equal(layout.orientation, "north");
    assert.equal(layout.townSquare.footprint.length, 289);
    assert.deepEqual(layout.townSquare.center, settlement.center);
    assert.deepEqual(layout.townSquare.localBounds, {
        minU: -8,
        maxU: 8,
        minV: -8,
        maxV: 8,
    });
    assert.deepEqual(layout.townSquare.footprint[0], { x: 92, y: 70, z: -208 });
    assert.deepEqual(layout.townSquare.footprint.at(-1), { x: 108, y: 70, z: -192 });
    assert.equal(
        layout.townSquare.footprint.filter(({ x, y, z }) => x === 100 && y === 70 && z === -200).length,
        1
    );
});

test("createSettlementLayout uses the persisted governor-facing orientation by default", () => {
    const layout = createSettlementLayout({
        id: 8,
        dimensionId: "minecraft:overworld",
        center: { x: 100, y: 70, z: -200 },
        orientation: "east",
    });

    assert.equal(layout.orientation, "east");
    assert.deepEqual(layout.governorLot.frontageCenter, { x: 109, y: 70, z: -200 });
});

test("createSettlementLayout reserves the full 27 by 31 governor palace lot from day one", () => {
    const layout = createSettlementLayout({
        id: 7,
        dimensionId: "minecraft:overworld",
        center: { x: 100, y: 70, z: -200 },
    });

    assert.deepEqual(layout.governorLot.localBounds, {
        minU: -13,
        maxU: 13,
        minV: 9,
        maxV: 39,
    });
    assert.equal(layout.governorLot.footprint.length, 837);
    assert.deepEqual(layout.governorLot.frontageCenter, { x: 100, y: 70, z: -209 });
    assert.deepEqual(layout.governorLot.levelZeroHouse.localBounds, {
        minU: -2,
        maxU: 2,
        minV: 13,
        maxV: 19,
    });
    assert.equal(layout.governorLot.levelZeroHouse.footprint.length, 35);
    assert.deepEqual(layout.governorLot.levelZeroHouse.frontDoor, { x: 100, y: 70, z: -213 });
});
