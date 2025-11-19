// ../sections/Dashboard.jsx
import { useEffect, useState, useMemo } from "react";

function Card({ title, children, footer }) {
    return (
        <section
            className="card"
            style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                background: "#fff",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>{title}</h2>
            </div>
            <div style={{ fontSize: 14, color: "#222" }}>{children}</div>
            {footer && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    {footer}
                </div>
            )}
        </section>
    );
}

function EmptyHint({ children }) {
    return (
        <div style={{ fontSize: 13, opacity: 0.7 }}>
            {children}
        </div>
    );
}

function formatDate(d) {
    try {
        return new Date(d + "T00:00:00").toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return d;
    }
}

function formatTime(t) {
    if (!t) return "";
    try {
        return t.slice(0, 5); // "HH:MM"
    } catch {
        return t;
    }
}

export default function Dashboard({ apiBase, showToast, events, invites, isActive }) {
    const [friendRequests, setFriendRequests] = useState([]);
    const [teamInvites, setTeamInvites] = useState([]);
    const [loading, setLoading] = useState(false);

    // Cargar solicitudes de amistad e invitaciones a equipos cuando el dashboard está activo
    useEffect(() => {
        if (!isActive) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const [frRes, teamRes] = await Promise.all([
                    fetch(`${apiBase}/friend-requests/received`, {
                        credentials: "include",
                    }),
                    fetch(`${apiBase}/teams/invitations`, {
                        credentials: "include",
                    }),
                ]);

                const [frData, teamData] = await Promise.all([
                    frRes.ok ? frRes.json() : Promise.resolve([]),
                    teamRes.ok ? teamRes.json() : Promise.resolve([]),
                ]);

                if (!cancelled) {
                    setFriendRequests(frData || []);
                    setTeamInvites(teamData || []);
                }
            } catch (err) {
                console.error("Error cargando dashboard:", err);
                if (!cancelled && showToast) {
                    showToast("Error cargando resumen");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [apiBase, isActive, showToast]);


    const pendingInvites = useMemo(() => {
        const now = new Date();

        return (invites || [])
            .filter(i => i.rsvp === "pending")
            .map(i => {
                // aseguramos una hora razonable para comparar
                const rawTime = (i.time || "").slice(0, 5); // "HH:MM"
                const timeStr = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : "23:59";

                const when = new Date(`${i.date}T${timeStr}:00`);
                return { ...i, _when: when };
            })
            // solo futuras o iguales a "ahora"
            .filter(i => !isNaN(i._when) && i._when >= now)
            // ordenadas por fecha/hora
            .sort((a, b) => a._when - b._when);
    }, [invites]);

    // Próximos eventos (propios + invitaciones aceptadas)
    const upcomingEvents = useMemo(() => {
        const now = new Date();

        const ownEvents = (events || []).map(ev => {
            const dt = new Date(`${ev.date}T${ev.time || "00:00"}`);
            return { ...ev, _when: dt, source: "own" };
        });

        const acceptedFromInvites = (invites || [])
            .filter(i => i.rsvp === "confirmed")
            .map(i => {
                const dt = new Date(`${i.date}T${i.time || "00:00"}`);
                return { ...i, _when: dt, source: "invited" };
            });

        return [...ownEvents, ...acceptedFromInvites]
            .filter(ev => !isNaN(ev._when) && ev._when >= now)
            .sort((a, b) => a._when - b._when)
            .slice(0, 5);
    }, [events, invites]);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 2fr) minmax(0, 2fr)",
                gap: 16,
                alignItems: "flex-start",
            }}
        >
            <div>
                <Card
                    title={`Solicitudes de amistad (${friendRequests.length})`}
                    footer="Gestiona las solicitudes completas en la pestaña Personas."
                >
                    {loading && friendRequests.length === 0 ? (
                        <EmptyHint>Cargando solicitudes…</EmptyHint>
                    ) : friendRequests.length === 0 ? (
                        <EmptyHint>No tienes solicitudes de amistad pendientes.</EmptyHint>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {friendRequests.slice(0, 5).map(req => (
                                <li
                                    key={req.id}
                                    style={{
                                        padding: "6px 0",
                                        borderBottom: "1px solid rgba(0,0,0,0.07)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 2,
                                    }}
                                >
                                    <span style={{ fontWeight: 500 }}>
                                        {req.from_user?.name || "Usuario"}
                                    </span>
                                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                                        {req.from_user?.email}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card
                    title={`Invitaciones a equipos (${teamInvites.length})`}
                    footer="Acepta o rechaza invitaciones detalladas en la pestaña Equipos."
                >
                    {loading && teamInvites.length === 0 ? (
                        <EmptyHint>Cargando invitaciones…</EmptyHint>
                    ) : teamInvites.length === 0 ? (
                        <EmptyHint>No tienes invitaciones a equipos pendientes.</EmptyHint>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {teamInvites.slice(0, 5).map(inv => (
                                <li
                                    key={`${inv.team_id}-${inv.role}`}
                                    style={{
                                        padding: "6px 0",
                                        borderBottom: "1px solid rgba(0,0,0,0.07)",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontWeight: 500 }}>
                                            {inv.team?.name || "Equipo sin nombre"}
                                        </span>
                                        <span style={{ fontSize: 11, opacity: 0.75 }}>
                                            Rol: {inv.role}
                                        </span>
                                    </div>
                                    {inv.team?.description && (
                                        <div
                                            style={{
                                                fontSize: 12,
                                                opacity: 0.8,
                                                marginTop: 2,
                                                whiteSpace: "nowrap",
                                                textOverflow: "ellipsis",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {inv.team.description}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div>
                <Card
                    title={`Invitaciones pendientes (${pendingInvites.length})`}
                    footer="Responde las invitaciones desde la pestaña Invitaciones."
                >
                    {pendingInvites.length === 0 ? (
                        <EmptyHint>No tienes invitaciones de eventos pendientes.</EmptyHint>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {pendingInvites.slice(0, 5).map(inv => (
                                <li
                                    key={inv.id}
                                    style={{
                                        padding: "6px 0",
                                        borderBottom: "1px solid rgba(0,0,0,0.07)",
                                    }}
                                >
                                    <div style={{ fontWeight: 500 }}>{inv.title}</div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                                        {formatDate(inv.date)}{" "}
                                        {inv.time && `· ${formatTime(inv.time)}`}{" "}
                                        {inv.location && `· ${inv.location}`}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card
                    title="Próximos eventos"
                    footer="Incluye eventos creados por ti y eventos confirmados donde estás invitado."
                >
                    {upcomingEvents.length === 0 ? (
                        <EmptyHint>No hay eventos próximos en tu agenda.</EmptyHint>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {upcomingEvents.map(ev => (
                                <li
                                    key={`${ev.source}-${ev.id}`}
                                    style={{
                                        padding: "6px 0",
                                        borderBottom: "1px solid rgba(0,0,0,0.07)",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontWeight: 500 }}>
                                            {ev.title}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                opacity: 0.8,
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            {ev.source === "own" ? "Propio" : "Invitado"}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                                        {formatDate(ev.date)}{" "}
                                        {ev.time && `· ${formatTime(ev.time)}`}{" "}
                                        {ev.location && `· ${ev.location}`}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}
