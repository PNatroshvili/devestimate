"use client";

import { ArrowLeft, ArrowRight, Check, Globe, Smartphone, Store, Layers3, Sparkles, X } from "lucide-react";
import { useState } from "react";

type ProjectType = "Web" | "Mobile" | "WordPress" | "Hybrid";

const types: { id: ProjectType; title: string; description: string; icon: typeof Globe }[] = [
  { id: "Web", title: "Web Application", description: "SaaS, dashboards, portals, platforms", icon: Globe },
  { id: "Mobile", title: "Mobile Application", description: "iOS, Android or cross-platform", icon: Smartphone },
  { id: "WordPress", title: "WordPress", description: "Business, ecommerce, content sites", icon: Store },
  { id: "Hybrid", title: "Hybrid Project", description: "Web + mobile or multiple platforms", icon: Layers3 },
];

const steps = ["Project Basics", "Requirements", "Scope & Estimate", "Review"];

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

  const addFeature = () => {
    const value = featureInput.trim();
    if (value && !features.includes(value)) {
      setFeatures([...features, value]);
      setFeatureInput("");
    }
  };

  const removeFeature = (item: string) => setFeatures(features.filter((x) => x !== item));

  const canNext = step === 0 ? Boolean(name.trim() && description.trim()) : true;

  if (submitted) {
    return (
      <section className="content new-project-page">
        <div className="np-success">
          <div className="success-icon"><Check /></div>
          <small>PROJECT CREATED</small>
          <h1>{name || "New Project"}</h1>
          <p>The project brief is ready for AI analysis. Next we can connect the requirements analyzer and estimation engine.</p>
          <div className="success-grid">
            <div><span>Type</span><b>{type}</b></div>
            <div><span>Features</span><b>{features.length || "Not added"}</b></div>
            <div><span>Deadline</span><b>{deadline || "Flexible"}</b></div>
            <div><span>Budget</span><b>{budget ? "$" + budget : "Not specified"}</b></div>
          </div>
          <div className="success-actions">
            <button className="secondary" onClick={onBack}>Back to Dashboard</button>
            <button className="primary" onClick={() => setSubmitted(false)}><Sparkles /> Open AI Analysis</button>
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
        <p>Capture the brief first. DevEstimate will turn it into an actionable estimate.</p>
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
              <button className="primary" onClick={() => setSubmitted(true)}><Sparkles /> Create & Analyze</button>
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
