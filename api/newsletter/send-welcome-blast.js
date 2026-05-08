const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_ID = process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_URL = "https://infin8growth.ai";

// Secret key to prevent unauthorized access
const BLAST_SECRET = process.env.NEWSLETTER_BLAST_SECRET;

function welcomeEmailHTML(firstName, email) {
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `Welcome, ${firstName}.` : "Welcome to Field Notes.";

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

async function getAllSubscribers() {
  const subscribers = [];
  let offset = null;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`);
    url.searchParams.set("filterByFormula", '{Status} = "subscribed"');
    url.searchParams.set("fields[]", "Email");
    url.searchParams.append("fields[]", "First Name");
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (!response.ok) {
      throw new Error(`Airtable error: ${await response.text()}`);
    }

    const data = await response.json();
    subscribers.push(...data.records);
    offset = data.offset;
  } while (offset);

  return subscribers;
}

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check secret key
  const { secret, dryRun, exclude } = req.body;

  if (!BLAST_SECRET) {
    return res.status(500).json({ error: "NEWSLETTER_BLAST_SECRET not configured in Vercel" });
  }

  if (secret !== BLAST_SECRET) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  try {
    // Get all subscribers
    let subscribers = await getAllSubscribers();

    // Exclude specific emails if provided
    const excludeList = exclude || [];
    if (excludeList.length > 0) {
      const excludeSet = new Set(excludeList.map(e => e.toLowerCase()));
      subscribers = subscribers.filter(s => !excludeSet.has(s.fields.Email.toLowerCase()));
    }

    if (dryRun) {
      // Just return the list without sending
      return res.status(200).json({
        dryRun: true,
        count: subscribers.length,
        subscribers: subscribers.map(s => ({
          email: s.fields.Email,
          firstName: s.fields["First Name"] || "(none)",
        })),
      });
    }

    // Send emails
    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const subscriber of subscribers) {
      const email = subscriber.fields.Email;
      const firstName = subscriber.fields["First Name"];

      try {
        const { error } = await resend.emails.send({
          from: "Field Notes <fieldnotes@infin8growth.ai>",
          replyTo: "marshall@infin8growth.ai",
          to: email,
          subject: "Welcome to Field Notes",
          html: welcomeEmailHTML(firstName, email),
        });

        if (error) {
          results.failed++;
          results.errors.push({ email, error: error.message });
        } else {
          results.sent++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        results.failed++;
        results.errors.push({ email, error: err.message });
      }
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Blast error:", error);
    return res.status(500).json({ error: error.message });
  }
};
