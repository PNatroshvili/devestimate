"use client";

import { ArrowLeft, ArrowRight, AlertTriangle, Check, Code2, CircleGauge, Clock3, DollarSign, Globe, Smartphone, Store, Layers3, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_RATES, loadRates, priceEstimate, PricingRates } from "../lib/pricing";
import { saveProject } from "../lib/projects";
import { ProjectTemplate } from "../lib/templates";

type ProjectType = "Web" | "Mobile" | "WordPress" | "Hybrid";

const types: { id: ProjectType; title: string; description: string; icon: typeof Globe }[] = [
  { id: "Web", title: "Web Application", description: "SaaS, dashboards, portals, platforms", icon: Globe },
  { id: "Mobile", title: "Mobile Application", description: "iOS, Android or cross-platform", icon: Smartphone },
  { id: "WordPress", title: "WordPress", description: "Business, ecommerce, content sites", icon: Store },
  { id: "Hybrid", title: "Hybrid Project", description: "Web + mobile or multiple platforms", icon: Layers3 },
];

const steps = ["Project Basics", "Requirements", "Scope & Estimate", "Review"];


function buildAnalysis(type: ProjectType, description: string, features: string[], flags: string[]) {
  const base = { Web: 28, Mobile: 42, WordPress: 18, Hybrid: 58 }[type];
  const featureHours = features.length * 6;
  const flagHours = flags.length * 7;
  const keywordBonus = /ecommerce|booking|marketplace|subscription|dashboard|multivendor/i.test(description) ? 12 : 0;
  const hours = Math.round((base + featureHours + flagHours + keywordBonus) / 4) * 4;
  const complexity = Math.min(10, Math.max(2, Math.round((base / 10) + features.length * .45 + flags.length * .4 + keywordBonus / 10)));
  const missing = [
    !flags.includes("Authentication") && "User roles & authentication",
    !flags.includes("Admin panel") && "Admin / content management scope",
    !flags.includes("Notifications") && "Notification channels and triggers",
    !flags.includes("External API") && "Third-party integrations / API scope",
    !flags.includes("Payments") && /shop|store|booking|subscription|payment|checkout/i.test(description) && "Payment provider and refund rules",
    !flags.includes("SEO / Analytics") && type !== "Mobile" && "SEO, analytics and conversion tracking",
    "Hosting, deployment and domain requirements",
    "Acceptance criteria and post-launch support",
  ].filter(Boolean) as string[];
  const stack = type === "WordPress"
    ? ["WordPress", "WooCommerce (if commerce)", "ACF / custom fields", "Custom theme", "Managed hosting"]
    : type === "Mobile"
      ? ["React Native", "Expo", "Node.js API", "PostgreSQL", "Push notifications"]
      : type === "Hybrid"
        ? ["Next.js", "React Native / Expo", "Node.js", "PostgreSQL", "REST API"]
        : ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "REST API"];
  const groups = [
    { name: "Core product", count: Math.max(2, features.length || 3), hours: Math.round((base * .42 + featureHours * .45) / 4) * 4 },
    { name: "Backend & integrations", count: Math.max(1, flags.filter(x => ["Payments","External API","Notifications"].includes(x)).length), hours: Math.round((base * .25 + flagHours * .35) / 4) * 4 },
    { name: "Admin & content", count: flags.includes("Admin panel") ? 1 : 0, hours: flags.includes("Admin panel") ? 16 : 8 },
    { name: "QA & deployment", count: 2, hours: Math.round((base * .18 + 8) / 4) * 4 },
  ].filter(x => x.count > 0);
  return { hours, complexity, missing, stack, groups };
}

