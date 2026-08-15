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
