"use client";

import { ArrowLeft, CalendarDays, Clock3, DollarSign, FolderKanban, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteProject, loadProjects, StoredProject } from "../lib/projects";

const samples: StoredProject[] = [
  {id:"demo-1",name:"E-commerce Platform",client:"Demo Client",type:"Web",description:"Commerce platform",features:["Product catalog","Checkout"],flags:["Payments","Admin panel"],deadline:"2026-10-12",budget:"5000",hours:80,complexity:7,value:4850,createdAt:"2026-09-20",status:"In Progress"},
  {id:"demo-2",name:"Restaurant Website",client:"Demo Client",type:"WordPress",description:"Business website",features:["Pages","Menu"],flags:["SEO / Analytics"],deadline:"2026-10-05",budget:"1200",hours:32,complexity:3,value:1200,createdAt:"2026-09-19",status:"Completed"},
];

export default function Projects({onBack,onNew}:{onBack:()=>void;onNew:()=>void}) {
  const [items,setItems]=useState<StoredProject[]>([]);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("All");
  const refresh=()=>setItems(loadProjects());
  useEffect(()=>refresh(),[]);
  const visible=useMemo(()=>{
    const source=items.length?items:samples;
    return source.filter(p=>(filter==="All"||p.status===filter)&&((p.name+" "+p.client+" "+p.type).toLowerCase().includes(query.toLowerCase())));
  },[items,query,filter]);
  const remove=(id:string)=>{ if(id.startsWith("demo-")) return; deleteProject(id); refresh(); };
  return <section className="content projects-page">
    <header><div className="np-header-spacer"/><div className="np-save">{items.length} saved project{items.length===1?"":"s"}</div></header>
    <div className="projects-top">
      <div><button className="back-link" onClick={onBack}><ArrowLeft/> Back to dashboard</button><small>PROJECTS</small><h1>Project History</h1><p>Every estimate, brief and analysis in one place.</p></div>
      <button className="primary" onClick={onNew}><Plus/> New Project</button>
    </div>
    <div className="project-toolbar">
      <div className="search project-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects..."/></div>
      <div className="filters">{["All","Analysis","Proposal","In Progress","Completed"].map(x=><button className={filter===x?"active":""} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div>
    </div>
    <div className="project-list">
      {visible.map(p=><div className="project-row" key={p.id}>
        <div className="project-main"><div className="project-mark"><FolderKanban/></div><div><strong>{p.name}</strong><span>{p.client||"No client"} · {p.type}</span></div></div>
        <div className="project-meta"><span><Clock3/> {p.hours}h</span><span><DollarSign/> ${p.value.toLocaleString()}</span><span><CalendarDays/> {p.deadline||"Flexible"}</span></div>
        <span className={"status "+p.status.toLowerCase().replaceAll(" ","-")}>{p.status}</span>
        {!p.id.startsWith("demo-") && <button className="delete-project" title="Delete" onClick={()=>remove(p.id)}><Trash2/></button>}
      </div>)}
      {!visible.length && <div className="empty-projects"><FolderKanban/><h3>No projects found</h3><p>Try another search or create a new project.</p><button className="primary" onClick={onNew}><Plus/> New Project</button></div>}
    </div>
  </section>;
}
