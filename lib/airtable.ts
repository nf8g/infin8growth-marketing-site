/**
 * Airtable helper functions for the newsletter subscriber system.
 * Uses Airtable REST API directly (no SDK) for simplicity.
 */

import { randomUUID } from "crypto";

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_SUBSCRIBERS_TABLE_ID = process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID!;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;

const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_SUBSCRIBERS_TABLE_ID}`;

export interface Subscriber {
  id?: string;
  email: string;
  firstName?: string;
  source: string;
  status: "pending" | "confirmed" | "unsubscribed";
  confirmToken?: string;
  subscribedAt?: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  tags?: string[];
}

interface AirtableRecord {
  id: string;
  fields: {
    Email: string;
    "First Name"?: string;
    Source?: string;
    Status?: string;
    "Confirm Token"?: string;
    "Subscribed At"?: string;
    "Confirmed At"?: string;
    "Unsubscribed At"?: string;
    Tags?: string[];
  };
}

/**
 * Convert Airtable record to Subscriber type
 */
function recordToSubscriber(record: AirtableRecord): Subscriber {
  return {
    id: record.id,
    email: record.fields.Email,
    firstName: record.fields["First Name"],
    source: record.fields.Source || "unknown",
    status: (record.fields.Status as Subscriber["status"]) || "pending",
    confirmToken: record.fields["Confirm Token"],
    subscribedAt: record.fields["Subscribed At"],
    confirmedAt: record.fields["Confirmed At"],
    unsubscribedAt: record.fields["Unsubscribed At"],
    tags: record.fields.Tags,
  };
}

/**
 * Find a subscriber by email
 */
export async function findSubscriberByEmail(
  email: string
): Promise<Subscriber | null> {
  const formula = encodeURIComponent(`{Email} = "${email}"`);
  const response = await fetch(`${AIRTABLE_URL}?filterByFormula=${formula}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    console.error("Airtable error:", await response.text());
    return null;
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
    return recordToSubscriber(data.records[0]);
  }
  return null;
}

/**
 * Find a subscriber by confirmation token
 */
export async function findSubscriberByToken(
  token: string
): Promise<Subscriber | null> {
  const formula = encodeURIComponent(`{Confirm Token} = "${token}"`);
  const response = await fetch(`${AIRTABLE_URL}?filterByFormula=${formula}`, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    console.error("Airtable error:", await response.text());
    return null;
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
    return recordToSubscriber(data.records[0]);
  }
  return null;
}

/**
 * Create a new subscriber
 */
export async function createSubscriber(
  subscriber: Omit<Subscriber, "id">
): Promise<Subscriber | null> {
  const response = await fetch(AIRTABLE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          fields: {
            Email: subscriber.email,
            "First Name": subscriber.firstName || "",
            Source: subscriber.source,
            Status: subscriber.status,
            "Confirm Token": subscriber.confirmToken || "",
            "Subscribed At": subscriber.subscribedAt || new Date().toISOString(),
            Tags: subscriber.tags || [],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Airtable create error:", await response.text());
    return null;
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
    return recordToSubscriber(data.records[0]);
  }
  return null;
}

/**
 * Update an existing subscriber
 */
export async function updateSubscriber(
  id: string,
  updates: Partial<Subscriber>
): Promise<Subscriber | null> {
  const fields: Record<string, unknown> = {};

  if (updates.firstName !== undefined) fields["First Name"] = updates.firstName;
  if (updates.source !== undefined) fields["Source"] = updates.source;
  if (updates.status !== undefined) fields["Status"] = updates.status;
  if (updates.confirmToken !== undefined)
    fields["Confirm Token"] = updates.confirmToken;
  if (updates.confirmedAt !== undefined)
    fields["Confirmed At"] = updates.confirmedAt;
  if (updates.unsubscribedAt !== undefined)
    fields["Unsubscribed At"] = updates.unsubscribedAt;
  if (updates.tags !== undefined) fields["Tags"] = updates.tags;

  const response = await fetch(AIRTABLE_URL, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          id,
          fields,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Airtable update error:", await response.text());
    return null;
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
    return recordToSubscriber(data.records[0]);
  }
  return null;
}

/**
 * Generate a unique confirmation token
 */
export function generateToken(): string {
  return randomUUID();
}

/**
 * Add or update a subscriber (upsert logic)
 * - If email exists and status is "unsubscribed", resubscribe them
 * - If email exists and status is "pending" or "confirmed", return existing
 * - If email doesn't exist, create new subscriber
 */
export async function addSubscriber(
  email: string,
  options: {
    firstName?: string;
    source?: string;
    tags?: string[];
    skipDoubleOptIn?: boolean;
  } = {}
): Promise<{
  subscriber: Subscriber | null;
  isNew: boolean;
  needsConfirmation: boolean;
}> {
  const existing = await findSubscriberByEmail(email);

  if (existing) {
    // Already confirmed - no action needed
    if (existing.status === "confirmed") {
      return { subscriber: existing, isNew: false, needsConfirmation: false };
    }

    // Still pending - resend confirmation
    if (existing.status === "pending") {
      return { subscriber: existing, isNew: false, needsConfirmation: true };
    }

    // Was unsubscribed - resubscribe them
    if (existing.status === "unsubscribed") {
      const token = generateToken();
      const updated = await updateSubscriber(existing.id!, {
        status: options.skipDoubleOptIn ? "confirmed" : "pending",
        confirmToken: token,
        confirmedAt: options.skipDoubleOptIn ? new Date().toISOString() : undefined,
        source: options.source || existing.source,
        tags: options.tags
          ? [...new Set([...(existing.tags || []), ...options.tags])]
          : existing.tags,
      });
      return {
        subscriber: updated,
        isNew: false,
        needsConfirmation: !options.skipDoubleOptIn,
      };
    }
  }

  // New subscriber
  const token = generateToken();
  const subscriber = await createSubscriber({
    email,
    firstName: options.firstName,
    source: options.source || "website",
    status: options.skipDoubleOptIn ? "confirmed" : "pending",
    confirmToken: token,
    subscribedAt: new Date().toISOString(),
    confirmedAt: options.skipDoubleOptIn ? new Date().toISOString() : undefined,
    tags: options.tags,
  });

  return {
    subscriber,
    isNew: true,
    needsConfirmation: !options.skipDoubleOptIn,
  };
}

/**
 * Confirm a subscriber by token
 */
export async function confirmSubscriber(
  token: string
): Promise<Subscriber | null> {
  const subscriber = await findSubscriberByToken(token);
  if (!subscriber || !subscriber.id) {
    return null;
  }

  if (subscriber.status === "confirmed") {
    return subscriber; // Already confirmed
  }

  return updateSubscriber(subscriber.id, {
    status: "confirmed",
    confirmedAt: new Date().toISOString(),
  });
}

/**
 * Unsubscribe a subscriber by email or token
 */
export async function unsubscribeSubscriber(
  emailOrToken: string
): Promise<Subscriber | null> {
  // Try to find by token first
  let subscriber = await findSubscriberByToken(emailOrToken);

  // If not found by token, try by email
  if (!subscriber) {
    subscriber = await findSubscriberByEmail(emailOrToken);
  }

  if (!subscriber || !subscriber.id) {
    return null;
  }

  if (subscriber.status === "unsubscribed") {
    return subscriber; // Already unsubscribed
  }

  return updateSubscriber(subscriber.id, {
    status: "unsubscribed",
    unsubscribedAt: new Date().toISOString(),
  });
}
