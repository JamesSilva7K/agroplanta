file_path = r"d:\PlantaAgro\credito\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    c = f.read()

bad1 = 'data-settings="{" submenu_icon":{"value":"<i="" fa-angle-down\\"="" aria-hidden="\\&quot;true\\&quot;">&lt;\\/i&gt;","library":"fa-solid"},"layout":"horizontal","toggle":"burger"}"'
good1 = 'data-settings=\'{"layout":"horizontal","toggle":"burger"}\''

bad2 = 'data-settings="{" layout":"vertical","submenu_icon":{"value":"<i="" fa-chevron-down\\"="" aria-hidden="\\&quot;true\\&quot;">&lt;\\/i&gt;","library":"fa-solid"}}"'
good2 = 'data-settings=\'{"layout":"vertical"}\''

print("Found bad1 count:", c.count(bad1))
print("Found bad2 count:", c.count(bad2))

c = c.replace(bad1, good1)
c = c.replace(bad2, good2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Replacement complete!")
