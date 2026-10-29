// Supabase Edge Function: send-certificate-email
// Serves Deno runtime for sending high-touch appreciation & certificate emails via Resend.
// Deploy with: supabase functions deploy send-certificate-email
// Set secret: supabase secrets set RESEND_API_KEY=your_key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

interface CertificateEmailPayload {
  certificateId: string;
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  certificateNumber: string;
  verifyUrl: string;
  role?: string | null;
  team?: string | null;
  customTitle?: string | null;
  attachment: { filename: string; content: string };
  testRecipientEmail?: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const suppliedPayload: CertificateEmailPayload = await req.json().catch(() => ({} as CertificateEmailPayload));
  const authorization = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authHeaders = authorization && publishableKey
    ? { apikey: publishableKey, Authorization: authorization, "Content-Type": "application/json" }
    : null;
  let claimedForDelivery = false;
  let attemptNumber = 1;
  let deliveryEmail = "";
  let deliverySubject = "";

  try {
    if (!authHeaders || !supabaseUrl || !suppliedPayload.certificateId) {
      return new Response(JSON.stringify({ error: "Authentication and a certificate ID are required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/is_admin`, {
      method: "POST", headers: authHeaders, body: "{}",
    });
    if (!adminResponse.ok || await adminResponse.json() !== true) {
      return new Response(JSON.stringify({ error: "Only an authorized administrator can send certificate emails." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the record under the caller's JWT. This both enforces the existing
    // admin RLS policy and prevents forged recipient/details in the request.
    const certificateResponse = await fetch(
      `${supabaseUrl}/rest/v1/certificates?id=eq.${encodeURIComponent(suppliedPayload.certificateId)}&select=id,status,recipient_email,recipient_name,certificate_number,verification_token,role,team,custom_title,event_id,email_status`,
      { headers: authHeaders },
    );
    if (!certificateResponse.ok) throw new Error("Could not load the certificate for delivery.");
    const certificates = await certificateResponse.json();
    const record = certificates[0];
    if (!record || record.status !== "issued") {
      return new Response(JSON.stringify({ error: "The certificate does not exist or is not active." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!record.recipient_email) {
      return new Response(JSON.stringify({ error: "This certificate has no recipient email address." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const testRecipientEmail = suppliedPayload.testRecipientEmail?.trim().toLowerCase() || null;
    if (testRecipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipientEmail)) {
      return new Response(JSON.stringify({ error: "Enter a valid test recipient address." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      !suppliedPayload.attachment?.filename?.toLowerCase().endsWith(".pdf") ||
      !suppliedPayload.attachment.content ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(suppliedPayload.attachment.content) ||
      suppliedPayload.attachment.content.length > 10_000_000
    ) {
      return new Response(JSON.stringify({ error: "A valid signed certificate PDF is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const decodedAttachment = Uint8Array.from(atob(suppliedPayload.attachment.content), (character) => character.charCodeAt(0));
    if (new TextDecoder().decode(decodedAttachment.subarray(0, 5)) !== "%PDF-") {
      return new Response(JSON.stringify({ error: "The attachment is not a valid PDF file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventResponse = await fetch(
      `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(record.event_id)}&select=title`,
      { headers: authHeaders },
    );
    if (!eventResponse.ok) throw new Error("Could not load the certificate event.");
    const events = await eventResponse.json();
    let siteOrigin: string;
    try {
      const providedUrl = new URL(suppliedPayload.verifyUrl);
      const expectedOrigin = Deno.env.get("SITE_URL") ?? req.headers.get("origin");
      if (!expectedOrigin || providedUrl.origin !== new URL(expectedOrigin).origin || !providedUrl.pathname.startsWith("/verify/certificate/")) {
        throw new Error("URL mismatch");
      }
      siteOrigin = providedUrl.origin;
    } catch {
      return new Response(JSON.stringify({ error: "Certificate verification URL is not configured correctly." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: CertificateEmailPayload = {
      certificateId: record.id,
      recipientEmail: record.recipient_email,
      recipientName: record.recipient_name,
      certificateNumber: record.certificate_number,
      eventTitle: events[0]?.title ?? "UIC event",
      verifyUrl: `${siteOrigin}/verify/certificate/${record.verification_token}`,
      role: record.role,
      team: record.team,
      customTitle: record.custom_title,
    };

    deliveryEmail = record.recipient_email;
    deliverySubject = `Your Certificate | Unstop Igniters Club – ${events[0]?.title ?? "UIC Event"}`;
    if (!testRecipientEmail) {
      const logsResponse = await fetch(
        `${supabaseUrl}/rest/v1/certificate_email_logs?certificate_id=eq.${encodeURIComponent(record.id)}&select=attempt_count&order=last_attempt_at.desc&limit=1`,
        { headers: authHeaders },
      );
      if (logsResponse.ok) {
        const previousLogs = await logsResponse.json();
        attemptNumber = Math.max(1, Number(previousLogs?.[0]?.attempt_count ?? 0) + 1);
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL")?.trim().toLowerCase();
    const senderName = "Unstop Igniters Club | SRM University–AP";
    if (!resendApiKey || senderEmail !== "club.igniter@srmap.edu.in") {
      return new Response(JSON.stringify({
        success: false,
        error: "Email delivery is not configured for the authorized UIC sender. Configure RESEND_API_KEY and the verified SENDER_EMAIL secret.",
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const title = escapeHtml(payload.customTitle || (payload.role ? `Certificate of Appreciation (${payload.role})` : "Official Certificate of Achievement"));
    const recipientName = escapeHtml(payload.recipientName);
    const eventTitle = escapeHtml(payload.eventTitle);
    const certificateNumber = escapeHtml(payload.certificateNumber);
    const roleBadges = [payload.role, payload.team].filter(Boolean).map((value) => escapeHtml(value)).join(" • ");
    let verifyUrl: string;
    try {
      const parsedUrl = new URL(payload.verifyUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") throw new Error("invalid protocol");
      verifyUrl = escapeHtml(parsedUrl.toString());
    } catch {
      return new Response(JSON.stringify({ error: "Invalid certificate verification URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Claim the certificate atomically before calling the provider. The
    // conditional update makes parallel clicks and direct endpoint retries
    // unable to create a second message while a send is in progress.
    if (!testRecipientEmail) {
      const staleSendingCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const claimQuery = new URLSearchParams({
        id: `eq.${record.id}`,
        status: "eq.issued",
        or: `(email_status.in.(pending,failed,skipped),email_status.is.null,and(email_status.eq.sending,updated_at.lt.${staleSendingCutoff}))`,
        select: "id",
      });
      const claimResponse = await fetch(`${supabaseUrl}/rest/v1/certificates?${claimQuery.toString()}`, {
        method: "PATCH",
        headers: { ...authHeaders, Prefer: "return=representation" },
        body: JSON.stringify({ email_status: "sending", email_error: null }),
      });
      if (!claimResponse.ok) throw new Error("Could not reserve this certificate for email delivery.");
      const claimedRows = await claimResponse.json();
      if (!claimedRows.length) {
        return new Response(JSON.stringify({ error: record.email_status === "sent" ? "This certificate was already accepted by the provider." : "This certificate is already being sent. Wait before retrying." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      claimedForDelivery = true;
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding: 36px 30px 24px; background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); border-bottom: 2px solid #d97706;">
              <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; letter-spacing: 3px; color: #f59e0b; text-transform: uppercase;">SRM University–AP</p>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">UNSTOP IGNITERS CLUB</h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #cbd5e1;">Official Digital Credential & Verification Registry</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 30px 28px;">
              <p style="margin: 0 0 18px; font-size: 16px; line-height: 24px; color: #e2e8f0;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #cbd5e1;">
                On behalf of <strong>Unstop Igniters Club, SRM University–AP</strong>, we are proud and privileged to confer your official <strong>${title}</strong> for your exemplary contributions to <strong>${eventTitle}</strong>.
              </p>

              ${roleBadges ? `
              <div style="margin: 0 0 24px; padding: 12px 18px; background-color: rgba(30, 58, 138, 0.4); border-left: 4px solid #3b82f6; border-radius: 6px;">
                <p style="margin: 0; font-size: 13px; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 1px;">Recognized Capacity</p>
                <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #ffffff;">${roleBadges}</p>
              </div>` : ""}

              <!-- Credential Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 28px; background-color: #1e293b; border: 1px dashed #475569; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8;">Certificate Number</p>
                    <p style="margin: 4px 0 0; font-family: monospace; font-size: 15px; font-weight: 700; color: #f59e0b;">${certificateNumber}</p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #065f46; color: #a7f3d0; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">VERIFIED</span>
                  </td>
                </tr>
              </table>

              <!-- Call to Action -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                      View & Download Official PDF Certificate →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center;">
                You can also share this permanent verification link on LinkedIn or your portfolio.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                Unstop Igniters Club • SRM University–AP, Andhra Pradesh
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                This certificate is listed in the Unstop Igniters Club verification registry.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    {
      const subject = deliverySubject;
      const plainText = `Dear ${payload.recipientName},\n\nCongratulations!\n\nThank you for being part of ${payload.eventTitle}, organized by Unstop Igniters Club, SRM University–AP. We are pleased to share your ${payload.customTitle || payload.role || "certificate"}. Your signed certificate PDF is attached. You can also verify it at ${payload.verifyUrl}.\n\nWarm regards,\nUnstop Igniters Club\nSRM University–AP\nOfficial email: club.igniter@srmap.edu.in`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": testRecipientEmail
            ? `uic-certificate-test-${crypto.randomUUID()}`
            : `uic-certificate-${record.id}`,
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [testRecipientEmail ?? payload.recipientEmail],
          subject,
          html: htmlBody,
          text: plainText,
          attachments: [{
            filename: suppliedPayload.attachment.filename.replace(/[^A-Za-z0-9_.-]/g, "_"),
            content: suppliedPayload.attachment.content,
          }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend error: ${errText}`);
      }

      const resData = await res.json();
      if (!testRecipientEmail) {
        const acceptedAt = new Date().toISOString();
        const statusResponse = await fetch(`${supabaseUrl}/rest/v1/certificates?id=eq.${encodeURIComponent(record.id)}`, {
          method: "PATCH",
          headers: { ...authHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ email_status: "sent", email_sent_at: acceptedAt, email_error: null }),
        });
        if (!statusResponse.ok) throw new Error("Provider accepted the email, but the certificate status could not be recorded.");
        claimedForDelivery = false;
        await fetch(`${supabaseUrl}/rest/v1/certificate_email_logs`, {
          method: "POST",
          headers: { ...authHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({
            certificate_id: record.id,
            recipient_email: deliveryEmail,
            subject: deliverySubject,
            provider_message_id: resData.id,
            status: "sent",
            attempt_count: attemptNumber,
            last_attempt_at: acceptedAt,
          }),
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          messageId: resData.id,
          message: testRecipientEmail ? "Test email accepted by provider" : "Email accepted by provider",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (claimedForDelivery && authHeaders && supabaseUrl && suppliedPayload.certificateId) {
      const failedAt = new Date().toISOString();
      await fetch(`${supabaseUrl}/rest/v1/certificates?id=eq.${encodeURIComponent(suppliedPayload.certificateId)}&email_status=eq.sending`, {
        method: "PATCH",
        headers: { ...authHeaders, Prefer: "return=minimal" },
        body: JSON.stringify({ email_status: "failed", email_error: message }),
      }).catch(() => undefined);
      if (deliveryEmail) {
        await fetch(`${supabaseUrl}/rest/v1/certificate_email_logs`, {
          method: "POST",
          headers: { ...authHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({
            certificate_id: suppliedPayload.certificateId,
            recipient_email: deliveryEmail,
            subject: deliverySubject || null,
            status: "failed",
            attempt_count: attemptNumber,
            last_attempt_at: failedAt,
            error_details: message.slice(0, 500),
          }),
        }).catch(() => undefined);
      }
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
