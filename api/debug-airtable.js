module.exports = async (req, res) => {
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_ID = process.env.AIRTABLE_SUBSCRIBERS_TABLE_ID;
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

  const results = {
    envVars: {
      AIRTABLE_BASE_ID: AIRTABLE_BASE_ID ? `SET (${AIRTABLE_BASE_ID.substring(0, 6)}...)` : "MISSING",
      AIRTABLE_SUBSCRIBERS_TABLE_ID: AIRTABLE_TABLE_ID ? `SET (${AIRTABLE_TABLE_ID.substring(0, 6)}...)` : "MISSING",
      AIRTABLE_TOKEN: AIRTABLE_TOKEN ? `SET (${AIRTABLE_TOKEN.substring(0, 6)}...)` : "MISSING",
    },
    readTest: null,
    writeTest: null,
  };

  // Test 1: Can we read from the table?
  try {
    const readUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?maxRecords=1`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });

    if (readRes.ok) {
      results.readTest = "SUCCESS";
    } else {
      const errorText = await readRes.text();
      results.readTest = `FAILED (${readRes.status}): ${errorText}`;
    }
  } catch (err) {
    results.readTest = `ERROR: ${err.message}`;
  }

  // Test 2: Can we write to the table? (same fields as subscribe API)
  try {
    const writeUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    const writeRes = await fetch(writeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [{
          fields: {
            "Email": "debug-full-test@example.com",
            "First Name": "DebugFirst",
            "Source": "debug-test",
            "Status": "pending",
            "Confirm Token": "test-token-123",
            "Subscribed At": new Date().toISOString(),
            "Company": "DebugCompany",
          },
        }],
      }),
    });

    if (writeRes.ok) {
      const data = await writeRes.json();
      results.writeTest = `SUCCESS - Created record: ${data.records[0].id}`;
    } else {
      const errorText = await writeRes.text();
      results.writeTest = `FAILED (${writeRes.status}): ${errorText}`;
    }
  } catch (err) {
    results.writeTest = `ERROR: ${err.message}`;
  }

  res.json(results);
};
