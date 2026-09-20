import { supabase } from "./supabase";
import type { RequestAnalysis, ClientProjectType } from "./requestAnalysis";

export type RequestMockup = {
  slot: "overview" | "core" | "admin" | "mobile" | string;
  title: string;
  description: string;
  path: string;
  generatedAt: string;
  url?: string;
};

export type ClientRequestLink = {
  id: string;
  token: string;
  label: string;
  active: boolean;
  createdAt: string;
  submittedCount: number;
};

export type ClientRequest = {
  id: string;
  requestLinkId: string | null;
  requestToken: string;
  projectName: string;
  clientName: string;
  company: string;
  email: string;
  phone: string;
  type: ClientProjectType;
  description: string;
  features: string[];
  deadline: string;
  budget: string;
  budgetCurrency: "GEL" | "USD" | "EUR";
  flags: string[];
  notes: string;
  analysis?: RequestAnalysis;
  mockups?: RequestMockup[];
  mockupStatus?: "idle" | "generating" | "ready" | "error";
  mockupError?: string;
  clientMessage?: string;
  status: "New" | "Reviewed" | "Converted" | "Archived";
  createdAt: string;
};

export type ClientRequestInput = Omit<
  ClientRequest,
  "id" | "requestLinkId" | "requestToken" | "createdAt" | "status"
> & { analysis?: RequestAnalysis };

const LINKS_KEY = "devestimate-request-links";
const REQUESTS_KEY = "devestimate-client-requests";

function makeToken() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(18);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function saveLocal<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

const mapLink = (row: any): ClientRequestLink => ({
  id: row.id,
  token: row.token,
  label: row.label,
  active: row.active,
  createdAt: row.created_at,
  submittedCount: row.submitted_count || 0,
});

const mapRequest = (row: any): ClientRequest => ({
  id: row.id,
  requestLinkId: row.request_link_id ?? null,
  requestToken: row.request_token,
  projectName: row.project_name,
  clientName: row.client_name || "",
  company: row.company || "",
  email: row.email || "",
  phone: row.phone || "",
  type: row.type,
  description: row.description,
  features: row.features || [],
  deadline: row.deadline || "",
  budget: row.budget || "",
  budgetCurrency: row.budget_currency || "GEL",
  flags: row.flags || [],
  notes: row.notes || "",
  analysis: row.analysis || undefined,
  mockups: Array.isArray(row.mockups) ? row.mockups : [],
  mockupStatus: row.mockups_status || "idle",
  mockupError: row.mockups_error || undefined,
  clientMessage: row.client_message || undefined,
  status: row.status || "New",
  createdAt: row.created_at,
});

export async function loadRequestLinks(): Promise<ClientRequestLink[]> {
  if (!supabase) return loadLocal<ClientRequestLink>(LINKS_KEY);
  const { data, error } = await supabase
    .from("request_links")
    .select("id,token,label,active,created_at,submitted_count")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLink);
}

