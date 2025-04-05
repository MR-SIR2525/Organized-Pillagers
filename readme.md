## TODO:
- **Logic find spot for settlement failing:** 
  - Stroll around...  timer, check again...  x failed attempts puts them in wandering "sleep mode" where searches become less frequent after each fail. Example, every 60 seconds, then every 5 min, etc.
  - ...
  - Figure out what function returns what, and how to handle retrying search/scan. Stroll away from bad spot is pretty solid now, except for returns.

- **Logic for successfully finding a good spot:**
  - place marker entity? Store coords in governor pillager entity somehow (tag, property, or scoreboard)?
  - "build" first building of settlement (town square too?)


## Notes

**[--- View Changelog ---](changelog.md)**

**Pillager settlements/bases**
- might have to declare them as dwelling inhabitants instead of hostiles...
  - for a raid, dweller role switches back to hostile
  - for raids, might need some sort of marker for pillager bases that cancels a raid at their own place lol. Essentially, it would be a check that occurs to see if the raid is trying to occur at a pillager village, for which it will be cancelled, otherwise it will continue...

**Avoiding players/villagers**
- seems to timeout after 4 ish seconds..?
- refresh avoiding event fixes this.

**Searching for settlements**
- remove ranged, melee attack, and active hostility, add search for settled pillagers

**Finding spot to create settlements**
- Basically just identify flat ish area... then clear out trees if needed, then build a town center first? Maybe vanilla tower near the center?
- Algorithm pretty good for detecting man-made blocks



**environment sensor**
- is spamming each tick, checking for difficulty change when melee or ranged_attack mode is active
- maybe adopt what the bee does...  when pillager has target, check difficulty for appropriate behavior
  - **This would likely be inefficient.**


**Docs**
https://jaylydev.github.io/scriptapi-docs/1.21.23/modules/_minecraft_server_1_13_0.html

**How does JS pass things to functions?**
Short answer: it uses a pass-by-value strategy for primitive types and a pass-by-sharing strategy for objects.
See https://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language
In particular, objects are passed by a reference to the value, which is copied and passed to the function. This means that if the function modifies the object, the caller will see the changes, but if the function assigns a new value to the object, the caller will not see the change.



## Helpful Links

- [Entity Class](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/entity?view=minecraft-bedrock-stable)
