import subprocess
import json
import time
import base64

proc = subprocess.Popen(
    ["npx", "@mozilla/firefox-devtools-mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

def send_and_wait(method, params={}, msg_id=1):
    msg = {"jsonrpc": "2.0", "id": msg_id, "method": method, "params": params}
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()
    
    while True:
        line = proc.stdout.readline()
        if not line:
            return None
        line = line.strip()
        if line.startswith("{"):
            data = json.loads(line)
            if data.get("id") == msg_id:
                return data

send_and_wait("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "firefox-inspector", "version": "1.0.0"}
}, msg_id=1)

print("\nNavigating to organization page...")
send_and_wait("tools/call", {
    "name": "navigate_page",
    "arguments": {"url": "http://localhost:3008/organization"}
}, msg_id=2)

time.sleep(2)

print("\nClicking ALDR Ltd button via script...")
eval_res = send_and_wait("tools/call", {
    "name": "evaluate_script",
    "arguments": {
        "function": "() => { const btns = Array.from(document.querySelectorAll('button')); const aldr = btns.find(b => b.textContent.includes('ALDR Ltd')); if (aldr) { aldr.click(); return 'CLICKED ALDR'; } return 'NOT FOUND'; }"
    }
}, msg_id=4)
print("Eval result:", eval_res)

time.sleep(2)

print("Taking screenshot of ALDR Ltd org chart...")
res = send_and_wait("tools/call", {
    "name": "screenshot_page",
    "arguments": {}
}, msg_id=5)

content = res.get("result", {}).get("content", [])
for item in content:
    if item.get("type") == "image" and "data" in item:
        img_bytes = base64.b64decode(item["data"])
        path = "/tmp/aldr-org.png"
        with open(path, "wb") as f:
            f.write(img_bytes)
        print(f"SAVED SCREENSHOT: {path} ({len(img_bytes)} bytes)")

print("\nNavigating to connections page...")
send_and_wait("tools/call", {
    "name": "navigate_page",
    "arguments": {"url": "http://localhost:3008/connections"}
}, msg_id=6)

time.sleep(2)

print("Taking screenshot of ALDR Ltd connections page...")
res2 = send_and_wait("tools/call", {
    "name": "screenshot_page",
    "arguments": {}
}, msg_id=7)

content2 = res2.get("result", {}).get("content", [])
for item in content2:
    if item.get("type") == "image" and "data" in item:
        img_bytes = base64.b64decode(item["data"])
        path = "/tmp/aldr-connections.png"
        with open(path, "wb") as f:
            f.write(img_bytes)
        print(f"SAVED SCREENSHOT: {path} ({len(img_bytes)} bytes)")

proc.terminate()
