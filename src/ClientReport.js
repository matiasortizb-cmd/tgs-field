import { useState, useEffect } from "react";
import PptxGenJS from "pptxgenjs";

// ─── Report palette (corporativo TGS: amarillo + negro de marca, interior claro) ─
const R = {
  brand:"#F5A623", brandDk:"#E08A00",
  black:"#111418", blackPanel:"#1B2129",
  paper:"#FFFFFF", ink:"#1F2937", inkSoft:"#6B7280", line:"#E5E8EC", panel:"#F7F9FB",
  onBlack:"#FFFFFF", onBlackSoft:"#AEB6C0",
  green:"#1E9E5A", orange:"#E08600", red:"#D64545",
};
// Chrome del editor (tema oscuro de la app)
const C = { bg:"#07111C", surface:"#0D1E2E", surfaceHi:"#132840", border:"#1E3550", text:"#E4EDF6", muted:"#6B8BAA", blue:"#4A9EFF" };
const f = { d:"'Syne','DM Sans',sans-serif", b:"'DM Sans','Segoe UI',sans-serif" };
const hx = (c) => (c || "").replace("#", "");
const VERTICALS = {
  impl:  { label:"Implementación POP", color:R.brand },
  promo: { label:"Activaciones & Promo", color:R.brand },
  mec:   { label:"Mecanización", color:R.brand },
};
// ─── Carga de imágenes a data URL (para incrustar en el PPTX) ─────────────────
const toDataURL = (url) =>
  fetch(url).then(r => r.blob()).then(blob => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  }));

// ─── Datos de cada slide (sólo contenido; el estilo se aplica al render/export) ─
const buildSlides = (campaign, reports, workers) => {
  const vt = VERTICALS[campaign.type] || VERTICALS.impl;
  const mine = reports.filter(r => r.campaignId === campaign.id);
  const approved = mine.filter(r => r.status === "approved");
  const pending = mine.filter(r => r.status === "pending");
  const rejected = mine.filter(r => r.status === "rejected");
  const teamWorkers = (campaign.team || []).map(name => workers.find(w => w.name === name)).filter(Boolean);
  const totalPoints = campaign.stores || campaign.points || campaign.totalUnits || 0;
  const completionPct = totalPoints ? Math.round((approved.length / totalPoints) * 100) : 0;

  return [
    { id:"cover", title:"Portada", editable:["subtitle","footer"], data:{
      campaignName:campaign.name, client:campaign.client, type:vt.label,
      dates:`${campaign.dateStart || "?"} — ${campaign.dateEnd || "?"}`,
      subtitle:`Reporte de campaña · ${vt.label}`,
      footer:"Documento confidencial — TGS Trade Marketing Multicanal",
    }},
    { id:"summary", title:"Resumen Ejecutivo", editable:["narrative"], data:{
      approved:approved.length, pending:pending.length, rejected:rejected.length,
      completionPct, totalPoints, teamSize:(campaign.team || []).length,
      narrative:`La campaña "${campaign.name}" para ${campaign.client} alcanzó un ${completionPct}% de avance, con ${approved.length} reportes aprobados sobre ${totalPoints} puntos planificados. El equipo de ${(campaign.team || []).length} ${(campaign.team || []).length===1?"persona":"personas"} ejecutó las actividades entre ${campaign.dateStart || "?"} y ${campaign.dateEnd || "?"}.`,
    }},
    { id:"team", title:"Equipo de Campo", editable:["teamNote"], data:{
      members:teamWorkers.map(w => ({ name:w.name, role:(w.roles || [])[0] || "—", comuna:w.comuna || "—" })),
      teamNote:`Equipo de ${teamWorkers.length} ${teamWorkers.length===1?"profesional":"profesionales"} distribuido estratégicamente para cubrir los puntos asignados.`,
    }},
    { id:"results", title:"Resultados por Punto", editable:["resultsNote"], data:{
      points:approved.map(r => ({ name:r.store || r.point || r.location || "—", user:r.user || "—", date:r.date || "—", qty:r.qty || r.contacts || r.units || 0, issues:r.issues ? "Sí" : "No" })),
      resultsNote:`Se completaron ${approved.length} puntos. ${approved.filter(r => r.issues).length} reportaron incidencias, gestionadas por el equipo supervisor.`,
    }},
    { id:"issues", title:"Incidencias", editable:["issuesSummary"], data:{
      incidents:mine.filter(r => r.issues || r.popOk === false).map(r => ({ point:r.store || r.point || r.location || "—", user:r.user || "—", note:r.issueNote || r.popNote || "Sin detalle" })),
      issuesSummary:`Se registraron ${mine.filter(r => r.issues).length} incidencias durante la campaña. Todas fueron documentadas y comunicadas al equipo supervisor.`,
    }},
    { id:"conclusions", title:"Conclusiones", editable:["conclusions","recommendations"], data:{
      conclusions:`La campaña "${campaign.name}" se ejecutó con un nivel de cumplimiento del ${completionPct}%. El equipo evidenció un alto nivel de profesionalismo y capacidad de respuesta ante las incidencias reportadas.`,
      recommendations:`• Mantener comunicación constante con los puntos de venta.\n• Reforzar capacitación en puntos con incidencias.\n• Considerar ampliación de cobertura para la próxima fase.`,
    }},
  ];
};

