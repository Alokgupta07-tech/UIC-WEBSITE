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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const suppliedPayload: CertificateEmailPayload = await req.json();

    const authorization = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorization || !supabaseUrl || !publishableKey || !suppliedPayload.certificateId) {
      return new Response(JSON.stringify({ error: "Authentication and a certificate ID are required." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeaders = { apikey: publishableKey, Authorization: authorization, "Content-Type": "application/json" };
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
      `${supabaseUrl}/rest/v1/certificates?id=eq.${encodeURIComponent(suppliedPayload.certificateId)}&select=id,status,recipient_email,recipient_name,certificate_number,verification_token,role,team,custom_title,event_id`,
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "certificates@unstopignitersclub.com";
    const senderName = "Unstop Igniters Club — SRM AP";

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
                This tamper-evident digital credential was cryptographically signed and stored in official institutional records.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    if (resendApiKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${senderName} <${senderEmail}>`,
          to: [payload.recipientEmail],
          subject: `${title} — Unstop Igniters Club, SRM AP`,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Resend error: ${errText}`);
      }

      const resData = await res.json();
      return new Response(
        JSON.stringify({ success: true, messageId: resData.id, message: "Email sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Email delivery is not configured. Set RESEND_API_KEY in Supabase secrets and retry.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
