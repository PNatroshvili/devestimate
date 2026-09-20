import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: { message: { type: "string" } },
  required: ["message"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
    status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

  const body = await req.json();
  const safe = {
    clientName: String(body.clientName || "").slice(0, 160),
    company: String(body.company || "").slice(0, 160),
    projectName: String(body.projectName || "").slice(0, 180),
    projectType: String(body.type || ""),
    description: String(body.description || "").slice(0, 12000),
    features: Array.isArray(body.features) ? body.features.slice(0, 80).map(String) : [],
    flags: Array.isArray(body.flags) ? body.flags.slice(0, 20).map(String) : [],
    deadline: String(body.deadline || ""),
    requestedBudget: String(body.requestedBudget || ""),
    requestedBudgetCurrency: String(body.requestedBudgetCurrency || "GEL"),
    estimatedHours: Number(body.estimatedHours || 0),
    estimatedPrice: String(body.estimatedPrice || ""),
    stack: Array.isArray(body.stack) ? body.stack.slice(0, 12).map(String) : [],
    openQuestions: Array.isArray(body.openQuestions) ? body.openQuestions.slice(0, 12).map(String) : [],
    groups: Array.isArray(body.groups) ? body.groups.slice(0, 12) : [],
  };

  const system = [
    "შენ ხარ SKUP Studio-ს პროექტის მენეჯერი და ტექნიკური კომუნიკაციის სპეციალისტი.",
    "მოამზადე დამკვეთისთვის გასაგზავნი მოკლე ტექსტი ქართულ ენაზე, მეგობრული და პროფესიონალური ტონით.",
    "ტექსტი უნდა იყოს ბუნებრივი, გამართული ქართული და არა ზედმეტად ოფიციალური.",
    "არ გამოიყენო რთული ტექნიკური ჟარგონი იქ, სადაც მარტივი ქართული საკმარისია.",
    "ტექსტი უნდა იყოს მოკლე და კონკრეტული — დაახლოებით 120-180 სიტყვა.",
    "სტრუქტურა: მოკლე მისალმება; რა უნდა გაკეთდეს; ტექნიკური ნაწილი; ვადა; ღირებულება; დამატებითი მოთხოვნების შეთანხმება; მეგობრული დასასრული.",
    "ვადის აღწერისას ზუსტად გამოიყენე მოცემული საათები და მხოლოდ გონივრული პერიოდული შეფასება გააკეთე.",
    "ღირებულების ნაწილში ზუსტად გამოიყენე მოწოდებული ფასი; არ შეცვალო, არ გადაათვალო და არ დაამატო საათობრივი ტარიფი.",
    "არ ახსენო AI, შიდა შეფასება, შიდა პროცესი ან სირთულის ქულა.",
    "არ შეცვალო მოცემული რიცხვები, ტექნოლოგიები ან ვალუტები.",
    "არ გამოიყენო ზედმეტი ემოჯები; მაქსიმუმ ერთი მეგობრული ემოჯი დასაწყისში.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        { role: "user", content: [{ type: "input_text", text: JSON.stringify(safe) }] },
      ],
      text: { format: { type: "json_schema", name: "client_message", strict: true, schema } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return new Response(JSON.stringify({ ok: false, error: "OpenAI message generation failed", detail: detail.slice(0, 2500) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const result = await response.json();
  const outputText = result.output?.flatMap((item: any) => item.content || [])
    .find((item: any) => item.type === "output_text")?.text;

  if (!outputText) return new Response(JSON.stringify({ ok: false, error: "No message returned" }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

  const parsed = JSON.parse(outputText);
  return new Response(JSON.stringify({ message: parsed.message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
