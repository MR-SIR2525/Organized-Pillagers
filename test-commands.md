# Organized Pillagers test commands

This file documents the current **testing and debug interfaces** for `op:persistent_pillager`.

> **Scope:** These commands intentionally alter entity component groups and, in a few cases, persistent world/entity data. Use a disposable test world or select one named test pillager at a time.

## Targeting one persistent pillager

The examples use the nearest persistent pillager:

```mcfunction
@e[type=op:persistent_pillager,c=1]
```

For repeatable tests, name or tag the entity first and replace the selector. For example:

```mcfunction
/tag @e[type=op:persistent_pillager,c=1] add op_test_subject
```

Then target it with:

```mcfunction
@e[type=op:persistent_pillager,tag=op_test_subject]
```

---

## Script API test events: `op:test`

`main.js` subscribes only to the `op` namespace. Testing actions share the `op:test` ID, and the first word of the message selects a `switch` case:

```mcfunction
/scriptevent op:test <action> [arguments]
```

Most actions need an entity source. Run them through a persistent pillager so Script API receives that entity as `sourceEntity`:

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test <action> [arguments]
```

### `getFacing`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test getFacing
```

Prints the source pillager's cardinal direction (`north`, `south`, `east`, or `west`) from its Y rotation.

**Caveat:** non-player entity rotation may not update until the entity intends to move in that direction.

### `getYRot`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test getYRot
```

Prints the source pillager's raw Y rotation to two decimal places.

### `getBlock x y z`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test getBlock 10 64 -20
```

Reads and prints the block ID at the supplied coordinates in the source pillager's dimension.

- Arguments are required: `x y z`.
- Coordinates are parsed as numbers; relative coordinates such as `~` are **not** supported by this action.
- The target area must be loaded.

### `isFlatEnough x y z radius threshold successPercentage`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test isFlatEnough ~ ~ ~ 48 2 0.8
```

Runs the settlement flatness check and prints whether the area passes.

Arguments:

| Argument | Meaning |
|---|---|
| `x y z` | Scan center. Each coordinate can be `~` to use the source pillager's rounded current coordinate. |
| `radius` | Horizontal scan radius. |
| `threshold` | Allowed elevation difference used by the flatness check. |
| `successPercentage` | Fraction of scanned positions that must satisfy the check (for example, `0.8` for 80%). |

This is diagnostic only; it does not register a settlement or change entity state.

### `visualize`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test visualize
```

Visualizes the no-go-block scan around the source pillager by placing white concrete.

**Destructive test tool:** it writes blocks in a large area using the hard-coded scan values:

```text
radius: 48
height above source: 10
 depth below source: 6
step size: 2
```

Use only in a disposable area.

### `randomStrollToNewSpot`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test randomStrollToNewSpot
```

Starts the script-driven random-stroll routine used while a potential founder searches for a suitable settlement location. It is asynchronous and can remove/restore the default random-stroll behavior as it runs.

The entity event below is a shorter alternate trigger for the same script action.

### `previewSettlementLayout`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test previewSettlementLayout
```

Loads the source governor's `op:settlementId`, resolves the authoritative registry record, and prints the planned town-square and governor-lot dimensions, center, frontage, and orientation.

This is a **no-world-write preview**. It does not place the square or dirt house. For legacy settlement records that predate persisted orientation, it previews using the governor's current facing direction.

### `buildSettlementLayout [<settlementId>] [true|false]`

