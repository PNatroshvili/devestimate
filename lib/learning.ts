import type { ClientRequest } from "./clientRequests";
import type { RequestAnalysis } from "./requestAnalysis";
import type { StoredProject } from "./projects";

export type LearningMode = "starter" | "similar" | "historical";

export type LearningSignal = {
  mode: LearningMode;
  similarProjects: StoredProject[];
  historicalProjects: StoredProject[];
  adjustmentPercent: number;
  adjustedHours: number;
  confidence: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9ა-ჰ]+/gi, " ")
    .split(/s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3);
}

function tokenSet(request: ClientRequest) {
  return new Set(
    normalize([
      request.projectName,
      request.description,
      request.features.join(" "),
      request.flags.join(" "),
      request.type,
    ].join(" ")),
  );
}

function similarity(request: ClientRequest, project: StoredProject) {
  const a = tokenSet(request);
  const b = new Set(
    normalize([
      project.name,
      project.description,
      project.features.join(" "),
      project.flags.join(" "),
      project.type,
    ].join(" ")),
  );

  let overlap = 0;
  a.forEach((token) => { if (b.has(token)) overlap += 1; });

  const union = new Set([...a, ...b]).size || 1;
  const jaccard = overlap / union;
  const typeBoost = request.type === project.type ? 18 : 0;
  const featureBoost = request.features.filter((feature) => project.features.includes(feature)).length * 8;
  const flagBoost = request.flags.filter((flag) => project.flags.includes(flag)).length * 6;

  return Math.round(jaccard * 100 + typeBoost + featureBoost + flagBoost);
}

export function formatLearningMode(mode: LearningMode) {
  if (mode === "historical") return "Historical learning";
  if (mode === "similar") return "Similar projects";
  return "Starter mode";
}

export function getLearningSignal(
  request: ClientRequest,
  analysis?: RequestAnalysis,
  projects: StoredProject[] = [],
): LearningSignal {
  const baseHours = Math.max(1, Math.round(analysis?.hours || 0));
  const ranked = projects
    .map((project) => ({ project, score: similarity(request, project) }))
    .filter(({ score }) => score >= 36)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ project }) => project);

  const historical = ranked.filter(
    (project) => typeof project.actualHours === "number" && project.actualHours > 0 && project.hours > 0,
  );

  let adjustmentPercent = 0;
  if (historical.length >= 2) {
    const averageVariance = historical.reduce((sum, project) => {
      return sum + (((project.actualHours || 0) - project.hours) / project.hours) * 100;
    }, 0) / historical.length;

    adjustmentPercent = Math.max(-20, Math.min(25, averageVariance));
  }

  const adjustedHours = Math.max(1, Math.round(baseHours * (1 + adjustmentPercent / 100)));

  const baseConfidence = analysis?.confidence ?? 60;
  const historyBoost = historical.length >= 2 ? 12 : historical.length === 1 ? 5 : ranked.length ? 3 : 0;
  const confidence = Math.max(0, Math.min(98, Math.round(baseConfidence + historyBoost)));

  const mode: LearningMode =
    historical.length >= 2 ? "historical" :
    ranked.length ? "similar" :
    "starter";

  return {
    mode,
    similarProjects: ranked,
    historicalProjects: historical,
    adjustmentPercent,
    adjustedHours,
    confidence,
  };
}
