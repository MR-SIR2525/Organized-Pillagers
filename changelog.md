### 2026-08-19 — `v0.0.122`
- added a force-aware physical initial-build executor: default placement soft-overwrites terrain/liquids but preflights portal, obsidian, and inventory/container blocks; explicit `true` permits forced rebuilds
- added player/server and settlement-member build commands plus a player-facing four-orientation grid test with floating stone/sign labels
- added pure build-plan and orientation-grid tests for the first cobblestone-square / dirt-house stage

### 2026-08-19 — `v0.0.121`
- made `op:test deleteSettlement <id>` source-independent, allowing direct player/server invocation with `/scriptevent op:test deleteSettlement <id>`
- changed deleted-settlement cleanup to enumerate and release every currently loaded matching persistent pillager after its registry record is removed
- corrected nearby-settlement detection for pillagers sharing a boat: removed the one-block `rm=1` exclusion so a traveller can recognize a settled sponsor at the same position
- clarified deactivated-settlement membership: existing valid records, whether active or inactive, may accept members; only deleted/missing records reject membership

### 2026-08-19 — `v0.0.120`
- added deterministic, orientation-aware settlement layout planning: a 17×17 town square centered on the registered settlement center, plus a permanently reserved 27×31 Governor’s Row / future palace lot on local north
- defined the provisional level-0 governor dirt-house footprint within that reserved lot, allowing later upgrades to expand without moving the street frontage
- persisted a newly founded governor’s cardinal facing direction as settlement orientation and added layout/registry test coverage for it
- added the `instant_despawn` component group and entity event
- added settlement activity state: new settlements begin `active: true`, and deactivation preserves the settlement record and ID instead of deleting it; deactivated settlements may still accept members while future reactivation behavior is developed
- added `op:test deactivateSettlement <id>`: currently loaded members keep their settlement membership but are teleported to the inactive settlement center with offset `x+5`, `y+1`, `z+0` for temporary testing
- extended `op:test deleteSettlement <id>`: currently loaded members of a deleted settlement clear their reference, lose settlement status, and restart the existing nearby-settlement search flow
- added preview/delete/deactivate test-command documentation and Node coverage for deactivation; unloaded-member cleanup remains deferred

### 2026-08-19 — `v0.0.112`
- filtered Script API `scriptEventReceive` handling to the `op` namespace so Organized Pillagers ignores Script API events from other addons
- consolidated testing Script API commands under `op:test`, with the first message token selecting the test action and remaining tokens preserved as that action’s payload
- migrated the random-stroll test event to the new `op:test randomStrollToNewSpot` syntax
- added `test-commands.md`, documenting the test Script API actions, persistent-pillager test/state events, safe invocation patterns, and known lead/follow limitation


### 2026-08-16
- added persistent-pillager arrival and nearby-settlement joining: a traveller validates a nearby sponsor, receives that sponsor’s `op:settlementId`, stops following, and gains the settled-pillager family
- added validated settlement lookup and membership-assignment helpers with test coverage that rejects missing records and silent reassignment to another settlement
- added a manual settlement-registration test path that persists a founder at its current location without suitability scanning and then marks the successful founder as a governor
- grouped the move-to-settlement events and added debug output for the travel transition
- manifest versions and the watermark to `v0.0.111`
- quirk/behavior identified about `follow_mob` in a test world: persistent pillagers do not follow a settled/governor pillager while that target is attached to a lead, whether the lead is held by a player or tied to a fence; following resumes after the lead is removed


### 2026-08-15 — `settlement-builder` branch:
- migrated the `@minecraft/server` Script API dependency from `1.16.0` to `2.8.0`, matching the installed project package
- added a persistent, world-owned settlement registry with stable integer settlement IDs and permanent dimension-aware center coordinates
- stores each settlement independently as `op:settlement_<id>` and retains `op:settlementNextId` for ID allocation
- links a founding persistent pillager to its settlement with `op:settlementId`; repeated founder events return the existing settlement instead of creating a duplicate
- validates non-empty dimension IDs and integer block-grid center coordinates before persistence
- prevents accidental overwrite if a record already exists at the next allocated ID
- preserves the existing `var:x`, `var:y`, and `var:z` founder properties while moving toward the formal registry
- releases the in-memory settlement-search guard after success, failure, or a thrown error
- added Node-based tests covering persistence, duplicate prevention, ID continuation, validation, and collision protection
- added registry-level settlement deletion that preserves retired IDs and clears a matching loaded founder link
- documented the deferred cleanup required for unloaded entities retaining a deleted settlement ID
- replaced the persistent pillager’s retired attack-target-based settlement travel with `minecraft:behavior.follow_mob`
- verified follow travel in the test world through 64-, 128-, 256-, 400-, 550-, and 600-block ranges; observed a practical `follow_mob` limit near 600 blocks
- set the operational settlement-follow range to 598 blocks as a small buffer below that observed limit
- added a 15-second settlement proximity refresh while travelling and prevented redundant re-adding of the active follow behavior
- removed the obsolete `move_towards_target`/`nearest_attackable_target` settlement-travel path and its orphaned target-acquired debug event
- no physical center marker, roads, buildings, palace system, orientation, or settlement-activity model added yet


### 12/6/24:
- Update script dependency from 1.13.0 to 1.16.0
- manifests to v0.0.107
- improved some debug messages
- cleaned up scriptevent if statements
- added event to restore default behavior.random_stroll
- refresh avoid behavior now 6 seconds, was 5
- updated notes.md, renamed it to readme.md
- prettified readme and changelog


### 10/25-29/24:
- no go blocks Set
- no go blocks scan logic
- flatness scan logic
- lots of work on script (main.js) 
- some test functions

### 8/2/24:
- environment sensor for peaceful/not peaceful... needs work still
- tested avoid players and villagers behavior, tweaked events for this
- added debug messages
- added persistence on/off events
- added use attack behavior to find settled pillagers
- added properties (variables) for area scanning, function check air east 10x10
- added "default_pillager" family type for vanilla pillagers
- added events for belongs_to_settlement
- removed despawn from distance
- updated entity spawned, entity transformed events
- fixed sounds not working for persistent pillager
- fixed "on_escape" syntax for find_settled_pillagers


### 7/31/24: 
- imported necessary files
- added baby pillager code
- added add/remove targeting for testing, future use.