// ─── Logo TGS (wordmark) e isotipo en HTML, reutilizable en preview ───────────
const TgsWordmark = ({ onDark }) => (
  <div>
    <div style={{ fontFamily:f.d, fontWeight:900, fontSize:20, letterSpacing:1.5, color:R.brand, lineHeight:1 }}>TGS</div>
    <div style={{ fontSize:7.5, letterSpacing:0.5, color:onDark ? R.onBlackSoft : R.inkSoft, marginTop:2 }}>trade marketing multicanal</div>
  </div>
);

// ─── Slide preview (refleja el PPTX) ──────────────────────────────────────────
const SlidePreview = ({ slide, index, total, client, assets, onEdit }) => {
  const d = slide.data;
  const dark = slide.id === "cover" || slide.id === "conclusions";
  const ClientLogo = ({ chip }) => {
    if (assets.clientLogo) return (
      <div style={{ background:chip ? "#fff" : "transparent", borderRadius:8, padding:chip ? "6px 10px" : 0, maxWidth:140, maxHeight:48, display:"flex", alignItems:"center" }}>
        <img src={assets.clientLogo} alt={client} style={{ maxWidth:120, maxHeight:36, objectFit:"contain" }} />
      </div>
    );
    return <div style={{ fontSize:11, fontWeight:800, letterSpacing:0.5, color:dark ? R.onBlack : R.inkSoft, textTransform:"uppercase" }}>{client}</div>;
  };

  const Header = () => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
      <TgsWordmark onDark={dark} />
      <ClientLogo />
    </div>
  );
  const Title = ({ text, onDark }) => (
    <>
      <div style={{ fontFamily:f.d, fontWeight:900, fontSize:21, color:onDark ? R.onBlack : R.ink, marginTop:8 }}>{text}</div>
      <div style={{ width:46, height:3, background:R.brand, borderRadius:2, marginTop:7, marginBottom:16 }} />
    </>
  );

  const body = () => {
    switch (slide.id) {
      case "cover":
        return (
          <div style={{ height:"100%", display:"flex", flexDirection:"column", padding:"34px 40px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              {assets.tgsLogo ? <img src={assets.tgsLogo} alt="TGS" style={{ height:54, objectFit:"contain" }} /> : <TgsWordmark onDark />}
              <ClientLogo chip />
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
              <div style={{ fontSize:12, fontWeight:800, letterSpacing:3, color:R.brand, marginBottom:14 }}>● {d.type?.toUpperCase()}</div>
              <div style={{ fontFamily:f.d, fontSize:40, fontWeight:900, color:R.onBlack, lineHeight:1.05 }}>{d.client}</div>
              <div style={{ fontFamily:f.d, fontSize:21, fontWeight:700, color:R.brand, marginTop:8 }}>{d.campaignName}</div>
              <div style={{ width:64, height:4, background:R.brand, borderRadius:2, margin:"18px 0 12px" }} />
              <div style={{ fontSize:13, color:R.onBlackSoft }}>{d.dates}</div>
            </div>
            <div style={{ fontSize:10, color:R.onBlackSoft, fontStyle:"italic", cursor:"pointer" }} onClick={() => onEdit("footer")}>{d.footer}</div>
          </div>
        );
      case "summary":
        return (
          <div style={{ padding:"22px 30px", height:"100%", boxSizing:"border-box" }}>
            <Header /><Title text="Resumen Ejecutivo" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
              {[["Aprobados", d.approved, R.green],["Pendientes", d.pending, R.orange],["Rechazados", d.rejected, R.red],["Avance", d.completionPct + "%", R.brandDk]].map(([label, val, col]) => (
                <div key={label} style={{ background:R.panel, border:`1px solid ${R.line}`, borderRadius:10, padding:"14px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:900, fontFamily:f.d, color:col }}>{val}</div>
                  <div style={{ fontSize:9.5, color:R.inkSoft, fontWeight:700, marginTop:2, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:R.ink, lineHeight:1.7, cursor:"pointer", borderLeft:`3px solid ${R.brand}`, paddingLeft:14 }} onClick={() => onEdit("narrative")}>{d.narrative}</div>
          </div>
        );
      case "team":
        return (
          <div style={{ padding:"22px 30px", height:"100%", boxSizing:"border-box" }}>
            <Header /><Title text="Equipo de Campo" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {d.members.map((m, i) => (
                <div key={i} style={{ background:R.panel, border:`1px solid ${R.line}`, borderRadius:8, padding:"10px 12px", borderLeft:`3px solid ${R.brand}` }}>
                  <div style={{ fontWeight:700, fontSize:13, color:R.ink }}>{m.name}</div>
                  <div style={{ fontSize:10, color:R.inkSoft, marginTop:2 }}>{m.comuna} · {m.role}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:11, color:R.inkSoft, cursor:"pointer", fontStyle:"italic" }} onClick={() => onEdit("teamNote")}>{d.teamNote}</div>
          </div>
        );
      case "results":
        return (
          <div style={{ padding:"22px 30px", height:"100%", boxSizing:"border-box" }}>
            <Header /><Title text="Resultados por Punto" />
            <div style={{ overflowY:"auto", maxHeight:150 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr style={{ background:R.panel }}>
                  {["Punto","Ejecutor","Fecha","Cant.","Incid."].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"7px 8px", color:R.inkSoft, fontWeight:700, fontSize:9, letterSpacing:0.5, textTransform:"uppercase", borderBottom:`2px solid ${R.brand}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{d.points.slice(0, 8).map((p, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${R.line}` }}>
                    <td style={{ padding:"6px 8px", fontWeight:600, color:R.ink }}>{p.name}</td>
                    <td style={{ padding:"6px 8px", color:R.inkSoft }}>{p.user}</td>
                    <td style={{ padding:"6px 8px", color:R.inkSoft }}>{p.date}</td>
                    <td style={{ padding:"6px 8px", color:R.brandDk, fontWeight:700 }}>{p.qty}</td>
                    <td style={{ padding:"6px 8px", color:p.issues === "Sí" ? R.red : R.green, fontWeight:600 }}>{p.issues}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ fontSize:11, color:R.inkSoft, marginTop:10, cursor:"pointer" }} onClick={() => onEdit("resultsNote")}>{d.resultsNote}</div>
          </div>
        );
      case "issues":
        return (
          <div style={{ padding:"22px 30px", height:"100%", boxSizing:"border-box" }}>
            <Header /><Title text="Incidencias" />
            {d.incidents.length === 0
              ? <div style={{ textAlign:"center", padding:"28px", color:R.green, fontWeight:700, fontSize:14, background:R.panel, borderRadius:10 }}>Sin incidencias reportadas</div>
              : <div style={{ maxHeight:150, overflowY:"auto" }}>{d.incidents.map((inc, i) => (
                  <div key={i} style={{ background:R.panel, borderLeft:`3px solid ${R.red}`, borderRadius:6, padding:"8px 12px", marginBottom:6 }}>
                    <div style={{ fontWeight:700, fontSize:12, color:R.ink }}>{inc.point} <span style={{ color:R.inkSoft, fontWeight:500 }}>· {inc.user}</span></div>
                    <div style={{ fontSize:11, color:R.ink, marginTop:3 }}>{inc.note}</div>
                  </div>
                ))}</div>}
            <div style={{ fontSize:11, color:R.inkSoft, marginTop:10, cursor:"pointer" }} onClick={() => onEdit("issuesSummary")}>{d.issuesSummary}</div>
          </div>
        );
      case "conclusions":
        return (
          <div style={{ padding:"30px 40px", height:"100%", boxSizing:"border-box" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <TgsWordmark onDark /><ClientLogo />
            </div>
            <Title text="Conclusiones y Recomendaciones" onDark />
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:800, color:R.brand, letterSpacing:1.5, marginBottom:6 }}>CONCLUSIONES</div>
              <div style={{ fontSize:12, lineHeight:1.7, color:R.onBlack, cursor:"pointer" }} onClick={() => onEdit("conclusions")}>{d.conclusions}</div>
            </div>
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:R.brand, letterSpacing:1.5, marginBottom:6 }}>RECOMENDACIONES</div>
              <div style={{ fontSize:12, lineHeight:1.8, color:R.onBlack, cursor:"pointer", whiteSpace:"pre-line" }} onClick={() => onEdit("recommendations")}>{d.recommendations}</div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div style={{ background:dark ? R.black : R.paper, borderRadius:12, aspectRatio:"16/9", position:"relative", overflow:"hidden", color:R.ink, fontFamily:f.b, boxShadow:"0 8px 30px rgba(0,0,0,0.35)" }}>
      {body()}
      {slide.id !== "cover" && (
        <div style={{ position:"absolute", bottom:10, right:14, fontSize:9, color:dark ? R.onBlackSoft : R.inkSoft, fontWeight:600 }}>
          {String(index).padStart(2, "0")} / {String(total - 1).padStart(2, "0")}
        </div>
      )}
    </div>
  );
};

// ─── PPTX export (diseño híbrido corporativo) ─────────────────────────────────
const exportToPPT = async (slides, campaignName, client, assets) => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name:"W", width:13.33, height:7.5 });
  pptx.layout = "W";
  pptx.author = "TGS Trade Marketing Multicanal";
  pptx.title = `${client} — ${campaignName}`;
  const total = slides.length - 1; // páginas internas numeradas

  // Encabezado común para slides claras
  const lightHeader = (s, title, pageIdx) => {
    s.addText("TGS", { x:0.6, y:0.38, w:2, h:0.4, fontSize:20, bold:true, color:hx(R.brand), fontFace:"Arial" });
    s.addText("trade marketing multicanal", { x:0.62, y:0.78, w:3, h:0.2, fontSize:7.5, color:hx(R.inkSoft), fontFace:"Arial" });
    if (assets.clientLogo) s.addImage({ data:assets.clientLogo, x:11.0, y:0.38, w:1.73, h:0.7, sizing:{ type:"contain", w:1.73, h:0.7 } });
    else s.addText((client || "").toUpperCase(), { x:8.5, y:0.45, w:4.23, h:0.4, fontSize:11, bold:true, color:hx(R.inkSoft), align:"right" });
    s.addText(title, { x:0.6, y:1.25, w:12, h:0.55, fontSize:26, bold:true, color:hx(R.ink), fontFace:"Arial" });
    s.addShape(pptx.ShapeType.rect, { x:0.62, y:1.92, w:1.3, h:0.06, fill:{ color:hx(R.brand) } });
    s.addText(`${String(pageIdx).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, { x:11.4, y:6.95, w:1.33, h:0.3, fontSize:9, color:hx(R.inkSoft), align:"right" });
    s.addText(`${client} · ${campaignName}`, { x:0.6, y:6.95, w:9, h:0.3, fontSize:8, color:hx(R.inkSoft) });
  };

  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    const d = slide.data;

    if (slide.id === "cover") {
      s.background = { color:hx(R.black) };
      if (assets.tgsLogo) s.addImage({ data:assets.tgsLogo, x:0.6, y:0.55, w:3.3, h:1.5, sizing:{ type:"contain", w:3.3, h:1.5 } });
      else s.addText("TGS", { x:0.6, y:0.6, w:3, h:1, fontSize:44, bold:true, color:hx(R.brand) });
      if (assets.clientLogo) {
        s.addShape(pptx.ShapeType.roundRect, { x:10.2, y:0.55, w:2.5, h:1.2, fill:{ color:"FFFFFF" }, rectRadius:0.08 });
        s.addImage({ data:assets.clientLogo, x:10.4, y:0.72, w:2.1, h:0.86, sizing:{ type:"contain", w:2.1, h:0.86 } });
      }
      s.addText(`● ${(d.type || "").toUpperCase()}`, { x:0.65, y:3.05, w:11, h:0.4, fontSize:14, bold:true, color:hx(R.brand), charSpacing:3 });
      s.addText(d.client || "", { x:0.6, y:3.5, w:12, h:1, fontSize:42, bold:true, color:"FFFFFF", fontFace:"Arial" });
      s.addText(d.campaignName || "", { x:0.62, y:4.6, w:12, h:0.6, fontSize:22, color:hx(R.brand), fontFace:"Arial" });
      s.addShape(pptx.ShapeType.rect, { x:0.64, y:5.35, w:2.4, h:0.06, fill:{ color:hx(R.brand) } });
      s.addText(d.dates || "", { x:0.6, y:5.55, w:11, h:0.4, fontSize:13, color:hx(R.onBlackSoft) });
      s.addText(d.footer || "", { x:0.6, y:6.95, w:12, h:0.3, fontSize:10, italic:true, color:hx(R.onBlackSoft) });
      return;
    }

    if (slide.id === "conclusions") {
      s.background = { color:hx(R.black) };
      s.addText("TGS", { x:0.6, y:0.38, w:2, h:0.4, fontSize:20, bold:true, color:hx(R.brand) });
      s.addText("trade marketing multicanal", { x:0.62, y:0.78, w:3, h:0.2, fontSize:7.5, color:hx(R.onBlackSoft) });
      if (assets.clientLogo) {
        s.addShape(pptx.ShapeType.roundRect, { x:11.0, y:0.36, w:1.85, h:0.8, fill:{ color:"FFFFFF" }, rectRadius:0.06 });
        s.addImage({ data:assets.clientLogo, x:11.12, y:0.46, w:1.6, h:0.6, sizing:{ type:"contain", w:1.6, h:0.6 } });
      }
      s.addText("Conclusiones y Recomendaciones", { x:0.6, y:1.3, w:12, h:0.55, fontSize:26, bold:true, color:"FFFFFF" });
      s.addShape(pptx.ShapeType.rect, { x:0.62, y:1.97, w:1.3, h:0.06, fill:{ color:hx(R.brand) } });
      s.addText("CONCLUSIONES", { x:0.6, y:2.4, w:12, h:0.3, fontSize:11, bold:true, color:hx(R.brand), charSpacing:2 });
      s.addText(d.conclusions || "", { x:0.6, y:2.8, w:12, h:1.4, fontSize:13, color:"FFFFFF", lineSpacing:22 });
      s.addText("RECOMENDACIONES", { x:0.6, y:4.5, w:12, h:0.3, fontSize:11, bold:true, color:hx(R.brand), charSpacing:2 });
      s.addText(d.recommendations || "", { x:0.6, y:4.9, w:12, h:1.6, fontSize:13, color:"FFFFFF", lineSpacing:24 });
      s.addText(`${String(idx).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, { x:11.4, y:6.95, w:1.33, h:0.3, fontSize:9, color:hx(R.onBlackSoft), align:"right" });
      return;
    }

    // Slides claras
    s.background = { color:"FFFFFF" };
    lightHeader(s, slide.title, idx);

    if (slide.id === "summary") {
      const kpis = [
        { label:"Aprobados", val:String(d.approved), col:hx(R.green) },
        { label:"Pendientes", val:String(d.pending), col:hx(R.orange) },
        { label:"Rechazados", val:String(d.rejected), col:hx(R.red) },
        { label:"Avance", val:d.completionPct + "%", col:hx(R.brandDk) },
      ];
      const cardW = 2.92, gap = 0.18, startX = 0.6;
      kpis.forEach((k, i) => {
        const x = startX + i * (cardW + gap);
        s.addShape(pptx.ShapeType.roundRect, { x, y:2.35, w:cardW, h:1.6, fill:{ color:hx(R.panel) }, line:{ color:hx(R.line), width:1 }, rectRadius:0.08 });
        s.addShape(pptx.ShapeType.rect, { x, y:2.35, w:cardW, h:0.08, fill:{ color:k.col } });
        s.addText(k.val, { x, y:2.65, w:cardW, h:0.8, fontSize:36, bold:true, color:k.col, align:"center", fontFace:"Arial" });
        s.addText(k.label.toUpperCase(), { x, y:3.5, w:cardW, h:0.3, fontSize:10, bold:true, color:hx(R.inkSoft), align:"center", charSpacing:1 });
      });
      s.addShape(pptx.ShapeType.rect, { x:0.6, y:4.45, w:0.06, h:1.6, fill:{ color:hx(R.brand) } });
      s.addText(d.narrative || "", { x:0.85, y:4.5, w:11.6, h:1.6, fontSize:13, color:hx(R.ink), lineSpacing:24 });
    } else if (slide.id === "team") {
      (d.members || []).slice(0, 12).forEach((m, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 0.6 + col * 6.15, y = 2.3 + row * 0.78;
        s.addShape(pptx.ShapeType.roundRect, { x, y, w:5.95, h:0.66, fill:{ color:hx(R.panel) }, line:{ color:hx(R.line), width:1 }, rectRadius:0.05 });
        s.addShape(pptx.ShapeType.rect, { x, y, w:0.07, h:0.66, fill:{ color:hx(R.brand) } });
        s.addText(m.name, { x:x + 0.2, y:y + 0.06, w:5.6, h:0.3, fontSize:13, bold:true, color:hx(R.ink) });
        s.addText(`${m.comuna} · ${m.role}`, { x:x + 0.2, y:y + 0.36, w:5.6, h:0.25, fontSize:10, color:hx(R.inkSoft) });
      });
      s.addText(d.teamNote || "", { x:0.6, y:6.45, w:12, h:0.4, fontSize:10, italic:true, color:hx(R.inkSoft) });
    } else if (slide.id === "results") {
      const head = ["Punto","Ejecutor","Fecha","Cant.","Incid."].map(t => ({ text:t, options:{ bold:true, fontSize:9, color:hx(R.inkSoft), fill:{ color:hx(R.panel) }, valign:"middle" } }));
      const rows = [head, ...(d.points || []).slice(0, 11).map(p => [
        { text:p.name, options:{ fontSize:10, color:hx(R.ink) } },
        { text:p.user, options:{ fontSize:10, color:hx(R.inkSoft) } },
        { text:p.date, options:{ fontSize:10, color:hx(R.inkSoft) } },
        { text:String(p.qty), options:{ fontSize:10, bold:true, color:hx(R.brandDk) } },
        { text:p.issues, options:{ fontSize:10, color:p.issues === "Sí" ? hx(R.red) : hx(R.green) } },
      ])];
      s.addTable(rows, { x:0.6, y:2.25, w:12.1, colW:[4.6, 3.2, 2.3, 1.0, 1.0], border:{ type:"solid", pt:0.5, color:hx(R.line) }, rowH:0.34, valign:"middle", margin:[2, 4, 2, 4] });
      s.addText(d.resultsNote || "", { x:0.6, y:6.5, w:12, h:0.4, fontSize:10, color:hx(R.inkSoft) });
    } else if (slide.id === "issues") {
      if (!d.incidents?.length) {
        s.addShape(pptx.ShapeType.roundRect, { x:0.6, y:2.6, w:12.1, h:1.2, fill:{ color:hx(R.panel) }, rectRadius:0.08 });
        s.addText("Sin incidencias reportadas", { x:0.6, y:2.9, w:12.1, h:0.6, fontSize:16, bold:true, color:hx(R.green), align:"center" });
      } else {
        d.incidents.slice(0, 6).forEach((inc, i) => {
          const y = 2.3 + i * 0.74;
          s.addShape(pptx.ShapeType.roundRect, { x:0.6, y, w:12.1, h:0.64, fill:{ color:hx(R.panel) }, rectRadius:0.05 });
          s.addShape(pptx.ShapeType.rect, { x:0.6, y, w:0.07, h:0.64, fill:{ color:hx(R.red) } });
          s.addText([{ text:`${inc.point}  `, options:{ bold:true, color:hx(R.ink), fontSize:11 } }, { text:`· ${inc.user}`, options:{ color:hx(R.inkSoft), fontSize:10 } }], { x:0.8, y:y + 0.05, w:11.7, h:0.28 });
          s.addText(inc.note, { x:0.8, y:y + 0.33, w:11.7, h:0.26, fontSize:10, color:hx(R.ink) });
        });
      }
      s.addText(d.issuesSummary || "", { x:0.6, y:6.5, w:12, h:0.4, fontSize:10, color:hx(R.inkSoft) });
    }
  });

  await pptx.writeFile({ fileName:`TGS_${client}_${campaignName}.pptx`.replace(/[^\w.\-]/g, "_") });
};

// ─── AI Assistant Panel (refinado de textos, sin API) ─────────────────────────
const AIPanel = ({ slide, onApply }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const suggestions = ["Hazlo más profesional", "Resume en 2 líneas", "Más positivo para el cliente", "Agrega más detalle"];

  const generate = (userPrompt) => {
    setLoading(true);
    const fields = slide.editable || [];
    const result = {};
    fields.forEach(field => {
      const current = slide.data[field] || "";
      const p = userPrompt.toLowerCase();
      if (p.includes("resume") || p.includes("corto") || p.includes("breve")) result[field] = current.split(". ").slice(0, 2).join(". ") + ".";
      else if (p.includes("profesional") || p.includes("corporativ")) result[field] = current.replace(/se ejecutó/g, "fue ejecutada exitosamente").replace(/alcanzó/g, "logró satisfactoriamente").replace(/demostró/g, "evidenció un alto nivel de");
      else if (p.includes("positiv") || p.includes("cliente")) result[field] = current.replace(/incidencias/g, "oportunidades de mejora").replace(/problemas/g, "áreas de oportunidad");
      else if (p.includes("detalle") || p.includes("info")) result[field] = current + " Se implementaron protocolos de seguimiento en cada punto, garantizando la calidad del servicio.";
      else result[field] = current + ` ${userPrompt}`;
    });
    setTimeout(() => { onApply(result); setLoading(false); setPrompt(""); }, 500);
  };

  return (
    <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, padding:14 }}>
      <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:8 }}>Editar textos de "{slide.title}"</div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>Hacé click en cualquier texto de la slide para editarlo a mano, o usá un atajo:</div>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
        {suggestions.map((sug, i) => (
          <button key={i} onClick={() => generate(sug)} disabled={loading}
            style={{ padding:"4px 10px", borderRadius:16, border:`1px solid ${C.border}`, background:"transparent", color:C.text, fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:f.b }}>{sug}</button>
        ))}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe qué cambiar…"
          onKeyDown={e => e.key === "Enter" && prompt.trim() && generate(prompt)}
          style={{ flex:1, background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", color:C.text, fontFamily:f.b, fontSize:12, outline:"none" }} />
        <button onClick={() => prompt.trim() && generate(prompt)} disabled={loading || !prompt.trim()}
          style={{ padding:"8px 16px", borderRadius:8, border:"none", background:R.brand, color:C.bg, fontSize:12, fontWeight:700, cursor:"pointer", opacity:loading || !prompt.trim() ? 0.4 : 1 }}>{loading ? "…" : "Aplicar"}</button>
      </div>
    </div>
  );
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ field, value, onSave, onClose }) => {
  const [text, setText] = useState(value);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24, width:"100%", maxWidth:500 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:16, fontFamily:f.d, color:C.text }}>Editar texto</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:20, cursor:"pointer" }}>×</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)} autoFocus
          style={{ width:"100%", minHeight:150, background:C.surfaceHi, border:`1px solid ${C.border}`, borderRadius:10, padding:14, color:C.text, fontFamily:f.b, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box" }} />
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.muted, fontWeight:700, cursor:"pointer", fontFamily:f.b }}>Cancelar</button>
          <button onClick={() => { onSave(text); onClose(); }} style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:R.brand, color:C.bg, fontWeight:700, cursor:"pointer", fontFamily:f.b }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Report Component ────────────────────────────────────────────────────
