/**
 * Email templates for the Field Notes newsletter.
 * Matches Infin8 brand styling.
 */

const BRAND = {
  deepOcean: "#0e2840",
  gold: "#ffb700",
  textGray: "#374151",
  lightGray: "#9ca3af",
  white: "#ffffff",
};

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://infin8growth.ai";

/**
 * Base email wrapper with brand styling
 */
function emailWrapper(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: ${BRAND.textGray};">
      <div style="margin-bottom: 24px;">
        <span style="font-size: 13px; font-weight: 700; letter-spacing: 2px; color: ${BRAND.deepOcean}; text-transform: uppercase;">FIELD NOTES</span>
      </div>
      ${content}
      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: ${BRAND.lightGray}; line-height: 1.6; margin: 0;">
          Field Notes is a weekly letter from Infin8 Growth on AI infrastructure for knowledge-based businesses.<br/>
          Questions? Reply to this email and it'll reach us directly.
        </p>
      </div>
    </div>
  `;
}

/**
 * Confirmation email (double opt-in)
 * Sent immediately when someone subscribes
 */
export function confirmationEmail(token: string, firstName?: string): string {
  const confirmUrl = `${BASE_URL}/api/newsletter/confirm?token=${token}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  return emailWrapper(`
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.deepOcean}; margin: 0 0 8px;">
      Confirm your subscription
    </h1>
    <div style="width: 40px; height: 3px; background: ${BRAND.gold}; margin: 16px 0;"></div>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
      ${greeting}
    </p>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
      Thanks for signing up for Field Notes. One quick step: click the button below to confirm your subscription.
    </p>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 24px;">
      Once confirmed, you'll receive a weekly letter with practical insights on building AI infrastructure for knowledge-based businesses. No hype, no fluff, just what's working.
    </p>
    <a href="${confirmUrl}"
      style="display: inline-block; background: ${BRAND.gold}; color: ${BRAND.deepOcean}; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; letter-spacing: 0.5px;">
      Confirm Subscription
    </a>
    <p style="font-size: 13px; color: ${BRAND.lightGray}; margin-top: 24px; line-height: 1.6;">
      If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

/**
 * Welcome email
 * Sent after subscription is confirmed
 */
export function welcomeEmail(firstName?: string, unsubscribeToken?: string): string {
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
    : `${BASE_URL}/api/newsletter/unsubscribe`;
  const greeting = firstName ? `Welcome, ${firstName}.` : "Welcome aboard.";

  return emailWrapper(`
    <h1 style="font-size: 24px; font-weight: 700; color: ${BRAND.deepOcean}; margin: 0 0 8px;">
      ${greeting}
    </h1>
    <div style="width: 40px; height: 3px; background: ${BRAND.gold}; margin: 16px 0;"></div>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
      You're now subscribed to Field Notes.
    </p>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
      Every week, you'll get one email with practical insights on building AI infrastructure for knowledge-based businesses. Real patterns from real implementations. No promotional fluff.
    </p>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 16px;">
      <strong>What to expect:</strong>
    </p>
    <ul style="font-size: 15px; line-height: 1.75; margin: 0 0 24px; padding-left: 20px; color: ${BRAND.textGray};">
      <li>Implementation patterns that work</li>
      <li>Lessons from Foundation Installs</li>
      <li>Tool recommendations (honest ones)</li>
      <li>Strategic insights for business owners</li>
    </ul>
    <p style="font-size: 15px; line-height: 1.75; margin: 0 0 24px;">
      The first regular issue arrives next week. In the meantime, reply to this email if you have questions. I read every response.
    </p>
    <p style="font-size: 15px; line-height: 1.75; margin: 0;">
      Talk soon,<br/>
      <strong>Marshall Tuten</strong><br/>
      <span style="color: ${BRAND.lightGray};">Infin8 Growth</span>
    </p>
    <p style="font-size: 12px; color: ${BRAND.lightGray}; margin-top: 32px;">
      <a href="${unsubscribeUrl}" style="color: ${BRAND.lightGray};">Unsubscribe</a>
    </p>
  `);
}

/**
 * Email subject lines
 */
export const subjects = {
  confirmation: "Confirm your Field Notes subscription",
  welcome: "Welcome to Field Notes",
};

/**
 * Sender configuration
 */
export const sender = {
  from: "Field Notes <fieldnotes@infin8growth.ai>",
  replyTo: "marshall@infin8growth.ai",
};
