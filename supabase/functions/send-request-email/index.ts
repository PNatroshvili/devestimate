import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const toEmail = Deno.env.get("NOTIFICATION_EMAIL_TO") || "paatanatro77@gmail.com";
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "SKUP Studio <onboarding@resend.dev>";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listHtml(items: unknown[]) {
  if (!items.length) return "<span style=\"color:#7a818c\">—</span>";
  return "<ul style=\"margin:8px 0 0 20px;padding:0\">" +
    items.map((item) => "<li style=\"margin:4px 0\">" + esc(item) + "</li>").join("") +
    "</ul>";
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    if (!resendApiKey) return json({ ok: false, provider: "resend", reason: "RESEND_API_KEY missing" }, 200);
    const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
    if (!openaiKey) return json({ ok: false, provider: "openai", reason: "OPENAI_API_KEY missing" }, 200);
    const [baseResponse, textModelResponse, imageModelResponse] = await Promise.all([
      fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + openaiKey } }),
      fetch("https://api.openai.com/v1/models/gpt-5.4", { headers: { Authorization: "Bearer " + openaiKey } }),
      fetch("https://api.openai.com/v1/models/gpt-image-1.5", { headers: { Authorization: "Bearer " + openaiKey } }),
    ]);
    const detail = baseResponse.ok ? null : (await baseResponse.text()).slice(0, 1500);
    const textDetail = textModelResponse.ok ? null : (await textModelResponse.text()).slice(0, 1500);
    const imageDetail = imageModelResponse.ok ? null : (await imageModelResponse.text()).slice(0, 1500);
    return json({
      ok: baseResponse.ok && textModelResponse.ok && imageModelResponse.ok,
      provider: "openai",
      status: baseResponse.status,
      textModel: { ok: textModelResponse.ok, status: textModelResponse.status, detail: textDetail },
      imageModel: { ok: imageModelResponse.ok, status: imageModelResponse.status, detail: imageDetail },
      detail,
    }, 200);
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!resendApiKey) return json({ error: "RESEND_API_KEY is not configured" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const requestId = String(body.requestId || "").trim();
  const requestToken = String(body.requestToken || "").trim();
  if (!requestId || !requestToken) return json({ error: "requestId and requestToken are required" }, 400);

  const { data: request, error } = await admin
    .from("client_requests")
    .select("id,request_token,project_name,client_name,company,email,phone,type,description,features,deadline,budget,budget_currency,flags,notes,analysis,status,created_at,email_notification_sent_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!request) return json({ error: "Request not found" }, 404);
  if (request.request_token !== requestToken) return json({ error: "Invalid request token" }, 403);
  if (request.email_notification_sent_at) return json({ ok: true, alreadySent: true });

  const features = Array.isArray(request.features) ? request.features : [];
  const flags = Array.isArray(request.flags) ? request.flags : [];
  const analysis = request.analysis && typeof request.analysis === "object" ? request.analysis as Record<string, unknown> : {};
  const dashboardUrl = "https://estimate.skup.ge/?requestId=" + encodeURIComponent(String(request.id));
  const subject = "🆕 ახალი პროექტის მოთხოვნა — " + String(request.project_name || "ახალი მოთხოვნა");

  const html =
    "<div style=\"font-family:Arial,Helvetica,sans-serif;background:#f5f6f8;padding:32px 16px;color:#17191f\">" +
      "<div style=\"max-width:720px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden\">" +
        "<div style=\"padding:26px 28px;border-bottom:1px solid #eceef2\">" +
          "<div style=\"font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7b8190\">SKUP Studio</div>" +
          "<h1 style=\"margin:8px 0 0;font-size:25px;line-height:1.25\">ახალი პროექტის მოთხოვნა</h1>" +
          "<p style=\"margin:8px 0 0;color:#666d78\">ახალი client request შემოვიდა საჯარო ფორმიდან.</p>" +
        "</div>" +
        "<div style=\"padding:26px 28px\">" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">პროექტი</h2>" +
          "<div style=\"background:#f8f9fb;border-radius:12px;padding:16px\"><div style=\"font-size:22px;font-weight:700\">" + esc(request.project_name) + "</div><div style=\"margin-top:6px;color:#6b7280\">" + esc(request.type) + "</div></div>" +
          "<div style=\"height:22px\"></div>" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">კლიენტი</h2>" +
          "<table style=\"width:100%;border-collapse:collapse;font-size:14px\">" +
            "<tr><td style=\"padding:7px 0;color:#737985;width:140px\">სახელი</td><td style=\"padding:7px 0;font-weight:600\">" + esc(request.client_name) + "</td></tr>" +
            "<tr><td style=\"padding:7px 0;color:#737985\">კომპანია</td><td style=\"padding:7px 0\">" + esc(request.company || "—") + "</td></tr>" +
            "<tr><td style=\"padding:7px 0;color:#737985\">ელფოსტა</td><td style=\"padding:7px 0\">" + esc(request.email || "—") + "</td></tr>" +
            "<tr><td style=\"padding:7px 0;color:#737985\">ტელეფონი</td><td style=\"padding:7px 0\">" + esc(request.phone || "—") + "</td></tr>" +
          "</table>" +
          "<div style=\"height:22px\"></div>" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">მოთხოვნა</h2>" +
          "<div style=\"font-size:14px;line-height:1.7;white-space:pre-wrap\">" + esc(request.description) + "</div>" +
          "<div style=\"height:22px\"></div>" +
          "<table style=\"width:100%;border-collapse:collapse;font-size:14px\"><tr>" +
            "<td style=\"vertical-align:top;width:50%;padding:14px;border:1px solid #eceef2\"><div style=\"color:#737985\">ჩაბარების ვადა</div><div style=\"margin-top:5px;font-weight:700\">" + esc(request.deadline || "—") + "</div></td>" +
            "<td style=\"width:16px\"></td>" +
            "<td style=\"vertical-align:top;width:50%;padding:14px;border:1px solid #eceef2\"><div style=\"color:#737985\">ბიუჯეტი</div><div style=\"margin-top:5px;font-weight:700\">" + esc(request.budget ? String(request.budget_currency || "GEL") + " " + String(request.budget) : "—") + "</div></td>" +
          "</tr></table>" +
          "<div style=\"height:22px\"></div>" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">ძირითადი ფუნქციები</h2>" + listHtml(features) +
          "<div style=\"height:18px\"></div>" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">დამატებითი მოთხოვნები</h2>" + listHtml(flags) +
          "<div style=\"height:18px\"></div>" +
          "<h2 style=\"margin:0 0 14px;font-size:17px\">საწყისი შეფასება</h2>" +
          "<table style=\"width:100%;border-collapse:collapse;font-size:14px\">" +
            "<tr><td style=\"padding:6px 0;color:#737985\">საათები</td><td style=\"padding:6px 0;font-weight:700\">" + esc(analysis.hours ? String(analysis.hours) + " სთ" : "—") + "</td></tr>" +
            "<tr><td style=\"padding:6px 0;color:#737985\">სირთულე</td><td style=\"padding:6px 0;font-weight:700\">" + esc(analysis.complexity ? String(analysis.complexity) + " / 10" : "—") + "</td></tr>" +
            "<tr><td style=\"padding:6px 0;color:#737985\">Confidence</td><td style=\"padding:6px 0;font-weight:700\">" + esc(analysis.confidence ? String(analysis.confidence) + "%" : "—") + "</td></tr>" +
          "</table>" +
          (request.notes ? "<div style=\"height:18px\"></div><h2 style=\"margin:0 0 14px;font-size:17px\">შენიშვნა</h2><div style=\"font-size:14px;line-height:1.7;white-space:pre-wrap\">" + esc(request.notes) + "</div>" : "") +
          "<div style=\"height:28px\"></div>" +
          "<a href=\"" + dashboardUrl + "\" style=\"display:inline-block;background:#17191f;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700\">Open DevEstimate</a>" +
        "</div>" +
        "<div style=\"padding:18px 28px;border-top:1px solid #eceef2;color:#858b95;font-size:12px\">Request ID: " + esc(request.id) + "<br/>" + esc(new Date(request.created_at).toLocaleString("ka-GE")) + "</div>" +
      "</div>" +
    "</div>";

  const text = [
    "SKUP Studio — ახალი პროექტის მოთხოვნა",
    "",
    "პროექტი: " + String(request.project_name || ""),
    "ტიპი: " + String(request.type || ""),
    "კლიენტი: " + String(request.client_name || ""),
    "კომპანია: " + String(request.company || "—"),
    "ელფოსტა: " + String(request.email || "—"),
    "ტელეფონი: " + String(request.phone || "—"),
    "",
    "მოთხოვნა:",
    String(request.description || ""),
    "",
    "ჩაბარების ვადა: " + String(request.deadline || "—"),
    "ბიუჯეტი: " + (request.budget ? String(request.budget_currency || "GEL") + " " + String(request.budget) : "—"),
    "ფუნქციები: " + (features.length ? features.join(", ") : "—"),
    "დამატებითი მოთხოვნები: " + (flags.length ? flags.join(", ") : "—"),
    "",
    "საწყისი შეფასება:",
    "საათები: " + String(analysis.hours || "—"),
    "სირთულე: " + String(analysis.complexity ? analysis.complexity + "/10" : "—"),
    "Confidence: " + String(analysis.confidence ? analysis.confidence + "%" : "—"),
    "",
    "Dashboard: " + dashboardUrl,
    "Request ID: " + String(request.id),
  ].join("\n");

  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + resendApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
      text,
      ...(request.email ? { reply_to: request.email } : {}),
    }),
  });

  if (!resend.ok) {
    const detail = await resend.text();
    await admin.from("client_requests").update({
      email_notification_error: detail.slice(0, 2000),
    }).eq("id", request.id);
    return json({ error: "Email delivery failed" }, 502);
  }

  await admin.from("client_requests").update({
    email_notification_sent_at: new Date().toISOString(),
    email_notification_error: null,
  }).eq("id", request.id);

  return json({ ok: true });
});
