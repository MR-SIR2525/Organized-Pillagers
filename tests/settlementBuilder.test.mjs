import test from "node:test";
import assert from "node:assert/strict";

import {
    createInitialSettlementBuildPlan,
    createPlayerFacingTestLayout,
    createDoorSetblockCommand,
} from "../Organized Pillagers behavior/scripts/settlementBuilder.js";

const settlement = {
    id: 5,
    dimensionId: "minecraft:overworld",
    center: { x: 100, y: 70, z: -200 },
    orientation: "north",
};

test("createInitialSettlementBuildPlan materializes the park, roads, lots, and lot air clearances", () => {
    const plan = createInitialSettlementBuildPlan(settlement);

    assert.equal(plan.settlementId, 5);
    assert.equal(plan.orientation, "north");
    assert.ok(plan.placements.some((block) =>
        block.x === 80 && block.y === 70 && block.z === -180 && block.typeId === "minecraft:stone"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 88 && block.y === 70 && block.z === -188 && block.typeId === "minecraft:grass_block"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 100 && block.y === 70 && block.z === -200 && block.typeId === "minecraft:grass_path"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 80 && block.y === 70 && block.z === -204 && block.typeId === "minecraft:gray_concrete"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 81 && block.y === 70 && block.z === -205 && block.typeId === "minecraft:grass_block"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 80 && block.y === 84 && block.z === -204 && block.typeId === "minecraft:air"
    ));
    assert.equal(plan.placements.some((block) => block.typeId === "minecraft:wooden_door"), false);
});

test("createDoorSetblockCommand translates local-north orientation to the door state that faces it", () => {
    assert.equal(
        createDoorSetblockCommand({ x: 10, y: 64, z: -3 }, "north"),
        'setblock 10 64 -3 minecraft:wooden_door ["minecraft:cardinal_direction"="west"]'
    );
    assert.equal(
        createDoorSetblockCommand({ x: 10, y: 64, z: -3 }, "east"),
        'setblock 10 64 -3 minecraft:wooden_door ["minecraft:cardinal_direction"="north"]'
    );
});
test("createPlayerFacingTestLayout uses the invoking player's cardinal facing at its block-grid origin", () => {
    const plan = createPlayerFacingTestLayout({ x: 40, y: 72, z: -18 }, "west");

    assert.equal(plan.settlementId, 1);
    assert.equal(plan.orientation, "west");
    assert.deepEqual(plan.center, { x: 40, y: 72, z: -18 });
});