export default function NewProject({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ProjectType>("Web");
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [auth, setAuth] = useState(false);
  const [payments, setPayments] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [api, setApi] = useState(false);
  const [seo, setSeo] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [rates, setRates] = useState<PricingRates>(DEFAULT_RATES);
  useEffect(() => {
    setRates(loadRates());
    try {
      const raw = localStorage.getItem("devestimate-template-draft");
      if (!raw) return;
      const template = JSON.parse(raw) as ProjectTemplate;
      setType(template.type);
      setName(template.name);
      setDescription(template.description);
      setFeatures(template.features);
      setAuth(template.flags.includes("Authentication"));
      setPayments(template.flags.includes("Payments"));
      setAdmin(template.flags.includes("Admin panel"));
      setNotifications(template.flags.includes("Notifications"));
      setApi(template.flags.includes("External API"));
      setSeo(template.flags.includes("SEO / Analytics"));
      localStorage.removeItem("devestimate-template-draft");
    } catch {}
  }, []);

  const addFeature = () => {
    const value = featureInput.trim();
    if (value && !features.includes(value)) {
      setFeatures([...features, value]);
      setFeatureInput("");
    }
  };

  const removeFeature = (item: string) => setFeatures(features.filter((x) => x !== item));
  const flags = [auth && "Authentication", payments && "Payments", admin && "Admin panel", notifications && "Notifications", api && "External API", seo && "SEO / Analytics"].filter(Boolean) as string[];
  const analysis = buildAnalysis(type, description, features, flags);
  const createProject = () => {
    const estimate = priceEstimate(analysis.hours, type, rates, 1 + (analysis.complexity - 5) * 0.04);
    saveProject({
      id: crypto.randomUUID(),
      name: name || "Untitled Project",
      client,
      type,
      description,
      features,
      flags,
      deadline,
      budget,
      hours: analysis.hours,
      complexity: analysis.complexity,
      value: Math.round(estimate.final),
      createdAt: new Date().toISOString(),
      status: "Analysis",
    });
    setSubmitted(true);
  };

  if (submitted && analysisOpen) return <AnalysisScreen name={name} client={client} type={type} analysis={analysis} flags={flags} rates={rates} onBack={() => setAnalysisOpen(false)} />;

  const canNext = step === 0 ? Boolean(name.trim() && description.trim()) : true;

  if (submitted) {
    return (
      <section className="content new-project-page">
        <div className="np-success">
          <div className="success-icon"><Check /></div>
          <small>PROJECT CREATED</small>
          <h1>{name || "New Project"}</h1>
          <p>The brief has been structured and the first-pass estimation engine is ready.</p>
          <div className="success-grid">
            <div><span>Type</span><b>{type}</b></div>
            <div><span>Features</span><b>{features.length || "Not added"}</b></div>
            <div><span>Deadline</span><b>{deadline || "Flexible"}</b></div>
            <div><span>Budget</span><b>{budget ? "$" + budget : "Not specified"}</b></div>
          </div>
          <div className="success-actions">
            <button className="secondary" onClick={onBack}>Back to Dashboard</button>
            <button className="primary" onClick={() => setAnalysisOpen(true)}><Sparkles /> Open AI Analysis</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content new-project-page">
      <header>
        <div className="np-header-spacer" />
        <div className="np-save">Draft saved locally</div>
      </header>

      <div className="np-top">
        <button className="back-link" onClick={onBack}><ArrowLeft /> Back to dashboard</button>
        <small>PROJECT INTAKE</small>
        <h1>Create New Project</h1>
        <p>Capture the brief first. SKUP Studio will turn it into an actionable estimate.</p>
      </div>

      <div className="stepper">
        {steps.map((item, index) => (
          <div className={"step " + (index === step ? "current " : "") + (index < step ? "done" : "")} key={item}>
            <div className="step-dot">{index < step ? <Check /> : index + 1}</div>
            <span>{item}</span>
            {index < steps.length - 1 && <i />}
          </div>
        ))}
      </div>

      <div className="np-layout">
        <div className="np-main">
          {step === 0 && (
            <div className="np-card">
              <div className="np-card-head"><div><h2>Project basics</h2><p>Start with the information you already know.</p></div><span>01</span></div>
              <label>Project name <b>*</b><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. E-commerce Platform" /></label>
              <label>Client / company<input value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Acme Ltd." /></label>
              <div className="field-label">Project type <b>*</b></div>
              <div className="type-grid">
                {types.map(({ id, title, description, icon: Icon }) => (
                  <button key={id} className={"type-card " + (type === id ? "selected" : "")} onClick={() => setType(id)}>
                    <Icon /><div><strong>{title}</strong><small>{description}</small></div>
                    {type === id && <Check className="type-check" />}
                  </button>
                ))}
              </div>
              <label>Project description <b>*</b><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what the client wants, who will use it, the main goal, and anything already discussed..." rows={7} /></label>
            </div>
          )}

          {step === 1 && (
            <div className="np-card">
              <div className="np-card-head"><div><h2>Requirements & features</h2><p>Add known requirements. You can refine them later with AI.</p></div><span>02</span></div>
              <label>Known features<input value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} placeholder="Type a feature and press Enter" /></label>
              <div className="feature-tags">{features.map(item => <button key={item} onClick={() => removeFeature(item)}>{item}<X /></button>)}</div>
              <div className="suggestion-box"><Sparkles /><div><strong>AI will detect missing requirements</strong><p>Authentication, roles, admin panels, integrations, payments, notifications, SEO and deployment requirements can be identified automatically from your brief.</p></div></div>
              <div className="check-grid">
                {[
                  ["Authentication", auth, setAuth],
                  ["Payments", payments, setPayments],
                  ["Admin panel", admin, setAdmin],
                  ["Notifications", notifications, setNotifications],
                  ["External API", api, setApi],
                  ["SEO / Analytics", seo, setSeo],
                ].map(([label, checked, setChecked]) => (
                  <button key={label as string} className={"check-option " + (checked ? "checked" : "")} onClick={() => (setChecked as (v:boolean)=>void)(!(checked as boolean))}>
                    <span>{checked ? <Check /> : null}</span>{label as string}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="np-card">
              <div className="np-card-head"><div><h2>Scope & estimate context</h2><p>These inputs help the estimator understand the commercial context.</p></div><span>03</span></div>
              <div className="two-fields">
                <label>Target deadline<input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
                <label>Known budget <span className="optional">optional</span><input type="number" min="0" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 5000" /></label>
              </div>
              <div className="scope-note"><Sparkles /><div><strong>Estimation is based on your settings</strong><p>Hourly rates, minimum project price, complexity multipliers, urgency and maintenance rules will come from Pricing & Rates.</p></div></div>
            </div>
          )}

          {step === 3 && (
            <div className="np-card">
              <div className="np-card-head"><div><h2>Review project brief</h2><p>Check the intake before creating the project.</p></div><span>04</span></div>
              <div className="review-list">
                <Review label="Project" value={name || "—"} />
                <Review label="Client" value={client || "—"} />
                <Review label="Type" value={type} />
                <Review label="Description" value={description || "—"} />
                <Review label="Features" value={features.length ? features.join(", ") : "No specific features added"} />
                <Review label="Scope flags" value={[auth && "Authentication", payments && "Payments", admin && "Admin panel", notifications && "Notifications", api && "External API", seo && "SEO / Analytics"].filter(Boolean).join(", ") || "None selected"} />
                <Review label="Deadline / budget" value={(deadline || "Flexible") + " · " + (budget ? "$" + budget : "Not specified")} />
              </div>
            </div>
          )}

          <div className="np-actions">
            <button className="secondary" onClick={() => step ? setStep(step - 1) : onBack()}><ArrowLeft /> {step ? "Previous" : "Cancel"}</button>
            {step < 3 ? (
              <button className="primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <ArrowRight /></button>
            ) : (
              <button className="primary" onClick={createProject}><Sparkles /> Create & Analyze</button>
            )}
          </div>
        </div>

        <aside className="np-side">
          <div className="np-side-card">
            <div className="side-icon"><Sparkles /></div>
            <h3>AI Requirements Analyzer</h3>
            <p>After creation, the analyzer will turn the brief into structured requirements, questions, feature groups and complexity signals.</p>
            <div className="ai-list"><span><Check /> Feature breakdown</span><span><Check /> Missing requirements</span><span><Check /> Technology suggestions</span><span><Check /> Complexity analysis</span></div>
          </div>
          <div className="np-side-card muted"><span>TIP</span><h3>Don't overthink the brief</h3><p>Write the project in your own words. The next stage is designed to ask what is missing.</p></div>
        </aside>
      </div>
    </section>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return <div className="review-row"><span>{label}</span><strong>{value}</strong></div>;
}

function AnalysisScreen({ name, client, type, analysis, flags, rates, onBack }: {
  name: string; client: string; type: ProjectType; analysis: ReturnType<typeof buildAnalysis>; flags: string[]; rates: PricingRates; onBack: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "questions">("overview");
  const estimate = priceEstimate(analysis.hours, type, rates, 1 + (analysis.complexity - 5) * 0.04);
  const packagePrices = { Basic: Math.round(Math.max(rates.minimum, estimate.final * 0.85)), Standard: Math.round(estimate.final), Premium: Math.round(estimate.final * 1.25) };
  return <section className="content new-project-page analysis-page">
    <header><div className="np-header-spacer" /><div className="np-save">Analysis engine · v1</div></header>
    <div className="analysis-top">
      <button className="back-link" onClick={onBack}><ArrowLeft /> Back to project</button>
      <small>AI REQUIREMENTS ANALYSIS</small><h1>{name}</h1><p>{client || "Internal estimate"} · {type}</p>
    </div>
    <div className="analysis-stats">
      <div><Clock3/><span>Estimated hours</span><strong>{analysis.hours}h</strong></div>
      <div><CircleGauge/><span>Complexity</span><strong>{analysis.complexity}/10</strong></div>
      <div><DollarSign/><span>Final estimate</span><strong>{"$" + Math.round(estimate.final).toLocaleString()}</strong></div>
      <div><Code2/><span>Hourly rate</span><strong>{"$" + estimate.rate + "/h"}</strong></div>
    </div>
    <div className="analysis-tabs">
      <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Analysis Overview</button>
      <button className={tab === "questions" ? "active" : ""} onClick={() => setTab("questions")}>Missing Requirements <b>{analysis.missing.length}</b></button>
    </div>
    {tab === "overview" ? <div className="analysis-grid">
      <div className="np-card"><div className="np-card-head"><div><h2>Feature breakdown</h2><p>First-pass scope grouping</p></div><span>{analysis.groups.length} groups</span></div>
        {analysis.groups.map(group => <div className="analysis-group" key={group.name}><div><strong>{group.name}</strong><small>{group.count} scope item{group.count === 1 ? "" : "s"}</small></div><b>{group.hours}h</b></div>)}
      </div>
      <div className="np-card"><div className="np-card-head"><div><h2>Recommended technology</h2><p>Based on project type and brief</p></div><span>STACK</span></div>
        <div className="stack-list">{analysis.stack.map((item, i) => <div key={item}><span>{String(i + 1).padStart(2,"0")}</span><strong>{item}</strong><small>{i === 0 ? "Primary application layer" : "Supporting technology"}</small></div>)}</div>
      </div>
      <div className="np-card"><div className="np-card-head"><div><h2>Complexity signals</h2><p>What is driving the estimate</p></div><span>{analysis.complexity}/10</span></div>
        <div className="signal-list"><Signal label="Project type" value={type} /><Signal label="Known features" value={String(flags.length)} /><Signal label="Scope flags" value={String(flags.length)} /><Signal label="Description signal" value={analysis.complexity >= 7 ? "High" : analysis.complexity >= 5 ? "Medium" : "Low"} /></div>
      </div>
      <div className="np-card"><div className="np-card-head"><div><h2>Pricing options</h2><p>Calculated from your saved pricing rules</p></div><span>LIVE</span></div>
        <div className="estimate-preview"><div><span>Hours</span><strong>{analysis.hours}h</strong></div><div><span>Rate</span><strong>{"$" + estimate.rate + "/h"}</strong></div><div><span>Final</span><strong>{"$" + Math.round(estimate.final).toLocaleString()}</strong></div></div>
        <div className="package-grid">{Object.entries(packagePrices).map(([label, value]) => <div className={"package-card " + label.toLowerCase()} key={label}><span>{label}</span><strong>{"$" + value.toLocaleString()}</strong><small>{label === "Basic" ? "Core scope" : label === "Standard" ? "Recommended scope" : "Extended scope + buffer"}</small></div>)}</div>
        <div className="analysis-warning"><AlertTriangle/><span>Price uses your saved rate, minimum price, complexity, urgency, discount and VAT settings. Package multipliers are proposal defaults.</span></div>
      </div>
    </div> : <div className="np-card missing-card">
      <div className="np-card-head"><div><h2>Questions before pricing</h2><p>These items can materially change scope or hours.</p></div><span>{analysis.missing.length} open</span></div>
      {analysis.missing.map((item, i) => <div className="missing-row" key={item}><span>{String(i+1).padStart(2,"0")}</span><div><strong>{item}</strong><small>Clarify this with the client before final proposal.</small></div><AlertTriangle/></div>)}
    </div>}
  </section>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="signal-row"><span>{label}</span><strong>{value}</strong></div>;
}

