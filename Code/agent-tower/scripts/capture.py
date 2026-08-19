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

print("Init:", send_and_wait("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "firefox-inspector", "version": "1.0.0"}
}, msg_id=1))

def capture_page(url, filename, msg_id_start):
    print(f"\nNavigating to {url}...")
    send_and_wait("tools/call", {
        "name": "navigate_page",
        "arguments": {"url": url}
    }, msg_id=msg_id_start)

    time.sleep(2)

    print("Taking screenshot...")
    res = send_and_wait("tools/call", {
        "name": "screenshot_page",
        "arguments": {}
    }, msg_id=msg_id_start + 1)

    content = res.get("result", {}).get("content", [])
    for item in content:
        if item.get("type") == "image" and "data" in item:
            img_bytes = base64.b64decode(item["data"])
            path = f"/tmp/{filename}"
            with open(path, "wb") as f:
                f.write(img_bytes)
            print(f"SAVED SCREENSHOT: {path} ({len(img_bytes)} bytes)")
            return path
    print("NO IMAGE DATA FOUND:", res)
    return None

capture_page("http://localhost:3008/organization", "agent-tower-org.png", 10)
capture_page("http://localhost:3008/connections", "agent-tower-connections.png", 20)
capture_page("http://localhost:3008/settings", "agent-tower-settings.png", 30)

proc.terminate()
