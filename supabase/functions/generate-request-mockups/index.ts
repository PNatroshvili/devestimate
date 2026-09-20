import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const cloudflareAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
const cloudflareApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
const cloudflareVisualModel = "@cf/black-forest-labs/flux-2-klein-4b";
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
  visualAssets?: { label:string; kind?:string; url?:string; data?:string }[];
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
async function generateVisualAsset(slot:string, request:any) {
  if (!cloudflareAccountId || !cloudflareApiToken) return "";
  const brief=String(request.description||"").slice(0,1400);
  const prompts:Record<string,string>={
    overview:"Premium ecommerce hero/product photography for a large online marketplace. Clean studio product assortment, tasteful neutral background, modern commercial art direction, no text, no logos, no UI, realistic photography.",
    core:"Premium ecommerce product detail photography. One hero consumer product with subtle lifestyle context, clean studio lighting, no text, no logos, no UI, realistic commercial photography.",
    admin:"Premium ecommerce operations visual: organized product boxes, inventory labels without readable text, warehouse/product catalog aesthetic, clean modern commercial photography, no UI, no logos.",
    mobile:"Premium ecommerce lifestyle product photography suitable for a mobile shopping screen, single hero product, clean background, no text, no logos, no UI."
  };
  const prompt=(prompts[slot]||prompts.overview)+"\nProject context: "+brief;
  try{
    const endpoint="https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(cloudflareAccountId)+"/ai/run/"+cloudflareVisualModel;
    const form=new FormData();
    form.append("prompt",prompt);
    form.append("width","768");
    form.append("height","512");
    form.append("guidance","3.5");
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort("TIMEOUT"),30000);
    let response:Response;
    try{
      response=await fetch(endpoint,{method:"POST",headers:{Authorization:"Bearer "+cloudflareApiToken},body:form,signal:controller.signal});
    }finally{clearTimeout(timer);}
    if(!response.ok) return "";
    const payload:any=await response.json();
    const b64=payload?.result?.image;
    return b64?"data:image/jpeg;base64,"+b64:"";
  }catch{return "";}
}

