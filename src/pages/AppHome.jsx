import { useEffect, useRef, useState } from "react";
import CreateEvent from "../sections/CreateEvent.jsx";
import MyEvents from "../sections/MyEvents.jsx";
import Invitations from "../sections/Invitations.jsx";
import Calendar from "../sections/Calendar.jsx";

const TABS = [
    { key: "create", label: "Crear" },
    { key: "events", label: "Mis eventos" },
    { key: "invites", label: "Invitaciones" },
    { key: "calendar", label: "Calendario" },
];

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }


/* 🔗 Helper para construir la URL absoluta del invite */
function buildInviteUrl(tokenOrPath) {
    const isToken = !tokenOrPath?.startsWith("/");
    const path = isToken ? `/invite/${tokenOrPath}` : tokenOrPath;
    return `${window.location.origin}${path}`;
}

async function createInviteLinkOnServer(eventId) {
    await new Promise(r => setTimeout(r, 200)); // latencia simulada
    const token = `tok_${eventId.slice(0, 6)}_${uid().slice(0, 6)}`;
    return { token, inviteLink: `/invite/${token}` };
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

/** Eventos propios (seed) — con más invitados y variedad temporal */
const initialEvents = [
    {
        id: uid(),
        title: "Reunión de kickoff Q4",
        date: "2025-10-14",
        time: "09:30",
        location: "Sala 1A",
        description: "Definición de objetivos y responsabilidades del nuevo trimestre. Se revisarán métricas del Q3.",
        invitees: [
            { name: "Ana", email: "ana@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Luis", email: "luis@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Sofía", email: "sofia@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Carlos", email: "carlos@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Valeria", email: "valeria@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Tomás", email: "tomas@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Lucía", email: "lucia@ejemplo.com", rsvp: RSVP.CONFIRMED },
        ],
    },
    {
        id: uid(),
        title: "Observación astronómica",
        date: "2025-10-18",
        time: "20:30",
        location: "Mirador Cerro Alto",
        description: "Noche despejada, se llevará telescopio y cámara. Revisaremos constelaciones visibles y exposición larga.",
        invitees: [
            { name: "Héctor", email: "hector@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "María", email: "maria@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Esteban", email: "esteban@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Camila", email: "camila@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Andrea", email: "andrea@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Pablo", email: "pablo@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Rosa", email: "rosa@ejemplo.com", rsvp: RSVP.PENDING },
        ],
    },
    {
        id: uid(),
        title: "Entrega final de proyecto de Sistemas",
        date: "2025-10-20",
        time: "11:59",
        location: "Campus Virtual",
        description: "Subir PDF y repositorio antes del mediodía. Asegurarse de incluir README y pruebas unitarias.",
        invitees: [
            { name: "Laura", email: "laura@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Ricardo", email: "ricardo@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Juan", email: "juan@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Sara", email: "sara@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Elena", email: "elena@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Mateo", email: "mateo@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Diana", email: "diana@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Hugo", email: "hugo@ejemplo.com", rsvp: RSVP.PENDING },
        ],
    },
    {
        id: uid(),
        title: "Cumpleaños de Valeria",
        date: "2025-10-20",
        time: "19:30",
        location: "Casa de Valeria",
        description: "Fiesta temática de los 2000s. Habrá karaoke, comida y bebidas. Se permite traer un invitado.",
        invitees: [
            { name: "Valeria", email: "val@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Pablo", email: "pablo@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Marina", email: "marina@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Héctor", email: "hector@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Lucía", email: "lucia@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Santiago", email: "santiago@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "David", email: "david@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Paola", email: "paola@ejemplo.com", rsvp: RSVP.CONFIRMED },
        ],
    },
    {
        id: uid(),
        title: "Workshop: Rust y concurrencia",
        date: "2025-10-23",
        time: "16:00",
        location: "Lab 3",
        description: "Exploraremos el modelo async/await, Tokio y patrones de sincronización. Nivel intermedio.",
        invitees: [
            { name: "Mario", email: "mario@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Iván", email: "ivan@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Laura", email: "laura@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "César", email: "cesar@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Antonia", email: "antonia@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Rafael", email: "rafael@ejemplo.com", rsvp: RSVP.CONFIRMED },
        ],
    },
    {
        id: uid(),
        title: "Hacknight universitaria",
        date: "2025-11-01",
        time: "18:00",
        location: "Cowork — 2° piso",
        description: "Sesión nocturna con retos de IA, mini hackathon y pizza libre hasta medianoche.",
        invitees: [
            { name: "Alejandro", email: "ale@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Elena", email: "elena@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Miguel", email: "miguel@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Sofía", email: "sofia@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Camilo", email: "camilo@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Tania", email: "tania@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Andrés", email: "andres@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Nicolás", email: "nico@ejemplo.com", rsvp: RSVP.CONFIRMED },
        ],
    },
    {
        id: uid(),
        title: "Retrospectiva sprint 42",
        date: "2025-11-15",
        time: "14:00",
        location: "Sala 2B",
        description: "Revisión de métricas, tiempos de entrega y sugerencias del equipo.",
        invitees: [
            { name: "Ana", email: "ana@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Luis", email: "luis@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Sofía", email: "sofia@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Valeria", email: "valeria@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Carlos", email: "carlos@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Martín", email: "martin@ejemplo.com", rsvp: RSVP.CONFIRMED },
        ],
    },
    {
        id: uid(),
        title: "Retro del sprint 41",
        date: "2025-09-25",
        time: "15:00",
        location: "Sala 2B",
        description: "Revisión de aprendizajes y mejoras para próximos ciclos de desarrollo.",
        invitees: [
            { name: "Ana", email: "ana@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Luis", email: "luis@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Pedro", email: "pedro@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Diana", email: "diana@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Gabriel", email: "gabriel@ejemplo.com", rsvp: RSVP.REJECTED },
        ],
    },
    {
        id: uid(),
        title: "Cena aniversario de la facultad",
        date: "2025-10-05",
        time: "20:00",
        location: "Club Social Universitario",
        description: "Cena formal de gala con profesores y egresados. Dress code: formal.",
        invitees: [
            { name: "Mónica", email: "monica@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Camila", email: "camila@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Jorge", email: "jorge@ejemplo.com", rsvp: RSVP.REJECTED },
            { name: "Sebastián", email: "sebastian@ejemplo.com", rsvp: RSVP.PENDING },
            { name: "Liliana", email: "liliana@ejemplo.com", rsvp: RSVP.CONFIRMED },
            { name: "Oscar", email: "oscar@ejemplo.com", rsvp: RSVP.PENDING },
        ],
    },
];


/** Invitaciones recibidas (seed) — con distintas fechas y estados */
const initialInvites = [
    {
        id: uid(),
        title: "Revisión paper de IA",
        date: "2025-09-20",
        time: "17:00",
        location: "Biblioteca — Sala 4",
        host: "Carolina",
        rsvp: RSVP.CONFIRMED,
    },
    {
        id: uid(),
        title: "Charla sobre observatorios amateurs",
        date: "2025-10-08",
        time: "18:30",
        location: "Observatorio Municipal",
        host: "Julián",
        rsvp: RSVP.REJECTED,
    },
    {
        id: uid(),
        title: "Asado del viernes",
        date: "2025-10-11",
        time: "19:00",
        location: "Patio de Andrés",
        host: "Andrés",
        rsvp: RSVP.PENDING,
    },
    {
        id: uid(),
        title: "Meetup Linux & Homelab",
        date: "2025-10-25",
        time: "15:30",
        location: "Makerspace U.",
        host: "Comunidad LUG",
        rsvp: RSVP.CONFIRMED,
    },
    {
        id: uid(),
        title: "Workshop Docker avanzado",
        date: "2025-10-26",
        time: "10:00",
        location: "Aula Magna",
        host: "Paula",
        rsvp: RSVP.PENDING,
    },
    {
        id: uid(),
        title: "Concierto Oasis Tribute",
        date: "2025-10-31",
        time: "21:00",
        location: "Teatro Central",
        host: "Mateo",
        rsvp: RSVP.CONFIRMED,
    },
    {
        id: uid(),
        title: "Fotografía nocturna urbana",
        date: "2025-11-02",
        time: "19:00",
        location: "Puente del Río",
        host: "Lucía",
        rsvp: RSVP.PENDING,
    },
    {
        id: uid(),
        title: "Reunión de cátedra",
        date: "2025-09-30",
        time: "11:00",
        location: "Sala Zoom A",
        host: "Profesor Ríos",
        rsvp: RSVP.REJECTED,
    },
    {
        id: uid(),
        title: "Café con el equipo",
        date: "2025-10-19",
        time: "09:00",
        location: "Café Origen",
        host: "Ana",
        rsvp: RSVP.PENDING,
    },
    {
        id: uid(),
        title: "Taller: Testing en Rust",
        date: "2025-11-09",
        time: "16:30",
        location: "Lab 2",
        host: "Diego",
        rsvp: RSVP.CONFIRMED,
    },
];



export default function AppHome() {
    const [active, setActive] = useState(0);
    const [events, setEvents] = useState(initialEvents);
    const [invites, setInvites] = useState(initialInvites);

    const trackRef = useRef(null);
    const pos = useRef({ dragging: false, startX: 0, scrollX: 0 });

    // ref + botón arriba SOLO para "Mis eventos"
    const myEventsRef = useRef(null);
    const invitesRef = useRef(null);
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


    async function handleCreate(payload) {
        const token = uid();
        const inviteLink = `/invite/${token}`;
        const newEvent = { id: uid(), ...payload, inviteLink };

        setEvents(prev => [...prev, newEvent]);

        const full = buildInviteUrl(inviteLink);
        try {
            await navigator.clipboard.writeText(full);
            showToast("Enlace de invitación copiado");
        } catch {
            prompt("Copia este enlace:", full);
            showToast("Enlace listo para copiar");
        }
    }

    async function handleCopyLink(eventId) {
        const ev = events.find(e => e.id === eventId);
        if (!ev) {
            showToast("Evento no encontrado");
            return;
        }

        let link = ev.inviteLink;

        try {
            // Si no hay inviteLink en el evento (seed antiguo), pídeselo al servidor
            if (!link) {
                const { inviteLink } = await createInviteLinkOnServer(eventId);
                link = inviteLink;

                // Actualiza el evento con el link obtenido (persistencia local)
                setEvents(prev =>
                    prev.map(e => (e.id === eventId ? { ...e, inviteLink } : e))
                );
            }

            const full = buildInviteUrl(link);
            await navigator.clipboard.writeText(full);
            showToast("Enlace de invitación copiado");
        } catch (err) {
            console.error(err);
            // Fallback: si falla clipboard o la API, genera un link local de respaldo
            if (!link) {
                const fallback = `/invite/${uid()}`;
                const full = buildInviteUrl(fallback);
                prompt("Copia este enlace:", full);
            } else {
                prompt("Copia este enlace:", buildInviteUrl(link));
            }
            showToast("Enlace listo para copiar");
        }
    }

    function handleDelete(id) { setEvents(prev => prev.filter(e => e.id !== id)); }
    function handleRsvp(inviteId, value) {
        const v = clampRsvp(value);
        setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, rsvp: v } : i));
    }

    function handleDeleteInvite(inviteId) {
        setInvites(prev => prev.filter(i => i.id !== inviteId));
    }

    useEffect(() => {
        // identifica qué panel debe observarse según pestaña activa
        const el =
            active === 1 ? myEventsRef.current :
                active === 2 ? invitesRef.current : null;

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

    function logout() { localStorage.removeItem("ee_auth"); window.location.href = "/auth/login"; }

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
                const card = document.getElementById(`invite-${invite.id}`);

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
                        <button key={t.key} className={`tab ${i === active ? "tab--active" : ""}`} onClick={() => setActive(i)}>
                            {t.label}
                        </button>
                    ))}
                </nav>
                <div className="header__right">
                    <button className="btn btn--outline" onClick={logout}>Salir</button>
                </div>
            </header>

            <main className="shell__main container" style={{ position: "relative" }}>
                <div className="slider" ref={trackRef}>
                    <section className="panel">
                        <CreateEvent onCreate={handleCreate} />
                    </section>

                    <section className="panel panel--scroll" ref={myEventsRef}>
                        <MyEvents events={sorted} onDelete={handleDelete} onCopyLink={handleCopyLink} />
                    </section>

                    <section className="panel panel--scroll" ref={invitesRef}>
                        <Invitations invites={invitesSorted} onRsvp={handleRsvp} onDeleteInvite={handleDeleteInvite} highlightId={highlightInviteId} />
                    </section>

                    <section className="panel panel--scroll">
                        <Calendar events={forCalendar} />
                    </section>
                </div>
                {(active === 1 || active === 2) && showTop && (
                    <button
                        className="btn btn--pill"
                        style={{ position: "fixed", right: 24, bottom: 24, zIndex: 2000 }}
                        onClick={() => {
                            const el = active === 1 ? myEventsRef.current : invitesRef.current;
                            el?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    >
                        ↑ Arriba
                    </button>
                )}

            </main>

            <div
                className={`toast ${toastShown ? "toast--show" : ""}`}
                role="status"
                aria-live="polite"
            >
                {toastMsg}
            </div>

        </div>
    );
}
