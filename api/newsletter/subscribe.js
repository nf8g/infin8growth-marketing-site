const { Resend } = require("resend");
const crypto = require("crypto");

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_URL = "https://infin8growth.ai";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateToken() {
  return crypto.randomUUID();
}

async function findSubscriberByEmail(email) {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula=${formula}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.records && data.records.length > 0 ? data.records[0] : null;
}

async function createSubscriber(email, firstName, source, token) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{
        fields: {
          "Email": email,
          "First Name": firstName || "",
          "Source": source || "website",
          "Status": "pending",
          "Confirm Token": token,
          "Subscribed At": new Date().toISOString(),
        },
      }],
    }),
  });

  if (!response.ok) {
    console.error("Airtable create error:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.records && data.records.length > 0 ? data.records[0] : null;
}

function confirmationEmailHTML(token, firstName) {
  const confirmUrl = `${BASE_URL}/api/newsletter/confirm?token=${token}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #374151;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #0e2840; text-transform: uppercase;">FIELD NOTES</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #0e2840; margin: 0 0 8px;">
        Confirm your subscription
      </h1>
      <div style="width: 40px; height: 3px; background: #ffb700; margin: 16px 0;"></div>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">${greeting}</p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        Thanks for signing up for Field Notes. Click the button below to confirm your subscription.
      </p>
      <a href="${confirmUrl}"
        style="display: inline-block; background: #ffb700; color: #0e2840; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none;">
        Confirm Subscription
      </a>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 24px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, firstName, source } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if already subscribed
    const existing = await findSubscriberByEmail(normalizedEmail);
    if (existing) {
      const status = existing.fields.Status;
      if (status === "confirmed") {
        return res.status(200).json({ success: true, message: "Already subscribed" });
      }
    }

    // Create new subscriber
    const token = generateToken();
    const subscriber = await createSubscriber(normalizedEmail, firstName, source, token);

    if (!subscriber) {
      return res.status(500).json({ error: "Failed to subscribe" });
    }

    // Send confirmation email
    const { error: emailError } = await resend.emails.send({
      from: "Field Notes <fieldnotes@infin8growth.ai>",
      replyTo: "marshall@infin8growth.ai",
      to: normalizedEmail,
      subject: "Confirm your Field Notes subscription",
      html: confirmationEmailHTML(token, firstName),
    });

    if (emailError) {
      console.error("Resend error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Check your inbox to confirm your subscription",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
