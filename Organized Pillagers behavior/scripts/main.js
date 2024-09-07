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

    if (id === "a:test") {
        test(event);
    }
    else if (id === "op:find_spot_for_settlement") {
        find_spot_for_settlement(initiator, message, sourceBlock, sourceEntity, sourceType);
    }
    else
        world.sendMessage("§cUnrecognized event: §e\"" + id + "\"§f with message: §e\"" + message + "\"");
});

function test(event) {
    world.sendMessage(event.sourceEntity.name + " says: " + event.message);
}

function find_spot_for_settlement(initiator, message, sourceBlock, sourceEntity, sourceType) {
    if (sourceEntity.name) {
        world.sendMessage("§b" + sourceEntity.name + " is looking for a spot to create a settlement.");
    }
    else {
        world.sendMessage("§b" + sourceEntity.typeId + " is looking for a spot to create a settlement.");
    }
    
    //get location of sourceEntity
    let x = sourceEntity.location.x;
    let y = sourceEntity.location.y;
    let z = sourceEntity.location.z;
    //print for debug
    world.sendMessage("§bsourceEntity location: " + x.toFixed(2) + ", " + y.toFixed(2) + ", " + z.toFixed(2));   

    
}
