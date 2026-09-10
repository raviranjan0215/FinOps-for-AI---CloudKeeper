const HS_PORTAL = "47057450";
const HS_FORM = "9c9163c2-6f41-4369-bac9-8f4668c93889";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_MESSAGE =
  "This email ID is already registered. Please use another one.";
const BLOCKED_EMAIL_MESSAGE =
  "Use a work email. Gmail and other personal inboxes aren’t accepted.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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

async function contactExists(token, email) {
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
        properties: ["email"],
        limit: 1,
      }),
    }
  );

  const payload = await response.json().catch(function () {
    return null;
  });

  if (!response.ok) {
    console.error("lead: hubspot search failed", response.status, payload);
    throw new Error("search_failed");
  }

  return Boolean(payload && payload.total > 0);
}

async function submitHubSpotForm(email, context) {
  const body = {
    fields: [{ objectTypeId: "0-1", name: "email", value: email }],
    context: {},
  };

  if (context.pageUri) {
    body.context.pageUri = context.pageUri;
  }
  if (context.pageName) {
    body.context.pageName = context.pageName;
  }
  if (context.hutk) {
    body.context.hutk = context.hutk;
  }

  const response = await fetch(
    "https://api.hsforms.com/submissions/v3/integration/submit/" +
      HS_PORTAL +
      "/" +
      HS_FORM,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const payload = await response.json().catch(function () {
    return null;
  });

  if (!response.ok) {
    console.error("lead: hubspot submit failed", response.status, payload);
    const errors = payload && Array.isArray(payload.errors) ? payload.errors : [];
    const already =
      response.status === 409 ||
      errors.some(function (item) {
        var text = String((item && (item.errorType || item.message)) || "").toLowerCase();
        return text.includes("already") || text.includes("duplicate") || text.includes("existing");
      });
    if (already) {
      const err = new Error("already_registered");
      err.code = "already_registered";
      throw err;
    }
    const blocked = errors.some(function (item) {
      var text = String((item && (item.errorType || item.message)) || "").toLowerCase();
      return text.includes("blocked_email") || text.includes("not allowed");
    });
    if (blocked) {
      const err = new Error("blocked_email");
      err.code = "blocked_email";
      throw err;
    }
    throw new Error("submit_failed");
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    send(res, 405, { message: GENERIC_MESSAGE });
    return;
  }

  const body = readBody(req);
  const email = normalizeEmail(body.email);

  if (!EMAIL_RE.test(email)) {
    send(res, 400, { message: "Enter a valid work email." });
    return;
  }

  const token = (process.env.HUBSPOT_ACCESS_TOKEN || "").trim();

  try {
    if (token && (await contactExists(token, email))) {
      send(res, 409, { registered: true, message: DUPLICATE_MESSAGE });
      return;
    }

    await submitHubSpotForm(email, {
      pageUri: typeof body.pageUri === "string" ? body.pageUri.slice(0, 500) : "",
      pageName:
        typeof body.pageName === "string" ? body.pageName.slice(0, 200) : "FinOps for AI",
      hutk: typeof body.hutk === "string" ? body.hutk.slice(0, 200) : "",
    });

    send(res, 200, { ok: true });
  } catch (err) {
    if (err && err.code === "already_registered") {
      send(res, 409, { registered: true, message: DUPLICATE_MESSAGE });
      return;
    }
    if (err && err.code === "blocked_email") {
      send(res, 400, { message: BLOCKED_EMAIL_MESSAGE });
      return;
    }
    console.error("lead: request failed", err);
    send(res, 502, { message: GENERIC_MESSAGE });
  }
};
