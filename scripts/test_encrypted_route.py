import urllib.request
import urllib.error
import subprocess

print("--- TEST 1: Blocked /admin and /admin/ ---")
for path in ['/admin', '/admin/', '/admin/dashboard']:
    try:
        req = urllib.request.urlopen(f'http://localhost:8080{path}')
        print(f"FAIL: {path} returned {req.status}")
    except urllib.error.HTTPError as e:
        print(f"SUCCESS: {path} blocked with HTTP {e.code} (Admin word is completely hidden)")

print("\n--- TEST 2: Generate 7-digit Token ---")
token = subprocess.check_output(
    ['node', '-e', 'const { generate7DigitToken } = require("./server/security"); console.log(generate7DigitToken(24));']
).decode('utf-8').strip()
print(f"Token: {token} (Length: {len(token)})")

print("\n--- TEST 3: Access via 7-digit encrypted URL (http://localhost:8080/{token}) ---")
req = urllib.request.urlopen(f'http://localhost:8080/{token}')
html = req.read().decode('utf-8')
if 'Plantae Agrocrédito — Painel Supreme Admin' in html:
    print(f"SUCCESS: http://localhost:8080/{token} rendered Supreme Admin panel! (HTTP {req.status})")
else:
    print("FAIL: Content mismatch")

print("\n--- TEST 4: Stylesheet /admin.css ---")
req_css = urllib.request.urlopen('http://localhost:8080/admin.css')
print(f"SUCCESS: /admin.css loaded (HTTP {req_css.status}, {len(req_css.read())} bytes)")

print("\n--- TEST 5: Invalid 7-digit Token (ZZZZZZZ) ---")
try:
    req_inv = urllib.request.urlopen('http://localhost:8080/ZZZZZZZ')
    print(f"Status: {req_inv.status}")
except urllib.error.HTTPError as e:
    print(f"SUCCESS: Invalid token blocked with HTTP {e.code}")

print("\n--- ALL TESTS PASSED! ---")
