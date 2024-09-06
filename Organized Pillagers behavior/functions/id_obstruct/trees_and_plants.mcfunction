## Check for trees and some plants

## You must establish location before calling this function.
## - example: `execute as @s positioned x y z run function <path>`

execute as @s if block ~ ~ ~ log run tag @s add log_found
execute as @s if block ~ ~ ~ dark_oak_log run tag @s add log_found
execute as @s if block ~ ~ ~ cherry_log run tag @s add log_found
execute as @s if block ~ ~ ~ mangrove_log run tag @s add log_found
execute as @s if block ~ ~ ~ crimson_stem run tag @s add log_found
execute as @s if block ~ ~ ~ warped_stem run tag @s add log_found

execute as @s if block ~ ~ ~ cactus run tag @s add cactus_found
execute as @s if block ~ ~ ~ bamboo run tag @s add bamboo_found