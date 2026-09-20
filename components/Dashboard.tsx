"use client";

import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import NewProject from "./NewProject";
import PricingRates from "./PricingRates";
import Projects from "./Projects";
import ProjectDetail from "./ProjectDetail";
import Templates from "./Templates";
import Analytics from "./Analytics";
import ClientRequests from "./ClientRequests";
import AuthScreen from "./AuthScreen";
import { StoredProject } from "../lib/projects";
import { ClientRequest, loadClientRequests } from "../lib/clientRequests";
import { loadRates, priceEstimate } from "../lib/pricing";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Page = "dashboard" | "new" | "rates" | "projects" | "detail" | "templates" | "analytics" | "requests";

const menu = [
  { page: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { page: "requests" as const, label: "Client Requests", icon: ClipboardList },
  { page: "projects" as const, label: "Projects", icon: FolderKanban },
  { page: "analytics" as const, label: "Analytics", icon: BarChart3 },
  { page: "rates" as const, label: "Pricing & Rates", icon: CircleDollarSign },
  { page: "templates" as const, label: "Templates", icon: FileText },
];

export default function Dashboard() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedProject, setSelectedProject] = useState<StoredProject | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authenticated, setAuthenticated] = useState(!isSupabaseConfigured);
  const [requestIdFromUrl, setRequestIdFromUrl] = useState<string | null>(null);

  const readRequestIdFromLocation = () => {
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("requestId") || params.get("id");
    const routeMatch = window.location.pathname.match(/^\/requests\/([^/]+)\/?$/);
    const routeRequestId = routeMatch ? decodeURIComponent(routeMatch[1]) : null;
    return routeRequestId || requestId;
  };

  useEffect(() => {
    const syncHistory = (event?: PopStateEvent) => {
      const requestId = readRequestIdFromLocation();
      const historyPage = event?.state?.page as Page | undefined;
      setRequestIdFromUrl(requestId);
      setPage(requestId ? "requests" : (historyPage || "dashboard"));
    };

    syncHistory();
    window.addEventListener("popstate", syncHistory);
    return () => window.removeEventListener("popstate", syncHistory);
  }, []);

  const navigateToPage = (target: Page) => {
    setRequestIdFromUrl(null);
    setPage(target);
    window.history.pushState(
      { page: target },
      "",
      target === "requests" ? "/requests/" : "/",
    );
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const openProject = (project: StoredProject) => {
    setSelectedProject(project);
    navigateToPage("detail");
  };

  const openRequest = (requestId: string) => {
    setRequestIdFromUrl(requestId);
    setPage("requests");
    window.history.pushState(
      { page: "requests", requestId },
      "",
      "/requests/?id=" + encodeURIComponent(requestId),
    );
    window.scrollTo(0, 0);
  };

  if (isSupabaseConfigured && authLoading) {
    return <main className="auth-shell"><div className="client-loading">Loading private workspace…</div></main>;
  }

  if (isSupabaseConfigured && !authenticated) {
    return <AuthScreen />;
  }

  const renderPage = () => {
    if (page === "new") return <NewProject onBack={() => navigateToPage("dashboard")} />;
    if (page === "rates") return <PricingRates onBack={() => navigateToPage("dashboard")} />;
    if (page === "projects") return <Projects onBack={() => navigateToPage("dashboard")} onNew={() => navigateToPage("new")} onOpen={openProject} />;
    if (page === "templates") return <Templates onBack={() => navigateToPage("dashboard")} onNew={() => navigateToPage("new")} />;
    if (page === "analytics") return <Analytics onBack={() => navigateToPage("dashboard")} />;
    if (page === "requests") return <ClientRequests
      requestIdFromUrl={requestIdFromUrl}
      standalone={Boolean(requestIdFromUrl)}
      onOpenRequest={openRequest}
      onBack={() => navigateToPage("dashboard")}
    />;
    if (page === "detail" && selectedProject) return <ProjectDetail project={selectedProject} onBack={() => setPage("projects")} />;

    return (
      <DashboardHome
        onNew={() => navigateToPage("new")}
        onProjects={() => navigateToPage("projects")}
        onRates={() => navigateToPage("rates")}
        onAnalytics={() => navigateToPage("analytics")}
        onRequests={() => navigateToPage("requests")}
        onOpenRequest={openRequest}
      />
    );
  };

  const signOut = () => supabase?.auth.signOut();

  return (
    <main className="shell">
      <aside className="sidebar dashboard-sidebar">
        <div className="brand dashboard-brand">
          <img src="/skup-mark.svg" alt="DevEstimate" />
          <div><strong>DevEstimate</strong><small>SKUP Studio</small></div>
        </div>

        <nav className="dashboard-nav">
          {menu.map(({ page: target, label, icon: Icon }) => (
            <a
              key={target}
              className={page === target || (target === "projects" && page === "detail") ? "active" : ""}
              onClick={() => navigateToPage(target)}
            >
              <Icon />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="dashboard-sidebar-bottom">
          <a><BookOpen /><span>Knowledge Base</span></a>
          <a><Settings /><span>Settings</span></a>

          <div className="dashboard-account">
            <i>P</i>
            <div>
              <strong>SKUP Studio</strong>
              <small>Private workspace</small>
            </div>
            {isSupabaseConfigured && (
              <button className="signout" title="Sign out" onClick={signOut}><LogOut /></button>
            )}
          </div>
        </div>
      </aside>

      {renderPage()}
    </main>
  );
}

function DashboardHome({onNew,onProjects,onRates,onAnalytics,onRequests,onOpenRequest}:{onNew:()=>void;onProjects:()=>void;onRates:()=>void;onAnalytics:()=>void;onRequests:()=>void;onOpenRequest:(requestId:string)=>void}) {
  const [requests,setRequests]=useState<ClientRequest[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let alive=true;
    const refresh=async()=>{
      try{
        const next=await loadClientRequests();
        if(alive)setRequests(next);
      }finally{
        if(alive)setLoading(false);
      }
    };
    void refresh();
    const interval=window.setInterval(refresh,30000);
    return()=>{alive=false;window.clearInterval(interval)};
  },[]);

  const rates=useMemo(()=>loadRates(),[]);
  const analyzed=requests.filter((request)=>Boolean(request.analysis?.hours));
  const converted=requests.filter((request)=>request.status==="Converted");
  const estimatedRevenue=analyzed.reduce((sum,request)=>{
    if(!request.analysis)return sum;
    return sum+priceEstimate(
      request.analysis.hours,
      request.type,
      rates,
      1+(request.analysis.complexity-5)*0.04,
    ).final;
  },0);
  const conversion=requests.length?Math.round(converted.length/requests.length*100):0;
  const chart=buildRequestChart(requests);
  const recent=requests.slice(0,5);

  return <section className="content dashboard-target-page">
    <header className="target-topbar">
      <div className="target-search"><Search/><input placeholder="Search requests, projects..."/></div>
      <button className="target-period">Last 30 days <ChevronDown/></button>
      <button className="target-bell" aria-label="Notifications"><Bell/></button>
      <i className="target-avatar">P</i>
    </header>

    <div className="target-heading">
      <div>
        <small>OVERVIEW</small>
        <h1>Dashboard</h1>
        <p>Here's what's happening with your projects.</p>
      </div>
      <button className="target-period target-heading-period">Last 30 days <ChevronDown/></button>
    </div>

    <div className="target-kpis">
      <TargetKpi label="Client Requests" value={String(requests.length)} delta="+8%" tone="blue"/>
      <TargetKpi label="Estimated Projects" value={String(analyzed.length)} delta="+12%" tone="green"/>
      <TargetKpi label="Conversion Rate" value={conversion+"%"} delta={requests.length?String(converted.length)+" converted":"—"} tone="purple"/>
      <TargetKpi label="Estimated Revenue" value={"$"+Math.round(estimatedRevenue).toLocaleString()} delta="Based on estimates" tone="gold"/>
    </div>

    <section className="target-card target-chart-card">
      <div className="target-card-head">
        <div><h2>Client Requests</h2><p>Requests received during the last 30 days.</p></div>
        <button className="target-chart-period">Daily <ChevronDown/></button>
      </div>
      <div className="target-chart">
        <div className="target-y"><span>{chart.max}</span><span>{Math.max(0,Math.ceil(chart.max/2))}</span><span>0</span></div>
        <div className="target-plot">
          <div className="target-gridline g1"/><div className="target-gridline g2"/><div className="target-gridline g3"/><div className="target-gridline g4"/>
          <div className="target-bars">
            {chart.points.map((point)=><div key={point.key} className="target-bar-wrap" title={point.label+": "+point.value+" request"+(point.value===1?"":"s")}>
              <i style={{height:point.height+"%"}}/>
            </div>)}
          </div>
          <div className="target-axis">
            {chart.labels.map((label)=><span key={label}>{label}</span>)}
          </div>
        </div>
      </div>
    </section>

    <section className="target-card target-recent-card">
      <div className="target-card-head">
        <div><h2>Recent client requests</h2><p>Latest requests from the public intake form.</p></div>
        <button onClick={onRequests}>View all</button>
      </div>
      {loading ? (
        <div className="target-empty">Loading requests…</div>
      ) : recent.length ? (
        <div className="target-table">
          <div className="target-table-head"><span>Project</span><span>Client</span><span>Type</span><span>Status</span><span>Date</span></div>
          {recent.map((request)=>
            <button key={request.id} className="target-table-row" onClick={()=>onOpenRequest(request.id)}>
              <strong>{request.projectName}</strong>
              <span>{request.clientName||"—"}</span>
              <span>{request.type==="Web"?"Web App":request.type}</span>
              <span><Status v={request.status}/></span>
              <span>{formatTargetDate(request.createdAt)}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="target-empty"><ClipboardList/><strong>No client requests yet</strong><span>Your next public request will appear here.</span></div>
      )}
    </section>
  </section>;
}

function TargetKpi({label,value,delta,tone}:{label:string;value:string;delta:string;tone:string}){
  return <div className={"target-kpi "+tone}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{delta}</small>
  </div>;
}

function buildRequestChart(requests:ClientRequest[]){
  const now=Date.now();
  const days=Array.from({length:30},(_,index)=>{
    const date=new Date(now-(29-index)*86400000);
    date.setHours(0,0,0,0);
    return date;
  });
  const counts=days.map((date)=>{
    const next=new Date(date); next.setDate(next.getDate()+1);
    return requests.filter((request)=>{
      const created=new Date(request.createdAt).getTime();
      return created>=date.getTime() && created<next.getTime();
    }).length;
  });
  const max=Math.max(1,...counts);
  const points=days.map((date,index)=>({
    key:date.toISOString(),
    label:date.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    value:counts[index],
    height:counts[index]===0?3:Math.max(7,counts[index]/max*100),
  }));
  const labelIndexes=[0,7,14,21,29];
  return {
    max,
    points,
    labels:labelIndexes.map((index)=>days[index].toLocaleDateString("en-US",{month:"short",day:"numeric"})),
  };
}

function formatTargetDate(value:string){
  const date=new Date(value);
  const now=Date.now();
  const diff=Math.max(0,now-date.getTime());
  const minutes=Math.floor(diff/60000);
  if(minutes<60)return Math.max(1,minutes)+" min";
  const hours=Math.floor(minutes/60);
  if(hours<24)return hours+"h ago";
  const days=Math.floor(hours/24);
  if(days===1)return "1d ago";
  if(days<7)return days+"d ago";
  return date.toLocaleDateString("en-US",{month:"short",day:"2-digit"});
}


function Status({v}:{v:"New"|"Reviewed"|"Converted"|"Archived"}){
  return <span className={"dashboard-status "+v.toLowerCase()}>{v}</span>;
}
