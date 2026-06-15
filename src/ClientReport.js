import { useState, useRef } from "react";
import PptxGenJS from "pptxgenjs";

// ─── Design tokens (match App.js) ────────────────────────────────────────────
const C = {
  bg:"#07111C", surface:"#0D1E2E", surfaceHi:"#132840", border:"#1E3550",
  text:"#E4EDF6", muted:"#6B8BAA",
  impl:"#F5A623", promo:"#00C9A7", mec:"#A78BFA",
  green:"#2ECC71", red:"#E84C4C", blue:"#4A9EFF", orange:"#F97316",
};
const f = { d:"'Syne','DM Sans',sans-serif", b:"'DM Sans','Segoe UI',sans-serif" };
const VERTICALS = {
  impl:  {label:"Implementación POP", icon:"🔧", color:C.impl},
  promo: {label:"Activaciones & Promo", icon:"🎪", color:C.promo},
  mec:   {label:"Mecanización", icon:"⚙️", color:C.mec},
};

// ─── Slide templates ─────────────────────────────────────────────────────────
const buildSlides = (campaign, reports, workers) => {
  const vt = VERTICALS[campaign.type] || VERTICALS.impl;
  const approved = reports.filter(r => r.campaignId === campaign.id && r.status === "approved");
  const pending = reports.filter(r => r.campaignId === campaign.id && r.status === "pending");
  const rejected = reports.filter(r => r.campaignId === campaign.id && r.status === "rejected");
  const teamWorkers = (campaign.team || []).map(name => workers.find(w => w.name === name)).filter(Boolean);
  const totalPoints = campaign.stores || campaign.points || campaign.totalUnits || 0;
  const completionPct = totalPoints ? Math.round((approved.length / totalPoints) * 100) : 0;

  return [
    // ── Slide 0: Portada ──
    {
      id: "cover",
      title: "Portada",
      editable: ["subtitle", "footer"],
      data: {
        campaignName: campaign.name,
        client: campaign.client,
        type: vt.label,
        typeIcon: vt.icon,
        color: vt.color,
        dates: `${campaign.dateStart || "?"} — ${campaign.dateEnd || "?"}`,
        subtitle: `Reporte de campaña ${vt.label}`,
        footer: "Documento confidencial — TGS Field Operations",
      },
    },
    // ── Slide 1: Resumen ejecutivo ──
    {
      id: "summary",
      title: "Resumen Ejecutivo",
      editable: ["narrative"],
      data: {
        totalReports: reports.filter(r => r.campaignId === campaign.id).length,
        approved: approved.length,
        pending: pending.length,
        rejected: rejected.length,
        completionPct,
        totalPoints,
        teamSize: (campaign.team || []).length,
        narrative: `La campaña "${campaign.name}" para ${campaign.client} alcanzó un ${completionPct}% de avance con ${approved.length} reportes aprobados de ${totalPoints} puntos planificados. El equipo de ${(campaign.team || []).length} personas ejecutó las actividades entre ${campaign.dateStart || "?"} y ${campaign.dateEnd || "?"}.`,
        color: vt.color,
      },
    },
    // ── Slide 2: Equipo ──
    {
      id: "team",
      title: "Equipo de Campo",
      editable: ["teamNote"],
      data: {
        members: teamWorkers.map(w => ({
          name: w.name,
          role: (w.roles || [])[0] || "—",
          comuna: w.comuna || "—",
          phone: w.phone || "—",
        })),
        teamNote: `Equipo de ${teamWorkers.length} profesionales distribuidos estratégicamente para cubrir los puntos asignados.`,
        color: vt.color,
      },
    },
    // ── Slide 3: Resultados por punto ──
    {
      id: "results",
      title: "Resultados por Punto",
      editable: ["resultsNote"],
      data: {
        points: approved.map(r => ({
          name: r.store || r.point || r.location || "—",
          user: r.user || "—",
          date: r.date || "—",
          qty: r.qty || r.contacts || r.units || 0,
          issues: r.issues ? "Sí" : "No",
          signed: r.signed ? "✓" : "—",
        })),
        resultsNote: `Se completaron ${approved.length} puntos exitosamente. ${approved.filter(r => r.issues).length} reportaron incidencias que fueron gestionadas.`,
        color: vt.color,
      },
    },
    // ── Slide 4: Incidencias ──
    {
      id: "issues",
      title: "Incidencias y Observaciones",
      editable: ["issuesSummary"],
      data: {
        incidents: reports
          .filter(r => r.campaignId === campaign.id && (r.issues || r.popOk === false))
          .map(r => ({
            point: r.store || r.point || r.location || "—",
            user: r.user || "—",
            note: r.issueNote || r.popNote || "Sin detalle",
          })),
        issuesSummary: `Se registraron ${reports.filter(r => r.campaignId === campaign.id && r.issues).length} incidencias durante la campaña. Todas fueron documentadas y comunicadas al equipo supervisor.`,
        color: vt.color,
      },
    },
    // ── Slide 5: Conclusiones ──
    {
      id: "conclusions",
      title: "Conclusiones y Recomendaciones",
      editable: ["conclusions", "recommendations"],
      data: {
        conclusions: `La campaña "${campaign.name}" se ejecutó con un nivel de cumplimiento del ${completionPct}%. El equipo demostró profesionalismo y capacidad de respuesta ante las incidencias reportadas.`,
        recommendations: `• Mantener comunicación constante con los puntos de venta\n• Reforzar capacitación en puntos con incidencias\n• Considerar ampliación de cobertura para la próxima fase`,
        color: vt.color,
      },
    },
  ];
};