As a settlement member, omit the ID to build that member's settlement:

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test buildSettlementLayout
```

As a player/server command, supply the authoritative settlement ID:

```mcfunction
/scriptevent op:test buildSettlementLayout 4
```

The first physical stage places a cobblestone 17×17 square and the compact dirt governor house from the stored orientation-aware plan. Default `false` uses a blacklist preflight: it refuses to overwrite end/nether portal blocks, obsidian, crying obsidian, or any inventory/container block. Natural terrain, water, and lava remain replaceable. Pass `true` to intentionally bypass that overwrite protection:

```mcfunction
/scriptevent op:test buildSettlementLayout 4 true
```

Force does **not** bypass settlement-record validation or change the record’s destination dimension.

### `buildOrientationTestGrid [true|false]`

```mcfunction
/scriptevent op:test buildOrientationTestGrid
```

Player-only test action. It starts at the invoking player’s floored block location and lays out four builds in a facing-relative 2×2 grid, 64 blocks apart: north, east, south, and west variants. Each center gets a floating stone block ten blocks above it and an oak sign above that reading the orientation.

Use `true` only to overwrite protected blocks deliberately:

```mcfunction
/scriptevent op:test buildOrientationTestGrid true
```

### `deactivateSettlement <settlementId>`

```mcfunction
/execute as @e[type=op:persistent_pillager,c=1] at @s run scriptevent op:test deactivateSettlement 1
```

Marks `op:settlement_1` inactive while retaining its world record, ID, center, orientation, and planned layout. It finds **currently loaded** persistent pillagers in the overworld, nether, and end that reference that ID and teleports them to the settlement center offset by `x+5`, `y+1`, `z+0`.

This temporary test policy intentionally keeps their membership and settled/governor state intact after teleporting them. It does not delete registry data or placed blocks.

### `deleteSettlement <settlementId>`

```mcfunction
/scriptevent op:test deleteSettlement 1
```

Deletes `op:settlement_1` from the world registry without reusing its ID. Every currently loaded persistent pillager that referenced it has its `op:settlementId` cleared, loses settled/governor state, and restarts the nearby-settlement search flow.

**Destructive test tool:** this does not remove placed blocks or release members that are currently unloaded; unloaded-member validation remains future work.

---

## Persistent-pillager entity events

Use entity events when testing behavior-pack state transitions directly:

```mcfunction
/event entity @e[type=op:persistent_pillager,c=1] <event>
```

### Settlement travel and membership

| Event | What it does | Notes |
|---|---|---|
| `check_for_nearby_settlements` | Looks for a `settled_pillager` within 598 blocks. Starts travel if one is found; otherwise enters/refreshes avoidance behavior. | It may request a settlement join if a settled pillager is within 12 blocks. |
| `move_to_settled_pillagers` | Removes avoidance and adds the `follow_mob` travel component group. | Use to test travel directly. A leashed/tied target is currently not followed by Bedrock `follow_mob`. |
| `remove_move_to_settled_pillagers` | Removes the settlement-travel group. | `stop_move_to_settled_pillagers` is an alias. |
| `register_settlement_manually` | Starts the manual registration test path at the entity's current rounded block location. | See the dedicated warning below. `manually_register_settlement` is an alias. |
| `find_spot_to_create_settlement` | Promotes the entity to governor/search state and starts the normal Script API suitability-search flow. | This is a real state transition, not a read-only probe. |
| `governor_pillager` | Adds the governor component group and the `governor_pillager` / `settled_pillager` families. | Does **not** itself create or validate a settlement registry record. Prefer normal or manual registration for a valid founder. |
| `belongs_to_settlement` | Adds the ordinary settlement-member component group and the `settled_pillager` family. | Does **not** assign `op:settlementId`. The arrival Script API flow should normally assign that first. |
| `demote_governor_pillager` | Removes governor status and triggers `belongs_to_settlement`. | Preserves ordinary settled-member family state but does not modify registry data. |
| `remove_belongs_to_settlement` | Removes the ordinary member component group. | Does not currently clear `op:settlementId`; use only when deliberately testing this incomplete state transition. |

### Manual settlement registration

```mcfunction
/event entity @e[type=op:persistent_pillager,c=1] register_settlement_manually
```

This testing path:

1. registers a settlement using the source entity's rounded current location and current dimension;
2. writes the founder's `op:settlementId` and the compatibility properties `var:x`, `var:y`, and `var:z`;
3. removes travel/avoidance groups;
4. makes the successful founder a `governor_pillager`.

It intentionally **skips suitability scanning**. Re-running it for the same valid founder should reuse its existing settlement record rather than allocate a second ID.

### Random-stroll and search-state events

| Event | What it does | Use / caution |
|---|---|---|
| `run_randomStrollToNewSpot` | Queues `op:test randomStrollToNewSpot ...` from the entity. | Script test trigger; equivalent in intent to the direct `op:test` action. |
| `random_stroll` | Adds the temporary random-stroll behavior group. | Useful for inspecting the component group without starting the full script routine. |
| `remove_random_stroll` | Removes temporary random stroll and resets `var:finished_random_stroll` to `false`. | |
| `restore_default_random_stroll` | Removes temporary random stroll and restores the default random-stroll group. | Normal cleanup path after the script routine. |
| `move_to_random_block` | Adds the random-block movement group. | Debug movement transition. |
| `remove_move_to_random_block` | Removes that movement group. | |
| `timeout_random_stroll` | Removes temporary random stroll and resumes `find_spot_to_create_settlement`. | Marked unused in the entity file. |
| `stop_timeout_random_stroll` | Same current behavior as `timeout_random_stroll`. | Marked unused in the entity file. |

### Avoidance, combat, persistence, and ticking probes

| Event | What it does |
|---|---|
| `avoid_players_and_villagers` | Adds the avoidance group and removes settlement travel. |
| `stop_avoiding_players_and_villagers` | Removes the avoidance group. |
| `refresh_avoid_behavior` | Re-evaluates avoidance versus a nearby settlement target. |
| `check_for_nearby_players_or_villagers` | Checks the player/villager exclusion radii and can initiate normal settlement-site search. |
| `peaceful` / `not_peaceful` | Toggle the difficulty-state properties and remove/add active hostility. |
| `add_active_hostility` / `remove_active_hostility` | Add/remove the nearby hostile target-selection group. |
| `add_able_to_breed` / `remove_able_to_breed` | Add/remove the experimental breeding behavior group. |
| `persistence_on` / `persistence_off` | Add/remove the persistence component group. |
| `ticks_world_on` / `ticks_world_off` | Add/remove the component that keeps the entity ticking. |
| `add_equipment` / `remove_equipment` | Add/remove the equipment component group. |

---

## Known test limitation: leads and settlement following

Bedrock `minecraft:behavior.follow_mob` currently does not make persistent pillagers follow a settled/governor target while that target is attached to a lead:

- the lead may be held by a player **or** tied to a fence;
- removing or breaking the lead lets eligible followers begin following again;
- this is an observed Bedrock AI/pathfinding limitation, not a settlement-ID or family-assignment failure.

Keep travel-test targets untethered.

## Internal events: do not invoke as standalone tests

These events are intended to be called only after another system has established their prerequisites:

| Event | Required prerequisite |
|---|---|
| `request_join_nearby_settlement` | Traveller is within 12 blocks of a settled sponsor and already has active `follow_mob`. |
| `joined_nearby_settlement` | Script API has validated the sponsor and persisted the traveller's settlement ID. |
| `manually_registered_settlement` | Manual registry persistence completed successfully. |

Directly firing them can create a family/component state that does not match the world-owned settlement registry.
