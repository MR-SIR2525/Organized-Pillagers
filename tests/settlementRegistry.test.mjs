import test from "node:test";
import assert from "node:assert/strict";
import {
    assignSettlementMembership,
    deactivateSettlement,
    deleteSettlement,
    getSettlement,
    registerSettlement,
} from "../Organized Pillagers behavior/scripts/settlementRegistry.js";

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
        orientation: "west",
    });

    assert.deepEqual(settlement, {
        id: 1,
        dimensionId: "minecraft:overworld",
        center: { x: 123, y: 70, z: -456 },
        orientation: "west",
        active: true,
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
        orientation: "north",
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
        orientation: "east",
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
        orientation: "north",
    }), /already exists/);
    assert.equal(founder.getDynamicProperty("op:settlementId"), undefined);
});

test("deactivateSettlement preserves the record and allows membership to continue", () => {
    const settlement = {
        id: 3,
        dimensionId: "minecraft:overworld",
        center: { x: 10, y: 71, z: 20 },
        orientation: "north",
        active: true,
    };
    const world = createDynamicPropertyStore({
        "op:settlement_3": JSON.stringify(settlement),
    });
    const survivor = createDynamicPropertyStore();

    const deactivated = deactivateSettlement(world, 3);

    assert.deepEqual(deactivated, { ...settlement, active: false });
    assert.deepEqual(getSettlement(world, 3), { ...settlement, active: false });
    assert.deepEqual(assignSettlementMembership(world, survivor, 3), { ...settlement, active: false });
    assert.equal(survivor.getDynamicProperty("op:settlementId"), 3);
    assert.throws(
        () => assignSettlementMembership(world, createDynamicPropertyStore(), 4),
        /does not exist/
    );
});

test("deleteSettlement removes one record without reusing its ID and clears its founder link", () => {
    const settlement = {
        id: 2,
        dimensionId: "minecraft:overworld",
        center: { x: 10, y: 71, z: 20 },
    };
    const world = createDynamicPropertyStore({
        "op:settlementNextId": 3,
        "op:settlement_2": JSON.stringify(settlement),
    });
    const founder = createDynamicPropertyStore({ "op:settlementId": 2 });

    const deletedSettlement = deleteSettlement(world, 2, founder);

    assert.deepEqual(deletedSettlement, settlement);
    assert.equal(world.getDynamicProperty("op:settlement_2"), undefined);
    assert.equal(world.getDynamicProperty("op:settlementNextId"), 3);
    assert.equal(founder.getDynamicProperty("op:settlementId"), undefined);
});

test("deleteSettlement leaves an unrelated founder link unchanged when the record is absent", () => {
    const world = createDynamicPropertyStore({ "op:settlementNextId": 3 });
    const founder = createDynamicPropertyStore({ "op:settlementId": 2 });

    const deletedSettlement = deleteSettlement(world, 1, founder);

    assert.equal(deletedSettlement, undefined);
    assert.equal(world.getDynamicProperty("op:settlementNextId"), 3);
    assert.equal(founder.getDynamicProperty("op:settlementId"), 2);
});

test("assignSettlementMembership validates the world record and refuses to silently rehome a member", () => {
    const settlementOne = {
        id: 1,
        dimensionId: "minecraft:overworld",
        center: { x: 10, y: 71, z: 20 },
    };
    const settlementTwo = {
        id: 2,
        dimensionId: "minecraft:the_nether",
        center: { x: -30, y: 64, z: 40 },
    };
    const world = createDynamicPropertyStore({
        "op:settlement_1": JSON.stringify(settlementOne),
        "op:settlement_2": JSON.stringify(settlementTwo),
    });
    const traveller = createDynamicPropertyStore();

    assert.deepEqual(getSettlement(world, 1), settlementOne);
    assert.deepEqual(assignSettlementMembership(world, traveller, 1), settlementOne);
    assert.equal(traveller.getDynamicProperty("op:settlementId"), 1);
    assert.deepEqual(assignSettlementMembership(world, traveller, 1), settlementOne);
    assert.throws(() => assignSettlementMembership(world, traveller, 2), /already belongs to settlement 1/);
    assert.throws(() => assignSettlementMembership(world, createDynamicPropertyStore(), 3), /does not exist/);
});
