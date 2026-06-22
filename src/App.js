import { useState, useEffect, useCallback, useRef } from "react";
import { getWorkers, getCampaigns, getReports, getBoletas, insertReport, insertWorker, updateWorker, insertCampaign, updateCampaign, deleteCampaign, fromDbCampaign, fromDbReport, updateReportStatus, updateReportApproval, updateReportItems, insertBoleta, uploadBoleta, updateBoletaStatus, uploadPhoto, uploadAvatar, signUp, signIn, signOut, getSession, getWorkerByEmail, getClients, insertClient, updateClient, deleteClient, uploadClientLogo } from "./supabase";
import * as XLSX from "xlsx";
import ClientReport from "./ClientReport";


// ─── Paleta migrada a Variant B (light content + dark navbar). Brand TGS ──
const C = {
  bg:"#F8F9FA", surface:"#FFFFFF", surfaceHi:"#F1F3F5", border:"#E5E7EB",
  text:"#0A0A0A", muted:"#6B7280",
  impl:"#F2AF22",  implDim:"#FEF6E1",   // Amarillo TGS (#F2AF22)
  promo:"#0EA5A1", promoDim:"#E6FAF9",
  mec:"#7C3AED",   mecDim:"#F3EAFE",
  green:"#16A34A", red:"#DC2626", blue:"#2563EB", orange:"#F59E0B",
  navBg:"#0A0A0A", navText:"#FFFFFF", navMuted:"#898C8E",
  onPrimary:"#000000",
};
const f = { d:"'Inter','DM Sans',sans-serif", b:"'Inter','DM Sans','Segoe UI',sans-serif" };

// ─── DESIGN SYSTEM v2 — TGS brand (Variant B: light content + dark navbar) ───
const T = {
  bg:"#FFFFFF", surfaceAlt:"#F8F9FA", surfaceHi:"#F1F3F5",
  navBg:"#0A0A0A", navText:"#FFFFFF", navMuted:"#898C8E",
  border:"#E5E7EB", borderStrong:"#D1D5DB",
  text:"#0A0A0A", textMuted:"#6B7280", textDim:"#9CA3AF",
  primary:"#F2AF22", primaryHover:"#E59E0F", onPrimary:"#000000",
  success:"#16A34A", danger:"#DC2626", warning:"#F2AF22", info:"#2563EB",
  font:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
  rCard:14, rBtn:10, rPill:999,
  shadowSm:"0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:"0 4px 12px rgba(0,0,0,0.08)",
  shadowLg:"0 10px 30px rgba(0,0,0,0.12)",
};
const nowStr = ()=>new Date().toLocaleString("es-CL",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const pct    = (a,b)=>b===0?0:Math.round((a/b)*100);
const uid    = ()=>Math.random().toString(36).slice(2,8);
const fmt$   = (n)=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n||0);
const waLink = (phone)=>`https://wa.me/${(phone||"").replace(/[^0-9]/g,"")}`;
// Normalize worker from DB snake_case to app camelCase
const normalizeWorker=(w)=>{
  if(!w)return null;
  return {...w,
    accountType:w.account_type||w.accountType||"",
    account:w.account_number||w.account||"",
    photo:w.photo_url||w.photo||w.name?.split(" ").map(n=>n[0]).join("").slice(0,2)||"",
    jobs:w.jobs_count||w.jobs||0,
    addressDetail:w.address_detail||w.addressDetail||"",
  };
};

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
  admin:        {icon:"⚡",color:C.green, label:"Admin"},
};
const COMUNAS_POR_REGION = {
  "RM — Metropolitana":["Santiago","Providencia","Las Condes","Ñuñoa","Maipú","La Florida","San Bernardo","Pudahuel","Quilicura","Recoleta","Independencia","San Miguel","Macul","Peñalolén","Vitacura","Lo Barnechea","Huechuraba","Cerrillos","Cerro Navia","Conchalí","El Bosque","Estación Central","La Cisterna","La Granja","La Pintana","La Reina","Lo Espejo","Lo Prado","Pedro Aguirre Cerda","Quinta Normal","Renca","San Joaquín","San Ramón","Puente Alto","Colina","Lampa","Buin","Paine","Peñaflor","Talagante","Melipilla"],
  "Valparaíso":["Valparaíso","Viña del Mar","Concón","Quilpué","Villa Alemana","San Antonio","Quillota","La Calera","Limache","Olmué","Los Andes","San Felipe","Casablanca","El Quisco","El Tabo","Cartagena","Algarrobo","Isla de Pascua"],
  "Biobío":["Concepción","Talcahuano","San Pedro de la Paz","Hualpén","Chiguayante","Coronel","Lota","Tomé","Penco","Los Ángeles","Chillán","Chillán Viejo","Bulnes","San Carlos","Mulchén","Nacimiento"],
  "Araucanía":["Temuco","Padre Las Casas","Villarrica","Pucón","Angol","Victoria","Lautaro","Nueva Imperial","Carahue","Pitrufquén","Freire","Cunco"],
  "Los Lagos":["Puerto Montt","Puerto Varas","Osorno","Castro","Ancud","Quellón","Calbuco","Frutillar","Llanquihue","Purranque","Río Negro","Dalcahue"],
  "Maule":["Talca","Curicó","Linares","Constitución","Cauquenes","Molina","San Clemente","Maule","Pelarco","San Javier","Longaví","Parral"],
  "O'Higgins":["Rancagua","San Fernando","Machalí","Rengo","Graneros","Requínoa","San Vicente","Pichilemu","Santa Cruz","Chimbarongo","Peumo","Doñihue"],
  "Coquimbo":["La Serena","Coquimbo","Ovalle","Illapel","Vicuña","Andacollo","Tongoy","Monte Patria","Combarbalá","Salamanca"],
  "Antofagasta":["Antofagasta","Calama","Tocopilla","Mejillones","Taltal","San Pedro de Atacama","María Elena","Sierra Gorda"],
  "Tarapacá":["Iquique","Alto Hospicio","Pozo Almonte","Huara","Pica","Camiña","Colchane"],
  "Arica y Parinacota":["Arica","Putre","Camarones","General Lagos"],
  "Atacama":["Copiapó","Vallenar","Chañaral","Caldera","Tierra Amarilla","Huasco","Diego de Almagro","Freirina"],
  "Los Ríos":["Valdivia","La Unión","Río Bueno","Panguipulli","Los Lagos","Mariquina","Lanco","Paillaco","Futrono","Corral","Máfil"],
  "Aysén":["Coyhaique","Puerto Aysén","Chile Chico","Cochrane","Puerto Cisnes","La Junta","Puerto Ibáñez"],
  "Magallanes":["Punta Arenas","Puerto Natales","Porvenir","Puerto Williams","Cabo de Hornos"],
};
const REGIONS_CL = Object.keys(COMUNAS_POR_REGION);
const COMUNAS_CL = Object.values(COMUNAS_POR_REGION).flat();
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
const pickTextOn=(hex)=>{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return (r*299+g*587+b*114)/1000>140?"#0A0A0A":"#FFFFFF";};

const Icon=({name,size=20,stroke=2,color="currentColor"})=>{
  const paths={
    home:      <><path d="M3 9.5L12 3l9 6.5"/><path d="M5 9v11h5v-7h4v7h5V9"/></>,
    target:    <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    check:     <><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></>,
    chart:     <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20v-3"/></>,
    dollar:    <><path d="M12 3v18"/><path d="M16 7H10a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8"/></>,
    users:     <><circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="3"/><path d="M16 14a5 5 0 0 1 5 5"/></>,
    phone:     <><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2z"/></>,
    mail:      <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>,
    pin:       <><path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></>,
    star:      <><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.7 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z"/></>,
    search:    <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>,
    message:   <><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z"/></>,
    map:       <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v16"/><path d="M15 6v16"/></>,
    plus:      <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    edit:      <><path d="M12 20h9"/><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4z"/></>,
    trash:     <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></>,
    x:         <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
    arrowRight:<><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{display:"block"}}>
      {paths[name]}
    </svg>
  );
};
const Pill=({color,children,full})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,letterSpacing:0.4,background:color+"22",color,border:`1px solid ${color}44`,...(full?{width:"100%",justifyContent:"center"}:{})}}>{children}</span>
);
const Btn=({children,onClick,variant="primary",accent=C.impl,full,small,disabled})=>{
  const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,padding:small?"8px 14px":"13px 22px",borderRadius:12,border:"none",fontFamily:f.b,fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,transition:"all 0.15s",width:full?"100%":undefined};
  const v={primary:{background:accent,color:pickTextOn(accent)},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},subtle:{background:C.surfaceHi,color:C.text},danger:{background:C.red+"18",color:C.red,border:`1px solid ${C.red}33`},success:{background:C.green+"18",color:C.green,border:`1px solid ${C.green}33`}};
  return <button style={{...base,...v[variant]}} onClick={onClick} disabled={disabled}>{children}</button>;
};
const Inp=({label,textarea,selectOptions,...props})=>{
  const [showPw,setShowPw]=useState(false);
  const isPw=props.type==="password";
  const inputStyle={width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontFamily:f.b,fontSize:14,outline:"none",boxSizing:"border-box"};
  return(
  <div style={{marginBottom:14}}>
    {label&&<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:5}}>{label}</div>}
    {selectOptions
      ?<select style={inputStyle} {...props}>
        <option value="">— Seleccionar —</option>
        {selectOptions.map(o=><option key={o} value={o}>{o}</option>)}
       </select>
      :textarea
        ?<textarea style={{...inputStyle,minHeight:75,resize:"vertical"}} {...props}/>
        :isPw
          ?<div style={{position:"relative"}}>
            <input {...props} type={showPw?"text":"password"} style={{...inputStyle,paddingRight:44}}/>
            <button type="button" onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:"4px 6px"}}>
              {showPw?"🙈":"👁"}
            </button>
          </div>
          :<input style={inputStyle} {...props}/>
    }
  </div>
  );
};
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
const RoleSwitcher=({user,onChangeRole})=>{
  const eligible=(user?.roles||[]).filter(r=>ROLE_META[r]);
  if(eligible.length<2||!onChangeRole) return null;
  return (
    <select value={user.role} onChange={e=>onChangeRole(e.target.value)}
      style={{background:"rgba(255,255,255,0.1)",color:C.navText,border:`1px solid ${C.navMuted}55`,borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:600,cursor:"pointer",outline:"none",fontFamily:f.b,maxWidth:140}}>
      {eligible.map(r=><option key={r} value={r} style={{color:"#000"}}>{ROLE_META[r].label}</option>)}
    </select>
  );
};

// Banner explícito debajo del TopBar para que el cambio de rol sea visible en mobile
const RoleSwitchBanner=({user,onChangeRole})=>{
  const eligible=(user?.roles||[]).filter(r=>ROLE_META[r]);
  if(eligible.length<2||!onChangeRole) return null;
  const activeColor=ROLE_META[user.role]?.color||C.impl;
  return (
    <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:58,zIndex:19}}>
      <span style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",whiteSpace:"nowrap"}}>Ver como</span>
      <div style={{flex:1,display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
        {eligible.map(r=>{
          const meta=ROLE_META[r];
          const active=user.role===r;
          return (
            <button key={r} onClick={()=>onChangeRole(r)}
              style={{flexShrink:0,display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:999,border:`1px solid ${active?meta.color:C.border}`,background:active?meta.color+"15":"transparent",color:active?meta.color:C.text,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:meta.color}}/>
              {meta.label}
            </button>
          );
        })}
      </div>
      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,fontSize:10,fontWeight:700,background:activeColor+"15",color:activeColor,border:`1px solid ${activeColor}33`,whiteSpace:"nowrap"}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:activeColor}}/>activo
      </span>
    </div>
  );
};

