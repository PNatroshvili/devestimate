"use client";

import { ClipboardList, Copy, Link2, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeClientRequestWithAI,
  ClientRequest,
  ClientRequestLink,
  createRequestLink,
  loadClientRequests,
  loadRequestLinks,
  updateClientRequestAnalysis,
} from "../lib/clientRequests";
import { loadRates, priceEstimate } from "../lib/pricing";
import { isSupabaseConfigured } from "../lib/supabase";

export default function ClientRequests({ onBack }: { onBack: () => void }) {
  const [links, setLinks] = useState<ClientRequestLink[]>([]);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<ClientRequest | null>(null);
  const [createdLink, setCreatedLink] = useState<ClientRequestLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const aiAttempted = useRef<Set<string>>(new Set());

  const runAiForNewRequests = async (items: ClientRequest[]) => {
    if (!isSupabaseConfigured) return;
    const candidates = items.filter(
      (item) => item.status === "New" && item.analysis?.source !== "ai" && !aiAttempted.current.has(item.id),
    ).slice(0, 3);

    for (const request of candidates) {
      aiAttempted.current.add(request.id);
      try {
        const analysis = await analyzeClientRequestWithAI({
          projectName: request.projectName,
          type: request.type,
          description: request.description,
          features: request.features,
          flags: request.flags,
          deadline: request.deadline,
          notes: request.notes,
        });
        if (!analysis) continue;
        const next = { ...request, analysis: { ...analysis, source: "ai" as const } };
        await updateClientRequestAnalysis(request.id, next.analysis);
        setRequests((current) => current.map((item) => item.id === request.id ? next : item));
        setSelected((current) => current?.id === request.id ? next : current);
      } catch {
        // Keep the deterministic analysis as a safe fallback.
      }
    }
  };

  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const [nextLinks, nextRequests] = await Promise.all([loadRequestLinks(), loadClientRequests()]);
      setLinks(nextLinks);
      setRequests(nextRequests);
      void runAiForNewRequests(nextRequests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load client requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const newRequests = useMemo(() => requests.filter((item) => item.status === "New").length, [requests]);
  const origin = "https://skup.ge";
  const publicUrl = (token: string) => origin + "/request/?token=" + encodeURIComponent(token);

  const createLink = async () => {
    setCreating(true);
    setError("");
    try {
      const link = await createRequestLink(label || "Client project request");
      setLinks((items) => [link, ...items]);
      setCreatedLink(link);
      setLabel("");
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create request link.");
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(publicUrl(token));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="content request-page">
      <header><div className="np-header-spacer" /><div className="np-save">{isSupabaseConfigured ? "Connected workspace" : "Local demo mode"}</div></header>

      <div className="request-top">
        <div>
          <button className="back-link" onClick={onBack}>← Back to dashboard</button>
          <small>CLIENT INTAKE</small>
          <h1>Client Request Links</h1>
          <p>Generate a private intake link for each client and receive the completed brief in your dashboard.</p>
        </div>
        <button className="secondary" onClick={() => void refresh()}><RefreshCw /> Refresh</button>
      </div>

      {!isSupabaseConfigured && (
        <div className="request-warning"><Sparkles /><span>Database is not connected yet. Links and submissions are saved only in this browser until the Supabase credentials are added.</span></div>
      )}

      {error && <div className="request-error">{error}</div>}

      <div className="request-stats">
        <div><ClipboardList /><span>Requests received</span><strong>{requests.length}</strong></div>
        <div><Sparkles /><span>New requests</span><strong>{newRequests}</strong></div>
        <div><Link2 /><span>Active links</span><strong>{links.filter((item) => item.active).length}</strong></div>
      </div>

      <div className="request-layout">
        <div className="request-main">
          <section className="np-card">
            <div className="np-card-head"><div><h2>Create a client link</h2><p>The client will never see your rate, estimate or pricing rules.</p></div><span>01</span></div>
            <label>Link label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Acme — Website project" /></label>
            <button className="primary" disabled={creating} onClick={() => void createLink()}>{creating ? "Creating..." : "Generate request link"}<Link2 /></button>
            {createdLink && (
              <div className="created-link">
                <div><div><strong>Link ready</strong><small>{createdLink.label}</small></div><span className="link-status">Active</span></div>
                <code>{publicUrl(createdLink.token)}</code>
                <button className="secondary" onClick={() => void copyLink(createdLink.token)}><Copy />{copied ? "Copied" : "Copy link"}</button>
              </div>
            )}
          </section>

          <section className="np-card">
            <div className="np-card-head"><div><h2>Recent client requests</h2><p>Open a request to see requirements, technologies and internal pricing.</p></div><span>{requests.length}</span></div>
            {loading ? (
              <div className="request-empty"><Loader2 className="spin" /><span>Loading requests...</span></div>
            ) : requests.length ? (
              <div className="request-list">
                {requests.map((request) => (
                  <button key={request.id} className={"request-row " + (selected?.id === request.id ? "selected" : "")} onClick={() => setSelected(request)}>
                    <div className="request-icon"><ClipboardList /></div>
                    <div className="request-row-main"><strong>{request.projectName}</strong><small>{request.clientName}{request.company ? " · " + request.company : ""} · {request.type}</small></div>
                    <div className="request-row-meta"><span>{request.analysis?.hours || "—"}h</span><b>{request.status}</b></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="request-empty"><ClipboardList /><h3>No client requests yet</h3><p>Generate a link and send it to your next client.</p></div>
            )}
          </section>
        </div>

        <aside className="request-side">
          {selected ? <RequestDetail request={selected} onClose={() => setSelected(null)} /> : (
            <div className="np-side-card request-guide">
              <Link2 className="request-guide-icon" />
              <small>HOW IT WORKS</small>
              <h3>Client → Form → Dashboard</h3>
              <p>Share the generated link. The client fills in the requirements. After submission, the request appears here with the technical analysis kept on your side.</p>
              <div className="request-steps"><span>01 Generate link</span><span>02 Client submits</span><span>03 Analyze scope</span><span>04 Price privately</span></div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function RequestDetail({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const analysis = request.analysis;
  const rates = loadRates();
  const price = analysis ? priceEstimate(analysis.hours, request.type, rates, 1 + (analysis.complexity - 5) * 0.04) : null;

  return (
    <div className="np-side-card request-detail">
      <div className="request-detail-head"><div><small>INTERNAL REVIEW</small><h3>{request.projectName}</h3></div><button className="icon-button" onClick={onClose}><X /></button></div>
      <div className="request-detail-contact"><strong>{request.clientName}</strong><span>{request.company || "No company"}</span><span>{request.email}</span></div>
      <div className="request-detail-block"><span>Recommended stack</span>{analysis?.stack.map((item, index) => <b key={item}><i>{String(index + 1).padStart(2, "0")}</i>{item}</b>)}</div>
      <div className="request-detail-metrics">
        <div><span>Hours</span><strong>{analysis?.hours || "—"}h</strong></div>
        <div><span>Complexity</span><strong>{analysis?.complexity || "—"}/10</strong></div>
        <div><span>Internal estimate</span><strong>{price ? "$" + Math.round(price.final).toLocaleString() : "—"}</strong></div>
        <div><span>Requested budget</span><strong>{request.budget ? Number(request.budget).toLocaleString("ka-GE") : "—"}</strong></div>
      </div>
      <div className="request-detail-block"><span>Open questions</span>{analysis?.missing.slice(0, 5).map((item) => <small key={item}>{item}</small>)}</div>
      <div className="request-detail-block"><span>Client brief</span><p>{request.description}</p></div>
      <button className="secondary request-open-project" onClick={onClose}>Close review</button>
    </div>
  );
}
