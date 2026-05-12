/**
 * Minimal email sender.
 * - Si RESEND_API_KEY está definido → usa la API REST de Resend
 * - Si no → imprime en consola (modo dev)
 */

type EmailPayload = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'NEXUM <noreply@nexum.app>'

  if (!apiKey) {
    console.log('[email:dev-mode] No RESEND_API_KEY, printing payload:', {
      to: payload.to,
      subject: payload.subject,
      from,
      htmlLength: payload.html.length,
    })
    return null
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    })

    const body = await res.text()

    if (!res.ok) {
      const errorMsg = `Resend error ${res.status}: ${body}`
      console.error('[email:resend-error]', errorMsg)
      throw new Error(errorMsg)
    }

    try {
      const json = JSON.parse(body)
      console.log('[email:success]', { to: payload.to, messageId: json.id })
      return json.id ?? json.messageId ?? null
    } catch {
      console.log('[email:success] (unparseable response)', { to: payload.to })
      return null
    }
  } catch (err) {
    console.error('[email:fatal]', err instanceof Error ? err.message : String(err))
    throw err
  }
}
