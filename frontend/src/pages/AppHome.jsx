import { useEffect, useRef, useState } from "react";
import CreateEvent from "../sections/CreateEvent.jsx";
import MyEvents from "../sections/MyEvents.jsx";
import Invitations from "../sections/Invitations.jsx";
import Calendar from "../sections/Calendar.jsx";
import People from "../sections/personas.jsx";
import Teams from "../sections/Teams.jsx";

const API_BASE = "/api";

const TABS = [
    { key: "create", label: "Crear" },
    { key: "events", label: "Mis eventos" },
    { key: "invites", label: "Invitaciones" },
    { key: "calendar", label: "Calendario" },
    { key: "people", label: "Personas" },
    { key: "teams", label: "Equipos" },   // <-- NUEVO
];


function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }


/* 🔗 Helper para construir la URL absoluta del invite */
function buildInviteUrl(tokenOrPath) {
    const isToken = !tokenOrPath?.startsWith("/");
    const path = isToken ? `/invite/${tokenOrPath}` : tokenOrPath;
    return `${window.location.origin}${path}`;
}

const RSVP = {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    REJECTED: "rejected",
};

function clampRsvp(v) {
    return [RSVP.PENDING, RSVP.CONFIRMED, RSVP.REJECTED].includes(v) ? v : RSVP.PENDING;
}

function rsvpIcon(rsvp) {
    switch (rsvp) {
        case RSVP.CONFIRMED: return "✅";
        case RSVP.REJECTED: return "❌";
        default: return "⏳";
    }
}
function rsvpLabel(rsvp) {
    switch (rsvp) {
        case RSVP.CONFIRMED: return "Confirmado";
        case RSVP.REJECTED: return "Rechazado";
        default: return "Pendiente";
    }
}

