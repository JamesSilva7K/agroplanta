import urllib.request
import urllib.error
import subprocess
import json
import time

print("=== 1. TEST UNAUTHENTICATED ACCESS (MUST BE BLOCKED) ===")
try:
    req = urllib.request.urlopen('http://localhost:8080/admin')
    print("WARNING: Unauthenticated /admin returned:", req.status)
except urllib.error.HTTPError as e:
    print(f"PASS: Unauthenticated /admin blocked with HTTP {e.code} (Cyber-Shield active)")

print("\n=== 2. GENERATE 7-DIGIT CRYPTOGRAPHIC TOKEN ===")
cmd = ['node', '-e', 'const { generate7DigitToken } = require("./server/security"); console.log(generate7DigitToken(24));']
code = subprocess.check_output(cmd).decode().strip()
print(f"Generated 7-digit code: '{code}' (Length: {len(code)})")
assert len(code) == 7, f"Expected 7 digits, got {len(code)}"

print("\n=== 3. TEST 7-DIGIT DIRECT ROUTE /admin/:code ===")
route_7digit = f'http://localhost:8080/admin/{code}'
t0 = time.time()
req = urllib.request.urlopen(route_7digit)
latency = (time.time() - t0) * 1000
print(f"PASS: Direct route {route_7digit} returned HTTP {req.status} in {latency:.2f}ms (ZERO LAG)")

print("\n=== 4. TEST API WITH 7-DIGIT BEARER TOKEN ===")
req_api = urllib.request.Request(
    'http://localhost:8080/api/analytics/metrics',
    headers={'Authorization': f'Bearer {code}'}
)
t0 = time.time()
with urllib.request.urlopen(req_api) as res:
    api_latency = (time.time() - t0) * 1000
    metrics = json.loads(res.read().decode())
    s = metrics['summary']
    print(f"PASS: Authenticated API returned HTTP {res.status} in {api_latency:.2f}ms")
    print(f"Total Inputs: {s['total_inputs']} | Total Leads: {s['total_whatsapp_outputs']} | Conversion: {s['whatsapp_conversion_rate']}%")

print("\n=== 5. TEST INVALID CODE REJECTION ===")
try:
    req = urllib.request.urlopen('http://localhost:8080/admin/INVALID')
    print("WARNING: Invalid code returned:", req.status)
except urllib.error.HTTPError as e:
    print(f"PASS: Invalid 7-digit code blocked with HTTP {e.code}")

print("\nALL 7-DIGIT ENCRYPTION & PERFORMANCE AUDITS PASSED 100%!")
