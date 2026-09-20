"use client";

import { ArrowLeft, Check, Copy, FileText, Globe2, Save, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { saveProject, StoredProject } from "../lib/projects";
import { loadRates, priceEstimate, rateForType } from "../lib/pricing";

type Tab = "overview" | "requirements" | "pricing" | "proposal";

export default function ProjectDetail({ project, onBack }: { project: StoredProject; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState(project.status);
  const [copied, setCopied] = useState(false);
  const rates = useMemo(() => loadRates(), []);
  const estimate = priceEstimate(project.hours, project.type, rates, 1 + (project.complexity - 5) * 0.04);
  const packages = {
    Basic: Math.round(Math.max(rates.minimum, estimate.final * 0.85)),
    Standard: Math.round(estimate.final),
    Premium: Math.round(estimate.final * 1.25),
  };
  const questions = [
    !project.flags.includes("Authentication") && "Confirm user roles and authentication flow",
    !project.flags.includes("Admin panel") && "Define admin and content management scope",
    !project.flags.includes("External API") && "Confirm third-party integrations",
    !project.flags.includes("Payments") && /shop|store|booking|subscription|payment|checkout/i.test(project.description) && "Confirm payment provider, refunds and transaction rules",
    "Confirm hosting, deployment and domain requirements",
    "Define acceptance criteria and post-launch support",
  ].filter(Boolean) as string[];

  const stack = project.type === "WordPress"
    ? ["WordPress", "Custom theme / ACF", "WooCommerce when needed", "Managed hosting"]
    : project.type === "Mobile"
      ? ["React Native", "Expo", "Node.js API", "PostgreSQL", "Push notifications"]
      : project.type === "Hybrid"
        ? ["Next.js", "React Native / Expo", "Node.js", "PostgreSQL", "REST API"]
        : ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "REST API"];

  const proposalText = [
    "PROJECT PROPOSAL",
    "================",
    "Project: " + project.name,
    "Client: " + (project.client || "—"),
    "Type: " + project.type,
    "",
    "SCOPE",
    project.description,
    "",
    "FEATURES",
    ...(project.features.length ? project.features.map(x => "• " + x) : ["• Scope to be confirmed"]),
    "",
    "RECOMMENDED STACK",
    ...stack.map(x => "• " + x),
    "",
    "ESTIMATE",
    "Estimated hours: " + project.hours + "h",
    "Complexity: " + project.complexity + "/10",
    "Standard price: $" + packages.Standard.toLocaleString(),
    "",
    "ASSUMPTIONS",
    ...(questions.length ? questions.map(x => "• " + x) : ["• Standard delivery assumptions apply"]),
  ].join("\n");

  const persistStatus = (next: StoredProject["status"]) => {
    setStatus(next);
    saveProject({ ...project, status: next, value: packages.Standard });
  };

  const copyProposal = async () => {
    await navigator.clipboard.writeText(proposalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return <section className="content detail-page">
    <header><div className="np-header-spacer"/><div className="np-save">Project workspace</div></header>
    <div className="detail-top">
      <div>
        <button className="back-link" onClick={onBack}><ArrowLeft/> Back to projects</button>
        <small>PROJECT WORKSPACE</small>
        <div className="detail-title-row"><h1>{project.name}</h1><span className={"status " + status.toLowerCase().replaceAll(" ","-")}>{status}</span></div>
        <p>{project.client || "Internal project"} · {project.type} · Created {project.createdAt.slice(0,10)}</p>
      </div>
      <div className="detail-status-actions">
        <select value={status} onChange={e => persistStatus(e.target.value as StoredProject["status"])}>
          <option>Analysis</option><option>Proposal</option><option>In Progress</option><option>Completed</option>
        </select>
      </div>
    </div>

    <div className="detail-tabs">
      <button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}><Globe2/> Overview</button>
      <button className={tab==="requirements"?"active":""} onClick={()=>setTab("requirements")}><Sparkles/> Requirements</button>
      <button className={tab==="pricing"?"active":""} onClick={()=>setTab("pricing")}><Save/> Pricing</button>
      <button className={tab==="proposal"?"active":""} onClick={()=>setTab("proposal")}><FileText/> Proposal</button>
    </div>

    {tab==="overview" && <div className="detail-grid">
      <div className="np-card detail-span">
        <div className="np-card-head"><div><h2>Project brief</h2><p>Original client context and scope signals</p></div><span>BRIEF</span></div>
        <p className="detail-copy">{project.description || "No description recorded."}</p>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Estimate</h2><p>Current calculation</p></div><span>LIVE</span></div>
        <div className="detail-metrics">
          <div><span>Hours</span><strong>{project.hours}h</strong></div>
          <div><span>Complexity</span><strong>{project.complexity}/10</strong></div>
          <div><span>Rate</span><strong>{"$" + rateForType(project.type, rates) + "/h"}</strong></div>
          <div><span>Standard</span><strong>{"$" + packages.Standard.toLocaleString()}</strong></div>
        </div>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Recommended stack</h2><p>Based on project type</p></div><span>STACK</span></div>
        <div className="detail-stack">{stack.map((x,i)=><div key={x}><b>{"0"+(i+1)}</b><span>{x}</span></div>)}</div>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Timeline & budget</h2><p>Commercial context</p></div><span>SCOPE</span></div>
        <div className="detail-list"><div><span>Deadline</span><b>{project.deadline || "Flexible"}</b></div><div><span>Known budget</span><b>{project.budget ? "$" + project.budget : "Not specified"}</b></div></div>
      </div>
    </div>}

    {tab==="requirements" && <div className="detail-grid">
      <div className="np-card">
        <div className="np-card-head"><div><h2>Known features</h2><p>Captured during intake</p></div><span>{project.features.length}</span></div>
        <div className="feature-tags">{(project.features.length ? project.features : ["No explicit features recorded"]).map(x=><span className="detail-tag" key={x}>{x}<Check/></span>)}</div>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Scope flags</h2><p>Requirements already identified</p></div><span>{project.flags.length}</span></div>
        <div className="feature-tags">{(project.flags.length ? project.flags : ["No scope flags selected"]).map(x=><span className="detail-tag" key={x}>{x}<Check/></span>)}</div>
      </div>
      <div className="np-card detail-span">
        <div className="np-card-head"><div><h2>Open questions</h2><p>Items to clarify before final proposal</p></div><span>{questions.length}</span></div>
        {questions.map((x,i)=><div className="detail-question" key={x}><span>{"0"+(i+1)}</span><div><strong>{x}</strong><small>Clarify before locking the scope.</small></div></div>)}
        {!questions.length && <div className="detail-empty"><Check/> No open questions in the current brief.</div>}
      </div>
    </div>}

    {tab==="pricing" && <div className="detail-grid">
      <div className="np-card">
        <div className="np-card-head"><div><h2>Pricing breakdown</h2><p>Uses your saved Pricing & Rates settings</p></div><span>LIVE</span></div>
        <div className="detail-list">
          <div><span>Estimated hours</span><b>{project.hours}h</b></div>
          <div><span>Project rate</span><b>{"$" + estimate.rate + "/h"}</b></div>
          <div><span>Base</span><b>{"$" + Math.round(estimate.base).toLocaleString()}</b></div>
          <div><span>Adjusted</span><b>{"$" + Math.round(estimate.adjusted).toLocaleString()}</b></div>
          <div><span>Final standard</span><b>{"$" + Math.round(estimate.final).toLocaleString()}</b></div>
        </div>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Commercial packages</h2><p>Proposal-ready options</p></div><span>3 OPTIONS</span></div>
        <div className="package-grid">{Object.entries(packages).map(([label,value])=><div className={"package-card "+label.toLowerCase()} key={label}><span>{label}</span><strong>{"$" + value.toLocaleString()}</strong><small>{label==="Basic"?"Core scope":label==="Standard"?"Recommended scope":"Extended scope + buffer"}</small></div>)}</div>
      </div>
    </div>}

    {tab==="proposal" && <div className="proposal-layout">
      <div className="np-card proposal-card"><div className="np-card-head"><div><h2>Proposal draft</h2><p>Edit externally or copy into your client document.</p></div><button className="copy-button" onClick={copyProposal}>{copied?<Check/>:<Copy/>}{copied?"Copied":"Copy"}</button></div><pre>{proposalText}</pre></div>
      <div className="np-card proposal-side"><FileText/><h3>Proposal checklist</h3><span><Check/> Project scope</span><span><Check/> Feature list</span><span><Check/> Technology recommendation</span><span><Check/> Hours & pricing</span><span><Check/> Assumptions / open questions</span><button className="secondary" onClick={copyProposal}><Copy/> Copy proposal text</button></div>
    </div>}
  </section>;
}
