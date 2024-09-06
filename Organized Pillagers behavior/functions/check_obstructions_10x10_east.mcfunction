## Checking each obstruction to see what it might be

## Ideally you'd run this only after determining # of obstructions is below acceptable threshold

## Column 1
execute as @s if entity @s[tag=obstruction_at_1_-5] positioned ~1 ~0.25 ~-5 run function id_obstruct/no_go_blocks
