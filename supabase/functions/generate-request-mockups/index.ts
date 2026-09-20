import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type MockupSpec = {
  slot: "overview" | "core" | "admin" | "mobile" | string;
  title: string;
  subtitle: string;
  nav: string[];
  primaryAction: string;
  stats: string[];
  widgets: string[];
  tableColumns: string[];
  formFields: string[];
  theme: "light" | "dark" | "neutral" | string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value: unknown, max = 30) {
  const t = String(value ?? "");
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function palette(theme: string) {
  return theme === "dark"
    ? { bg:"#111827", panel:"#172033", border:"#273449", text:"#F3F4F6", muted:"#9CA3AF", accent:"#7C9CFF", soft:"#1E293B" }
    : { bg:"#F7F8FA", panel:"#FFFFFF", border:"#E5E7EB", text:"#172033", muted:"#6B7280", accent:"#367CEB", soft:"#EEF4FF" };
}

function tx(x:number,y:number,v:unknown,size=14,weight=400,fill="#172033",anchor="start") {
  return '<text x="'+x+'" y="'+y+'" font-family="Inter,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'" text-anchor="'+anchor+'">'+esc(truncate(v,48))+"</text>";
}
function box(x:number,y:number,w:number,h:number,fill:string,stroke="none",r=10) {
  return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'" stroke="'+stroke+'"/>';
}

function renderSvg(spec: MockupSpec, request:any) {
  const c=palette(spec.theme), mobile=spec.slot==="mobile";
  const W=mobile?390:1440, H=mobile?844:900, sidebar=mobile?0:236;
  const x0=mobile?20:sidebar+42, cw=mobile?W-40:W-sidebar-84;
  let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">';
  s+=box(0,0,W,H,c.bg,"none",0);

  if(!mobile){
    s+=box(0,0,sidebar,H,c.panel,c.border,0);
    s+=tx(28,42,request.project_name||"Product",17,750,c.text);
    s+=tx(28,65,"Workspace",11,500,c.muted);
    (spec.nav||["Dashboard","Projects","Clients","Settings"]).slice(0,7).forEach((n,i)=>{
      const y=108+i*48, active=i===0||(spec.slot==="admin"&&i===1);
      if(active)s+=box(16,y-25,204,38,c.soft,"none",9);
      s+=tx(42,y,n,13,active?650:500,active?c.accent:c.text);
    });
    s+=tx(28,H-44,"AI workspace",11,500,c.muted);
  }

  s+=tx(x0,48,spec.title||"Overview",28,750,c.text);
  s+=tx(x0,73,spec.subtitle||request.description||"",12,400,c.muted);
  const action=String(spec.primaryAction||"Create"), aw=Math.max(112,Math.min(190,action.length*8+34));
  s+=box(x0+cw-aw,28,aw,40,c.accent,"none",9);
  s+=tx(x0+cw-aw/2,53,action,12,650,"#fff","middle");

  const stats=(spec.stats||[]).slice(0,mobile?2:4), gap=14, sw=(cw-gap*Math.max(0,stats.length-1))/Math.max(1,stats.length);
  stats.forEach((label,i)=>{
    const x=x0+i*(sw+gap);
    s+=box(x,112,sw,92,c.panel,c.border);
    s+=tx(x+18,140,label,11,500,c.muted);
    s+=tx(x+18,177,["1,248","84%","$24.8k","12"][i]||"24",25,750,c.text);
    s+=tx(x+sw-18,177,i%2?"+8.2%":"+12.4%",10,650,"#16A34A","end");
  });

  const top=226;
  if(spec.slot==="admin" || (spec.tableColumns||[]).length>2){
    const th=mobile?350:410;
    s+=box(x0,top,cw,th,c.panel,c.border);
    s+=tx(x0+18,top+32,(spec.widgets||[])[0]||"Recent activity",15,700,c.text);
    const cols=(spec.tableColumns||["Item","Status","Updated"]).slice(0,mobile?2:5), colW=cw/Math.max(1,cols.length);
    cols.forEach((col,i)=>s+=tx(x0+i*colW+18,top+66,col,10,650,c.muted));
    for(let r=0;r<5;r++){
      const y=top+94+r*56;
      s+='<line x1="'+x0+'" y1="'+y+'" x2="'+(x0+cw)+'" y2="'+y+'" stroke="'+c.border+'"/>';
      cols.forEach((_,i)=>s+=tx(x0+i*colW+18,y+33,["Acme project","In progress","Today","$4,800","Active"][i]||"—",11,i===0?600:450,c.text));
    }
  }else{
    const leftW=mobile?cw:cw*.62;
    s+=box(x0,top,leftW,420,c.panel,c.border);
    s+=tx(x0+18,top+32,(spec.widgets||[])[0]||"Main workflow",15,700,c.text);
    (spec.widgets||["Primary workflow","Recent activity","Key information"]).slice(0,4).forEach((item,i)=>{
      const y=top+68+i*72;
      s+=box(x0+18,y,leftW-36,54,c.bg,"none",8);
      s+=box(x0+30,y+13,42,28,c.soft,"none",14);
      s+=tx(x0+51,y+32,String(i+1).padStart(2,"0"),11,650,c.accent,"middle");
      s+=tx(x0+92,y+27,item,12,650,c.text);
      s+=tx(x0+92,y+45,"Configured from project requirements",10,400,c.muted);
    });
    if(!mobile){
      const rx=x0+leftW+16,rw=cw-leftW-16;
      s+=box(rx,top,rw,420,c.panel,c.border);
      s+=tx(rx+18,top+32,"Quick actions",15,700,c.text);
      (spec.formFields||["Search","Filter","Date"]).slice(0,4).forEach((f,i)=>{
        const y=top+64+i*68;
        s+=tx(rx+18,y,f,10,600,c.muted);
        s+=box(rx+18,y+10,rw-36,36,c.bg,c.border,7);
        s+=tx(rx+30,y+33,"Enter "+truncate(f,22),11,400,c.muted);
      });
    }
  }

  if(mobile){
    s+=box(14,H-72,W-28,54,c.panel,c.border,16);
    (spec.nav||["Home","Projects","Profile"]).slice(0,4).forEach((n,i)=>{
      const xx=42+i*((W-84)/3);
      s+=tx(xx,H-38,n,10,i===0?700:500,i===0?c.accent:c.muted,"middle");
    });
  }
  return s+"</svg>";
}

function fallbackMockupSpecs(request:any): MockupSpec[] {
  const analysis=request.analysis||{};
  const project=String(request.project_name||"Project");
  const features=Array.isArray(request.features)?request.features.filter(Boolean).slice(0,8):[];
  const stack=Array.isArray(analysis.stack)?analysis.stack.filter(Boolean).slice(0,5):[];
  const modules=Array.isArray(analysis.modules)?analysis.modules.filter(Boolean).slice(0,4):[];
  const groups=Array.isArray(analysis.groups)?analysis.groups.filter(Boolean).slice(0,4):[];
  const flags=Array.isArray(request.flags)?request.flags.filter(Boolean):[];
  const nav=["Dashboard","Projects","Clients","Tasks","Reports","Settings"];
  const primary=flags.includes("Payments")?"Review payment":"Create project";
  const stats=[
    "Projects",
    analysis.hours ? "Estimated hours" : "Active work",
    "Completion",
    "Open items",
  ];
  const widgets=[
    ...(features.length?features:[]),
    ...modules.map((m:any)=>m.name).filter(Boolean),
    ...groups.map((g:any)=>g.name).filter(Boolean),
  ].slice(0,6);
  const columns=["Item","Status","Owner","Updated","Priority"];
  const forms=[
    "Project name",
    "Client",
    "Status",
    "Deadline",
  ];
  const common=(slot:MockupSpec["slot"],title:string,subtitle:string):MockupSpec=>({
    slot,title,subtitle,nav,primaryAction:primary,stats,widgets,tableColumns:columns,formFields:forms,
    theme:slot==="mobile"?"light":"neutral",
  });
  return [
    common("overview",project+" overview","Project dashboard generated from the submitted brief."),
    common("core",features[0]||"Core workflow","Primary user flow based on the requested features."),
    common("admin","Administration","Internal controls for users, content and project operations."),
    common("mobile","Mobile experience","Responsive mobile view of the core workflow."),
  ];
}

async function runGeneration(request:any,userId:string,slot:string){
  const slots=["overview","core","admin","mobile"];
  if(!slots.includes(slot)) throw new Error("Invalid mockup slot.");
  const storedSpecs=Array.isArray(request.analysis?.mockupSpecs)?request.analysis.mockupSpecs as MockupSpec[]:[];
  const specs=storedSpecs.length===4 ? storedSpecs : fallbackMockupSpecs(request);
  const spec=specs.find(x=>x.slot===slot)||specs[0];
  const svg=renderSvg(spec,request);
  const path=userId+"/"+request.id+"/"+Date.now()+"-"+slot+".svg";
  const upload=await admin.storage.from("request-mockups").upload(path,new TextEncoder().encode(svg),{
    contentType:"image/svg+xml",upsert:true,cacheControl:"31536000"
  });
  if(upload.error) throw upload.error;

  const current=Array.isArray(request.mockups)?request.mockups:[];
  const next=[...current.filter((x:any)=>x?.slot!==slot),{
    slot,title:spec.title||slot,description:spec.subtitle||"Generated from structured project requirements.",
    path,generatedAt:new Date().toISOString()
  }];
  await admin.from("client_requests").update({
    mockups:next,mockups_status:next.length===4?"ready":"generating",mockups_error:null
  }).eq("id",request.id);
  return next;
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  if(!serviceRoleKey)return json({error:"SUPABASE_SERVICE_ROLE_KEY is not configured."},503);

  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return json({error:"Unauthorized"},401);
  let userId="";
  try{
    const p=auth.slice(7).split(".")[1].replaceAll("-","+").replaceAll("_","/");
    userId=String(JSON.parse(atob(p.padEnd(p.length+(4-p.length%4)%4,"="))).sub||"");
  }catch{return json({error:"Unauthorized"},401);}
  if(!userId)return json({error:"Unauthorized"},401);

  let body:any; try{body=await req.json();}catch{return json({error:"Invalid JSON body"},400);}
  const requestId=String(body.requestId||"").trim(), slot=String(body.slot||"").trim();
  if(!requestId)return json({error:"requestId is required"},400);

  const {data:request,error:requestError}=await admin.from("client_requests")
    .select("id,owner_id,project_name,client_name,type,description,features,flags,analysis,mockups")
    .eq("id",requestId).maybeSingle();
  if(requestError)return json({error:requestError.message},500);
  if(!request)return json({error:"Request not found"},404);
  if(request.owner_id!==userId)return json({error:"Forbidden"},403);

  await admin.from("client_requests").update({mockups_status:"generating",mockups_error:null}).eq("id",request.id);
  try{
    const mockups=await runGeneration(request,userId,slot||"overview");
    return json({ok:true,mockups,generatedSlot:slot||"overview"});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await admin.from("client_requests").update({mockups_status:"error",mockups_error:message.slice(0,2500)}).eq("id",request.id);
    return json({ok:false,code:"MOCKUP_GENERATION_FAILED",error:message},200);
  }
});
