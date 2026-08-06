/**
 * create-kit-draft.js
 * Creates a draft broadcast in Kit (ConvertKit) using the v4 API.
 *
 * IMPORTANT: This script creates DRAFTS only. It never auto-sends.
 * Marshall must review and send manually from the Kit dashboard.
 *
 * Usage: node scripts/create-kit-draft.js (called by publish.js)
 */

const BASE_URL = 'https://infin8growth.ai';
const KIT_API_BASE = 'https://api.kit.com/v4';

/**
 * Build the email HTML content (teaser + CTA)
 */
function buildEmailHtml({ title, teaser, slug }) {
  const postUrl = `${BASE_URL}/field-notes/${slug}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; background: #f5f3eb;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

    <!-- Header -->
    <p style="font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #0e2840; text-transform: uppercase; margin: 0 0 24px;">
      FIELD NOTES
    </p>

    <!-- Title -->
    <h1 style="font-size: 26px; font-weight: 700; color: #0e2840; line-height: 1.2; margin: 0 0 16px;">
      ${title}
    </h1>

    <!-- Accent line -->
    <div style="width: 48px; height: 3px; background: #ffb700; margin: 0 0 24px;"></div>

    <!-- Teaser -->
    <div style="font-size: 17px; line-height: 1.7; color: #374151; margin: 0 0 32px;">
      ${teaser.split('\n').map(p => `<p style="margin: 0 0 16px;">${p.trim()}</p>`).join('\n      ')}
    </div>

    <!-- CTA Button -->
    <a href="${postUrl}" style="display: inline-block; padding: 14px 28px; background: #cc8f00; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 2px;">
      Read the full issue &rarr;
    </a>

    <!-- Footer -->
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(14, 40, 64, 0.1);">
      <p style="font-size: 13px; color: #6b7280; margin: 0;">
        This is Field Notes from <a href="${BASE_URL}" style="color: #6b7280;">Infin8 Growth</a>.
      </p>
      <p style="font-size: 13px; color: #9ca3af; margin: 8px 0 0;">
        <a href="{{ unsubscribe_url }}" style="color: #9ca3af;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Create a draft broadcast in Kit
 * Returns the broadcast object or throws an error
 */
async function createBroadcastDraft({ title, teaser, slug, description }) {
  const KIT_API_KEY = process.env.KIT_API_KEY;

  if (!KIT_API_KEY) {
    throw new Error('KIT_API_KEY environment variable is not set');
  }

  const emailHtml = buildEmailHtml({ title, teaser, slug });
  const previewText = description || teaser.substring(0, 120);

  // Kit v4 API: Create a broadcast
  // POST /v4/broadcasts
  // Setting send_at to null creates a draft
  const response = await fetch(`${KIT_API_BASE}/broadcasts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIT_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_template_id: null, // Use default template
      subject: title,
      content: emailHtml,
      preview_text: previewText,
      public: false, // Don't publish to web archive
      // send_at: null means save as draft (don't schedule)
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kit API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.broadcast;
}

/**
 * Dry run mode: show what would be sent without calling the API
 */
function dryRun({ title, teaser, slug, description }) {
  console.log('\n=== DRY RUN: Kit Broadcast Draft ===\n');
  console.log('Subject:', title);
  console.log('Preview:', (description || teaser).substring(0, 120));
  console.log('Post URL:', `${BASE_URL}/field-notes/${slug}`);
  console.log('\nEmail HTML preview:');
  console.log('─'.repeat(50));
  console.log(buildEmailHtml({ title, teaser, slug }));
  console.log('─'.repeat(50));
  console.log('\nTo create the actual draft, run without --dry-run flag.');
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  // Example usage for testing
  const testData = {
    title: 'Test Field Notes Issue',
    teaser: 'This is a test teaser for the newsletter.\n\nIt can have multiple paragraphs.',
    slug: 'test-issue',
    description: 'A test issue for the Field Notes newsletter.',
  };

  if (isDryRun) {
    dryRun(testData);
  } else {
    console.log('This script is meant to be called by publish.js');
    console.log('Run with --dry-run to see a preview of the email.');
  }
}

module.exports = { createBroadcastDraft, buildEmailHtml, dryRun };