export default function ClientReport({ campaign, reports, workers, clients = [], onClose }) {
  const [slides, setSlides] = useState(() => buildSlides(campaign, reports, workers));
  const [activeSlide, setActiveSlide] = useState(0);
  const [editField, setEditField] = useState(null);
  const [assets, setAssets] = useState({ tgsLogo:null, clientLogo:null });
  const [exporting, setExporting] = useState(false);

  // Cargar logos (TGS local + cliente desde Supabase) como data URLs
  useEffect(() => {
    let alive = true;
    const client = clients.find(c => c.id === campaign.client_id || c.name === campaign.client);
    toDataURL("/brand/tgs-logo-tagline.jpg").then(d => alive && setAssets(a => ({ ...a, tgsLogo:d }))).catch(() => {});
    if (client?.logo_url) toDataURL(client.logo_url).then(d => alive && setAssets(a => ({ ...a, clientLogo:d }))).catch(() => {});
    return () => { alive = false; };
  }, [campaign.client_id, campaign.client, clients]);

  const updateSlideData = (idx, patch) => setSlides(prev => prev.map((s, i) => i === idx ? { ...s, data:{ ...s.data, ...patch } } : s));
  const download = async () => {
    setExporting(true);
    try { await exportToPPT(slides, campaign.name, campaign.client, assets); }
    catch (e) { alert("No se pudo generar el PPT: " + (e.message || e)); }
    finally { setExporting(false); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:50, fontFamily:f.b, color:C.text, display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 20px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onClose} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:"6px 12px", cursor:"pointer", fontFamily:f.b, fontWeight:700, fontSize:13 }}>← Volver</button>
          <div>
            <div style={{ fontFamily:f.d, fontWeight:900, fontSize:16 }}>Reporte para cliente</div>
            <div style={{ fontSize:11, color:C.muted }}>{campaign.client} — {campaign.name}</div>
          </div>
        </div>
        <button onClick={download} disabled={exporting}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 20px", borderRadius:10, border:"none", background:R.brand, color:C.bg, fontWeight:700, fontSize:13, cursor:exporting ? "wait" : "pointer", opacity:exporting ? 0.6 : 1, fontFamily:f.b }}>
          {exporting ? "Generando…" : "Descargar PPT"}
        </button>
      </div>

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <div style={{ width:160, borderRight:`1px solid ${C.border}`, overflowY:"auto", padding:"12px 8px", flexShrink:0 }}>
          {slides.map((s, i) => (
            <div key={s.id} onClick={() => setActiveSlide(i)}
              style={{ padding:"8px 10px", borderRadius:8, marginBottom:4, cursor:"pointer", background:i === activeSlide ? R.brand + "22" : "transparent", border:`1px solid ${i === activeSlide ? R.brand + "66" : "transparent"}` }}>
              <div style={{ fontSize:9, color:C.muted, marginBottom:2 }}>Slide {i + 1}</div>
              <div style={{ fontSize:11, fontWeight:700, color:i === activeSlide ? R.brand : C.text }}>{s.title}</div>
            </div>
          ))}
        </div>

        <div style={{ flex:1, padding:24, display:"flex", flexDirection:"column", gap:16, overflowY:"auto" }}>
          <SlidePreview slide={slides[activeSlide]} index={activeSlide} total={slides.length} client={campaign.client} assets={assets} onEdit={setEditField} />
          <AIPanel slide={slides[activeSlide]} onApply={(patch) => updateSlideData(activeSlide, patch)} />
        </div>
      </div>

      {editField && (
        <EditModal field={editField} value={slides[activeSlide].data[editField] || ""}
          onSave={(val) => updateSlideData(activeSlide, { [editField]:val })} onClose={() => setEditField(null)} />
      )}
    </div>
  );
}
