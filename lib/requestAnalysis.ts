export type ClientProjectType = "Web" | "Mobile" | "WordPress" | "Hybrid";

export type RequestAnalysis = {
  hours: number;
  complexity: number;
  confidence?: number;
  missing: string[];
  stack: string[];
  groups: { name: string; count: number; hours: number }[];
  modules?: { name: string; description: string; hours: number; priority: "core" | "secondary" }[];
  architecture?: { frontend: string[]; backend: string[]; data: string[]; auth: string[]; infra: string[] };
  risks?: { level: "low" | "medium" | "high"; title: string; detail: string }[];
  assumptions?: string[];
  timelineWeeks?: number;
  milestones?: string[];
  source?: "ai" | "rules";
  summary?: string;
  rationale?: string;
};

export function analyzeClientRequest(
  type: ClientProjectType,
  description: string,
  features: string[],
  flags: string[],
): RequestAnalysis {
  const base = { Web: 28, Mobile: 42, WordPress: 18, Hybrid: 58 }[type];
  const featureHours = features.length * 6;
  const flagHours = flags.length * 7;
  const keywordBonus = /ecommerce|booking|marketplace|subscription|dashboard|multivendor/i.test(description) ? 12 : 0;
  const hours = Math.max(4, Math.round((base + featureHours + flagHours + keywordBonus) / 4) * 4);
  const complexity = Math.min(
    10,
    Math.max(2, Math.round((base / 10) + features.length * 0.45 + flags.length * 0.4 + keywordBonus / 10)),
  );

  const confidence = Math.max(45, Math.min(88, 82 - Math.max(0, 5 - features.length) * 6 - Math.max(0, 2 - flags.length) * 5));

  const missing = [
    !flags.includes("Authentication") && "User roles & authentication",
    !flags.includes("Admin panel") && "Admin / content management scope",
    !flags.includes("Notifications") && "Notification channels and triggers",
    !flags.includes("External API") && "Third-party integrations / API scope",
    !flags.includes("Payments") &&
      /shop|store|booking|subscription|payment|checkout/i.test(description) &&
      "Payment provider and refund rules",
    !flags.includes("SEO / Analytics") && type !== "Mobile" && "SEO, analytics and conversion tracking",
    "Hosting, deployment and domain requirements",
    "Acceptance criteria and post-launch support",
  ].filter(Boolean) as string[];

  const stack =
    type === "WordPress"
      ? ["WordPress", "WooCommerce (if commerce)", "ACF / custom fields", "Custom theme", "Managed hosting"]
      : type === "Mobile"
        ? ["React Native", "Expo", "Node.js API", "PostgreSQL", "Push notifications"]
        : type === "Hybrid"
          ? ["Next.js", "React Native / Expo", "Node.js", "PostgreSQL", "REST API"]
          : ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "REST API"];

  const groups = [
    {
      name: "Core product",
      count: Math.max(2, features.length || 3),
      hours: Math.round((base * 0.42 + featureHours * 0.45) / 4) * 4,
    },
    {
      name: "Backend & integrations",
      count: Math.max(
        1,
        flags.filter((x) => ["Payments", "External API", "Notifications"].includes(x)).length,
      ),
      hours: Math.round((base * 0.25 + flagHours * 0.35) / 4) * 4,
    },
    {
      name: "Admin & content",
      count: flags.includes("Admin panel") ? 1 : 0,
      hours: flags.includes("Admin panel") ? 16 : 8,
    },
    {
      name: "QA & deployment",
      count: 2,
      hours: Math.round((base * 0.18 + 8) / 4) * 4,
    },
  ].filter((x) => x.count > 0);


  const architecture = type === "WordPress"
    ? { frontend: ["WordPress theme / custom templates"], backend: ["WordPress core", "Custom plugins / hooks"], data: ["MySQL", "ACF / custom fields"], auth: ["WordPress users & roles"], infra: ["Managed WordPress hosting", "SSL", "Backups"] }
    : type === "Mobile"
      ? { frontend: ["React Native", "Expo"], backend: ["Node.js API"], data: ["PostgreSQL"], auth: ["Token-based authentication"], infra: ["API hosting", "Push notifications", "Monitoring"] }
      : type === "Hybrid"
        ? { frontend: ["Next.js", "React Native / Expo"], backend: ["Node.js API"], data: ["PostgreSQL"], auth: ["Session / token authentication"], infra: ["Web hosting", "API hosting", "CI/CD"] }
        : { frontend: ["Next.js", "TypeScript"], backend: ["Node.js API"], data: ["PostgreSQL"], auth: ["Session / token authentication"], infra: ["Web hosting", "CI/CD", "Monitoring"] };

  const modules = groups.map((group, index) => ({
    name: group.name,
    description: index === 0 ? "Main user-facing functionality and core flows." : index === 1 ? "Business logic, APIs and integrations." : index === 2 ? "Administrative and content controls." : "Testing, production setup and release.",
    hours: group.hours,
    priority: index < 2 ? "core" as const : "secondary" as const,
  }));

  const timelineWeeks = Math.max(1, Math.ceil(hours / 30));
  const milestones = ["Scope confirmation", "Core implementation", "Integration & QA", "Production launch"];
  const risks = [
    ...(missing.some((item) => /Payment/i.test(item)) ? [{ level: "high" as const, title: "Payment scope", detail: "Provider, refund flow and edge cases need confirmation." }] : []),
    ...(flags.includes("External API") ? [{ level: "medium" as const, title: "External integration", detail: "Delivery depends on third-party API documentation and behavior." }] : []),
    ...(missing.some((item) => /Hosting/i.test(item)) ? [{ level: "low" as const, title: "Deployment scope", detail: "Hosting, domain, SSL and backup expectations need confirmation." }] : []),
  ];
  const assumptions = [
    "Estimate assumes the currently described scope and standard UX patterns.",
    "New requirements may change time and cost.",
    "Client-provided content, accounts and third-party credentials are available when needed.",
  ];

  return {
    hours,
    complexity,
    confidence,
    missing,
    stack,
    groups,
    modules,
    architecture,
    risks,
    assumptions,
    timelineWeeks,
    milestones,
    summary: "Initial scope-based analysis generated from the submitted project brief.",
    rationale: "The recommendation prioritizes a maintainable stack, clear separation of concerns and a delivery plan that matches the described scope.",
  };
}
