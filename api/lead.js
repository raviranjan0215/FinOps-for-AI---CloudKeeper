const HS_PORTAL = "47057450";
const HS_FORM = "9c9163c2-6f41-4369-bac9-8f4668c93889";
const FORM_UNIQUE_CODE = "finops_for_ai_demo";
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

function normalizeUniqueCode(value) {
  return String(value || FORM_UNIQUE_CODE)
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

function submissionMatchesThisForm(item) {
  if (!item || typeof item !== "object") {
    return false;
  }
  var formId = String(item["form-id"] || item.formId || item.formGuid || "").toLowerCase();
  var pageUrl = String(item["page-url"] || item.pageUrl || "").toLowerCase();
  var title = String(item.title || item["form-name"] || "").toLowerCase();
  return (
    formId === HS_FORM.toLowerCase() ||
    pageUrl.indexOf("finops_for_ai_demo") !== -1 ||
    pageUrl.indexOf("full-stack-finops-for-ai") !== -1 ||
    title.indexOf("finops for ai") !== -1
  );
}

function uniqueCodeOnContact(properties) {
  if (!properties || typeof properties !== "object") {
    return "";
  }
  var keys = [
    "unique_code",
    "form_unique_code",
    "form_code",
    "campaign_code",
    "finops_for_ai_demo",
  ];
  for (var i = 0; i < keys.length; i++) {
    var node = properties[keys[i]];
    var value =
      node && typeof node === "object" && "value" in node ? node.value : node;
    if (normalizeUniqueCode(value) === FORM_UNIQUE_CODE) {
      return FORM_UNIQUE_CODE;
    }
  }
  return "";
}

async function alreadySubmittedThisForm(token, email) {
  const response = await fetch(
    "https://api.hubapi.com/contacts/v1/contact/email/" +
      encodeURIComponent(email) +
      "/profile",
    {
      headers: { Authorization: "Bearer " + token },
    }
  );

  if (response.status === 404) {
    return false;
  }

  const payload = await response.json().catch(function () {
    return null;
  });

  if (!response.ok) {
    console.error("lead: hubspot contact lookup failed", response.status, payload);
    throw new Error("search_failed");
  }

  if (uniqueCodeOnContact(payload && payload.properties)) {
    return true;
  }

  const submissions = Array.isArray(payload && payload["form-submissions"])
    ? payload["form-submissions"]
    : [];
  return submissions.some(submissionMatchesThisForm);
}

function hubSpotFields(email) {
  return [
    { objectTypeId: "0-1", name: "email", value: email },
    { objectTypeId: "0-1", name: "unique_code", value: FORM_UNIQUE_CODE },
  ];
}

function isUnknownFieldError(payload) {
  const errors = payload && Array.isArray(payload.errors) ? payload.errors : [];
  return errors.some(function (item) {
    var text = String((item && (item.errorType || item.message)) || "").toLowerCase();
    return (
      text.includes("unique_code") ||
      text.includes("invalid field") ||
      text.includes("unknown") ||
      text.includes("not a valid field")
    );
  });
}

async function postHubSpotForm(email, context, includeUniqueCode) {
  const fields = includeUniqueCode
    ? hubSpotFields(email)
    : [{ objectTypeId: "0-1", name: "email", value: email }];
  const body = {
    fields: fields,
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

  return { response: response, payload: payload };
}

function throwFromHubSpotFailure(response, payload) {
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

async function submitHubSpotForm(email, context) {
  let result = await postHubSpotForm(email, context, true);
  if (
    !result.response.ok &&
    isUnknownFieldError(result.payload)
  ) {
    result = await postHubSpotForm(email, context, false);
  }
  if (!result.response.ok) {
    throwFromHubSpotFailure(result.response, result.payload);
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
  const requestedCode = String(
    body.uniqueCode || body.unique_code || body.formCode || ""
  ).trim();
  const uniqueCode = requestedCode
    ? normalizeUniqueCode(requestedCode)
    : FORM_UNIQUE_CODE;

  if (!EMAIL_RE.test(email)) {
    send(res, 400, { message: "Enter a valid work email." });
    return;
  }

  if (uniqueCode !== FORM_UNIQUE_CODE) {
    send(res, 400, { message: GENERIC_MESSAGE });
    return;
  }

  const token = (process.env.HUBSPOT_ACCESS_TOKEN || "").trim();

  try {
    if (token && (await alreadySubmittedThisForm(token, email))) {
      send(res, 409, { registered: true, message: DUPLICATE_MESSAGE });
      return;
    }

    await submitHubSpotForm(email, {
      pageUri: typeof body.pageUri === "string" ? body.pageUri.slice(0, 500) : "",
      pageName:
        typeof body.pageName === "string" ? body.pageName.slice(0, 200) : "FinOps for AI",
      hutk: typeof body.hutk === "string" ? body.hutk.slice(0, 200) : "",
    });

    send(res, 200, { ok: true, uniqueCode: FORM_UNIQUE_CODE });
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