export async function createRequestLink(label: string): Promise<ClientRequestLink> {
  const token = makeToken();
  if (!supabase) {
    const link: ClientRequestLink = {
      id: "local-" + token,
      token,
      label: label.trim() || "New client request",
      active: true,
      createdAt: new Date().toISOString(),
      submittedCount: 0,
    };
    saveLocal(LINKS_KEY, [link, ...loadLocal<ClientRequestLink>(LINKS_KEY)]);
    return link;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("You must be signed in to create request links.");

  const { data, error } = await supabase
    .from("request_links")
    .insert({
      owner_id: userData.user.id,
      token,
      label: label.trim() || "New client request",
      active: true,
    })
    .select("id,token,label,active,created_at,submitted_count")
    .single();

  if (error) throw error;
  return mapLink(data);
}

export async function loadClientRequests(): Promise<ClientRequest[]> {
  if (!supabase) return loadLocal<ClientRequest>(REQUESTS_KEY);
  const { data, error } = await supabase
    .from("client_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRequest);
}

export async function analyzeClientRequestWithAI(payload: {
  projectName: string;
  type: ClientProjectType;
  description: string;
  features: string[];
  flags: string[];
  deadline: string;
  notes: string;
}) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke("analyze-request", { body: payload });
  if (error) throw error;
  if (data?.ok === false) throw new Error(String(data?.detail || data?.error || "AI analysis failed"));
  return (data?.analysis || null) as RequestAnalysis | null;
}

export async function updateClientRequestAnalysis(id: string, analysis: RequestAnalysis) {
  if (!supabase) {
    const items = loadLocal<ClientRequest>(REQUESTS_KEY);
    saveLocal(
      REQUESTS_KEY,
      items.map((item) => item.id === id ? { ...item, analysis } : item),
    );
    return;
  }
  const { error } = await supabase
    .from("client_requests")
    .update({ analysis })
    .eq("id", id);
  if (error) throw error;
}

export async function generateClientMessageWithAI(payload: Record<string, unknown>) {
  if (!supabase) return "";
  const { data, error } = await supabase.functions.invoke("generate-client-message", { body: payload });
  if (error) throw error;
  if (data?.ok === false) throw new Error(String(data?.detail || data?.error || "Client message generation failed"));
  return String(data?.message || "");
}

export async function updateClientMessage(id: string, message: string) {
  if (!supabase) {
    const items = loadLocal<ClientRequest>(REQUESTS_KEY);
    saveLocal(REQUESTS_KEY, items.map((item) => item.id === id ? { ...item, clientMessage: message } : item));
    return;
  }
  const { error } = await supabase.from("client_requests").update({ client_message: message }).eq("id", id);
  if (error) throw error;
}

export async function submitClientRequest(token: string, payload: ClientRequestInput) {
  if (!supabase) {
    const link = loadLocal<ClientRequestLink>(LINKS_KEY).find((item) => item.token === token && item.active);
    if (!link) throw new Error("This request link is invalid or inactive.");

    const request: ClientRequest = {
      id: "local-" + makeToken(),
      requestLinkId: link.id,
      requestToken: token,
      ...payload,
      status: "New",
      createdAt: new Date().toISOString(),
    };

    saveLocal(REQUESTS_KEY, [request, ...loadLocal<ClientRequest>(REQUESTS_KEY)]);
    saveLocal(
      LINKS_KEY,
      loadLocal<ClientRequestLink>(LINKS_KEY).map((item) =>
        item.id === link.id ? { ...item, submittedCount: item.submittedCount + 1 } : item,
      ),
    );
    return request;
  }

  const { data, error } = await supabase.rpc("submit_client_request", {
    p_token: token,
    p_payload: payload,
  });
  if (error) throw error;
  return data as string;
}

export async function signRequestMockupUrls(mockups: RequestMockup[]) {
  const client = supabase;
  if (!client || !mockups.length) return mockups;
  return Promise.all(
    mockups.map(async (item) => {
      try {
        const { data } = await client
          .storage
          .from("request-mockups")
          .createSignedUrl(item.path, 60 * 60 * 24);
        return { ...item, url: data?.signedUrl || undefined };
      } catch {
        return item;
      }
    }),
  );
}

const MOCKUP_SLOTS = ["overview", "core", "admin", "mobile"] as const;

export async function generateRequestMockupsWithAI(requestId: string) {
  if (!supabase) return [];

  let latest: RequestMockup[] = [];

  for (const slot of MOCKUP_SLOTS) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const { data, error } = await supabase.functions.invoke("generate-request-mockups", {
        body: { requestId, slot },
      });

      if (!error && data?.ok !== false) {
        latest = (data?.mockups || []) as RequestMockup[];
        lastError = null;
        break;
      }

      lastError = new Error(
        String(
          data?.error ||
          data?.detail ||
          error?.message ||
          "Mockup generation failed",
        ),
      );

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
    }

    if (lastError) throw lastError;
  }

  return signRequestMockupUrls(latest);
}
