import { createContext, useContext, useState, ReactNode } from "react";
import client from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OFFICER" | "CITIZEN";
  phone?: string;
  department?: string;
}

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("landsync_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email: string, password: string) {
    const res = await client.post("/api/auth/login", { email, password });
    const { token, user } = res.data.data;
    localStorage.setItem("landsync_token", token);
    localStorage.setItem("landsync_user", JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    client.post("/api/auth/logout").catch(() => {});
    localStorage.removeItem("landsync_token");
    localStorage.removeItem("landsync_user");
    setUser(null);
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