// ─── Slide Preview Components ────────────────────────────────────────────────
const SlidePreview = ({ slide, onEdit }) => {
  const d = slide.data;
  const accent = d.color || C.impl;

  const renderContent = () => {
    switch (slide.id) {
      case "cover":
        return (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", background: `linear-gradient(135deg, ${accent}15, #0a1520)`, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, color: accent, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>{d.typeIcon} {d.type?.toUpperCase()}</div>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: f.d, marginBottom: 6 }}>{d.client}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: f.d, color: accent }}>{d.campaignName}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 12 }}>{d.dates}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 20, fontStyle: "italic", cursor: "pointer" }} onClick={() => onEdit("subtitle")}>{d.subtitle}</div>
            <div style={{ fontSize: 10, color: C.muted, position: "absolute", bottom: 16, cursor: "pointer" }} onClick={() => onEdit("footer")}>{d.footer}</div>
          </div>
        );
      case "summary":
        return (
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: f.d, marginBottom: 16, borderBottom: `2px solid ${accent}`, paddingBottom: 8 }}>Resumen Ejecutivo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[["Aprobados", d.approved, C.green], ["Pendientes", d.pending, C.orange], ["Rechazados", d.rejected, C.red], ["Avance", d.completionPct + "%", accent]].map(([label, val, col]) => (
                <div key={label} style={{ textAlign: "center", background: col + "15", borderRadius: 10, padding: "12px 8px" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, fontFamily: f.d, color: col }}>{val}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, cursor: "pointer", background: C.surfaceHi, borderRadius: 8, padding: 14 }} onClick={() => onEdit("narrative")}>{d.narrative}</div>
          </div>
        );
      case "team":
        return (
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: f.d, marginBottom: 16, borderBottom: `2px solid ${accent}`, paddingBottom: 8 }}>Equipo de Campo</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {d.members.map((m, i) => (
                <div key={i} style={{ background: C.surfaceHi, borderRadius: 8, padding: "10px 12px", borderLeft: `3px solid ${accent}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>📍 {m.comuna} · {m.role}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, cursor: "pointer" }} onClick={() => onEdit("teamNote")}>{d.teamNote}</div>
          </div>
        );
      case "results":
        return (
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: f.d, marginBottom: 16, borderBottom: `2px solid ${accent}`, paddingBottom: 8 }}>Resultados por Punto</div>
            <div style={{ overflowY: "auto", maxHeight: 180 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Punto", "Ejecutor", "Fecha", "Cant.", "Incid.", "Firma"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: C.muted, fontWeight: 700, fontSize: 9, letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{d.points.map((p, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "5px 8px", fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: "5px 8px", color: C.muted }}>{p.user}</td>
                    <td style={{ padding: "5px 8px", color: C.muted }}>{p.date}</td>
                    <td style={{ padding: "5px 8px", color: accent, fontWeight: 700 }}>{p.qty}</td>
                    <td style={{ padding: "5px 8px", color: p.issues === "Sí" ? C.red : C.green }}>{p.issues}</td>
                    <td style={{ padding: "5px 8px" }}>{p.signed}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 10, cursor: "pointer" }} onClick={() => onEdit("resultsNote")}>{d.resultsNote}</div>
          </div>
        );
      case "issues":
        return (
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: f.d, marginBottom: 16, borderBottom: `2px solid ${C.red}`, paddingBottom: 8 }}>Incidencias</div>
            {d.incidents.length === 0
              ? <div style={{ textAlign: "center", padding: 30, color: C.green }}>✅ Sin incidencias reportadas</div>
              : d.incidents.map((inc, i) => (
                <div key={i} style={{ background: C.red + "10", border: `1px solid ${C.red}22`, borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{inc.point}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{inc.user}</div>
                  <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{inc.note}</div>
                </div>
              ))}
            <div style={{ fontSize: 11, color: C.muted, marginTop: 10, cursor: "pointer" }} onClick={() => onEdit("issuesSummary")}>{d.issuesSummary}</div>
          </div>
        );
      case "conclusions":
        return (
          <div style={{ padding: 30 }}>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: f.d, marginBottom: 16, borderBottom: `2px solid ${accent}`, paddingBottom: 8 }}>Conclusiones y Recomendaciones</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>CONCLUSIONES</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, cursor: "pointer", background: C.surfaceHi, borderRadius: 8, padding: 12 }} onClick={() => onEdit("conclusions")}>{d.conclusions}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>RECOMENDACIONES</div>
              <div style={{ fontSize: 12, lineHeight: 1.7, cursor: "pointer", background: C.surfaceHi, borderRadius: 8, padding: 12, whiteSpace: "pre-line" }} onClick={() => onEdit("recommendations")}>{d.recommendations}</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, aspectRatio: "16/9", position: "relative", overflow: "hidden", color: C.text, fontFamily: f.b }}>
      {renderContent()}
      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 9, color: C.muted, background: C.surface + "cc", padding: "2px 8px", borderRadius: 6 }}>{slide.title}</div>
    </div>
  );
};

// ─── AI Assistant Panel ──────────────────────────────────────────────────────
const AIPanel = ({ slide, onApply }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions] = useState([
    "Hazlo más profesional y corporativo",
    "Agrega más detalle sobre los resultados",
    "Resume en 2 líneas",
    "Hazlo más positivo para el cliente",
    "Agrega métricas específicas",
  ]);

  const generateWithAI = async (userPrompt) => {
    setLoading(true);
    // Smart template-based generation (no API needed)
    const editableFields = slide.editable || [];
    const result = {};

    editableFields.forEach(field => {
      const current = slide.data[field] || "";
      const p = userPrompt.toLowerCase();

      if (p.includes("resume") || p.includes("corto") || p.includes("breve")) {
        result[field] = current.split(". ").slice(0, 2).join(". ") + ".";
      } else if (p.includes("profesional") || p.includes("corporativ")) {
        result[field] = current
          .replace(/se ejecutó/g, "fue ejecutada exitosamente")
          .replace(/alcanzó/g, "logró satisfactoriamente")
          .replace(/demostró/g, "evidenció un alto nivel de");
      } else if (p.includes("positiv") || p.includes("cliente")) {
        result[field] = current
          .replace(/incidencias/g, "oportunidades de mejora identificadas")
          .replace(/rechazado/g, "en revisión para optimización")
          .replace(/problemas/g, "áreas de oportunidad");
      } else if (p.includes("detalle") || p.includes("más info")) {
        result[field] = current + "\n\nSe implementaron protocolos de seguimiento en cada punto, garantizando la calidad del servicio y la satisfacción del cliente.";
      } else {
        // Default: apply the prompt as a refinement note
        result[field] = current + `\n\n[Nota: ${userPrompt}]`;
      }
    });

    setTimeout(() => {
      onApply(result);
      setLoading(false);
      setPrompt("");
    }, 800);
  };

  return (
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.blue}33`, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>Asistente AI</span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
        Edita la slide "{slide.title}" — click en el texto para editar manualmente o usa AI:
      </div>
      {/* Quick suggestions */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => generateWithAI(s)} disabled={loading}
            style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${C.blue}44`, background: "transparent", color: C.blue, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: f.b }}>
            {s}
          </button>
        ))}
      </div>
      {/* Custom prompt */}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe qué cambiar..."
          onKeyDown={e => e.key === "Enter" && prompt.trim() && generateWithAI(prompt)}
          style={{ flex: 1, background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontFamily: f.b, fontSize: 12, outline: "none" }} />
        <button onClick={() => prompt.trim() && generateWithAI(prompt)} disabled={loading || !prompt.trim()}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.blue, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: loading || !prompt.trim() ? 0.4 : 1 }}>
          {loading ? "..." : "✨"}
        </button>
      </div>
    </div>
  );
};

// ─── Edit Modal ──────────────────────────────────────────────────────────────
const EditModal = ({ field, value, onSave, onClose }) => {
  const [text, setText] = useState(value);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16, fontFamily: f.d }}>Editar: {field}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          style={{ width: "100%", minHeight: 150, background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, color: C.text, fontFamily: f.b, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: f.b }}>Cancelar</button>
          <button onClick={() => { onSave(text); onClose(); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: C.blue, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: f.b }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ─── PPT Export ──────────────────────────────────────────────────────────────
const exportToPPT = (slides, campaignName, client) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "TGS Field";
  pptx.title = `${client} — ${campaignName}`;

  slides.forEach(slide => {
    const s = pptx.addSlide();
    const d = slide.data;
    const accent = d.color || "#F5A623";

    s.background = { color: "07111C" };

    switch (slide.id) {
      case "cover":
        s.addText(d.type?.toUpperCase() || "", { x: 1, y: 1, w: 8, fontSize: 14, color: accent.replace("#", ""), align: "center", fontFace: "Arial" });
        s.addText(d.client || "", { x: 1, y: 2, w: 8, fontSize: 32, color: "E4EDF6", bold: true, align: "center", fontFace: "Arial" });
        s.addText(d.campaignName || "", { x: 1, y: 3, w: 8, fontSize: 22, color: accent.replace("#", ""), align: "center", fontFace: "Arial" });
        s.addText(d.dates || "", { x: 1, y: 4.2, w: 8, fontSize: 12, color: "6B8BAA", align: "center" });
        s.addText(d.subtitle || "", { x: 1, y: 5, w: 8, fontSize: 11, color: "6B8BAA", align: "center", italic: true });
        s.addText(d.footer || "", { x: 1, y: 6.5, w: 8, fontSize: 9, color: "6B8BAA", align: "center" });
        break;
      case "summary":
        s.addText("Resumen Ejecutivo", { x: 0.5, y: 0.3, w: 9, fontSize: 20, color: "E4EDF6", bold: true });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.75, w: 9, h: 0.03, fill: { color: accent.replace("#", "") } });
        const kpis = [
          { label: "Aprobados", val: String(d.approved), col: "2ECC71" },
          { label: "Pendientes", val: String(d.pending), col: "F97316" },
          { label: "Rechazados", val: String(d.rejected), col: "E84C4C" },
          { label: "Avance", val: d.completionPct + "%", col: accent.replace("#", "") },
        ];
        kpis.forEach((kpi, i) => {
          const x = 0.5 + i * 2.4;
          s.addShape(pptx.ShapeType.roundRect, { x, y: 1.1, w: 2.1, h: 1.2, fill: { color: kpi.col, transparency: 85 }, rectRadius: 0.1 });
          s.addText(kpi.val, { x, y: 1.15, w: 2.1, fontSize: 28, color: kpi.col, bold: true, align: "center" });
          s.addText(kpi.label, { x, y: 1.8, w: 2.1, fontSize: 10, color: "6B8BAA", align: "center" });
        });
        s.addText(d.narrative || "", { x: 0.5, y: 2.7, w: 9, fontSize: 11, color: "E4EDF6", lineSpacing: 22 });
        break;
      case "team":
        s.addText("Equipo de Campo", { x: 0.5, y: 0.3, w: 9, fontSize: 20, color: "E4EDF6", bold: true });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.75, w: 9, h: 0.03, fill: { color: accent.replace("#", "") } });
        (d.members || []).forEach((m, i) => {
          const col = Math.floor(i / 5);
          const row = i % 5;
          s.addText(`${m.name}\n📍 ${m.comuna} · ${m.role}`, { x: 0.5 + col * 4.8, y: 1.1 + row * 0.7, w: 4.4, fontSize: 10, color: "E4EDF6", lineSpacing: 16 });
        });
        s.addText(d.teamNote || "", { x: 0.5, y: 5.5, w: 9, fontSize: 10, color: "6B8BAA", italic: true });
        break;
      case "results":
        s.addText("Resultados por Punto", { x: 0.5, y: 0.3, w: 9, fontSize: 20, color: "E4EDF6", bold: true });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.75, w: 9, h: 0.03, fill: { color: accent.replace("#", "") } });
        const rows = [
          [{ text: "Punto", options: { bold: true, fontSize: 9, color: "6B8BAA" } }, { text: "Ejecutor", options: { bold: true, fontSize: 9, color: "6B8BAA" } }, { text: "Cant.", options: { bold: true, fontSize: 9, color: "6B8BAA" } }, { text: "Incid.", options: { bold: true, fontSize: 9, color: "6B8BAA" } }],
          ...(d.points || []).slice(0, 12).map(p => [
            { text: p.name, options: { fontSize: 9, color: "E4EDF6" } },
            { text: p.user, options: { fontSize: 9, color: "6B8BAA" } },
            { text: String(p.qty), options: { fontSize: 9, color: accent.replace("#", ""), bold: true } },
            { text: p.issues, options: { fontSize: 9, color: p.issues === "Sí" ? "E84C4C" : "2ECC71" } },
          ]),
        ];
        s.addTable(rows, { x: 0.5, y: 1.0, w: 9, colW: [3.5, 2.5, 1.5, 1.5], border: { type: "solid", pt: 0.5, color: "1E3550" }, rowH: 0.35 });
        s.addText(d.resultsNote || "", { x: 0.5, y: 6, w: 9, fontSize: 10, color: "6B8BAA" });
        break;
      case "issues":
        s.addText("Incidencias", { x: 0.5, y: 0.3, w: 9, fontSize: 20, color: "E4EDF6", bold: true });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.75, w: 9, h: 0.03, fill: { color: "E84C4C" } });
        if (!d.incidents?.length) {
          s.addText("✅ Sin incidencias reportadas", { x: 1, y: 2.5, w: 8, fontSize: 16, color: "2ECC71", align: "center" });
        } else {
          d.incidents.forEach((inc, i) => {
            s.addText(`${inc.point} (${inc.user}):\n${inc.note}`, { x: 0.5, y: 1.0 + i * 0.9, w: 9, fontSize: 10, color: "E4EDF6", lineSpacing: 16 });
          });
        }
        s.addText(d.issuesSummary || "", { x: 0.5, y: 5.5, w: 9, fontSize: 10, color: "6B8BAA" });
        break;
      case "conclusions":
        s.addText("Conclusiones y Recomendaciones", { x: 0.5, y: 0.3, w: 9, fontSize: 20, color: "E4EDF6", bold: true });
        s.addShape(pptx.ShapeType.rect, { x: 0.5, y: 0.75, w: 9, h: 0.03, fill: { color: accent.replace("#", "") } });
        s.addText("CONCLUSIONES", { x: 0.5, y: 1.0, w: 9, fontSize: 10, color: "6B8BAA", bold: true });
        s.addText(d.conclusions || "", { x: 0.5, y: 1.4, w: 9, fontSize: 11, color: "E4EDF6", lineSpacing: 20 });
        s.addText("RECOMENDACIONES", { x: 0.5, y: 3.0, w: 9, fontSize: 10, color: "6B8BAA", bold: true });
        s.addText(d.recommendations || "", { x: 0.5, y: 3.4, w: 9, fontSize: 11, color: "E4EDF6", lineSpacing: 20 });
        break;
      default: break;
    }
  });

  pptx.writeFile({ fileName: `TGS_${client}_${campaignName}.pptx` });
};

// ─── Main Report Component ───────────────────────────────────────────────────
export default function ClientReport({ campaign, reports, workers, onClose }) {
  const [slides, setSlides] = useState(() => buildSlides(campaign, reports, workers));
  const [activeSlide, setActiveSlide] = useState(0);
  const [editField, setEditField] = useState(null);

  const updateSlideData = (slideIdx, patch) => {
    setSlides(prev => prev.map((s, i) => i === slideIdx ? { ...s, data: { ...s.data, ...patch } } : s));
  };

  const handleEdit = (field) => {
    setEditField(field);
  };

  const vt = VERTICALS[campaign.type] || VERTICALS.impl;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 50, fontFamily: f.b, color: C.text, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: "6px 12px", cursor: "pointer", fontFamily: f.b, fontWeight: 700, fontSize: 13 }}>← Volver</button>
          <div>
            <div style={{ fontFamily: f.d, fontWeight: 900, fontSize: 16 }}>Reporte para cliente</div>
            <div style={{ fontSize: 11, color: C.muted }}>{campaign.client} — {campaign.name}</div>
          </div>
        </div>
        <button onClick={() => exportToPPT(slides, campaign.name, campaign.client)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none", background: vt.color, color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: f.b }}>
          📥 Descargar PPT
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Slide thumbnails */}
        <div style={{ width: 160, borderRight: `1px solid ${C.border}`, overflowY: "auto", padding: "12px 8px", flexShrink: 0 }}>
          {slides.map((s, i) => (
            <div key={s.id} onClick={() => setActiveSlide(i)}
              style={{ padding: "8px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: i === activeSlide ? vt.color + "22" : "transparent", border: `1px solid ${i === activeSlide ? vt.color + "66" : "transparent"}` }}>
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 2 }}>Slide {i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: i === activeSlide ? vt.color : C.text }}>{s.title}</div>
            </div>
          ))}
        </div>

        {/* Slide preview */}
        <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
          <SlidePreview slide={slides[activeSlide]} onEdit={handleEdit} />
          <AIPanel slide={slides[activeSlide]} onApply={(patch) => updateSlideData(activeSlide, patch)} />
        </div>
      </div>

      {/* Edit modal */}
      {editField && (
        <EditModal
          field={editField}
          value={slides[activeSlide].data[editField] || ""}
          onSave={(val) => updateSlideData(activeSlide, { [editField]: val })}
          onClose={() => setEditField(null)}
        />
      )}
    </div>
  );
}
