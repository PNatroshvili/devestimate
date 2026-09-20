export type StoredProject = {
  id: string;
  name: string;
  client: string;
  type: "Web" | "Mobile" | "WordPress" | "Hybrid";
  description: string;
  features: string[];
  flags: string[];
  deadline: string;
  budget: string;
  hours: number;
  complexity: number;
  value: number;
  createdAt: string;
  status: "Analysis" | "Proposal" | "In Progress" | "Completed";
};

const KEY = "devestimate-projects";

export function loadProjects(): StoredProject[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveProject(project: StoredProject) {
  const projects = loadProjects().filter(p => p.id !== project.id);
  window.localStorage.setItem(KEY, JSON.stringify([project, ...projects]));
}

export function deleteProject(id: string) {
  window.localStorage.setItem(KEY, JSON.stringify(loadProjects().filter(p => p.id !== id)));
}
