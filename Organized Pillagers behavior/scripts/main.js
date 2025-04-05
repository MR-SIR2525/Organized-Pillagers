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
        find_spot_for_settlement(sourceEntity);
    }
    else if (id === "op:getFacing") {
        getFacing(sourceEntity);
    }
    else if (id === "op:getYRot") {
        print("§b" + sourceEntity.name + " facing " + sourceEntity.getRotation().y.toFixed(2));
    }
    else if (id === "op:getBlock") {
        getBlock(message, sourceEntity);
    }
    else if (id === "op:isFlatEnough") {
        if (message && sourceEntity) {
            // Parse X, Y, Z coordinates
            let coords = message.split(" ");

            let x = (coords[0] === "~") ? Math.round(sourceEntity.location.x) : Number.parseFloat(coords[0]);
            let y = (coords[1] === "~") ? Math.round(sourceEntity.location.y) : Number.parseFloat(coords[1]);
            let z = (coords[2] === "~") ? Math.round(sourceEntity.location.z) : Number.parseFloat(coords[2]);

            let radius = Number.parseFloat(coords[3]);
            let threshold = Number.parseFloat(coords[4]);
            let successPercentage = Number.parseFloat(coords[5]);

            if (isFlatEnough(sourceEntity.dimension, x, y, z, radius, threshold, successPercentage)) {
                print("§aThe area " + radius + " blocks around point " + x + " " + y + " " + z + " is flat enough.");
            }
            else {
                print("§cThe area " + radius + " blocks around point " + x + " " + y + " " + z + " is not flat enough.");
            }
        }
    }
    else if (id === "op:visualize") {
        if (sourceEntity) {
            let x = sourceEntity.location.x;
            let y = sourceEntity.location.y;
            let z = sourceEntity.location.z;

            const radius = 48;
            const height = 10;
            const depth = 6;

            visualize(sourceEntity.dimension, x, y, z, radius, height, depth);
        }
        else print("§cSourceEntity required.");
    }
    else if (id === "op:randomStrollToNewSpot") {
        if (sourceEntity) {
            randomStrollToNewSpot(sourceEntity);
        }
        else print("§cSourceEntity required.");
    }
    else {
        print("§cUnrecognized event: §e\"" + id + "\"§f with message: §e\"" + message + "\"");
    }
});


async function find_spot_for_settlement(sourceEntity) {
    // get name/identifier for printouts
    const name = sourceEntity.name || sourceEntity.typeId;
    print("...");   //for debug readability
    
    // get location of sourceEntity
    const x = sourceEntity.location.x;
    const y = sourceEntity.location.y;
    const z = sourceEntity.location.z;
    const dimension = sourceEntity.dimension;


    //start checking around self for suitable area
    const radius = 48;
    const height = 10;
    const depth = 6;
    
    // Step 1: Check for "Man-Made" Blocks
    let fContainsNoGoBlocks = containsNoGoBlocks(dimension, x, y, z, radius, height, depth)
    if (fContainsNoGoBlocks) {
        print("§e" + name + " §cfound man-made blocks in the area. Unsuitable for settlement.");
        randomStrollToNewSpot(sourceEntity, x, y, z);
    }
    else {
        // Step 2: Check Flatness
        print("§a" + name + " found no man-made blocks in the area. Suitable for settlement.");
        print("Ready to check flatness...");
        await system.waitTicks(20);

        // -1 for any of these will use default values
        const flatnessRadius = 25;
        const threshold = 10;
        const successPercentage = 0.75;

        let fIsFlatEnough = isFlatEnough(dimension, x, y, z, flatnessRadius, threshold, successPercentage);
        if (!fIsFlatEnough) {
            print("§cArea is not flat enough. Unsuitable for settlement.");
            await system.waitTicks(20);
            randomStrollToNewSpot(sourceEntity, x, y, z);
        }
        else {
            print("§aArea is flat enough. Suitable for settlement.");
            await system.waitTicks(20);
            
            // building settlement (first thing) logic here
            return true;
        }
        
    }
    return false;
}


