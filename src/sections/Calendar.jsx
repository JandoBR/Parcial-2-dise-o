// Calendar.jsx
import { useMemo, useState } from "react";

/** Helpers */
function pad(n) { return String(n).padStart(2, "0"); }
function toISODateLocal(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); } // m: 0-11
function monthMatrix(y, m) {
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // lunes=0
    const total = daysInMonth(y, m);
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}
function groupByDate(arr) { const out = {}; for (const e of arr) { if (!e.date) continue; (out[e.date] = out[e.date] || []).push(e); } return out; }

const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function Calendar({ events = [] }) {
    const today = new Date();
    const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });

    const byDate = useMemo(() => groupByDate(events), [events]);
    const cells = useMemo(() => monthMatrix(ym.y, ym.m), [ym]);

    // Mapa con cantidad de invitaciones PENDIENTES por fecha
    const pendingByDate = useMemo(() => {
        const map = {};
        for (const e of events) {
            if (!e?.date) continue;
            const isPending = e.source === "invited" && e.rsvp === "pending";
            if (!isPending) continue;
            map[e.date] = (map[e.date] || 0) + 1;
        }
        return map;
    }, [events]);

    const prevMonth = () => setYm(s => (s.m === 0 ? { y: s.y - 1, m: 11 } : { y: s.y, m: s.m - 1 }));
    const nextMonth = () => setYm(s => (s.m === 11 ? { y: s.y + 1, m: 0 } : { y: s.y, m: s.m + 1 }));
    const goToday = () => setYm({ y: today.getFullYear(), m: today.getMonth() });

    const YEAR_RANGE = 7;
    const years = [];
    for (let y = today.getFullYear() - YEAR_RANGE; y <= today.getFullYear() + YEAR_RANGE; y++) years.push(y);

    const monthLabel = `${MONTHS_ES[ym.m]} ${ym.y}`;

    return (
        <div className="card">
            {/* Encabezado con selectores */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, textTransform: "capitalize" }}>{monthLabel}</h2>

                {/* Selectores rápidos Mes/Año */}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <select
                        value={ym.m}
                        onChange={(e) => setYm(s => ({ ...s, m: Number(e.target.value) }))}
                        aria-label="Seleccionar mes"
                    >
                        {MONTHS_ES.map((name, idx) => (
                            <option key={name} value={idx}>{name[0].toUpperCase() + name.slice(1)}</option>
                        ))}
                    </select>
                    <select
                        value={ym.y}
                        onChange={(e) => setYm(s => ({ ...s, y: Number(e.target.value) }))}
                        aria-label="Seleccionar año"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {/* Navegación */}
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn--outline" onClick={prevMonth}>Anterior</button>
                    <button className="btn btn--outline" onClick={goToday}>Hoy</button>
                    <button className="btn" onClick={nextMonth}>Siguiente</button>
                </div>
            </div>

            {/* Encabezado de días (Lun a Dom) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 12 }}>
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d, i) => (
                    <div key={i} className="card" style={{ textAlign: "center", padding: "6px 8px", fontSize: 12, fontWeight: 600 }}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Celdas del mes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 8 }}>
                {cells.map((d, i) => {
                    if (!d) return <div key={`b-${i}`} className="card" style={{ minHeight: 96, background: "#f9fafb" }} />;
                    const key = toISODateLocal(d);
                    const list = byDate[key] || [];
                    const isToday =
                        d.getFullYear() === today.getFullYear() &&
                        d.getMonth() === today.getMonth() &&
                        d.getDate() === today.getDate();
                    const pendCount = pendingByDate[key] || 0;

                    return (
                        <div
                            key={key}
                            className="card"
                            style={{
                                minHeight: 110,
                                borderColor: isToday ? "#111" : "#eee",
                                background: isToday ? "#f3f4f6" : "#fff",
                                position: "relative",
                                paddingTop: 8
                            }}
                        >
                            {/* Cabecera de la celda: día + badge de pendientes si aplica */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ fontSize: 12, opacity: .7, fontWeight: 600 }}>{d.getDate()}</div>
                                {pendCount > 0 && (
                                    <span title={`${pendCount} pendiente(s) por responder`} style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        background: "#f3f4f6",
                                        borderRadius: 9999,
                                        padding: "2px 8px",
                                        fontSize: 11,
                                        fontWeight: 600
                                    }}>
                                        ⏳ {pendCount}
                                    </span>
                                )}
                            </div>

                            {/* Lista de eventos del día */}
                            {list.slice(0, 3).map(ev => {
                                const isInv = ev.source === "invited";
                                const isPending = isInv && ev.rsvp === "pending";
                                const isConfirmed = isInv && ev.rsvp === "confirmed";
                                const leftDot = isInv
                                    ? (isPending ? "⏳" : isConfirmed ? "•" : "•")
                                    : "•";

                                const dotBg = isInv
                                    ? (isPending ? "#f3f4f6" : isConfirmed ? "transparent" : "transparent")
                                    : "transparent";

                                return (
                                    <div key={ev.id} style={{ fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                        <span aria-hidden="true" style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 18, height: 18,
                                            borderRadius: 9999,
                                            background: dotBg,
                                            flex: "0 0 18px"
                                        }}>
                                            {leftDot}
                                        </span>
                                        <span>
                                            {ev.title} {isInv && <span style={{ opacity: .7 }}>(Inv.)</span>}
                                        </span>
                                    </div>
                                );
                            })}
                            {list.length > 3 && (
                                <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>+{list.length - 3} más…</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
