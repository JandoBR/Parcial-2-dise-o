// src/pages/AuthRegister.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function AuthRegister() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/app";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const [error, setError] = useState("");

    function fakeRegister(e) {
        e.preventDefault();
        setError("");

        // Validaciones mínimas
        if (!name.trim() || !email.trim() || !pass.trim()) {
            setError("Completa todos los campos antes de continuar.");
            return;
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setError("El correo no tiene un formato válido.");
            return;
        }
        if (pass.length < 4) {
            setError("La contraseña debe tener al menos 4 caracteres.");
            return;
        }

        // Registro simulado
        localStorage.setItem("ee_auth", "1");
        navigate(from, { replace: true });
    }

    return (
        <div className="container narrow" style={{ marginTop: 48 }}>
            <h1 style={{ marginBottom: 12 }}>EventEase — Registro</h1>
            <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
                Crea tu cuenta para comenzar a organizar eventos fácilmente.
            </p>

            <form onSubmit={fakeRegister} className="stack">
                <label>
                    Nombre
                    <input
                        type="text"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Correo
                    <input
                        type="email"
                        placeholder="tucorreo@ejemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Contraseña
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={pass}
                        onChange={e => setPass(e.target.value)}
                        required
                    />
                </label>

                {error && (
                    <div
                        className="card"
                        style={{
                            background: "#fef2f2",
                            color: "#7f1d1d",
                            border: "1px solid #fecaca",
                            borderRadius: 12,
                            padding: "8px 12px",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                    <button className="btn" type="submit">
                        Crear cuenta
                    </button>
                    <Link className="link" to="/auth/login">
                        Iniciar sesión
                    </Link>
                </div>
            </form>
        </div>
    );
}