function containsNoGoBlocks(dimension, x, y, z, radius, height, depth) {
    // There's gotta be a way to use block types, i.e. "planks" for any type of wood planks... idk.
    // Set.has is O(1) on average (hashtable), compared to O(n) for Array.includes
    const noGoBlocks = new Set([
        // Planks
        "minecraft:acacia_planks", "minecraft:bamboo_planks", "minecraft:birch_planks", "minecraft:crimson_planks",
        "minecraft:dark_oak_planks", "minecraft:jungle_planks", "minecraft:oak_planks", "minecraft:spruce_planks",
        "minecraft:warped_planks",

        // Stone Variants
        "minecraft:cobblestone", "minecraft:cobbled_deepslate", "minecraft:smooth_stone", 
        "minecraft:stonebrick",

        // Concrete
        // white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black
        "minecraft:white_concrete", "minecraft:orange_concrete", "minecraft:magenta_concrete", 
        "minecraft:light_blue_concrete", "minecraft:yellow_concrete", "minecraft:lime_concrete", 
        "minecraft:pink_concrete", "minecraft:gray_concrete", "minecraft:light_gray_concrete",
        "minecraft:cyan_concrete", "minecraft:purple_concrete", "minecraft:blue_concrete", 
        "minecraft:brown_concrete", "minecraft:green_concrete", "minecraft:red_concrete", 
        "minecraft:black_concrete",

        // Concrete powders
        "minecraft:white_concrete_powder", "minecraft:orange_concrete_powder", "minecraft:magenta_concrete_powder",
        "minecraft:light_blue_concrete", "minecraft:yellow_concrete_powder", "minecraft:lime_concrete_powder",
        "minecraft:pink_concrete_powder", "minecraft:gray_concrete_powder", "minecraft:light_gray_concrete",
        "minecraft:cyan_concrete_powder", "minecraft:purple_concrete_powder", "minecraft:blue_concrete_powder",
        "minecraft:brown_concrete_powder", "minecraft:green_concrete_powder", "minecraft:red_concrete_powder",
        "minecraft:black_concrete_powder",

        // Glass Types
        "minecraft:glass", "minecraft:glass_pane", "minecraft:tinted_glass",
        "minecraft:white_stained_glass", "minecraft:orange_stained_glass", "minecraft:magenta_stained_glass",
        "minecraft:light_blue_stained_glass", "minecraft:yellow_stained_glass", "minecraft:lime_stained_glass",
        "minecraft:pink_stained_glass", "minecraft:gray_stained_glass", "minecraft:light_gray_stained_glass",
        "minecraft:cyan_stained_glass", "minecraft:purple_stained_glass", "minecraft:blue_stained_glass",
        "minecraft:brown_stained_glass", "minecraft:green_stained_glass", "minecraft:red_stained_glass",
        "minecraft:black_stained_glass",

        // Wooden Doors
        "minecraft:acacia_door", "minecraft:bamboo_door", "minecraft:birch_door", "minecraft:crimson_door",
        "minecraft:dark_oak_door", "minecraft:jungle_door", "minecraft:oak_door", "minecraft:spruce_door",
        "minecraft:warped_door",

        // Non-Wooden Doors
        "minecraft:copper_door", "minecraft:iron_door",

        // Storage
        "minecraft:barrel", "minecraft:chest", "minecraft:ender_chest", "minecraft:shulker_box",

        // Special Blocks
        "minecraft:anvil", "minecraft:bed", "minecraft:blast_furnace", "minecraft:brewing_stand",
        "minecraft:cartography_table", "minecraft:cauldron", "minecraft:composter", "minecraft:crafting_table",
        "minecraft:enchanting_table", "minecraft:furnace", "minecraft:grindstone", "minecraft:hopper",
        "minecraft:lectern", "minecraft:loom", "minecraft:smithing_table", "minecraft:smoker", "minecraft:stonecutter_block",

        // Other Blocks
        "minecraft:beacon", "minecraft:gold_block", "minecraft:iron_block", "minecraft:obsidian",
        "end_portal_frame",

        // Fences
        "minecraft:acacia_fence", "minecraft:bamboo_fence", "minecraft:birch_fence", "minecraft:crimson_fence",
        "minecraft:dark_oak_fence", "minecraft:jungle_fence", "minecraft:oak_fence", "minecraft:spruce_fence",
        "minecraft:warped_fence",

        // Walls
        "minecraft:andesite_wall", "minecraft:brick_wall", "minecraft:cobbled_deepslate_wall",
        "minecraft:cobblestone_wall", "minecraft:deepslate_brick_wall", "minecraft:deepslate_tile_wall", 
        "minecraft:diorite_wall", "minecraft:end_stone_brick_wall", "minecraft:mud_brick_wall", 
        "minecraft:nether_brick_wall", "minecraft:sandstone_wall", "minecraft:stone_brick_wall"
    ]);

    // for debug
    print("checking for manmade blocks around " + x.toFixed(2) + " " + y.toFixed(2) + " " + z.toFixed(2) + " using values");
    print("radius: " + radius);
    print("height: " + height);
    print("depth: " + depth);
    
    // Iterate top-down through each elevation level within the height and depth range
    for (let dy = height; dy >= -depth; dy--) {
        const currentY = y + dy;

        // Step size for scanning (can be adjusted for performance)
        const stepSize = 2;     //check every n blocks

        // Iterate through the area within the radius on the X and Z axes
        for (let dx = -radius; dx <= radius; dx += stepSize) {
            for (let dz = -radius; dz <= radius; dz += stepSize) {
                const block = dimension.getBlock({ x: x + dx, y: currentY, z: z + dz });

                // Check if the block is in the no-go list
                if (block && noGoBlocks.has(block.type.id)) {
                    return true;  // No-go block found in this slice
                }
            }
        }
    }

    // If no no-go block was found in any slice
    return false;
}


