import { world, system } from "@minecraft/server";

// world.afterEvents.playerBreakBlock.subscribe(function (data) {
//     world.sendMessage(data.player.name + " broke a block!");
// })

// /scriptevent <messageId: string> <message: string>
    // messageId in scriptevent command can be received in API via ScriptEventCommandMessageEvent.id
    // message in scriptevent command can be received in API via ScriptEventCommandMessageEvent.message

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
        find_spot_for_settlement(initiator, message, sourceBlock, sourceEntity, sourceType);
    }
    else if (id === "op:get_y_rot") {
        world.sendMessage("§b" + sourceEntity.name + " facing " + sourceEntity.getRotation().y.toFixed(2));
    }
    else
        world.sendMessage("§cUnrecognized event: §e\"" + id + "\"§f with message: §e\"" + message + "\"");
});


function find_spot_for_settlement(initiator, message, sourceBlock, sourceEntity, sourceType) {
    let name = "";
    if (sourceEntity.name) {
        name = sourceEntity.name;
    }
    else {
        name = sourceEntity.typeId;
    }
    
    // //get location of sourceEntity
    // let x = sourceEntity.location.x;
    // let y = sourceEntity.location.y;
    // let z = sourceEntity.location.z;

    // //print for debug
    // world.sendMessage("§bsourceEntity location: " + x.toFixed(2) + ", " + y.toFixed(2) + ", " + z.toFixed(2));   

    //get rotation to determine North, South, East, or West
    let rotation = sourceEntity.getRotation();
    let direction = get_cardinal_direction(rotation.y);
    world.sendMessage("§b" + name + " is facing " + direction);
    
}

//For non-player entities, this doesn't update until the entity intends to move that direction.
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