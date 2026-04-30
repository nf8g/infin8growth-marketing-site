import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { confirmSubscriber } from "../../lib/airtable";
import { welcomeEmail, subjects, sender } from "../../lib/email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET (user clicks link in email)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect("/subscribe-error.html?reason=missing-token");
    }

    // Confirm the subscriber
    const subscriber = await confirmSubscriber(token);

    if (!subscriber) {
      return res.redirect("/subscribe-error.html?reason=invalid-token");
    }

    // Send welcome email
    const { error: emailError } = await resend.emails.send({
      from: sender.from,
      replyTo: sender.replyTo,
      to: subscriber.email,
      subject: subjects.welcome,
      html: welcomeEmail(subscriber.firstName, subscriber.confirmToken),
    });

    if (emailError) {
      console.error("Resend welcome email error:", emailError);
      // Don't fail - subscriber is confirmed, welcome email just didn't send
    }

    // Redirect to success page
    return res.redirect("/subscribe-confirmed.html");
  } catch (error) {
    console.error("Confirm error:", error);
    return res.redirect("/subscribe-error.html?reason=server-error");
  }
}