function isFlatEnough(dimension, x, y, z, radius=16, threshold=10, successPercentage=0.70) {
    // Default values and input validation
    if (radius < 1) 
        radius = 16;
    if (threshold < 1) {
        if (threshold === -1) 
            threshold = 10;
        else {
            threshold = 1;
            print("§cError: Invalid threshold " + threshold + ". Using 1 instead.");
        }
    }
    if (successPercentage < 0.0 || successPercentage > 1.0) {
        if (successPercentage === -1) 
            successPercentage = 0.70;
        else {
            successPercentage = 0.70;
            print("§cError: Invalid successPercentage " + successPercentage + ". Using 0.70 instead.");
        }
    }

    // for debug
    print("radius = " + radius);
    print("threshold = " + threshold);
    print("successPercentage = " + successPercentage);

    let flatBlockCount = 0;
    let totalBlockCount = 0;
    let deepDropsCount = 0;

    // Scan horizontally every stepSize blocks
    let stepSize = 2;
    for (let dx = -radius; dx <= radius; dx += stepSize) {
        for (let dz = -radius; dz <= radius; dz += stepSize) {
            // Start at y + 1
            let currentY = y + 1;
            let foundSolidBlock = false;

            // Scan downward until a non-air block is found or until threshold is reached
            for (let depth = 0; depth <= threshold; depth++) {
                const currentBlock = dimension.getBlock({ x: x + dx, y: currentY - depth, z: z + dz });

                // maybe consider adding && ... != "minecraft:water"?
                if (currentBlock && currentBlock.type.id !== "minecraft:air") {
                    const blockY = currentBlock.location.y;

                    // Count this block as a "flat" block if it meets the flatness threshold
                    totalBlockCount++;
                    if (Math.abs(blockY - y) <= threshold) {
                        flatBlockCount++;
                    }

                    foundSolidBlock = true;
                    break; // Exit the downward scanning once a solid block is found
                }
            }

            // If no solid block was found within the threshold, mark it as a deep drop-off
            if (!foundSolidBlock) {
                deepDropsCount++;
            }
        }
    }

    const deepDropRatio = deepDropsCount / totalBlockCount;
    const flatnessRatio = flatBlockCount / totalBlockCount;

    print("Deep drop ratio = " + deepDropRatio.toFixed(2));
    print("Flatness ratio = " + flatnessRatio.toFixed(2));

    // if any of these fail, return false
    return deepDropRatio < (1 - successPercentage) 
        && flatnessRatio >= successPercentage;
}


