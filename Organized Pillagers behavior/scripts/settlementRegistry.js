/*
 * Settlement registry persistence
 * -------------------------------
 * Each settlement is stored in its own world dynamic property. Keeping records separate means
 * future systems can read or update one settlement without parsing and rewriting every town in
 * the world. The registry deliberately stores only the permanent spatial identity at this stage;
 * it does not define activity, a marker, roads, buildings, or palace state.
 */

// Stores the next monotonically increasing numeric ID to allocate to a new settlement.
const NEXT_SETTLEMENT_ID_PROPERTY = "op:settlementNextId";

/*
 * This entity property is only a convenience link from the current founder to its settlement.
 * The world record remains authoritative because the founder can die, transform, or unload while
 * its settlement center must remain available to future layout systems.
 */
const FOUNDER_SETTLEMENT_ID_PROPERTY = "op:settlementId";

/**
 * Builds a dynamic-property key with one normal Minecraft namespace separator.
 *
 * The key name is intentionally `op:settlement_<id>` rather than a second-colon format such as
 * `op:settlement:<id>`. The latter is not a conventional Minecraft namespaced identifier, while
 * the underscore form is unambiguous and allows each settlement record to be addressed directly.
 */
function getSettlementPropertyId(id) {
    return `op:settlement_${id}`;
}

/**
 * Reads one settlement record, or returns undefined when that ID has not been registered.
 *
 * Corrupt or incorrectly typed records fail loudly instead of being overwritten. That protects
 * a settlement's permanent center from being silently replaced by a new record.
 */
function loadSettlement(world, id) {
    const serializedSettlement = world.getDynamicProperty(getSettlementPropertyId(id));
    if (serializedSettlement === undefined) return undefined;

    if (typeof serializedSettlement !== "string") {
        throw new Error(`Settlement ${id} has an invalid stored type.`);
    }

    const settlement = JSON.parse(serializedSettlement);
    if (settlement === null || Array.isArray(settlement) || typeof settlement !== "object") {
        throw new Error(`Settlement ${id} has an invalid stored shape.`);
    }

    return settlement;
}

/**
 * Returns the ID reserved for the next settlement.
 *
 * IDs begin at one so an unset dynamic property is distinct from every valid settlement ID. The
 * counter is persisted after each registration, allowing later creations to continue across world
 * reloads without scanning all existing records.
 */
function getNextSettlementId(world) {
    const nextSettlementId = world.getDynamicProperty(NEXT_SETTLEMENT_ID_PROPERTY);
    if (nextSettlementId === undefined) return 1;

    if (!Number.isInteger(nextSettlementId) || nextSettlementId < 1) {
        throw new Error("Next settlement ID has an invalid stored value.");
    }

    return nextSettlementId;
}

/**
 * Rejects invalid spatial data before it can become a permanent settlement origin.
 *
 * The site-selection flow owns the rounding decision. The registry only accepts the resulting
 * integer block coordinate, avoiding a hidden normalization rule at the persistence boundary.
 */
function validateSettlementDetails(dimensionId, center) {
    if (typeof dimensionId !== "string" || dimensionId.trim().length === 0) {
        throw new Error("Settlement dimension ID must be a non-empty string.");
    }

    if (
        center === null ||
        typeof center !== "object" ||
        !Number.isInteger(center.x) ||
        !Number.isInteger(center.y) ||
        !Number.isInteger(center.z)
    ) {
        throw new Error("Settlement center must use integer block coordinates.");
    }
}

/**
 * Registers a settlement exactly once for a founder and returns its permanent record.
 *
 * @param {World} world The Bedrock world that owns durable settlement metadata.
 * @param {Entity} founder The persistent pillager that found the suitable location.
 * @param {{ dimensionId: string, center: { x: number, y: number, z: number } }} details
 * The dimension and integer block coordinates selected by the existing suitability search.
 * @returns {{ id: number, dimensionId: string, center: { x: number, y: number, z: number } }}
 * The existing or newly created settlement record.
 */
export function registerSettlement(world, founder, { dimensionId, center }) {
    validateSettlementDetails(dimensionId, center);

    const existingSettlementId = founder.getDynamicProperty(FOUNDER_SETTLEMENT_ID_PROPERTY);
    if (Number.isInteger(existingSettlementId)) {
        const existingSettlement = loadSettlement(world, existingSettlementId);
        // Repeated events preserve the original center instead of creating a duplicate settlement.
        if (existingSettlement !== undefined) return existingSettlement;

        // Do not silently allocate a new ID when stored entity and world data disagree.
        throw new Error(`Founder references missing settlement ${existingSettlementId}.`);
    }

    const id = getNextSettlementId(world);
    const propertyId = getSettlementPropertyId(id);
    // A collision can occur after an interrupted write; never overwrite that existing record.
    if (loadSettlement(world, id) !== undefined) {
        throw new Error(`Settlement record ${propertyId} already exists.`);
    }

    const settlement = {
        id,
        dimensionId,
        // Copy the validated integer values so callers cannot mutate the persisted origin object.
        center: { x: center.x, y: center.y, z: center.z },
    };

    // Write the record before linking the founder, so the link never points to a missing record.
    world.setDynamicProperty(propertyId, JSON.stringify(settlement));
    world.setDynamicProperty(NEXT_SETTLEMENT_ID_PROPERTY, id + 1);
    founder.setDynamicProperty(FOUNDER_SETTLEMENT_ID_PROPERTY, id);

    return settlement;
}

/**
 * Deletes one settlement record without changing the next-ID counter.
 *
 * Settlement IDs are never reused: leaving `op:settlementNextId` unchanged preserves stable
 * references in logs, saved entities, and any later system that records a historical ID. When
 * the optional founder entity is loaded and linked to this settlement, its convenience link is
 * cleared as part of the deletion. Callers without that entity can still delete the world record,
 * but must handle any unloaded or other stale entity links when those entities are encountered.
 *
 * @param {World} world The Bedrock world that owns the settlement record.
 * @param {number} settlementId The positive integer ID of the settlement to delete.
 * @param {Entity | undefined} founder Optional loaded founder entity to unlink if it matches.
 * @returns {object | undefined} The deleted record, or undefined when no such record exists.
 */
export function deleteSettlement(world, settlementId, founder = undefined) {
    if (!Number.isInteger(settlementId) || settlementId < 1) {
        throw new Error("Settlement ID must be a positive integer.");
    }

    const settlement = loadSettlement(world, settlementId);
    // Deletion is idempotent: a missing record does not alter unrelated world or entity state.
    if (settlement === undefined) return undefined;

    const propertyId = getSettlementPropertyId(settlementId);
    world.setDynamicProperty(propertyId, undefined);

    if (founder?.getDynamicProperty(FOUNDER_SETTLEMENT_ID_PROPERTY) === settlementId) {
        // Only clear the matching link; an entity linked to another settlement is left untouched.
        founder.setDynamicProperty(FOUNDER_SETTLEMENT_ID_PROPERTY, undefined);
    }

    return settlement;
}