export default function AppHome() {
    const [active, setActive] = useState(0);
    const [events, setEvents] = useState([]);
    const [invites, setInvites] = useState([]);

    const fetchData = async () => {
        try {
            const [evRes, invRes] = await Promise.all([
                fetch(`${API_BASE}/my-events`, { credentials: "include" }),
                fetch(`${API_BASE}/my-invitations`, { credentials: "include" }),
            ]);

            if (evRes.status === 401 || invRes.status === 401) {
                localStorage.removeItem("ee_auth");
                window.location.href =
                    `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                return;
            }

            if (!evRes.ok || !invRes.ok) {
                const evText = await evRes.text();
                const invText = await invRes.text();
                console.error("evRes body:", evText);
                console.error("invRes body:", invText);
                throw new Error("No se pudieron obtener datos");
            }

            const [evData, invData] = await Promise.all([
                evRes.json(),
                invRes.json(),
            ]);

            setEvents(evData || []);
            setInvites(invData || []);
        } catch (err) {
            console.error("fetchData error:", err);
            showToast("Error cargando datos");
        }
    };

    // Al montar
    useEffect(() => {
        fetchData();
    }, []);

    // Al cambiar a tabs que dependen de invitaciones/eventos
    useEffect(() => {
        if (active === 1 || active === 2) {
            fetchData();
        }
    }, [active]);

    const trackRef = useRef(null);
    const pos = useRef({ dragging: false, startX: 0, scrollX: 0 });

    // refs para cada panel scrolleable
    const createRef = useRef(null);
    const myEventsRef = useRef(null);
    const invitesRef = useRef(null);
    const peopleRef = useRef(null);
    const teamsRef = useRef(null);
    const [showTop, setShowTop] = useState(false);



    const sorted = [...events].sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`));
    const invitesSorted = [...invites].sort((a, b) => new Date(`${a.date}T${a.time || "00:00"}`) - new Date(`${b.date}T${b.time || "00:00"}`));

    const [toastMsg, setToastMsg] = useState("");
    const [toastShown, setToastShown] = useState(false);

    const [highlightInviteId, setHighlightInviteId] = useState(null);

    const showToast = (msg, ms = 2500) => {
        setToastMsg(msg);        // keep text alive during fade-out
        setToastShown(true);     // show

        clearTimeout(showToast._hide);
        clearTimeout(showToast._clear);

        // hide after ms (triggers CSS transition)
        showToast._hide = setTimeout(() => setToastShown(false), ms);
        // clear the text AFTER the transition finishes, so the box doesn't collapse
        showToast._clear = setTimeout(() => setToastMsg(""), ms + 300);
    };

    async function createInviteLinkOnServer(eventId) {
        await new Promise(r => setTimeout(r, 200)); // latencia simulada
        const token = `tok_${eventId.slice(0, 6)}_${uid().slice(0, 6)}`;
        return { token, inviteLink: `/invite/${token}` };
    }
    async function handleCopyLink(eventId) {
        const ev = events.find(e => e.id === eventId);
        if (!ev) {
            showToast("Evento no encontrado");
            return;
        }

        if (!ev.event_url) {
            showToast("Este evento no tiene enlace de invitación");
            return;
        }

        const full = buildInviteUrl(ev.event_url); // ej: /invite/xxxx => https://.../invite/xxxx

        try {
            await navigator.clipboard.writeText(full);
            showToast("Enlace de invitación copiado");
        } catch (err) {
            console.error(err);
            // Fallback simple si clipboard falla
            prompt("Copia este enlace:", full);
            showToast("Enlace listo para copiar");
        }
    }

    async function handleCopyCalendarLink() {
        try {
            const res = await fetch(`${API_BASE}/calendar/ics-url`, {
                credentials: "include",
            });

            if (res.status === 401) {
                // sesión caducada / no autenticado
                localStorage.removeItem("ee_auth");
                window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
                return;
            }

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Error obteniendo ICS URL:", res.status, txt);
                showToast("No se pudo obtener el enlace de calendario");
                return;
            }

            const data = await res.json();
            const url = data.ics_url;

            if (!url) {
                showToast("El servidor no devolvió un enlace de calendario");
                return;
            }

            try {
                await navigator.clipboard.writeText(url);
                showToast("Enlace de calendario copiado");
            } catch (err) {
                console.error("Clipboard error:", err);
                // Fallback ultra simple
                prompt("Copia este enlace de calendario:", url);
                showToast("Enlace listo para copiar");
            }
        } catch (err) {
            console.error("handleCopyCalendarLink error:", err);
            showToast("Error al obtener el enlace de calendario");
        }
    }


    function handleDelete(id) { setEvents(prev => prev.filter(e => e.id !== id)); }
    async function handleRsvp(inviteId, value) {
        const v = clampRsvp(value);

        // solo manejamos confirmed / rejected, no hay botón de "volver a pending"
        let endpoint;
        if (v === RSVP.CONFIRMED) {
            endpoint = "accept";
        } else if (v === RSVP.REJECTED) {
            endpoint = "reject";
        } else {
            return; // nada que hacer
        }

        try {
            const res = await fetch(`${API_BASE}/invitations/${inviteId}/${endpoint}`, {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Error handleRsvp:", res.status, txt);
                throw new Error(`Error ${res.status}`);
            }

            // Actualizamos el estado local para que la UI refleje la respuesta
            setInvites(prev =>
                prev.map(i =>
                    i.id === inviteId
                        ? { ...i, rsvp: v }
                        : i
                )
            );

            showToast(v === RSVP.CONFIRMED ? "Asistencia confirmada" : "Invitación rechazada");
        } catch (err) {
            console.error("Error al actualizar RSVP:", err);
            showToast("No se pudo actualizar la invitación");
        }
    }

    async function handleDeleteInvite(inviteId) {
        try {
            const res = await fetch(`${API_BASE}/invitations/${inviteId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                console.error("Error handleDeleteInvite:", res.status, txt);
                throw new Error(`Error ${res.status}`);
            }

            // Si el backend borró bien, limpiamos la UI
            setInvites(prev => prev.filter(i => i.id !== inviteId));
            showToast("Invitación eliminada");
        } catch (err) {
            console.error("Error al eliminar invitación:", err);
            showToast("No se pudo eliminar la invitación");
        }
    }


    useEffect(() => {
        // identifica qué panel debe observarse según pestaña activa
        const el =
            active === 0 ? createRef.current :
                active === 1 ? myEventsRef.current :
                    active === 2 ? invitesRef.current :
                        active === 4 ? peopleRef.current :
                            active === 5 ? teamsRef.current :
                                null;

        if (!el) { setShowTop(false); return; }

        const onScroll = () => setShowTop(el.scrollTop > 300);
        onScroll(); // inicial
        el.addEventListener("scroll", onScroll, { passive: true });
        return () => el.removeEventListener("scroll", onScroll);
    }, [active, events.length, invites.length]);



    /** sincroniza scroll horizontal del slider al cambiar tab */
    useEffect(() => {
        const el = trackRef.current; if (!el) return;
        el.scrollTo({ left: active * el.clientWidth, behavior: "smooth" });
    }, [active]);

    /** drag lateral */
    useEffect(() => {
        const el = trackRef.current; if (!el) return;
        const onDown = (e) => { pos.current = { ...pos.current, dragging: true, startX: (e.touches?.[0]?.pageX ?? e.pageX), scrollX: el.scrollLeft }; el.classList.add("grabbing"); };
        const onMove = (e) => { if (!pos.current.dragging) return; const x = (e.touches?.[0]?.pageX ?? e.pageX); el.scrollLeft = pos.current.scrollX - (x - pos.current.startX); };
        const onUp = () => { if (!pos.current.dragging) return; pos.current.dragging = false; el.classList.remove("grabbing"); setActive(Math.max(0, Math.min(TABS.length - 1, Math.round(el.scrollLeft / el.clientWidth)))); };
        el.addEventListener("mousedown", onDown); el.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
        el.addEventListener("touchstart", onDown, { passive: true }); el.addEventListener("touchmove", onMove, { passive: true }); el.addEventListener("touchend", onUp);
        return () => {
            el.removeEventListener("mousedown", onDown); el.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
            el.removeEventListener("touchstart", onDown); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onUp);
        };
    }, []);

    async function logout() {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: "POST",
                credentials: "include",   // importantísimo para que mande la cookie
            });
        } catch (err) {
            console.error("Error en logout:", err);
            // no bloqueamos el logout de UI por esto
        }

        localStorage.removeItem("ee_auth");
        window.location.href = "/auth/login";
    }


    // Para el calendario: mezcla eventos propios + invitaciones (excluye solo las rechazadas)
    const forCalendar = [
        ...sorted.map(e => ({ ...e, source: "own" })),
        // excluye SOLO rechazadas
        ...invitesSorted
            .filter(i => i.rsvp !== RSVP.REJECTED)
            .map(i => ({ ...i, source: "invited" })),
    ];

    useEffect(() => {
        let done = false;

        const raw = sessionStorage.getItem("ee_incoming_invite");
        if (!raw) return;

        try {
            const { invite } = JSON.parse(raw);
            if (!invite || !invite.id) return;

            setInvites(prev => {
                const exists = prev.some(i => i.id === invite.id);
                return exists ? prev : [...prev, invite];
            });

            setActive(2);

            setTimeout(() => {
                if (done) return;

                const slider = trackRef.current;
                if (slider) {
                    slider.scrollTo({ left: 2 * slider.clientWidth, behavior: "auto" });
                }

                const list = invitesRef.current;
                const card = document.getElementById(`invite - ${invite.id}`);

                if (list && card) {
                    const targetTop =
                        card.offsetTop - (list.clientHeight - card.clientHeight) / 2;
                    list.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
                    setHighlightInviteId(invite.id);
                    setTimeout(() => setHighlightInviteId(null), 11000);
                } else if (card) {
                    card.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
                    setHighlightInviteId(invite.id);
                    setTimeout(() => setHighlightInviteId(null), 11000);
                }

                done = true;
                sessionStorage.removeItem("ee_incoming_invite");
            }, 250);
        } catch {
            sessionStorage.removeItem("ee_incoming_invite");
        }
    }, []);


    return (
        <div className="shell">
            <header className="shell__header container">
                <div className="brand">EventEase</div>
                <nav className="tabs">
                    {TABS.map((t, i) => (
                        <button
                            key={t.key}
                            className={`tab ${i === active ? "tab--active" : ""}`}
                            onClick={() => setActive(i)}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="header__right">
                    {/* 🔗 Botón para copiar enlace ICS */}
                    <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={handleCopyCalendarLink}
                    >
                        📅 Google Calendar
                    </button>

                    <button
                        className="btn btn--outline"
                        type="button"
                        onClick={logout}
                    >
                        Salir
                    </button>
                </div>
            </header>


            <main className="shell__main container" style={{ position: "relative" }}>
                <div className="slider" ref={trackRef}>

                    <section className="panel panel--scroll" ref={createRef}>
                        <CreateEvent
                            apiBase={API_BASE}
                            showToast={showToast}
                            onEventCreated={(created) => {
                                setEvents(prev => [...prev, created]);
                            }}
                        />
                    </section>




                    <section className="panel panel--scroll" ref={myEventsRef}>
                        <MyEvents apiBase={API_BASE} events={sorted} onDelete={handleDelete} onCopyLink={handleCopyLink} showToast={showToast} />
                    </section>

                    <section className="panel panel--scroll" ref={invitesRef}>
                        <Invitations invites={invitesSorted} onRsvp={handleRsvp} onDeleteInvite={handleDeleteInvite} highlightId={highlightInviteId} />
                    </section>

                    <section className="panel panel--scroll">
                        <Calendar events={forCalendar} />
                    </section>

                    <section className="panel panel--scroll" ref={peopleRef}>
                        <People apiBase={API_BASE} showToast={showToast} isActive={active === 4} />
                    </section>
                    <section className="panel panel--scroll" ref={teamsRef}>
                        <Teams apiBase={API_BASE} showToast={showToast} isActive={active === 5} />
                    </section>



                </div>
                {(active === 0 || active === 1 || active === 2 || active === 4 || active === 5) && showTop && (
                    <button
                        className="btn btn--pill"
                        style={{ position: "fixed", right: 24, bottom: 24, zIndex: 2000 }}
                        onClick={() => {
                            const el =
                                active === 0 ? createRef.current :
                                    active === 1 ? myEventsRef.current :
                                        active === 2 ? invitesRef.current :
                                            active === 4 ? peopleRef.current :
                                                active === 5 ? teamsRef.current :
                                                    null;

                            el?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    >
                        ↑ Arriba
                    </button>
                )}


            </main>

            <div
                className={`toast ${toastShown ? "toast--show" : ""} `}
                role="status"
                aria-live="polite"
            >
                {toastMsg}
            </div>

        </div>
    );
}
