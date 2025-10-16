import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* Tu parseToken tal cual */
function parseToken() {
    const path = window.location.pathname || "";
    const m = path.match(/^\/invite\/([A-Za-z0-9_-]+)\/?$/i);
    if (m) return m[1];
    const h = window.location.hash || "";
    const mh = h.match(/#\/?invite\/([A-Za-z0-9_-]+)\/?$/i);
    if (mh) return mh[1];
    return null;
}

/* Tu simulación de servidor */
async function acceptInviteOnServer(token) {
    // simula trabajo inesperado real con un pequeño delay
    await new Promise(r => setTimeout(r, 50));
    return {
        id: `inv-${token.slice(0, 10)}`,
        title: "Nueva invitación",
        date: "2025-11-05",
        time: "18:00",
        location: "Sala B",
        host: "Organizador",
        rsvp: "pending",
    };
}

function isAuthed() {
    return Boolean(localStorage.getItem("ee_auth"));
}

export default function Invite() {
    const token = useMemo(parseToken, []);
    const processedRef = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        let timeoutId;

        async function processInvite() {
            if (!token) {
                // sin token, vete a la home o al login según sesión
                navigate(isAuthed() ? "/" : "/auth/login", { replace: true });
                return;
            }
            if (processedRef.current) return; // evita doble corrida en StrictMode
            processedRef.current = true;

            // ⛑️ Timeout de salvamento: nunca te quedes colgado aquí
            timeoutId = setTimeout(() => {
                // si por algún motivo no terminamos, forzamos salida al destino correcto
                navigate(isAuthed() ? "/" : "/auth/login", { replace: true });
            }, 4000);

            try {
                const inv = await acceptInviteOnServer(token);
                sessionStorage.setItem("ee_incoming_invite", JSON.stringify({ invite: inv }));
            } catch (e) {
                console.error(e);
                // incluso si falla, queremos salir de acá
            } finally {
                clearTimeout(timeoutId);
                // Limpia la URL (quita /invite/...) pero usa el router para navegar
                window.history.replaceState({}, "", "/");
                navigate(isAuthed() ? "/" : "/auth/login", { replace: true });
            }
        }

        processInvite();
        return () => clearTimeout(timeoutId);
    }, [token, navigate]);

    return (
        <div className="container" style={{ maxWidth: 720, marginTop: 32 }}>
            <h1>Procesando invitación...</h1>
            <p>Por favor espera un momento.</p>
        </div>
    );
}
