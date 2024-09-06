import { world } from "@minecraft/server";

world.sendMessage("Hello, World!");

world.afterEvents.playerBreakBlock.subscribe(function (data) {
    world.sendMessage(data.player.name + " broke a block!");
})
