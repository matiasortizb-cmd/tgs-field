import { useState, useEffect, useCallback } from "react";
import { getWorkers, getCampaigns, getReports, getBoletas, insertReport, insertWorker, insertCampaign, updateCampaign, deleteCampaign, updateReportStatus, insertBoleta } from "./supabase";


const C = {
  bg:"#07111C", surface:"#0D1E2E", surfaceHi:"#132840", border:"#1E3550",
  text:"#E4EDF6", muted:"#6B8BAA",
  impl:"#F5A623",  implDim:"#3A2800",
  promo:"#00C9A7", promoDim:"#003A32",
  mec:"#A78BFA",   mecDim:"#1E0A3C",
  green:"#2ECC71", red:"#E84C4C", blue:"#4A9EFF", orange:"#F97316",
};
const f = { d:"'Syne','DM Sans',sans-serif", b:"'DM Sans','Segoe UI',sans-serif" };
const nowStr = ()=>new Date().toLocaleString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const pct    = (a,b)=>b===0?0:Math.round((a/b)*100);
const uid    = ()=>Math.random().toString(36).slice(2,8);
const fmt$   = (n)=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n||0);

const VERTICALS = {
  impl:  {label:"Implementación POP",   icon:"🔧", color:C.impl,  dim:C.implDim,  desc:"Instalación de exhibidores y material POP en puntos de venta."},
  promo: {label:"Activaciones & Promo", icon:"🎪", color:C.promo, dim:C.promoDim, desc:"Sampling, degustaciones y activaciones de marca."},
  mec:   {label:"Mecanización",         icon:"⚙️", color:C.mec,   dim:C.mecDim,   desc:"Mecanización de materiales para campañas específicas."},
};

const PAY_MODES = ["Por visita/punto","Por día trabajado","Por campaña completa","Tarifa fija por material"];

// ─── WORKER ROLES & ZONES ─────────────────────────────────────────────────────
const WORKER_ROLES = ["implementador","promotor","mecanizador","supervisor"];
const ROLE_META = {
  implementador:{icon:"🔧",color:C.impl,  label:"Implementador"},
  promotor:     {icon:"🎪",color:C.promo, label:"Promotor"},
  mecanizador:  {icon:"⚙️",color:C.mec,   label:"Mecanizador"},
  supervisor:   {icon:"👁", color:C.blue,  label:"Supervisor"},
};
const COMUNAS_CL = [
  "Santiago","Providencia","Las Condes","Ñuñoa","Maipú","La Florida","San Bernardo",
  "Pudahuel","Quilicura","Recoleta","Independencia","San Miguel","Macul","Peñalolén",
  "Valparaíso","Viña del Mar","Concón","Quilpué","Villa Alemana",
  "Concepción","Talcahuano","San Pedro de la Paz","Hualpén","Chiguayante",
  "Puerto Montt","Puerto Varas","Osorno","Castro","Ancud",
  "Temuco","Padre Las Casas","Villarrica","Pucón",
  "La Serena","Coquimbo","Ovalle",
  "Antofagasta","Calama","Iquique","Arica",
  "Rancagua","San Fernando","Curicó","Talca","Linares","Chillán",
];
const REGIONS_CL = [
  "RM — Metropolitana","Valparaíso","Biobío","Araucanía","Los Lagos",
  "Maule","O'Higgins","Coquimbo","Antofagasta","Tarapacá","Arica y Parinacota",
  "Atacama","Los Ríos","Aysén","Magallanes",
];
const BANKS_CL = ["Banco Chile","BCI","Santander","Scotiabank","Itaú","BICE","Banco Estado","HSBC","Falabella","Ripley"];
const ACCOUNT_TYPES = ["Cuenta Corriente","Cuenta Vista","Cuenta RUT","Cuenta Ahorro"];

