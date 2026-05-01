import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Check environment variables
  const envCheck = {
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ? "SET" : "MISSING",
    AIRTABLE_SUBSCRIBERS_TABLE_ID: process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID ? "SET" : "MISSING",
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN ? "SET" : "MISSING",
    RESEND_API_KEY: process.env.RESEND_API_KEY ? "SET" : "MISSING",
  };

  // Try a simple Airtable read
  let airtableTest = "NOT_TESTED";
  try {
    const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID}?maxRecords=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      },
    });

    if (response.ok) {
      airtableTest = "SUCCESS";
    } else {
      const errorText = await response.text();
      airtableTest = `FAILED: ${response.status} - ${errorText}`;
    }
  } catch (err) {
    airtableTest = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
  }

  return res.status(200).json({
    envCheck,
    airtableTest,
    timestamp: new Date().toISOString(),
  });
}
