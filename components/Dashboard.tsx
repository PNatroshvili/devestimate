"use client";

import { BarChart3, Bell, BookOpen, CircleDollarSign, ClipboardList, FileText, FolderKanban, LayoutDashboard, Link2, LogOut, Plus, Search, Settings, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import NewProject from "./NewProject";
import PricingRates from "./PricingRates";
import Projects from "./Projects";
import ProjectDetail from "./ProjectDetail";
import Templates from "./Templates";
import Analytics from "./Analytics";
import ClientRequests from "./ClientRequests";
import AuthScreen from "./AuthScreen";
import { StoredProject } from "../lib/projects";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const projects = [
  ["E-commerce Platform","Web Application","In Progress","$4,850","Oct 12, 2026","🟣"],
  ["Hotel Booking System","Web + Mobile","Proposal","$6,200","Oct 10, 2026","🩷"],
  ["Restaurant Website","WordPress","Completed","$1,200","Oct 05, 2026","🟠"],
  ["Fitness Mobile App","Mobile Application","Analysis","$5,600","Oct 02, 2026","🔴"],
  ["Corporate Website","Web Application","Won","$2,300","Sep 28, 2026","🔵"]
];
const tech = [["Next.js","28%"],["WordPress","22%"],["React Native","18%"],["Node.js","15%"],["Others","17%"]];

type Page = "dashboard" | "new" | "rates" | "projects" | "detail" | "templates" | "analytics" | "requests";

function Status({v}:{v:string}){return <span className={"status "+v.toLowerCase().replaceAll(" ","-")}>{v}</span>}

export default function Dashboard(){
  const [page,setPage]=useState<Page>("dashboard");
  const [selectedProject,setSelectedProject]=useState<StoredProject | null>(null);
  const [authLoading,setAuthLoading]=useState(isSupabaseConfigured);
  const [authenticated,setAuthenticated]=useState(!isSupabaseConfigured);

  useEffect(()=>{
    if(!supabase) return;
    supabase.auth.getSession().then(({data})=>{
      setAuthenticated(Boolean(data.session));
      setAuthLoading(false);
    });
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      setAuthenticated(Boolean(session));
      setAuthLoading(false);
    });
    return ()=>listener.subscription.unsubscribe();
  },[]);

  const openProject=(project:StoredProject)=>{setSelectedProject(project);setPage("detail")};

  if(isSupabaseConfigured && authLoading) return <main className="auth-shell"><div className="client-loading">Loading private workspace…</div></main>;
  if(isSupabaseConfigured && !authenticated) return <AuthScreen/>;

  const renderPage=()=>{
    if(page==="new") return <NewProject onBack={()=>setPage("dashboard")}/>;
    if(page==="rates") return <PricingRates onBack={()=>setPage("dashboard")}/>;
    if(page==="projects") return <Projects onBack={()=>setPage("dashboard")} onNew={()=>setPage("new")} onOpen={openProject}/>;
    if(page==="templates") return <Templates onBack={()=>setPage("dashboard")} onNew={()=>setPage("new")}/>;
    if(page==="analytics") return <Analytics onBack={()=>setPage("dashboard")}/>;
    if(page==="requests") return <ClientRequests onBack={()=>setPage("dashboard")}/>;
    if(page==="detail" && selectedProject) return <ProjectDetail project={selectedProject} onBack={()=>setPage("projects")}/>;
    return <DashboardHome onNew={()=>setPage("new")} onProjects={()=>setPage("projects")} onRates={()=>setPage("rates")} onAnalytics={()=>setPage("analytics")} onRequests={()=>setPage("requests")}/>;
  };

  const signOut=()=>supabase?.auth.signOut();

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><b>D</b><span>DevEstimate</span></div>
      <nav>
        <a className={page==="dashboard" ? "active" : ""} onClick={()=>setPage("dashboard")}><LayoutDashboard/>Dashboard</a>
        <a className={page==="new" ? "active" : ""} onClick={()=>setPage("new")}><Plus/>New Project</a>
        <a className={page==="projects" || page==="detail" ? "active" : ""} onClick={()=>setPage("projects")}><FolderKanban/>Projects</a>
        <a className={page==="requests" ? "active" : ""} onClick={()=>setPage("requests")}><ClipboardList/>Client Requests</a>
        <a className={page==="templates" ? "active" : ""} onClick={()=>setPage("templates")}><FileText/>Templates</a>
        <a className={page==="rates" ? "active" : ""} onClick={()=>setPage("rates")}><CircleDollarSign/>Pricing & Rates</a>
        <a><BookOpen/>Knowledge Base</a>
        <a className={page==="analytics" ? "active" : ""} onClick={()=>setPage("analytics")}><BarChart3/>Analytics</a>
        <a><Settings/>Settings</a>
      </nav>
      <div className="bottom">
        <div className="ai"><Sparkles/><div><strong>AI Estimator</strong><small>{isSupabaseConfigured ? "Private workspace connected." : "Local prototype mode."}</small></div></div>
        <div className="user"><i>D</i><div><strong>Developer</strong><small>Full Stack</small></div>{isSupabaseConfigured && <button className="signout" title="Sign out" onClick={signOut}><LogOut/></button>}</div>
      </div>
    </aside>
    {renderPage()}
  </main>
}

