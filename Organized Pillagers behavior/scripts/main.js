import { world, system, BlockComponentTypes, BlockPermutation } from "@minecraft/server";

import {
    assignSettlementMembership,
    deactivateSettlement,
    deleteSettlement,
    getSettlement,
    registerSettlement,
} from "./settlementRegistry.js";
import {
    createInitialSettlementBuildPlan,
    createOrientationTestGrid,
    createPlayerFacingTestLayout,
    createDoorSetblockCommand,
    splitBuildPlacements,
} from "./settlementBuilder.js";
import { createSettlementLayout } from "./settlementLayout.js";


// Syntax:  /scriptevent <namespace:id> [message]
system.afterEvents.scriptEventReceive.subscribe(async (event) => {
    const {
        id,           // returns string (wiki:test)
        initiator,    // returns the entity that initiated the NPC dialogue.
        message,      // returns string (Hello World)
        sourceBlock,  // returns Block
        sourceEntity, // returns Entity
        sourceType,   // returns MessageSourceType
    } = event;

    if (id === "op:find_spot_for_settlement" && sourceType === "Entity") {
        if (await find_spot_for_settlement(sourceEntity)) {
            // Settlement registration succeeded. The later construction executor hooks in here.
        }
    }
    else if (id === "op:join_nearby_settlement" && sourceType === "Entity") {
        joinNearbySettlement(sourceEntity);
    }
    else if (id === "op:manually_register_settlement" && sourceType === "Entity") {
        manuallyRegisterSettlement(sourceEntity);
    }
    else if (id === "op:test") {
        // Test commands use their action as the first message token; remaining tokens stay as payload.
        const [action, ...args] = message.split(" ");
        const payload = args.join(" ");

        switch (action) {
            case "getFacing":
                getFacing(sourceEntity);
                break;
            case "getYRot":
                print("§b" + sourceEntity.name + " facing " + sourceEntity.getRotation().y.toFixed(2));
                break;
            case "getBlock":
                getBlock(payload, sourceEntity);
                break;
            case "isFlatEnough":
                if (payload && sourceEntity) {
                    // Parse X, Y, Z coordinates
                    let coords = payload.split(" ");

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
                break;
            case "visualize":
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
                break;
            case "randomStrollToNewSpot":
                if (sourceEntity) {
                    randomStrollToNewSpot(sourceEntity);
                }
                else print("§cSourceEntity required.");
                break;
            case "deleteSettlement":
                deleteSettlementForTest(payload);
                break;
            case "deactivateSettlement":
                deactivateSettlementForTest(payload);
                break;
            case "previewSettlementLayout":
                previewSettlementLayout(sourceEntity);
                break;
            case "buildSettlementLayout":
                buildSettlementLayoutForTest(payload, sourceEntity);
                break;
            case "buildOrientationTestGrid":
                buildOrientationTestGridForTest(payload, sourceEntity);
                break;
            case "buildFacingTestLayout":
            case "buildTestLayout":     // friendly alias
                buildFacingTestLayoutForTest(payload, sourceEntity);
                break;
            default:
                print(`§cUnrecognized Organized Pillagers test action: §e"${action}"§f with payload: §e"${payload}"`);
        }
    }
    else {
        print(`§cUnrecognized Organized Pillagers event: §e"${id}"§f with message: §e"${message}"`);
    }
},
{
    namespaces: ["op"]
});


const settlementSearches = new Set();
const SETTLEMENT_ARRIVAL_RADIUS = 12;

/**
 * Joins a travelling persistent pillager to the nearest valid settlement member at arrival.
 *
 * Entity JSON can see that a settled pillager is nearby, but cannot read that sponsor's dynamic
 * properties. The script resolves the sponsor's authoritative settlement ID first, then writes
 * the same ID to the traveller before the JSON event adds its settled-pillager family.
 */
function joinNearbySettlement(traveller) {
    if (!isUsableEntity(traveller)) return false;

    const origin = traveller.location;
    const candidates = traveller.dimension.getEntities({
        families: ["settled_pillager"],
        location: origin,
        maxDistance: SETTLEMENT_ARRIVAL_RADIUS,
    });

    // Query ordering is not a membership rule. Sort explicitly so the closest valid sponsor wins.
    candidates.sort((left, right) => {
        const leftLocation = left.location;
        const rightLocation = right.location;
        return Math.hypot(leftLocation.x - origin.x, leftLocation.z - origin.z)
            - Math.hypot(rightLocation.x - origin.x, rightLocation.z - origin.z);
    });

    for (const sponsor of candidates) {
        try {
            const settlementId = sponsor.getDynamicProperty("op:settlementId");
            if (!Number.isInteger(settlementId)) continue;

            const settlement = assignSettlementMembership(world, traveller, settlementId);
            traveller.triggerEvent("joined_nearby_settlement");

            print("§a" + (traveller.name || traveller.typeId) + " joined settlement #"
                + settlement.id + " near " + (sponsor.name || sponsor.typeId) + ".");
            return true;
        } catch (error) {
            // An invalid/stale sponsor must not turn the traveller into a settled pillager.
            print("§eCould not join nearby settlement: " + error);
        }
    }

    print("§eNo valid nearby settlement member was available to join.");
    return false;
}

/* ************ The main driver function ************ */
async function find_spot_for_settlement(sourceEntity) {
    if (!isUsableEntity(sourceEntity)) return false;
    if (settlementSearches.has(sourceEntity.id)) return false;

    settlementSearches.add(sourceEntity.id);

    try {
        // Get name/identifier for printouts.
        const name = sourceEntity.name || sourceEntity.typeId;
        print("...");   // For debug readability.

        // Start checking around the founder's current block position.
        const x = Math.round(sourceEntity.location.x);
        const y = Math.round(sourceEntity.location.y);
        const z = Math.round(sourceEntity.location.z);
        const dimension = sourceEntity.dimension;

        let good_spot = await is_suitable_area(dimension, x, y, z, name);
        let attempts = 0;

        while (!good_spot && attempts < 10) {
            print("§e" + name + " did not find a suitable area. Attempt stroll away from it.");

            const didFinishStroll = await randomStrollToNewSpot(sourceEntity, x, y, z);
            if (!didFinishStroll) {
                // A false result means the founder became invalid or the stroll timed out.
                if (isUsableEntity(sourceEntity)) {
                    restore_default_random_stroll(sourceEntity);
                }
                return false;
            }

            if (await strolledFarEnough(sourceEntity, x, y, z)) {
                const current = sourceEntity.location;
                const currentDimension = sourceEntity.dimension;

                if (await is_suitable_area(
                    currentDimension,
                    current.x,
                    current.y,
                    current.z,
                    name
                )) {
                    good_spot = true;
                    break;
                }
            }
            else {
                print("§e" + name + " did not stroll far enough. Try again.");
            }

            attempts += 1;
            print("§eAttempt " + attempts);
        }
        restore_default_random_stroll(sourceEntity);

        if (!good_spot) {
            print("§c" + name + " could not find a suitable area within 10 attempts.");
            return false;
        }

        // We have a good spot!
        // The rounded, approved search position is the permanent settlement center.
        const center = {
            x: Math.round(sourceEntity.location.x),
            y: Math.round(sourceEntity.location.y),
            z: Math.round(sourceEntity.location.z),
        };
        // The governor's facing becomes the settlement's permanent local-north direction.
        const orientation = get_cardinal_direction(sourceEntity.getRotation().y);
        const settlement = registerSettlement(world, sourceEntity, {
            dimensionId: sourceEntity.dimension.id,
            center,
            orientation,
        });

        // Keep the existing entity properties during the transition to the registry.
        sourceEntity.setProperty("var:x", center.x);
        sourceEntity.setProperty("var:y", center.y);
        sourceEntity.setProperty("var:z", center.z);
        print("§a" + name + " registered settlement #" + settlement.id + " at "
            + center.x + " " + center.y + " " + center.z + ".");

        return true;
    } finally {
        // Always release the in-memory guard, including after failures or thrown errors.
        settlementSearches.delete(sourceEntity.id);
    }
}

// Intended for testing and debugging.
// Registers a settlement at the source entity's current location without any suitability checks.
function manuallyRegisterSettlement(sourceEntity) {
    if (!isUsableEntity(sourceEntity)) return false;
    const name = sourceEntity.name || sourceEntity.typeId;

    try {
        const center = {
            x: Math.round(sourceEntity.location.x),
            y: Math.round(sourceEntity.location.y),
            z: Math.round(sourceEntity.location.z),
        };
        // Manual registration follows the same orientation rule as normal settlement founding.
        const orientation = get_cardinal_direction(sourceEntity.getRotation().y);
        const settlement = registerSettlement(world, sourceEntity, {
            dimensionId: sourceEntity.dimension.id,
            center,
            orientation,
        });

        // Keep the existing entity properties during the transition to the registry.
        sourceEntity.setProperty("var:x", center.x);
        sourceEntity.setProperty("var:y", center.y);
        sourceEntity.setProperty("var:z", center.z);
        // Mark this entity as the founder only after the registry record and its ID link exist.
        sourceEntity.triggerEvent("manually_registered_settlement");
        print("§a" + name + " registered settlement #" + settlement.id + " at "
            + center.x + " " + center.y + " " + center.z + ".");

        return true;
    }
    catch (error) {
        print("§cFailed to manually register settlement: " + error);
    }
    return false;
}


function isUsableEntity(entity) {
    const usable = entity?.isValid === true;
    if (!usable) {
        try {
            print("§c!! Source entity unusable. Cannot execute random stroll.");
        } catch (e) {
            // ignore printing errors
        }
    }
    return usable;
}


async function is_suitable_area(dimension, x, y, z, name="{name unset}") {
    const radius = 48;
    const height = 10;
    const depth = 6;
    
    // Step 1: Check for "Man-Made" Blocks
    let fContainsNoGoBlocks = containsNoGoBlocks(dimension, x, y, z, radius, height, depth)
    if (fContainsNoGoBlocks) {
        print("§e" + name + " §cfound man-made blocks in the area. Unsuitable for settlement.");
        return false;
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
            return false;
        }
        else {
            print("§aArea is flat enough. Suitable for settlement.");
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
        "minecraft:dark_oak_door", "minecraft:jungle_door", "minecraft:wooden_door", "minecraft:spruce_door",
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
        if (successPercentage !== -1) 
            print("§cError: Invalid successPercentage " + successPercentage + ". Must be between 0.0 and 1.0. Using 0.70 instead.");
        successPercentage = 0.70;
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

/*
 * Returns true if the pillager moved far enough from the starting location, false otherwise.
*/
async function randomStrollToNewSpot(sourceEntity, x, y, z) {
    // Note: pillager will keep periodically randomly strolling until default stroll behavior restored.
    // Starting location is passed as x, y, z.
    print("§bRunning randomStrollToNewSpot()"); //debug msg

    if (!isUsableEntity(sourceEntity)) return false;

    // Remove and re-add random stroll to prompt new random stroll.
    sourceEntity.triggerEvent("remove_random_stroll");
    await system.waitTicks(20);
    if (!isUsableEntity(sourceEntity)) return false;

    sourceEntity.triggerEvent("random_stroll");

    // Wait for pillager to execute random stroll
    let waitTime = 180;  // 9 seconds in ticks
    let loopCycles = 0;
    await system.waitTicks(waitTime);

    while (loopCycles < 10) {
        if (!isUsableEntity(sourceEntity)) return false;

        if (sourceEntity.getProperty("var:finished_random_stroll") === true) {
            print("§bRandom stroll ended; Out of while loop.");
            return true;
        }

        loopCycles++;
        print("§bWaiting for random stroll to end... (" + loopCycles + "/10)");
        await system.waitTicks(waitTime);
    }

    if (!isUsableEntity(sourceEntity)) return false;
    print("§eRandom stroll timed out.");
    return false;
}


function restore_default_random_stroll(sourceEntity) {
    sourceEntity.triggerEvent("restore_default_random_stroll");
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


/* ******************* Utilities ******************* */

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


/**
 * Marks a settlement inactive through the testing command namespace, then returns every loaded
 * persistent member to its settlement center for temporary test-world handling.
 */
function deactivateSettlementForTest(payload) {
    const settlementId = Number(payload);
    if (!Number.isInteger(settlementId) || settlementId < 1) {
        print("§cUsage: op:test deactivateSettlement <positive settlement ID>.");
        return false;
    }

    try {
        const settlement = deactivateSettlement(world, settlementId);
        if (settlement === undefined) {
            print("§eSettlement #" + settlementId + " does not exist.");
            return false;
        }

        const movedCount = moveLoadedMembersToInactiveSettlement(settlement);
        print("§aDeactivated settlement #" + settlementId + " and moved " + movedCount
            + " loaded persistent pillager(s) to its center.");
        return true;
    }
    catch (error) {
        print("§cCould not deactivate settlement #" + settlementId + ": " + error);
        return false;
    }
}

function getLoadedSettlementMembers(settlementId) {
    const dimensionIds = ["overworld", "nether", "the_end"];
    const members = [];

    for (const dimensionId of dimensionIds) {
        const dimension = world.getDimension(dimensionId);
        for (const member of dimension.getEntities({ type: "op:persistent_pillager" })) {
            if (!member.isValid) continue;
            if (member.getDynamicProperty("op:settlementId") === settlementId) {
                members.push(member);
            }
        }
    }

    return members;
}

/**
 * Temporary inactive-settlement policy: keep membership intact, teleport loaded members to the
 * stored center plus the requested X+5/Y+1 offset, then leave them otherwise unchanged.
 */
function moveLoadedMembersToInactiveSettlement(settlement) {
    const targetDimension = world.getDimension(settlement.dimensionId.replace("minecraft:", ""));
    const targetLocation = {
        x: settlement.center.x + 5,
        y: settlement.center.y + 1,
        z: settlement.center.z,
    };
    let movedCount = 0;

    for (const member of getLoadedSettlementMembers(settlement.id)) {
        try {
            member.teleport(targetLocation, { dimension: targetDimension });
            movedCount += 1;
        }
        catch (error) {
            print("§eCould not move a member of inactive settlement #" + settlement.id + ": " + error);
        }
    }

    return movedCount;
}

/**
 * Releases loaded members of a deleted settlement only after the registry record is gone.
 */
function releaseLoadedDeletedSettlementMembers(members) {
    for (const member of members) {
        member.setDynamicProperty("op:settlementId", undefined);
    }
    for (const member of members) {
        member.triggerEvent("release_from_deleted_settlement");
    }

    return members.length;
}

/**
 * Deletes one registry record through the testing command namespace.
 * This action intentionally has no entity-source dependency: it releases every loaded matching
 * member itself after deleting the world record.
 */
function deleteSettlementForTest(payload) {
    const settlementId = Number(payload);
    if (!Number.isInteger(settlementId) || settlementId < 1) {
        print("§cUsage: op:test deleteSettlement <positive settlement ID>.");
        return false;
    }

    try {
        // Capture loaded members before deletion, then release all of them after the record is gone.
        const members = getLoadedSettlementMembers(settlementId);
        const deletedSettlement = deleteSettlement(world, settlementId);
        if (deletedSettlement === undefined) {
            print("§eSettlement #" + settlementId + " does not exist.");
            return false;
        }

        const releasedCount = releaseLoadedDeletedSettlementMembers(members);
        print("§aDeleted settlement #" + settlementId + " and released " + releasedCount
            + " loaded persistent pillager(s) to search again.");
        return true;
    }
    catch (error) {
        print("§cCould not delete settlement #" + settlementId + ": " + error);
        return false;
    }
}

const PROTECTED_BUILD_BLOCKS = new Set([
    "minecraft:end_portal_frame",
    "minecraft:end_portal",
    "minecraft:nether_portal",
    "minecraft:obsidian",
    "minecraft:crying_obsidian",
]);

function parseForceFlag(value) {
    if (value === undefined || value === "" || value === "false") return false;
    if (value === "true") return true;
    throw new Error("Force must be true or false.");
}

function findBuildBlocker(dimension, placements) {
    for (const placement of placements) {
        const existing = dimension.getBlock(placement);
        if (existing === undefined) {
            return { placement, reason: "target block is outside a loaded chunk" };
        }
        if (PROTECTED_BUILD_BLOCKS.has(existing.typeId) || existing.getComponent(BlockComponentTypes.Inventory) !== undefined) {
            return { placement, reason: "protected block " + existing.typeId };
        }
    }
    return undefined;
}

/**
 * Places a precomputed plan only after blacklist preflight unless the explicit force flag is true.
 * Force bypasses overwrite protection, not record validation or the destination dimension.
 */
function placeBuildPlan(dimension, placements, force) {
    if (!force) {
        const blocker = findBuildBlocker(dimension, placements);
        if (blocker !== undefined) {
            throw new Error("Refused to overwrite " + blocker.reason + " at "
                + blocker.placement.x + " " + blocker.placement.y + " " + blocker.placement.z
                + ". Re-run with true to force placement.");
        }
    }

    const { structure, doors } = splitBuildPlacements(placements);

    // First pass: put every normal block in its final state, including each doorway's upper air block.
    for (const placement of structure) {
        if (placement.states === undefined) {
            dimension.setBlockType(placement, placement.typeId);
        }
        else {
            const target = dimension.getBlock(placement);
            if (target === undefined) {
                throw new Error("Target block became unavailable during placement at "
                    + placement.x + " " + placement.y + " " + placement.z + ".");
            }
            target.setPermutation(BlockPermutation.resolve(placement.typeId, placement.states));
        }
    }

    // Second pass: let vanilla command handling create every multi-block door after construction.
    for (const door of doors) {
        const direction = door.states["minecraft:cardinal_direction"];
        dimension.runCommand(createDoorSetblockCommand(door, direction));
    }
}

function parseSettlementBuildRequest(payload, sourceEntity) {
    const args = payload.trim().split(/\s+/).filter(Boolean);
    const sourceSettlementId = isUsableEntity(sourceEntity)
        ? sourceEntity.getDynamicProperty("op:settlementId")
        : undefined;
    let settlementId;
    let forceArgument;

    if (Number.isInteger(sourceSettlementId) && (args.length === 0 || args[0] === "true" || args[0] === "false")) {
        settlementId = sourceSettlementId;
        forceArgument = args[0];
    }
    else {
        settlementId = Number(args[0]);
        forceArgument = args[1];
    }
    if (!Number.isInteger(settlementId) || settlementId < 1) {
        throw new Error("Usage: buildSettlementLayout [true|false] as a member, or buildSettlementLayout <settlement ID> [true|false].");
    }
    return { settlementId, force: parseForceFlag(forceArgument) };
}

/**
 * Lets either a settlement member or a player build an existing record. Player invocation supplies
 * the ID explicitly; a member may omit it and use its own durable membership reference.
 */
function buildSettlementLayoutForTest(payload, sourceEntity) {
    try {
        const { settlementId, force } = parseSettlementBuildRequest(payload, sourceEntity);
        const settlement = getSettlement(world, settlementId);
        if (settlement === undefined) throw new Error("Settlement " + settlementId + " does not exist.");

        const dimension = world.getDimension(settlement.dimensionId.replace("minecraft:", ""));
        const plan = createInitialSettlementBuildPlan(settlement);
        placeBuildPlan(dimension, plan.placements, force);
        print("§aBuilt settlement #" + settlementId + " (" + plan.orientation + ", force=" + force + ").");
        return true;
    }
    catch (error) {
        print("§cCould not build settlement layout: " + error);
        return false;
    }
}

/**
 * Player-only single-layout test, oriented from the player's current cardinal facing.
 */
function buildFacingTestLayoutForTest(payload, sourceEntity) {
    if (!isUsableEntity(sourceEntity) || sourceEntity.typeId !== "minecraft:player") {
        print("§cbuildFacingTestLayout must be invoked directly by a player.");
        return false;
    }

    try {
        const force = parseForceFlag(payload.trim());
        const origin = {
            x: Math.floor(sourceEntity.location.x),
            y: Math.floor(sourceEntity.location.y),
            z: Math.floor(sourceEntity.location.z),
        };
        const orientation = get_cardinal_direction(sourceEntity.getRotation().y);
        const plan = createPlayerFacingTestLayout(origin, orientation);
        placeBuildPlan(sourceEntity.dimension, plan.placements, force);
        print("§aBuilt one " + orientation + "-facing test layout (force=" + force + ").");
        return true;
    }
    catch (error) {
        print("§cCould not build facing test layout: " + error);
        return false;
    }
}

/**
 * Player-only visual test: produces north/east/south/west variants in a facing-relative 2×2 grid.
 */
function buildOrientationTestGridForTest(payload, sourceEntity) {
    if (!isUsableEntity(sourceEntity) || sourceEntity.typeId !== "minecraft:player") {
        print("§cbuildOrientationTestGrid must be invoked directly by a player.");
        return false;
    }

    try {
        const force = parseForceFlag(payload.trim());
        const origin = {
            x: Math.floor(sourceEntity.location.x),
            y: Math.floor(sourceEntity.location.y),
            z: Math.floor(sourceEntity.location.z),
        };
        const playerFacing = get_cardinal_direction(sourceEntity.getRotation().y);
        const variants = createOrientationTestGrid(origin, playerFacing);
        const allPlacements = [];
        for (const [index, variant] of variants.entries()) {
            const plan = createInitialSettlementBuildPlan({
                id: index + 1,
                dimensionId: sourceEntity.dimension.id,
                center: variant.center,
                orientation: variant.orientation,
            });
            allPlacements.push(...plan.placements, variant.labelMarker.stone, variant.labelMarker.sign);
        }
        placeBuildPlan(sourceEntity.dimension, allPlacements, force);

        for (const variant of variants) {
            const sign = sourceEntity.dimension.getBlock(variant.labelMarker.sign);
            sign?.getComponent(BlockComponentTypes.Sign)?.setText(variant.label + " orientation");
        }
        print("§aBuilt four orientation test layouts (force=" + force + ").");
        return true;
    }
    catch (error) {
        print("§cCould not build orientation test grid: " + error);
        return false;
    }
}

/**
 * Resolves and reports the deterministic initial layout for an existing governor's settlement.
 * This is deliberately a no-world-write preview: it lets a test governor verify its center,
 * orientation, town square, and reserved palace lot before a build executor is introduced.
 */
function previewSettlementLayout(sourceEntity) {
    if (!isUsableEntity(sourceEntity)) return false;

    const settlementId = sourceEntity.getDynamicProperty("op:settlementId");
    if (!Number.isInteger(settlementId)) {
        print("§cSource entity has no valid op:settlementId.");
        return false;
    }

    try {
        const settlement = getSettlement(world, settlementId);
        if (settlement === undefined) {
            print("§cSettlement #" + settlementId + " does not exist.");
            return false;
        }

        // Older records predate orientation persistence, so use the governor's current facing only
        // for this preview. Newly registered settlements use their persisted orientation instead.
        const orientation = settlement.orientation ?? get_cardinal_direction(sourceEntity.getRotation().y);
        const layout = createSettlementLayout(settlement, orientation);
        const { center } = layout;
        const { localBounds: squareBounds } = layout.townSquare;
        const { localBounds: lotBounds, frontageCenter } = layout.governorLot;

        print("§aSettlement #" + settlementId + " layout preview (" + layout.orientation + "):"
            + " square " + (squareBounds.maxU - squareBounds.minU + 1) + "x"
            + (squareBounds.maxV - squareBounds.minV + 1) + " centered at "
            + center.x + " " + center.y + " " + center.z + ".");
        print("§aGovernor lot " + (lotBounds.maxU - lotBounds.minU + 1) + "x"
            + (lotBounds.maxV - lotBounds.minV + 1) + " begins at "
            + frontageCenter.x + " " + frontageCenter.y + " " + frontageCenter.z + ".");
        return true;
    }
    catch (error) {
        print("§cCould not preview settlement layout: " + error);
        return false;
    }
}