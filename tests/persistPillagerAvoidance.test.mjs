import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const behaviorPath = new URL(
    "../Organized Pillagers behavior/entities/persist_pillager.behavior.json",
    import.meta.url,
);

async function readBehaviorDefinition() {
    return readFile(behaviorPath, "utf8");
}

test("avoidance keepalive re-adds avoidance while a nearby player or villager remains", async () => {
    const definition = await readBehaviorDefinition();

    assert.match(
        definition,
        /unless entity @e\[family=settled_pillager,r=598,rm=1\] unless entity @e\[family=villager,tag=!pillager_exempt,r=260\] if entity @e\[family=player,tag=!pillager_exempt,r=260\] run event entity @s avoid_players_and_villagers/,
    );
    assert.match(
        definition,
        /unless entity @e\[family=settled_pillager,r=598,rm=1\] if entity @e\[family=villager,tag=!pillager_exempt,r=260\] run event entity @s avoid_players_and_villagers/,
    );
});
