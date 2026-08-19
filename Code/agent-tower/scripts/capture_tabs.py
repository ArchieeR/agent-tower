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

print("\nNavigating to connections page...")
send_and_wait("tools/call", {
    "name": "navigate_page",
    "arguments": {"url": "http://localhost:3008/connections"}
}, msg_id=2)

time.sleep(2)

# Click Platform Tools
print("\nClicking Platform Tools tab...")
send_and_wait("tools/call", {
    "name": "evaluate_script",
    "arguments": {
        "function": "() => { const btns = Array.from(document.querySelectorAll('button')); const toolsBtn = btns.find(b => b.textContent.includes('Platform Tools')); if (toolsBtn) toolsBtn.click(); }"
    }
}, msg_id=3)

time.sleep(1)

res = send_and_wait("tools/call", {
    "name": "screenshot_page",
    "arguments": {}
}, msg_id=4)

content = res.get("result", {}).get("content", [])
for item in content:
    if item.get("type") == "image" and "data" in item:
        img_bytes = base64.b64decode(item["data"])
        path = "/tmp/platform-tools-horizontal.png"
        with open(path, "wb") as f:
            f.write(img_bytes)
        print(f"SAVED SCREENSHOT: {path} ({len(img_bytes)} bytes)")

proc.terminate()
