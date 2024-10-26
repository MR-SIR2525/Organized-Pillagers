import { world, system } from "@minecraft/server";

// /scriptevent wiki:test Hello World
system.afterEvents.scriptEventReceive.subscribe((event) => {
    const {
        id,           // returns string (wiki:test)
        initiator,    // returns the entity that initiated the NPC dialogue.
        message,      // returns string (Hello World)
        sourceBlock,  // returns Block
        sourceEntity, // returns Entity
        sourceType,   // returns MessageSourceType
    } = event;

    //what if I use the same id for all p_pillager commands and just change the message?
    if (id === "op:find_spot_for_settlement" && sourceType === "Entity") {
        find_spot_for_settlement(initiator, sourceBlock, sourceEntity, sourceType);
    }
    else if (id === "op:getFacing") {
        getFacing(sourceEntity);
    }
    else if (id === "op:getYRot") {
        world.sendMessage("§b" + sourceEntity.name + " facing " + sourceEntity.getRotation().y.toFixed(2));
    }
    else {
        world.sendMessage("§cUnrecognized event: §e\"" + id + "\"§f with message: §e\"" + message + "\"");
    }
});


function find_spot_for_settlement(initiator, sourceBlock, sourceEntity, sourceType) {
    // get name/identifier for printouts
    let name = sourceEntity.name || sourceEntity.typeId;
    
    // get location of sourceEntity
    let x = sourceEntity.location.x;
    let y = sourceEntity.location.y;
    let z = sourceEntity.location.z;
    let dimension = sourceEntity.dimension;


    //start checking around self for suitable area
    const radius = 16;
    
    // Step 1: Check for "Man-Made" Blocks
    if (containsNoGoBlocks(dimension, x, y, z, radius)) {
        world.sendMessage("§c" + name + " found man-made blocks in the area. Unsuitable for settlement.");
        return false;
    }

    // Step 2: Check Flatness
    if (!isFlatEnough(dimension, x, y, z, radius)) {
        world.sendMessage("§c" + name + " found the area too uneven. Unsuitable for settlement.");
        return false;
    }

    // Step 3: Check Forest Density
    if (!isBelowForestDensity(dimension, x, y, z, radius)) {
        world.sendMessage("§c" + name + " found the area too dense with trees. Unsuitable for settlement.");
        return false;
    }
}


function containsNoGoBlocks(dimension, x, y, z, radius) {
    const noGoBlocks = [
        "minecraft:acacia_planks", "minecraft:bamboo", "minecraft:birch_planks", "minecraft:crimson_planks",
        "minecraft:dark_oak_planks", "minecraft:jungle_planks", "minecraft:oak_planks", "minecraft:spruce_planks",
        "minecraft:warped_planks", "minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:stonebrick",
        "minecraft:smooth_stone", "minecraft:deepslate", "minecraft:cobbled_deepslate", "minecraft:glass",
        "minecraft:glass_pane", "minecraft:stained_glass", "minecraft:stained_glass_pane", "minecraft:tinted_glass",
        "minecraft:hard_glass", "minecraft:hard_glass_pane", "minecraft:wooden_door", "minecraft:iron_door",
        "minecraft:bamboo_door", "minecraft:copper_door", "minecraft:chest", "minecraft:ender_chest",
        "shulker_box", "barrel", "minecraft:bed", "minecraft:crafting_table",
        "minecraft:anvil", "minecraft:composter", "mrsir:farmer_guide_stone", "minecraft:furnace",
        "minecraft:blast_furnace", "minecraft:smoker", "minecraft:grindstone", "minecraft:lectern",
        "minecraft:cauldron", "minecraft:brewing_stand", "minecraft:smithing_table", "minecraft:cartography_table",
        "minecraft:loom", "minecraft:stonecutter", "minecraft:stonecutter_block", "minecraft:enchanting_table",
        "minecraft:beacon", "minecraft:obsidian", "minecraft:iron_block", "minecraft:gold_block"
    ];
    
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const block = dimension.getBlock({ x: x + dx, y: y, z: z + dz });
            if (noGoBlocks.includes(block.id)) {
                return true;  // No-go block found
            }
        }
    }
    return false;
}

function isFlatEnough(dimension, x, y, z, radius) {
    let minY = y;
    let maxY = y;

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            const currentBlock = dimension.getBlock({ x: x + dx, y: y, z: z + dz });
            const blockY = currentBlock.location.y;
            minY = Math.min(minY, blockY);
            maxY = Math.max(maxY, blockY);
        }
    }

    return (maxY - minY) <= 3;  // Example threshold of 3 blocks for "flatness"
}

function isBelowForestDensity(dimension, x, y, z, radius) {
    const treeBlocks = ["minecraft:log", "minecraft:leaves", /* other tree blocks */];
    let totalBlocks = 0;
    let treeBlocksCount = 0;

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
            totalBlocks++;
            const block = dimension.getBlock({ x: x + dx, y: y, z: z + dz });
            if (treeBlocks.includes(block.id)) {
                treeBlocksCount++;
            }
        }
    }

    const forestDensity = (treeBlocksCount / totalBlocks) * 100;
    return forestDensity < 30;  // Example threshold for forest density
}





function getFacing(sourceEntity) {
    let name = sourceEntity.name || sourceEntity.typeId;
    //get rotation to determine North, South, East, or West
        // Issue: Non-player entities don't update until entity intends to move that direction.
    let rotation = sourceEntity.getRotation();
    let direction = get_cardinal_direction(rotation.y);
    world.sendMessage("§b" + name + " is facing " + direction);
}

/*  @Returns: String "north", "south", "west", or "east
    @Params: float rot_y
    
    Issue: Non-player entities don't update until entity intends to move that direction.
*/
function get_cardinal_direction(rot_y) {
    //using rotation.y
    // 0 = South, 
    // 90 = West, 
    // -180 = North
    // 179.99 = North
    // -90 = East
    if ((rot_y > 135 && rot_y <= 180) || (rot_y < -135 && rot_y >= -180)) {
        return "north";
    }
    else if (rot_y < 45 && rot_y > -45) {
        return "south";
    }
    else if (rot_y >= 45 && rot_y <= 135) {
        return "west";
    }
    else {
        return "east";
    }
}