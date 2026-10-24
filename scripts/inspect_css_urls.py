with open(r"d:\PlantaAgro\credito\css\8b87ddb693cffeb08e0834cdcfddb169.css", "r", encoding="utf-8") as f:
    css = f.read()

import re
urls = set(re.findall(r'url\([\"\']?([^\"\'\)]+)[\"\']?\)', css))
print(f"Total url(...) in css: {len(urls)}")
for u in sorted(urls)[:20]:
    print(" ", u)
