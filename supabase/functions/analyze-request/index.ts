const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    rationale: { type: "string" },
    hours: { type: "integer" },
    complexity: { type: "integer" },
    confidence: { type: "integer" },
    recommendedStack: {
      type: "array",
      items: { type: "string" },
    },
    missingRequirements: {
      type: "array",
      items: { type: "string" },
    },
    assumptions: { type: "array", items: { type: "string" } },
    modules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          hours: { type: "integer" },
          priority: { type: "string", enum: ["core", "secondary"] },
        },
        required: ["name", "description", "hours", "priority"],
      },
    },
    architecture: {
      type: "object",
      additionalProperties: false,
      properties: {
        frontend: { type: "array", items: { type: "string" } },
        backend: { type: "array", items: { type: "string" } },
        data: { type: "array", items: { type: "string" } },
        auth: { type: "array", items: { type: "string" } },
        infra: { type: "array", items: { type: "string" } },
      },
      required: ["frontend", "backend", "data", "auth", "infra"],
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string", enum: ["low", "medium", "high"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["level", "title", "detail"],
      },
    },
    timelineWeeks: { type: "integer" },
    milestones: { type: "array", items: { type: "string" } },
    featureGroups: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          count: { type: "integer" },
          hours: { type: "integer" },
        },
        required: ["name", "count", "hours"],
      },
    },
  },
  required: [
    "summary",
    "rationale",
    "hours",
    "complexity",
    "recommendedStack",
    "missingRequirements",
    "featureGroups",
    "modules",
    "architecture",
    "risks",
    "assumptions",
    "timelineWeeks",
    "milestones",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const projectName = String(body.projectName || "").slice(0, 180);
  const type = String(body.type || "Web");
  const description = String(body.description || "").slice(0, 12000);
  const features = Array.isArray(body.features) ? body.features.slice(0, 60).map(String) : [];
  const flags = Array.isArray(body.flags) ? body.flags.slice(0, 20).map(String) : [];
  const deadline = String(body.deadline || "");
  const notes = String(body.notes || "").slice(0, 5000);

  const input = [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text:
            "You are the senior software architect and estimation lead for SKUP Studio. Analyze the complete project brief conservatively. Recommend a practical architecture, technology stack, module breakdown, risks, assumptions, confidence, hours and timeline. Confidence is 0-100 and reflects how complete and unambiguous the brief is. Estimate engineering effort including implementation, integrations, QA and deployment. TimelineWeeks assumes roughly 30 engineering hours per week. Do not provide price, hourly rate, currency or commercial quote. Return only the requested JSON schema.",
        },
      ],
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: JSON.stringify({
            projectName,
            projectType: type,
            description,
            features,
            scopeFlags: flags,
            deadline,
            notes,
          }),
        },
      ],
    },
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      reasoning: { effort: "low" },
      input,
      text: {
        format: {
          type: "json_schema",
          name: "project_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return new Response(JSON.stringify({ ok: false, error: "OpenAI analysis failed", detail: detail.slice(0, 3000) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await response.json();
  const outputText = result.output
    ?.flatMap((item: any) => item.content || [])
    .find((item: any) => item.type === "output_text")?.text;

  if (!outputText) {
    return new Response(JSON.stringify({ error: "No structured analysis returned" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let analysis: any;
  try {
    analysis = JSON.parse(outputText);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid structured analysis returned" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    analysis: {
      hours: analysis.hours,
      complexity: analysis.complexity,
      confidence: analysis.confidence,
      missing: analysis.missingRequirements,
      stack: analysis.recommendedStack,
      groups: analysis.featureGroups,
      modules: analysis.modules,
      architecture: analysis.architecture,
      risks: analysis.risks,
      assumptions: analysis.assumptions,
      timelineWeeks: analysis.timelineWeeks,
      milestones: analysis.milestones,
      summary: analysis.summary,
      rationale: analysis.rationale,
    },
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
