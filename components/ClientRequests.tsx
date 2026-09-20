"use client";

import { ClipboardList, Copy, Image as ImageIcon, Link2, Loader2, Maximize2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeClientRequestWithAI,
  ClientRequest,
  ClientRequestLink,
  createRequestLink,
  loadClientRequests,
  loadRequestLinks,
  generateClientMessageWithAI,
  generateRequestMockupsWithAI,
  signRequestMockupUrls,
  updateClientMessage,
  updateClientRequestAnalysis,
  type RequestMockup,
} from "../lib/clientRequests";
import { loadRates, priceEstimate } from "../lib/pricing";
import { isSupabaseConfigured } from "../lib/supabase";
import { formatLearningMode, getLearningSignal } from "../lib/learning";
import { loadProjects } from "../lib/projects";

export default function ClientRequests({ onBack, requestIdFromUrl }: { onBack: () => void; requestIdFromUrl?: string | null }) {
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

        // Visual product concepts are generated automatically after the technical AI analysis.
        // Keep this asynchronous so the request appears immediately while the mockups render.
        void generateRequestMockupsWithAI(request.id)
          .then((mockups) => {
            const withMockups = { ...next, mockups };
            setRequests((current) => current.map((item) => item.id === request.id ? withMockups : item));
            setSelected((current) => current?.id === request.id ? withMockups : current);
          })
          .catch(() => {
            // Mockup generation is best-effort; the request and technical analysis remain available.
          });
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
      if (requestIdFromUrl) {
        const target = nextRequests.find((item) => item.id === requestIdFromUrl);
        if (target) setSelected(target);
      }
      void runAiForNewRequests(nextRequests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load client requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [requestIdFromUrl]);

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
                    <div className="request-row-meta"><span>{new Date(request.createdAt).toLocaleDateString("ka-GE")}</span><b>{request.status}</b></div>
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

      {selected && <RequestDetailModal
        request={selected}
        onClose={() => setSelected(null)}
        onMessageSaved={(message) => {
          const next = { ...selected, clientMessage: message };
          setSelected(next);
          setRequests((current) => current.map((item) => item.id === selected.id ? next : item));
        }}
        onMockupsSaved={(mockups) => {
          const next = { ...selected, mockups };
          setSelected(next);
          setRequests((current) => current.map((item) => item.id === selected.id ? next : item));
        }}
      />}
    </section>
  );
}

