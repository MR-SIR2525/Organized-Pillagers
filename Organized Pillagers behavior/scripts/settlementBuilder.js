import { world } from "@minecraft/server";

export function placeSettlementMarker(dimension, x, y, z) {
    world.sendMessage("§ePlacing marker at " + x + ", " + y + ", " + z);
    dimension.setBlockType({ x, y, z }, "minecraft:beacon");
}