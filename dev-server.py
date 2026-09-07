#!/usr/bin/env python3
"""Serve the LP locally and enforce one HubSpot lead per email."""

import json
import os
import posixpath
import re
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / ".data"
LEADS_FILE = DATA_DIR / "leads.json"
PORT = int(os.environ.get("PORT", "8780"))

HS_PORTAL = "47057450"
HS_FORM = "9c9163c2-6f41-4369-bac9-8f4668c93889"
EMAIL_RE = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
DUPLICATE_MESSAGE = "This email ID is already registered. Please use another one."
GENERIC_MESSAGE = "Something went wrong. Please try again."
EMAIL_PATTERN = re.compile(EMAIL_RE)


def normalize_email(value):
    return str(value or "").strip().lower()


def load_leads():
    if not LEADS_FILE.exists():
        return set()
    try:
        raw = json.loads(LEADS_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, list):
            return {normalize_email(item) for item in raw if item}
    except (OSError, ValueError):
        pass
    return set()


def save_leads(emails):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    LEADS_FILE.write_text(
        json.dumps(sorted(emails), indent=2) + "\n",
        encoding="utf-8",
    )


def hubspot_contact_exists(email):
    token = os.environ.get("HUBSPOT_ACCESS_TOKEN", "").strip()
    if not token:
        return None

    payload = json.dumps(
        {
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
            "properties": ["email"],
            "limit": 1,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        data=payload,
        method="POST",
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8") or "{}")
        return bool(data.get("total", 0) > 0)
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        print("lead: hubspot search failed", err)
        raise


def submit_hubspot_form(email, context):
    body = {
        "fields": [{"objectTypeId": "0-1", "name": "email", "value": email}],
        "context": {},
    }
    for key in ("pageUri", "pageName", "hutk"):
        value = context.get(key)
        if isinstance(value, str) and value:
            body["context"][key] = value

    request = urllib.request.Request(
        "https://api.hsforms.com/submissions/v3/integration/submit/"
        + HS_PORTAL
        + "/"
        + HS_FORM,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            response.read()
    except urllib.error.HTTPError as err:
        print("lead: hubspot submit failed", err.code, err.read()[:300])
        raise
    except (urllib.error.URLError, TimeoutError) as err:
        print("lead: hubspot submit failed", err)
        raise


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        if self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        path = posixpath.normpath(self.path.split("?", 1)[0])
        if path != "/api/lead":
            self.send_error(404, "Not found")
            return
        self.handle_lead()

    def handle_lead(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except ValueError:
            self.json_response(400, {"message": GENERIC_MESSAGE})
            return

        if not isinstance(body, dict):
            self.json_response(400, {"message": GENERIC_MESSAGE})
            return

        email = normalize_email(body.get("email"))
        if not EMAIL_PATTERN.match(email):
            self.json_response(400, {"message": "Enter a valid work email."})
            return

        leads = load_leads()
        if email in leads:
            self.json_response(
                409, {"registered": True, "message": DUPLICATE_MESSAGE}
            )
            return

        try:
            exists = hubspot_contact_exists(email)
        except Exception:
            self.json_response(502, {"message": GENERIC_MESSAGE})
            return

        if exists:
            leads.add(email)
            save_leads(leads)
            self.json_response(
                409, {"registered": True, "message": DUPLICATE_MESSAGE}
            )
            return

        try:
            submit_hubspot_form(
                email,
                {
                    "pageUri": body.get("pageUri"),
                    "pageName": body.get("pageName"),
                    "hutk": body.get("hutk"),
                },
            )
        except Exception:
            self.json_response(502, {"message": GENERIC_MESSAGE})
            return

        leads.add(email)
        save_leads(leads)
        self.json_response(200, {"ok": True})

    def json_response(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("FinOps LP local server: http://127.0.0.1:%s/" % PORT)
    print("Lead API: POST /api/lead  (one email, one submit)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
