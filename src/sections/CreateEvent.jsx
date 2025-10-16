import { useState, useRef } from "react";

export default function CreateEvent({ onCreate }) {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [location, setLocation] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const titleRef = useRef(null);

    async function submit() {
        if (submitting) return;
        if (!title || !date) return;

        setSubmitting(true);
        try {
            await Promise.resolve(
                onCreate?.({ title, date, time, location, description })
            );
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
            setTitle("");
            setDate("");
            setTime("");
            setLocation("");
            setDescription("");
            requestAnimationFrame(() => titleRef.current?.focus());
        }
    }

    function clear() {
        setTitle("");
        setDate("");
        setTime("");
        setLocation("");
        setDescription("");
        titleRef.current?.focus();
    }

    return (
        <div className="card">
            <h2>Crear evento</h2>
            <div className="grid-2">
                <label>
                    Título{" "}
                    <input
                        ref={titleRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Taller de React"
                    />
                </label>
                <div className="grid-2">
                    <label>
                        Fecha{" "}
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </label>
                    <label>
                        Hora{" "}
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </label>
                </div>
                <label style={{ gridColumn: "1 / -1" }}>
                    Lugar{" "}
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Auditorio A"
                    />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                    Descripción{" "}
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detalles, agenda, recordatorios..."
                    />
                </label>
            </div>
            <div className="controls">
                <button
                    className="btn"
                    onClick={submit}
                    disabled={submitting}
                >
                    Crear
                </button>
                <button
                    className="btn btn--outline"
                    onClick={clear}
                    disabled={submitting}
                >
                    Limpiar
                </button>
            </div>
        </div>
    );
}
