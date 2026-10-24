file_path = r"d:\PlantaAgro\credito\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    c = f.read()

import re

c = re.sub(
    r'<a\s+href=[\"\']/cdn-cgi/l/email-protection[^\"]*[\"\']([^>]*)>',
    r'<a href="mailto:faleconosco@plantaeagrocredito.com.br"\1>',
    c
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(c)

print("Email links cleaned!")
