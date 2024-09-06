**Pillager settlements/bases**
- might have to declare them as dwelling inhabitants instead of hostiles...
  - for a raid, it switches back to hostile
  - for raids, might need some sort of marker for pillager bases that cancels a raid at their own place lol. Essentially, it would be a check that occurs to see if the raid is trying to occur at a pillager village, for which it will be cancelled, otherwise it will continue...

**Avoiding players/villagers**
- seems to timeout after 4 ish seconds..?
- maybe need to periodically check if still in range, reapply behavior if so until pillager gets far enough away.

**Searching for settlements**
- remove ranged, melee attack, and active hostility, add search for settled pillagers

**Finding spot to create settlements**
- Basically just identify flat ish area... then clear out trees if needed, then build a town center first? Maybe vanilla tower near the center?

**environment sensor**
- is spamming each tick, checking for difficulty change when melee or ranged_attack mode is active
- maybe adopt what the bee does...  when pillager has target, check difficulty for appropriate behavior


**Docs**
https://jaylydev.github.io/scriptapi-docs/1.21.23/modules/_minecraft_server_1_13_0.html
