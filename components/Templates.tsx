"use client";

import { ArrowLeft, ArrowRight, FileText, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { projectTemplates, ProjectTemplate } from "../lib/templates";

export default function Templates({onBack,onNew}:{onBack:()=>void;onNew:()=>void}) {
  const [query,setQuery]=useState("");
  const [type,setType]=useState("All");
  const visible=useMemo(()=>projectTemplates.filter(t=>
    (type==="All"||t.type===type) &&
    (t.name+" "+t.description+" "+t.tags.join(" ")).toLowerCase().includes(query.toLowerCase())
  ),[query,type]);

  const useTemplate=(t:ProjectTemplate)=>{
    localStorage.setItem("devestimate-template-draft",JSON.stringify(t));
    onNew();
  };

  return <section className="content templates-page">
    <header><div className="np-header-spacer"/><div className="np-save">{projectTemplates.length} starter templates</div></header>
    <div className="templates-top">
      <div><button className="back-link" onClick={onBack}><ArrowLeft/> Back to dashboard</button><small>TEMPLATES</small><h1>Project Templates</h1><p>Start from a proven structure and let DevEstimate refine the scope.</p></div>
      <button className="primary" onClick={onNew}><Plus/> Blank Project</button>
    </div>
    <div className="template-toolbar">
      <div className="search project-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search templates..."/></div>
      <div className="filters">{["All","Web","Mobile","WordPress","Hybrid"].map(x=><button className={type===x?"active":""} onClick={()=>setType(x)} key={x}>{x}</button>)}</div>
    </div>
    <div className="template-grid">
      {visible.map(t=><article className="template-card" key={t.id}>
        <div className="template-icon"><FileText/></div>
        <div className="template-card-head"><div><strong>{t.name}</strong><span>{t.type}</span></div><b>{t.hoursHint}h</b></div>
        <p>{t.description}</p>
        <div className="template-tags">{t.tags.map(x=><span key={x}>{x}</span>)}</div>
        <div className="template-features">{t.features.slice(0,4).map(x=><span key={x}>• {x}</span>)}</div>
        <button className="template-use" onClick={()=>useTemplate(t)}><Sparkles/> Use Template <ArrowRight/></button>
      </article>)}
      {!visible.length && <div className="empty-projects"><FileText/><h3>No templates found</h3><p>Try another search or project type.</p></div>}
    </div>
  </section>;
}
