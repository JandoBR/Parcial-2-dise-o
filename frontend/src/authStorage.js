// src/authStorage.js
const KEY = "ee_auth";

export function setAuth(token, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const value = { token, exp: Date.now() + ttlMs };
    localStorage.setItem(KEY, JSON.stringify(value));
}

export function getAuth() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
        const o = JSON.parse(raw);
        if (o.exp && o.exp > Date.now()) return o.token;
    } catch { }
    localStorage.removeItem(KEY);
    return null;
}

export function isAuthed() {
    return !!getAuth();
}

export function clearAuth() {
    localStorage.removeItem(KEY);
}
