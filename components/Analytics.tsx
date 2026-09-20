"use client";

import { Activity, ArrowLeft, BarChart3, Clock3, DollarSign, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { loadProjects, saveProject, StoredProject } from "../lib/projects";
import { getLearningSignal } from "../lib/learning";
import type { ClientRequest } from "../lib/clientRequests";

const demo: StoredProject[] = [
  {id:"analytics-demo-1",name:"E-commerce Platform",client:"Demo",type:"Web",description:"",features:[],flags:[],deadline:"",budget:"",hours:80,complexity:7,value:4850,createdAt:"2026-08-12",status:"Completed",actualHours:92},
  {id:"analytics-demo-2",name:"Restaurant Website",client:"Demo",type:"WordPress",description:"",features:[],flags:[],deadline:"",budget:"",hours:32,complexity:3,value:1200,createdAt:"2026-08-28",status:"Completed",actualHours:28},
  {id:"analytics-demo-3",name:"Booking Platform",client:"Demo",type:"Web",description:"",features:[],flags:[],deadline:"",budget:"",hours:104,complexity:8,value:6700,createdAt:"2026-09-04",status:"Completed",actualHours:118},
];

export default function Analytics({onBack}:{onBack:()=>void}) {
  const [projects,setProjects]=useState<StoredProject[]>([]);
  const [selected,setSelected]=useState("");
  useEffect(()=>setProjects(loadProjects()),[]);
  const source=projects.length?projects:demo;
  const completed=source.filter(p=>p.status==="Completed");
  const withActual=source.filter(p=>p.actualHours && p.actualHours>0);
  const avgVariance=withActual.length ? withActual.reduce((sum,p)=>sum+(((p.actualHours||0)-p.hours)/p.hours*100),0)/withActual.length : 0;
  const totalEstimated=source.reduce((sum,p)=>sum+p.hours,0);
  const totalActual=withActual.reduce((sum,p)=>sum+(p.actualHours||0),0);
  const accuracy=withActual.length ? Math.max(0,Math.round(100-Math.abs(avgVariance))) : 0;
  const current=selected ? source.find(p=>p.id===selected) : null;
  const learningSampleCount = withActual.length;
  const learningVariance = withActual.length
    ? withActual.reduce((sum,p)=>sum+(((p.actualHours||0)-p.hours)/p.hours*100),0)/withActual.length
    : null;
  const starterCoverage = Math.min(100, 58 + source.length * 3);
  const demoRequest: ClientRequest = {
    id:"analytics-learning-demo",requestLinkId:null,requestToken:"",
    projectName:"Learning preview",clientName:"",company:"",email:"",phone:"",
    type:"Web",description:"dashboard booking ecommerce",features:["Dashboard","Booking"],deadline:"",budget:"",
    budgetCurrency:"GEL",flags:["Admin panel","Payments"],notes:"",status:"New",createdAt:new Date().toISOString(),
  };
  const learningPreview = getLearningSignal(demoRequest, {hours:72,complexity:6,confidence:64,missing:[],stack:[],groups:[]}, source);

  const updateActual=(project:StoredProject,value:string)=>{
    const actual=Math.max(0,Number(value)||0);
    saveProject({...project,actualHours:actual});
    setProjects(loadProjects());
  };

  return <section className="content analytics-page">
    <header><div className="np-header-spacer"/><div className="np-save">Estimator performance</div></header>
    <div className="analytics-top">
      <div><button className="back-link" onClick={onBack}><ArrowLeft/> Back to dashboard</button><small>ANALYTICS</small><h1>Estimate Performance</h1><p>Use completed projects to improve future estimates.</p></div>
    </div>
    <div className="analytics-stats">
      <div><Target/><span>Estimate accuracy</span><strong>{accuracy}%</strong><small>{withActual.length} project{withActual.length===1?"":"s"} with actual hours</small></div>
      <div><Clock3/><span>Estimated hours</span><strong>{totalEstimated}h</strong><small>{completed.length} completed project{completed.length===1?"":"s"}</small></div>
      <div><Activity/><span>Actual hours</span><strong>{totalActual || "—"}</strong><small>Recorded delivery time</small></div>
      <div><TrendingUp/><span>Average variance</span><strong>{withActual.length ? (avgVariance>0?"+":"")+avgVariance.toFixed(1)+"%" : "—"}</strong><small>Actual vs estimated</small></div>
    </div>

    <div className="np-card estimator-intelligence-card">
      <div className="np-card-head"><div><h2>Estimator Intelligence</h2><p>როგორ სწავლობს და ასწორებს სისტემა future estimates-ს.</p></div><span>{learningSampleCount ? "LEARNING" : "STARTER MODE"}</span></div>
      <div className="learning-overview-grid">
        <div><span>რეალური პროექტები</span><strong>{learningSampleCount || "—"}</strong><small>actual hours-ით</small></div>
        <div><span>საშუალო გადახრა</span><strong>{learningVariance === null ? "—" : (learningVariance > 0 ? "+" : "") + learningVariance.toFixed(1) + "%"}</strong><small>actual vs estimated</small></div>
        <div><span>Starter coverage</span><strong>{starterCoverage}%</strong><small>საწყისი წესები</small></div>
        <div><span>Preview confidence</span><strong>{learningPreview.confidence}%</strong><small>მაგალითის request</small></div>
      </div>
      <div className="learning-note"><span>{learningSampleCount >= 2 ? "სისტემა უკვე იყენებს შენს ისტორიულ მონაცემებს მსგავსი პროექტების estimate-ის კორექტირებისთვის." : "ისტორიული პროექტების არქონის შემთხვევაში estimate მუშაობს starter rules + AI analysis-ზე და კორექტირებას მომავალში დაიწყებს."}</span></div>
    </div>

    <div className="analytics-grid">
      <div className="np-card">
        <div className="np-card-head"><div><h2>Project accuracy</h2><p>Compare estimated and actual effort</p></div><span>{source.length} projects</span></div>
        <div className="accuracy-list">{source.map(p=>{
          const variance=p.actualHours?((p.actualHours-p.hours)/p.hours*100):null;
          return <button className={"accuracy-row "+(selected===p.id?"selected":"")} key={p.id} onClick={()=>setSelected(p.id)}>
            <div><strong>{p.name}</strong><small>{p.type}</small></div>
            <span>{p.hours}h est.</span><span>{p.actualHours?p.actualHours+"h actual":"—"}</span>
            <b>{variance===null?"Not recorded":(variance>0?"+":"")+variance.toFixed(0)+"%"}</b>
          </button>
        })}</div>
      </div>
      <div className="np-card">
        <div className="np-card-head"><div><h2>Commercial overview</h2><p>Estimated value across saved projects</p></div><span>VALUE</span></div>
        <div className="commercial-card"><DollarSign/><strong>{"$"+source.reduce((sum,p)=>sum+p.value,0).toLocaleString()}</strong><span>Total estimated value</span></div>
        <div className="analytics-bars">{["Web","Mobile","WordPress","Hybrid"].map(type=>{const count=source.filter(p=>p.type===type).length;return <div key={type}><div><span>{type}</span><b>{count}</b></div><em><i style={{width:(count/Math.max(1,source.length))*100+"%"}}/></em></div>})}</div>
      </div>
    </div>

    <div className="np-card actual-card">
      <div className="np-card-head"><div><h2>Record actual hours</h2><p>Enter the real delivery time after completion so future estimates can learn from history.</p></div><span>{withActual.length} recorded</span></div>
      {source.map(p=><div className="actual-row" key={p.id}><div><strong>{p.name}</strong><small>Estimated {p.hours}h · Current status: {p.status}</small></div><label><input type="number" min="0" value={p.actualHours||""} onChange={e=>updateActual(p,e.target.value)} placeholder="Actual hours"/><span>hours</span></label></div>)}
    </div>

    {current && <div className="analytics-note"><BarChart3/><span>Selected: <strong>{current.name}</strong>. Recording actual hours will update this project's history and the aggregate accuracy metrics.</span></div>}
  </section>;
}