async function randomStrollToNewSpot(sourceEntity, x, y, z) {
    //debug msg
    print("§bRunning randomStrollToNewSpot()");
    // Note: the pillager will keep periodically randomly strolling until default stroll behavior restored.

    // Starting location is passed as x, y, z.
    sourceEntity.triggerEvent("restore_default_random_stroll");
    await system.waitTicks(1);
    sourceEntity.triggerEvent("random_stroll");

    // Wait for pillager to execute random stroll
    let waitTime = 180;  // 9 seconds in ticks
    let loopCycles = 0;
    await system.waitTicks(waitTime);
    while (sourceEntity.getProperty("var:finished_random_stroll") === false && loopCycles < 10) 
    {
        loopCycles++;
        print("§bWaiting for random stroll to end... (" + loopCycles + "/10)");
        await system.waitTicks(waitTime);
    }
    print("§bRandom stroll ended; Out of while loop.");

    // Check if the pillager moved far enough
    if (sourceEntity.getProperty("var:ended_random_stroll") === true) {
        print("§bvar:ended_random_stroll=true, checking distance moved...");
        
        if (await strolledFarEnough(sourceEntity, x, y, z)) {
            print("§b - Sufficient distance from unsuitable spot achieved.");
            // Perform your heavy scan here
        }
        else {
            print("§b - Not far enough from unsuitable spot.");
        }
    }

    // for debug
    restore_default_random_stroll(sourceEntity);
}


async function restore_default_random_stroll(sourceEntity) {
    sourceEntity.triggerEvent("restore_default_random_stroll");
    await system.waitTicks(1);
}


async function strolledFarEnough(sourceEntity, x, y, z) {
    // Get new location
    const newX = sourceEntity.location.x;
    const newY = sourceEntity.location.y;
    const newZ = sourceEntity.location.z;
    print(
        `§bNew location: x=${Math.round(newX)}, y=${Math.round(newY)}, z=${Math.round(newZ)}`);

    // Euclidean distance formula without the square root for less calculating.
    // !! Check pillager json file's "random_stroll" for correct distance !!
    const minDistanceSquared = 60 ** 2;
    const distanceSquared = 
        (newX - x) ** 2 +
        (newY - y) ** 2 +
        (newZ - z) ** 2;

    // Debug message
    print(`§bStraight-line distance moved: ${Math.round(Math.sqrt(distanceSquared))} blocks`);

    if (distanceSquared >= minDistanceSquared) {
        return true;
    }
    
    return false;
}

    
// unused at the moment
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


/* ********* Utilities ********* */

function print(message) {
    world.sendMessage(`§0Script: §f${message}`);
}


/* ********* Functions for testing things ********* */

function getBlock(message, sourceEntity) {
    if (message && sourceEntity) {
        // expecting format: """x y z"""
        let coords = message.split(" ");
        let x = Number.parseFloat(coords[0]);
        let y = Number.parseFloat(coords[1]);
        let z = Number.parseFloat(coords[2]);
        const dimension = sourceEntity.dimension;

        print("§bLocation to use: " + x + " " + y + " " + z);

        const block = dimension.getBlock({ x: x, y: y, z: z });
        if (block) {
            print("§bBlock is " + block.type.id + " at " + x + " " + y + " " + z);
        } else {
            print("§cUnable to get block. Verify coords are correct and in a loaded area.");
        }
    }
    else {
        print("§cNeed to specify coords to check in 'x y z' format. SourceEntity required.");
    }
}


function getFacing(sourceEntity) {
    let name = sourceEntity.name || sourceEntity.typeId;
    //get rotation to determine North, South, East, or West
        // Issue: Non-player entities don't update until entity intends to move that direction.
    let rotation = sourceEntity.getRotation();
    let direction = get_cardinal_direction(rotation.y);
    print("§b" + name + " is facing " + direction);
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

//for debug, visualizing the scan that no go blocks function does
function visualize(dimension, x, y, z, radius, height, depth) 
{
    print("§evisualize at " + x.toFixed(2) + " " + y.toFixed(2) + " " + z.toFixed(2) + " using values");
    print("radius: " + radius);
    print("height: " + height);
    print("depth: " + depth);
    
    // Iterate through each elevation level within the height and depth range
    for (let dy = height; dy >= -depth; dy--) {
        const currentY = y + dy;

        // Step size for scanning (can be adjusted for performance)
        const stepSize = 2;     //check every n blocks

        // Iterate through the area within the radius on the X and Z axes
        for (let dx = -radius; dx <= radius; dx += stepSize) {
            for (let dz = -radius; dz <= radius; dz += stepSize) {
                dimension.setBlockType({ x: x + dx, y: currentY, z: z + dz }, "minecraft:white_concrete");
            }
        }
    }

    print("Visualize function complete.");
}