/**
 * Vercel / Drupal-compatible email check.
 * POST { email } → { success: true|false }
 *   success true = already registered → block submit
 * POST { email, register: true } → mark email registered after HubSpot success
 *
 * Uses HUBSPOT_ACCESS_TOKEN when set (crm.objects.contacts.read),
 * plus a local/tmp store so duplicates still work without HubSpot lag.
 */
const FORM_PROP = "finops_for_ai_demo";
const fs = require("fs");
const path = require("path");

function leadsPath() {
  /* Prefer project .data locally; /tmp on Vercel */
  const local = path.join(process.cwd(), ".data", "leads.json");
  try {
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.accessSync(path.dirname(local), fs.constants.W_OK);
    return local;
  } catch (err) {
    return path.join("/tmp", "finops-leads.json");
  }
}

function readBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return {};
}

function send(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function loadLeads() {
  try {
    const raw = fs.readFileSync(leadsPath(), "utf8");
    const data = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeEmail).filter(Boolean);
  } catch (err) {
    return [];
  }
}

function saveLeads(list) {
  const unique = Array.from(new Set(list.map(normalizeEmail).filter(Boolean))).sort();
  fs.writeFileSync(leadsPath(), JSON.stringify(unique, null, 2) + "\n", "utf8");
  return unique;
}

function registerEmail(email) {
  const key = normalizeEmail(email);
  const list = loadLeads();
  if (list.indexOf(key) === -1) {
    list.push(key);
    saveLeads(list);
  }
}

async function hubspotRegistered(token, email) {
  const response = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/search",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: email,
              },
            ],
          },
        ],
        properties: ["email", FORM_PROP],
        limit: 1,
      }),
    }
  );

  const result = await response.json().catch(function () {
    return null;
  });

  if (!response.ok) {
    const err = new Error(
      (result && result.message) || "HubSpot search failed"
    );
    err.status = response.status;
    throw err;
  }

  const contact = result && result.results && result.results[0];
  if (!contact) {
    return false;
  }

  const contactEmail = normalizeEmail(
    contact.properties && contact.properties.email
  );
  const flag = String(
    (contact.properties && contact.properties[FORM_PROP]) || ""
  )
    .trim()
    .toLowerCase();

  return contactEmail === normalizeEmail(email) && flag === "yes";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = readBody(req);
  const email = normalizeEmail(body.email);

  if (!email) {
    send(res, 400, { error: "Email required" });
    return;
  }

  if (body.register === true) {
    registerEmail(email);
    send(res, 200, { success: true, registered: true });
    return;
  }

  try {
    if (loadLeads().indexOf(email) !== -1) {
      send(res, 200, { success: true });
      return;
    }

    const token = (process.env.HUBSPOT_ACCESS_TOKEN || "").trim();
    if (token) {
      const registered = await hubspotRegistered(token, email);
      if (registered) {
        registerEmail(email);
        send(res, 200, { success: true });
        return;
      }
    }

    send(res, 200, { success: false });
  } catch (err) {
    console.error("checkEmail:", err);
    send(res, 500, {
      error: "Server error",
      message: err && err.message ? err.message : "Unknown error",
    });
  }
};
