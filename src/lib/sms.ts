type SmsPayload = {
  to: string;
  message: string;
};

/**
 * SMS vía Twilio (trial con créditos gratuitos).
 */
export async function sendSms(payload: SmsPayload): Promise<string | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.log("[sms:dev]", {
      to: payload.to,
      message: payload.message,
    });
    return null;
  }

  const body = new URLSearchParams({
    To: payload.to,
    From: from,
    Body: payload.message,
  });

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Twilio error ${res.status}: ${text}`);
  }

  try {
    const json = JSON.parse(text);
    return json.sid ?? null;
  } catch {
    return null;
  }
}
