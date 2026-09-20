export type ClientProjectType = "Web" | "Mobile" | "WordPress" | "Hybrid";

export type RequestAnalysis = {
  hours: number;
  complexity: number;
  missing: string[];
  stack: string[];
  groups: { name: string; count: number; hours: number }[];
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
  const hours = Math.round((base + featureHours + flagHours + keywordBonus) / 4) * 4;
  const complexity = Math.min(
    10,
    Math.max(2, Math.round((base / 10) + features.length * 0.45 + flags.length * 0.4 + keywordBonus / 10)),
  );

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

  return { hours, complexity, missing, stack, groups };
}
