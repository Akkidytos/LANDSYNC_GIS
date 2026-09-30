import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
import client from "../api/client";
const Ctx = createContext({});
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem("landsync_user");
        return raw ? JSON.parse(raw) : null;
    });
    async function login(email, password) {
        const res = await client.post("/api/auth/login", { email, password });
        const { token, user } = res.data.data;
        localStorage.setItem("landsync_token", token);
        localStorage.setItem("landsync_user", JSON.stringify(user));
        setUser(user);
    }
    function logout() {
        client.post("/api/auth/logout").catch(() => { });
        localStorage.removeItem("landsync_token");
        localStorage.removeItem("landsync_user");
        setUser(null);
    }
    return _jsx(Ctx.Provider, { value: { user, login, logout }, children: children });
}
export const useAuth = () => useContext(Ctx);
