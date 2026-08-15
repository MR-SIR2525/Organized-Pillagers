import test from "node:test";
import assert from "node:assert/strict";
import { registerSettlement } from "../Organized Pillagers behavior/scripts/settlementRegistry.js";

function createDynamicPropertyStore(initialProperties = {}) {
    const properties = new Map(Object.entries(initialProperties));
    return {
        getDynamicProperty(identifier) {
            return properties.get(identifier);
        },
        setDynamicProperty(identifier, value) {
            if (value === undefined) properties.delete(identifier);
            else properties.set(identifier, value);
        },
    };
}

test("registerSettlement stores the first record under its own property and links its founder", () => {
    const world = createDynamicPropertyStore();
    const founder = createDynamicPropertyStore();

    const settlement = registerSettlement(world, founder, {
        dimensionId: "minecraft:overworld",
        center: { x: 123, y: 70, z: -456 },
    });

    assert.deepEqual(settlement, {
        id: 1,
        dimensionId: "minecraft:overworld",
        center: { x: 123, y: 70, z: -456 },
    });
    assert.equal(founder.getDynamicProperty("op:settlementId"), 1);
    assert.equal(world.getDynamicProperty("op:settlementNextId"), 2);
    assert.deepEqual(JSON.parse(world.getDynamicProperty("op:settlement_1")), settlement);
    assert.equal(world.getDynamicProperty("op:settlements"), undefined);
});

test("registerSettlement returns the founder's existing settlement without creating a duplicate", () => {
    const existingSettlement = {
        id: 4,
        dimensionId: "minecraft:overworld",
        center: { x: 10, y: 71, z: 20 },
    };
    const world = createDynamicPropertyStore({
        "op:settlementNextId": 5,
        "op:settlement_4": JSON.stringify(existingSettlement),
    });
    const founder = createDynamicPropertyStore({ "op:settlementId": 4 });

    const settlement = registerSettlement(world, founder, {
        dimensionId: "minecraft:the_nether",
        center: { x: 999, y: 70, z: 999 },
    });

    assert.deepEqual(settlement, existingSettlement);
    assert.equal(world.getDynamicProperty("op:settlementNextId"), 5);
    assert.deepEqual(JSON.parse(world.getDynamicProperty("op:settlement_4")), existingSettlement);
    assert.equal(world.getDynamicProperty("op:settlement_5"), undefined);
});

test("registerSettlement allocates after the persisted next ID", () => {
    const world = createDynamicPropertyStore({ "op:settlementNextId": 8 });
    const founder = createDynamicPropertyStore();

    const settlement = registerSettlement(world, founder, {
        dimensionId: "minecraft:the_end",
        center: { x: -1, y: 80, z: 2 },
    });

    assert.equal(settlement.id, 8);
    assert.equal(world.getDynamicProperty("op:settlementNextId"), 9);
    assert.deepEqual(JSON.parse(world.getDynamicProperty("op:settlement_8")), settlement);
});

test("registerSettlement rejects a center that is not on the integer block grid", () => {
    const world = createDynamicPropertyStore();
    const founder = createDynamicPropertyStore();

    assert.throws(() => registerSettlement(world, founder, {
        dimensionId: "minecraft:overworld",
        center: { x: 127.482, y: 68, z: -349.791 },
    }), /integer block coordinates/);
    assert.equal(world.getDynamicProperty("op:settlement_1"), undefined);
    assert.equal(founder.getDynamicProperty("op:settlementId"), undefined);
});

test("registerSettlement rejects a missing dimension ID", () => {
    const world = createDynamicPropertyStore();
    const founder = createDynamicPropertyStore();

    assert.throws(() => registerSettlement(world, founder, {
        dimensionId: "",
        center: { x: 1, y: 70, z: 1 },
    }), /dimension ID/);
});

test("registerSettlement refuses to overwrite an existing record at the next ID", () => {
    const world = createDynamicPropertyStore({
        "op:settlementNextId": 3,
        "op:settlement_3": JSON.stringify({
            id: 3,
            dimensionId: "minecraft:overworld",
            center: { x: 0, y: 70, z: 0 },
        }),
    });
    const founder = createDynamicPropertyStore();

    assert.throws(() => registerSettlement(world, founder, {
        dimensionId: "minecraft:overworld",
        center: { x: 1, y: 70, z: 1 },
    }), /already exists/);
    assert.equal(founder.getDynamicProperty("op:settlementId"), undefined);
});
