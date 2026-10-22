with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

line380 = lines[379]

# In VS Code, HTML parser processes <script> tags.
# Let's inspect all <script> tags on line 380
import re
for m in re.finditer(r'<script([^>]*)>(.*?)</script>', line380):
    attrs = m.group(1)
    body = m.group(2)
    print("ATTRS:", attrs)
    # Check if type is something or missing
    # Let's check for any weird characters in body
    if "type=" in attrs and "litespeed" not in attrs and "json" not in attrs:
        print("Standard script:", body[:50])
