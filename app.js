const { useState, useEffect } = React;

const UNITS = ["PUA", "PUB", "PUC", "PUF", "PBF", "AHA", "AHB", "AHC"];

const EMPTY_PATIENT = {
  id: null,
  nomPrenom: "",
  date: "",
  nOrdonnance: "",
  nbreGTT: "",
  prochainFlacon: "",
  notes: "",
};

const ADMIN_IDS = ["ADMIN"]; // We'll use a password instead

function today() {
  return new Date().toISOString().split("T")[0];
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function FlaconBadge({ date }) {
  const d = getDaysUntil(date);
  if (d === null) return null;
  const s = {
    padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: d < 0 ? "#ef4444" : d === 0 ? "#f59e0b" : d <= 3 ? "rgba(251,191,36,0.2)" : "rgba(34,197,94,0.15)",
    color: d < 0 ? "#fff" : d === 0 ? "#000" : d <= 3 ? "#fbbf24" : "#4ade80",
    border: d <= 0 ? "none" : d <= 3 ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(34,197,94,0.2)",
  };
  const label = d < 0 ? `Retard ${Math.abs(d)}j` : d === 0 ? "Aujourd'hui" : d <= 3 ? `Dans ${d}j` : `${d}j`;
  return <span style={s}>{label}</span>;
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [activeUnit, setActiveUnit] = useState(UNITS[0]);
  const [showUnitMenu, setShowUnitMenu] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const s = localStorage.getItem("h24tr_data");
      return s ? JSON.parse(s) : Object.fromEntries(UNITS.map(u => [u, { produit: "", patients: [] }]));
    } catch {
      return Object.fromEntries(UNITS.map(u => [u, { produit: "", patients: [] }]));
    }
  });
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_PATIENT });
  const [search, setSearch] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [showProduitEdit, setShowProduitEdit] = useState(false);
  const [produitVal, setProduitVal] = useState("");

  useEffect(() => {
    try { localStorage.setItem("h24tr_data", JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.setHeaderColor("#0f1f35");
    }
  }, []);

  function handleLogin(selectedPin) {
    const p = selectedPin !== undefined ? selectedPin : pin;
    if (p === "1234") { setIsAdmin(true); setShowPinScreen(false); setPinError(false); }
    else if (p === "0000") { setIsAdmin(false); setShowPinScreen(false); setPinError(false); }
    else { setPinError(true); setTimeout(() => setPinError(false), 1500); }
    setPin("");
  }

  const unitData = data[activeUnit] || { produit: "", patients: [] };
  const patients = unitData.patients || [];

  const filtered = patients.filter(p => {
    const ms = !search || `${p.nomPrenom} ${p.nOrdonnance}`.toLowerCase().includes(search.toLowerCase());
    const ma = !alertsOnly || (getDaysUntil(p.prochainFlacon) !== null && getDaysUntil(p.prochainFlacon) <= 3);
    return ms && ma;
  });

  const totalAlerts = UNITS.reduce((s, u) =>
    s + (data[u]?.patients || []).filter(p => getDaysUntil(p.prochainFlacon) !== null && getDaysUntil(p.prochainFlacon) <= 3).length, 0);

  const unitAlerts = u => (data[u]?.patients || []).filter(p =>
    getDaysUntil(p.prochainFlacon) !== null && getDaysUntil(p.prochainFlacon) <= 3).length;

  function savePatient() {
    if (!form.nomPrenom.trim()) return;
    const updated = { ...data };
    const unit = { ...updated[activeUnit], patients: [...(updated[activeUnit]?.patients || [])] };
    if (editIdx !== null) unit.patients[editIdx] = { ...form };
    else unit.patients.push({ ...form, id: Date.now() });
    updated[activeUnit] = unit;
    setData(updated);
    setShowForm(false);
    setEditIdx(null);
    setForm({ ...EMPTY_PATIENT });
  }

  function deletePatient(idx) {
    if (!window.confirm("Supprimer ce patient ?")) return;
    const updated = { ...data };
    const unit = { ...updated[activeUnit], patients: updated[activeUnit].patients.filter((_, i) => i !== idx) };
    updated[activeUnit] = unit;
    setData(updated);
  }

  function openEdit(idx) {
    setForm({ ...patients[idx] });
    setEditIdx(idx);
    setShowForm(true);
  }

  function saveProduit() {
    const updated = { ...data, [activeUnit]: { ...data[activeUnit], produit: produitVal } };
    setData(updated);
    setShowProduitEdit(false);
  }

  // PIN SCREEN
  if (showPinScreen) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#0d1b2a,#1a3a5c)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, background: "#1a3a5c", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1.5px solid rgba(79,195,247,0.3)" }}>
            <span style={{ fontSize: 36 }}>🏥</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#e0f4ff" }}>H24TR</div>
          <div style={{ fontSize: 13, color: "#4a7fa0", marginTop: 4 }}>Suivi des Unités Hospitalières</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 320 }}>
          <div style={{ fontSize: 13, color: "#7bafd4", textAlign: "center", marginBottom: 16, letterSpacing: 1 }}>ENTREZ VOTRE CODE</div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: 48, height: 52, background: "rgba(255,255,255,0.06)", border: `2px solid ${pinError ? "#ef4444" : pin.length > i ? "#4fc3f7" : "rgba(79,195,247,0.2)"}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#4fc3f7", transition: "all 0.15s" }}>
                {pin.length > i ? "●" : ""}
              </div>
            ))}
          </div>

          {pinError && <div style={{ textAlign: "center", color: "#f87171", fontSize: 13, marginBottom: 12 }}>Code incorrect ❌</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
              <button key={i} onClick={() => {
                if (k === "⌫") setPin(p => p.slice(0, -1));
                else if (k === "") return;
                else {
                  const newPin = pin + k;
                  setPin(newPin);
                  if (newPin.length === 4) handleLogin(newPin);
                }
              }}
              style={{ padding: "16px 0", background: k === "" ? "transparent" : "rgba(255,255,255,0.06)", border: k === "" ? "none" : "1px solid rgba(79,195,247,0.15)", borderRadius: 12, color: "#e0f4ff", fontSize: 20, fontWeight: 600, cursor: k === "" ? "default" : "pointer" }}>
                {k}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 20, color: "#2d5986", fontSize: 12, textAlign: "center" }}>
          Admin: 1234 &nbsp;·&nbsp; Consultation: 0000
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div style={{ minHeight: "100vh", background: "#0d1b2a", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#0f1f35", borderBottom: "1px solid rgba(79,195,247,0.15)", padding: "14px 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏥</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#e0f4ff" }}>H24TR</div>
              <div style={{ fontSize: 11, color: isAdmin ? "#4fc3f7" : "#7bafd4" }}>{isAdmin ? "👤 Admin" : "👁 Consultation"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {totalAlerts > 0 && (
              <div style={{ background: "#ef4444", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                ⚠️ {totalAlerts}
              </div>
            )}
            <button onClick={() => setShowPinScreen(true)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 8, padding: "6px 12px", color: "#7bafd4", fontSize: 12, cursor: "pointer" }}>
              ↩
            </button>
          </div>
        </div>

        {/* Unit selector */}
        <div style={{ marginTop: 12, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {UNITS.map(u => (
            <button key={u} onClick={() => setActiveUnit(u)} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "1.5px solid", borderColor: activeUnit === u ? "#4fc3f7" : "rgba(79,195,247,0.2)", background: activeUnit === u ? "rgba(79,195,247,0.15)" : "transparent", color: activeUnit === u ? "#4fc3f7" : "#7bafd4", fontSize: 13, fontWeight: 600, cursor: "pointer", position: "relative" }}>
              {u}
              {unitAlerts(u) > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", borderRadius: 10, width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>{unitAlerts(u)}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Produit bar */}
      <div style={{ background: "rgba(79,195,247,0.05)", borderBottom: "1px solid rgba(79,195,247,0.1)", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4a7fa0", fontSize: 12 }}>Produit :</span>
          <span style={{ color: "#4fc3f7", fontWeight: 600, fontSize: 14 }}>{unitData.produit || "—"}</span>
        </div>
        {isAdmin && (
          <button onClick={() => { setProduitVal(unitData.produit || ""); setShowProduitEdit(true); }} style={{ background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 8, padding: "4px 10px", color: "#4fc3f7", fontSize: 12, cursor: "pointer" }}>
            ✏️ Modifier
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div style={{ padding: "12px 16px", display: "flex", gap: 8 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 10, color: "#e0f4ff", fontSize: 14, outline: "none" }} />
        <button onClick={() => setAlertsOnly(!alertsOnly)} style={{ padding: "10px 12px", background: alertsOnly ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${alertsOnly ? "rgba(239,68,68,0.4)" : "rgba(79,195,247,0.2)"}`, borderRadius: 10, color: alertsOnly ? "#fca5a5" : "#7bafd4", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          ⚠️
        </button>
      </div>

      {/* Patient list */}
      <div style={{ flex: 1, padding: "0 16px 100px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
            <div style={{ color: "#4a7fa0", fontSize: 16, fontWeight: 600 }}>{search ? "Aucun résultat" : "Aucun patient"}</div>
            {isAdmin && !search && <div style={{ color: "#2d5986", fontSize: 13, marginTop: 8 }}>Appuyez sur + pour ajouter</div>}
          </div>
        ) : filtered.map((p, i) => {
          const realIdx = patients.indexOf(p);
          const d = getDaysUntil(p.prochainFlacon);
          const urgent = d !== null && d <= 0;
          const warn = d !== null && d > 0 && d <= 3;
          return (
            <div key={p.id || i} style={{ background: urgent ? "rgba(239,68,68,0.08)" : warn ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${urgent ? "rgba(239,68,68,0.3)" : warn ? "rgba(251,191,36,0.2)" : "rgba(79,195,247,0.1)"}`, borderRadius: 12, padding: "14px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#e0f4ff" }}>{p.nomPrenom}</div>
                  {p.nOrdonnance && <div style={{ fontSize: 12, color: "#4a7fa0", marginTop: 2 }}>📋 {p.nOrdonnance}</div>}
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(realIdx)} style={{ background: "rgba(79,195,247,0.1)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>✏️</button>
                    <button onClick={() => deletePatient(realIdx)} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {p.date && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#4a7fa0", marginBottom: 2 }}>DATE</div>
                  <div style={{ fontSize: 13, color: "#c8dff0" }}>{new Date(p.date).toLocaleDateString("fr-FR")}</div>
                </div>}
                {p.nbreGTT && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#4a7fa0", marginBottom: 2 }}>GTT</div>
                  <div style={{ fontSize: 13, color: "#c8dff0" }}>{p.nbreGTT}</div>
                </div>}
                {p.prochainFlacon && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 10, color: "#4a7fa0", marginBottom: 4 }}>PROCHAIN FLACON</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#c8dff0" }}>{new Date(p.prochainFlacon).toLocaleDateString("fr-FR")}</span>
                    <FlaconBadge date={p.prochainFlacon} />
                  </div>
                </div>}
                {p.notes && <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 10, color: "#4a7fa0", marginBottom: 2 }}>NOTES</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{p.notes}</div>
                </div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add button */}
      {isAdmin && !showForm && (
        <button onClick={() => { setForm({ ...EMPTY_PATIENT, date: today() }); setEditIdx(null); setShowForm(true); }}
          style={{ position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg,#1a6fa8,#4fc3f7)", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", boxShadow: "0 8px 24px rgba(79,195,247,0.4)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
          +
        </button>
      )}

      {/* Add/Edit modal */}
      {showForm && isAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "#0f1f35", borderRadius: "20px 20px 0 0", border: "1px solid rgba(79,195,247,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(79,195,247,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#0f1f35", zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e0f4ff" }}>{editIdx !== null ? "Modifier patient" : "Nouveau patient"}</div>
              <button onClick={() => setShowForm(false)} style={{ background: "transparent", border: "none", color: "#7bafd4", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              {[
                { key: "nomPrenom", label: "Nom et Prénom *", type: "text", placeholder: "Ex: Ben Ahmed Mohamed" },
                { key: "date", label: "Date", type: "date", placeholder: "" },
                { key: "nOrdonnance", label: "N° Ordonnance", type: "text", placeholder: "Ex: ORD-2024-001" },
                { key: "nbreGTT", label: "Nbre de GTT", type: "number", placeholder: "Ex: 40" },
                { key: "prochainFlacon", label: "Date Prochain Flacon", type: "date", placeholder: "" },
                { key: "notes", label: "Notes", type: "text", placeholder: "Remarques..." },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#7bafd4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 10, color: "#e0f4ff", fontSize: 15, outline: "none", colorScheme: "dark" }} />
                </div>
              ))}
              <button onClick={savePatient} style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg,#1a6fa8,#4fc3f7)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", opacity: form.nomPrenom ? 1 : 0.5, marginTop: 8 }}>
                {editIdx !== null ? "Enregistrer" : "Ajouter le patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Produit edit modal */}
      {showProduitEdit && isAdmin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#0f1f35", borderRadius: "20px 20px 0 0", border: "1px solid rgba(79,195,247,0.2)", width: "100%", padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e0f4ff", marginBottom: 16 }}>Modifier le produit</div>
            <input value={produitVal} onChange={e => setProduitVal(e.target.value)} placeholder="Nom du produit..."
              style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 10, color: "#e0f4ff", fontSize: 15, outline: "none", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowProduitEdit(false)} style={{ flex: 1, padding: 13, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,195,247,0.2)", borderRadius: 10, color: "#7bafd4", fontSize: 15, cursor: "pointer" }}>Annuler</button>
              <button onClick={saveProduit} style={{ flex: 1, padding: 13, background: "linear-gradient(135deg,#1a6fa8,#4fc3f7)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