const TopBar=({title,sub,onBack,onLogout,actions})=>(
  <div style={{background:C.navBg,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:20,boxShadow:"0 1px 0 rgba(0,0,0,0.08)"}}>
    {onBack && (
      <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.navMuted}55`,color:C.navText,borderRadius:8,padding:"6px 12px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
    )}
    <div style={{width:34,height:34,borderRadius:9,background:"#000",backgroundImage:"url('/brand/tgs-sheep.jpg')",backgroundSize:"cover",backgroundPosition:"center",flexShrink:0}}/>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontWeight:800,fontSize:14,color:C.navText,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
      {sub && <div style={{fontSize:11,color:C.navMuted,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
    </div>
    {actions}
    {onLogout && (
      <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.navMuted}55`,color:C.navText,borderRadius:8,padding:"6px 12px",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:f.b}}>Salir</button>
    )}
  </div>
);
const SL=({children,mt})=>(
  <div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:C.muted,textTransform:"uppercase",marginBottom:10,marginTop:mt||4}}>{children}</div>
);
let __photoSlotSeq=0;
const PhotoSlot=({label,captured,onCapture})=>{
  const idRef=useRef(`ps${++__photoSlotSeq}`);
  const camId=`${idRef.current}-cam`;
  const galId=`${idRef.current}-gal`;
  const [preview,setPreview]=useState(null);
  const [uploading,setUploading]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const handleFile=async(e)=>{
    const file=e.target.files[0];
    e.target.value="";
    setMenuOpen(false);
    if(!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try{ const url=await uploadPhoto(file,Date.now()+"_"+label); onCapture(url); }
    catch(err){ setPreview(null); alert("No se pudo subir la foto: "+(err.message||err)); }
    setUploading(false);
  };
  const icon=uploading
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    : captured
    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>;
  const stateColor=captured?C.green:C.muted;
  return(
    <>
      <div onClick={()=>!uploading&&setMenuOpen(true)}
        style={{background:captured?C.green+"08":C.surfaceHi,border:`1.5px dashed ${captured?C.green:C.border}`,borderRadius:12,aspectRatio:"4/3",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:uploading?"default":"pointer",gap:6,overflow:"hidden",position:"relative",color:stateColor,transition:"border-color .15s, background .15s"}}>
        <input id={camId} type="file" accept="image/*" capture="environment" style={{position:"absolute",width:0,height:0,opacity:0,pointerEvents:"none"}} onChange={handleFile}/>
        <input id={galId} type="file" accept="image/*" style={{position:"absolute",width:0,height:0,opacity:0,pointerEvents:"none"}} onChange={handleFile}/>
        {preview && <img src={preview} alt={label} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/>}
        {!preview && icon}
        <span style={{fontSize:11,fontWeight:600,color:captured?C.green:C.muted,textAlign:"center",padding:"0 6px",position:"relative",zIndex:1,letterSpacing:0.2}}>{uploading?"Subiendo…":label}</span>
      </div>
      {menuOpen && (
        <div onClick={()=>setMenuOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:C.surface,borderRadius:"16px 16px 0 0",padding:"22px 22px max(28px, env(safe-area-inset-bottom))",width:"100%",maxWidth:480,boxShadow:"0 -10px 30px rgba(0,0,0,0.2)"}}>
            <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 18px"}}/>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14,letterSpacing:-0.2}}>{label||"Foto"}</div>
            <label htmlFor={camId}
              style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontFamily:f.b,textAlign:"left",boxSizing:"border-box"}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.impl+"15",border:`1px solid ${C.impl}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.impl}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>Tomar foto</div>
                <div style={{fontSize:12,color:C.muted,fontWeight:500,marginTop:2}}>Abrir la cámara ahora</div>
              </div>
            </label>
            <label htmlFor={galId}
              style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontFamily:f.b,textAlign:"left",boxSizing:"border-box"}}>
              <div style={{width:36,height:36,borderRadius:10,background:C.blue+"15",border:`1px solid ${C.blue}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.blue}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>Elegir desde archivos</div>
                <div style={{fontSize:12,color:C.muted,fontWeight:500,marginTop:2}}>Buscar una foto guardada</div>
              </div>
            </label>
            <button onClick={()=>setMenuOpen(false)}
              style={{width:"100%",background:"transparent",border:"none",color:C.muted,padding:"12px",cursor:"pointer",fontFamily:f.b,fontSize:13,fontWeight:600,marginTop:4}}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

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
const ApprovalModal=({report,onClose,onApprove,onReject,onReview,onUpdateItems})=>{
  const [comment,setComment]=useState(report.supervisorComment||"");
  const [items,setItems]=useState(report.items||[]);
  const vt = VERTICALS[report.type];
  const setItemStatus=(i,status)=>{
    const next=items.map((it,j)=>j===i?{...it,status}:it);
    setItems(next);
    onUpdateItems&&onUpdateItems(report.id,next);
  };
  const setAllItems=(status)=>{
    if(!items.length) return;
    const next=items.map(it=>({...it,status}));
    setItems(next);
    onUpdateItems&&onUpdateItems(report.id,next);
  };
  const extraPhotos=(report.photos_urls||[]).filter(u=>!items.some(it=>it.photo===u));
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

        <Card style={{marginBottom:12}}>
          <SL>Datos del reporte</SL>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {report.qty!==undefined&&<Pill color={vt.color}>{report.qty} {items.length?"elementos":"materiales"}</Pill>}
            {report.contacts&&<Pill color={vt.color}>{report.contacts} contactos</Pill>}
            {report.units&&<Pill color={vt.color}>{report.units} unidades</Pill>}
            {report.signed&&<Pill color={C.green}>Firmado</Pill>}
            {report.popOk===false&&<Pill color={C.red}>POP incompleto</Pill>}
            {report.issues&&<Pill color={C.red}>Con incidencia</Pill>}
          </div>
          {(report.issueNote||report.popNote)&&(
            <div style={{background:C.red+"18",border:`1px solid ${C.red}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.red,marginTop:10}}>
              {report.issueNote||report.popNote}
            </div>
          )}
        </Card>

        {items.length>0 && (
          <Card style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
              <SL>Elementos ({items.length})</SL>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setAllItems("approved")} style={{background:"transparent",border:`1px solid ${C.green}55`,color:C.green,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:f.b}}>Aprobar todos</button>
                <button onClick={()=>setAllItems("rejected")} style={{background:"transparent",border:`1px solid ${C.red}55`,color:C.red,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:f.b}}>Rechazar todos</button>
              </div>
            </div>
            <div style={{display:"grid",gap:10}}>
              {items.map((it,i)=>{
                const st=it.status||"pending";
                const stColor=st==="approved"?C.green:st==="rejected"?C.red:C.muted;
                const stLabel=st==="approved"?"Aprobado":st==="rejected"?"Rechazado":"Pendiente";
                return(
                  <div key={i} style={{background:C.surfaceHi,border:`1px solid ${stColor}33`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:10}}>
                      {it.photo && <img src={it.photo} alt={it.name} style={{width:64,height:64,objectFit:"cover",borderRadius:8,flexShrink:0,cursor:"pointer"}} onClick={()=>window.open(it.photo,"_blank")}/>}
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.text,letterSpacing:-0.1}}>{it.name||`Elemento ${i+1}`}</div>
                        {it.note && <div style={{fontSize:11,color:C.muted,marginTop:3,fontStyle:"italic"}}>"{it.note}"</div>}
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:6,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:stColor+"15",color:stColor,border:`1px solid ${stColor}33`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:stColor}}/>{stLabel}
                        </span>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:8}}>
                      <button onClick={()=>setItemStatus(i,"approved")} disabled={st==="approved"}
                        style={{flex:1,background:st==="approved"?C.green+"18":"transparent",border:`1px solid ${st==="approved"?C.green:C.border}`,color:st==="approved"?C.green:C.text,borderRadius:8,padding:"6px",fontSize:11,fontWeight:600,cursor:st==="approved"?"default":"pointer",fontFamily:f.b}}>✓ Aprobar</button>
                      <button onClick={()=>setItemStatus(i,"rejected")} disabled={st==="rejected"}
                        style={{flex:1,background:st==="rejected"?C.red+"18":"transparent",border:`1px solid ${st==="rejected"?C.red:C.border}`,color:st==="rejected"?C.red:C.text,borderRadius:8,padding:"6px",fontSize:11,fontWeight:600,cursor:st==="rejected"?"default":"pointer",fontFamily:f.b}}>✗ Rechazar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {extraPhotos.length>0 && (
          <Card style={{marginBottom:12}}>
            <SL>{items.length?"Fotos adicionales":"Fotografías adjuntas"}</SL>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {extraPhotos.map((url,i)=>(
                <img key={i} src={url} alt={`foto-${i}`} style={{width:"100%",aspectRatio:"4/3",objectFit:"cover",borderRadius:10,cursor:"pointer"}} onClick={()=>window.open(url,"_blank")}/>
              ))}
            </div>
          </Card>
        )}

        {report.signedPhoto && (
          <Card style={{marginBottom:12}}>
            <SL>Guía de despacho firmada</SL>
            <img src={report.signedPhoto} alt="guía firmada" style={{width:"100%",borderRadius:10,cursor:"pointer",border:`1px solid ${C.border}`}} onClick={()=>window.open(report.signedPhoto,"_blank")}/>
          </Card>
        )}

        <Inp label="Comentario del supervisor" textarea placeholder="Escribe una observación, corrección o aprobación..." value={comment} onChange={e=>setComment(e.target.value)}/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <Btn variant="danger" full onClick={()=>onReject(report.id,comment)}>Rechazar reporte</Btn>
          <Btn variant="success" full onClick={()=>onApprove(report.id,comment)}>Aprobar reporte</Btn>
        </div>
        <div style={{marginTop:10}}>
          <Btn variant="ghost" full small onClick={()=>onReview(report.id,comment)}>Solicitar corrección</Btn>
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

  const markBoletaUploaded=(key,name)=>setBoletas(prev=>({...prev,[key]:{uploaded:true,filename:name||"boleta.pdf"}}));

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
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>setSelC(null)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
            <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</h1>
          </div>
          <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:vt.color+"15",color:vt.color,border:`1px solid ${vt.color}33`,flexShrink:0}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:vt.color}}/>{vt.label.split(" ")[0]}
          </span>
        </div>

        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 24px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:14,flexWrap:"wrap",marginBottom:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Total bruto</div>
              <div style={{fontSize:32,fontWeight:700,color:C.text,letterSpacing:-1,lineHeight:1}}>{fmt$(campTotal)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:4}}>Líquido estimado</div>
              <div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmt$(campTotal*0.8925)}</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2,fontWeight:500}}>retención 10.75%</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingTop:14,borderTop:`1px solid ${C.border}`}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:C.surfaceHi,color:C.text,border:`1px solid ${C.border}`}}>{c.payMode}</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:C.surfaceHi,color:C.text,border:`1px solid ${C.border}`}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:rows.length>0?C.green:C.muted}}/>{rows.length} worker{rows.length!==1?"s":""}
            </span>
            <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:(allBoletasOk?C.green:C.orange)+"15",color:allBoletasOk?C.green:C.orange,border:`1px solid ${(allBoletasOk?C.green:C.orange)}33`}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:allBoletasOk?C.green:C.orange}}/>{rows.length-pendingBoletas}/{rows.length} boletas
            </span>
          </div>
        </div>

        {pendingBoletas>0 && (
          <div style={{background:C.orange+"10",border:`1px solid ${C.orange}33`,borderRadius:10,padding:"12px 14px",marginBottom:18,fontSize:12,color:C.text,fontWeight:500,display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.orange,marginTop:5,flexShrink:0}}/>
            <span><span style={{fontWeight:700,color:C.orange}}>{pendingBoletas} boleta{pendingBoletas!==1?"s":""} pendiente{pendingBoletas!==1?"s":""}.</span> El pago al worker queda en espera hasta que la suba.</span>
          </div>
        )}

        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12,marginTop:8}}>
          <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Detalle por worker</h2>
          <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{rows.length} {rows.length===1?"persona":"personas"}</span>
        </div>

        <div style={{display:"grid",gap:8}}>
          {rows.map((e,i)=>{
            const liq=e.amount*0.8925;
            const ok=e.boleta.uploaded;
            const initials=e.userName.split(" ").map(n=>n[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
            return(
              <div key={i} style={{background:C.surface,border:`1px solid ${ok?C.green+"55":C.border}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0,flex:1}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <div style={{width:40,height:40,borderRadius:"50%",background:vt.color,color:pickTextOn(vt.color),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13}}>{initials||"?"}</div>
                      {ok && <span style={{position:"absolute",bottom:-1,right:-1,width:14,height:14,borderRadius:"50%",background:C.green,border:`2px solid ${C.surface}`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.userName}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2,fontWeight:500}}>RUT {e.person.rut}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:1,fontWeight:500}}>{e.person.bank} · {e.person.accountType}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:18,fontWeight:700,color:C.text,letterSpacing:-0.3,lineHeight:1}}>{fmt$(e.amount)}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4,fontWeight:500}}>liq. {fmt$(liq)}</div>
                  </div>
                </div>

                <div style={{background:C.surfaceHi,borderRadius:8,padding:"8px 12px",fontSize:11,color:C.muted,marginBottom:10,fontWeight:500}}>
                  {c.payMode==="Por visita/punto"||c.payMode==="Tarifa fija por material"
                    ?<><span style={{color:C.text,fontWeight:600}}>{e.userReports.reduce((s,r)=>s+(r.qty||r.units||1),0)}</span> unidades × {fmt$(c.payAmount)}</>
                    :c.payMode==="Por día trabajado"
                    ?<><span style={{color:C.text,fontWeight:600}}>{e.userReports.length}</span> días × {fmt$(c.payAmount)}</>
                    :<>Campaña completa · {fmt$(c.payAmount)}</>
                  }
                  {" · "}{e.userReports.length} reporte{e.userReports.length!==1?"s":""} aprobado{e.userReports.length!==1?"s":""}
                </div>

                {ok ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.green+"10",border:`1px solid ${C.green}33`,borderRadius:8,padding:"8px 12px",gap:10}}>
                    <span style={{fontSize:12,color:C.text,fontWeight:500,minWidth:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.boleta.filename}</span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:C.green+"20",color:C.green,border:`1px solid ${C.green}33`,flexShrink:0}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:C.green}}/>Recibida
                    </span>
                  </div>
                ) : (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.orange+"10",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"8px 12px",gap:10}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:C.orange,fontWeight:600}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:C.orange}}/>Boleta pendiente
                    </span>
                    <button onClick={()=>markBoletaUploaded(e.boletaKey,`boleta_${e.userName.split(" ")[0].toLowerCase()}_${c.client.toLowerCase()}.pdf`)}
                      style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:7,padding:"5px 10px",fontFamily:f.b,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                      Marcar recibida
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={()=>alert("Descarga planilla Excel de esta campaña")}
            style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Descargar Excel
          </button>
          <button onClick={()=>alert("Descarga PDF consolidado de pagos")} disabled={!allBoletasOk}
            style={{flex:1,background:allBoletasOk?C.green:C.surfaceHi,color:allBoletasOk?"#fff":C.muted,border:"none",borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:allBoletasOk?"pointer":"not-allowed"}}>
            {allBoletasOk?"Descargar PDF":"Faltan boletas"}
          </button>
        </div>
        {!allBoletasOk && <p style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:8,fontWeight:500}}>El PDF se habilita cuando todos los workers subieron su boleta</p>}
      </div>
    );
  }

  // ── CAMPAIGN LIST VIEW ──
  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:18,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Pagos</h1>
          <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Por campaña, con boletas de honorarios</p>
        </div>
        <button onClick={()=>alert("Descarga Excel consolidado de todos los pagos")}
          style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"9px 14px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Exportar Excel
        </button>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:2}}>
        {[["all","Todas",C.text],["impl","Implementación",C.impl],["promo","Promo",C.promo],["mec","Mecanización",C.mec]].map(([v,lbl,col])=>{
          const active=filter===v;
          return (
            <button key={v} onClick={()=>setFilter(v)}
              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:999,border:`1px solid ${active?col:C.border}`,background:active?col+"15":"transparent",color:active?col:C.muted,fontFamily:f.b,fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              {v!=="all"&&<span style={{width:6,height:6,borderRadius:"50%",background:col}}/>}
              {lbl}
            </button>
          );
        })}
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.green}55`,borderRadius:14,padding:"22px 24px",marginBottom:24,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:C.green}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:14,flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Total global aprobado</div>
            <div style={{fontSize:32,fontWeight:700,color:C.text,letterSpacing:-1,lineHeight:1}}>{fmt$(grandTotal)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:4}}>Líquido estimado</div>
            <div style={{fontSize:18,fontWeight:700,color:C.green}}>{fmt$(grandTotal*0.8925)}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2,fontWeight:500}}>ret. 10.75% incluida</div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
        <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Campañas con pagos</h2>
        <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{campList.length} {campList.length===1?"campaña":"campañas"}</span>
      </div>

      {campList.length===0 ? (
        <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Sin reportes aprobados aún.</div>
      ) : (
        <div style={{display:"grid",gap:8}}>
          {campList.map(c=>{
            const vt=VERTICALS[c.type];
            const rows=computeForCampaign(c);
            const campTotal=rows.reduce((s,e)=>s+e.amount,0);
            const boletasOk=rows.filter(e=>e.boleta.uploaded).length;
            const allOk=rows.length>0 && boletasOk===rows.length;
            return(
              <div key={c.id} onClick={()=>setSelC(c)}
                style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=vt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:vt.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
                    <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500}}>{c.payMode}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:17,fontWeight:700,color:C.text,letterSpacing:-0.3,lineHeight:1}}>{fmt$(campTotal)}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:4,fontWeight:500}}>liq. {fmt$(campTotal*0.8925)}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:C.surfaceHi,color:C.text,border:`1px solid ${C.border}`}}>
                      {rows.length} worker{rows.length!==1?"s":""}
                    </span>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:(allOk?C.green:C.orange)+"15",color:allOk?C.green:C.orange,border:`1px solid ${(allOk?C.green:C.orange)}33`}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:allOk?C.green:C.orange}}/>{boletasOk}/{rows.length} boletas
                    </span>
                  </div>
                  <span style={{fontSize:12,color:vt.color,fontWeight:600,whiteSpace:"nowrap"}}>Ver detalle →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── APPROVAL TAB ─────────────────────────────────────────────────────────────
const ApprovalTab=({reports,setReports,allCampaigns,vertical,user,filterStatus:fsExternal,setFilterStatus:setFsExternal})=>{
  const [modal,setModal]=useState(null);
  const [fsInternal,setFsInternal]=useState("pending");
  const filterStatus=fsExternal!==undefined?fsExternal:fsInternal;
  const setFilterStatus=setFsExternal||setFsInternal;

  const relevant=reports.filter(r=>r.type===vertical||(vertical==="all"));
  const filtered=filterStatus==="all"?relevant:relevant.filter(r=>r.status===filterStatus);

  const updateReport=async(id,patch)=>{
    setReports(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));
    await updateReportApproval(id,patch.status,patch.supervisorComment||"",patch.approvedBy||user.name);
  };
  const approve=(id,comment)=>{ updateReport(id,{status:"approved",supervisorComment:comment,approvedBy:user.name}); setModal(null); };
  const reject =(id,comment)=>{ updateReport(id,{status:"rejected",supervisorComment:comment,approvedBy:user.name}); setModal(null); };
  const review =(id,comment)=>{ updateReport(id,{status:"review",  supervisorComment:comment,approvedBy:user.name}); setModal(null); };
  const updateItems=async(id,nextItems)=>{
    setReports(prev=>prev.map(r=>r.id===id?{...r,items:nextItems}:r));
    setModal(m=>m&&m.id===id?{...m,items:nextItems}:m);
    await updateReportItems(id,nextItems);
  };

  const counts={pending:0,approved:0,rejected:0,review:0};
  relevant.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);

  return(
    <div style={{paddingBottom:80}}>
      {modal&&<ApprovalModal report={modal} onClose={()=>setModal(null)} onApprove={approve} onReject={reject} onReview={review} onUpdateItems={updateItems}/>}

      <div style={{marginBottom:24}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Aprobaciones</h1>
        <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Revisá y aprobá los reportes que llegan del terreno</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:18}}>
        {Object.entries(REPORT_STATUS).map(([k,v])=>{
          const active=filterStatus===k;
          return (
            <button key={k} onClick={()=>setFilterStatus(k)}
              style={{textAlign:"left",background:C.surface,border:`1px solid ${active?v.color:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",position:"relative",overflow:"hidden",transition:"border-color .15s, box-shadow .15s",boxShadow:active?`0 0 0 3px ${v.color}22`:"none",fontFamily:f.b}}
              onMouseEnter={e=>{if(!active) e.currentTarget.style.borderColor=v.color+"88";}}
              onMouseLeave={e=>{if(!active) e.currentTarget.style.borderColor=C.border;}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:v.color}}/>
                <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>{v.label}</span>
              </div>
              <div style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:-0.5,lineHeight:1}}>{counts[k]||0}</div>
            </button>
          );
        })}
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:13,color:C.muted,fontWeight:500}}>{filterStatus==="all"?`Mostrando todos (${filtered.length})`:`${REPORT_STATUS[filterStatus]?.label} · ${filtered.length}`}</div>
        <button onClick={()=>setFilterStatus("all")} style={{background:"none",border:"none",color:filterStatus==="all"?C.muted:C.text,fontSize:12,fontWeight:600,cursor:"pointer",padding:0,fontFamily:f.b}}>
          {filterStatus==="all"?"":"Mostrar todos →"}
        </button>
      </div>

      {filtered.length===0 ? (
        <div style={{background:C.surface,border:`1px dashed ${C.border}`,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13,borderRadius:12}}>No hay reportes con este estado.</div>
      ) : (
        <div style={{display:"grid",gap:28}}>
          {(()=>{
            const byCamp=new Map();
            filtered.forEach(r=>{
              const cid=r.campaignId||"_uncat";
              if(!byCamp.has(cid)) byCamp.set(cid,[]);
              byCamp.get(cid).push(r);
            });
            return Array.from(byCamp,([cid,items])=>{
              const camp=allCampaigns.find(c=>c.id===cid);
              const title=camp?.name||"Sin campaña";
              const client=camp?.client;
              return(
                <section key={cid}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
                      {client && <div style={{fontSize:12,color:C.muted,fontWeight:500,marginTop:2}}>{client}</div>}
                    </div>
                    <span style={{fontSize:11,color:C.muted,fontWeight:600,whiteSpace:"nowrap"}}>{items.length} reporte{items.length!==1?"s":""}</span>
                  </div>
                  <div style={{display:"grid",gap:8}}>
                    {items.map(r=>{
            const vt=VERTICALS[r.type];
            const st=REPORT_STATUS[r.status];
            const isPending=r.status==="pending";
            return(
              <div key={r.id} onClick={()=>setModal(r)}
                style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"border-color .15s, box-shadow .15s",position:"relative"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=st.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:st.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:8}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:6}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:10,fontWeight:600,background:vt.color+"15",color:vt.color,border:`1px solid ${vt.color}33`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:vt.color}}/>{vt.label}
                      </span>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:10,fontWeight:600,background:st.color+"15",color:st.color,border:`1px solid ${st.color}33`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:st.color}}/>{st.label}
                      </span>
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.store||r.point||r.location}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:3,fontWeight:500}}>{r.user}{camp?.client?` · ${camp.client}`:""}</div>
                  </div>
                  <div style={{fontSize:11,color:C.muted,textAlign:"right",fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{r.date}</div>
                </div>
                <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:C.muted,fontWeight:500}}>
                  {r.qty!==undefined && <span><span style={{color:C.text,fontWeight:600}}>{r.qty}</span> unidades</span>}
                  {r.contacts && <span><span style={{color:C.text,fontWeight:600}}>{r.contacts}</span> contactos</span>}
                  {r.units && <span><span style={{color:C.text,fontWeight:600}}>{r.units}</span> uds</span>}
                </div>
                {r.supervisorComment && (
                  <div style={{background:C.surfaceHi,borderLeft:`2px solid ${C.border}`,borderRadius:6,padding:"8px 12px",fontSize:12,color:C.muted,marginTop:10,fontStyle:"italic"}}>
                    "{r.supervisorComment}"
                    {r.approvedBy && <div style={{fontSize:11,marginTop:3,opacity:0.7,fontStyle:"normal",fontWeight:500}}>— {r.approvedBy}</div>}
                  </div>
                )}
                {isPending && <div style={{textAlign:"right",marginTop:10,fontSize:12,color:C.orange,fontWeight:600}}>Revisar →</div>}
              </div>
            );
                    })}
                  </div>
                </section>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

// ─── TEST SALAS ──────────────────────────────────────────────────────────────
const TEST_SALAS=[
  {name:"Jumbo Arica",chain:"Jumbo",address:"Av. Diego Portales 2500, Arica",lat:-18.478,lng:-70.321},
  {name:"Lider Iquique",chain:"Lider",address:"Av. Arturo Prat 1500, Iquique",lat:-20.220,lng:-70.143},
  {name:"Jumbo Antofagasta",chain:"Jumbo",address:"Av. Angamos 745, Antofagasta",lat:-23.648,lng:-70.398},
  {name:"Tottus Calama",chain:"Tottus",address:"Av. Granaderos 3200, Calama",lat:-22.460,lng:-68.925},
  {name:"Unimarc Copiapó",chain:"Unimarc",address:"Av. Copayapu 800, Copiapó",lat:-27.370,lng:-70.330},
  {name:"Jumbo La Serena",chain:"Jumbo",address:"Av. Alberto Solari 1400, La Serena",lat:-29.915,lng:-71.230},
  {name:"Lider Viña del Mar",chain:"Lider",address:"Av. Libertad 1348, Viña del Mar",lat:-33.020,lng:-71.555},
  {name:"Tottus Valparaíso",chain:"Tottus",address:"Av. Pedro Montt 2930, Valparaíso",lat:-33.048,lng:-71.615},
  {name:"Jumbo Las Condes",chain:"Jumbo",address:"Av. Las Condes 13451, Las Condes",lat:-33.405,lng:-70.567},
  {name:"Lider Maipú",chain:"Lider",address:"Av. Pajaritos 1200, Maipú",lat:-33.510,lng:-70.760},
  {name:"Unimarc Providencia",chain:"Unimarc",address:"Av. Providencia 2345, Providencia",lat:-33.430,lng:-70.615},
  {name:"Tottus Puente Alto",chain:"Tottus",address:"Av. Concha y Toro 1550, Puente Alto",lat:-33.600,lng:-70.575},
  {name:"Jumbo Rancagua",chain:"Jumbo",address:"Av. Libertador B. O'Higgins 700, Rancagua",lat:-34.170,lng:-70.738},
  {name:"Lider Talca",chain:"Lider",address:"Av. 2 Sur 1900, Talca",lat:-35.428,lng:-71.650},
  {name:"Unimarc Chillán",chain:"Unimarc",address:"Av. O'Higgins 600, Chillán",lat:-36.610,lng:-72.103},
  {name:"Jumbo Concepción",chain:"Jumbo",address:"Av. Paicaví 3000, Concepción",lat:-36.830,lng:-73.050},
  {name:"Tottus Temuco",chain:"Tottus",address:"Av. Alemania 999, Temuco",lat:-38.738,lng:-72.595},
  {name:"Lider Osorno",chain:"Lider",address:"Av. Juan Mackenna 800, Osorno",lat:-40.570,lng:-73.130},
  {name:"Jumbo Puerto Montt",chain:"Jumbo",address:"Av. Diego Portales 500, Puerto Montt",lat:-41.468,lng:-72.940},
  {name:"Unimarc Castro",chain:"Unimarc",address:"Calle Blanco 350, Castro",lat:-42.480,lng:-73.765},
];

