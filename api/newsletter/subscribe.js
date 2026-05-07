const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_URL = "https://infin8growth.ai";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

async function createSubscriber(email, firstName, company, source) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;

  const fields = {
    "Email": email,
    "First Name": firstName || "",
    "Source": source || "website",
    "Status": "subscribed",
    "Subscribed At": new Date().toISOString(),
  };

  // Only add Company if provided
  if (company) {
    fields["Company"] = company;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
    }),
  });

  if (!response.ok) {
    console.error("Airtable create error:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.records && data.records.length > 0 ? data.records[0] : null;
}

function welcomeEmailHTML(firstName, email) {
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `Welcome, ${firstName}.` : "Welcome.";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #374151;">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: #0e2840; text-transform: uppercase;">FIELD NOTES</span>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #0e2840; margin: 0 0 8px;">
        ${greeting}
      </h1>
      <div style="width: 40px; height: 3px; background: #ffb700; margin: 16px 0;"></div>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        This is Marshall Tuten. At some point we've found each other. Could've been YouTube, LinkedIn, our website, or some in-person event. By any means, my goal in reaching out to you is to provide you my weekly Field Notes: practical insights from someone who's actually wiring this stuff into businesses every week.
      </p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        Field Notes lands in your inbox from me and the team at Infin8. Here's what you're getting:
      </p>
      <ul style="font-size: 15px; line-height: 1.75; margin: 0 0 24px; padding-left: 20px; color: #374151;">
        <li>Patterns in what we're seeing from real AI Operating System installs (what's working, what's not)</li>
        <li>Honest tool recommendations</li>
        <li>Strategic thinking for business owners who want to build, not just buy</li>
        <li>Lessons I've learned the hard way</li>
      </ul>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        Oh… and if you have a particular area of expertise that could be useful as we engage with our clients down the road, we're always looking to collaborate.
      </p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        We avoid promotional fluff here. While I'll certainly attach some media here and there like a YouTube video, blog post, or something else, the goal is to provide valuable insight into what we're experiencing at Infin8 during this exciting time.
      </p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
        <strong>One thing I'd ask:</strong> when you read something that resonates (or something you disagree with), hit reply. We read responses and those replies shape what I write next.
      </p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0 0 24px;">
        And of course, if you don't want to hear from me at all, please <a href="${unsubscribeUrl}" style="color: #0e2840;">unsubscribe</a>.
      </p>
      <p style="font-size: 15px; line-height: 1.75; margin: 0;">
        Cheers,<br/>
        <strong>Marshall</strong>
      </p>
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.6; margin: 0;">
          Field Notes is a weekly letter from Infin8 Growth on AI infrastructure for knowledge-based businesses.<br/>
          Questions? Reply to this email and it'll reach us directly.
        </p>
      </div>
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
    const { email, firstName, company, source } = req.body;

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
      if (status === "subscribed" || status === "confirmed") {
        return res.status(200).json({ success: true, message: "Already subscribed" });
      }
    }

    // Create new subscriber
    const subscriber = await createSubscriber(normalizedEmail, firstName, company, source);

    if (!subscriber) {
      return res.status(500).json({ error: "Failed to subscribe" });
    }

    // Send welcome email immediately
    const { error: emailError } = await resend.emails.send({
      from: "Field Notes <fieldnotes@infin8growth.ai>",
      replyTo: "marshall@infin8growth.ai",
      to: normalizedEmail,
      subject: "Welcome to Field Notes",
      html: welcomeEmailHTML(firstName, normalizedEmail),
    });

    if (emailError) {
      console.error("Resend error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "You're subscribed! Check your inbox for a welcome email.",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
