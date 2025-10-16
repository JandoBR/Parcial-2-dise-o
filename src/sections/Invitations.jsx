import { useEffect, useRef, useMemo, useState } from "react";

function toDate(date, time) {
    const hhmm = time && /^\d{2}:\d{2}$/.test(time) ? time : "23:59";
    return new Date(`${date}T${hhmm}:00`);
}
function isPast(date, time) {
    try { return toDate(date, time).getTime() < Date.now(); }
    catch { return false; }
}
function formatDate(iso) {
    if (!iso) return "";
    try { return new Date(iso + "T00:00:00").toLocaleDateString("es-ES"); }
    catch { return iso; }
}

function SectionTitle({ children }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 8px 0" }}>
            <span aria-hidden="true" style={{ width: 6, height: 18, borderRadius: 6, background: "#111", opacity: 0.9 }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{children}</h3>
        </div>
    );
}

/* 🌙 Modal reutilizable */
function ConfirmModal({ open, onClose, onConfirm, title, message }) {
    if (!open) return null;
    return (
        <div style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 3000,
        }}>
            <div
                className="card"
                style={{
                    maxWidth: 360,
                    padding: 24,
                    textAlign: "center",
                    boxShadow: "0 8px 24px rgba(255, 255, 255, 0.25)",
                    animation: "fadeIn .2s ease-out",
                }}
            >
                <h3 style={{ marginTop: 0 }}>{title}</h3>
                <p style={{ marginBottom: 24, opacity: 0.85 }}>{message}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <button className="btn btn--outline" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn"
                        style={{ background: "#dc2626", borderColor: "#dc2626" }}
                        onClick={onConfirm}
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Invitations({ invites = [], onRsvp, onDeleteInvite, highlightId }) {
    const [showPast, setShowPast] = useState(false);
    const [confirmData, setConfirmData] = useState(null);

    // auto-focus/aria para el destacado
    const justHighlighted = useRef(null);
    useEffect(() => {
        if (!highlightId) return;
        const el = document.getElementById(`invite-${highlightId}`);
        if (el) {
            justHighlighted.current = el;
            el.setAttribute("aria-live", "polite");
        }
    }, [highlightId]);

    // dividir en próximas/pasadas
    const { upcoming, past } = useMemo(() => {
        const up = [], pa = [];
        for (const inv of invites) (isPast(inv.date, inv.time) ? pa : up).push(inv);
        return { upcoming: up, past: pa };
    }, [invites]);

    // 🔤 helper de truncado en 1 línea con “aire” (corta antes del borde)
    const oneLineCut = (expanded = false) => ({
        whiteSpace: expanded ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: expanded ? "clip" : "ellipsis",
        maxWidth: expanded ? "100%" : "92%", // corta un poco antes
    });

    return (
        <>
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0 }}>Invitaciones</h2>
                    <button
                        className="btn btn--outline"
                        onClick={() => setShowPast(v => !v)}
                        disabled={past.length === 0}
                        title={past.length ? (showPast ? "Ocultar pasadas" : "Mostrar pasadas") : "No hay invitaciones pasadas"}
                    >
                        {showPast ? "Ocultar pasadas" : "Mostrar pasadas"}
                    </button>
                </div>

                {invites.length === 0 && <p className="muted">No tienes invitaciones.</p>}

                {upcoming.length > 0 && (
                    <>
                        <SectionTitle>Próximas</SectionTitle>
                        <div className="grid-2">
                            {upcoming.map(inv => {
                                const isHighlighted = highlightId === inv.id;
                                return (
                                    <article
                                        key={inv.id}
                                        id={`invite-${inv.id}`}
                                        className={`card ${isHighlighted ? "card--highlight" : ""}`}
                                        style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}
                                    >
                                        <header style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                                            minWidth: 0 /* necesario para que ellipsis funcione */,
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ margin: 0, ...oneLineCut(false) }} title={inv.title}>
                                                    {inv.title}
                                                </h3>
                                                <p style={{ margin: "4px 0", ...oneLineCut(false) }}
                                                    title={`${formatDate(inv.date)}${inv.time ? ` · ${inv.time}` : ""} — ${inv.location || "Sin lugar"}`}>
                                                    {formatDate(inv.date)}{inv.time ? ` · ${inv.time}` : ""} — {inv.location || "Sin lugar"}
                                                </p>
                                                <p className="muted" style={{ margin: 0, ...oneLineCut(false) }} title={`Organiza: ${inv.host || "—"}`}>
                                                    Organiza: {inv.host || "—"}
                                                </p>
                                            </div>
                                            <StatusPill rsvp={inv.rsvp} />
                                        </header>

                                        <div className="controls" style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button
                                                className="btn btn--outline"
                                                onClick={() => onRsvp?.(inv.id, "confirmed")}
                                                aria-pressed={inv.rsvp === "confirmed"}
                                                title="Confirmar asistencia"
                                            >
                                                ✅ Confirmar
                                            </button>
                                            <button
                                                className="btn btn--outline"
                                                onClick={() => onRsvp?.(inv.id, "rejected")}
                                                aria-pressed={inv.rsvp === "rejected"}
                                                title="Rechazar invitación"
                                            >
                                                ❌ Rechazar
                                            </button>
                                            <button
                                                className="btn btn--outline"
                                                onClick={() => setConfirmData({ id: inv.id, title: inv.title })}
                                                title="Eliminar invitación"
                                                aria-label="Eliminar invitación"
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}

                {showPast && past.length > 0 && (
                    <>
                        <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12 }}>
                            <SectionTitle>Pasadas</SectionTitle>
                        </div>
                        <div className="grid-2">
                            {past.map(inv => {
                                const isHighlighted = highlightId === inv.id;
                                return (
                                    <article
                                        key={inv.id}
                                        id={`invite-${inv.id}`}
                                        className={`card ${isHighlighted ? "card--highlight" : ""}`}
                                        style={{ display: "flex", flexDirection: "column", gap: 8, opacity: 0.92, overflow: "hidden" }}
                                    >
                                        <header style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                                            minWidth: 0,
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ margin: 0, ...oneLineCut(false) }} title={inv.title}>
                                                    {inv.title}
                                                </h3>
                                                <p style={{ margin: "4px 0", ...oneLineCut(false) }}
                                                    title={`${formatDate(inv.date)}${inv.time ? ` · ${inv.time}` : ""} — ${inv.location || "Sin lugar"}`}>
                                                    {formatDate(inv.date)}{inv.time ? ` · ${inv.time}` : ""} — {inv.location || "Sin lugar"}
                                                </p>
                                                <p className="muted" style={{ margin: 0, ...oneLineCut(false) }} title={`Organiza: ${inv.host || "—"}`}>
                                                    Organiza: {inv.host || "—"}
                                                </p>
                                            </div>
                                            <StatusPill rsvp={inv.rsvp} />
                                        </header>

                                        <div className="controls" style={{ marginTop: 4, display: "flex", gap: 8 }}>
                                            <button
                                                className="btn btn--outline"
                                                onClick={() => setConfirmData({ id: inv.id, title: inv.title })}
                                                title="Eliminar invitación"
                                                aria-label="Eliminar invitación"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Modal de confirmación */}
            <ConfirmModal
                open={!!confirmData}
                title="¿Eliminar invitación?"
                message={`¿Seguro que quieres eliminar “${confirmData?.title}”? Esta acción no se puede deshacer.`}
                onClose={() => setConfirmData(null)}
                onConfirm={() => {
                    onDeleteInvite?.(confirmData.id);
                    setConfirmData(null);
                }}
            />
        </>
    );
}

function StatusPill({ rsvp }) {
    const state = (rsvp === "confirmed" || rsvp === "rejected" || rsvp === "pending") ? rsvp : "pending";
    const label = state === "confirmed" ? "Confirmado" : state === "rejected" ? "Rechazado" : "Pendiente";
    const bg = state === "confirmed" ? "#e0f2fe" : state === "rejected" ? "#fee2e2" : "#f3f4f6";
    const color = state === "confirmed" ? "#075985" : state === "rejected" ? "#7f1d1d" : "#374151";
    return (
        <span style={{ background: bg, color, borderRadius: 9999, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
            {label}
        </span>
    );
}