// ─── CAMPAIGN MAP (form) ─────────────────────────────────────────────────────
const CampaignMapView=({workers,salas})=>{
  const {MapContainer,TileLayer,CircleMarker,Popup}=require("react-leaflet");
  const mappedWorkers=(workers||[]).filter(w=>w.lat&&w.lng);
  const mappedSalas=(salas||[]).filter(s=>s.lat&&s.lng);

  return(
    <div style={{height:"100%",width:"100%"}}>
      <MapContainer center={[-35,-71]} zoom={4} style={{height:"100%",width:"100%"}} scrollWheelZoom={true}
        maxBounds={[[-10,-85],[-58,-60]]} maxBoundsViscosity={1.0} minZoom={3} maxZoom={15}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO'/>
        {/* Salas — rojo */}
        {mappedSalas.map((s,i)=>(
          <CircleMarker key={`sala-${i}`} center={[s.lat,s.lng]} radius={7} pathOptions={{color:"#E84C4C",fillColor:"#E84C4C",fillOpacity:0.9,weight:2}}>
            <Popup><div style={{fontFamily:"DM Sans,sans-serif",minWidth:160}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>🏪 {s.name}</div>
              {s.chain&&<div style={{fontSize:11,color:"#666",marginBottom:1}}>{s.chain}</div>}
              {s.address&&<div style={{fontSize:11,color:"#666"}}>{s.address}</div>}
            </div></Popup>
          </CircleMarker>
        ))}
        {/* Workers — por rol */}
        {mappedWorkers.map(w=>{
          const rc=ROLE_META[(w.roles||[])[0]]?.color||"#6B8BAA";
          return(
            <CircleMarker key={w.id} center={[w.lat,w.lng]} radius={6} pathOptions={{color:rc,fillColor:rc,fillOpacity:0.7,weight:1.5}}>
              <Popup><div style={{fontFamily:"DM Sans,sans-serif",minWidth:150}}>
                <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>{w.name}</div>
                <div style={{fontSize:11,color:"#666"}}>📍 {w.comuna||"—"}</div>
                <div style={{fontSize:11,color:"#666"}}>{(w.roles||[]).map(r=>ROLE_META[r]?.label).filter(Boolean).join(", ")}</div>
                {w.phone&&<div style={{marginTop:4}}><a href={waLink(w.phone)} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#25D366",fontWeight:700,textDecoration:"none"}}>💬 WhatsApp</a></div>}
              </div></Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {/* Leyenda */}
      <div style={{position:"absolute",bottom:10,left:10,background:"#ffffffdd",borderRadius:8,padding:"6px 10px",fontSize:10,display:"flex",gap:10,zIndex:1000}}>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#E84C4C",marginRight:4,verticalAlign:"middle"}}></span>Salas ({mappedSalas.length})</span>
        <span><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:"#6B8BAA",marginRight:4,verticalAlign:"middle"}}></span>Workers ({mappedWorkers.length})</span>
      </div>
    </div>
  );
};

// Renderiza el contenido del círculo de avatar: <img> si photo es URL, sino iniciales o "?"
const avatarContent=(photo,name)=>{
  if(typeof photo==="string" && /^https?:\/\//.test(photo)){
    return <img src={photo} alt={name||"avatar"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>;
  }
  return photo || (name||"").split(" ").map(n=>n[0]).filter(Boolean).slice(0,2).join("").toUpperCase() || "?";
};

// Formatea un RUT chileno mientras se escribe: 12.345.678-9 (acepta dígitos y K)
const formatRut=(raw)=>{
  const clean=(raw||"").replace(/[^0-9kK]/g,"").toUpperCase();
  if(!clean) return "";
  if(clean.length===1) return clean;
  const body=clean.slice(0,-1);
  const dv=clean.slice(-1);
  const withDots=body.replace(/\B(?=(\d{3})+(?!\d))/g,".");
  return `${withDots}-${dv}`;
};

// ─── CAMPAIGN FORM helpers (a nivel módulo para no perder el foco de inputs al re-render) ──
// FormSection ya está definido más abajo (shared con los forms de reporte); lo reusamos acá.
const FormPersonRow=({person,active,onClick,activeColor})=>{
  const rc=ROLE_META[(person.roles||[])[0]]?.color||activeColor||C.muted;
  return (
    <div onClick={onClick}
      style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,background:active?activeColor+"10":"transparent",border:`1px solid ${active?activeColor:C.border}`,marginBottom:6,cursor:"pointer",transition:"all .15s"}}>
      <div style={{width:32,height:32,borderRadius:"50%",background:rc,color:pickTextOn(rc),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0,overflow:"hidden"}}>{avatarContent(person.photo,person.name)}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{person.name}</div>
        {(person.comuna||person.region) && (
          <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.muted,fontWeight:500,marginTop:2}}>
            <Icon name="pin" size={11}/>
            {person.comuna||"—"}{person.region?` · ${(person.region||"").split("—")[0].trim()}`:""}
          </div>
        )}
      </div>
      <div style={{width:20,height:20,borderRadius:"50%",border:`1.5px solid ${active?activeColor:C.border}`,background:active?activeColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {active && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={pickTextOn(activeColor)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
      </div>
    </div>
  );
};

// ─── CAMPAIGN FORM ────────────────────────────────────────────────────────────
const CampaignForm=({type,initial,onSave,onCancel,workers:dbWorkers,clients:dbClients,onClientCreated})=>{
  const vt=VERTICALS[type];
  const blankSala={name:"",chain:"",address:"",lat:null,lng:null};
  const blank={client:"",client_id:null,name:"",dateStart:"",dateEnd:"",team:[],supervisors:[],status:"activa",payMode:PAY_MODES[0],payAmount:"",
    ...(type==="impl"?{salas:[{...blankSala}],materials:[""]}:{}),
    ...(type==="promo"?{salas:[{...blankSala}],targetContacts:"",targetSamples:"",days:""}:{}),
    ...(type==="mec"?{material:"",totalUnits:""}:{}),
  };
  const migrateInitial=(init)=>{
    if(!init)return null;
    const copy={...init};
    if(copy.points&&typeof copy.points[0]==="string"){copy.salas=copy.points.map(p=>({name:p,chain:"",address:"",lat:null,lng:null}));delete copy.points;}
    if(copy.activationPoints&&typeof copy.activationPoints[0]==="string"){copy.salas=copy.activationPoints.map(p=>({name:p,chain:"",address:"",lat:null,lng:null}));delete copy.activationPoints;}
    if(!copy.salas&&(type==="impl"||type==="promo"))copy.salas=[{...blankSala}];
    if(!copy.supervisors)copy.supervisors=[];
    return copy;
  };
  const [form,setForm]=useState(migrateInitial(initial)||blank);
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const addItem=(k)=>setF(k,[...form[k],""]);
  const removeItem=(k,i)=>setF(k,form[k].filter((_,j)=>j!==i));
  const editItem=(k,i,v)=>setF(k,form[k].map((x,j)=>j===i?v:x));
  const toggleTeam=(name)=>setF("team",form.team.includes(name)?form.team.filter(x=>x!==name):[...form.team,name]);
  const toggleSupervisor=(name)=>setF("supervisors",form.supervisors.includes(name)?form.supervisors.filter(x=>x!==name):[...form.supervisors,name]);
  const targetRoles=type==="impl"?["implementador"]:type==="promo"?["promotor"]:["mecanizador"];
  const fieldPeople=(dbWorkers||[]).filter(w=>w.status==="activo"&&(w.roles||[]).some(r=>targetRoles.includes(r)));
  const fallbackPeople=fieldPeople.length?fieldPeople:TEAM_LIST.filter(t=>targetRoles.includes(t.role));
  const supervisorPeople=(dbWorkers||[]).filter(w=>w.status==="activo"&&(w.roles||[]).includes("supervisor"));
  const canSave=form.client&&form.name&&form.dateStart&&form.dateEnd&&form.team.length>0&&form.payAmount;
  const hasSalas=type==="impl"||type==="promo";
  const fileRef=useRef(null);
  const [uploadErr,setUploadErr]=useState("");

  // ── Salas helpers ──
  const addSala=()=>setF("salas",[...form.salas,{...blankSala}]);
  const removeSala=(i)=>setF("salas",form.salas.filter((_,j)=>j!==i));
  const editSala=(i,field,val)=>setF("salas",form.salas.map((s,j)=>j===i?{...s,[field]:val}:s));

  // ── Descargar plantilla Excel ──
  const downloadTemplate=()=>{
    const header=[["Nombre sala / local","Cadena","Dirección","Latitud","Longitud"]];
    const example=[["Jumbo Providencia","Jumbo","Av. Providencia 2345, Providencia",-33.430,-70.615],["Lider Maipú","Lider","Av. Pajaritos 1200, Maipú",-33.510,-70.760],["","","","",""]];
    const ws=XLSX.utils.aoa_to_sheet([...header,...example]);
    ws["!cols"]=[{wch:30},{wch:20},{wch:40},{wch:12},{wch:12}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Salas");
    XLSX.writeFile(wb,`plantilla_salas_${form.client||"campaña"}.xlsx`);
  };

  // ── Subir Excel ──
  const handleFileUpload=(e)=>{
    setUploadErr("");
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(evt)=>{
      try{
        const wb=XLSX.read(evt.target.result,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_json(ws,{header:1});
        // Skip header row, filter empty rows
        const dataRows=rows.slice(1).filter(r=>r[0]&&String(r[0]).trim());
        if(!dataRows.length){setUploadErr("El archivo no contiene datos. Revisa que la primera fila sea el encabezado.");return;}
        const newSalas=dataRows.map(r=>({name:String(r[0]||"").trim(),chain:String(r[1]||"").trim(),address:String(r[2]||"").trim(),lat:parseFloat(r[3])||null,lng:parseFloat(r[4])||null}));
        // Append to existing (filter out empty existing ones)
        const existing=form.salas.filter(s=>s.name.trim());
        setF("salas",[...existing,...newSalas]);
      }catch(err){setUploadErr("Error al leer el archivo. Asegúrate de que sea un .xlsx válido.");}
    };
    reader.readAsArrayBuffer(file);
    e.target.value="";
  };

  const salasWithCoords=(form.salas||[]).filter(s=>s.lat&&s.lng);
  const [showNewClient,setShowNewClient]=useState(false);
  const clientsList=dbClients||[];
  const selectedClient=clientsList.find(c=>c.id===form.client_id)||clientsList.find(c=>c.name===form.client);

  // Helper local que solo retorna JSX inline (no es componente, no causa re-mount)
  const sectionTitle=(label,desc)=>(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{label}</div>
      {desc && <div style={{fontSize:12,color:C.muted,marginTop:2,fontWeight:500}}>{desc}</div>}
    </div>
  );
  const teamLabel=type==="impl"?"Implementadores":type==="promo"?"Promotores":"Mecanizadores";

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,fontFamily:f.b,color:C.text}}>
      {/* Panel izquierdo: formulario */}
      <div style={{flex:1,overflowY:"auto",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column"}}>
        <TopBar title={initial?"Editar campaña":"Nueva campaña"} sub={vt.label} onBack={onCancel}/>
        <div style={{flex:1,padding:"24px 20px 40px",maxWidth:720,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
          <div style={{marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"4px 12px",borderRadius:999,fontSize:12,fontWeight:600,background:vt.color+"15",color:vt.color,border:`1px solid ${vt.color}33`}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:vt.color}}/>{vt.label}
            </span>
          </div>

          <FormSection>
            {sectionTitle("Datos del cliente","Información general de la campaña")}
            <div style={{marginBottom:12}}>
              <label style={{fontSize:11,fontWeight:700,letterSpacing:0.4,color:C.muted,textTransform:"uppercase",marginBottom:6,display:"block"}}>Cliente *</label>
              {clientsList.length>0 ? (
                <div style={{display:"flex",gap:8}}>
                  <select value={form.client_id||""} onChange={e=>{
                      const id=e.target.value;
                      if(id==="__new__"){ setShowNewClient(true); return; }
                      const c=clientsList.find(x=>x.id===id);
                      setForm(p=>({...p,client_id:id||null,client:c?.name||""}));
                    }}
                    style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.text,fontFamily:f.b,fontSize:14,outline:"none",cursor:"pointer"}}>
                    <option value="">Selecciona un cliente…</option>
                    {clientsList.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="__new__">+ Crear nuevo cliente</option>
                  </select>
                </div>
              ) : (
                <button type="button" onClick={()=>setShowNewClient(true)}
                  style={{width:"100%",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:10,padding:"14px 16px",color:C.text,fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  <Icon name="plus" size={14}/> Crear primer cliente
                </button>
              )}
              {selectedClient && (
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:C.surfaceHi,borderRadius:8}}>
                  <div style={{width:28,height:28,borderRadius:6,background:selectedClient.logo_url?"transparent":C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                    {selectedClient.logo_url ? <img src={selectedClient.logo_url} alt={selectedClient.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                      : <span style={{fontSize:10,fontWeight:700,color:C.muted}}>{(selectedClient.name||"?").slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text}}>{selectedClient.name}</div>
                    {selectedClient.contact_name && <div style={{fontSize:11,color:C.muted}}>{selectedClient.contact_name}</div>}
                  </div>
                </div>
              )}
            </div>
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
          </FormSection>

          <FormSection>
            {sectionTitle("Configuración de pago","Modalidad y monto que recibirán los workers")}
            <Inp label="Modalidad" selectOptions={PAY_MODES} value={form.payMode} onChange={e=>setF("payMode",e.target.value)}/>
            <Inp label={`Monto en CLP — ${form.payMode==="Por visita/punto"?"por punto":form.payMode==="Por día trabajado"?"por día":form.payMode==="Tarifa fija por material"?"por unidad":"total campaña"}`}
              type="number" placeholder="ej: 15000" value={form.payAmount} onChange={e=>setF("payAmount",e.target.value)}/>
            {form.payAmount&&(
              <div style={{background:vt.color+"10",borderLeft:`3px solid ${vt.color}`,borderRadius:6,padding:"10px 14px",fontSize:12,color:C.text,fontWeight:500}}>
                {form.payMode==="Por visita/punto"?<>Cada punto completado y aprobado = <span style={{fontWeight:700,color:C.text}}>{fmt$(form.payAmount)}</span></>:
                 form.payMode==="Por día trabajado"?<>Cada día con reporte aprobado = <span style={{fontWeight:700,color:C.text}}>{fmt$(form.payAmount)}</span></>:
                 form.payMode==="Tarifa fija por material"?<>Cada unidad mecanizada aprobada = <span style={{fontWeight:700,color:C.text}}>{fmt$(form.payAmount)}</span></>:
                 <>Monto único por campaña: <span style={{fontWeight:700,color:C.text}}>{fmt$(form.payAmount)}</span></>}
              </div>
            )}
          </FormSection>

          <FormSection>
            {sectionTitle(teamLabel,`Workers que ejecutan en terreno · ${fallbackPeople.length} disponible${fallbackPeople.length!==1?"s":""}`)}
            {form.team.length>0&&(
              <div style={{background:vt.color+"10",border:`1px solid ${vt.color}33`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.text,fontWeight:500}}>
                <span style={{fontWeight:700,color:vt.color}}>{form.team.length} asignado{form.team.length!==1?"s":""}:</span> {form.team.join(", ")}
              </div>
            )}
            {fallbackPeople.length===0 ? (
              <div style={{padding:"20px 16px",textAlign:"center",color:C.muted,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:10}}>No hay {teamLabel.toLowerCase()} disponibles.</div>
            ) : fallbackPeople.map(p=>(
              <FormPersonRow key={p.id} person={p} active={form.team.includes(p.name)} onClick={()=>toggleTeam(p.name)} activeColor={vt.color}/>
            ))}
          </FormSection>

          <FormSection>
            {sectionTitle("Supervisores","Pueden supervisar múltiples puntos")}
            {form.supervisors.length>0&&(
              <div style={{background:C.blue+"10",border:`1px solid ${C.blue}33`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.text,fontWeight:500}}>
                <span style={{fontWeight:700,color:C.blue}}>{form.supervisors.length} supervisor{form.supervisors.length!==1?"es":""}:</span> {form.supervisors.join(", ")}
              </div>
            )}
            {supervisorPeople.length===0 ? (
              <div style={{padding:"20px 16px",textAlign:"center",color:C.muted,fontSize:13,border:`1px dashed ${C.border}`,borderRadius:10}}>No hay supervisores registrados.</div>
            ) : supervisorPeople.map(p=>(
              <FormPersonRow key={p.id} person={p} active={form.supervisors.includes(p.name)} onClick={()=>toggleSupervisor(p.name)} activeColor={C.blue}/>
            ))}
            {form.supervisors.length>0&&hasSalas&&form.salas.filter(s=>s.name.trim()).length>0&&(
              <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:10}}>Puntos asignados por supervisor</div>
                {form.supervisors.map(sup=>{
                  const key=`supSalas_${sup}`;
                  const assigned=form[key]||[];
                  const toggleSala=(idx)=>{
                    const next=assigned.includes(idx)?assigned.filter(x=>x!==idx):[...assigned,idx];
                    setF(key,next);
                  };
                  return(
                    <div key={sup} style={{marginBottom:12,padding:"10px 12px",border:`1px solid ${C.border}`,borderRadius:10,background:C.surfaceAlt||C.bg}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:6,display:"flex",alignItems:"center",gap:7}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:C.blue}}/>{sup}
                      </div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {form.salas.filter(s=>s.name.trim()).map((s,i)=>{
                          const isOn=assigned.includes(i);
                          return (
                            <button key={i} onClick={()=>toggleSala(i)}
                              style={{padding:"4px 10px",borderRadius:999,border:`1px solid ${isOn?C.blue:C.border}`,background:isOn?C.blue+"15":"transparent",color:isOn?C.blue:C.muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:f.b,whiteSpace:"nowrap"}}>
                              {s.name.length>22?s.name.slice(0,22)+"…":s.name}
                            </button>
                          );
                        })}
                      </div>
                      {assigned.length===0&&<div style={{fontSize:11,color:C.muted,marginTop:6,fontWeight:500}}>Sin puntos asignados (verá todos)</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </FormSection>

          {hasSalas&&(
            <FormSection>
              {sectionTitle(type==="impl"?"Salas / Puntos de venta":"Puntos de activación","Cargá manualmente o desde un Excel")}

              <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                <button onClick={downloadTemplate} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer"}}>Plantilla Excel</button>
                <button onClick={()=>fileRef.current?.click()} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,border:"none",background:vt.color,color:pickTextOn(vt.color),fontFamily:f.b,fontSize:12,fontWeight:700,cursor:"pointer"}}>Subir Excel</button>
                <button onClick={()=>{const existing=form.salas.filter(s=>s.name.trim());setF("salas",[...existing,...TEST_SALAS]);}} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ 20 de prueba</button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{display:"none"}}/>
              </div>
              {uploadErr&&(
                <div style={{background:C.red+"10",border:`1px solid ${C.red}33`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.red,fontWeight:500,marginBottom:10}}>{uploadErr}</div>
              )}

              {form.salas.filter(s=>s.name.trim()).length>0&&(
                <div style={{background:vt.color+"10",border:`1px solid ${vt.color}33`,borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.text,fontWeight:500,display:"flex",alignItems:"center",gap:7}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:vt.color}}/>
                  <span><span style={{fontWeight:700,color:vt.color}}>{form.salas.filter(s=>s.name.trim()).length}</span> sala{form.salas.filter(s=>s.name.trim()).length!==1?"s":""} · <span style={{fontWeight:700,color:vt.color}}>{salasWithCoords.length}</span> en el mapa</span>
                </div>
              )}

              <div style={{display:"grid",gap:6}}>
                {form.salas.map((sala,i)=>(
                  <div key={i} style={{background:C.surfaceAlt||C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,color:C.muted,letterSpacing:0.5,textTransform:"uppercase"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:sala.lat?C.green:C.muted}}/>
                        Sala {i+1}{sala.lat?" · georef":""}
                      </span>
                      {form.salas.length>1&&(
                        <button onClick={()=>removeSala(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4,display:"inline-flex",alignItems:"center",justifyContent:"center"}} title="Eliminar">
                          <Icon name="x" size={14}/>
                        </button>
                      )}
                    </div>
                    <input value={sala.name} onChange={e=>editSala(i,"name",e.target.value)} placeholder="Nombre del local"
                      style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontFamily:f.b,fontSize:12,outline:"none",marginBottom:5,boxSizing:"border-box",fontWeight:500}}/>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                      <input value={sala.chain} onChange={e=>editSala(i,"chain",e.target.value)} placeholder="Cadena"
                        style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontFamily:f.b,fontSize:11,outline:"none",boxSizing:"border-box"}}/>
                      <input value={sala.address} onChange={e=>editSala(i,"address",e.target.value)} placeholder="Dirección"
                        style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.text,fontFamily:f.b,fontSize:11,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    {form.team.length>0 && (
                      <div style={{marginTop:8,paddingTop:8,borderTop:`1px dashed ${C.border}`}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:0.4,color:C.muted,textTransform:"uppercase",marginBottom:5}}>Asignar a:</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                          {form.team.map(n=>{
                            const on=(sala.assignedTo||[]).includes(n);
                            return (
                              <button key={n} type="button" onClick={()=>{
                                const arr=sala.assignedTo||[];
                                editSala(i,"assignedTo",on?arr.filter(x=>x!==n):[...arr,n]);
                              }} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:999,fontSize:10,fontWeight:600,background:on?vt.color+"15":"transparent",color:on?vt.color:C.muted,border:`1px solid ${on?vt.color+"55":C.border}`,cursor:"pointer",fontFamily:f.b,transition:"all .15s"}}>
                                {on && <span style={{width:5,height:5,borderRadius:"50%",background:vt.color}}/>}
                                {n.split(" ")[0]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addSala} style={{width:"100%",marginTop:10,background:"transparent",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"10px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar sala manualmente</button>
            </FormSection>
          )}

          {type==="impl"&&(
            <FormSection>
              {sectionTitle("Materiales POP esperados","Listá los materiales que se instalarán en cada punto")}
              <div style={{display:"grid",gap:8,marginBottom:8}}>
                {form.materials.map((m,i)=>(
                  <div key={i} style={{display:"flex",gap:8}}>
                    <input value={m} onChange={e=>editItem("materials",i,e.target.value)} placeholder={`Material ${i+1}`}
                      style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none"}}/>
                    {form.materials.length>1&&(
                      <button onClick={()=>removeItem("materials",i)} title="Eliminar"
                        style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"0 12px",color:C.muted,cursor:"pointer",display:"inline-flex",alignItems:"center"}}>
                        <Icon name="x" size={14}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={()=>addItem("materials")} style={{width:"100%",background:"transparent",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"10px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar material</button>
            </FormSection>
          )}
          {type==="promo"&&(
            <FormSection>
              {sectionTitle("Metas","Objetivos de la activación")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Inp label="Meta contactos" type="number" placeholder="500" value={form.targetContacts} onChange={e=>setF("targetContacts",e.target.value)}/>
                <Inp label="Meta muestras"  type="number" placeholder="300" value={form.targetSamples}  onChange={e=>setF("targetSamples",e.target.value)}/>
              </div>
            </FormSection>
          )}

          <div style={{background:C.surface,border:`1px solid ${vt.color}55`,borderRadius:14,padding:"20px 22px",marginBottom:18,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:vt.color}}/>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:12}}>Resumen</div>
            <div style={{display:"grid",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                <span style={{color:C.muted,fontWeight:500}}>Cliente</span>
                <span style={{color:C.text,fontWeight:600}}>{form.client||"—"}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                <span style={{color:C.muted,fontWeight:500}}>Período</span>
                <span style={{color:C.text,fontWeight:600}}>{form.dateStart||"—"} → {form.dateEnd||"—"}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                <span style={{color:C.muted,fontWeight:500}}>Equipo</span>
                <span style={{color:C.text,fontWeight:600}}>{form.team.length} worker{form.team.length!==1?"s":""}{form.supervisors.length>0?` · ${form.supervisors.length} sup.`:""}</span>
              </div>
              {hasSalas && (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                  <span style={{color:C.muted,fontWeight:500}}>Salas</span>
                  <span style={{color:C.text,fontWeight:600}}>{form.salas.filter(s=>s.name.trim()).length}</span>
                </div>
              )}
              {form.payAmount && (
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,paddingTop:8,borderTop:`1px solid ${C.border}`,marginTop:4}}>
                  <span style={{color:C.muted,fontWeight:500}}>Pago</span>
                  <span style={{color:C.text,fontWeight:700}}>{fmt$(form.payAmount)} / {form.payMode==="Por campaña completa"?"campaña":form.payMode==="Por día trabajado"?"día":"unidad"}</span>
                </div>
              )}
            </div>
          </div>

          <button disabled={!canSave} onClick={()=>{
            const salasClean=form.salas?.filter(s=>s.name.trim())||[];
            onSave({...form,id:initial?.id||("c"+uid()),type,done:initial?.done||0,salas:salasClean,stores:salasClean.length||undefined,...(type==="promo"&&{points:parseInt(form.days)||salasClean.length||1})});
          }}
            style={{width:"100%",background:canSave?vt.color:C.surfaceHi,color:canSave?pickTextOn(vt.color):C.muted,border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:canSave?"pointer":"not-allowed",transition:"background .15s"}}>
            {initial?"Guardar cambios":"Crear campaña"}
          </button>
          {!canSave&&<p style={{textAlign:"center",fontSize:12,color:C.muted,marginTop:8,fontWeight:500}}>Completá todos los campos obligatorios</p>}
        </div>
      </div>

      {/* Panel derecho: mapa */}
      <div style={{width:"33%",flexShrink:0,position:"relative",background:C.bg}}>
        <CampaignMapView workers={[...fallbackPeople,...supervisorPeople]} salas={form.salas||[]}/>
      </div>

      {showNewClient && (
        <ClientForm onSave={(c)=>{
          onClientCreated&&onClientCreated(c);
          setForm(p=>({...p,client_id:c.id,client:c.name}));
          setShowNewClient(false);
        }} onCancel={()=>setShowNewClient(false)}/>
      )}
    </div>
  );
};

// ─── WORKER REGISTER SCREEN (público) ────────────────────────────────────────
const WorkerRegisterScreen=({onSuccess,onBack})=>{
  const [step,setStep]=useState(1); // 1=personal 2=roles 3=banco 4=ok
  const [form,setForm]=useState({name:"",rut:"",phone:"",email:"",password:"",confirmPass:"",region:"",comuna:"",address:"",addressDetail:"",roles:[],bank:"",accountType:"",account:"",photo:""});
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const setRegion=(v)=>setForm(p=>({...p,region:v,comuna:""}));
  const comunasForRegion=form.region?COMUNAS_POR_REGION[form.region]||[]:[];
  const toggleRole=(r)=>setF("roles",form.roles.includes(r)?form.roles.filter(x=>x!==r):[...form.roles,r]);
  const [submitting,setSubmitting]=useState(false);
  const [submitErr,setSubmitErr]=useState("");
  const [photoUploading,setPhotoUploading]=useState(false);
  const [photoErr,setPhotoErr]=useState("");
  const [photoMenuOpen,setPhotoMenuOpen]=useState(false);
  const cameraInputRef=useRef(null);
  const galleryInputRef=useRef(null);

  const handlePhotoFile=async(e)=>{
    const file=e.target.files?.[0];
    e.target.value="";
    if(!file) return;
    setPhotoErr("");setPhotoUploading(true);
    try{
      const label=form.email||form.name||"perfil";
      const url=await uploadAvatar(file,label);
      setF("photo",url);
    }catch(ex){ setPhotoErr("No se pudo subir la foto: "+(ex.message||ex)); }
    setPhotoUploading(false);
  };

  const handleSubmit=async()=>{
    setSubmitting(true);setSubmitErr("");
    try{
      const email=form.email.trim().toLowerCase();
      const {error:authErr}=await signUp(email,form.password);
      if(authErr && !/already\s*registered|user\s*already/i.test(authErr.message||"")) throw authErr;
      // Si el usuario auth ya existe, igual aseguramos que haya un worker (recupera intentos previos fallidos)
      const {data:existingWorker}=await getWorkerByEmail(email);
      if(existingWorker){
        throw new Error("Ya existe un perfil con este email. Si es tuyo, intentá iniciar sesión.");
      }
      const {error:wErr}=await insertWorker({
        name:form.name,rut:form.rut,phone:form.phone,email,
        region:form.region,comuna:form.comuna,address:form.address,address_detail:form.addressDetail||null,
        roles:form.roles,bank:form.bank,account_type:form.accountType,account_number:form.account,
        photo_url:form.photo||null,
        status:"pendiente",
      });
      if(wErr) throw wErr;
      setStep(4);
    }catch(e){setSubmitErr(e.message||"Error al registrar");}
    setSubmitting(false);
  };

  const stepTitle=(label,desc)=>(
    <div style={{marginBottom:18}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:-0.4}}>{label}</h2>
      {desc && <p style={{color:C.muted,fontSize:13,margin:"4px 0 0",lineHeight:1.5}}>{desc}</p>}
    </div>
  );
  const InfoRow=({label,value,muted})=>value?(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"10px 0",borderTop:`1px solid ${C.border}`,gap:12}}>
      <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",flexShrink:0,paddingTop:2}}>{label}</span>
      <span style={{fontSize:13,fontWeight:600,color:muted?C.muted:C.text,textAlign:"right",wordBreak:"break-word"}}>{value}</span>
    </div>
  ):null;

  if(step===4) return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:C.green+"15",border:`1px solid ${C.green}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4,textAlign:"center"}}>Registro enviado</h1>
        <p style={{color:C.muted,fontSize:13,margin:"8px 0 18px",lineHeight:1.5,textAlign:"center"}}>
          Tu perfil quedó <span style={{fontWeight:700,color:C.orange}}>pendiente de aprobación</span> por el equipo de TGS.
          Te avisaremos por WhatsApp al <span style={{fontWeight:700,color:C.text}}>{form.phone}</span>.
        </p>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"4px 18px",marginBottom:18}}>
          <InfoRow label="Nombre"   value={form.name}/>
          <InfoRow label="Email"    value={form.email}/>
          <InfoRow label="Teléfono" value={form.phone}/>
          <InfoRow label="Ubicación" value={`${form.comuna||""}${form.region?", "+form.region:""}`}/>
          <InfoRow label="Dirección" value={form.address}/>
          <InfoRow label="Detalle"  value={form.addressDetail} muted/>
        </div>
        <p style={{color:C.muted,fontSize:12,margin:"0 0 18px",textAlign:"center",lineHeight:1.5}}>Ya podés iniciar sesión. Vas a ver una pantalla de espera hasta que se apruebe tu cuenta.</p>
        <button onClick={onBack||onSuccess}
          style={{width:"100%",background:C.impl,color:pickTextOn(C.impl),border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:"pointer"}}>
          Ir a iniciar sesión
        </button>
      </div>
    </div>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title="Únete a TGS Field" sub={`Paso ${step} de 3`} onBack={step>1?()=>setStep(s=>s-1):onBack}/>

      <div style={{padding:"20px 20px 0",maxWidth:520,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",gap:6,marginBottom:24}}>
          {[1,2,3].map(s=>(
            <div key={s} style={{flex:1,height:4,borderRadius:999,background:step>=s?C.impl:C.border,transition:"background .3s"}}/>
          ))}
        </div>
      </div>

      <div style={{padding:"0 20px",maxWidth:520,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        {step===1&&<>
          {stepTitle("Tus datos personales","Necesitamos algunos datos para crear tu cuenta")}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",marginBottom:18}}>
            <Inp label="Nombre completo" placeholder="ej: Carlos Muñoz Pérez" value={form.name} onChange={e=>setF("name",e.target.value)}/>
            <Inp label="RUT" placeholder="ej: 12.345.678-9" value={form.rut} onChange={e=>setF("rut",formatRut(e.target.value))}/>
            <Inp label="Teléfono (WhatsApp)" placeholder="+569 XXXX XXXX" value={form.phone} onChange={e=>setF("phone",e.target.value)}/>
            <Inp label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={e=>setF("email",e.target.value)}/>
            <Inp label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e=>setF("password",e.target.value)}/>
            <Inp label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" value={form.confirmPass} onChange={e=>setF("confirmPass",e.target.value)}/>
            {form.password&&form.confirmPass&&form.password!==form.confirmPass&&(
              <div style={{marginBottom:14,padding:"9px 12px",background:C.red+"10",border:`1px solid ${C.red}33`,borderRadius:8,color:C.red,fontSize:12,fontWeight:500}}>Las contraseñas no coinciden</div>
            )}
          </div>

          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",marginBottom:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2,marginBottom:14}}>Ubicación</div>
            <Inp label="Región" selectOptions={REGIONS_CL} value={form.region} onChange={e=>setRegion(e.target.value)}/>
            <Inp label="Comuna de residencia" selectOptions={comunasForRegion} value={form.comuna} onChange={e=>setF("comuna",e.target.value)}/>
            {!form.region&&<p style={{fontSize:11,color:C.muted,margin:"-8px 0 14px",fontWeight:500}}>Elegí una región para ver las comunas</p>}
            <Inp label="Dirección (calle y número)" placeholder="ej: Av. Colón 1234" value={form.address} onChange={e=>setF("address",e.target.value)}/>
            <Inp label="Depto / Oficina / Referencia (opcional)" placeholder="ej: Depto 5B, Piso 3" value={form.addressDetail} onChange={e=>setF("addressDetail",e.target.value)}/>
          </div>

          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",marginBottom:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2,marginBottom:4}}>Foto de perfil</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:14,fontWeight:500}}>Opcional, ayuda a que te reconozcan en el panel</div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{display:"none"}} onChange={handlePhotoFile}/>
            <input ref={galleryInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePhotoFile}/>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:form.photo?"transparent":C.surfaceHi,border:`1.5px dashed ${form.photo?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",color:form.photo?C.green:C.muted,overflow:"hidden",flexShrink:0}}>
                {photoUploading
                  ?<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  :form.photo
                    ?<img src={form.photo} alt="Foto de perfil" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>
                }
              </div>
              <button onClick={()=>setPhotoMenuOpen(true)} disabled={photoUploading}
                style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"9px 14px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:photoUploading?"default":"pointer",opacity:photoUploading?0.6:1}}>
                {photoUploading?"Subiendo…":form.photo?"Cambiar foto":"Subir foto"}
              </button>
            </div>
            {photoErr && <div style={{marginTop:10,padding:"8px 12px",background:C.red+"15",border:`1px solid ${C.red}33`,borderRadius:8,color:C.red,fontSize:12,fontWeight:500}}>{photoErr}</div>}
          </div>

          {photoMenuOpen && (
            <div onClick={()=>setPhotoMenuOpen(false)}
              style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:0}}>
              <div onClick={e=>e.stopPropagation()}
                style={{background:C.surface,borderRadius:"16px 16px 0 0",padding:"22px 22px max(28px, env(safe-area-inset-bottom))",width:"100%",maxWidth:480,boxShadow:"0 -10px 30px rgba(0,0,0,0.2)"}}>
                <div style={{width:36,height:4,background:C.border,borderRadius:2,margin:"0 auto 18px"}}/>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14,letterSpacing:-0.2}}>Foto de perfil</div>
                <button onClick={()=>{setPhotoMenuOpen(false);cameraInputRef.current?.click();}}
                  style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontFamily:f.b,textAlign:"left"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.impl+"15",border:`1px solid ${C.impl}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.impl}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 6l1.5-2h3L15 6"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>Tomar foto</div>
                    <div style={{fontSize:12,color:C.muted,fontWeight:500,marginTop:2}}>Abrir la cámara ahora</div>
                  </div>
                </button>
                <button onClick={()=>{setPhotoMenuOpen(false);galleryInputRef.current?.click();}}
                  style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontFamily:f.b,textAlign:"left"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:C.blue+"15",border:`1px solid ${C.blue}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:C.blue}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>Elegir desde galería</div>
                    <div style={{fontSize:12,color:C.muted,fontWeight:500,marginTop:2}}>Buscar una foto guardada</div>
                  </div>
                </button>
                <button onClick={()=>setPhotoMenuOpen(false)}
                  style={{width:"100%",background:"transparent",border:"none",color:C.muted,padding:"12px",cursor:"pointer",fontFamily:f.b,fontSize:13,fontWeight:600,marginTop:4}}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <button disabled={!form.name||!form.rut||!form.phone||!form.email||!form.password||form.password.length<6||form.password!==form.confirmPass||!form.region}
            onClick={()=>setStep(2)}
            style={{width:"100%",background:(form.name&&form.rut&&form.phone&&form.email&&form.password&&form.password.length>=6&&form.password===form.confirmPass&&form.region)?C.impl:C.surfaceHi,color:(form.name&&form.rut&&form.phone&&form.email&&form.password&&form.password.length>=6&&form.password===form.confirmPass&&form.region)?pickTextOn(C.impl):C.muted,border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background .15s"}}>
            Continuar →
          </button>
        </>}

        {step===2&&<>
          {stepTitle("¿En qué querés trabajar?","Elegí uno o más roles. Solo vas a ver campañas de los tipos que elijas.")}
          <div style={{display:"grid",gap:10,marginBottom:18}}>
            {Object.entries(ROLE_META).map(([r,rd])=>{
              const active=form.roles.includes(r);
              const desc={implementador:"Instalar material POP en puntos de venta",promotor:"Activaciones, sampling y degustaciones",mecanizador:"Mecanizar materiales en bodega",supervisor:"Supervisar equipos de campo",admin:"Gestionar la plataforma"}[r];
              return (
                <div key={r} onClick={()=>toggleRole(r)}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:12,border:`1px solid ${active?rd.color:C.border}`,background:active?rd.color+"10":C.surface,cursor:"pointer",transition:"all .15s",position:"relative",overflow:"hidden"}}>
                  {active && <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:rd.color}}/>}
                  <div style={{width:42,height:42,borderRadius:10,background:rd.color+"15",border:`1px solid ${rd.color}33`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:rd.color}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:C.text,letterSpacing:-0.2}}>{rd.label}</div>
                    <div style={{fontSize:12,color:C.muted,marginTop:3,fontWeight:500,lineHeight:1.4}}>{desc}</div>
                  </div>
                  <div style={{width:22,height:22,borderRadius:"50%",border:`1.5px solid ${active?rd.color:C.border}`,background:active?rd.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pickTextOn(rd.color)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </div>
              );
            })}
          </div>
          <button disabled={form.roles.length===0} onClick={()=>setStep(3)}
            style={{width:"100%",background:form.roles.length>0?C.impl:C.surfaceHi,color:form.roles.length>0?pickTextOn(C.impl):C.muted,border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:"pointer"}}>
            Continuar → ({form.roles.length} seleccionado{form.roles.length!==1?"s":""})
          </button>
        </>}

        {step===3&&<>
          {stepTitle("Datos bancarios","Para recibir el pago de tus trabajos mediante boleta de honorarios")}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",marginBottom:14}}>
            <Inp label="Banco" selectOptions={BANKS_CL} value={form.bank} onChange={e=>setF("bank",e.target.value)}/>
            <Inp label="Tipo de cuenta" selectOptions={ACCOUNT_TYPES} value={form.accountType} onChange={e=>setF("accountType",e.target.value)}/>
            <Inp label="Número de cuenta" placeholder="ej: 1234567890" value={form.account} onChange={e=>setF("account",e.target.value)}/>
          </div>

          <div style={{background:C.blue+"08",border:`1px solid ${C.blue}33`,borderRadius:10,padding:"12px 14px",marginBottom:18,fontSize:12,color:C.text,fontWeight:500,display:"flex",alignItems:"flex-start",gap:10,lineHeight:1.5}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            <span>Tus datos bancarios están protegidos. Solo se usan para procesar pagos por trabajos aprobados.</span>
          </div>

          {submitErr&&(
            <div style={{marginBottom:14,padding:"10px 14px",background:C.red+"10",border:`1px solid ${C.red}33`,borderRadius:10,color:C.red,fontSize:13,fontWeight:500}}>{submitErr}</div>
          )}

          <button disabled={!form.bank||!form.accountType||!form.account||submitting} onClick={handleSubmit}
            style={{width:"100%",background:(form.bank&&form.accountType&&form.account&&!submitting)?C.impl:C.surfaceHi,color:(form.bank&&form.accountType&&form.account&&!submitting)?pickTextOn(C.impl):C.muted,border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:submitting?"not-allowed":"pointer"}}>
            {submitting?"Registrando…":"Enviar registro"}
          </button>
        </>}
      </div>
    </div>
  );
};

// ─── WORKERS TAB (admin) ──────────────────────────────────────────────────────
// Selector de campaña (panel izquierdo del finder)
const WorkerMapCampaignSelect=({allCampaigns})=>{
  const activeCamps=(allCampaigns||[]).filter(c=>c.status==="activa");
  if(!activeCamps.length)return null;
  return <Inp label="Campaña a asignar" selectOptions={activeCamps.map(c=>`${c.client} — ${c.name}`)} value="" onChange={()=>{}}/>;
};

const WorkerMap=({workers,onSelectWorker,allCampaigns,fullHeight})=>{
  const {MapContainer,TileLayer,CircleMarker,Popup}=require("react-leaflet");
  const activeCamps=(allCampaigns||[]).filter(c=>c.status==="activa");
  const mapped=workers.filter(w=>w.lat&&w.lng);

  const buildWaMsg=(w)=>{
    if(!activeCamps.length) return `Hola ${w.name}, te contactamos desde TGS Field.`;
    const camp=activeCamps[0];
    const vt=VERTICALS[camp.type];
    return `Hola ${w.name}, te contactamos desde TGS Field.\n\nQueremos asignarte a la campaña *${camp.name}* (${vt?.label||camp.type}) del cliente *${camp.client}*.\n📅 ${camp.dateStart} → ${camp.dateEnd}\n\n¿Estás disponible?`;
  };

  return(
    <div style={{height:fullHeight?"100%":260,borderRadius:fullHeight?0:14,overflow:"hidden",border:fullHeight?"none":`1px solid ${C.border}`}}>
      <MapContainer center={[-33.5,-70.8]} zoom={5} style={{height:"100%",width:"100%"}} scrollWheelZoom={true}
        maxBounds={[[-12,-80],[-57,-63]]} maxBoundsViscosity={1.0} minZoom={4} maxZoom={13}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com">CARTO</a>'/>
        {mapped.map(w=>{
          const primaryRole=(w.roles||[])[0]||"implementador";
          const rc=ROLE_META[primaryRole]?.color||C.muted;
          return(
            <CircleMarker key={w.id} center={[w.lat,w.lng]} radius={8} pathOptions={{color:rc,fillColor:rc,fillOpacity:0.85,weight:2}}>
              <Popup>
                <div style={{fontFamily:f.b,minWidth:200,color:C.text}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:6,letterSpacing:-0.2}}>{w.name}</div>
                  <div style={{display:"grid",gap:3,fontSize:12,color:C.muted,fontWeight:500,marginBottom:8}}>
                    <div>{w.comuna||"—"}{w.region?", "+(w.region||"").split("—")[0].trim():""}</div>
                    {w.phone && <div>{w.phone}</div>}
                    {(w.roles||[]).length>0 && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                        {(w.roles||[]).map(r=>{const c=ROLE_META[r]?.color||C.muted;return(
                          <span key={r} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:c+"15",color:c,border:`1px solid ${c}33`}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{ROLE_META[r]?.label}
                          </span>
                        );})}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {w.phone && (
                      <a href={`${waLink(w.phone)}?text=${encodeURIComponent(buildWaMsg(w))}`} target="_blank" rel="noopener noreferrer"
                        style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,background:"#25D366",color:"#fff",fontSize:11,fontWeight:600,textDecoration:"none"}}>
                        <span style={{display:"inline-flex"}}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z"/></svg></span>
                        WhatsApp
                      </a>
                    )}
                    <button onClick={()=>onSelectWorker(w)} style={{padding:"6px 10px",borderRadius:8,background:"transparent",border:`1px solid ${C.border}`,color:C.text,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:f.b}}>
                      Ver perfil
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

const WorkersTab=({workers,setWorkers,allCampaigns})=>{
  const [view,setView]         =useState("list"); // list | detail | finder
  const [selected,setSel]      =useState(null);
  const [filterRole,setRole]   =useState("all");
  const [filterStatus,setSt]   =useState("all");
  const [search,setSearch]     =useState("");
  const [finderRole,setFinderRole]=useState("all");

  const filtered=workers.filter(w=>{
    const roleOk=filterRole==="all"||(w.roles||[]).includes(filterRole);
    const stOk=filterStatus==="all"||w.status===filterStatus;
    const srchOk=!search||((w.name||"").toLowerCase().includes(search.toLowerCase())||(w.rut||"").includes(search)||(w.comuna||"").toLowerCase().includes(search.toLowerCase()));
    return roleOk&&stOk&&srchOk;
  });

  const approveWorker=async(id)=>{ setWorkers(prev=>prev.map(w=>w.id===id?{...w,status:"activo"}:w)); await updateWorker(id,{status:"activo"}); };
  const rejectWorker =async(id)=>{ setWorkers(prev=>prev.map(w=>w.id===id?{...w,status:"rechazado"}:w)); await updateWorker(id,{status:"rechazado"}); };

  // Finder — workers activos filtrados por rol
  const finderWorkers=workers.filter(w=>{
    if(w.status!=="activo")return false;
    return finderRole==="all"||(w.roles||[]).includes(finderRole);
  });

  if(view==="finder") return(
    <div style={{display:"flex",height:"calc(100vh - 130px)",gap:0,margin:"-24px -16px -80px",background:C.bg}}>
      {/* Panel izquierdo: filtros + lista */}
      <div style={{width:340,minWidth:300,flexShrink:0,overflowY:"auto",padding:"20px 16px",borderRight:`1px solid ${C.border}`,background:C.surface}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
          <button onClick={()=>setView("list")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 10px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
          <div>
            <h1 style={{margin:0,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Mapa de workers</h1>
            <p style={{color:C.muted,fontSize:12,margin:"2px 0 0",fontWeight:500}}>{finderWorkers.length} en pantalla</p>
          </div>
        </div>

        <div style={{fontSize:10,fontWeight:700,letterSpacing:0.8,color:C.muted,textTransform:"uppercase",marginBottom:8}}>Filtrar por rol</div>
        <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>
          {[["all","Todos",C.text],...Object.entries(ROLE_META).filter(([r])=>r!=="admin").map(([r,rd])=>[r,rd.label,rd.color])].map(([v,lbl,col])=>{
            const active=finderRole===v;
            return (
              <button key={v} onClick={()=>setFinderRole(v)}
                style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:999,border:`1px solid ${active?col:C.border}`,background:active?col+"15":"transparent",color:active?col:C.muted,fontFamily:f.b,fontWeight:600,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>
                {v!=="all"&&<span style={{width:6,height:6,borderRadius:"50%",background:col}}/>}
                {lbl}
              </button>
            );
          })}
        </div>

        <WorkerMapCampaignSelect allCampaigns={allCampaigns}/>

        <div style={{fontSize:10,fontWeight:700,letterSpacing:0.8,color:C.muted,textTransform:"uppercase",marginBottom:8,marginTop:18}}>Workers en mapa</div>
        <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
          {finderWorkers.length===0 && (
            <div style={{padding:"20px 14px",textAlign:"center",color:C.muted,fontSize:12}}>Sin resultados</div>
          )}
          {finderWorkers.map((w,i)=>{
            const rc=ROLE_META[(w.roles||[])[0]]?.color||C.muted;
            return (
              <div key={w.id} onClick={()=>{setSel(w);setView("detail");}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderTop:i===0?"none":`1px solid ${C.border}`,cursor:"pointer",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:32,height:32,borderRadius:"50%",background:rc,color:pickTextOn(rc),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0,overflow:"hidden"}}>{avatarContent(w.photo,w.name)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.muted,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:2}}>
                    <Icon name="pin" size={11}/>{w.comuna||"—"}
                  </div>
                </div>
                {w.phone && (
                  <a href={waLink(w.phone)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="WhatsApp"
                    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:"50%",background:"#25D36615",border:"1px solid #25D36633",color:"#25D366",flexShrink:0,textDecoration:"none"}}>
                    <Icon name="message" size={14}/>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panel derecho: mapa */}
      <div style={{flex:1,position:"relative",background:C.bg}}>
        <WorkerMap workers={finderWorkers} roleFilter={finderRole} onSelectWorker={(w)=>{setSel(w);setView("detail");}} allCampaigns={allCampaigns} fullHeight/>
      </div>
    </div>
  );

  if(view==="detail"&&selected) {
    const sCol=selected.status==="activo"?C.green:selected.status==="pendiente"?C.orange:C.red;
    const sLab=selected.status==="activo"?"Activo":selected.status==="pendiente"?"Pendiente":"Rechazado";
    const primaryRoleColor=ROLE_META[(selected.roles||[])[0]]?.color||C.muted;
    const ContactRow=({icon,label,value,muted})=>value?(
      <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 0",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:8,background:C.surfaceHi,color:C.muted,flexShrink:0}}><Icon name={icon} size={15}/></div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:2}}>{label}</div>
          <div style={{fontSize:14,fontWeight:600,color:muted?C.muted:C.text,wordBreak:"break-word"}}>{value}</div>
        </div>
      </div>
    ):null;
    return(
      <div style={{paddingBottom:80}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>setView("list")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Perfil del worker</h1>
        </div>

        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"28px 24px",marginBottom:14,textAlign:"center"}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:14}}>
            <div style={{width:80,height:80,borderRadius:"50%",background:primaryRoleColor,color:pickTextOn(primaryRoleColor),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:24,letterSpacing:-1,overflow:"hidden"}}>{avatarContent(selected.photo,selected.name)}</div>
            <span style={{position:"absolute",bottom:2,right:2,width:18,height:18,borderRadius:"50%",background:sCol,border:`3px solid ${C.surface}`}}/>
          </div>
          <h2 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:-0.4}}>{selected.name}</h2>
          <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500}}>RUT {selected.rut}</div>
          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginTop:14}}>
            {selected.roles?.map(r=>ROLE_META[r]?(
              <span key={r} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:ROLE_META[r].color+"15",color:ROLE_META[r].color,border:`1px solid ${ROLE_META[r].color}33`}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:ROLE_META[r].color}}/>{ROLE_META[r].label}
              </span>
            ):null)}
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:sCol+"15",color:sCol,border:`1px solid ${sCol}33`}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:sCol}}/>{sLab}
            </span>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Trabajos</div>
            <div style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:-0.5,lineHeight:1}}>{selected.jobs||0}</div>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Rating</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:-0.5,lineHeight:1}}>{selected.rating||"—"}</span>
              {selected.rating>0&&<Icon name="star" size={16} color={C.impl}/>}
            </div>
          </div>
        </div>

        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"4px 18px",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:0.8,color:C.muted,textTransform:"uppercase",padding:"14px 0 4px"}}>Contacto</div>
          <ContactRow icon="phone" label="Teléfono"  value={selected.phone}/>
          <ContactRow icon="mail"  label="Email"     value={selected.email}/>
          <ContactRow icon="pin"   label="Ubicación" value={`${selected.comuna||""}${selected.region?", "+selected.region:""}`}/>
          <ContactRow icon="home"  label="Dirección" value={selected.address}/>
          <ContactRow icon="users" label="Detalle"   value={selected.addressDetail} muted/>
          {selected.phone && (
            <div style={{padding:"12px 0 14px",borderTop:`1px solid ${C.border}`}}>
              <a href={waLink(selected.phone)} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:10,background:"#25D366",color:"#fff",fontSize:13,fontWeight:600,textDecoration:"none"}}>
                <Icon name="message" size={15}/>Enviar WhatsApp
              </a>
            </div>
          )}
        </div>

        {(selected.bank||selected.account) && (
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:0.8,color:C.muted,textTransform:"uppercase",marginBottom:10}}>Datos bancarios</div>
            <div style={{display:"grid",gap:6,fontSize:13}}>
              {selected.bank&&<div><span style={{color:C.muted,fontWeight:500}}>Banco · </span><span style={{color:C.text,fontWeight:600}}>{selected.bank}</span></div>}
              {selected.accountType&&<div><span style={{color:C.muted,fontWeight:500}}>Tipo · </span><span style={{color:C.text,fontWeight:600}}>{selected.accountType}</span></div>}
              {selected.account&&<div><span style={{color:C.muted,fontWeight:500}}>N° cuenta · </span><span style={{color:C.text,fontWeight:600}}>{selected.account}</span></div>}
            </div>
          </div>
        )}

        {selected.status==="pendiente" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:8}}>
            <button onClick={()=>{rejectWorker(selected.id);setView("list");}}
              style={{background:"transparent",border:`1px solid ${C.red}55`,color:C.red,borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:"pointer"}}>Rechazar</button>
            <button onClick={()=>{approveWorker(selected.id);setView("list");}}
              style={{background:C.green,color:"#fff",border:"none",borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:"pointer"}}>Aprobar</button>
          </div>
        )}
        {selected.status==="activo" && (
          <button onClick={()=>{if(window.confirm("¿Desactivar la cuenta de este worker?")) rejectWorker(selected.id);setView("list");}}
            style={{background:"transparent",border:"none",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:f.b,padding:"12px",width:"100%",marginTop:8}}>
            Desactivar cuenta
          </button>
        )}
      </div>
    );
  }

  // LIST VIEW
  const pendingWorkers=workers.filter(w=>w.status==="pendiente");
  const sColor=(st)=>st==="activo"?C.green:st==="pendiente"?C.orange:C.red;
  const sLabel=(st)=>st==="activo"?"Activo":st==="pendiente"?"Pendiente":"Rechazado";
  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Workers</h1>
          <p style={{color:C.muted,fontSize:13,margin:"2px 0 0"}}>{workers.filter(w=>w.status==="activo").length} activos · {workers.length} en total</p>
        </div>
        <button onClick={()=>setView("finder")}
          style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontFamily:f.b,fontWeight:600,fontSize:13,cursor:"pointer",transition:"border-color .15s, background .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=C.impl;e.currentTarget.style.background=C.implDim;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}>
          <Icon name="map" size={16}/>Ver en mapa
        </button>
      </div>

      {pendingWorkers.length>0 && (
        <div onClick={()=>setSt("pendiente")}
          style={{background:C.orange+"10",border:`1px solid ${C.orange}33`,borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:C.orange,flexShrink:0}}/>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{pendingWorkers.length} registro{pendingWorkers.length!==1?"s":""} pendiente{pendingWorkers.length!==1?"s":""} de aprobación</span>
          </div>
          <span style={{color:C.orange,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>Ver →</span>
        </div>
      )}

      <div style={{position:"relative",marginBottom:14}}>
        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:C.muted,pointerEvents:"none",display:"inline-flex"}}><Icon name="search" size={16}/></span>
        <input placeholder="Buscar por nombre, RUT o comuna" value={search} onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px 10px 38px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",boxSizing:"border-box"}}
          onFocus={e=>{e.target.style.borderColor=C.impl;e.target.style.boxShadow=`0 0 0 3px ${C.impl}22`;}}
          onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:8,overflowX:"auto",paddingBottom:2}}>
        {[["all","Todos"],["activo","Activos"],["pendiente","Pendientes"],["rechazado","Rechazados"]].map(([v,lbl])=>{
          const active=filterStatus===v;
          const col=v==="all"?C.text:sColor(v);
          return (
            <button key={v} onClick={()=>setSt(v)}
              style={{padding:"6px 12px",borderRadius:999,border:`1px solid ${active?col:C.border}`,background:active?col+"15":"transparent",color:active?col:C.muted,fontFamily:f.b,fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              {lbl}
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:18,overflowX:"auto",paddingBottom:2}}>
        {[["all","Todos los roles",C.text],...Object.entries(ROLE_META).map(([r,rd])=>[r,rd.label,rd.color])].map(([v,lbl,col])=>{
          const active=filterRole===v;
          return (
            <button key={v} onClick={()=>setRole(v)}
              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:999,border:`1px solid ${active?col:C.border}`,background:active?col+"15":"transparent",color:active?col:C.muted,fontFamily:f.b,fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              {v!=="all"&&<span style={{width:6,height:6,borderRadius:"50%",background:col}}/>}
              {lbl}
            </button>
          );
        })}
      </div>

      {filtered.length===0 ? (
        <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Sin resultados.</div>
      ) : (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
          {filtered.map((w,i)=>{
            const primaryRole=(w.roles||[])[0];
            const roleColor=ROLE_META[primaryRole]?.color||C.muted;
            return (
              <div key={w.id} onClick={()=>{setSel(w);setView("detail");}}
                style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderTop:i===0?"none":`1px solid ${C.border}`,cursor:"pointer",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.surfaceAlt||C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:roleColor,color:pickTextOn(roleColor),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,overflow:"hidden"}}>{avatarContent(w.photo,w.name)}</div>
                  <span style={{position:"absolute",bottom:-1,right:-1,width:11,height:11,borderRadius:"50%",background:sColor(w.status),border:`2px solid ${C.surface}`}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3,fontSize:11,color:C.muted,fontWeight:500,flexWrap:"wrap"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Icon name="pin" size={11}/>{w.comuna||"—"}</span>
                    <span>·</span>
                    <span>{w.rut}</span>
                  </div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6,alignItems:"center"}}>
                    {w.roles?.map(r=>{const rc=ROLE_META[r]?.color||C.muted;return (
                      <span key={r} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:rc+"15",color:rc,border:`1px solid ${rc}33`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:rc}}/>{ROLE_META[r]?.label}
                      </span>
                    );})}
                    {w.rating>0 && (
                      <span style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:11,color:C.muted,fontWeight:600}}>
                        <Icon name="star" size={11} color={C.impl}/>{w.rating}
                      </span>
                    )}
                  </div>
                </div>
                {w.phone && (
                  <a href={waLink(w.phone)} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="WhatsApp"
                    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:34,height:34,borderRadius:"50%",background:"#25D36615",border:"1px solid #25D36633",color:"#25D366",flexShrink:0,textDecoration:"none"}}>
                    <Icon name="message" size={16}/>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
const ClientForm=({initial,onSave,onCancel})=>{
  const [name,setName]=useState(initial?.name||"");
  const [logoUrl,setLogoUrl]=useState(initial?.logo_url||"");
  const [contactName,setContactName]=useState(initial?.contact_name||"");
  const [contactEmail,setContactEmail]=useState(initial?.contact_email||"");
  const [contactPhone,setContactPhone]=useState(initial?.contact_phone||"");
  const [notes,setNotes]=useState(initial?.notes||"");
  const [uploading,setUploading]=useState(false);
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);
  const fileRef=useRef(null);

  const handleLogo=async(e)=>{
    const file=e.target.files?.[0];
    if(!file) return;
    if(!name.trim()){setErr("Escribe el nombre del cliente antes de subir el logo");return;}
    setErr("");setUploading(true);
    try{ const url=await uploadClientLogo(file,name.trim()); setLogoUrl(url); }
    catch(ex){ setErr("No se pudo subir el logo: "+(ex.message||ex)); }
    setUploading(false);
  };

  const submit=async()=>{
    if(!name.trim()){setErr("El nombre es obligatorio");return;}
    setErr("");setSaving(true);
    const payload={name:name.trim(),logo_url:logoUrl||null,contact_name:contactName||null,contact_email:contactEmail||null,contact_phone:contactPhone||null,notes:notes||null};
    try{
      if(initial?.id){
        await updateClient(initial.id,payload);
        onSave({...initial,...payload});
      } else {
        const {data,error}=await insertClient(payload);
        if(error) throw error;
        onSave(data);
      }
    }catch(ex){ setErr(ex.message||"Error al guardar"); }
    setSaving(false);
  };

  return(
    <div onClick={onCancel} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:14,padding:"24px 22px",width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.text,letterSpacing:-0.3}}>{initial?"Editar cliente":"Nuevo cliente"}</h2>
          <button onClick={onCancel} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4}}><Icon name="x" size={18}/></button>
        </div>

        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
          <div onClick={()=>fileRef.current?.click()}
            style={{width:72,height:72,borderRadius:14,border:`1.5px dashed ${C.border}`,background:logoUrl?"transparent":C.surfaceHi,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",flexShrink:0}}>
            {logoUrl ? <img src={logoUrl} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              : <Icon name="plus" size={20} color={C.muted}/>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:4}}>Logo del cliente</div>
            <div style={{fontSize:11,color:C.muted,fontWeight:500}}>{uploading?"Subiendo…":logoUrl?"Click en la imagen para reemplazar":"Click en el cuadro para subir"}</div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo}/>
          </div>
        </div>

        <Inp label="Nombre del cliente *" placeholder="ej: Coca-Cola" value={name} onChange={e=>setName(e.target.value)}/>
        <Inp label="Nombre de contacto" placeholder="ej: Juan Pérez" value={contactName} onChange={e=>setContactName(e.target.value)}/>
        <Inp label="Email de contacto" type="email" placeholder="juan@cocacola.cl" value={contactEmail} onChange={e=>setContactEmail(e.target.value)}/>
        <Inp label="Teléfono de contacto" placeholder="+56 9 XXXX XXXX" value={contactPhone} onChange={e=>setContactPhone(e.target.value)}/>
        <Inp label="Notas" textarea placeholder="Observaciones, condiciones comerciales, etc." value={notes} onChange={e=>setNotes(e.target.value)}/>

        {err && <div style={{padding:"10px 12px",background:C.red+"15",border:`1px solid ${C.red}33`,borderRadius:10,color:C.red,fontSize:13,fontWeight:500,marginBottom:14}}>{err}</div>}

        <div style={{display:"flex",gap:10,marginTop:6}}>
          <button onClick={onCancel} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"12px 18px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancelar</button>
          <button onClick={submit} disabled={saving||!name.trim()}
            style={{flex:1,background:saving||!name.trim()?C.surfaceHi:C.impl,color:saving||!name.trim()?C.muted:pickTextOn(C.impl),border:"none",borderRadius:10,padding:"12px 18px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:saving||!name.trim()?"default":"pointer"}}>
            {saving?"Guardando…":(initial?"Guardar cambios":"Crear cliente")}
          </button>
        </div>
      </div>
    </div>
  );
};

