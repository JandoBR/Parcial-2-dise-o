import { useState, useMemo } from "react";

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
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                    animation: "fadeIn .2s ease-out",
                    wordBreak: "break-word",
                }}
            >
                <h3 style={{ marginTop: 0 }}>{title}</h3>
                <p style={{ marginBottom: 24, opacity: 0.85 }}>{message}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <button className="btn btn--outline" onClick={onClose}>Cancelar</button>
                    <button className="btn" style={{ background: "#dc2626", borderColor: "#dc2626" }} onClick={onConfirm}>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MyEvents({ events = [], onDelete, onCopyLink }) {
    const [open, setOpen] = useState(() => new Set());
    const [showPast, setShowPast] = useState(false);
    const [confirmData, setConfirmData] = useState(null);

    const toggle = (id) => {
        setOpen(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const { upcoming, past } = useMemo(() => {
        const up = [], pa = [];
        for (const ev of events) (isPast(ev.date, ev.time) ? pa : up).push(ev);
        return { upcoming: up, past: pa };
    }, [events]);

    function renderEventCard(ev, expanded) {
        const invitees = Array.isArray(ev.invitees) ? ev.invitees : [];

        return (
            <article
                key={ev.id}
                className="card"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "hidden",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        minWidth: 0,
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                            style={{
                                margin: 0,
                                whiteSpace: expanded ? "normal" : "nowrap",
                                overflow: "hidden",
                                textOverflow: expanded ? "clip" : "ellipsis",
                                wordBreak: "break-word",
                                maxWidth: expanded ? "100%" : "92%", // 👈 se corta antes del borde
                            }}
                            title={!expanded ? ev.title : undefined}
                        >
                            {ev.title}
                        </h3>
                        <p
                            style={{
                                margin: "4px 0",
                                whiteSpace: expanded ? "normal" : "nowrap",
                                overflow: "hidden",
                                textOverflow: expanded ? "clip" : "ellipsis",
                                maxWidth: expanded ? "100%" : "92%", // 👈 mismo ajuste
                            }}
                            title={!expanded ? `${ev.date} ${ev.location || ""}` : undefined}
                        >
                            {formatDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""} — {ev.location || "Sin lugar"}
                        </p>
                    </div>
                    <button
                        className="btn btn--outline"
                        onClick={() => toggle(ev.id)}
                        aria-expanded={expanded}
                        aria-controls={`ev-${ev.id}-details`}
                        title={expanded ? "Ocultar detalles" : "Ver detalles"}
                    >
                        {expanded ? "Ocultar" : "Detalles"}
                    </button>
                </header>

                {ev.description && (
                    <p
                        className="muted"
                        style={{
                            marginTop: 0,
                            whiteSpace: expanded ? "normal" : "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: expanded ? "100%" : "92%", // 👈 igual
                        }}
                        title={!expanded ? ev.description : undefined}
                    >
                        {ev.description}
                    </p>
                )}

                <div className="controls" style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        className="btn btn--outline"
                        onClick={() => setConfirmData({ id: ev.id, title: ev.title })}
                        aria-label="Eliminar evento"
                        title="Eliminar evento"
                    >
                        🗑️ Eliminar
                    </button>

                    <button
                        className="btn btn--outline"
                        onClick={() => onCopyLink?.(ev.id)}
                        aria-label="Copiar enlace de invitación"
                        title="Copiar enlace de invitación"
                    >
                        🔗
                    </button>
                </div>

                {expanded && (
                    <section
                        id={`ev-${ev.id}-details`}
                        className="card"
                        style={{ background: "#fafafa", overflowWrap: "anywhere" }}
                    >
                        <h4 style={{ margin: "0 0 8px 0" }}>Invitados</h4>
                        {invitees.length === 0 ? (
                            <p className="muted" style={{ margin: 0 }}>Sin invitados aún.</p>
                        ) : (
                            <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: 0,
                                display: "grid",
                                gap: 6,
                            }}>
                                {invitees.map((p, idx) => {
                                    const r = ["confirmed", "rejected", "pending"].includes(p?.rsvp) ? p.rsvp : "pending";
                                    const icon = r === "confirmed" ? "✅" : r === "rejected" ? "❌" : "⏳";
                                    const label = r === "confirmed" ? "Confirmado" : r === "rejected" ? "Rechazado" : "Pendiente";
                                    return (
                                        <li
                                            key={`${ev.id}-g-${idx}`}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                flexWrap: "wrap",
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            <span>{icon}</span>
                                            <span style={{ overflowWrap: "anywhere" }}>
                                                <strong>{p.name || p.email}</strong>
                                                {p.email && p.name ? <span className="muted"> · {p.email}</span> : null}
                                                <span className="muted"> · {label}</span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                )}
            </article>
        );
    }

    return (
        <>
            <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <h2 style={{ margin: 0 }}>Mis eventos</h2>
                    <button
                        className="btn btn--outline"
                        onClick={() => setShowPast(v => !v)}
                        disabled={past.length === 0}
                    >
                        {showPast ? "Ocultar pasados" : "Mostrar pasados"}
                    </button>
                </div>

                {events.length === 0 && <p className="muted">Aún no hay eventos.</p>}

                {upcoming.length > 0 && (
                    <>
                        <SectionTitle>Próximos</SectionTitle>
                        <div className="grid-2">
                            {upcoming.map(ev => renderEventCard(ev, open.has(ev.id)))}
                        </div>
                    </>
                )}

                {showPast && past.length > 0 && (
                    <>
                        <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12 }}>
                            <SectionTitle>Pasados</SectionTitle>
                        </div>
                        <div className="grid-2" style={{ opacity: 0.95 }}>
                            {past.map(ev => renderEventCard(ev, open.has(ev.id)))}
                        </div>
                    </>
                )}
            </div>

            <ConfirmModal
                open={!!confirmData}
                title="¿Eliminar evento?"
                message={`¿Seguro que quieres eliminar “${confirmData?.title}”? Esta acción no se puede deshacer.`}
                onClose={() => setConfirmData(null)}
                onConfirm={() => {
                    onDelete?.(confirmData.id);
                    setConfirmData(null);
                }}
            />
        </>
    );
}