function RequestDetailModal({ request, onClose, onMessageSaved, onMockupsSaved }: {
  request: ClientRequest;
  onClose: () => void;
  onMessageSaved: (message: string) => void;
  onMockupsSaved: (mockups: RequestMockup[]) => void;
}) {
  const analysis = request.analysis;
  const rates = loadRates();
  const price = analysis ? priceEstimate(analysis.hours, request.type, rates, 1 + (analysis.complexity - 5) * 0.04) : null;
  const learning = getLearningSignal(request, analysis, loadProjects());
  const learnedPrice = analysis ? priceEstimate(learning.adjustedHours, request.type, rates, 1 + (analysis.complexity - 5) * 0.04) : null;
  const submittedAt = new Date(request.createdAt).toLocaleString("ka-GE", { dateStyle: "medium", timeStyle: "short" });
  const [clientMessage, setClientMessage] = useState(request.clientMessage || "");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageReady, setMessageReady] = useState(Boolean(request.clientMessage));
  const [mockups, setMockups] = useState<RequestMockup[]>(request.mockups || []);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupError, setMockupError] = useState("");

  const generateMockups = async () => {
    setMockupLoading(true);
    setMockupError("");
    try {
      const next = await generateRequestMockupsWithAI(request.id);
      setMockups(next);
      onMockupsSaved(next);
    } catch (error) {
      setMockupError(error instanceof Error ? error.message : "მოქაფების გენერირება ვერ მოხერხდა.");
    } finally {
      setMockupLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      if (!request.mockups?.length) {
        setMockups([]);
        return;
      }
      const signed = await signRequestMockupUrls(request.mockups);
      if (alive) setMockups(signed);
    };
    void hydrate();
    return () => { alive = false; };
  }, [request.id]);


    const flags = [
    ["Authentication", "ავტორიზაცია და მომხმარებლები"],
    ["Payments", "გადახდები"],
    ["Admin panel", "ადმინისტრაციული პანელი"],
    ["Notifications", "შეტყობინებები"],
    ["External API", "გარე API / ინტეგრაციები"],
    ["SEO / Analytics", "SEO / ანალიტიკა"],
  ];

  const priceLabel = price ? "$" + Math.round(price.final).toLocaleString() : "ფასი დასათვლელია";
  const fallbackClientMessage = () => {
    const stackLabel = analysis?.stack?.slice(0, 5).join(", ") || "შესაბამის თანამედროვე ტექნოლოგიებს";
    const hoursLabel = analysis?.hours ? `დაახლოებით ${analysis.hours} საათის სამუშაო მოცულობას` : "საჭირო სამუშაო მოცულობას";
    const budgetNote = request.budget ? `თქვენი მითითებული ბიუჯეტი: ${request.budgetCurrency} ${request.budget}.` : "";
    return `გამარჯობა, ${request.clientName || "გულით მოგესალმებით"}! 👋

მადლობა დეტალურად მოწოდებული ინფორმაციისთვის. თქვენი მოთხოვნის მიხედვით, პროექტის მიზანია „${request.projectName}“-ის შექმნა და მისი ძირითადი ფუნქციების სრულად გამართვა.

ტექნიკური ნაწილი: პროექტისთვის რეკომენდებულია ${stackLabel}. ძირითადი სამუშაო მოიცავს ${analysis?.groups?.map((group) => group.name).join(", ") || "პროდუქტის ძირითად ფუნქციონალს, ტექნიკურ ნაწილსა და ტესტირებას"}.

ვადა: დაგეგმილი სამუშაო მოცულობაა ${hoursLabel}.
ღირებულება: ${priceLabel}.
${budgetNote}

დამატებითი ფუნქციები ან მოთხოვნები, რომლებიც ამ ეტაპზე აღწერილობაში არ შედის, საჭიროების შემთხვევაში ცალკე შეთანხმდება.

თუ ეს მიმართულება თქვენთვის მისაღებია, შემდეგ ეტაპზე შეგვიძლია დეტალები და დაწყების თარიღი საბოლოოდ შევათანხმოთ.`;
  };

  const generateMessage = async () => {
    setMessageLoading(true);
    setMessageError("");
    try {
      const generated = await generateClientMessageWithAI({
        clientName: request.clientName,
        company: request.company,
        projectName: request.projectName,
        type: request.type,
        description: request.description,
        features: request.features,
        flags: request.flags,
        deadline: request.deadline,
        requestedBudget: request.budget,
        requestedBudgetCurrency: request.budgetCurrency,
        estimatedHours: analysis?.hours || 0,
        estimatedPrice: priceLabel,
        stack: analysis?.stack || [],
        openQuestions: analysis?.missing || [],
        groups: analysis?.groups || [],
      });
      const nextMessage = generated || fallbackClientMessage();
      setClientMessage(nextMessage);
      setMessageReady(true);
      await updateClientMessage(request.id, nextMessage);
      onMessageSaved(nextMessage);
    } catch (error) {
      const nextMessage = fallbackClientMessage();
      setClientMessage(nextMessage);
      setMessageReady(true);
      setMessageError(error instanceof Error ? "AI ტექსტის გენერირება ვერ მოხერხდა. გამოიყენეთ მზადყოფნაში არსებული ტექსტი ან კვლავ სცადეთ." : "AI ტექსტის გენერირება ვერ მოხერხდა. გამოიყენეთ მზადყოფნაში არსებული ტექსტი ან კვლავ სცადეთ.");
      try {
        await updateClientMessage(request.id, nextMessage);
        onMessageSaved(nextMessage);
      } catch {}
    } finally {
      setMessageLoading(false);
    }
  };

  const copyClientMessage = async () => {
    if (!clientMessage) return;
    await navigator.clipboard.writeText(clientMessage);
    setMessageCopied(true);
    window.setTimeout(() => setMessageCopied(false), 1800);
  };

  useEffect(() => {
    if (!request.clientMessage && !messageLoading && !messageReady) void generateMessage();
  }, [request.id]);

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
              <Info label="სასურველი ბიუჯეტი" value={request.budget ? `${request.budgetCurrency} ${request.budget}` : "არ არის მითითებული"} emphasis />
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
              <Info label="სასურველი ბიუჯეტი" value={request.budget ? `${request.budgetCurrency} ${request.budget}` : "არ არის მითითებული"} emphasis />
            </div>
            <div className="request-modal-field request-modal-wide"><span>დამატებითი შენიშვნები</span><p>{request.notes || "კლიენტს დამატებითი ინფორმაცია არ მიუთითებია."}</p></div>
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>06</span><div><h3>AI ანალიზი</h3><p>შიდა ტექნიკური შეფასება — კლიენტი ამას ვერ ხედავს</p></div></div>
            <div className="request-analysis-summary">
              <div><span>შეფასების საათები</span><strong>{analysis?.hours || "—"} სთ</strong></div>
              <div><span>სირთულე</span><strong>{analysis?.complexity || "—"}/10</strong></div>
              <div><span>AI confidence</span><strong>{analysis?.confidence ? analysis.confidence + "%" : "—"}</strong></div>
              <div><span>სავარაუდო ვადა</span><strong>{analysis?.timelineWeeks ? analysis.timelineWeeks + " კვირა" : "—"}</strong></div>
              <div><span>შიდა ფასი</span><strong>{price ? "$" + Math.round(price.final).toLocaleString() : "—"}</strong></div>
              <div><span>კლიენტის ბიუჯეტი</span><strong>{request.budget ? `${request.budgetCurrency} ${request.budget}` : "—"}</strong></div>
            </div>
            {analysis?.summary && <div className="request-modal-field request-modal-wide"><span>AI-ის შეჯამება</span><p>{analysis.summary}</p></div>}
            {analysis?.rationale && <div className="request-modal-field request-modal-wide"><span>ტექნოლოგიური არჩევანის დასაბუთება</span><p>{analysis.rationale}</p></div>}
            <div className="request-ai-columns">
              <div className="request-modal-field"><span>რეკომენდებული ტექნოლოგიები</span>{analysis?.stack?.length ? <ul>{analysis.stack.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyValue text="ანალიზი ჯერ არ არის." />}</div>
              <div className="request-modal-field"><span>დასაზუსტებელი საკითხები</span>{analysis?.missing?.length ? <ul>{analysis.missing.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptyValue text="დამატებითი კითხვები არ არის." />}</div>
            </div>
            {analysis?.groups?.length ? <div className="request-modal-field request-modal-wide"><span>სამუშაოს ჯგუფები</span><div className="request-groups">{analysis.groups.map((group) => <div key={group.name}><strong>{group.name}</strong><span>{group.count} კომპონენტი • {group.hours} სთ</span></div>)}</div></div> : null}

            {analysis?.modules?.length ? (
              <div className="request-modal-field request-modal-wide">
                <span>მოდულები და საათები</span>
                <div className="request-groups">{analysis.modules.map((module) => (
                  <div key={module.name}>
                    <strong>{module.name} • {module.priority === "core" ? "ძირითადი" : "დამატებითი"}</strong>
                    <span>{module.description} • {module.hours} სთ</span>
                  </div>
                ))}</div>
              </div>
            ) : null}

            {analysis?.architecture ? (
              <div className="request-modal-field request-modal-wide">
                <span>ტექნიკური არქიტექტურა</span>
                <div className="request-groups">
                  {[
                    ["Frontend", analysis.architecture.frontend],
                    ["Backend", analysis.architecture.backend],
                    ["მონაცემები", analysis.architecture.data],
                    ["ავტორიზაცია", analysis.architecture.auth],
                    ["Infrastructure", analysis.architecture.infra],
                  ].map(([label, items]) => (
                    <div key={String(label)}>
                      <strong>{String(label)}</strong>
                      <span>{(items as string[]).join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {analysis?.risks?.length ? (
              <div className="request-modal-field request-modal-wide">
                <span>რისკები</span>
                <ul>{analysis.risks.map((risk) => <li key={risk.title}><strong>{risk.level === "high" ? "მაღალი" : risk.level === "medium" ? "საშუალო" : "დაბალი"} — {risk.title}:</strong> {risk.detail}</li>)}</ul>
              </div>
            ) : null}

            {analysis?.assumptions?.length ? (
              <div className="request-modal-field request-modal-wide">
                <span>ვარაუდები</span>
                <ul>{analysis.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            ) : null}

            {analysis?.milestones?.length ? (
              <div className="request-modal-field request-modal-wide">
                <span>ეტაპები</span>
                <div className="request-groups">{analysis.milestones.map((item, index) => <div key={item}><strong>{String(index + 1).padStart(2, "0")}</strong><span>{item}</span></div>)}</div>
              </div>
            ) : null}
          </section>


          <section className="request-modal-section request-visual-section">
            <div className="request-modal-section-head">
              <span>07</span>
              <div>
                <h3>AI ვიზუალური მოქაფები</h3>
                <p>რექუესთის სრული ფუნქციონალი, ტექნოლოგიური სტეკი და AI დასკვნა გარდაიქმნება 4 პრაქტიკულ UI/UX კონცეფციად.</p>
              </div>
            </div>

            <div className="request-visual-toolbar">
              <div>
                <strong>{mockups.length ? "ვიზუალური კონცეფცია მზად არის" : "ვიზუალური კონცეფცია ჯერ არ შექმნილა"}</strong>
                <span>Overview • Core workflow • Admin • Mobile</span>
              </div>
              <button className="secondary" onClick={() => void generateMockups()} disabled={mockupLoading || !analysis}>
                <ImageIcon />
                {mockupLoading ? "იქმნება 4 მოქაფი..." : mockups.length ? "თავიდან გენერირება" : "4 მოქაფის გენერირება"}
              </button>
            </div>

            {mockupError && <div className="request-client-message-error">{mockupError}</div>}

            {mockupLoading && !mockups.length ? (
              <div className="request-mockup-grid">
                {[1,2,3,4].map((item) => (
                  <div className="request-mockup-skeleton" key={item}>
                    <div className="request-mockup-skeleton-image" />
                    <div className="request-mockup-skeleton-line wide" />
                    <div className="request-mockup-skeleton-line" />
                  </div>
                ))}
              </div>
            ) : mockups.length ? (
              <div className="request-mockup-grid">
                {mockups.map((mockup) => (
                  <a
                    key={mockup.path}
                    className="request-mockup-card"
                    href={mockup.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {mockup.url ? <img src={mockup.url} alt={mockup.title} /> : <div className="request-mockup-missing">Preview unavailable</div>}
                    <div className="request-mockup-overlay">
                      <div>
                        <strong>{mockup.title}</strong>
                        <span>{mockup.description}</span>
                      </div>
                      <Maximize2 />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="request-mockup-empty">
                <ImageIcon />
                <strong>4 მაღალი ხარისხის UI/UX მოქაფი მზადდება ამ რექუესთიდან.</strong>
                <span>გენერაცია იყენებს მოთხოვნას, AI ტექნოლოგიურ რეკომენდაციებს, მოდულებს, არქიტექტურას და ძირითად რისკებს.</span>
              </div>
            )}
          </section>

          <section className="request-modal-section">
            <div className="request-modal-section-head"><span>08</span><div><h3>დამკვეთისთვის გასაგზავნი ტექსტი</h3><p>AI ამზადებს მოკლე, მეგობრულ და კონკრეტულ ტექსტს, რომლის გაგზავნაც შეგიძლია პირდაპირ დამკვეთთან.</p></div></div>

            <div className="request-client-message-toolbar">
              <button className="secondary" onClick={() => void generateMessage()} disabled={messageLoading}>
                <Wand2 />
                {messageLoading ? "გენერირდება..." : messageReady ? "თავიდან გენერირება" : "AI-ით მომზადება"}
              </button>
              <button className="secondary" onClick={() => void copyClientMessage()} disabled={!clientMessage}>
                <Copy />
                {messageCopied ? "დაკოპირდა" : "ტექსტის კოპირება"}
              </button>
            </div>

            {messageError && <div className="request-client-message-error">{messageError}</div>}

            <div className="request-client-message">
              {messageLoading && !clientMessage ? (
                <div className="request-message-loading">
                  <Loader2 className="spin" />
                  <span>AI ამზადებს ტექსტს...</span>
                </div>
              ) : (
                <>
                  <textarea
                    value={clientMessage}
                    onChange={(event) => {
                      setClientMessage(event.target.value);
                      setMessageReady(true);
                    }}
                    onBlur={() => {
                      if (!clientMessage.trim()) return;
                      void updateClientMessage(request.id, clientMessage.trim());
                      onMessageSaved(clientMessage.trim());
                    }}
                    placeholder="აქ გამოჩნდება ტექსტი, რომლის გაგზავნაც შეგიძლია დამკვეთთან..."
                    rows={15}
                  />
                  <div className="request-client-message-hint">
                    შეგიძლია ტექსტი სურვილისამებრ შეცვალო და შემდეგ პირდაპირ დააკოპირო.
                  </div>
                </>
              )}
            </div>
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