const ClientDetail=({client,allCampaigns,reports,onBack,onEdit,onDelete})=>{
  const camps=allCampaigns.filter(c=>c.client_id===client.id||c.client===client.name);
  const active=camps.filter(c=>c.status==="activa").length;
  const done=camps.filter(c=>c.status==="completada").length;
  const allReports=reports.filter(r=>camps.some(c=>c.id===r.campaignId));
  const pendingReports=allReports.filter(r=>r.status==="pending").length;
  const approvedReports=allReports.filter(r=>r.status==="approved").length;
  const totalSalas=camps.reduce((s,c)=>s+((c.salas||[]).length),0);
  const byType={impl:0,promo:0,mec:0};
  camps.forEach(c=>{ byType[c.type]=(byType[c.type]||0)+1; });
  const maxType=Math.max(byType.impl,byType.promo,byType.mec,1);

  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 10px",cursor:"pointer",color:C.text,display:"inline-flex",alignItems:"center",gap:6,fontFamily:f.b,fontSize:12,fontWeight:600}}>
          <Icon name="arrow" size={14}/> Volver
        </button>
        <button onClick={onEdit} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:"6px 10px",cursor:"pointer",color:C.text,fontFamily:f.b,fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6}}>
          <Icon name="edit" size={14}/> Editar
        </button>
        <button onClick={()=>{if(window.confirm(`¿Eliminar el cliente "${client.name}"? Las campañas no se borran, solo quedan sin cliente vinculado.`)) onDelete(client.id);}}
          style={{background:"transparent",border:"none",color:C.red,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer",marginLeft:"auto"}}>
          Eliminar
        </button>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"22px 24px",marginBottom:18,display:"flex",alignItems:"center",gap:18}}>
        <div style={{width:88,height:88,borderRadius:14,background:client.logo_url?"transparent":C.surfaceHi,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
          {client.logo_url ? <img src={client.logo_url} alt={client.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
            : <span style={{fontSize:28,fontWeight:800,color:C.muted}}>{(client.name||"?").slice(0,2).toUpperCase()}</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.text,letterSpacing:-0.4}}>{client.name}</h1>
          {(client.contact_name||client.contact_email||client.contact_phone) && (
            <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:8,fontSize:12,color:C.muted,fontWeight:500}}>
              {client.contact_name && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="users" size={12}/>{client.contact_name}</span>}
              {client.contact_email && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="mail" size={12}/>{client.contact_email}</span>}
              {client.contact_phone && <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Icon name="phone" size={12}/>{client.contact_phone}</span>}
            </div>
          )}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
        {[{label:"Campañas",value:camps.length,color:C.impl},{label:"Activas",value:active,color:C.green},{label:"Completadas",value:done,color:C.muted},{label:"Salas totales",value:totalSalas,color:C.text},{label:"Reportes aprobados",value:approvedReports,color:C.green},{label:"Reportes pendientes",value:pendingReports,color:C.orange}].map((kpi,i)=>(
          <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>{kpi.label}</div>
            <div style={{fontSize:24,fontWeight:700,color:kpi.color,letterSpacing:-0.5,lineHeight:1}}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {camps.length>0 && (
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:18}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12,letterSpacing:-0.2}}>Distribución por tipo</div>
          {Object.entries({impl:"Implementación",promo:"Promotores",mec:"Mecanización"}).map(([k,label])=>{
            const vt=VERTICALS[k];
            const v=byType[k]||0;
            return(
              <div key={k} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,fontSize:12,fontWeight:600,color:C.text}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:vt.color}}/>{label}</span>
                  <span style={{color:C.muted,fontWeight:500}}>{v}</span>
                </div>
                <div style={{height:6,background:C.surfaceHi,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(v/maxType)*100}%`,background:vt.color,transition:"width .3s"}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{marginBottom:10,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
        <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text}}>Campañas del cliente</h2>
        <span style={{fontSize:11,color:C.muted,fontWeight:600}}>{camps.length} en total</span>
      </div>
      {camps.length===0 ? (
        <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Este cliente aún no tiene campañas.</div>
      ) : (
        <div style={{display:"grid",gap:8}}>
          {camps.map(c=>{
            const cvt=VERTICALS[c.type]||VERTICALS.impl;
            return(
              <div key={c.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",position:"relative"}}>
                <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:cvt.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{c.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500}}>{cvt.label} · {c.status||"—"} · {c.dateStart||"—"} → {c.dateEnd||"—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ClientsTab=({clients,setClients,allCampaigns,reports})=>{
  const [view,setView]=useState("list");
  const [selected,setSel]=useState(null);
  const [editing,setEditing]=useState(null);

  const handleSaved=(c)=>{
    setClients(prev=>{
      const idx=prev.findIndex(x=>x.id===c.id);
      return idx>=0?prev.map(x=>x.id===c.id?c:x):[...prev,c];
    });
    setEditing(null);
    if(view==="detail") setSel(c);
  };
  const handleDelete=async(id)=>{
    await deleteClient(id);
    setClients(prev=>prev.filter(x=>x.id!==id));
    setView("list");setSel(null);
  };

  if(view==="detail"&&selected){
    return(
      <>
        <ClientDetail client={selected} allCampaigns={allCampaigns} reports={reports}
          onBack={()=>{setView("list");setSel(null);}}
          onEdit={()=>setEditing(selected)}
          onDelete={handleDelete}/>
        {editing && <ClientForm initial={editing} onSave={handleSaved} onCancel={()=>setEditing(null)}/>}
      </>
    );
  }

  return(
    <div style={{paddingBottom:80}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,gap:10}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Clientes</h1>
          <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Gestioná tus clientes y mirá el resumen de sus campañas</p>
        </div>
        <button onClick={()=>setEditing({})}
          style={{background:C.impl,color:pickTextOn(C.impl),border:"none",borderRadius:10,padding:"10px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
          <Icon name="plus" size={14}/> Nuevo cliente
        </button>
      </div>

      {clients.length===0 ? (
        <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"56px 24px",textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Aún no hay clientes</div>
          <p style={{margin:0,color:C.muted,fontSize:13}}>Creá tu primer cliente para empezar a asignarle campañas y ver sus métricas.</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {clients.map(c=>{
            const camps=allCampaigns.filter(x=>x.client_id===c.id||x.client===c.name);
            const active=camps.filter(x=>x.status==="activa").length;
            return(
              <div key={c.id} onClick={()=>{setSel(c);setView("detail");}}
                style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 18px 16px",cursor:"pointer",transition:"border-color .15s, box-shadow .15s",display:"flex",flexDirection:"column",gap:14}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.impl;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:48,height:48,borderRadius:10,background:c.logo_url?"transparent":C.surfaceHi,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                    {c.logo_url ? <img src={c.logo_url} alt={c.name} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                      : <span style={{fontSize:16,fontWeight:800,color:C.muted}}>{(c.name||"?").slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div style={{minWidth:0,flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                    {c.contact_name && <div style={{fontSize:11,color:C.muted,marginTop:2,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.contact_name}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:C.surfaceHi,color:C.text,border:`1px solid ${C.border}`}}>{camps.length} campaña{camps.length!==1?"s":""}</span>
                  {active>0 && <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:C.green+"15",color:C.green,border:`1px solid ${C.green}33`}}><span style={{width:5,height:5,borderRadius:"50%",background:C.green}}/>{active} activa{active!==1?"s":""}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <ClientForm initial={editing.id?editing:null} onSave={handleSaved} onCancel={()=>setEditing(null)}/>}
    </div>
  );
};

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
const AdminApp=({user,onLogout,onChangeRole})=>{
  const [tab,setTab]         =useState("dash");
  const [vertical,setVert]   =useState("impl");
  const [implCamps,setImpl]  =useState(INIT_IMPL);
  const [promoCamps,setPromo]=useState(INIT_PROMO);
  const [mecCamps,setMec]    =useState(INIT_MEC);
  const [reports,setReports] =useState(INIT_REPORTS);
  const [workers,setWorkers] =useState(INIT_WORKERS);
  const [clients,setClients] =useState([]);
  const [view,setView]       =useState("list");
  const [selected,setSel]    =useState(null);
  const [newType,setNewType] =useState(null);
  const [reportCamp,setReportCamp]=useState(null);
  const [approvalStatus,setApprovalStatus]=useState("pending");
  const [campaignStatusFilter,setCampaignStatusFilter]=useState(null);

  const goToTab=(t,opts={})=>{
    setView("list");setSel(null);setNewType(null);
    if(opts.approvalStatus) setApprovalStatus(opts.approvalStatus);
    if(opts.campaignStatusFilter!==undefined) setCampaignStatusFilter(opts.campaignStatusFilter);
    setTab(t);
  };

  useEffect(()=>{
    const load=async()=>{
      const [i,p,m,r,w,cl]=await Promise.all([
        getCampaigns('impl'),getCampaigns('promo'),getCampaigns('mec'),
        getReports(),getWorkers(),getClients()
      ]);
      if(i.data&&i.data.length) setImpl(i.data.map(fromDbCampaign));
      if(p.data&&p.data.length) setPromo(p.data.map(fromDbCampaign));
      if(m.data&&m.data.length) setMec(m.data.map(fromDbCampaign));
      if(r.data&&r.data.length) setReports(r.data.map(fromDbReport));
      if(w.data&&w.data.length) setWorkers(w.data.map(normalizeWorker));
      if(cl.data) setClients(cl.data);
    };
    load();
  },[]);

  const vt=VERTICALS[vertical];
  const campaigns=vertical==="impl"?implCamps:vertical==="promo"?promoCamps:mecCamps;
  const setCamps=vertical==="impl"?setImpl:vertical==="promo"?setPromo:setMec;
  const allCampaigns=[...implCamps,...promoCamps,...mecCamps];
  const pendingCount=reports.filter(r=>r.status==="pending").length;
  const pendingWorkerCount=workers.filter(w=>w.status==="pendiente").length;

  const saveCampaign=async(c)=>{
    const setTarget=c.type==="impl"?setImpl:c.type==="promo"?setPromo:setMec;
    const exists=implCamps.concat(promoCamps,mecCamps).find(x=>x.id===c.id&&x._saved);
    if(exists){
      await updateCampaign(c.id,c);
    } else {
      if(!c.client) c.client="TGS";
      const {data,error}=await insertCampaign(c);
      if(error){ alert("Error guardando campaña: "+(error.message||JSON.stringify(error))); return; }
      if(data) c={...c,...fromDbCampaign(data)};
    }
    setTarget(prev=>{const idx=prev.findIndex(x=>x.id===c.id);return idx>=0?prev.map(x=>x.id===c.id?c:x):[...prev,c];});
    setView("list");setSel(null);setNewType(null);
  };
  const deleteCampaign=(id)=>{ setCamps(prev=>prev.filter(x=>x.id!==id)); setView("list");setSel(null); };

  // Client report
  if(reportCamp) return <ClientReport campaign={reportCamp} reports={reports} workers={workers} onClose={()=>setReportCamp(null)}/>;

  // Campaign form screens
  if((view==="new"&&newType)||(view==="edit"&&selected))
    return <CampaignForm type={newType||selected.type} initial={view==="edit"?selected:null} onSave={saveCampaign} onCancel={()=>{setView("list");setNewType(null);}} workers={workers} clients={clients} onClientCreated={(c)=>setClients(prev=>[...prev,c])}/>;

  const NavBtn=({id,icon,label,badge})=>{
    const active=tab===id;
    return (
      <button onClick={()=>{setTab(id);setView("list");}}
        style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"8px 4px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:active?C.text:C.muted,transition:"color .15s",fontFamily:f.b,position:"relative"}}>
        <div style={{position:"relative",width:36,height:28,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:active?C.impl:"transparent",transition:"background .15s"}}>
          <Icon name={icon} size={18} stroke={2} color={active?C.onPrimary:"currentColor"}/>
          {badge>0 && (
            <span style={{position:"absolute",top:-4,right:-6,background:C.red,color:"#fff",borderRadius:999,fontSize:9,fontWeight:700,padding:"1px 5px",minWidth:16,textAlign:"center",border:`2px solid ${C.surface}`,lineHeight:1}}>{badge}</span>
          )}
        </div>
        <span style={{fontSize:10,fontWeight:active?700:500,letterSpacing:0.2}}>{label}</span>
      </button>
    );
  };

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,display:"flex",flexDirection:"column"}}>
      <TopBar title={user.role==="supervisor"?"TGS Field — Supervisor":"TGS Field — Admin"} sub={`Hola, ${user.name}`} onLogout={onLogout}/>
      <RoleSwitchBanner user={user} onChangeRole={onChangeRole}/>

      {/* Vertical switcher */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",gap:6}}>
        {Object.entries(VERTICALS).map(([v,vd])=>{
          const active=vertical===v;
          return (
            <button key={v} onClick={()=>{setVert(v);setView("list");}}
              style={{flex:1,padding:"10px 8px",borderRadius:10,border:`1px solid ${active?vd.color:C.border}`,background:active?vd.dim:"transparent",color:active?C.text:C.muted,fontFamily:f.b,fontWeight:600,fontSize:12,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .15s"}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:vd.color,flexShrink:0}}/>
              {vd.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"24px 16px 80px",maxWidth:1280,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>

        {/* DASHBOARD */}
        {tab==="dash"&&<>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1.2,color:C.muted,textTransform:"uppercase",marginBottom:6}}>{new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}</div>
            <h1 style={{margin:0,fontSize:28,fontWeight:800,color:C.text,letterSpacing:-0.5}}>Hola, {user.name?.split(" ")[0]||"Admin"}</h1>
            <p style={{color:C.muted,fontSize:14,margin:"4px 0 0"}}>{vt.label} · resumen de hoy</p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:32}}>
            {[
              {lbl:"Campañas activas",val:campaigns.filter(c=>c.status==="activa").length,color:vt.color,emphasis:true,onClick:()=>goToTab("campaigns",{campaignStatusFilter:"activa"})},
              {lbl:"Reportes hoy",    val:reports.filter(r=>r.type===vertical).length,color:C.text,onClick:()=>goToTab("approvals",{approvalStatus:"all"})},
              {lbl:"Pendientes",      val:reports.filter(r=>r.type===vertical&&r.status==="pending").length,color:C.orange,onClick:()=>goToTab("approvals",{approvalStatus:"pending"})},
              {lbl:"Aprobados",       val:reports.filter(r=>r.type===vertical&&r.status==="approved").length,color:C.green,onClick:()=>goToTab("approvals",{approvalStatus:"approved"})},
            ].map(({lbl,val,color,emphasis,onClick})=>(
              <button key={lbl} onClick={onClick}
                style={{textAlign:"left",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden",cursor:"pointer",fontFamily:f.b,transition:"border-color .15s, box-shadow .15s, transform .1s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}
                onMouseDown={e=>{e.currentTarget.style.transform="translateY(1px)";}}
                onMouseUp={e=>{e.currentTarget.style.transform="translateY(0)";}}>
                {emphasis && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:color}}/>}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>{lbl}</span>
                  <Icon name="arrow" size={12} color={C.muted}/>
                </div>
                <div style={{fontSize:30,fontWeight:700,color:emphasis?C.text:color,lineHeight:1,letterSpacing:-1}}>{val}</div>
              </button>
            ))}
          </div>

          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Campañas activas</h2>
            <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{campaigns.filter(c=>c.status==="activa").length} en curso</span>
          </div>

          <div style={{display:"grid",gap:8}}>
            {campaigns.filter(c=>c.status==="activa").length===0 && (
              <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"32px 20px",textAlign:"center",color:C.muted,fontSize:13}}>Sin campañas activas en este vertical.</div>
            )}
            {campaigns.filter(c=>c.status==="activa").map(c=>{
              const total=c.stores||c.points||c.totalUnits||1; const p=pct(c.done,total);
              const clickable=user.role==="admin";
              const done=p===100;
              return(
                <div key={c.id}
                  onClick={clickable?()=>{setSel(c);setTab("campaigns");setView("detail");}:undefined}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:clickable?"pointer":"default",display:"grid",gridTemplateColumns:"1fr auto",gap:14,alignItems:"center",transition:"border-color .15s, box-shadow .15s"}}
                  onMouseEnter={e=>{if(clickable){e.currentTarget.style.borderColor=vt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase"}}>{c.client}</span>
                      {c.payMode&&user.role==="admin"&&(
                        <span style={{fontSize:10,color:C.muted,fontWeight:500}}>· {c.payMode} · {fmt$(c.payAmount)}</span>
                      )}
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:10,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:1,height:6,background:C.surfaceHi,borderRadius:999,overflow:"hidden"}}>
                        <div style={{width:`${p}%`,height:"100%",background:done?C.green:vt.color,borderRadius:999,transition:"width .6s"}}/>
                      </div>
                      <div style={{fontSize:12,fontWeight:700,color:done?C.green:C.text,minWidth:38,textAlign:"right"}}>{p}%</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right",fontSize:11,color:C.muted,fontWeight:500,whiteSpace:"nowrap"}}>
                    <div style={{color:C.text,fontSize:14,fontWeight:700}}>{c.done||0}<span style={{color:C.muted,fontWeight:500}}>/{total}</span></div>
                    <div style={{marginTop:2,letterSpacing:0.4,textTransform:"uppercase",fontSize:10,fontWeight:600}}>{c.stores?"salas":c.points?"puntos":"unidades"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* SELECTOR DE TIPO DE CAMPAÑA */}
        {tab==="campaigns"&&view==="pickType"&&<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
            <button onClick={()=>setView("list")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
            <div>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Nueva campaña</h1>
              <p style={{color:C.muted,fontSize:13,margin:"2px 0 0"}}>Elegí el tipo de campaña a crear</p>
            </div>
          </div>
          <div style={{display:"grid",gap:10}}>
            {Object.entries(VERTICALS).map(([v,vd])=>{
              const count=(v==="impl"?implCamps:v==="promo"?promoCamps:mecCamps).filter(c=>c.status==="activa").length;
              return(
                <div key={v} onClick={()=>{setNewType(v);setView("new");}}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=vd.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:vd.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:vd.color}}/>
                        <span style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:vd.color,textTransform:"uppercase"}}>{vd.label}</span>
                      </div>
                      <p style={{margin:0,color:C.muted,fontSize:13,lineHeight:1.5}}>{vd.desc}</p>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      {count>0 && <div style={{fontSize:11,color:C.muted,fontWeight:500,marginBottom:6}}>{count} activa{count!==1?"s":""}</div>}
                      <span style={{color:vd.color,fontWeight:700,fontSize:13}}>Crear →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>}

        {/* CAMPAÑAS */}
        {tab==="campaigns"&&view==="list"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24,gap:12,flexWrap:"wrap"}}>
            <div>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Campañas</h1>
              <p style={{color:C.muted,fontSize:13,margin:"2px 0 0"}}>{campaigns.length} en total · {vt.label}</p>
            </div>
            <Btn accent={vt.color} small onClick={()=>setView("pickType")}>+ Nueva campaña</Btn>
          </div>
          {["activa","pausada","completada"].map(status=>{
            const group=campaigns.filter(c=>c.status===status);
            if(!group.length)return null;
            const sc={activa:C.green,pausada:C.orange,completada:C.muted}[status];
            const sLabel={activa:"Activas",pausada:"Pausadas",completada:"Completadas"}[status];
            return(
              <div key={status} style={{marginBottom:28}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:sc}}/>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:0.8,color:C.text,textTransform:"uppercase"}}>{sLabel}</span>
                  <span style={{fontSize:11,color:C.muted,fontWeight:500}}>· {group.length}</span>
                </div>
                <div style={{display:"grid",gap:8}}>
                  {group.map(c=>{
                    const total=c.stores||c.points||c.totalUnits||1; const p=pct(c.done,total);
                    const done=p===100;
                    return(
                      <div key={c.id} onClick={()=>{setSel(c);setView("detail");}}
                        style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"border-color .15s, box-shadow .15s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=vt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:10}}>
                          <div style={{minWidth:0,flex:1}}>
                            <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
                            <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                            {c.payMode && <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500}}>{c.payMode} · {fmt$(c.payAmount)}</div>}
                          </div>
                          <div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontSize:14,fontWeight:700,color:done?C.green:C.text}}>{p}%</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:500,marginTop:2}}>{c.done||0}/{total}</div>
                          </div>
                        </div>
                        <div style={{height:5,background:C.surfaceHi,borderRadius:999,overflow:"hidden",marginBottom:10}}>
                          <div style={{width:`${p}%`,height:"100%",background:done?C.green:vt.color,borderRadius:999,transition:"width .6s"}}/>
                        </div>
                        <div style={{fontSize:11,color:C.muted,fontWeight:500,display:"flex",gap:10,flexWrap:"wrap"}}>
                          <span>{(c.team||[]).join(", ")||"Sin equipo"}</span>
                          <span>·</span>
                          <span>{c.dateStart} → {c.dateEnd}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {campaigns.length===0&&(
            <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"56px 24px",textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Aún no hay campañas en {vt.label}</div>
              <p style={{margin:"0 0 16px",color:C.muted,fontSize:13}}>Empezá creando la primera campaña.</p>
              <Btn accent={vt.color} onClick={()=>setView("pickType")}>+ Crear campaña</Btn>
            </div>
          )}
        </>}

        {tab==="campaigns"&&view==="detail"&&selected&&(()=>{
          const c=selected; const cvt=VERTICALS[c.type];
          const total=c.stores||c.points||c.totalUnits||1; const p=pct(c.done,total);
          const done=p===100;
          const campReports=reports.filter(r=>r.campaignId===c.id);
          const sStatus={activa:{c:C.green,l:"Activa"},pausada:{c:C.orange,l:"Pausada"},completada:{c:C.muted,l:"Completada"}}[c.status]||{c:C.muted,l:c.status};
          const initials=(name)=>(name||"").split(" ").map(n=>n[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
          const unitLabel=c.stores?"salas":c.points?"puntos":"unidades";
          return(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
                <button onClick={()=>setView("list")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"6px 12px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>←</button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
                  <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</h1>
                </div>
                <button onClick={()=>setView("edit")} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"7px 14px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:f.b}}>Editar</button>
              </div>

              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 12px",borderRadius:999,fontSize:12,fontWeight:600,background:cvt.dim,color:cvt.color,border:`1px solid ${cvt.color}33`}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:cvt.color}}/>{cvt.label}
                </span>
                <span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"5px 12px",borderRadius:999,fontSize:12,fontWeight:600,background:sStatus.c+"15",color:sStatus.c,border:`1px solid ${sStatus.c}33`}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:sStatus.c}}/>{sStatus.l}
                </span>
              </div>

              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 22px",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14,gap:10}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:4}}>Progreso</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{fontSize:32,fontWeight:700,color:done?C.green:C.text,letterSpacing:-1,lineHeight:1}}>{p}%</span>
                      <span style={{fontSize:13,color:C.muted,fontWeight:500}}>{c.done||0} de {total} {unitLabel}</span>
                    </div>
                  </div>
                </div>
                <div style={{height:8,background:C.surfaceHi,borderRadius:999,overflow:"hidden"}}>
                  <div style={{width:`${p}%`,height:"100%",background:done?C.green:cvt.color,borderRadius:999,transition:"width .6s"}}/>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:24}}>
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Inicio</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.dateStart||"—"}</div>
                </div>
                <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Cierre</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{c.dateEnd||"—"}</div>
                </div>
                {c.payMode && (
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>Tarifa</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text}}>{fmt$(c.payAmount)}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2,fontWeight:500}}>{c.payMode}</div>
                  </div>
                )}
              </div>

              <div style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
                  <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Equipo</h2>
                  <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{(c.team||[]).length} {(c.team||[]).length===1?"persona":"personas"}</span>
                </div>
                {(c.team||[]).length===0 ? (
                  <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"20px 16px",textAlign:"center",color:C.muted,fontSize:13}}>Sin equipo asignado</div>
                ) : (
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {(c.team||[]).map(n=>(
                      <div key={n} style={{display:"inline-flex",alignItems:"center",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:999,padding:"5px 12px 5px 5px"}}>
                        <div style={{width:26,height:26,borderRadius:"50%",background:cvt.color,color:pickTextOn(cvt.color),display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{initials(n)}</div>
                        <span style={{fontSize:13,fontWeight:600,color:C.text}}>{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{marginBottom:24}}>
                <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
                  <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Reportes recientes</h2>
                  <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{campReports.length} en total</span>
                </div>
                {campReports.length===0 ? (
                  <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"20px 16px",textAlign:"center",color:C.muted,fontSize:13}}>Aún no hay reportes</div>
                ) : (
                  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                    {campReports.slice(0,4).map((r,i)=>{
                      const rs=REPORT_STATUS[r.status];
                      return(
                        <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:i===0?"none":`1px solid ${C.border}`,gap:10}}>
                          <div style={{minWidth:0,flex:1}}>
                            <div style={{fontSize:13,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.store||r.point||r.location}</div>
                            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{r.user}</div>
                          </div>
                          <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:rs.color+"15",color:rs.color,border:`1px solid ${rs.color}33`,flexShrink:0}}>
                            <span style={{width:5,height:5,borderRadius:"50%",background:rs.color}}/>{rs.label}
                          </span>
                        </div>
                      );
                    })}
                    {campReports.length>4 && (
                      <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted,fontWeight:500,textAlign:"center"}}>+ {campReports.length-4} más</div>
                    )}
                  </div>
                )}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={()=>setReportCamp(c)}
                  style={{width:"100%",background:C.impl,color:pickTextOn(C.impl),border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#E59E0F"}
                  onMouseLeave={e=>e.currentTarget.style.background=C.impl}>
                  Generar reporte para cliente
                </button>
                <button onClick={()=>{if(window.confirm(`¿Eliminar la campaña "${c.name}"? Esta acción no se puede deshacer.`)) deleteCampaign(c.id);}}
                  style={{background:"transparent",border:"none",color:C.red,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:f.b,padding:"8px",alignSelf:"center"}}>
                  Eliminar campaña
                </button>
              </div>
            </div>
          );
        })()}

        {/* APROBACIONES */}
        {tab==="approvals"&&<ApprovalTab reports={reports} setReports={setReports} allCampaigns={allCampaigns} vertical={vertical} user={user} filterStatus={approvalStatus} setFilterStatus={setApprovalStatus}/>}

        {/* REPORTES CLIENTE */}
        {tab==="reports"&&<>
          <div style={{marginBottom:24}}>
            <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Reportes para cliente</h1>
            <p style={{color:C.muted,fontSize:13,margin:"4px 0 0"}}>Generá presentaciones PPT a partir de las campañas con reportes aprobados</p>
          </div>
          {allCampaigns.filter(c=>reports.some(r=>r.campaignId===c.id)).length===0 ? (
            <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"56px 24px",textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>Aún no hay campañas con reportes</div>
              <p style={{margin:0,color:C.muted,fontSize:13}}>Cuando los promotores empiecen a subir reportes y se aprueben, vas a poder generar presentaciones para los clientes.</p>
            </div>
          ) : (
            <div style={{display:"grid",gap:8}}>
              {allCampaigns.filter(c=>reports.some(r=>r.campaignId===c.id)).map(c=>{
                const cvt=VERTICALS[c.type]||VERTICALS.impl;
                const campReports=reports.filter(r=>r.campaignId===c.id);
                const approvedCount=campReports.filter(r=>r.status==="approved").length;
                const pendingCount=campReports.filter(r=>r.status==="pending").length;
                const ready=approvedCount>0;
                return(
                  <div key={c.id} onClick={()=>setReportCamp(c)}
                    style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=cvt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                    <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:cvt.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
                        <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                      </div>
                      <span style={{color:ready?cvt.color:C.muted,fontWeight:700,fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>Generar →</span>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:cvt.color+"15",color:cvt.color,border:`1px solid ${cvt.color}33`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:cvt.color}}/>{cvt.label}
                      </span>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:C.green+"15",color:C.green,border:`1px solid ${C.green}33`}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:C.green}}/>{approvedCount} aprobado{approvedCount!==1?"s":""}
                      </span>
                      {pendingCount>0 && (
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:C.orange+"15",color:C.orange,border:`1px solid ${C.orange}33`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:C.orange}}/>{pendingCount} pendiente{pendingCount!==1?"s":""}
                        </span>
                      )}
                      <span style={{fontSize:11,color:C.muted,fontWeight:500,alignSelf:"center"}}>· {campReports.length} en total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>}

        {/* PAGOS */}
        {tab==="payments"&&<PaymentsTab allCampaigns={allCampaigns} reports={reports} workers={workers}/>}

        {/* WORKERS */}
        {tab==="workers"&&<WorkersTab workers={workers} setWorkers={setWorkers} allCampaigns={allCampaigns}/>}

        {/* CLIENTES */}
        {tab==="clients"&&<ClientsTab clients={clients} setClients={setClients} allCampaigns={allCampaigns} reports={reports}/>}

      </div>

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",padding:"6px 6px max(8px, env(safe-area-inset-bottom))",zIndex:10}}>
        <NavBtn id="dash"      icon="home"   label="Inicio"/>
        {user.role==="admin"&&<NavBtn id="clients"   icon="star"   label="Clientes"/>}
        {user.role==="admin"&&<NavBtn id="campaigns" icon="target" label="Campañas"/>}
        <NavBtn id="approvals" icon="check"  label="Aprobar" badge={pendingCount}/>
        <NavBtn id="reports"   icon="chart"  label="Reportes"/>
        {user.role==="admin"&&<NavBtn id="payments"  icon="dollar" label="Pagos"/>}
        {user.role==="admin"&&<NavBtn id="workers"   icon="users"  label="Workers" badge={pendingWorkerCount}/>}
      </div>
    </div>
  );
};

// ─── FIELD USER ───────────────────────────────────────────────────────────────
const LandingScreen=({user,allCampaigns,onSelect,onLogout,onChangeRole})=>{
  const [boletas,setBoletas]=useState({});
  const [showProfile,setShowProfile]=useState(false);
  const myApproved=INIT_REPORTS.filter(r=>r.user===user.name&&r.status==="approved");
  const campIds=[...new Set(myApproved.map(r=>r.campaignId))];
  const allCamps=allCampaigns||[...INIT_IMPL,...INIT_PROMO,...INIT_MEC];
  const myCampaigns=allCamps.filter(c=>c.team?.includes(user.name));
  const initials=(user.name||"").split(" ").map(n=>n[0]).filter(Boolean).slice(0,2).join("").toUpperCase();
  const primaryRole=(user.roles||[])[0];
  const roleColor=ROLE_META[primaryRole]?.color||C.impl;

  return(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text}}>
    <TopBar title="TGS Field" sub={`Hola, ${user.name?.split(" ")[0]||""}`} onLogout={onLogout}/>
    <RoleSwitchBanner user={user} onChangeRole={onChangeRole}/>
    <div style={{padding:"24px 20px 40px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>

      <div onClick={()=>setShowProfile(s=>!s)}
        style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:20,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:48,height:48,borderRadius:"50%",background:roleColor,color:pickTextOn(roleColor),display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:15,overflow:"hidden"}}>{avatarContent(user.photo,user.name)||initials||"?"}</div>
            <span style={{position:"absolute",bottom:-1,right:-1,width:13,height:13,borderRadius:"50%",background:C.green,border:`2px solid ${C.surface}`}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:15,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}}>
              {(user.roles||[]).map(r=>{const c=ROLE_META[r]?.color||C.muted;return (
                <span key={r} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:600,background:c+"15",color:c,border:`1px solid ${c}33`}}>
                  <span style={{width:5,height:5,borderRadius:"50%",background:c}}/>{ROLE_META[r]?.label}
                </span>
              );})}
            </div>
          </div>
          <span style={{color:C.muted,display:"inline-flex",transition:"transform .15s",transform:showProfile?"rotate(180deg)":"rotate(0)"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
        {showProfile && (
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,display:"grid",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}><span style={{color:C.muted,display:"inline-flex"}}><Icon name="mail" size={14}/></span>{user.email}</div>
            {user.phone && <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}><span style={{color:C.muted,display:"inline-flex"}}><Icon name="phone" size={14}/></span>{user.phone}</div>}
            <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}><span style={{color:C.muted,display:"inline-flex"}}><Icon name="pin" size={14}/></span>{user.comuna}{user.region?`, ${user.region}`:""}</div>
            {user.address && <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:C.text}}><span style={{color:C.muted,display:"inline-flex"}}><Icon name="home" size={14}/></span>{user.address}{user.addressDetail?` · ${user.addressDetail}`:""}</div>}
            {user.phone && (
              <a href={waLink(user.phone)} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:10,background:"#25D366",color:"#fff",fontSize:12,fontWeight:600,textDecoration:"none",alignSelf:"flex-start",marginTop:4}}>
                <Icon name="message" size={14}/>Mi WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      <div style={{marginBottom:18}}>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>¿Qué vas a reportar?</h1>
        {myCampaigns.length>0 && <p style={{color:C.muted,fontSize:13,margin:"4px 0 0",fontWeight:500}}>Tenés {myCampaigns.length} campaña{myCampaigns.length!==1?"s":""} asignada{myCampaigns.length!==1?"s":""}</p>}
      </div>

      <div style={{display:"grid",gap:10,marginBottom:24}}>
        {Object.entries(VERTICALS).map(([v,vd])=>(
          <div key={v} onClick={()=>onSelect(v)}
            style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"18px 20px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=vd.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
            <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:vd.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:vd.color}}/>
                  <span style={{fontSize:11,fontWeight:700,letterSpacing:0.6,color:vd.color,textTransform:"uppercase"}}>{vd.label}</span>
                </div>
                <p style={{margin:0,color:C.muted,fontSize:13,lineHeight:1.5,fontWeight:500}}>{vd.desc}</p>
              </div>
              <span style={{color:vd.color,fontWeight:700,fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>Ir a campañas →</span>
            </div>
          </div>
        ))}
      </div>

      {campIds.length>0 && (
        <>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:8}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Mis boletas de honorarios</h2>
            <span style={{fontSize:11,color:C.muted,fontWeight:500}}>{campIds.length} {campIds.length===1?"campaña":"campañas"}</span>
          </div>
          <p style={{color:C.muted,fontSize:13,margin:"0 0 12px",fontWeight:500}}>Subí la boleta de cada campaña con trabajo aprobado para que procesemos el pago.</p>
          <div style={{display:"grid",gap:8}}>
            {campIds.map(cid=>{
              const camp=allCamps.find(c=>c.id===cid);
              if(!camp)return null;
              const vt=VERTICALS[camp.type];
              const key=`${cid}__${user.name}`;
              const uploaded=boletas[key];
              return(
                <div key={cid} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",position:"relative"}}>
                  <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:uploaded?C.green:C.orange,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{camp.client}</div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{camp.name}</div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"2px 9px",borderRadius:999,fontSize:11,fontWeight:600,background:vt.color+"15",color:vt.color,border:`1px solid ${vt.color}33`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:vt.color}}/>{vt.label}
                        </span>
                      </div>
                    </div>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:600,background:(uploaded?C.green:C.orange)+"15",color:uploaded?C.green:C.orange,border:`1px solid ${(uploaded?C.green:C.orange)}33`,whiteSpace:"nowrap",flexShrink:0}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:uploaded?C.green:C.orange}}/>{uploaded?"Subida":"Pendiente"}
                    </span>
                  </div>
                  {uploaded ? (
                    <div style={{background:C.green+"08",border:`1px solid ${C.green}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.text,fontWeight:500}}>
                      <span style={{fontWeight:600,color:C.green}}>{uploaded}</span> · tu pago se procesa en breve.
                    </div>
                  ) : (
                    <>
                      <div style={{background:C.orange+"08",border:`1px solid ${C.orange}33`,borderRadius:8,padding:"10px 12px",fontSize:12,color:C.text,marginBottom:10,fontWeight:500,lineHeight:1.5}}>
                        Emití tu boleta de honorarios por el monto correspondiente y subila acá.
                      </div>
                      <input id={`boleta-${cid}`} type="file" accept=".pdf,.jpg,.png" style={{display:"none"}} onChange={async(e)=>{
                        const file=e.target.files?.[0];if(!file)return;
                        try{
                          const path=await uploadBoleta(file,user.id||user.name,cid);
                          await insertBoleta({campaign_id:cid,worker:user.name,filename:file.name,path,status:"uploaded"});
                          setBoletas(prev=>({...prev,[key]:file.name}));
                        }catch(err){alert("Error al subir boleta: "+(err.message||err));}
                      }}/>
                      <button onClick={()=>document.getElementById(`boleta-${cid}`)?.click()}
                        style={{width:"100%",background:C.impl,color:pickTextOn(C.impl),border:"none",borderRadius:10,padding:"11px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                        Subir boleta (PDF)
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  </div>
);};

const CampaignSelect=({type,campaigns,onSelect,onBack})=>{
  const vt=VERTICALS[type];
  const active=campaigns.filter(c=>c.status==="activa");
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text}}>
      <TopBar title={vt.label} sub="Elegí tu campaña" onBack={onBack}/>
      <div style={{padding:"24px 20px 40px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Mis campañas</h1>
          <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{active.length} activa{active.length!==1?"s":""}</span>
        </div>
        {active.length===0 ? (
          <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center",color:C.muted,fontSize:13}}>No tenés campañas activas en este vertical.</div>
        ) : (
          <div style={{display:"grid",gap:8}}>
            {active.map(c=>{
              const total=c.stores||c.points||c.totalUnits||1; const p=pct(c.done,total);
              const done=p===100;
              return(
                <div key={c.id} onClick={()=>onSelect(c)}
                  style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=vt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:vt.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{c.client}</div>
                      <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                      {c.payMode && <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500}}>{c.payMode}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:14,fontWeight:700,color:done?C.green:C.text}}>{p}%</div>
                      <div style={{fontSize:11,color:C.muted,fontWeight:500,marginTop:2}}>{c.done||0}/{total}</div>
                    </div>
                  </div>
                  <div style={{height:5,background:C.surfaceHi,borderRadius:999,overflow:"hidden"}}>
                    <div style={{width:`${p}%`,height:"100%",background:done?C.green:vt.color,borderRadius:999,transition:"width .6s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Lista las salas asignadas al worker dentro de una campaña
const SalaSelect=({type,campaign,user,onSelect,onBack})=>{
  const vt=VERTICALS[type];
  const mySalas=(campaign.salas||[]).filter(s=>(s.assignedTo||[]).includes(user.name));
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text}}>
      <TopBar title={campaign.name} sub={campaign.client} onBack={onBack}/>
      <div style={{padding:"24px 20px 40px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:12}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text,letterSpacing:-0.3}}>Mis salas</h1>
          <span style={{fontSize:12,color:C.muted,fontWeight:500}}>{mySalas.length} asignada{mySalas.length!==1?"s":""}</span>
        </div>
        {mySalas.length===0 ? (
          <div style={{background:C.surface,border:`1px dashed ${C.border}`,borderRadius:12,padding:"40px 20px",textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:6}}>No tenés salas asignadas</div>
            <p style={{margin:0,color:C.muted,fontSize:13}}>Hablá con el supervisor para que te asigne salas en esta campaña.</p>
          </div>
        ) : (
          <div style={{display:"grid",gap:8}}>
            {mySalas.map((s,i)=>(
              <div key={i} onClick={()=>onSelect(s)}
                style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",position:"relative",transition:"border-color .15s, box-shadow .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=vt.color;e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>
                <div style={{position:"absolute",top:0,bottom:0,left:0,width:3,background:vt.color,borderTopLeftRadius:12,borderBottomLeftRadius:12}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div style={{minWidth:0,flex:1}}>
                    {s.chain && <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:3}}>{s.chain}</div>}
                    <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{s.name||"Sin nombre"}</div>
                    {s.address && <div style={{fontSize:11,color:C.muted,marginTop:3,fontWeight:500,display:"inline-flex",alignItems:"center",gap:4}}><Icon name="pin" size={11}/>{s.address}</div>}
                  </div>
                  <span style={{color:vt.color,fontWeight:700,fontSize:13,whiteSpace:"nowrap",flexShrink:0}}>Reportar →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helpers compartidos por los forms de reporte
const FormSection=({title,desc,children,style})=>(
  <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:12,...(style||{})}}>
    {title && <div style={{marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{title}</div>
      {desc && <div style={{fontSize:12,color:C.muted,marginTop:2,fontWeight:500}}>{desc}</div>}
    </div>}
    {children}
  </div>
);
const HeroMeta=({label,value,color})=>(
  <div style={{background:C.surface,border:`1px solid ${color}55`,borderRadius:14,padding:"16px 20px",marginBottom:12,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:color}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:4}}>{label}</div>
        <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{value}</div>
      </div>
    </div>
  </div>
);
const PayHint=({campaign,color})=>campaign.payAmount?(
  <div style={{background:color+"08",border:`1px solid ${color}33`,borderLeft:`3px solid ${color}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12,color:C.text,fontWeight:500,lineHeight:1.5}}>
    Si este reporte se aprueba, generás <span style={{fontWeight:700,color:C.text}}>{fmt$(campaign.payAmount)}</span> · {campaign.payMode}
  </div>
):null;
const BigNumberInput=({value,onChange,placeholder="0",width="55%"})=>(
  <input type="number" placeholder={placeholder} value={value} onChange={onChange}
    style={{width,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"14px 16px",color:C.text,fontFamily:f.b,fontSize:28,fontWeight:700,textAlign:"center",outline:"none",boxSizing:"border-box",letterSpacing:-0.5}}/>
);
const ToggleRow=({label,desc,value,onChange,color,children})=>(
  <FormSection>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,marginBottom:value?12:0}}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{label}</div>
        {desc && <div style={{fontSize:12,color:C.muted,marginTop:2,fontWeight:500}}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} color={color}/>
    </div>
    {value && children}
  </FormSection>
);
const SubmitBtn=({disabled,onClick,loading,children,accent=C.impl})=>(
  <button disabled={disabled||loading} onClick={onClick}
    style={{width:"100%",background:disabled?C.surfaceHi:accent,color:disabled?C.muted:pickTextOn(accent),border:"none",borderRadius:10,padding:"14px 20px",fontFamily:f.b,fontSize:14,fontWeight:700,cursor:disabled||loading?"not-allowed":"pointer",transition:"background .15s",marginTop:6}}>
    {loading?"Enviando…":children}
  </button>
);

const MecForm=({campaign,sala,onSubmit,onBack,user})=>{
  const [form,setForm]=useState({location:sala?.name||"",units:"",material:campaign.material||"",issues:false,issueNote:""});
  const [photos,setPhotos]=useState({before:null,after:null});
  const [sending,setSending]=useState(false);
  const ts=nowStr();
  const handleSubmit=async()=>{
    setSending(true);
    await onSubmit({type:"mec",campaignId:campaign.id,user:user?.name,status:"pending",date:ts,
      location:form.location,units:parseInt(form.units)||0,material:form.material,
      issues:form.issues,issueNote:form.issueNote,
      photos:{a:photos.before,b:photos.after},
    });
    setSending(false);
  };
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"20px 18px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <HeroMeta label="Sesión de mecanización" value={ts} color={C.mec}/>
        <PayHint campaign={campaign} color={C.mec}/>

        <FormSection title="Ubicación de trabajo">
          {sala ? (
            <div style={{background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",marginBottom:12}}>
              {sala.chain && <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{sala.chain}</div>}
              <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{sala.name}</div>
              {sala.address && <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500,display:"inline-flex",alignItems:"center",gap:5}}><Icon name="pin" size={12}/>{sala.address}</div>}
            </div>
          ) : (
            <Inp label="Bodega / Lugar" placeholder="ej: Bodega Santiago Centro" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
          )}
          <Inp label="Material mecanizado" placeholder={campaign.material||"Tipo de material"} value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
        </FormSection>

        <FormSection title="Unidades mecanizadas" desc="Total de unidades terminadas en esta sesión">
          <BigNumberInput value={form.units} onChange={e=>setForm({...form,units:e.target.value})}/>
          {campaign.payAmount && form.units && (
            <div style={{marginTop:10,fontSize:13,color:C.text,fontWeight:500}}>
              Estimado: <span style={{fontWeight:700,color:C.mec}}>{fmt$(parseInt(form.units)*(campaign.payAmount||0))}</span>
            </div>
          )}
        </FormSection>

        <FormSection title="Fotografías" desc="Antes y después del trabajo">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <PhotoSlot label="Antes"   captured={photos.before} onCapture={url=>setPhotos({...photos,before:url})}/>
            <PhotoSlot label="Después" captured={photos.after}  onCapture={url=>setPhotos({...photos,after:url})}/>
          </div>
        </FormSection>

        <ToggleRow label="¿Hubo problemas?" desc="Material dañado, faltante, etc." value={form.issues} onChange={v=>setForm({...form,issues:v})} color={C.red}>
          <textarea value={form.issueNote} onChange={e=>setForm({...form,issueNote:e.target.value})} placeholder="Describí el problema…"
            style={{width:"100%",minHeight:80,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
        </ToggleRow>

        <SubmitBtn disabled={!form.location||!form.units} loading={sending} onClick={handleSubmit} accent={C.mec}>
          Enviar reporte
        </SubmitBtn>
      </div>
    </div>
  );
};

const realGeo=(setGeo,setGl)=>{
  setGl(true);
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos=>{ setGeo({lat:pos.coords.latitude,lng:pos.coords.longitude}); setGl(false); },
      ()=>{ setGeo({lat:0,lng:0}); setGl(false); },
      {enableHighAccuracy:true,timeout:10000}
    );
  } else { setGeo({lat:0,lng:0}); setGl(false); }
};

const ImplForm=({campaign,sala,onSubmit,onBack,user})=>{
  const initialItems=(campaign?.materials||[]).filter(m=>m && typeof m==="string" && m.trim()).map(name=>({name,photo:null,note:""}));
  const [form,setForm]=useState({store:sala?.name||"",issues:false,issueNote:"",signed:false});
  const [items,setItems]=useState(initialItems.length?initialItems:[{name:"",photo:null,note:""}]);
  const [photoGeneral,setPhotoGeneral]=useState(null);
  const [signedPhoto,setSignedPhoto]=useState(null);
  const [geo,setGeo]=useState(null);const[gl,setGl]=useState(false);
  const [sending,setSending]=useState(false);
  const ts=nowStr();
  const getGeo=()=>realGeo(setGeo,setGl);
  const editItem=(i,k,v)=>setItems(prev=>prev.map((it,j)=>j===i?{...it,[k]:v}:it));
  const addItem=()=>setItems(prev=>[...prev,{name:"",photo:null,note:""}]);
  const removeItem=(i)=>setItems(prev=>prev.filter((_,j)=>j!==i));
  const itemsValid=items.filter(it=>it.name.trim()&&it.photo);
  const canSubmit=itemsValid.length>0;
  const handleSubmit=async()=>{
    setSending(true);
    const cleanItems=items.filter(it=>it.name.trim()&&it.photo).map(it=>({name:it.name.trim(),photo:it.photo,note:it.note||"",status:"pending"}));
    await onSubmit({type:"impl",campaignId:campaign.id,user:user?.name,status:"pending",date:ts,
      store:form.store,qty:cleanItems.length,
      items:cleanItems,
      issues:form.issues,issueNote:form.issueNote,signed:form.signed,signedPhoto:form.signed?signedPhoto:null,
      photos:{a:cleanItems[0]?.photo,b:photoGeneral,c:form.signed?signedPhoto:null},geo,
    });
    setSending(false);
  };
  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"20px 18px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:4}}>Fecha y hora</div>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{ts}</div>
          </div>
          {geo ? (
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,fontSize:11,fontWeight:600,background:C.green+"15",color:C.green,border:`1px solid ${C.green}33`}}>
              <Icon name="pin" size={12}/>Ubicación OK
            </span>
          ) : (
            <button onClick={getGeo}
              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              <Icon name="pin" size={13}/>{gl?"Capturando…":"Capturar ubicación"}
            </button>
          )}
        </div>

        <PayHint campaign={campaign} color={C.impl}/>

        <FormSection title="Punto de venta">
          {sala ? (
            <div style={{background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
              {sala.chain && <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{sala.chain}</div>}
              <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{sala.name}</div>
              {sala.address && <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500,display:"inline-flex",alignItems:"center",gap:5}}><Icon name="pin" size={12}/>{sala.address}</div>}
            </div>
          ) : (
            <Inp label="Local" placeholder="ej: Unimarc Las Condes" value={form.store} onChange={e=>setForm({...form,store:e.target.value})}/>
          )}
        </FormSection>

        <FormSection title="Elementos instalados" desc="Agregá un item por cada elemento POP. Cada uno con su foto.">
          <div style={{display:"grid",gap:12}}>
            {items.map((it,i)=>(
              <div key={i} style={{background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:0.5,color:C.muted,textTransform:"uppercase"}}>Elemento {i+1}</span>
                  {items.length>1 && (
                    <button type="button" onClick={()=>removeItem(i)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4,display:"inline-flex"}} title="Quitar">
                      <Icon name="x" size={14}/>
                    </button>
                  )}
                </div>
                <input value={it.name} onChange={e=>editItem(i,"name",e.target.value)} placeholder="Nombre del elemento (ej: Cooler exhibidor)"
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 11px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
                <PhotoSlot label={it.name||"Foto del elemento"} captured={it.photo} onCapture={url=>editItem(i,"photo",url)}/>
                <textarea value={it.note} onChange={e=>editItem(i,"note",e.target.value)} placeholder="Nota (opcional)"
                  style={{width:"100%",minHeight:48,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 11px",color:C.text,fontFamily:f.b,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box",marginTop:8}}/>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} style={{width:"100%",marginTop:10,background:"transparent",border:`1px dashed ${C.border}`,color:C.muted,borderRadius:10,padding:"10px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar otro elemento</button>
        </FormSection>

        <FormSection title="Vista general del punto" desc="Una foto opcional del PdV completo">
          <PhotoSlot label="Vista del PdV" captured={photoGeneral} onCapture={url=>setPhotoGeneral(url)}/>
        </FormSection>

        <ToggleRow label="¿Hubo incidencias?" desc="Problemas a reportar" value={form.issues} onChange={v=>setForm({...form,issues:v})} color={C.red}>
          <textarea value={form.issueNote} onChange={e=>setForm({...form,issueNote:e.target.value})} placeholder="Describí la incidencia…"
            style={{width:"100%",minHeight:80,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
        </ToggleRow>

        <FormSection>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,letterSpacing:-0.2}}>Firma del local</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2,fontWeight:500}}>El encargado del local confirmó la instalación</div>
            </div>
            <Toggle value={form.signed} onChange={v=>{setForm({...form,signed:v});if(!v)setSignedPhoto(null);}} color={C.green}/>
          </div>
          {form.signed && (
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px dashed ${C.border}`}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:8}}>Foto de la guía de despacho firmada</div>
              <PhotoSlot label="Guía firmada" captured={signedPhoto} onCapture={url=>setSignedPhoto(url)}/>
              {!signedPhoto && <div style={{fontSize:11,color:C.muted,marginTop:6,fontWeight:500}}>Subí una foto clara con la firma y el sello visibles.</div>}
            </div>
          )}
        </FormSection>

        <SubmitBtn disabled={!form.store||!canSubmit} loading={sending} onClick={handleSubmit} accent={C.impl}>
          Enviar reporte ({itemsValid.length} elemento{itemsValid.length!==1?"s":""})
        </SubmitBtn>
      </div>
    </div>
  );
};

const PromoForm=({campaign,sala,onSubmit,onBack,user})=>{
  const [form,setForm]=useState({point:sala?.name||"",contacts:"",samples:"",obs:"",popOk:true,popNote:"",checkedIn:false});
  const [photos,setPhotos]=useState({activation:null,general:null,pop:null});
  const [geo,setGeo]=useState(null);const[gl,setGl]=useState(false);
  const [entryTime]=useState(nowStr());const[exitTime,setExitTime]=useState(null);
  const [sending,setSending]=useState(false);
  const getGeo=()=>realGeo(setGeo,setGl);
  const ts=nowStr();
  const handleSubmit=async()=>{
    setSending(true);
    await onSubmit({type:"promo",campaignId:campaign.id,user:user?.name,status:"pending",date:ts,
      point:form.point,contacts:parseInt(form.contacts)||0,samples:parseInt(form.samples)||0,
      popOk:form.popOk,popNote:form.popNote,obs:form.obs,checkedIn:form.checkedIn,
      entryTime,exitTime,photos:{a:photos.activation,b:photos.general,c:photos.pop},geo,
    });
    setSending(false);
  };

  const CheckSlot=({label,active,time,onClick,disabled,color})=>(
    <div onClick={disabled?undefined:onClick}
      style={{background:active?color+"08":C.surface,border:`1px solid ${active?color:C.border}`,borderRadius:12,padding:"12px 14px",textAlign:"center",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,transition:"all .15s"}}>
      <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:32,height:32,borderRadius:"50%",background:active?color:C.surfaceHi,color:active?pickTextOn(color):C.muted,marginBottom:6}}>
        {active
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>
        }
      </div>
      <div style={{fontSize:12,fontWeight:700,color:active?color:C.text,letterSpacing:-0.1}}>{label}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:2,fontWeight:500}}>{time}</div>
    </div>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:f.b,color:C.text,paddingBottom:40}}>
      <TopBar title={campaign.client} sub={campaign.name} onBack={onBack}/>
      <div style={{padding:"20px 18px",maxWidth:560,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
        <PayHint campaign={campaign} color={C.promo}/>

        <FormSection title="Control de asistencia" desc="Marcá tu entrada y salida del punto">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <CheckSlot label="Entrada" active={form.checkedIn} time={form.checkedIn?entryTime:"Tap para marcar"} color={C.green}
              onClick={()=>{if(!form.checkedIn){setForm({...form,checkedIn:true});getGeo();}}}/>
            <CheckSlot label="Salida" active={!!exitTime} time={exitTime||(form.checkedIn?"Tap para marcar":"Marca entrada primero")} color={C.red}
              disabled={!form.checkedIn||!!exitTime}
              onClick={()=>{if(form.checkedIn&&!exitTime)setExitTime(nowStr());}}/>
          </div>
          {geo ? (
            <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:999,fontSize:11,fontWeight:600,background:C.green+"15",color:C.green,border:`1px solid ${C.green}33`}}>
              <Icon name="pin" size={12}/>Ubicación capturada
            </span>
          ) : (
            <button onClick={getGeo}
              style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.text,fontFamily:f.b,fontSize:12,fontWeight:600,cursor:"pointer"}}>
              <Icon name="pin" size={13}/>{gl?"Capturando…":"Capturar ubicación"}
            </button>
          )}
        </FormSection>

        <FormSection title="Punto de activación">
          {sala ? (
            <div style={{background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
              {sala.chain && <div style={{fontSize:10,fontWeight:700,letterSpacing:0.6,color:C.muted,textTransform:"uppercase",marginBottom:4}}>{sala.chain}</div>}
              <div style={{fontSize:15,fontWeight:700,color:C.text,letterSpacing:-0.2}}>{sala.name}</div>
              {sala.address && <div style={{fontSize:12,color:C.muted,marginTop:4,fontWeight:500,display:"inline-flex",alignItems:"center",gap:5}}><Icon name="pin" size={12}/>{sala.address}</div>}
            </div>
          ) : (
            <Inp label="Lugar" placeholder="ej: Bar X, Stand Feria" value={form.point} onChange={e=>setForm({...form,point:e.target.value})}/>
          )}
        </FormSection>

        <FormSection title="Fotografías" desc="Activación, vista general y material POP">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <PhotoSlot label="Activación" captured={photos.activation} onCapture={url=>setPhotos({...photos,activation:url})}/>
            <PhotoSlot label="General"    captured={photos.general}    onCapture={url=>setPhotos({...photos,general:url})}/>
            <PhotoSlot label="POP"        captured={photos.pop}        onCapture={url=>setPhotos({...photos,pop:url})}/>
          </div>
        </FormSection>

        <FormSection title="Métricas">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[["Contactos","contacts"],["Muestras","samples"]].map(([lbl,k])=>(
              <div key={k}>
                <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:6}}>{lbl}</div>
                <input type="number" placeholder="0" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                  style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",color:C.text,fontFamily:f.b,fontSize:24,fontWeight:700,textAlign:"center",outline:"none",boxSizing:"border-box",letterSpacing:-0.5}}/>
              </div>
            ))}
          </div>
        </FormSection>

        <ToggleRow label="Material POP completo" desc="¿Llegó todo lo que pedimos?" value={form.popOk} onChange={v=>setForm({...form,popOk:v})} color={C.promo}>
          {/* Cuando popOk=true, no mostramos nada */}
        </ToggleRow>
        {!form.popOk && (
          <div style={{margin:"-6px 0 12px"}}>
            <textarea value={form.popNote} onChange={e=>setForm({...form,popNote:e.target.value})} placeholder="¿Qué faltó?"
              style={{width:"100%",minHeight:80,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
          </div>
        )}

        <FormSection title="Observaciones" desc="Flujo de personas, oportunidades, cualquier comentario">
          <textarea value={form.obs} onChange={e=>setForm({...form,obs:e.target.value})} placeholder="Escribí lo que quieras destacar…"
            style={{width:"100%",minHeight:90,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontFamily:f.b,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
        </FormSection>

        <SubmitBtn disabled={!form.point||!form.checkedIn} loading={sending} onClick={handleSubmit} accent={C.promo}>
          Enviar reporte
        </SubmitBtn>
      </div>
    </div>
  );
};

const SuccessScreen=({type,onNew,onHome})=>{
  const vt=VERTICALS[type];
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:C.green+"15",border:`1px solid ${C.green}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4}}>Reporte enviado</h1>
        <p style={{color:C.muted,fontSize:14,margin:"8px 0 18px",lineHeight:1.5}}>
          Quedó registrado y está <span style={{fontWeight:700,color:C.orange}}>pendiente de aprobación</span> del supervisor.
        </p>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px",marginBottom:24,fontSize:12,color:C.text,fontWeight:500,lineHeight:1.5,textAlign:"left"}}>
          Cuando se apruebe, el monto correspondiente se suma automáticamente a tu próxima liquidación.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onHome}
            style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>
            ← Inicio
          </button>
          <button onClick={onNew}
            style={{flex:1,background:vt.color,color:pickTextOn(vt.color),border:"none",borderRadius:10,padding:"12px 16px",fontFamily:f.b,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Nuevo reporte
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingScreen=({user,onLogout})=>(
  <div style={{minHeight:"100vh",background:C.bg,fontFamily:f.b,color:C.text,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{width:"100%",maxWidth:380}}>
      <div style={{width:64,height:64,borderRadius:"50%",background:C.orange+"15",border:`1px solid ${C.orange}33`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      </div>
      <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:-0.4,textAlign:"center"}}>Registro pendiente</h1>
      <p style={{color:C.muted,fontSize:13,margin:"8px 0 18px",lineHeight:1.5,textAlign:"center"}}>
        Tu cuenta está <span style={{fontWeight:700,color:C.orange}}>pendiente de aprobación</span> por el equipo de TGS.
      </p>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"4px 18px",marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",gap:12}}>
          <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>Nombre</span>
          <span style={{fontSize:13,fontWeight:600,color:C.text,textAlign:"right"}}>{user.name}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,gap:12}}>
          <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>Email</span>
          <span style={{fontSize:13,fontWeight:600,color:C.text,textAlign:"right",wordBreak:"break-word"}}>{user.email}</span>
        </div>
        {user.phone && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,gap:12}}>
            <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>Teléfono</span>
            <span style={{fontSize:13,fontWeight:600,color:C.text,textAlign:"right"}}>{user.phone}</span>
          </div>
        )}
        {user.comuna && (
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.border}`,gap:12}}>
            <span style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:0.4,textTransform:"uppercase"}}>Ubicación</span>
            <span style={{fontSize:13,fontWeight:600,color:C.text,textAlign:"right"}}>{user.comuna}{user.region?`, ${user.region}`:""}</span>
          </div>
        )}
      </div>
      <p style={{color:C.muted,fontSize:12,margin:"0 0 18px",textAlign:"center",lineHeight:1.5}}>Te avisaremos por WhatsApp cuando tu cuenta esté activa.</p>
      <button onClick={onLogout}
        style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,color:C.text,borderRadius:10,padding:"12px 18px",fontFamily:f.b,fontSize:13,fontWeight:600,cursor:"pointer"}}>
        Cerrar sesión
      </button>
    </div>
  </div>
);