function visualAsset(x:number,y:number,w:number,h:number,asset:any,c:any){
  if(asset?.data){
    return '<image href="'+esc(asset.data)+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice"/>';
  }
  if(asset?.url){
    return '<image href="'+esc(asset.url)+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice"/>';
  }
  const label=truncate(asset?.label||"Product visual",24);
  const kind=String(asset?.kind||"product");
  const accent=kind==="banner"?"#DDEBFF":kind==="avatar"?"#E8E5FF":"#F2F4F7";
  let out=box(x,y,w,h,accent,"none",12);
  out+=box(x+w*.18,y+h*.18,w*.64,h*.48,"#FFFFFF","none",10);
  out+='<circle cx="'+(x+w*.5)+'" cy="'+(y+h*.42)+'" r="'+Math.min(w,h)*.09+'" fill="'+c.accent+'" opacity=".9"/>';
  out+=tx(x+w*.5,y+h*.83,label,10,650,c.text,"middle");
  return out;
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
  if(spec.slot==="overview"){
    s+=box(x0,top,cw,190,c.panel,c.border,14);
    const heroAsset=(spec.visualAssets||[])[0];
    s+=visualAsset(x0+18,top+18,260,154,heroAsset,c);
    s+=tx(x0+302,top+52,"აღმოაჩინე ახალი პროდუქტები",22,750,c.text);
    s+=tx(x0+302,top+78,"შერჩეული კოლექცია და საუკეთესო შეთავაზებები",12,450,c.muted);
    s+=box(x0+302,top+106,138,38,c.accent,"none",8);
    s+=tx(x0+371,top+130,"შეიძინე ახლა",11,700,"#fff","middle");
    s+=tx(x0+302,top+164,"უფასო მიწოდება • უსაფრთხო გადახდა • სწრაფი checkout",10,550,c.muted);
    const cats=["ტექნიკა","ტანსაცმელი","სახლი","სპორტი","სილამაზე"];
    cats.forEach((cat,i)=>{const xx=x0+i*((cw-36)/5+9);s+=box(xx,top+210,(cw-36)/5,48,c.panel,c.border,10);s+=tx(xx+(cw-36)/10,top+240,cat,11,650,c.text,"middle");});
    s+=tx(x0,top+292,"პოპულარული პროდუქტები",17,750,c.text);
    const pw=(cw-42)/4;
    ["Wireless Headphones","Minimal Sneaker","Smart Watch","Travel Backpack"].forEach((name,i)=>{
      const xx=x0+i*(pw+14); s+=box(xx,top+312,pw,170,c.panel,c.border,12);
      const a=(spec.visualAssets||[])[i%Math.max(1,(spec.visualAssets||[]).length)];
      s+=visualAsset(xx+10,top+322,pw-20,92,a,c);
      s+=tx(xx+14,top+438,name,11,650,c.text);
      s+=tx(xx+14,top+460,["₾249","₾319","₾579","₾189"][i],14,750,c.text);
    });
  }else if(spec.slot==="core"){
    s+=box(x0,top,cw,460,c.panel,c.border,14);
    const hero=(spec.visualAssets||[])[0];
    s+=visualAsset(x0+22,top+22,360,300,hero,c);
    s+=tx(x0+410,top+48,"Premium Wireless Headphones",21,750,c.text);
    s+=tx(x0+410,top+78,"₾249",24,800,c.text);
    s+=tx(x0+410,top+108,"4.8 ★  ·  128 reviews  ·  In stock",11,550,c.muted);
    s+=tx(x0+410,top+146,"ფერი",10,650,c.muted);
    ["შავი","თეთრი","ლურჯი"].forEach((v,i)=>{const xx=x0+410+i*74;s+=box(xx,top+158,62,34,i===0?c.soft:c.bg,c.border,7);s+=tx(xx+31,top+180,v,10,600,c.text,"middle");});
    s+=tx(x0+410,top+224,"რაოდენობა",10,650,c.muted);
    s+=box(x0+410,top+236,110,38,c.bg,c.border,8);s+=tx(x0+465,top+261,"−   1   +",12,650,c.text,"middle");
    s+=box(x0+410,top+292,210,44,c.accent,"none",9);s+=tx(x0+515,top+320,"კალათაში დამატება",12,700,"#fff","middle");
    s+=box(x0+410,top+348,210,44,c.panel,c.border,9);s+=tx(x0+515,top+376,"ყიდვა 1 კლიკით",12,700,c.text,"middle");
    s+=tx(x0+22,top+350,"მიწოდება",11,650,c.text);s+=tx(x0+22,top+372,"თბილისი • 1–2 დღე",10,450,c.muted);
    s+=tx(x0+22,top+408,"უსაფრთხო გადახდა • დაბრუნება 14 დღეში",10,450,c.muted);
  }else if(spec.slot==="admin"){
    const kpis=["დღეს გაყიდვები","შეკვეთები","საშუალო ჩეკი","მარაგის დონე"];
    const kv=["₾48,240","1,284","₾184","86%"];
    kpis.forEach((k,i)=>{const kw=(cw-42)/4,xx=x0+i*(kw+14);s+=box(xx,top,kw,82,c.panel,c.border,10);s+=tx(xx+16,top+28,k,10,550,c.muted);s+=tx(xx+16,top+58,kv[i],20,800,c.text);});
    s+=box(x0,top+98,cw*.62,300,c.panel,c.border,12);
    s+=tx(x0+18,top+128,"ბოლო შეკვეთები",15,750,c.text);
    const cols=["Order","Customer","Status","Total"]; cols.forEach((col,i)=>s+=tx(x0+18+i*(cw*.62/4),top+158,col,10,650,c.muted));
    ["#10482","#10481","#10480","#10479","#10478"].forEach((id,i)=>{const y=top+184+i*42;s+='<line x1="'+x0+'" y1="'+y+'" x2="'+(x0+cw*.62)+'" y2="'+y+'" stroke="'+c.border+'"/>';s+=tx(x0+18,y+25,id,10,650,c.text);s+=tx(x0+18+cw*.62/4,y+25,["Nino","Giorgi","Ana","Dato","Mariam"][i],10,500,c.text);s+=tx(x0+18+cw*.62/2,y+25,"Paid",10,550,"#16A34A");s+=tx(x0+18+cw*.75,y+25,["₾249","₾579","₾189","₾319","₾129"][i],10,650,c.text);});
    s+=box(x0+cw*.62+14,top+98,cw*.38-14,300,c.panel,c.border,12);
    s+=tx(x0+cw*.62+32,top+128,"მარაგის გაფრთხილებები",15,750,c.text);
    ["Wireless Headphones","Travel Backpack","Smart Watch"].forEach((n,i)=>{const yy=top+172+i*64;s+=box(x0+cw*.62+32,yy,cw*.38-50,48,c.bg,"none",8);s+=tx(x0+cw*.62+46,yy+21,n,10,650,c.text);s+=tx(x0+cw*.62+46,yy+37,["12 დარჩა","7 დარჩა","4 დარჩა"][i],9,500,i===2?"#DC2626":c.muted);});
  }else{
    s+=box(x0,top,cw,520,c.panel,c.border,18);
    const a=(spec.visualAssets||[])[0];
    s+=visualAsset(x0+20,top+20,cw-40,210,a,c);
    s+=tx(x0+24,top+264,"Wireless Headphones",20,750,c.text);
    s+=tx(x0+24,top+292,"₾249",18,800,c.text);
    s+=box(x0+24,top+316,cw-48,46,c.accent,"none",10);s+=tx(x0+cw/2,top+345,"კალათაში დამატება",12,700,"#fff","middle");
    s+=tx(x0+24,top+390,"პოპულარული კატეგორიები",14,750,c.text);
    ["ტექნიკა","ტანსაცმელი","სახლი","სპორტი"].forEach((n,i)=>{const ww=(cw-72)/2,xx=x0+24+(i%2)*(ww+24),yy=top+408+Math.floor(i/2)*48;s+=box(xx,yy,ww,38,c.bg,c.border,9);s+=tx(xx+ww/2,yy+24,n,10,650,c.text,"middle");});
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
    visualAssets:[
      {label:"Product catalog",kind:"product"},
      {label:"Promotion banner",kind:"banner"},
      {label:"Customer profile",kind:"avatar"},
    ],
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
  const generatedData=await generateVisualAsset(slot,request);
  if(generatedData){
    spec.visualAssets=[{...(spec.visualAssets||[])[0],data:generatedData}];
  }
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
