import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { addSubscriber } from "../../lib/airtable";
import {
  confirmationEmail,
  subjects,
  sender,
} from "../../lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { email, firstName, source } = req.body;

    // Validate email
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Add subscriber to Airtable
    const { subscriber, isNew, needsConfirmation } = await addSubscriber(
      normalizedEmail,
      {
        firstName: firstName?.trim(),
        source: source || "website",
      }
    );

    if (!subscriber) {
      console.error("Failed to add subscriber to Airtable");
      return res.status(500).json({ error: "Failed to subscribe" });
    }

    // Send confirmation email if needed
    if (needsConfirmation && subscriber.confirmToken) {
      const { error: emailError } = await resend.emails.send({
        from: sender.from,
        replyTo: sender.replyTo,
        to: normalizedEmail,
        subject: subjects.confirmation,
        html: confirmationEmail(subscriber.confirmToken, subscriber.firstName),
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        // Don't fail the request - subscriber is saved, email just didn't send
      }
    }

    return res.status(200).json({
      success: true,
      message: needsConfirmation
        ? "Check your inbox to confirm your subscription"
        : "You're already subscribed",
      isNew,
      needsConfirmation,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