const LoginScreen=({onLogin,onRegister})=>{
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [remember,setRemember]=useState(true);

  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("tgs_login")||"null");
      if(saved){
        if(saved.email) setEmail(saved.email);
        if(saved.pass) setPass(saved.pass);
      }
    }catch{}
  },[]);

  const persistCreds=()=>{
    if(remember) localStorage.setItem("tgs_login",JSON.stringify({email:email.trim().toLowerCase(),pass}));
    else localStorage.removeItem("tgs_login");
  };

  const handle=async()=>{
    // TODO REMOVE: bypass temporal mientras Supabase Email provider está disabled
    if(pass==="tgsdev2026"){
      const devProfiles={
        "dev@tgs.cl":{role:"admin",name:"Administrador TGS"},
        "dev-admin@tgs.cl":{role:"admin",name:"Administrador TGS"},
        "dev-super@tgs.cl":{role:"supervisor",name:"Rosa Ibáñez"},
        "dev-impl@tgs.cl":{role:"implementador",name:"Carlos Muñoz"},
        "dev-promo@tgs.cl":{role:"promotor",name:"Ana Soto"},
        "dev-mec@tgs.cl":{role:"mecanizador",name:"Mario Vega"},
      };
      const prof=devProfiles[email.trim().toLowerCase()];
      if(prof){
        persistCreds();
        onLogin({id:"dev-bypass-"+prof.role,name:prof.name,email:email.trim().toLowerCase(),roles:[prof.role],status:"activo",role:prof.role});
        return;
      }
    }
    if(!email.trim()||pass.length<6){setErr("Email y contraseña (mín. 6 caracteres) requeridos");return;}
    setLoading(true);setErr("");
    try{
      const {error:authErr}=await signIn(email.trim(),pass);
      if(authErr) throw authErr;
      const {data:rawWorker,error:wErr}=await getWorkerByEmail(email.trim().toLowerCase());
      if(wErr||!rawWorker) throw new Error("No se encontró tu perfil. ¿Ya te registraste?");
      const worker=normalizeWorker(rawWorker);
      const role=worker.roles?.includes("admin")?"admin":worker.roles?.includes("supervisor")?"supervisor":worker.roles?.[0]||"implementador";
      persistCreds();
      onLogin({...worker,role});
    }catch(e){setErr(e.message||"Error al iniciar sesión");}
    setLoading(false);
  };

  const inputBase={width:"100%",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.rBtn,padding:"12px 14px",color:T.text,fontFamily:T.font,fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .15s, box-shadow .15s"};
  const labelBase={fontSize:12,fontWeight:600,color:T.text,marginBottom:6,display:"block"};

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24,background:T.bg,fontFamily:T.font}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{width:200,height:200,margin:"0 auto 24px",borderRadius:24,backgroundColor:"#000",backgroundImage:"url('/brand/tgs-logo.jpg')",backgroundSize:"contain",backgroundPosition:"center",backgroundRepeat:"no-repeat",boxShadow:T.shadowMd}}/>
        <h1 style={{fontSize:28,fontWeight:800,color:T.text,textAlign:"center",margin:"0 0 4px",letterSpacing:-0.5}}>TGS Field</h1>
        <p style={{fontSize:14,color:T.textMuted,textAlign:"center",margin:"0 0 28px"}}>Plataforma de gestión de campañas</p>

        <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.rCard,padding:24,boxShadow:T.shadowSm}}>
          <label style={labelBase}>Email</label>
          <input type="email" placeholder="tu@email.com" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}}
            style={{...inputBase,marginBottom:14}}
            onFocus={e=>{e.target.style.borderColor=T.primary;e.target.style.boxShadow=`0 0 0 3px ${T.primary}22`;}}
            onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none";}}/>

          <label style={labelBase}>Contraseña</label>
          <div style={{position:"relative",marginBottom:14}}>
            <input type={showPw?"text":"password"} placeholder="••••••••" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}}
              style={{...inputBase,paddingRight:64}}
              onFocus={e=>{e.target.style.borderColor=T.primary;e.target.style.boxShadow=`0 0 0 3px ${T.primary}22`;}}
              onBlur={e=>{e.target.style.borderColor=T.border;e.target.style.boxShadow="none";}}/>
            <button type="button" onClick={()=>setShowPw(s=>!s)}
              style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",padding:"6px 10px",fontSize:12,fontWeight:600,fontFamily:T.font}}>
              {showPw?"Ocultar":"Mostrar"}
            </button>
          </div>

          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,cursor:"pointer",userSelect:"none"}}>
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}
              style={{width:16,height:16,accentColor:T.primary,cursor:"pointer"}}/>
            <span style={{fontSize:13,color:T.text,fontWeight:500}}>Recordar mis datos en este dispositivo</span>
          </label>

          {err && (
            <div style={{marginBottom:14,padding:"10px 12px",background:"#FEF2F2",border:`1px solid ${T.danger}33`,borderRadius:T.rBtn,color:T.danger,fontSize:13,fontWeight:500}}>{err}</div>
          )}

          <button onClick={handle} disabled={loading}
            style={{width:"100%",background:T.primary,color:T.onPrimary,border:"none",borderRadius:T.rBtn,padding:"13px 20px",fontFamily:T.font,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.6:1,transition:"background .15s"}}
            onMouseEnter={e=>!loading&&(e.currentTarget.style.background=T.primaryHover)}
            onMouseLeave={e=>!loading&&(e.currentTarget.style.background=T.primary)}>
            {loading?"Ingresando...":"Ingresar"}
          </button>
        </div>

        <button onClick={onRegister}
          style={{width:"100%",marginTop:12,background:"transparent",border:`1px solid ${T.border}`,borderRadius:T.rCard,padding:"16px 18px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:T.font,transition:"border-color .15s, background .15s"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=T.primary;e.currentTarget.style.background=T.surfaceAlt;}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background="transparent";}}>
          <div style={{textAlign:"left"}}>
            <div style={{fontWeight:700,fontSize:14,color:T.text}}>¿Quieres trabajar con TGS?</div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>Registrate como implementador, promotor, mecanizador o supervisor</div>
          </div>
          <span style={{color:T.primary,fontSize:18,fontWeight:700}}>→</span>
        </button>

        <div style={{textAlign:"center",marginTop:32,fontSize:11,color:T.textDim,fontWeight:600,letterSpacing:1}}>AGENCIA TGS · TRADE MARKETING MULTICANAL</div>
      </div>
    </div>
  );
};

