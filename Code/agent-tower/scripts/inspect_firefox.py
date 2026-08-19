import subprocess
import json
import time
import os

proc = subprocess.Popen(
    ["npx", "@mozilla/firefox-devtools-mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

def send_msg(method, params={}, msg_id=1):
    msg = {
        "jsonrpc": "2.0",
        "id": msg_id,
        "method": method,
        "params": params
    }
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()

    while True:
        line = proc.stdout.readline()
        if not line:
            break
        line = line.strip()
        if line.startswith("{"):
            data = json.loads(line)
            if data.get("id") == msg_id:
                return data

# 1. Initialize
send_msg("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "firefox-inspector", "version": "1.0.0"}
}, msg_id=1)

# 2. Set viewport size
send_msg("tools/call", {
    "name": "set_viewport_size",
    "arguments": {"width": 1440, "height": 900}
}, msg_id=2)

pages_to_capture = [
    ("org-page", "http://localhost:3008/organization"),
    ("connections-page", "http://localhost:3008/connections"),
    ("settings-page", "http://localhost:3008/settings"),
]

os.makedirs("/tmp/agent-tower-shots", exist_ok=True)

msg_counter = 10
for name, url in pages_to_capture:
    print(f"\n--- Capturing {name} ({url}) ---")
    msg_counter += 1
    nav_res = send_msg("tools/call", {
        "name": "navigate_page",
        "arguments": {"url": url}
    }, msg_id=msg_counter)
    print("Nav result:", nav_res)

    time.sleep(2)

    msg_counter += 1
    shot_res = send_msg("tools/call", {
        "name": "screenshot_page",
        "arguments": {"filePath": f"/tmp/agent-tower-shots/{name}.png"}
    }, msg_id=msg_counter)
    print("Shot result:", shot_res)

proc.terminate()
