import type { VercelRequest, VercelResponse } from "@vercel/node";
import { unsubscribeSubscriber } from "../../lib/airtable";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET (user clicks link in email)
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, email } = req.query;
    const identifier = (token || email) as string;

    if (!identifier) {
      return res.redirect("/unsubscribe-error.html?reason=missing-identifier");
    }

    // Unsubscribe the subscriber
    const subscriber = await unsubscribeSubscriber(identifier);

    if (!subscriber) {
      return res.redirect("/unsubscribe-error.html?reason=not-found");
    }

    // Redirect to confirmation page
    return res.redirect("/unsubscribed.html");
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return res.redirect("/unsubscribe-error.html?reason=server-error");
  }
}
