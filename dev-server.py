#!/usr/bin/env python3
"""Local static server + POST /api duplicate email check (Drupal-style)."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PORT = int(os.environ.get("PORT", "8780"))
FORM_PROP = "finops_for_ai_demo"
LEADS_FILE = ROOT / ".data" / "leads.json"


def load_token() -> str:
    token = (os.environ.get("HUBSPOT_ACCESS_TOKEN") or "").strip()
    if token:
        return token
    env_path = ROOT / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "HUBSPOT_ACCESS_TOKEN":
            return value.strip().strip('"').strip("'")
    return ""


def normalize_email(value: str) -> str:
    return str(value or "").strip().lower()


def load_leads() -> set[str]:
    try:
        if not LEADS_FILE.exists():
            return set()
        data = json.loads(LEADS_FILE.read_text() or "[]")
        if not isinstance(data, list):
            return set()
        return {normalize_email(item) for item in data if normalize_email(item)}
    except Exception:  # noqa: BLE001
        return set()


def save_leads(emails: set[str]) -> None:
    LEADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    LEADS_FILE.write_text(json.dumps(sorted(emails), indent=2) + "\n")


def register_email(email: str) -> None:
    emails = load_leads()
    emails.add(normalize_email(email))
    save_leads(emails)


def hubspot_registered(email: str) -> dict:
    """Return {success} or {error, _status}."""
    token = load_token()
    if not token:
        return {"success": False, "_skip": True}

    payload = {
        "filterGroups": [
            {
                "filters": [
                    {
                        "propertyName": "email",
                        "operator": "EQ",
                        "value": email,
                    }
                ]
            }
        ],
        "properties": ["email", FORM_PROP],
        "limit": 1,
    }
    req = urllib.request.Request(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            result = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        return {
            "error": "Server error",
            "message": body or str(err),
            "_status": err.code,
        }
    except Exception as err:  # noqa: BLE001
        return {"error": "Server error", "message": str(err), "_status": 500}

    results = result.get("results") or []
    if not results:
        return {"success": False}

    props = results[0].get("properties") or {}
    contact_email = normalize_email(props.get("email") or "")
    flag = str(props.get(FORM_PROP) or "").strip().lower()
    return {
        "success": contact_email == normalize_email(email) and flag == "yes"
    }


def check_email(email: str) -> dict:
    email = normalize_email(email)
    if email in load_leads():
        return {"success": True}

    hs = hubspot_registered(email)
    if "error" in hs:
        return hs
    if hs.get("success"):
        register_email(email)
        return {"success": True}
    return {"success": False}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):  # noqa: N802
        path = self.path.split("?", 1)[0]
        if path.rstrip("/") != "/api":
            self.send_error(404, "Not found")
            return

        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": "Invalid JSON"})
            return

        email = normalize_email(body.get("email") or "")
        if not email:
            self._json(400, {"error": "Email required"})
            return

        # After HubSpot success, mark this email registered.
        if body.get("register") is True:
            register_email(email)
            self._json(200, {"success": True, "registered": True})
            return

        result = check_email(email)
        status = int(result.pop("_status", 200))
        result.pop("_skip", None)
        if "error" in result and status == 200:
            status = 500
        self._json(status, {"success": bool(result.get("success"))} if "error" not in result else result)

    def _json(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main() -> None:
    token = load_token()
    print("Serving %s on http://127.0.0.1:%s/" % (ROOT, PORT))
    print(
        "POST /api check + register → .data/leads.json (%s)"
        % ("HubSpot token set" if token else "local store only")
    )
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
