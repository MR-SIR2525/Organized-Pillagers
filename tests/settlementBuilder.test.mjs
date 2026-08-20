import test from "node:test";
import assert from "node:assert/strict";

import {
    createInitialSettlementBuildPlan,
    createOrientationTestGrid,
} from "../Organized Pillagers behavior/scripts/settlementBuilder.js";

const settlement = {
    id: 5,
    dimensionId: "minecraft:overworld",
    center: { x: 100, y: 70, z: -200 },
    orientation: "north",
};

test("createInitialSettlementBuildPlan puts a town-square surface and dirt house at planned coordinates", () => {
    const plan = createInitialSettlementBuildPlan(settlement);

    assert.equal(plan.settlementId, 5);
    assert.equal(plan.orientation, "north");
    assert.equal(plan.placements.length, 419);
    assert.deepEqual(plan.placements[0], { x: 92, y: 70, z: -208, typeId: "minecraft:cobblestone" });
    assert.ok(plan.placements.some((block) =>
        block.x === 100 && block.y === 71 && block.z === -213 && block.typeId === "minecraft:wooden_door"
    ));
});

test("createOrientationTestGrid makes four labeled build plans in a facing-relative two-by-two grid", () => {
    const grid = createOrientationTestGrid({ x: 0, y: 64, z: 0 }, "east");

    assert.deepEqual(grid.map(({ orientation, center, label }) => ({ orientation, center, label })), [
        { orientation: "north", center: { x: 0, y: 64, z: 0 }, label: "North" },
        { orientation: "east", center: { x: 0, y: 64, z: 64 }, label: "East" },
        { orientation: "south", center: { x: 64, y: 64, z: 0 }, label: "South" },
        { orientation: "west", center: { x: 64, y: 64, z: 64 }, label: "West" },
    ]);
    assert.deepEqual(grid[0].labelMarker, {
        stone: { x: 0, y: 74, z: 0, typeId: "minecraft:stone" },
        sign: { x: 0, y: 75, z: 0, typeId: "minecraft:oak_sign" },
    });
});
