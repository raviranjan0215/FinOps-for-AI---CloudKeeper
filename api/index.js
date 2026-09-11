/**
 * Local/Vercel stand-in for Drupal checkEmail.
 * Contract matches production: POST { email } → { success: true|false }
 * success: true  = already registered (finops_for_ai_demo === "yes") → block submit
 * success: false = not registered → allow HubSpot submit
 *
 * Set HUBSPOT_ACCESS_TOKEN in env (Drupal keeps the token server-side).
 */
const FORM_PROP = "finops_for_ai_demo";

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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    send(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = readBody(req);
  const email = String(body.email || "").trim();

  if (!email) {
    send(res, 400, { error: "Email required" });
    return;
  }

  const token = (process.env.HUBSPOT_ACCESS_TOKEN || "").trim();

  /* Without a token (local until you paste it), treat as not registered. */
  if (!token) {
    send(res, 200, { success: false });
    return;
  }

  try {
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
      console.error("checkEmail: hubspot search failed", response.status, result);
      send(res, 500, {
        error: "Server error",
        message: (result && result.message) || "HubSpot search failed",
      });
      return;
    }

    let isValid = false;
    const contact = result && result.results && result.results[0];

    if (contact) {
      const contactEmail = String(
        (contact.properties && contact.properties.email) || ""
      )
        .trim()
        .toLowerCase();
      const finopsFlag = String(
        (contact.properties && contact.properties[FORM_PROP]) || ""
      )
        .trim()
        .toLowerCase();

      if (contactEmail === email.toLowerCase() && finopsFlag === "yes") {
        isValid = true;
      }
    }

    send(res, 200, { success: isValid });
  } catch (err) {
    console.error("checkEmail:", err);
    send(res, 500, {
      error: "Server error",
      message: err && err.message ? err.message : "Unknown error",
    });
  }
};