function DashboardHome({onNew,onProjects,onRates,onAnalytics,onRequests}:{onNew:()=>void;onProjects:()=>void;onRates:()=>void;onAnalytics:()=>void;onRequests:()=>void}){
  return <section className="content">
    <header><div className="search"><Search/><input placeholder="Search projects..."/></div><button className="bell"><Bell/></button><i className="mini">D</i></header>
    <div className="heading"><div><small>OVERVIEW</small><h1>Dashboard</h1><p>Turn ideas into organized plans.</p></div><button className="primary" onClick={onNew}><Plus/>New Project</button></div>
    <div className="stats"><Stat l="Total Projects" v="12" n="+3 this month"/><Stat l="In Progress" v="4" n="2 due this week"/><Stat l="Completed" v="5" n="+2 this month"/><Stat l="Estimated Value" v="$28,450" n="+12.4%"/></div>
    <div className="grid">
      <section className="panel projects"><div className="panelhead"><div><h2>Recent Projects</h2><small>Latest estimation activity</small></div><button onClick={onProjects}>View All</button></div>{projects.map(p=><div className="project" key={p[0]}><i>{p[5]}</i><div><strong>{p[0]}</strong><small>{p[1]}</small></div><Status v={p[2]}/><div className="value"><strong>{p[3]}</strong><small>{p[4]}</small></div></div>)}</section>
      <section className="panel chartpanel"><Head title="Project Value" sub="Estimated value over time"/><div className="chart"><div className="labels"><span>$8k</span><span>$6k</span><span>$4k</span><span>$2k</span><span>$0</span></div><div className="chartarea"><span/><span/><span/><span/><svg viewBox="0 0 520 190" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5b7cff" stopOpacity=".25"/><stop offset="1" stopColor="#5b7cff" stopOpacity="0"/></linearGradient></defs><path d="M0 165L65 145L130 152L195 112L260 125L325 83L390 92L455 42L520 20L520 190L0 190Z" fill="url(#g)"/><path d="M0 165L65 145L130 152L195 112L260 125L325 83L390 92L455 42L520 20" fill="none" stroke="#5b7cff" strokeWidth="3"/></svg><div className="months"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div></div></section>
      <section className="panel tech"><Head title="Top Technologies" sub="By project count"/>{tech.map(t=><div className="t" key={t[0]}><div><span>{t[0]}</span><b>{t[1]}</b></div><em><i style={{width:t[1]}}/></em></div>)}</section>
      <section className="panel actions"><Head title="Quick Actions" sub="Start from where you need"/><div className="actionsgrid"><button onClick={onNew}><Plus/><b>New Project<small>Start a fresh estimate</small></b></button><button onClick={onRequests}><Link2/><b>Client Request<small>Generate a client intake link</small></b></button><button onClick={onAnalytics}><BarChart3/><b>View Analytics<small>Check accuracy</small></b></button><button onClick={onRates}><Settings/><b>Pricing Settings<small>Update your rates</small></b></button></div></section>
    </div>
  </section>
}

function Stat({l,v,n}:{l:string,v:string,n:string}){return <div className="stat"><small>{l}</small><strong>{v}</strong><em>{n}</em></div>}
function Head({title,sub}:{title:string,sub:string}){return <div className="panelhead"><div><h2>{title}</h2><small>{sub}</small></div><button>View All</button></div>}
