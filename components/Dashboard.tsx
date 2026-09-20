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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestId = params.get("requestId");
    if (requestId) {
      setRequestIdFromUrl(requestId);
      setPage("requests");
    }
  }, []);

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
    setPage("detail");
  };

  if (isSupabaseConfigured && authLoading) {
    return <main className="auth-shell"><div className="client-loading">Loading private workspace…</div></main>;
  }

  if (isSupabaseConfigured && !authenticated) {
    return <AuthScreen />;
  }

  const renderPage = () => {
    if (page === "new") return <NewProject onBack={() => setPage("dashboard")} />;
    if (page === "rates") return <PricingRates onBack={() => setPage("dashboard")} />;
    if (page === "projects") return <Projects onBack={() => setPage("dashboard")} onNew={() => setPage("new")} onOpen={openProject} />;
    if (page === "templates") return <Templates onBack={() => setPage("dashboard")} onNew={() => setPage("new")} />;
    if (page === "analytics") return <Analytics onBack={() => setPage("dashboard")} />;
    if (page === "requests") return <ClientRequests requestIdFromUrl={requestIdFromUrl} onBack={() => setPage("dashboard")} />;
    if (page === "detail" && selectedProject) return <ProjectDetail project={selectedProject} onBack={() => setPage("projects")} />;

    return (
      <DashboardHome
        onNew={() => setPage("new")}
        onProjects={() => setPage("projects")}
        onRates={() => setPage("rates")}
        onAnalytics={() => setPage("analytics")}
        onRequests={() => setPage("requests")}
      />
    );
  };

  const signOut = () => supabase?.auth.signOut();

  return (
    <main className="shell">
      <aside className="sidebar dashboard-sidebar">
        <div className="brand dashboard-brand">
          <img src="/skup-mark.svg" alt="SKUP Studio" />
          <div><strong>SKUP Studio</strong><small>DevEstimate</small></div>
        </div>

        <nav className="dashboard-nav">
          {menu.map(({ page: target, label, icon: Icon }) => (
            <a
              key={target}
              className={page === target || (target === "projects" && page === "detail") ? "active" : ""}
              onClick={() => setPage(target)}
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

function DashboardHome({
  onNew,
  onProjects,
  onRates,
  onAnalytics,
  onRequests,
}: {
  onNew: () => void;
  onProjects: () => void;
  onRates: () => void;
  onAnalytics: () => void;
  onRequests: () => void;
}) {
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const next = await loadClientRequests();
        if (alive) setRequests(next);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const analyzed = requests.filter((request) => request.analysis?.hours);
    const converted = requests.filter((request) => request.status === "Converted").length;
    const conversion = requests.length ? Math.round((converted / requests.length) * 100) : 0;
    const rates = loadRates();
    const value = analyzed.reduce((sum, request) => {
      const analysis = request.analysis;
      if (!analysis) return sum;
      const complexity = 1 + (analysis.complexity - 5) * 0.04;
      return sum + priceEstimate(analysis.hours, request.type, rates, complexity).final;
    }, 0);

    return {
      total: requests.length,
      newCount: requests.filter((request) => request.status === "New").length,
      analyzed: analyzed.length,
      conversion,
      value,
    };
  }, [requests]);

  const recent = requests.slice(0, 5);
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="content dashboard-home-page">
      <header className="dashboard-toolbar">
        <div className="dashboard-search">
          <Search />
          <input placeholder="Search requests, projects..." />
        </div>
        <button className="dashboard-period"><span>Last 30 days</span><ChevronDown /></button>
        <button className="dashboard-bell" aria-label="Notifications"><Bell /></button>
        <i className="dashboard-avatar">P</i>
      </header>

      <div className="dashboard-hero">
        <div>
          <small>OVERVIEW</small>
          <h1>{greeting}, Paata <span>👋</span></h1>
          <p>Here’s what’s happening with your projects today.</p>
        </div>
        <button className="primary dashboard-new-request" onClick={onRequests}><Plus /> New request</button>
      </div>

      <div className="dashboard-kpis">
        <KpiCard icon={<ClipboardList />} iconClass="blue" label="Client requests" value={String(stats.total)} delta="+8% this month" />
        <KpiCard icon={<FileText />} iconClass="green" label="Analyzed requests" value={String(stats.analyzed)} delta="+12% this month" />
        <KpiCard icon={<TrendingUp />} iconClass="purple" label="Conversion rate" value={String(stats.conversion) + "%"} delta={stats.total ? String(stats.newCount) + " new" : "No conversions yet"} />
        <KpiCard icon={<CircleDollarSign />} iconClass="gold" label="Estimated revenue" value={"$" + Math.round(stats.value).toLocaleString()} delta="Based on internal estimates" />
      </div>

      <div className="dashboard-primary-grid">
        <section className="dashboard-card dashboard-requests-card">
          <div className="dashboard-card-head">
            <div>
              <h2>Recent client requests</h2>
              <p>Latest requests received from the public intake form.</p>
            </div>
            <button onClick={onRequests}>View all</button>
          </div>

          {loading ? (
            <div className="dashboard-request-empty">Loading requests…</div>
          ) : recent.length ? (
            <div className="dashboard-request-table">
              <div className="dashboard-request-table-head">
                <span>Project</span><span>Client</span><span>Type</span><span>Status</span><span>Date</span>
              </div>
              {recent.map((request) => (
                <button key={request.id} className="dashboard-request-row" onClick={onRequests}>
                  <span className="dashboard-project-cell"><i><ClipboardList /></i><strong>{request.projectName}</strong></span>
                  <span>{request.clientName || "—"}</span>
                  <span>{request.type}</span>
                  <span><Status value={request.status} /></span>
                  <span>{formatRelative(request.createdAt)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-request-empty">
              <ClipboardList />
              <strong>No client requests yet</strong>
              <span>Your next public request will appear here.</span>
            </div>
          )}
        </section>

        <section className="dashboard-side-column">
          <MiniChart title="Client requests" value={stats.total} colorClass="blue-line" points="M0 126 C35 110 55 120 82 102 S135 108 160 82 S220 92 246 56 S300 78 330 39" />
          <MiniChart title="Conversion rate" value={String(stats.conversion) + "%"} colorClass="green-line" points="M0 126 C35 120 55 122 84 111 S135 118 162 96 S218 99 250 86 S300 66 330 54" />
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-card dashboard-performance-card">
          <div className="dashboard-card-head">
            <div>
              <h2>Performance</h2>
              <p>Requests, analysis and delivery signals.</p>
            </div>
            <button onClick={onAnalytics}>Open analytics</button>
          </div>
          <div className="dashboard-chart">
            <div className="dashboard-chart-labels"><span>{Math.max(10, stats.total + 10)}</span><span>{Math.max(5, Math.round(stats.total / 2))}</span><span>0</span></div>
            <div className="dashboard-chart-area">
              {[1,2,3].map((n) => <span key={n} />)}
              <svg viewBox="0 0 640 180" preserveAspectRatio="none">
                <path d="M0 150 C55 144 78 154 128 132 S188 143 238 110 S300 124 350 100 S418 122 470 72 S560 85 640 34" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M0 150 C55 144 78 154 128 132 S188 143 238 110 S300 124 350 100 S418 122 470 72 S560 85 640 34 L640 180 L0 180 Z" fill="currentColor" opacity=".08" />
              </svg>
              <div className="dashboard-chart-axis"><span>Oct 1</span><span>Oct 8</span><span>Oct 15</span><span>Oct 22</span><span>Oct 29</span></div>
            </div>
          </div>
        </section>

        <section className="dashboard-card dashboard-actions-card">
          <div className="dashboard-card-head">
            <div>
              <h2>Quick actions</h2>
              <p>Common workspace actions.</p>
            </div>
          </div>
          <div className="dashboard-actions">
            <button onClick={onNew}><Plus /><span><strong>New project</strong><small>Start a fresh estimate</small></span></button>
            <button onClick={onRequests}><ClipboardList /><span><strong>Client requests</strong><small>Review incoming briefs</small></span></button>
            <button onClick={onAnalytics}><BarChart3 /><span><strong>Analytics</strong><small>Check estimation accuracy</small></span></button>
            <button onClick={onRates}><Settings /><span><strong>Pricing</strong><small>Update rates and rules</small></span></button>
          </div>
        </section>
      </div>
    </section>
  );
}

function KpiCard({ icon, iconClass, label, value, delta }: { icon: React.ReactNode; iconClass: string; label: string; value: string; delta: string }) {
  return (
    <div className="dashboard-kpi">
      <div className={"dashboard-kpi-icon " + iconClass}>{icon}</div>
      <div className="dashboard-kpi-copy"><span>{label}</span><strong>{value}</strong><small>{delta}</small></div>
    </div>
  );
}

function MiniChart({ title, value, colorClass, points }: { title: string; value: string | number; colorClass: string; points: string }) {
  return (
    <div className="dashboard-card dashboard-mini-chart">
      <div>
        <span>{title}</span>
        <button aria-label="Dismiss">×</button>
      </div>
      <strong>{value}</strong>
      <svg viewBox="0 0 330 145" preserveAspectRatio="none" className={colorClass}>
        <path d={points} fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
    </div>
  );
}

function Status({ value }: { value: ClientRequest["status"] }) {
  return <span className={"dashboard-status " + value.toLowerCase()}>{value}</span>;
}

function formatRelative(value: string) {
  const created = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - created);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return String(Math.max(1, minutes)) + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return String(hours) + "h ago";
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  return String(days) + "d ago";
}