// ─── ROOT (SUPABASE CONNECTED) ───────────────────────────────────────────────
export default function App(){
  const [user,setUser]       =useState(null);
  const [vertical,setVert]   =useState(null);
  const [campaign,setCamp]   =useState(null);
  const [sala,setSala]       =useState(null);
  const [screen,setScreen]   =useState("home");
  const [implCamps,setImpl]  =useState([]);
  const [promoCamps,setPromo]=useState([]);
  const [mecCamps,setMec]    =useState([]);
  const [loading,setLoading] =useState(true);

  // Restore session on mount
  useEffect(()=>{
    const restore=async()=>{
      try{
        const {data:{session}}=await getSession();
        if(session?.user?.email){
          const {data:rawWorker}=await getWorkerByEmail(session.user.email);
          if(rawWorker){
            const worker=normalizeWorker(rawWorker);
            const role=worker.roles?.includes("admin")?"admin":worker.roles?.includes("supervisor")?"supervisor":worker.roles?.[0]||"implementador";
            setUser({...worker,role});
          }
        }
      }catch(e){console.error("Session restore error:",e);}
      setLoading(false);
    };
    restore();
  },[]);

  // Load campaigns from Supabase once user is loaded
  const loadCampaigns = useCallback(async () => {
    try {
      const [i,p,m] = await Promise.all([
        getCampaigns('impl'), getCampaigns('promo'), getCampaigns('mec')
      ]);
      if(i.data) setImpl(i.data);
      if(p.data) setPromo(p.data);
      if(m.data) setMec(m.data);
    } catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{ if(user) loadCampaigns(); },[user,loadCampaigns]);

  const handleLogout=async()=>{
    await signOut();
    setUser(null);setVert(null);setCamp(null);setSala(null);setScreen("home");
  };

  const allCampaigns=[...implCamps,...promoCamps,...mecCamps];
  const reset=()=>{setVert(null);setCamp(null);setSala(null);setScreen("home");};
  const camps=vertical==="impl"?implCamps:vertical==="promo"?promoCamps:mecCamps;
  // Field workers only see campaigns where they are in the team
  const myCamps=(user?.role==="admin"||user?.role==="supervisor")?camps:camps.filter(c=>c.team?.includes(user?.name));

  if(loading) return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18,fontFamily:T.font}}>
      <div style={{width:72,height:72,borderRadius:18,background:"#000",backgroundImage:"url('/brand/tgs-sheep.jpg')",backgroundSize:"cover",backgroundPosition:"center"}}/>
      <div style={{color:T.textMuted,fontSize:13,fontWeight:600,letterSpacing:0.5}}>Cargando TGS Field…</div>
    </div>
  );

  if(screen==="register") return <WorkerRegisterScreen onBack={()=>setScreen("home")}/>;
  if(!user)return <LoginScreen onLogin={setUser} onRegister={()=>setScreen("register")}/>;
  if(user.status==="pendiente") return <PendingScreen user={user} onLogout={handleLogout}/>;
  const changeRole=(r)=>setUser(u=>({...u,role:r}));
  if(user.role==="admin"||user.role==="supervisor")return <AdminApp user={user} onLogout={handleLogout} onRefresh={loadCampaigns} onChangeRole={changeRole}/>;
  if(screen==="success")return <SuccessScreen type={vertical} onNew={()=>{setCamp(null);setScreen("select");}} onHome={reset}/>;
  const submitReport=async(reportData)=>{
    const {error}=await insertReport(reportData);
    if(error) alert("Error al guardar reporte: "+error.message);
    else setScreen("success");
  };
  if(screen==="form"){
    const back=()=>setScreen(sala?"sala-select":"select");
    if(vertical==="impl") return <ImplForm  campaign={campaign} sala={sala} user={user} onBack={back} onSubmit={submitReport}/>;
    if(vertical==="promo")return <PromoForm campaign={campaign} sala={sala} user={user} onBack={back} onSubmit={submitReport}/>;
    if(vertical==="mec")  return <MecForm   campaign={campaign} sala={sala} user={user} onBack={back} onSubmit={submitReport}/>;
  }
  if(screen==="sala-select") return <SalaSelect type={vertical} campaign={campaign} user={user} onSelect={s=>{setSala(s);setScreen("form");}} onBack={()=>{setSala(null);setScreen("select");}}/>;
  if(screen==="select")return <CampaignSelect type={vertical} campaigns={myCamps} onSelect={c=>{
    setCamp(c);setSala(null);
    const hasAssignedSalas=(c.salas||[]).some(s=>(s.assignedTo||[]).includes(user.name));
    setScreen(hasAssignedSalas?"sala-select":"form");
  }} onBack={reset}/>;
  return <LandingScreen user={user} allCampaigns={allCampaigns} onSelect={v=>{setVert(v);setScreen("select");}} onLogout={handleLogout} onChangeRole={changeRole}/>;
}
