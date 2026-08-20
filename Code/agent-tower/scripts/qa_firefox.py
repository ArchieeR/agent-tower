#!/usr/bin/env python3
"""Firefox MCP visual QA for every Agent Tower route, theme, viewport, and key modal."""

import base64
import json
from pathlib import Path
import subprocess
import time

BASE = "http://localhost:3008"
OUT = Path("/tmp/agent-tower-firefox-qa")
OUT.mkdir(parents=True, exist_ok=True)

proc = subprocess.Popen(
    ["npx", "@mozilla/firefox-devtools-mcp"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
    text=True,
)
next_id = 1


def call(method: str, params: dict | None = None):
    global next_id
    request_id = next_id
    next_id += 1
    assert proc.stdin and proc.stdout
    proc.stdin.write(json.dumps({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params or {}}) + "\n")
    proc.stdin.flush()
    while True:
        line = proc.stdout.readline()
        if not line:
            raise RuntimeError(f"Firefox MCP closed while waiting for {method}")
        if not line.startswith("{"):
            continue
        response = json.loads(line)
        if response.get("id") != request_id:
            continue
        if "error" in response:
            raise RuntimeError(response["error"])
        return response.get("result", {})


def text_content(result: dict) -> str:
    return "\n".join(item.get("text", "") for item in result.get("content", []) if item.get("type") == "text")


def eval_js(function: str):
    result = call("tools/call", {"name": "evaluate_script", "arguments": {"function": function}})
    text = text_content(result)
    marker = "```json\n"
    if marker in text:
        return json.loads(text.split(marker, 1)[1].split("\n```", 1)[0])
    return text


def screenshot(name: str):
    target = OUT / f"{name}.png"
    result = call("tools/call", {"name": "screenshot_page", "arguments": {}})
    for item in result.get("content", []):
        if item.get("type") == "image" and item.get("data"):
            target.write_bytes(base64.b64decode(item["data"]))
            break
    if not target.exists():
        raise RuntimeError(f"No screenshot written for {name}: {text_content(result)[:400]}")


def set_viewport(width: int, height: int):
    call("tools/call", {"name": "set_viewport_size", "arguments": {"width": width, "height": height}})


def navigate(path: str):
    call("tools/call", {"name": "navigate_page", "arguments": {"url": f"{BASE}{path}"}})
    time.sleep(0.35)


def set_theme(theme: str):
    eval_js(f"() => {{ document.documentElement.dataset.theme = '{theme}'; localStorage.setItem('agent-tower-theme', '{theme}'); return document.documentElement.dataset.theme; }}")
    time.sleep(0.1)


def measurements():
    return eval_js("""() => ({
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      body: { width: document.body.scrollWidth, height: document.body.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      verticalOverflow: document.documentElement.scrollHeight > innerHeight + 1,
      header: (() => { const e = document.querySelector('.top-app-header'); if (!e) return null; const r=e.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}; })(),
      modal: (() => { const e = document.querySelector('[role=dialog], .detail-modal'); if (!e) return null; const r=e.getBoundingClientRect(); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}; })(),
      cardCount: document.querySelectorAll('.skill-card,.composio-horizontal-card,.settings-row,.org-team-node').length,
      textClips: Array.from(document.querySelectorAll('h1,h2,h3,strong')).filter(e => e.scrollWidth > e.clientWidth + 2).slice(0,10).map(e => e.textContent?.trim()),
      consoleMarker: performance.getEntriesByType('resource').filter(e => e.name.includes('/_next/')).length
    })""")


call("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "agent-tower-firefox-qa", "version": "1.0.0"},
})

checks = []
scenarios = [
    ("desktop", 1440, 900),
    ("tablet", 900, 900),
    ("mobile", 390, 844),
]
routes = [
    ("organization", "/organization"),
    ("connections", "/connections"),
    ("settings", "/settings"),
]

for viewport_name, width, height in scenarios:
    set_viewport(width, height)
    for theme in ("dark", "light"):
        for route_name, route in routes:
            navigate(route)
            set_theme(theme)
            name = f"{viewport_name}-{theme}-{route_name}"
            screenshot(name)
            checks.append({"scenario": name, **measurements()})

# Key department modal and its expanded configuration surface.
set_viewport(1440, 900)
navigate("/organization?department=marketing")
set_theme("dark")
screenshot("desktop-dark-department-modal")
checks.append({"scenario": "desktop-dark-department-modal", **measurements()})

eval_js("() => { const details=document.querySelector('.dept-config-drawer'); if(details) details.open=true; return Boolean(details); }")
screenshot("desktop-dark-department-config")
checks.append({"scenario": "desktop-dark-department-config", **measurements()})

set_viewport(390, 844)
navigate("/organization?department=marketing")
set_theme("light")
screenshot("mobile-light-department-modal")
checks.append({"scenario": "mobile-light-department-modal", **measurements()})

(OUT / "report.json").write_text(json.dumps(checks, indent=2) + "\n")
print(json.dumps({"output": str(OUT), "checks": checks}, indent=2))
proc.terminate()
