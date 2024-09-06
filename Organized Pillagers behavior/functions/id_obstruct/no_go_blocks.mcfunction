## You must establish location before calling this function.
## - example: `execute as @s positioned x y z run function <path>`

## Planks
execute as @s if block ~ ~ ~ planks run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:bamboo_planks run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:cherry_planks run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:crimson_planks run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:warped_planks run tag @s add found_no_go_block

## Cobblestone and Stone variants
execute as @s if block ~ ~ ~ minecraft:cobblestone run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:mossy_cobblestone run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:stonebrick run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:smooth_stone run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:deepslate run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:cobbled_deepslate run tag @s add found_no_go_block

## Glass types
execute as @s if block ~ ~ ~ glass run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ glass_pane run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ stained_glass run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ stained_glass_pane run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ tinted_glass run tag @s add found_no_go_block

## Doors
execute as @s if block ~ ~ ~ minecraft:wooden_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:spruce_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:birch_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:jungle_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:acacia_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:dark_oak_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:mangrove_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:cherry_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:bamboo_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:crimson_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:warped_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:copper_door run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:iron_door run tag @s add found_no_go_block

## Storage blocks
execute as @s if block ~ ~ ~ chest run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ ender_chest run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ shulker_box run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ barrel run tag @s add found_no_go_block

## Special blocks
execute as @s if block ~ ~ ~ minecraft:bed run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:crafting_table run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:anvil run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:composter run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ mrsir:farmer_guide_stone run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:furnace run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:blast_furnace run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:smoker run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:grindstone run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:lectern run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:cauldron run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:brewing_stand run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:smithing_table run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:cartography_table run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:loom run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:stonecutter_block run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:enchanting_table run tag @s add found_no_go_block

## Other no go blocks
execute as @s if block ~ ~ ~ minecraft:beacon run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:obsidian run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:iron_block run tag @s add found_no_go_block
execute as @s if block ~ ~ ~ minecraft:gold_block run tag @s add found_no_go_block