const INIT_WORKERS = [
  {id:"w1",name:"Carlos Muñoz",  rut:"12.345.678-9",phone:"+56912345678",email:"carlos@gmail.com",region:"RM — Metropolitana",comuna:"Maipú",roles:["implementador"],bank:"Banco Chile",accountType:"Cuenta Corriente",account:"1234567",status:"activo",rating:4.8,jobs:14,photo:"CM",lat:-33.511,lng:-70.763},
  {id:"w2",name:"Ana Soto",      rut:"13.456.789-0",phone:"+56923456789",email:"ana@gmail.com",    region:"Valparaíso",       comuna:"Viña del Mar",roles:["implementador","promotor"],bank:"BCI",accountType:"Cuenta Corriente",account:"2345678",status:"activo",rating:4.9,jobs:9,photo:"AS",lat:-33.024,lng:-71.551},
  {id:"w3",name:"Diego Reyes",   rut:"14.567.890-1",phone:"+56934567890",email:"diego@gmail.com",  region:"RM — Metropolitana",comuna:"Providencia",roles:["promotor"],bank:"Santander",accountType:"Cuenta Vista",account:"3456789",status:"activo",rating:4.6,jobs:11,photo:"DR",lat:-33.432,lng:-70.612},
  {id:"w4",name:"Fernanda Paz",  rut:"15.678.901-2",phone:"+56945678901",email:"fernan@gmail.com", region:"Biobío",           comuna:"Concepción",roles:["promotor","mecanizador"],bank:"Scotiabank",accountType:"Cuenta RUT",account:"4567890",status:"activo",rating:4.7,jobs:7,photo:"FP",lat:-36.827,lng:-73.049},
  {id:"w5",name:"Rosa Ibáñez",   rut:"16.789.012-3",phone:"+56956789012",email:"rosa@gmail.com",   region:"Araucanía",        comuna:"Temuco",roles:["supervisor"],bank:"Banco Chile",accountType:"Cuenta Corriente",account:"5678901",status:"activo",rating:5.0,jobs:22,photo:"RI",lat:-38.735,lng:-72.590},
  {id:"w6",name:"Mario Vega",    rut:"17.890.123-4",phone:"+56967890123",email:"mario@gmail.com",  region:"RM — Metropolitana",comuna:"Santiago",roles:["mecanizador","implementador"],bank:"BCI",accountType:"Cuenta Corriente",account:"6789012",status:"activo",rating:4.5,jobs:8,photo:"MV",lat:-33.457,lng:-70.648},
  {id:"w7",name:"Javiera Muñoz", rut:"18.901.234-5",phone:"+56978901234",email:"javi@gmail.com",   region:"Los Lagos",        comuna:"Puerto Montt",roles:["implementador","promotor"],bank:"Banco Estado",accountType:"Cuenta Vista",account:"7890123",status:"activo",rating:4.9,jobs:5,photo:"JM",lat:-41.469,lng:-72.942},
  {id:"w8",name:"Pedro Araya",   rut:"19.012.345-6",phone:"+56989012345",email:"pedro@gmail.com",  region:"Los Lagos",        comuna:"Puerto Varas",roles:["implementador"],bank:"Banco Chile",accountType:"Cuenta RUT",account:"8901234",status:"pendiente",rating:0,jobs:0,photo:"PA",lat:-41.320,lng:-72.983},
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const REPORT_STATUS = {
  pending:  {label:"Pendiente",  color:C.orange, icon:"⏳"},
  approved: {label:"Aprobado",   color:C.green,  icon:"✅"},
  rejected: {label:"Rechazado",  color:C.red,    icon:"❌"},
  review:   {label:"En revisión",color:C.blue,   icon:"🔍"},
};

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
const Pill=({color,children,full})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:0.4,background:color+"22",color,border:`1px solid ${color}44`,...(full?{width:"100%",justifyContent:"center"}:{})}}>{children}</span>
);
const Btn=({children,onClick,variant="primary",accent=C.impl,full,small,disabled})=>{
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,padding:small?"8px 14px":"13px 22px",borderRadius:12,border:"none",fontFamily:f.b,fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,transition:"all 0.15s",width:full?"100%":undefined};
  const v={primary:{background:accent,color:C.bg},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},subtle:{background:C.surfaceHi,color:C.text},danger:{background:C.red+"18",color:C.red,border:`1px solid ${C.red}33`},success:{background:C.green+"18",color:C.green,border:`1px solid ${C.green}33`}};
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
};
const Inp=({label,textarea,selectOptions,...props})=>(
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    {selectOptions
      ?<select style={{width:"100%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontFamily:f.b,fontSize:14,outline:"none",boxSizing:"border-box"}} {...props}>
        <option value="">— Seleccionar —</option>
        {selectOptions.map(o=><option key={o} value={o}>{o}</option>)}
       </select>
      :textarea
        ?<textarea style={{width:"100%",minHeight:75,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontFamily:f.b,fontSize:14,outline:"none",resize:"vertical",boxSizing:"border-box"}} {...props}/>
        :<input style={{width:"100%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontFamily:f.b,fontSize:14,outline:"none",boxSizing:"border-box"}} {...props}/>
    }
  </div>
);
const Card=({children,style,onClick,accent})=>(
  <div onClick={onClick} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:18,marginBottom:12,...(accent?{borderLeft:`4px solid ${accent}`}:{}),...(onClick?{cursor:"pointer"}:{}),...style}}>{children}</div>
);
const Toggle=({value,onChange,color=C.green})=>(
  <div onClick={()=>onChange(!value)} style={{width:46,height:24,borderRadius:12,background:value?color:C.border,cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
    <div style={{position:"absolute",top:2,left:value?22:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
  </div>
);
const Progress=({value,color})=>(
  <div style={{background:C.border,borderRadius:4,height:5,overflow:"hidden",marginTop:7}}>
    <div style={{width:`${value}%`,height:"100%",background:color,borderRadius:4,transition:"width 0.6s"}}/>
  </div>
);
const TopBar=({title,sub,onBack,onLogout,actions})=>(
  <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:20}}>
    {onBack&&<Btn variant="ghost" small onClick={onBack}>←</Btn>}
    <div style={{flex:1}}>
      <div style={{fontFamily:f.d,fontWeight:800,fontSize:15,color:C.text}}>{title}</div>
      {sub&&<div style={{fontSize:11,color:C.muted,marginTop:1}}>{sub}</div>}
    </div>
    {actions}
    {onLogout&&<Btn variant="ghost" small onClick={onLogout}>Salir</Btn>}
  </div>
);
const SL=({children,mt})=>(
  <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:10,marginTop:mt||4}}>{children}</div>
);
const PhotoSlot=({label,captured,onCapture})=>(
  <div onClick={onCapture} style={{background:captured?C.green+"15":C.surfaceHi,border:`2px dashed ${captured?C.green:C.border}`,borderRadius:11,aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",gap:5}}>
    <span style={{fontSize:22}}>{captured?"✅":"📷"}</span>
    <span style={{fontSize:9,fontWeight:700,color:captured?C.green:C.muted,textAlign:"center",padding:"0 4px"}}>{label}</span>
  </div>
);

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TEAM_LIST = [
  {id:"t1",name:"Carlos Muñoz", rut:"12.345.678-9",region:"RM",         role:"implementador",bank:"Banco Chile",account:"1234567"},
  {id:"t2",name:"Ana Soto",     rut:"13.456.789-0",region:"Valparaíso", role:"implementador",bank:"BCI",         account:"2345678"},
  {id:"t3",name:"Diego Reyes",  rut:"14.567.890-1",region:"RM",         role:"promotor",     bank:"Santander",   account:"3456789"},
  {id:"t4",name:"Fernanda Paz", rut:"15.678.901-2",region:"Bio Bio",    role:"promotor",     bank:"Scotiabank",  account:"4567890"},
  {id:"t5",name:"Rosa Ibáñez",  rut:"16.789.012-3",region:"Araucanía",  role:"supervisor",   bank:"Banco Chile",account:"5678901"},
  {id:"t6",name:"Mario Vega",   rut:"17.890.123-4",region:"RM",         role:"mecanizador",  bank:"BCI",         account:"6789012"},
];

const mkReport = (id,campaignId,type,user,status,extra={})=>({
  id, campaignId, type, user,
  status, // pending | approved | rejected | review
  date: nowStr(),
  photos:{a:true,b:true},
  supervisorComment:"",
  ...extra,
});

const INIT_REPORTS = [
  mkReport("r1","ic1","impl","Carlos Muñoz","pending",  {store:"Unimarc Las Condes",qty:3,issues:false,signed:true}),
  mkReport("r2","ic1","impl","Carlos Muñoz","approved", {store:"Jumbo Providencia", qty:2,issues:true, issueNote:"Falta espacio en góndola.",signed:true,supervisorComment:"Aprobado. Coordinar reposición."}),
  mkReport("r3","ic1","impl","Ana Soto",    "rejected", {store:"Lider Maipú",       qty:0,issues:false,signed:false,supervisorComment:"Fotos insuficientes. Volver a subir."}),
  mkReport("r4","pc1","promo","Diego Reyes","pending",  {point:"Hall Central Stand 14",contacts:84,samples:60,popOk:true}),
  mkReport("r5","pc1","promo","Diego Reyes","approved", {point:"Pabellón B",         contacts:52,samples:40,popOk:false,popNote:"Faltó banner.",supervisorComment:"OK, se tomó nota del material."}),
  mkReport("r6","mc1","mec",  "Mario Vega", "pending",  {location:"Bodega Santiago",units:320,material:"Vinilo lateral",issues:false}),
  mkReport("r7","mc1","mec",  "Mario Vega", "approved", {location:"Bodega Santiago",units:250,material:"Header góndola", issues:false,supervisorComment:"Correcto."}),
];

const INIT_IMPL = [
  {id:"ic1",type:"impl",client:"Coca-Cola",name:"Verano 2025 — Cooler Exhibidores",dateStart:"2025-03-01",dateEnd:"2025-04-30",stores:48,done:31,team:["Carlos Muñoz","Ana Soto"],points:["Unimarc Las Condes","Jumbo Providencia","Lider Maipú"],materials:["Cooler exhibidor","Vinilo lateral"],status:"activa",payMode:"Por visita/punto",payAmount:15000},
  {id:"ic2",type:"impl",client:"Mars",name:"Display Chocolates — Invierno",dateStart:"2025-03-10",dateEnd:"2025-05-31",stores:22,done:22,team:["Ana Soto"],points:["Unimarc Ñuñoa"],materials:["Display cartonero"],status:"completada",payMode:"Por campaña completa",payAmount:120000},
];
const INIT_PROMO = [
  {id:"pc1",type:"promo",client:"Stanley B&D",name:"Activación Feria Construcción",dateStart:"2025-03-25",dateEnd:"2025-03-30",points:12,done:9,days:5,team:["Diego Reyes"],activationPoints:["Hall Central Stand 14","Pabellón B"],targetContacts:500,targetSamples:300,status:"activa",payMode:"Por día trabajado",payAmount:35000},
];
const INIT_MEC = [
  {id:"mc1",type:"mec",client:"Coca-Cola",name:"Mecanización Vinilos Verano 2025",dateStart:"2025-03-01",dateEnd:"2025-03-20",totalUnits:1200,done:570,team:["Mario Vega"],material:"Vinilos laterales cooler",status:"activa",payMode:"Tarifa fija por material",payAmount:800},
];

// ─── APPROVAL MODAL ───────────────────────────────────────────────────────────
const ApprovalModal=({report,onClose,onApprove,onReject,onReview})=>{
  const [comment,setComment]=useState(report.supervisorComment||"");
  const vt = VERTICALS[report.type];
  return(
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:"24px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontFamily:f.d,fontWeight:900,fontSize:17}}>{report.store||report.point||report.location}</div>
            <div style={{fontSize:12,color:C.muted}}>{report.user} · {report.date}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:22,cursor:"pointer"}}>×</button>
        </div>

        {/* Reporte data */}
        <Card style={{marginBottom:12}}>
          <SL>Datos del reporte</SL>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {report.qty!==undefined&&<Pill color={vt.color}>📦 {report.qty} materiales</Pill>}
            {report.contacts&&<Pill color={vt.color}>🤝 {report.contacts} contactos</Pill>}
            {report.units&&<Pill color={vt.color}>⚙️ {report.units} unidades</Pill>}
            {report.signed&&<Pill color={C.green}>✓ Firmado</Pill>}
            {report.popOk===false&&<Pill color={C.red}>⚠️ POP incompleto</Pill>}
            {report.issues&&<Pill color={C.red}>⚠️ Con incidencia</Pill>}
          </div>
          {(report.issueNote||report.popNote)&&(
            <div style={{background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.red,marginTop:10}}>
              ⚠️ {report.issueNote||report.popNote}
            </div>
          )}
        </Card>

        {/* Fotos mock */}
        <Card style={{marginBottom:12}}>
          <SL>Fotografías adjuntas</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Foto 1","#1a3a2a"],["Foto 2","#1a2a3a"]].map(([lbl,bg])=>(
              <div key={lbl} style={{background:bg,borderRadius:10,aspectRatio:"4/3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>📷</div>
            ))}
          </div>
        </Card>

        {/* Comentario */}
        <Inp label="Comentario del supervisor" textarea placeholder="Escribe una observación, corrección o aprobación..." value={comment} onChange={e=>setComment(e.target.value)}/>

        {/* Acciones */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <Btn variant="danger" full onClick={()=>onReject(report.id,comment)}>❌ Rechazar</Btn>
          <Btn variant="success" full onClick={()=>onApprove(report.id,comment)}>✅ Aprobar</Btn>
        </div>
        <div style={{marginTop:10}}>
          <Btn variant="ghost" full small onClick={()=>onReview(report.id,comment)}>🔍 Solicitar corrección</Btn>
        </div>
      </div>
    </div>
  );
};

// ─── PAYMENTS MODULE ──────────────────────────────────────────────────────────
const PaymentsTab=({allCampaigns,reports,workers})=>{
  const [filter,setFilter]     =useState("all");
  const [selectedCamp,setSelC] =useState(null);  // campaign detail view
  const [boletasState,setBoletas]=useState({});   // campaignId__userName -> {uploaded,filename}

  const vColor={impl:C.impl,promo:C.promo,mec:C.mec};

  // Compute earnings per worker per campaign
  const computeForCampaign=(c)=>{
    const campReports=reports.filter(r=>r.campaignId===c.id&&r.status==="approved");
    const uniqueUsers=[...new Set(campReports.map(r=>r.user))];
    return uniqueUsers.map(userName=>{
      const person=workers.find(w=>w.name===userName)||{name:userName,rut:"—",bank:"—",accountType:"—",account:"—"};
      const userReports=campReports.filter(r=>r.user===userName);
      let amount=0;
      if(c.payMode==="Por visita/punto"||c.payMode==="Tarifa fija por material"){
        const units=userReports.reduce((s,r)=>s+(r.qty||r.units||1),0);
        amount=units*(c.payAmount||0);
      } else if(c.payMode==="Por día trabajado"){
        amount=userReports.length*(c.payAmount||0);
      } else if(c.payMode==="Por campaña completa"){
        amount=c.payAmount||0;
      }
      const boletaKey=`${c.id}__${userName}`;
      const boleta=boletasState[boletaKey]||{uploaded:false,filename:""};
      return {person,userReports,amount,userName,boleta,boletaKey};
    });
  };

  const campList=(filter==="all"?allCampaigns:allCampaigns.filter(c=>c.type===filter))
    .filter(c=>reports.some(r=>r.campaignId===c.id&&r.status==="approved"));

  const grandTotal=campList.reduce((s,c)=>{
    return s+computeForCampaign(c).reduce((ss,e)=>ss+e.amount,0);
  },0);

  const uploadBoleta=(key,name)=>setBoletas(prev=>({...prev,[key]:{uploaded:true,filename:name||"boleta.pdf"}}));

  // ── CAMPAIGN DETAIL ──
  if(selectedCamp){
    const c=selectedCamp;
    const vt=VERTICALS[c.type];
    const rows=computeForCampaign(c);
    const campTotal=rows.reduce((s,e)=>s+e.amount,0);
    const allBoletasOk=rows.every(e=>e.boleta.uploaded);
    const pendingBoletas=rows.filter(e=>!e.boleta.uploaded).length;

    return(
      <div style={{paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
          <Btn variant="ghost" small onClick={()=>setSelC(null)}>←</Btn>
          <div style={{flex:1}}>
            <div style={{fontFamily:f.d,fontWeight:900,fontSize:17}}>{c.client}</div>
            <div style={{fontSize:12,color:C.muted}}>{c.name}</div>
          </div>
          <Pill color={vt.color}>{vt.icon} {vt.label.split(" ")[0]}</Pill>
        </div>

        {/* Resumen campaña */}
        <div style={{background:`linear-gradient(135deg,${vt.dim},${C.surface})`,border:`1px solid ${vt.color}44`,borderRadius:16,padding:18,marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total bruto campaña</div>
              <div style={{fontFamily:f.d,fontSize:26,fontWeight:900,color:C.green}}>{fmt$(campTotal)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.muted}}>Líquido estimado</div>
              <div style={{fontFamily:f.d,fontSize:18,fontWeight:700,color:C.green}}>{fmt$(campTotal*0.8925)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Pill color={C.blue}>💰 {c.payMode}</Pill>
            <Pill color={rows.length>0?C.green:C.muted}>👥 {rows.length} worker{rows.length!==1?"s":""}</Pill>
            <Pill color={allBoletasOk?C.green:C.orange}>🧾 {rows.length-pendingBoletas}/{rows.length} boletas</Pill>
          </div>
        </div>

        {/* Boletas pendientes aviso */}
        {pendingBoletas>0&&(
          <div style={{background:C.orange+"18",border:`1px solid ${C.orange}44`,borderRadius:10,padding:"9px 14px",marginBottom:14,fontSize:12,color:C.orange}}>
            ⏳ {pendingBoletas} worker{pendingBoletas!==1?"s":""} aún no ha{pendingBoletas!==1?"n":""} subido su boleta. El pago quedará pendiente hasta recibirla.
          </div>
        )}

        {/* Por worker */}
        <SL>Detalle por worker</SL>
        {rows.map((e,i)=>{
          const liq=e.amount*0.8925;
          return(
            <Card key={i} accent={e.boleta.uploaded?C.green:C.border}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:C.surfaceHi,border:`1.5px solid ${e.boleta.uploaded?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:f.d,fontWeight:900,fontSize:13,color:C.text,flexShrink:0}}>
                    {e.userName.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{e.userName}</div>
                    <div style={{fontSize:11,color:C.muted}}>RUT {e.person.rut}</div>
                    <div style={{fontSize:11,color:C.muted}}>{e.person.bank} · {e.person.accountType}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:f.d,fontWeight:900,fontSize:16,color:C.green}}>{fmt$(e.amount)}</div>
                  <div style={{fontSize:10,color:C.muted}}>liq. {fmt$(liq)}</div>
                </div>
              </div>

              {/* Desglose */}
              <div style={{background:C.surfaceHi,borderRadius:8,padding:"7px 10px",fontSize:11,color:C.muted,marginBottom:10}}>
                {c.payMode==="Por visita/punto"||c.payMode==="Tarifa fija por material"
                  ?`${e.userReports.reduce((s,r)=>s+(r.qty||r.units||1),0)} unidades × ${fmt$(c.payAmount)}`
                  :c.payMode==="Por día trabajado"
                  ?`${e.userReports.length} días × ${fmt$(c.payAmount)}`
                  :`Campaña completa: ${fmt$(c.payAmount)}`
                }
                {" · "}{e.userReports.length} reporte{e.userReports.length!==1?"s":""} aprobado{e.userReports.length!==1?"s":""}
              </div>

              {/* Boleta */}
              {e.boleta.uploaded
                ?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 12px"}}>
                  <div style={{fontSize:12,color:C.green}}>🧾 {e.boleta.filename}</div>
                  <Pill color={C.green}>✓ Recibida</Pill>
                </div>
                :<div style={{background:C.orange+"18",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C.orange}}>⏳ Boleta pendiente</span>
                  <Btn variant="ghost" small onClick={()=>uploadBoleta(e.boletaKey,`boleta_${e.userName.split(" ")[0].toLowerCase()}_${c.client.toLowerCase()}.pdf`)}>
                    Simular subida
                  </Btn>
                </div>
              }
            </Card>
          );
        })}

        {/* Descarga */}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <Btn variant="subtle" full small onClick={()=>alert("Descarga planilla Excel de esta campaña")}>📊 Excel</Btn>
          <Btn accent={allBoletasOk?C.green:C.muted} full disabled={!allBoletasOk} onClick={()=>alert("Descarga PDF consolidado de pagos")}>
            📄 {allBoletasOk?"Descargar PDF":"Faltan boletas"}
          </Btn>
        </div>
        {!allBoletasOk&&<p style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:6}}>El PDF se habilita cuando todos los workers han subido su boleta</p>}
      </div>
    );
  }

  // ── CAMPAIGN LIST VIEW ──
  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{fontFamily:f.d,margin:"0 0 2px",fontSize:22,fontWeight:900}}>Pagos</h2>
          <p style={{color:C.muted,fontSize:12,margin:0}}>Por campaña · boletas de honorarios</p>
        </div>
        <Btn variant="subtle" small onClick={()=>alert("Descarga Excel consolidado de todos los pagos")}>⬇ Excel</Btn>
      </div>

      {/* Filtro */}
      <div style={{display:"flex",gap:7,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {[["all","Todas",C.text],["impl","Impl.",C.impl],["promo","Promo",C.promo],["mec","Mec.",C.mec]].map(([v,lbl,col])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{padding:"6px 13px",borderRadius:20,border:`1px solid ${filter===v?col:C.border}`,background:filter===v?col+"22":"transparent",color:filter===v?col:C.muted,fontFamily:f.b,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Resumen global */}
      <Card style={{background:`linear-gradient(135deg,#071a14,${C.surface})`,border:`1px solid ${C.green}33`,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Total global aprobado</div>
            <div style={{fontFamily:f.d,fontSize:26,fontWeight:900,color:C.green}}>{fmt$(grandTotal)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:C.muted}}>Líquido estimado</div>
            <div style={{fontFamily:f.d,fontSize:17,fontWeight:700,color:C.green}}>{fmt$(grandTotal*0.8925)}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>ret. 10.75% incluida</div>
          </div>
        </div>
      </Card>

      <SL>Campañas con pagos pendientes</SL>
      {campList.length===0&&<p style={{color:C.muted,textAlign:"center",padding:"30px 0"}}>Sin reportes aprobados aún.</p>}
      {campList.map(c=>{
        const vt=VERTICALS[c.type];
        const rows=computeForCampaign(c);
        const campTotal=rows.reduce((s,e)=>s+e.amount,0);
        const boletasOk=rows.filter(e=>e.boleta.uploaded).length;
        const allOk=boletasOk===rows.length;
        return(
          <Card key={c.id} accent={vt.color} onClick={()=>setSelC(c)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1,marginRight:10}}>
                <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:2}}>{c.client}</div>
                <div style={{fontFamily:f.d,fontWeight:800,fontSize:14}}>{c.name}</div>
                <div style={{fontSize:11,color:vt.color,marginTop:2}}>💰 {c.payMode}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontFamily:f.d,fontWeight:900,fontSize:17,color:C.green}}>{fmt$(campTotal)}</div>
                <div style={{fontSize:10,color:C.muted}}>liq. {fmt$(campTotal*0.8925)}</div>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
              <div style={{display:"flex",gap:6}}>
                <Pill color={C.blue}>👥 {rows.length}</Pill>
                <Pill color={allOk?C.green:C.orange}>🧾 {boletasOk}/{rows.length} boletas</Pill>
              </div>
              <span style={{fontSize:11,color:C.muted}}>Ver detalle →</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ─── APPROVAL TAB ─────────────────────────────────────────────────────────────
const ApprovalTab=({reports,setReports,allCampaigns,vertical})=>{
  const [modal,setModal]=useState(null);
  const [filterStatus,setFilterStatus]=useState("pending");

  const relevant=reports.filter(r=>r.type===vertical||(vertical==="all"));
  const filtered=filterStatus==="all"?relevant:relevant.filter(r=>r.status===filterStatus);

  const updateReport=(id,patch)=>setReports(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));
  const approve=(id,comment)=>{ updateReport(id,{status:"approved",supervisorComment:comment}); setModal(null); };
  const reject =(id,comment)=>{ updateReport(id,{status:"rejected",supervisorComment:comment}); setModal(null); };
  const review =(id,comment)=>{ updateReport(id,{status:"review",  supervisorComment:comment}); setModal(null); };

  const counts={pending:0,approved:0,rejected:0,review:0};
  relevant.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);

  return(
    <div style={{paddingBottom:80}}>
      {modal&&<ApprovalModal report={modal} onClose={()=>setModal(null)} onApprove={approve} onReject={reject} onReview={review}/>}

      <h2 style={{fontFamily:f.d,margin:"0 0 4px",fontSize:22,fontWeight:900}}>Aprobaciones</h2>
      <p style={{color:C.muted,fontSize:13,margin:"0 0 14px"}}>Revisa y aprueba reportes del campo</p>

      {/* Contadores */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        {Object.entries(REPORT_STATUS).map(([k,v])=>(
          <div key={k} onClick={()=>setFilterStatus(k)} style={{background:filterStatus===k?v.color+"22":C.surfaceHi,border:`1px solid ${filterStatus===k?v.color+"66":C.border}`,borderRadius:12,padding:"10px 6px",textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:16}}>{v.icon}</div>
            <div style={{fontFamily:f.d,fontWeight:900,fontSize:16,color:v.color}}>{counts[k]||0}</div>
            <div style={{fontSize:9,color:C.muted,fontWeight:700,letterSpacing:0.3}}>{v.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>setFilterStatus("all")} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
        {filterStatus==="all"?"▼ Todos":"Mostrar todos →"}
      </button>

      {filtered.length===0&&<p style={{color:C.muted,textAlign:"center",padding:"30px 0"}}>No hay reportes con este estado.</p>}

      {filtered.map(r=>{
        const vt=VERTICALS[r.type];
        const st=REPORT_STATUS[r.status];
        const camp=allCampaigns.find(c=>c.id===r.campaignId);
        return(
          <Card key={r.id} accent={st.color} onClick={()=>setModal(r)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",gap:6,marginBottom:4}}>
                  <Pill color={vt.color}>{vt.icon} {vt.label}</Pill>
                  <Pill color={st.color}>{st.icon} {st.label}</Pill>
                </div>
                <div style={{fontFamily:f.d,fontWeight:800,fontSize:14}}>{r.store||r.point||r.location}</div>
                <div style={{fontSize:11,color:C.muted}}>{r.user} · {camp?.client||""}</div>
              </div>
              <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>{r.date}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {r.qty!==undefined&&<span style={{fontSize:11,color:C.muted}}>📦 {r.qty}</span>}
              {r.contacts&&<span style={{fontSize:11,color:C.muted}}>🤝 {r.contacts}</span>}
              {r.units&&<span style={{fontSize:11,color:C.muted}}>⚙️ {r.units} uds</span>}
            </div>
            {r.supervisorComment&&(
              <div style={{background:C.surfaceHi,borderRadius:8,padding:"7px 10px",fontSize:11,color:C.muted,marginTop:8}}>
                💬 {r.supervisorComment}
              </div>
            )}
            {r.status==="pending"&&<div style={{textAlign:"right",marginTop:8}}><span style={{fontSize:11,color:C.orange,fontWeight:700}}>Tap para revisar →</span></div>}
          </Card>
        );
      })}
    </div>
  );
};

// ─── CAMPAIGN FORM ────────────────────────────────────────────────────────────
const CampaignForm=({type,initial,onSave,onCancel})=>{
  const vt=VERTICALS[type];
  const blank={client:"",name:"",dateStart:"",dateEnd:"",team:[],status:"activa",payMode:PAY_MODES[0],payAmount:"",
    ...(type==="impl"?{points:[""],materials:[""]}:{}),
    ...(type==="promo"?{activationPoints:[""],targetContacts:"",targetSamples:"",days:""}:{}),
    ...(type==="mec"?{material:"",totalUnits:""}:{}),
  };
  const [form,setForm]=useState(initial||blank);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addItem=(k)=>setF(k,[...form[k],""]);
  const removeItem=(k,i)=>setF(k,form[k].filter((_,j)=>j!==i));
  const editItem=(k,i,v)=>setF(k,form[k].map((x,j)=>j===i?v:x));
  const toggleTeam=(name)=>setF("team",form.team.includes(name)?form.team.filter(x=>x!==name):[...form.team,name]);
  const fieldPeople=TEAM_LIST.filter(t=>type==="impl"?t.role==="implementador":type==="promo"?t.role==="promotor"||t.role==="supervisor":t.role==="mecanizador");
  const canSave=form.client&&form.name&&form.dateStart&&form.dateEnd&&form.team.length>0&&form.payAmount;
  const listKey=type==="impl"?"points":type==="promo"?"activationPoints":null;

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={initial?"Editar campaña":"Nueva campaña"} sub={vt.label} onBack={onCancel}/>
      <div style={{padding:"18px 16px"}}>
        <div style={{marginBottom:16}}><Pill color={vt.color}>{vt.icon} {vt.label}</Pill></div>

        <Card>
          <SL>Datos del cliente</SL>
          <Inp label="Cliente / Marca" placeholder="ej: Coca-Cola" value={form.client} onChange={e=>setF("client",e.target.value)}/>
          <Inp label="Nombre de campaña" placeholder="ej: Verano 2025" value={form.name} onChange={e=>setF("name",e.target.value)}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Inp label="Fecha inicio" type="date" value={form.dateStart} onChange={e=>setF("dateStart",e.target.value)}/>
            <Inp label="Fecha fin"    type="date" value={form.dateEnd}   onChange={e=>setF("dateEnd",e.target.value)}/>
          </div>
          {type==="promo"&&<Inp label="Días de activación" type="number" placeholder="10" value={form.days} onChange={e=>setF("days",e.target.value)}/>}
          {type==="mec"&&<>
            <Inp label="Material a mecanizar" placeholder="ej: Vinilos laterales cooler" value={form.material} onChange={e=>setF("material",e.target.value)}/>
            <Inp label="Total de unidades" type="number" placeholder="1000" value={form.totalUnits} onChange={e=>setF("totalUnits",e.target.value)}/>
          </>}
          <Inp label="Estado" selectOptions={["activa","pausada","completada"]} value={form.status} onChange={e=>setF("status",e.target.value)}/>
        </Card>

        {/* PAGO */}
        <Card style={{border:`1px solid ${vt.color}44`,background:`linear-gradient(135deg,${vt.dim},${C.surface})`}}>
          <SL>💰 Configuración de pago</SL>
          <Inp label="Modalidad de pago" selectOptions={PAY_MODES} value={form.payMode} onChange={e=>setF("payMode",e.target.value)}/>
          <Inp label={`Monto (CLP) ${form.payMode==="Por visita/punto"?"por punto":form.payMode==="Por día trabajado"?"por día":form.payMode==="Tarifa fija por material"?"por unidad":"total campaña"}`}
            type="number" placeholder="ej: 15000" value={form.payAmount} onChange={e=>setF("payAmount",e.target.value)}/>
          {form.payAmount&&(
            <div style={{background:C.surfaceHi,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.muted}}>
              💡 {form.payMode==="Por visita/punto"?`Cada punto completado y aprobado = ${fmt$(form.payAmount)}`:
                  form.payMode==="Por día trabajado"?`Cada día con reporte aprobado = ${fmt$(form.payAmount)}`:
                  form.payMode==="Tarifa fija por material"?`Cada unidad mecanizada aprobada = ${fmt$(form.payAmount)}`:
                  `Monto único por campaña: ${fmt$(form.payAmount)}`}
            </div>
          )}
        </Card>

        {/* Equipo */}
        <Card>
          <SL>{type==="impl"?"Implementadores":type==="promo"?"Promotores / Supervisores":"Mecanizadores"}</SL>
          {fieldPeople.map(p=>(
            <div key={p.id} onClick={()=>toggleTeam(p.name)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 11px",borderRadius:10,background:form.team.includes(p.name)?vt.color+"18":C.surfaceHi,border:`1px solid ${form.team.includes(p.name)?vt.color+"55":C.border}`,marginBottom:7,cursor:"pointer"}}>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:form.team.includes(p.name)?vt.color:C.text}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted}}>RUT {p.rut} · {p.region}</div>
              </div>
              <div style={{width:20,height:20,borderRadius:"50%",background:form.team.includes(p.name)?vt.color:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:C.bg,fontWeight:900,flexShrink:0}}>
                {form.team.includes(p.name)&&"✓"}
              </div>
            </div>
          ))}
        </Card>

        {/* Puntos / materiales */}
        {listKey&&(
          <Card>
            <SL>{type==="impl"?"Puntos de venta":"Puntos de activación"}</SL>
            {form[listKey].map((pt,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={pt} onChange={e=>editItem(listKey,i,e.target.value)} placeholder={`Punto ${i+1}...`}
                  style={{flex:1,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none"}}/>
                {form[listKey].length>1&&<button onClick={()=>removeItem(listKey,i)} style={{background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:10,padding:"0 11px",color:C.red,cursor:"pointer",fontSize:17,fontWeight:700}}>×</button>}
              </div>
            ))}
            <Btn variant="ghost" small full onClick={()=>addItem(listKey)}>+ Agregar punto</Btn>
          </Card>
        )}
        {type==="impl"&&(
          <Card>
            <SL>Materiales POP esperados</SL>
            {form.materials.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={m} onChange={e=>editItem("materials",i,e.target.value)} placeholder={`Material ${i+1}...`}
                  style={{flex:1,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none"}}/>
                {form.materials.length>1&&<button onClick={()=>removeItem("materials",i)} style={{background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:10,padding:"0 11px",color:C.red,cursor:"pointer",fontSize:17}}>×</button>}
              </div>
            ))}
            <Btn variant="ghost" small full onClick={()=>addItem("materials")}>+ Agregar material</Btn>
          </Card>
        )}
        {type==="promo"&&(
          <Card>
            <SL>Metas</SL>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Inp label="Meta contactos" type="number" placeholder="500" value={form.targetContacts} onChange={e=>setF("targetContacts",e.target.value)}/>
              <Inp label="Meta muestras"  type="number" placeholder="300" value={form.targetSamples}  onChange={e=>setF("targetSamples",e.target.value)}/>
            </div>
          </Card>
        )}

        <div style={{background:vt.color+"12",border:`1px solid ${vt.color}33`,borderRadius:12,padding:14,marginBottom:16}}>
          <SL>Resumen</SL>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
            <Pill color={vt.color}>🎯 {form.client||"Sin cliente"}</Pill>
            <Pill color={C.blue}>📅 {form.dateStart||"?"} → {form.dateEnd||"?"}</Pill>
            <Pill color={C.green}>👥 {form.team.length} asignado{form.team.length!==1?"s":""}</Pill>
            {form.payAmount&&<Pill color={C.green}>💰 {fmt$(form.payAmount)}/{form.payMode==="Por campaña completa"?"campaña":form.payMode==="Por día trabajado"?"día":"unidad"}</Pill>}
          </div>
        </div>

        <Btn full accent={vt.color} disabled={!canSave} onClick={()=>onSave({...form,id:initial?.id||("c"+uid()),type,done:initial?.done||0,...(type==="promo"&&{points:parseInt(form.days)||1})})}>
          {initial?"Guardar cambios ✓":"Crear campaña ✓"}
        </Btn>
        {!canSave&&<p style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:7}}>Completa todos los campos obligatorios incluyendo el monto</p>}
      </div>
    </div>
  );
};

// ─── WORKER REGISTER SCREEN (público) ────────────────────────────────────────
const WorkerRegisterScreen=({onSuccess,onBack})=>{
  const [step,setStep]=useState(1); // 1=personal 2=roles 3=banco 4=ok
  const [form,setForm]=useState({name:"",rut:"",phone:"",email:"",region:"",comuna:"",address:"",roles:[],bank:"",accountType:"",account:"",photo:""});
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const toggleRole=(r)=>setF("roles",form.roles.includes(r)?form.roles.filter(x=>x!==r):[...form.roles,r]);

  if(step===4) return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",maxWidth:320}}>
        <div style={{fontSize:64,marginBottom:14}}>🎉</div>
        <h2 style={{fontFamily:f.d,fontSize:22,fontWeight:900,margin:"0 0 8px"}}>¡Registro enviado!</h2>
        <p style={{color:C.muted,lineHeight:1.6,marginBottom:8}}>Tu perfil está <strong style={{color:C.orange}}>pendiente de aprobación</strong> por el equipo TGS.</p>
        <p style={{color:C.muted,fontSize:12,marginBottom:24}}>Te avisaremos por WhatsApp al {form.phone} cuando tu cuenta esté activa.</p>
        <Btn full accent={C.impl} onClick={onBack||onSuccess}>Volver al inicio</Btn>
      </div>
    </div>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title="Únete a TGS Field" sub={`Paso ${step} de 3`} onBack={step>1?()=>setStep(s=>s-1):onBack}/>

      {/* Progress */}
      <div style={{padding:"12px 16px 0"}}>
        <div style={{display:"flex",gap:6,marginBottom:18}}>
          {[1,2,3].map(s=>(
            <div key={s} style={{flex:1,height:4,borderRadius:2,background:step>=s?C.impl:C.border,transition:"background 0.3s"}}/>
          ))}
        </div>
      </div>

      <div style={{padding:"0 16px"}}>
        {step===1&&<>
          <h3 style={{fontFamily:f.d,fontWeight:900,fontSize:18,margin:"0 0 16px"}}>Tus datos personales</h3>
          <Inp label="Nombre completo" placeholder="ej: Carlos Muñoz Pérez" value={form.name} onChange={e=>setF("name",e.target.value)}/>
          <Inp label="RUT" placeholder="ej: 12.345.678-9" value={form.rut} onChange={e=>setF("rut",e.target.value)}/>
          <Inp label="Teléfono (WhatsApp)" placeholder="+569 XXXX XXXX" value={form.phone} onChange={e=>setF("phone",e.target.value)}/>
          <Inp label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={e=>setF("email",e.target.value)}/>
          <Inp label="Región" selectOptions={REGIONS_CL} value={form.region} onChange={e=>setF("region",e.target.value)}/>
          <Inp label="Comuna de residencia" selectOptions={COMUNAS_CL} value={form.comuna} onChange={e=>setF("comuna",e.target.value)}/>
          <Inp label="Dirección (calle y número)" placeholder="ej: Av. Colón 1234, depto 5B" value={form.address} onChange={e=>setF("address",e.target.value)}/>
          {/* Foto placeholder */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:6}}>Foto de perfil</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:C.surfaceHi,border:`2px dashed ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>
                {form.photo?"😊":"📷"}
              </div>
              <Btn variant="ghost" small onClick={()=>setF("photo","uploaded")}>Subir foto</Btn>
            </div>
          </div>
          <Btn full accent={C.impl} disabled={!form.name||!form.rut||!form.phone||!form.region} onClick={()=>setStep(2)}>
            Continuar →
          </Btn>
        </>}

        {step===2&&<>
          <h3 style={{fontFamily:f.d,fontWeight:900,fontSize:18,margin:"0 0 6px"}}>¿En qué quieres trabajar?</h3>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 18px",lineHeight:1.5}}>Puedes seleccionar más de uno. Solo verás campañas de los tipos que elijas.</p>
          {Object.entries(ROLE_META).map(([r,rd])=>(
            <div key={r} onClick={()=>toggleRole(r)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:14,border:`1.5px solid ${form.roles.includes(r)?rd.color+"88":C.border}`,background:form.roles.includes(r)?rd.color+"15":C.surfaceHi,marginBottom:10,cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{fontSize:28}}>{rd.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:15,color:form.roles.includes(r)?rd.color:C.text}}>{rd.label}</div>
                <div style={{fontSize:12,color:C.muted,marginTop:2}}>
                  {r==="implementador"?"Instalar material POP en puntos de venta":
                   r==="promotor"?"Activaciones, sampling y degustaciones":
                   r==="mecanizador"?"Mecanizar materiales en bodega":"Supervisar equipos de campo"}
                </div>
              </div>
              <div style={{width:22,height:22,borderRadius:"50%",background:form.roles.includes(r)?rd.color:C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.bg,fontWeight:900,flexShrink:0}}>
                {form.roles.includes(r)&&"✓"}
              </div>
            </div>
          ))}
          <div style={{marginTop:8}}>
            <Btn full accent={C.impl} disabled={form.roles.length===0} onClick={()=>setStep(3)}>
              Continuar → ({form.roles.length} seleccionado{form.roles.length!==1?"s":""})
            </Btn>
          </div>
        </>}

        {step===3&&<>
          <h3 style={{fontFamily:f.d,fontWeight:900,fontSize:18,margin:"0 0 6px"}}>Datos bancarios</h3>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 16px"}}>Para recibir el pago de tus trabajos mediante boleta de honorarios.</p>
          <Inp label="Banco" selectOptions={BANKS_CL} value={form.bank} onChange={e=>setF("bank",e.target.value)}/>
          <Inp label="Tipo de cuenta" selectOptions={ACCOUNT_TYPES} value={form.accountType} onChange={e=>setF("accountType",e.target.value)}/>
          <Inp label="Número de cuenta" placeholder="ej: 1234567890" value={form.account} onChange={e=>setF("account",e.target.value)}/>
          <div style={{background:C.surfaceHi,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.muted,lineHeight:1.6}}>
            🔒 Tus datos bancarios están protegidos y solo se usan para procesar pagos por tus trabajos aprobados.
          </div>
          <Btn full accent={C.impl} disabled={!form.bank||!form.accountType||!form.account} onClick={()=>setStep(4)}>
            Enviar registro ✓
          </Btn>
        </>}
      </div>
    </div>
  );
};

// ─── WORKERS TAB (admin) ──────────────────────────────────────────────────────
const WorkersTab=({workers,setWorkers})=>{
  const [view,setView]         =useState("list"); // list | detail | finder
  const [selected,setSel]      =useState(null);
  const [filterRole,setRole]   =useState("all");
  const [filterStatus,setSt]   =useState("all");
  const [search,setSearch]     =useState("");
  const [finderQuery,setFQ]    =useState({comuna:"",region:"",role:"all",radius:"comuna"});

  const filtered=workers.filter(w=>{
    const roleOk=filterRole==="all"||w.roles.includes(filterRole);
    const stOk=filterStatus==="all"||w.status===filterStatus;
    const srchOk=!search||(w.name.toLowerCase().includes(search.toLowerCase())||w.rut.includes(search)||w.comuna.toLowerCase().includes(search.toLowerCase()));
    return roleOk&&stOk&&srchOk;
  });

  const approveWorker=(id)=>setWorkers(prev=>prev.map(w=>w.id===id?{...w,status:"activo"}:w));
  const rejectWorker =(id)=>setWorkers(prev=>prev.map(w=>w.id===id?{...w,status:"rechazado"}:w));

  // Finder logic — find workers near a point
  const finderResults=workers.filter(w=>{
    if(w.status!=="activo")return false;
    const roleOk=finderQuery.role==="all"||w.roles.includes(finderQuery.role);
    const locOk=finderQuery.radius==="comuna"?(w.comuna===finderQuery.comuna):
                finderQuery.radius==="region"?(w.region===finderQuery.region):true;
    return roleOk&&(finderQuery.comuna||finderQuery.region?locOk:true);
  });

  if(view==="finder") return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <Btn variant="ghost" small onClick={()=>setView("list")}>←</Btn>
        <div>
          <h2 style={{fontFamily:f.d,margin:0,fontSize:20,fontWeight:900}}>Buscar por zona</h2>
          <p style={{color:C.muted,fontSize:12,margin:0}}>Encuentra workers cerca de un punto de trabajo</p>
        </div>
      </div>

      <Card style={{background:`linear-gradient(135deg,#0a1a2a,${C.surface})`,border:`1px solid ${C.blue}33`}}>
        <SL>Punto de trabajo</SL>
        <Inp label="Comuna específica" selectOptions={COMUNAS_CL} value={finderQuery.comuna} onChange={e=>setFQ({...finderQuery,comuna:e.target.value})}/>
        <Inp label="O buscar por región completa" selectOptions={REGIONS_CL} value={finderQuery.region} onChange={e=>setFQ({...finderQuery,region:e.target.value})}/>
        <SL mt={8}>Tipo de trabajo</SL>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:4}}>
          {[["all","Todos",C.text],...Object.entries(ROLE_META).map(([r,rd])=>[r,rd.label,rd.color])].map(([v,lbl,col])=>(
            <button key={v} onClick={()=>setFQ({...finderQuery,role:v})} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${finderQuery.role===v?col:C.border}`,background:finderQuery.role===v?col+"22":"transparent",color:finderQuery.role===v?col:C.muted,fontFamily:f.b,fontWeight:700,fontSize:11,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <SL mt={4}>{finderResults.length} worker{finderResults.length!==1?"s":""} disponible{finderResults.length!==1?"s":""}</SL>
        {finderQuery.radius!=="region"&&finderQuery.comuna&&<button onClick={()=>setFQ({...finderQuery,radius:"region"})} style={{background:"none",border:"none",color:C.blue,fontSize:12,cursor:"pointer",fontFamily:f.b}}>Ampliar a región →</button>}
      </div>

      {finderResults.length===0&&(
        <div style={{textAlign:"center",padding:"30px 0"}}>
          <div style={{fontSize:40,marginBottom:10}}>📍</div>
          <div style={{color:C.muted,fontSize:14}}>Sin workers en esta zona.</div>
          <button onClick={()=>setFQ({...finderQuery,radius:"region"})} style={{background:"none",border:"none",color:C.blue,fontSize:13,cursor:"pointer",fontFamily:f.b,marginTop:8}}>Buscar en toda la región →</button>
        </div>
      )}

      {finderResults.map(w=>(
        <Card key={w.id} onClick={()=>{setSel(w);setView("detail");}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:C.surfaceHi,border:`2px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:f.d,fontWeight:900,fontSize:14,color:C.text,flexShrink:0}}>
              {w.photo}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:15}}>{w.name}</div>
              <div style={{fontSize:12,color:C.muted}}>📍 {w.comuna} · {w.region.split("—")[0].trim()}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                {w.roles.map(r=><Pill key={r} color={ROLE_META[r].color}>{ROLE_META[r].icon} {ROLE_META[r].label}</Pill>)}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:f.d,fontWeight:900,fontSize:15,color:C.green}}>⭐ {w.rating||"—"}</div>
              <div style={{fontSize:10,color:C.muted}}>{w.jobs} trabajos</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if(view==="detail"&&selected) return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <Btn variant="ghost" small onClick={()=>setView("list")}>←</Btn>
        <h2 style={{fontFamily:f.d,margin:0,fontSize:18,fontWeight:900}}>Perfil del worker</h2>
      </div>

      {/* Header */}
      <Card style={{textAlign:"center",padding:24}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:C.surfaceHi,border:`3px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:f.d,fontWeight:900,fontSize:22,color:C.text,margin:"0 auto 12px"}}>
          {selected.photo}
        </div>
        <div style={{fontFamily:f.d,fontWeight:900,fontSize:20,marginBottom:4}}>{selected.name}</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:8}}>RUT {selected.rut}</div>
        <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
          {selected.roles.map(r=><Pill key={r} color={ROLE_META[r].color}>{ROLE_META[r].icon} {ROLE_META[r].label}</Pill>)}
        </div>
        <Pill color={selected.status==="activo"?C.green:selected.status==="pendiente"?C.orange:C.red}>
          {selected.status==="activo"?"✓ Activo":selected.status==="pendiente"?"⏳ Pendiente":"✗ Rechazado"}
        </Pill>
      </Card>

      <Card>
        <SL>Contacto</SL>
        <div style={{fontSize:13,marginBottom:6}}>📱 {selected.phone}</div>
        <div style={{fontSize:13,marginBottom:6}}>📧 {selected.email}</div>
        <div style={{fontSize:13,marginBottom:6}}>📍 {selected.comuna}, {selected.region}</div>
      </Card>

      <Card>
        <SL>Datos bancarios</SL>
        <div style={{fontSize:13,marginBottom:4}}>{selected.bank}</div>
        <div style={{fontSize:13,marginBottom:4}}>{selected.accountType}</div>
        <div style={{fontSize:13,color:C.muted}}>N° {selected.account}</div>
      </Card>

      <Card>
        <SL>Historial</SL>
        <div style={{display:"flex",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:f.d,fontWeight:900,fontSize:24,color:C.green}}>{selected.jobs}</div>
            <div style={{fontSize:11,color:C.muted}}>Trabajos</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:f.d,fontWeight:900,fontSize:24,color:C.impl}}>{selected.rating||"—"}</div>
            <div style={{fontSize:11,color:C.muted}}>Rating ⭐</div>
          </div>
        </div>
      </Card>

      {selected.status==="pendiente"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
          <Btn variant="danger"  full onClick={()=>{rejectWorker(selected.id);setView("list");}}>✗ Rechazar</Btn>
          <Btn variant="success" full onClick={()=>{approveWorker(selected.id);setView("list");}}>✓ Aprobar</Btn>
        </div>
      )}
      {selected.status==="activo"&&(
        <Btn variant="danger" full small onClick={()=>{rejectWorker(selected.id);setView("list");}}>Desactivar cuenta</Btn>
      )}
    </div>
  );

  // LIST VIEW
  const pendingWorkers=workers.filter(w=>w.status==="pendiente");
  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{fontFamily:f.d,margin:"0 0 2px",fontSize:20,fontWeight:900}}>Workers</h2>
          <p style={{color:C.muted,fontSize:12,margin:0}}>{workers.filter(w=>w.status==="activo").length} activos · {workers.length} total</p>
        </div>
        <Btn accent={C.blue} small onClick={()=>setView("finder")}>📍 Buscar zona</Btn>
      </div>

      {/* Pendientes de aprobación */}
      {pendingWorkers.length>0&&(
        <div style={{background:C.orange+"18",border:`1px solid ${C.orange}44`,borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSt("pendiente")}>
          <div style={{fontSize:13,fontWeight:700,color:C.orange}}>⏳ {pendingWorkers.length} registro{pendingWorkers.length!==1?"s":""} pendiente{pendingWorkers.length!==1?"s":""} de aprobación</div>
          <span style={{color:C.orange,fontSize:12}}>Ver →</span>
        </div>
      )}

      {/* Búsqueda */}
      <div style={{marginBottom:12}}>
        <input placeholder="Buscar por nombre, RUT o comuna..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:7,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {[["all","Todos",C.text],["activo","Activos",C.green],["pendiente","Pendientes",C.orange],["rechazado","Rechazados",C.red]].map(([v,lbl,col])=>(
          <button key={v} onClick={()=>setSt(v)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filterStatus===v?col:C.border}`,background:filterStatus===v?col+"22":"transparent",color:filterStatus===v?col:C.muted,fontFamily:f.b,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
            {lbl}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {[["all","Todos roles",C.muted],...Object.entries(ROLE_META).map(([r,rd])=>[r,rd.label,rd.color])].map(([v,lbl,col])=>(
          <button key={v} onClick={()=>setRole(v)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filterRole===v?col:C.border}`,background:filterRole===v?col+"22":"transparent",color:filterRole===v?col:C.muted,fontFamily:f.b,fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
            {lbl}
          </button>
        ))}
      </div>

      {filtered.length===0&&<p style={{color:C.muted,textAlign:"center",padding:"20px 0"}}>Sin resultados.</p>}
      {filtered.map(w=>(
        <Card key={w.id} onClick={()=>{setSel(w);setView("detail");}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:C.surfaceHi,border:`2px solid ${w.status==="activo"?C.green:w.status==="pendiente"?C.orange:C.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:f.d,fontWeight:900,fontSize:14,color:C.text,flexShrink:0}}>
              {w.photo}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:14}}>{w.name}</div>
              <div style={{fontSize:11,color:C.muted}}>📍 {w.comuna} · {w.rut}</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
                {w.roles.map(r=><Pill key={r} color={ROLE_META[r].color}>{ROLE_META[r].icon}</Pill>)}
                {w.rating>0&&<Pill color={C.green}>⭐ {w.rating}</Pill>}
              </div>
            </div>
            <Pill color={w.status==="activo"?C.green:w.status==="pendiente"?C.orange:C.red}>
              {w.status==="activo"?"✓":w.status==="pendiente"?"⏳":"✗"}
            </Pill>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
const AdminApp=({user,onLogout})=>{
  const [tab,setTab]         =useState("dash");
  const [vertical,setVert]   =useState("impl");
  const [implCamps,setImpl]  =useState(INIT_IMPL);
  const [promoCamps,setPromo]=useState(INIT_PROMO);
  const [mecCamps,setMec]    =useState(INIT_MEC);
  const [reports,setReports] =useState(INIT_REPORTS);
  const [workers,setWorkers] =useState(INIT_WORKERS);
  const [view,setView]       =useState("list");
  const [selected,setSel]    =useState(null);
  const [newType,setNewType] =useState(null);

  const vt=VERTICALS[vertical];
  const campaigns=vertical==="impl"?implCamps:vertical==="promo"?promoCamps:mecCamps;
  const setCamps=vertical==="impl"?setImpl:vertical==="promo"?setPromo:setMec;
  const allCampaigns=[...implCamps,...promoCamps,...mecCamps];
  const pendingCount=reports.filter(r=>r.status==="pending").length;
  const pendingWorkerCount=workers.filter(w=>w.status==="pendiente").length;

  const saveCampaign=(c)=>{
    setCamps(prev=>{const idx=prev.findIndex(x=>x.id===c.id);return idx>=0?prev.map(x=>x.id===c.id?c:x):[...prev,c];});
    setView("list");setSel(null);setNewType(null);
  };
  const deleteCampaign=(id)=>{ setCamps(prev=>prev.filter(x=>x.id!==id)); setView("list");setSel(null); };

  // Campaign form screens
  if((tab==="campaigns"&&view==="new"&&newType)||(tab==="campaigns"&&view==="edit"&&selected))
    return <CampaignForm type={newType||selected.type} initial={view==="edit"?selected:null} onSave={saveCampaign} onCancel={()=>{setView("list");setNewType(null);}}/>;

  const NavBtn=({id,icon,label,badge})=>(
    <button onClick={()=>{setTab(id);setView("list");}} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"9px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,color:tab===id?vt.color:C.muted,transition:"color 0.2s",fontFamily:f.b,position:"relative"}}>
      <span style={{fontSize:19}}>{icon}</span>
      {badge>0&&<span style={{position:"absolute",top:6,right:"calc(50% - 14px)",background:C.red,color:"#fff",borderRadius:10,fontSize:9,fontWeight:900,padding:"1px 5px",minWidth:16,textAlign:"center"}}>{badge}</span>}
      <span style={{fontSize:9,fontWeight:700,letterSpacing:0.3}}>{label}</span>
    </button>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,display:"flex",flexDirection:"column"}}>
      <TopBar title="TGS Field — Admin" sub={`Hola, ${user.name}`} onLogout={onLogout}/>

      {/* Vertical switcher */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",gap:8}}>
        {Object.entries(VERTICALS).map(([v,vd])=>(
          <button key={v} onClick={()=>{setVert(v);setView("list");}} style={{flex:1,padding:"8px 6px",borderRadius:10,border:`1.5px solid ${vertical===v?vd.color+"88":C.border}`,background:vertical===v?vd.dim:"transparent",color:vertical===v?vd.color:C.muted,fontFamily:f.b,fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            {vd.icon} {vd.label.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 15px 80px"}}>

        {/* DASHBOARD */}
        {tab==="dash"&&<>
          <h2 style={{fontFamily:f.d,margin:"0 0 4px",fontSize:20,fontWeight:900}}>Dashboard — {vt.label}</h2>
          <p style={{color:C.muted,fontSize:12,margin:"0 0 16px"}}>{new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["Campañas",campaigns.filter(c=>c.status==="activa").length,"🎯",vt.color],
              ["Reportes hoy",reports.filter(r=>r.type===vertical).length,"📋",C.green],
              ["Pendientes",reports.filter(r=>r.type===vertical&&r.status==="pending").length,"⏳",C.orange],
              ["Aprobados",reports.filter(r=>r.type===vertical&&r.status==="approved").length,"✅",C.blue],
            ].map(([lbl,val,icon,color])=>(
              <Card key={lbl} style={{margin:0,padding:14}}>
                <div style={{fontSize:20}}>{icon}</div>
                <div style={{fontFamily:f.d,fontSize:26,fontWeight:900,color,lineHeight:1.1}}>{val}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{lbl}</div>
              </Card>
            ))}
          </div>
          <SL>Campañas activas</SL>
          {campaigns.filter(c=>c.status==="activa").map(c=>{
            const total=c.stores||c.points||c.totalUnits||1;const p=pct(c.done,total);
            return(
              <Card key={c.id} accent={vt.color} onClick={()=>{setSel(c);setTab("campaigns");setView("detail");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:2}}>{c.client}</div>
                    <div style={{fontFamily:f.d,fontWeight:800,fontSize:13}}>{c.name}</div>
                    {c.payMode&&<div style={{fontSize:10,color:vt.color,marginTop:3}}>💰 {c.payMode} · {fmt$(c.payAmount)}</div>}
                  </div>
                  <Pill color={p===100?C.green:vt.color}>{p}%</Pill>
                </div>
                <Progress value={p} color={p===100?C.green:vt.color}/>
              </Card>
            );
          })}
        </>}

        {/* CAMPAÑAS */}
        {tab==="campaigns"&&view==="list"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <h2 style={{fontFamily:f.d,margin:"0 0 2px",fontSize:20,fontWeight:900}}>Campañas</h2>
              <p style={{color:C.muted,fontSize:12,margin:0}}>{campaigns.length} en total · {vt.label}</p>
            </div>
            <Btn accent={vt.color} small onClick={()=>{setNewType(vertical);setView("new");}}>+ Nueva</Btn>
          </div>
          {["activa","pausada","completada"].map(status=>{
            const group=campaigns.filter(c=>c.status===status);
            if(!group.length)return null;
            const sc={activa:C.green,pausada:C.impl,completada:C.muted}[status];
            return(
              <div key={status} style={{marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:sc,textTransform:"uppercase",marginBottom:8}}>
                  {status==="activa"?"🟢 Activas":status==="pausada"?"⏸ Pausadas":"✓ Completadas"} ({group.length})
                </div>
                {group.map(c=>{
                  const total=c.stores||c.points||c.totalUnits||1;const p=pct(c.done,total);
                  return(
                    <Card key={c.id} accent={vt.color} onClick={()=>{setSel(c);setView("detail");}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                        <div>
                          <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:2}}>{c.client}</div>
                          <div style={{fontFamily:f.d,fontWeight:800,fontSize:13}}>{c.name}</div>
                          <div style={{fontSize:10,color:vt.color,marginTop:2}}>💰 {c.payMode} · {fmt$(c.payAmount)}</div>
                        </div>
                        <Pill color={p===100?C.green:vt.color}>{p}%</Pill>
                      </div>
                      <Progress value={p} color={p===100?C.green:vt.color}/>
                      <div style={{fontSize:10,color:C.muted,marginTop:5}}>👥 {(c.team||[]).join(", ")||"Sin equipo"} · {c.dateStart}→{c.dateEnd}</div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
          {campaigns.length===0&&(
            <div style={{textAlign:"center",padding:"50px 0"}}>
              <div style={{fontSize:44,marginBottom:10}}>{vt.icon}</div>
              <div style={{fontFamily:f.d,fontWeight:800,fontSize:16,marginBottom:6}}>Sin campañas aún</div>
              <Btn accent={vt.color} onClick={()=>{setNewType(vertical);setView("new");}}>+ Crear campaña</Btn>
            </div>
          )}
        </>}

        {tab==="campaigns"&&view==="detail"&&selected&&(()=>{
          const c=selected;const cvt=VERTICALS[c.type];
          const total=c.stores||c.points||c.totalUnits||1;const p=pct(c.done,total);
          const campReports=reports.filter(r=>r.campaignId===c.id);
          return(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                <Btn variant="ghost" small onClick={()=>setView("list")}>←</Btn>
                <div style={{flex:1}}>
                  <div style={{fontFamily:f.d,fontWeight:900,fontSize:16}}>{c.client}</div>
                  <div style={{fontSize:11,color:C.muted}}>{c.name}</div>
                </div>
              </div>
              <Card accent={cvt.color}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <Pill color={cvt.color}>{cvt.icon} {cvt.label}</Pill>
                  <Pill color={{activa:C.green,pausada:C.impl,completada:C.muted}[c.status]}>{c.status}</Pill>
                </div>
                <Progress value={p} color={p===100?C.green:cvt.color}/>
                <div style={{fontSize:11,color:C.muted,marginTop:5}}>{c.done}/{total} · 📅 {c.dateStart}→{c.dateEnd}</div>
                <div style={{marginTop:8}}><Pill color={C.green}>💰 {c.payMode} · {fmt$(c.payAmount)}</Pill></div>
              </Card>
              <Card><SL>Equipo</SL>{(c.team||[]).map(n=><div key={n} style={{fontSize:13,marginBottom:4}}>👤 {n}</div>)}</Card>
              <Card>
                <SL>Reportes ({campReports.length})</SL>
                {campReports.slice(0,4).map(r=>(
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700}}>{r.store||r.point||r.location}</div>
                      <div style={{fontSize:11,color:C.muted}}>{r.user}</div>
                    </div>
                    <Pill color={REPORT_STATUS[r.status].color}>{REPORT_STATUS[r.status].icon} {REPORT_STATUS[r.status].label}</Pill>
                  </div>
                ))}
              </Card>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="subtle" full onClick={()=>setView("edit")}>✏️ Editar</Btn>
                <Btn variant="danger" small onClick={()=>deleteCampaign(c.id)}>🗑</Btn>
              </div>
            </div>
          );
        })()}

        {/* APROBACIONES */}
        {tab==="approvals"&&<ApprovalTab reports={reports} setReports={setReports} allCampaigns={allCampaigns} vertical={vertical}/>}

        {/* PAGOS */}
        {tab==="payments"&&<PaymentsTab allCampaigns={allCampaigns} reports={reports} workers={workers}/>}

        {/* WORKERS */}
        {tab==="workers"&&<WorkersTab workers={workers} setWorkers={setWorkers}/>}

      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",padding:"3px 0 7px"}}>
        <NavBtn id="dash"      icon="📊" label="Inicio"/>
        <NavBtn id="campaigns" icon="🎯" label="Campañas"/>
        <NavBtn id="approvals" icon="✅" label="Aprobar" badge={pendingCount}/>
        <NavBtn id="payments"  icon="💰" label="Pagos"/>
        <NavBtn id="workers"   icon="👤" label="Workers" badge={pendingWorkerCount}/>
      </div>
    </div>
  );
};

// ─── FIELD USER ───────────────────────────────────────────────────────────────
const LandingScreen=({user,onSelect,onLogout})=>{
  const [boletas,setBoletas]=useState({});
  const myApproved=INIT_REPORTS.filter(r=>r.user===user.name&&r.status==="approved");
  const campIds=[...new Set(myApproved.map(r=>r.campaignId))];
  const allCamps=[...INIT_IMPL,...INIT_PROMO,...INIT_MEC];

  return(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",flexDirection:"column"}}>
    <TopBar title="TGS Field" sub={`Hola, ${user.name}`} onLogout={onLogout}/>
    <div style={{flex:1,padding:"20px 18px 40px"}}>
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:28,marginBottom:4}}>🎯</div>
        <h2 style={{margin:0,fontFamily:f.d,fontSize:20,fontWeight:900}}>¿Qué vas a reportar?</h2>
      </div>
      {Object.entries(VERTICALS).map(([v,vd])=>(
        <div key={v} onClick={()=>onSelect(v)} style={{background:`linear-gradient(135deg,${vd.dim},${C.surface})`,border:`1.5px solid ${vd.color}44`,borderRadius:18,padding:"18px 20px",cursor:"pointer",position:"relative",overflow:"hidden",marginBottom:12}}>
          <div style={{position:"absolute",top:-16,right:-16,fontSize:70,opacity:0.07}}>{vd.icon}</div>
          <Pill color={vd.color}>{vd.label.toUpperCase()}</Pill>
          <h3 style={{fontFamily:f.d,fontSize:16,fontWeight:900,margin:"8px 0 4px",color:vd.color}}>{vd.label}</h3>
          <p style={{margin:"0 0 10px",color:C.muted,fontSize:12,lineHeight:1.5}}>{vd.desc}</p>
          <span style={{color:vd.color,fontWeight:700,fontSize:12}}>Ir a campañas →</span>
        </div>
      ))}

      {/* Boletas pendientes */}
      {campIds.length>0&&(
        <div style={{marginTop:8}}>
          <SL mt={16}>🧾 Mis boletas de honorarios</SL>
          <p style={{color:C.muted,fontSize:12,margin:"0 0 12px"}}>Sube tu boleta para cada campaña con trabajo aprobado para que podamos procesar tu pago.</p>
          {campIds.map(cid=>{
            const camp=allCamps.find(c=>c.id===cid);
            if(!camp)return null;
            const vt=VERTICALS[camp.type];
            const key=`${cid}__${user.name}`;
            const uploaded=boletas[key];
            return(
              <Card key={cid} accent={uploaded?C.green:C.orange}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:2}}>{camp.client}</div>
                    <div style={{fontFamily:f.d,fontWeight:800,fontSize:14}}>{camp.name}</div>
                    <Pill color={vt.color} style={{marginTop:4}}>{vt.icon} {vt.label.split(" ")[0]}</Pill>
                  </div>
                  <Pill color={uploaded?C.green:C.orange}>{uploaded?"✓ Subida":"⏳ Pendiente"}</Pill>
                </div>
                {uploaded
                  ?<div style={{background:C.green+"18",border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.green}}>
                    🧾 {uploaded} · Tu pago será procesado en breve.
                  </div>
                  :<div>
                    <div style={{background:C.orange+"18",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.orange,marginBottom:8}}>
                      Emite tu boleta de honorarios por el monto correspondiente a esta campaña y súbela aquí.
                    </div>
                    <Btn full accent={C.impl} small onClick={()=>setBoletas(prev=>({...prev,[key]:`boleta_${camp.client.toLowerCase().replace(/\s/g,"_")}.pdf`}))}>
                      📎 Subir boleta (PDF)
                    </Btn>
                  </div>
                }
              </Card>
            );
          })}
        </div>
      )}
    </div>
  </div>
);};

const CampaignSelect=({type,campaigns,onSelect,onBack})=>{
  const vt=VERTICALS[type];
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text}}>
      <TopBar title={vt.label} sub="Selecciona tu campaña" onBack={onBack}/>
      <div style={{padding:"18px 15px 40px"}}>
        {campaigns.filter(c=>c.status==="activa").map(c=>{
          const total=c.stores||c.points||c.totalUnits||1;const p=pct(c.done,total);
          return(
            <Card key={c.id} accent={vt.color} onClick={()=>onSelect(c)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:C.muted,marginBottom:3}}>{c.client}</div>
                  <div style={{fontFamily:f.d,fontWeight:800,fontSize:14}}>{c.name}</div>
                  <div style={{fontSize:10,color:vt.color,marginTop:2}}>💰 {c.payMode}</div>
                </div>
                <Pill color={vt.color}>{p}%</Pill>
              </div>
              <Progress value={p} color={vt.color}/>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const MecForm=({campaign,onSubmit,onBack})=>{
  const [form,setForm]=useState({location:"",units:"",material:campaign.material||"",issues:false,issueNote:""});
  const [photos,setPhotos]=useState({before:false,after:false});
  const ts=nowStr();
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"18px 15px"}}>
        <Card style={{background:`linear-gradient(135deg,${C.mecDim},${C.surface})`,border:`1px solid ${C.mec}33`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>Sesión de mecanización</div><div style={{fontFamily:f.d,fontWeight:800}}>{ts}</div></div>
            <Pill color={C.mec}>⚙️ Mecanización</Pill>
          </div>
        </Card>
        <Inp label="Ubicación / Bodega" placeholder="ej: Bodega Santiago Centro" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
        <Inp label="Material mecanizado" placeholder={campaign.material||"Tipo de material"} value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
        <Card>
          <SL>Unidades mecanizadas</SL>
          <input type="number" placeholder="0" value={form.units} onChange={e=>setForm({...form,units:e.target.value})}
            style={{width:"55%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.text,fontFamily:f.d,fontSize:26,fontWeight:900,textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
          {campaign.payAmount&&form.units&&<div style={{fontSize:12,color:C.mec,marginTop:8,fontWeight:700}}>💰 Monto estimado: {fmt$(parseInt(form.units)*(campaign.payAmount||0))}</div>}
        </Card>
        <Card>
          <SL>Fotografías</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <PhotoSlot label="Antes" captured={photos.before} onCapture={()=>setPhotos({...photos,before:!photos.before})}/>
            <PhotoSlot label="Después" captured={photos.after}  onCapture={()=>setPhotos({...photos,after:!photos.after})}/>
          </div>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:form.issues?12:0}}>
            <div><div style={{fontWeight:700,marginBottom:2}}>¿Hubo problemas?</div><div style={{fontSize:12,color:C.muted}}>Material dañado, faltante, etc.</div></div>
            <Toggle value={form.issues} onChange={v=>setForm({...form,issues:v})} color={C.red}/>
          </div>
          {form.issues&&<textarea value={form.issueNote} onChange={e=>setForm({...form,issueNote:e.target.value})} placeholder="Describe el problema..."
            style={{width:"100%",minHeight:70,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>}
        </Card>
        <Btn full accent={C.mec} disabled={!form.location||!form.units} onClick={onSubmit}>Enviar Reporte ✓</Btn>
      </div>
    </div>
  );
};

const ImplForm=({campaign,onSubmit,onBack})=>{
  const [form,setForm]=useState({store:"",qty:"",issues:false,issueNote:"",signed:false});
  const [photos,setPhotos]=useState({installed:false,general:false});
  const [geo,setGeo]=useState(null);const[gl,setGl]=useState(false);
  const ts=nowStr();
  const getGeo=()=>{setGl(true);setTimeout(()=>{setGeo(true);setGl(false);},1200);};
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"18px 15px"}}>
        <Card style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Fecha y hora</div><div style={{fontFamily:f.d,fontWeight:800}}>{ts}</div></div>
          {geo?<Pill color={C.green}>📍 OK</Pill>:<Btn variant="ghost" small onClick={getGeo}>{gl?"...":"📍 Capturar"}</Btn>}
        </Card>
        {campaign.payAmount&&<div style={{background:C.implDim,border:`1px solid ${C.impl}33`,borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:C.impl}}>💰 Este reporte, si es aprobado, genera {fmt$(campaign.payAmount)} ({campaign.payMode})</div>}
        <Inp label="Punto de venta" placeholder="ej: Unimarc Las Condes" value={form.store} onChange={e=>setForm({...form,store:e.target.value})}/>
        <Card>
          <SL>Fotografías</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <PhotoSlot label="Material instalado" captured={photos.installed} onCapture={()=>setPhotos({...photos,installed:!photos.installed})}/>
            <PhotoSlot label="Vista PdV"           captured={photos.general}   onCapture={()=>setPhotos({...photos,general:!photos.general})}/>
          </div>
        </Card>
        <Card>
          <SL>Materiales instalados</SL>
          <input type="number" placeholder="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}
            style={{width:"50%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px",color:C.text,fontFamily:f.d,fontSize:24,fontWeight:900,textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:form.issues?12:0}}>
            <div><div style={{fontWeight:700,marginBottom:2}}>¿Hubo incidencias?</div><div style={{fontSize:12,color:C.muted}}>Problemas a reportar</div></div>
            <Toggle value={form.issues} onChange={v=>setForm({...form,issues:v})} color={C.red}/>
          </div>
          {form.issues&&<textarea value={form.issueNote} onChange={e=>setForm({...form,issueNote:e.target.value})} placeholder="Describe la incidencia..."
            style={{width:"100%",minHeight:75,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>}
        </Card>
        <Card style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:700,marginBottom:2}}>Firma del local</div><div style={{fontSize:12,color:C.muted}}>Encargado confirma</div></div>
          <Toggle value={form.signed} onChange={v=>setForm({...form,signed:v})} color={C.green}/>
        </Card>
        <Btn full accent={C.impl} disabled={!form.store||!form.qty} onClick={onSubmit}>Enviar Reporte ✓</Btn>
      </div>
    </div>
  );
};

const PromoForm=({campaign,onSubmit,onBack})=>{
  const [form,setForm]=useState({point:"",contacts:"",samples:"",obs:"",popOk:true,popNote:"",checkedIn:false});
  const [photos,setPhotos]=useState({activation:false,general:false,pop:false});
  const [geo,setGeo]=useState(null);const[gl,setGl]=useState(false);
  const [entryTime]=useState(nowStr());const[exitTime,setExitTime]=useState(null);
  const getGeo=()=>{setGl(true);setTimeout(()=>{setGeo(true);setGl(false);},1200);};
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"18px 15px"}}>
        {campaign.payAmount&&<div style={{background:C.promoDim,border:`1px solid ${C.promo}33`,borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:C.promo}}>💰 Reporte aprobado = {fmt$(campaign.payAmount)} ({campaign.payMode})</div>}
        <Card>
          <SL>Control de asistencia</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["🟢","Entrada",form.checkedIn,entryTime,()=>{if(!form.checkedIn){setForm({...form,checkedIn:true});getGeo();}}],
              ["🔴","Salida",!!exitTime,exitTime||"Tap",()=>{if(form.checkedIn&&!exitTime)setExitTime(nowStr());}]
            ].map(([icon,label,active,time,fn])=>(
              <div key={label} onClick={fn} style={{background:active?(label==="Entrada"?C.green:C.red)+"18":C.surfaceHi,border:`1px solid ${active?(label==="Entrada"?C.green:C.red):C.border}`,borderRadius:11,padding:12,textAlign:"center",cursor:"pointer",opacity:label==="Salida"&&!form.checkedIn?0.4:1}}>
                <div style={{fontSize:18,marginBottom:3}}>{icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:active?(label==="Entrada"?C.green:C.red):C.muted}}>{label}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:1}}>{time}</div>
              </div>
            ))}
          </div>
          {geo?<Pill color={C.green}>📍 OK</Pill>:<Btn variant="ghost" small onClick={getGeo}>{gl?"...":"📍 Ubicación"}</Btn>}
        </Card>
        <Inp label="Punto de activación" placeholder="ej: Bar X, Stand Feria" value={form.point} onChange={e=>setForm({...form,point:e.target.value})}/>
        <Card>
          <SL>Fotografías</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
            <PhotoSlot label="Activación"   captured={photos.activation} onCapture={()=>setPhotos({...photos,activation:!photos.activation})}/>
            <PhotoSlot label="General"      captured={photos.general}    onCapture={()=>setPhotos({...photos,general:!photos.general})}/>
            <PhotoSlot label="POP"          captured={photos.pop}        onCapture={()=>setPhotos({...photos,pop:!photos.pop})}/>
          </div>
        </Card>
        <Card>
          <SL>Métricas</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Contactos","contacts"],["Muestras","samples"]].map(([lbl,k])=>(
              <div key={k}>
                <div style={{fontSize:10,color:C.muted,marginBottom:5,fontWeight:700}}>{lbl.toUpperCase()}</div>
                <input type="number" placeholder="0" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                  style={{width:"100%",background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",color:C.text,fontFamily:f.d,fontSize:20,fontWeight:900,textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:!form.popOk?12:0}}>
            <div><div style={{fontWeight:700,marginBottom:2}}>Material POP completo</div><div style={{fontSize:11,color:C.muted}}>¿Llegó todo?</div></div>
            <Toggle value={form.popOk} onChange={v=>setForm({...form,popOk:v})} color={C.promo}/>
          </div>
          {!form.popOk&&<textarea value={form.popNote} onChange={e=>setForm({...form,popNote:e.target.value})} placeholder="¿Qué faltó?"
            style={{width:"100%",minHeight:65,background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>}
        </Card>
        <Inp label="Observaciones" textarea placeholder="Flujo de personas, oportunidades..." value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})}/>
        <Btn full accent={C.promo} disabled={!form.point||!form.checkedIn} onClick={onSubmit}>Enviar Reporte ✓</Btn>
      </div>
    </div>
  );
};

const SuccessScreen=({type,onNew,onHome})=>{
  const vt=VERTICALS[type];
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:22}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:14}}>✅</div>
        <h2 style={{fontFamily:f.d,fontSize:22,fontWeight:900,margin:"0 0 6px"}}>¡Reporte enviado!</h2>
        <p style={{color:C.muted,marginBottom:8,lineHeight:1.5}}>Tu reporte quedó registrado y está<br/><strong style={{color:C.orange}}>pendiente de aprobación</strong> del supervisor.</p>
        <div style={{background:C.surfaceHi,borderRadius:12,padding:"10px 16px",marginBottom:24,fontSize:12,color:C.muted}}>
          Cuando sea aprobado, el monto correspondiente se incluirá automáticamente en tu liquidación.
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          <Btn variant="ghost" onClick={onHome}>← Inicio</Btn>
          <Btn accent={vt.color} onClick={onNew}>Nuevo reporte</Btn>
        </div>
      </div>
    </div>
  );
};

const LoginScreen=({onLogin,onRegister})=>{
  const [u,setU]=useState("");const[p,setP]=useState("");const[err,setErr]=useState(false);
  const handle=()=>{
    if(u.trim()&&p.length>=3){
      const role=u.toLowerCase().includes("admin")?"admin":u.toLowerCase().includes("super")?"supervisor":u.toLowerCase().includes("promo")?"promotor":u.toLowerCase().includes("mec")?"mecanizador":"implementador";
      onLogin({name:u,role});
    }else setErr(true);
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:22,background:`radial-gradient(ellipse at 50% 0%,${C.surfaceHi} 0%,${C.bg} 65%)`,fontFamily:f.b}}>
      <div style={{width:"100%",maxWidth:350}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:11,marginBottom:8}}>
            <div style={{width:46,height:46,background:`linear-gradient(135deg,${C.impl},${C.promo})`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📍</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontFamily:f.d,fontSize:22,fontWeight:900,color:C.text,letterSpacing:-0.5}}>TGS Field</div>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:C.muted}}>PLATAFORMA DE CAMPO</div>
            </div>
          </div>
        </div>
        <Card style={{padding:24}}>
          <Inp label="Usuario" placeholder="ej: admin, promo1, mec1" value={u} onChange={e=>{setU(e.target.value);setErr(false);}}/>
          <Inp label="Contraseña" type="password" placeholder="••••••••" value={p} onChange={e=>{setP(e.target.value);setErr(false);}}/>
          {err&&<div style={{marginBottom:10}}><Pill color={C.red} full>Credenciales inválidas</Pill></div>}
          <Btn full accent={C.impl} onClick={handle}>Ingresar →</Btn>
        </Card>
        {/* Registro */}
        <div onClick={onRegister} style={{marginTop:12,background:C.surface,border:`1px solid ${C.promo}33`,borderRadius:12,padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:C.promo}}>¿Quieres trabajar con TGS?</div>
            <div style={{fontSize:12,color:C.muted,marginTop:2}}>Regístrate como implementador, promotor o mecanizador</div>
          </div>
          <span style={{color:C.promo,fontSize:18}}>→</span>
        </div>
        <div style={{marginTop:12,background:C.surface,borderRadius:12,padding:12}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:7}}>Usuarios demo</div>
          {[["admin","Panel admin + pagos"],["super_rosa","Supervisor"],["promo1","Promotor"],["mec1","Mecanizador"],["carlos","Implementador"]].map(([usr,desc])=>(
            <div key={usr} style={{display:"flex",gap:7,alignItems:"center",marginBottom:3}}>
              <code style={{background:C.surfaceHi,padding:"2px 7px",borderRadius:5,fontSize:11,color:C.impl}}>{usr}</code>
              <span style={{fontSize:11,color:C.muted}}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── ROOT (SUPABASE CONNECTED) ───────────────────────────────────────────────
export default function App(){
  const [user,setUser]       =useState(null);
  const [vertical,setVert]   =useState(null);
  const [campaign,setCamp]   =useState(null);
  const [screen,setScreen]   =useState("home");
  const [implCamps,setImpl]  =useState([]);
  const [promoCamps,setPromo]=useState([]);
  const [mecCamps,setMec]    =useState([]);
  const [loading,setLoading] =useState(true);

  // Load campaigns from Supabase on mount
  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const [i,p,m] = await Promise.all([
        getCampaigns('impl'), getCampaigns('promo'), getCampaigns('mec')
      ]);
      if(i.data) setImpl(i.data);
      if(p.data) setPromo(p.data);
      if(m.data) setMec(m.data);
    } catch(e){ console.error(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadCampaigns(); },[loadCampaigns]);

  const reset=()=>{setVert(null);setCamp(null);setScreen("home");};
  const camps=vertical==="impl"?implCamps:vertical==="promo"?promoCamps:mecCamps;

  if(loading) return(
    <div style={{minHeight:"100vh",background:"#07111C",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:48,height:48,background:"linear-gradient(135deg,#F5A623,#00C9A7)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>📍</div>
      <div style={{color:"#6B8BAA",fontFamily:"DM Sans,sans-serif",fontSize:14}}>Cargando TGS Field...</div>
    </div>
  );

  if(screen==="register") return <WorkerRegisterScreen onBack={()=>setScreen("home")}/>;
  if(!user)return <LoginScreen onLogin={setUser} onRegister={()=>setScreen("register")}/>;
  if(user.role==="admin"||user.role==="supervisor")return <AdminApp user={user} onLogout={()=>setUser(null)} onRefresh={loadCampaigns}/>;
  if(screen==="success")return <SuccessScreen type={vertical} onNew={()=>{setCamp(null);setScreen("select");}} onHome={reset}/>;
  if(screen==="form"){
    if(vertical==="impl") return <ImplForm  campaign={campaign} user={user} onBack={()=>setScreen("select")} onSubmit={()=>setScreen("success")}/>;
    if(vertical==="promo")return <PromoForm campaign={campaign} user={user} onBack={()=>setScreen("select")} onSubmit={()=>setScreen("success")}/>;
    if(vertical==="mec")  return <MecForm   campaign={campaign} user={user} onBack={()=>setScreen("select")} onSubmit={()=>setScreen("success")}/>;
  }
  if(screen==="select")return <CampaignSelect type={vertical} campaigns={camps} onSelect={c=>{setCamp(c);setScreen("form");}} onBack={reset}/>;
  return <LandingScreen user={user} onSelect={v=>{setVert(v);setScreen("select");}} onLogout={()=>setUser(null)}/>;
}
