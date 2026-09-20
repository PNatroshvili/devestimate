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
          <div className="np-side-card request-guide">
            <Link2 className="request-guide-icon" />
            <small>HOW IT WORKS</small>
            <h3>Client → Form → Dashboard</h3>
            <p>Share the generated link. The client fills in the requirements. After submission, the request appears here with the full technical review available in a dedicated popup.</p>
            <div className="request-steps"><span>01 Generate link</span><span>02 Client submits</span><span>03 Open full request</span><span>04 Price privately</span></div>
          </div>
        </aside>
      </div>

      {selected && <RequestDetailModal request={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function RequestDetailModal({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const analysis = request.analysis;
  const rates = loadRates();
  const price = analysis ? priceEstimate(analysis.hours, request.type, rates, 1 + (analysis.complexity - 5) * 0.04) : null;
  const submittedAt = new Date(request.createdAt).toLocaleString("ka-GE", { dateStyle: "medium", timeStyle: "short" });
  const flags = [
    ["Authentication", "ავტორიზაცია და მომხმარებლები"],
    ["Payments", "გადახდები"],
    ["Admin panel", "ადმინისტრაციული პანელი"],
    ["Notifications", "შეტყობინებები"],
    ["External API", "გარე API / ინტეგრაციები"],
    ["SEO / Analytics", "SEO / ანალიტიკა"],
  ];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="request-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <header className="request-modal-head">
          <div>
            <small>სრული მოთხოვნა • INTERNAL REVIEW</small>
            <h2 id="request-modal-title">{request.projectName}</h2>
            <div className="request-modal-meta">
              <span>{request.status}</span>
              <span>{request.type}</span>
              <span>{submittedAt}</span>
            </div>
          </div>
          <button className="icon-button request-modal-close" onClick={onClose} aria-label="Close request"><X /></button>
        </header>

        <div className="request-modal-body">
          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>01</span><div><h3>კლიენტის ინფორმაცია</h3><p>ფორმაში მითითებული საკონტაქტო დეტალები</p></div></div>
            <div className="request-modal-grid">
              <Info label="სახელი და გვარი" value={request.clientName} />
              <Info label="კომპანია / ორგანიზაცია" value={request.company || "არ არის მითითებული"} />
              <Info label="ელფოსტა" value={request.email || "არ არის მითითებული"} />
              <Info label="ტელეფონი" value={request.phone || "არ არის მითითებული"} />
            </div>
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>02</span><div><h3>პროექტის ძირითადი ინფორმაცია</h3><p>ზუსტად ის მნიშვნელობები, რომლებიც კლიენტმა ფორმაში შეავსო</p></div></div>
            <div className="request-modal-grid">
              <Info label="პროექტის სახელი" value={request.projectName} />
              <Info label="პროექტის ტიპი" value={request.type} />
              <Info label="სასურველი დასრულების ვადა" value={request.deadline || "არ არის მითითებული"} />
              <Info label="სასურველი ბიუჯეტი" value={request.budget || "არ არის მითითებული"} emphasis />
            </div>
            <div className="request-modal-field request-modal-wide"><span>პროექტის სრული აღწერა</span><p>{request.description || "არ არის მითითებული"}</p></div>
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>03</span><div><h3>ფუნქციები</h3><p>მომხმარებლის მიერ მითითებული ყველა ფუნქცია, უცვლელად</p></div></div>
            {request.features.length ? (
              <div className="request-feature-list">{request.features.map((feature, index) => <div key={feature + index}><i>{String(index + 1).padStart(2, "0")}</i><span>{feature}</span></div>)}</div>
            ) : <EmptyValue text="კლიენტს ფუნქციები არ მიუთითებია." />}
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>04</span><div><h3>მოთხოვნები და ჩექბოქსები</h3><p>ყველა ვარიანტი ჩანს — მონიშნული და მოუნიშნავი</p></div></div>
            <div className="request-flag-grid">
              {flags.map(([value, label]) => {
                const checked = request.flags.includes(value);
                return (
                  <div key={value} className={"request-flag-item " + (checked ? "checked" : "")}>
                    <span className="request-flag-box">{checked ? "✓" : ""}</span>
                    <div><strong>{label}</strong><small>{checked ? "მონიშნულია" : "არ არის მონიშნული"}</small></div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>05</span><div><h3>ვადები, ბიუჯეტი და დამატებითი ინფორმაცია</h3><p>ფორმის ბოლო ნაწილის ყველა ველი</p></div></div>
            <div className="request-modal-grid">
              <Info label="სასურველი დასრულების ვადა" value={request.deadline || "არ არის მითითებული"} />
              <Info label="სასურველი ბიუჯეტი" value={request.budget || "არ არის მითითებული"} emphasis />
            </div>
            <div className="request-modal-field request-modal-wide"><span>დამატებითი შენიშვნები</span><p>{request.notes || "კლიენტს დამატებითი ინფორმაცია არ მიუთითებია."}</p></div>
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>06</span><div><h3>AI ანალიზი</h3><p>შიდა ტექნიკური შეფასება — კლიენტი ამას ვერ ხედავს</p></div></div>
            <div className="request-analysis-summary">
              <div><span>შეფასების საათები</span><strong>{analysis?.hours || "—"} სთ</strong></div>
              <div><span>სირთულე</span><strong>{analysis?.complexity || "—"}/10</strong></div>
              <div><span>შიდა ფასი</span><strong>{price ? "$" + Math.round(price.final).toLocaleString() : "—"}</strong></div>
              <div><span>კლიენტის ბიუჯეტი</span><strong>{request.budget || "—"}</strong></div>
            </div>
            {analysis?.summary && <div className="request-modal-field request-modal-wide"><span>AI-ის შეჯამება</span><p>{analysis.summary}</p></div>}
            {analysis?.rationale && <div className="request-modal-field request-modal-wide"><span>ტექნოლოგიური არჩევანის დასაბუთება</span><p>{analysis.rationale}</p></div>}
            <div className="request-ai-columns">
              <div className="request-modal-field"><span>რეკომენდებული ტექნოლოგიები</span>{analysis?.stack?.length ? <ul>{analysis.stack.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyValue text="ანალიზი ჯერ არ არის." />}</div>
              <div className="request-modal-field"><span>დასაზუსტებელი საკითხები</span>{analysis?.missing?.length ? <ul>{analysis.missing.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyValue text="დამატებითი კითხვები არ არის." />}</div>
            </div>
            {analysis?.groups?.length ? <div className="request-modal-field request-modal-wide"><span>სამუშაოს ჯგუფები</span><div className="request-groups">{analysis.groups.map((group) => <div key={group.name}><strong>{group.name}</strong><span>{group.count} კომპონენტი • {group.hours} სთ</span></div>)}</div></div> : null}
          </section>
        </div>

        <footer className="request-modal-foot">
          <div><span>Request ID</span><code>{request.id}</code></div>
          <button className="secondary" onClick={onClose}>დახურვა</button>
        </footer>
      </div>
    </div>
  );
}

function Info({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={"request-info " + (emphasis ? "emphasis" : "")}><span>{label}</span><strong>{value}</strong></div>;
}

function EmptyValue({ text }: { text: string }) {
  return <div className="request-empty-value">{text}</div>;
}
