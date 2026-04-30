import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { addSubscriber } from "../../lib/airtable";
import { welcomeEmail, subjects, sender } from "../../lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Gumroad Webhook Handler
 *
 * Gumroad sends POST requests with form-urlencoded data on various events.
 * We're interested in successful sales to add customers to the newsletter.
 *
 * Key fields in the payload:
 * - email: buyer's email
 * - full_name: buyer's full name
 * - product_name: name of the product purchased
 * - sale_timestamp: when the sale occurred
 * - seller_id: your Gumroad seller ID (for verification)
 *
 * Configure webhook in Gumroad:
 * Settings > Advanced > Ping (webhook URL)
 * URL: https://infin8growth.ai/api/webhook/gumroad
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Gumroad sends form-urlencoded data, Vercel parses it into req.body
    const {
      email,
      full_name,
      product_name,
      seller_id,
    } = req.body;

    // Basic validation
    if (!email) {
      console.error("Gumroad webhook: missing email");
      return res.status(400).json({ error: "Missing email" });
    }

    // Optional: Verify this is from your Gumroad account
    // Uncomment and set GUMROAD_SELLER_ID env var to enable
    // const expectedSellerId = process.env.GUMROAD_SELLER_ID;
    // if (expectedSellerId && seller_id !== expectedSellerId) {
    //   console.error("Gumroad webhook: invalid seller_id");
    //   return res.status(403).json({ error: "Invalid seller" });
    // }

    const normalizedEmail = email.toLowerCase().trim();

    // Extract first name from full name
    const firstName = full_name?.split(" ")[0]?.trim();

    // Add to newsletter list
    // skipDoubleOptIn: true because they've already provided email via purchase
    const { subscriber, isNew } = await addSubscriber(normalizedEmail, {
      firstName,
      source: "gumroad",
      tags: ["purchased", product_name].filter(Boolean),
      skipDoubleOptIn: true, // Purchases = implicit opt-in
    });

    if (!subscriber) {
      console.error("Gumroad webhook: failed to add subscriber");
      return res.status(500).json({ error: "Failed to add subscriber" });
    }

    // Send welcome email only if this is a new subscriber
    if (isNew) {
      const { error: emailError } = await resend.emails.send({
        from: sender.from,
        replyTo: sender.replyTo,
        to: normalizedEmail,
        subject: subjects.welcome,
        html: welcomeEmail(firstName, subscriber.confirmToken),
      });

      if (emailError) {
        console.error("Gumroad webhook: welcome email error:", emailError);
        // Don't fail - subscriber is added
      }
    }

    console.log(
      `Gumroad webhook: ${isNew ? "Added" : "Updated"} subscriber ${normalizedEmail} from purchase of ${product_name}`
    );

    return res.status(200).json({
      success: true,
      isNew,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error("Gumroad webhook error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
