import shutil
import re
import os

print("--- 1. Copying missing assets to root directories ---")
# Copy 8b87ddb693cffeb08e0834cdcfddb169.css to root css/
src_css = r"d:\PlantaAgro\credito\css\8b87ddb693cffeb08e0834cdcfddb169.css"
dst_css = r"d:\PlantaAgro\css\8b87ddb693cffeb08e0834cdcfddb169.css"
if os.path.exists(src_css):
    shutil.copy2(src_css, dst_css)
    print("Copied CSS to root css/")

# Copy missing images to root images/
for img_name in ['cred-rur-dkt.png', 'credi-rural-mob.png', 'doodles_plantae-01-1.png']:
    src_img = os.path.join(r"d:\PlantaAgro\credito\images", img_name)
    dst_img = os.path.join(r"d:\PlantaAgro\images", img_name)
    if os.path.exists(src_img):
        shutil.copy2(src_img, dst_img)
        print(f"Copied {img_name} to root images/")

print("\n--- 2. Updating credito/index.html with absolute paths and base tag ---")
credito_html_path = r"d:\PlantaAgro\credito\index.html"
with open(credito_html_path, "r", encoding="utf-8") as f:
    c = f.read()

# Add <base href="/credito/"> if not present
if '<base ' not in c:
    c = c.replace('<head>', '<head><base href="/credito/">')
    print("Added <base href=\"/credito/\"> to <head>")

# Update CSS link to /credito/css/
c = c.replace('href="css/8b87ddb693cffeb08e0834cdcfddb169.css"', 'href="/credito/css/8b87ddb693cffeb08e0834cdcfddb169.css"')

# Update relative image paths to /credito/images/
# Replace "images/ with "/credito/images/
c = c.replace('"images/', '"/credito/images/')
c = c.replace("'images/", "'/credito/images/")
c = c.replace('url("images/', 'url("/credito/images/')
c = c.replace('url(/credito/images/', 'url("/credito/images/')
c = c.replace('images/1-doodle-capa-plantar-1', '/credito/images/1-doodle-capa-plantar-1')

# Avoid any double //credito/credito
c = c.replace('/credito//credito/', '/credito/')
c = c.replace('/credito/credito/', '/credito/')

with open(credito_html_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Saved updated credito/index.html")

print("\n--- 3. Updating vercel.json rewrites ---")
vercel_path = r"d:\PlantaAgro\vercel.json"
import json

with open(vercel_path, "r", encoding="utf-8") as f:
    vdata = json.load(f)

# Ensure fallback rewrite for css and images
rewrites = vdata.get("rewrites", [])

# Check if fallback rewrites exist
has_css_rewrite = any(r.get("source") == "/css/8b87ddb693cffeb08e0834cdcfddb169.css" for r in rewrites)
if not has_css_rewrite:
    rewrites.insert(0, {
        "source": "/css/8b87ddb693cffeb08e0834cdcfddb169.css",
        "destination": "/credito/css/8b87ddb693cffeb08e0834cdcfddb169.css"
    })
    print("Added /css/ rewrite to vercel.json")

vdata["rewrites"] = rewrites

with open(vercel_path, "w", encoding="utf-8") as f:
    json.dump(vdata, f, indent=2)

print("Updated vercel.json!")
