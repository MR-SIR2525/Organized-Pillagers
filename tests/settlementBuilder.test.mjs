import test from "node:test";
import assert from "node:assert/strict";

import {
    createInitialSettlementBuildPlan,
    createGovernorRowHouseStructurePlan,
    createPlayerFacingTestLayout,
    resolveTestLayoutOrigin,
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
        block.x === 81 && block.y === 70 && block.z === -181 && block.typeId === "minecraft:stone"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 88 && block.y === 70 && block.z === -188 && block.typeId === "minecraft:grass_block"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 100 && block.y === 70 && block.z === -200 && block.typeId === "minecraft:grass_path"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 81 && block.y === 70 && block.z === -203 && block.typeId === "minecraft:gray_concrete"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 82 && block.y === 70 && block.z === -204 && block.typeId === "minecraft:grass_block"
    ));
    assert.ok(plan.placements.some((block) =>
        block.x === 81 && block.y === 84 && block.z === -203 && block.typeId === "minecraft:air"
    ));
    assert.equal(plan.placements.some((block) => block.typeId === "minecraft:wooden_door"), false);
});

test("createGovernorRowHouseStructurePlan keeps each house inside its lot and fronts the local central avenue", () => {
    const structures = createGovernorRowHouseStructurePlan(settlement);

    assert.deepEqual(structures, [
        { lotId: "W1", structureId: "house_long", location: { x: 89, y: 70, z: -250 }, rotation: "None" },
        { lotId: "W2", structureId: "house_long", location: { x: 89, y: 70, z: -233 }, rotation: "None" },
        { lotId: "W3", structureId: "house_long", location: { x: 89, y: 70, z: -216 }, rotation: "None" },
        { lotId: "E2", structureId: "house_long", location: { x: 104, y: 70, z: -233 }, rotation: "Rotate180" },
        { lotId: "E3", structureId: "house_long", location: { x: 104, y: 70, z: -216 }, rotation: "Rotate180" },
    ]);
});

test("createGovernorRowHouseStructurePlan rotates west and east lots toward opposite sides of Governor's Row", () => {
    const rotations = Object.fromEntries(
        ["north", "east", "south", "west"].map((orientation) => {
            const structures = createGovernorRowHouseStructurePlan({ ...settlement, orientation });
            return [orientation, {
                west: structures.find((structure) => structure.lotId === "W1").rotation,
                east: structures.find((structure) => structure.lotId === "E2").rotation,
            }];
        })
    );

    assert.deepEqual(rotations, {
        north: { west: "None", east: "Rotate180" },
        east: { west: "Rotate90", east: "Rotate270" },
        south: { west: "Rotate180", east: "None" },
        west: { west: "Rotate270", east: "Rotate90" },
    });
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
});

test("resolveTestLayoutOrigin lowers a player-relative layout by three quarters before flooring", () => {
    assert.deepEqual(
        resolveTestLayoutOrigin({ x: 40.9, y: 72, z: -18.1 }),
        { x: 40, y: 71, z: -19 }
    );
});

test("createPlayerFacingTestLayout adds a rotated low orientation marker above the road intersection", () => {
    const plan = createPlayerFacingTestLayout({ x: 40, y: 72, z: -18 }, "west");

    assert.deepEqual(plan.orientationMarker, {
        stone: { x: 40, y: 76, z: -18, typeId: "minecraft:stone" },
        sign: {
            x: 40,
            y: 77,
            z: -18,
            typeId: "minecraft:standing_sign",
            states: { "ground_sign_direction": 12 },
        },
        text: "West orientation",
    });
});
