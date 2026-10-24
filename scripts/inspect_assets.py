import re

with open(r"d:\PlantaAgro\credito\index.html", "r", encoding="utf-8") as f:
    c = f.read()

print("Total images/ in file:", c.count("images/"))
print("Total css/ in file:", c.count("css/"))

for m in re.finditer(r'([^\s"\'\(\)]*images/[^\s"\'\)]*)', c):
    print("Match:", m.group(0))
