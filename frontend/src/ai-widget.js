import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const STAR = "\u2726";
const CLOSE = "\u00D7";
function headers() {
    const token = localStorage.getItem("landsync_token") || "";
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}
async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            ...headers(),
            ...(options.headers || {})
        }
    });
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch {
        data = text;
    }
    if (!res.ok) {
        const detail = data?.detail ?? data?.message ?? data?.error ?? data;
        const msg = typeof detail === "string" ? detail : `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return data;
}
function rowsFrom(data, names = []) {
    for (const name of names) {
        const value = data?.data?.[name] ?? data?.[name];
        if (Array.isArray(value))
            return value;
    }
    if (Array.isArray(data?.data))
        return data.data;
    if (Array.isArray(data))
        return data;
    return [];
}
function answerFrom(data) {
    return String(data?.data?.answer ??
        data?.data?.response ??
        data?.data?.message ??
        data?.answer ??
        data?.response ??
        data?.message ??
        "");
}
function text(value) {
    return String(value ?? "").toLowerCase();
}
function parcelLine(row) {
    const ulpin = row?.ulpin ?? row?.parcel_id ?? row?.id ?? "Unknown parcel";
    const owner = row?.owner_name ?? row?.owner ?? "Owner not available";
    const use = row?.land_use ?? "Land use unavailable";
    const area = row?.area != null ? `${row.area} ${row?.area_unit ?? ""}`.trim() : "Area unavailable";
    const place = [row?.village, row?.district, row?.state].filter(Boolean).join(", ");
    const status = row?.verification_status ?? row?.status ?? row?.registration_status ?? "Record available";
    return `${ulpin} | ${owner} | ${use} | ${area} | ${place || "Location unavailable"} | ${status}`;
}
async function liveFallback(message) {
    const q = text(message);
    if (q.includes("request") || q.includes("service") || q.includes("application") || q.includes("pending")) {
        const data = await request("/api/services/requests");
        const items = rowsFrom(data, ["requests", "records"]);
        if (!items.length)
            return "No accessible service requests were found.";
        const out = [`Accessible service requests: ${items.length}`];
        items.slice(0, 8).forEach((item) => {
            const code = item?.request_code ?? item?.id ?? "Request";
            const kind = item?.service_type ?? item?.subject ?? "Service Request";
            const status = item?.status ?? "Unknown";
            out.push(`${code} - ${kind} - ${status}`);
        });
        return out.join("\n");
    }
    if (q.includes("summary") || q.includes("overview") || q.includes("analytics") || q.includes("overall")) {
        try {
            const data = await request("/api/analytics");
            const row = data?.data ?? data;
            const count = row?.parcel_count ?? row?.total_parcels ?? "not available";
            return `LandSync live summary: ${count} accessible parcel record(s).`;
        }
        catch {
            const data = await request("/api/parcels");
            const items = rowsFrom(data, ["records", "parcels"]);
            return `LandSync live summary: ${items.length} accessible parcel record(s).`;
        }
    }
    const data = await request("/api/parcels");
    const items = rowsFrom(data, ["records", "parcels"]);
    if (!items.length) {
        return "No accessible parcel records were found.";
    }
    let filtered = items;
    const uses = ["residential", "agricultural", "commercial", "industrial", "institutional", "mixed_use"];
    const use = uses.find(value => q.includes(value.replace("_", " ")));
    if (use) {
        filtered = filtered.filter((row) => text(row?.land_use).replace("-", "_") === use);
    }
    const places = [
        "shimla", "kangra", "dehradun", "nainital", "amritsar", "ludhiana",
        "gurugram", "panipat", "jaipur", "udaipur", "ahmedabad", "surat",
        "pune", "nagpur", "bengaluru", "mysuru", "kolkata", "darjeeling",
        "chennai", "madurai", "himachal pradesh", "uttarakhand", "punjab",
        "haryana", "rajasthan", "gujarat", "maharashtra", "karnataka",
        "west bengal", "tamil nadu"
    ];
    const place = places.find(value => q.includes(value));
    if (place) {
        filtered = filtered.filter((row) => {
            const hay = [
                row?.state, row?.district, row?.tehsil, row?.village,
                row?.owner_name, row?.owner
            ].map(text).join(" ");
            return hay.includes(place);
        });
    }
    const wantsLand = q.includes("land") ||
        q.includes("zameen") ||
        q.includes("parcel") ||
        q.includes("property") ||
        q.includes("record") ||
        q.includes("dikhao");
    if (!wantsLand) {
        return "Try: meri land dikhao, residential land dikhao, Shimla wali land dikhao, mere requests dikhao, ya meri land ka summary do.";
    }
    if (!filtered.length) {
        return "No accessible parcel matched this query.";
    }
    const out = [`Found ${filtered.length} accessible parcel record(s):`];
    filtered.slice(0, 8).forEach((row) => out.push(parcelLine(row)));
    if (filtered.length > 8) {
        out.push(`Showing 8 of ${filtered.length} records.`);
    }
    return out.join("\n");
}
export default function AIWidget() {
    const [open, setOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([
        {
            id: "welcome",
            role: "assistant",
            content: "Namaste! Main LandSync AI hoon. Aap land, parcels, RoR, service requests, reports aur analytics ke baare mein pooch sakte ho."
        }
    ]);
    useEffect(() => {
        if (open)
            refreshHistory();
    }, [open]);
    async function refreshHistory() {
        try {
            const data = await request("/api/ai/conversations");
            setConversations(rowsFrom(data, ["conversations", "records"]));
        }
        catch {
            setConversations([]);
        }
    }
    async function createConversation(title = "New LandSync Chat") {
        try {
            const data = await request("/api/ai/conversations", {
                method: "POST",
                body: JSON.stringify({ title })
            });
            const row = data?.data ?? data;
            const id = row?.id ?? row?.conversation_id;
            return id ? String(id) : null;
        }
        catch {
            return null;
        }
    }
    async function saveMessage(id, role, content) {
        try {
            await request(`/api/ai/conversations/${id}/messages`, {
                method: "POST",
                body: JSON.stringify({ role, content })
            });
        }
        catch { }
    }
    async function loadConversation(id) {
        try {
            const data = await request(`/api/ai/conversations/${id}`);
            const row = data?.data ?? data;
            const items = Array.isArray(row?.messages) ? row.messages : [];
            setConversationId(id);
            setMessages(items.map((item, index) => ({
                id: String(item?.id ?? `${id}-${index}`),
                role: item?.role === "user" ? "user" : "assistant",
                content: String(item?.content ?? "")
            })));
            setHistoryOpen(false);
        }
        catch {
            setMessages([{ id: "history-error", role: "assistant", content: "Chat history load nahi ho paayi." }]);
        }
    }
    async function newChat() {
        const id = await createConversation();
        setConversationId(id);
        setMessages([{ id: "new-chat", role: "assistant", content: "New LandSync chat ready." }]);
        setHistoryOpen(false);
        refreshHistory();
    }
    async function deleteConversation(id) {
        try {
            await request(`/api/ai/conversations/${id}`, { method: "DELETE" });
        }
        catch { }
        if (conversationId === id) {
            setConversationId(null);
            setMessages([]);
        }
        refreshHistory();
    }
    async function send() {
        const value = input.trim();
        if (!value || loading)
            return;
        setMessages(previous => [
            ...previous,
            { id: `u-${Date.now()}`, role: "user", content: value }
        ]);
        setInput("");
        setLoading(true);
        try {
            let id = conversationId;
            if (!id) {
                id = await createConversation(value.length > 44 ? `${value.slice(0, 44)}...` : value);
                if (id)
                    setConversationId(id);
            }
            if (id)
                await saveMessage(id, "user", value);
            let answer = "";
            try {
                const data = await request("/api/ai/chat", {
                    method: "POST",
                    body: JSON.stringify({
                        message: value,
                        context: window.location.pathname
                    })
                });
                answer = answerFrom(data);
            }
            catch (error) {
                answer = `AI Scientist API error: ${String(error?.message ?? "Unknown error")}`;
            }
            if (!answer) {
                answer = "AI Scientist returned an empty response.";
            }
            setMessages(previous => [
                ...previous,
                { id: `a-${Date.now()}`, role: "assistant", content: answer }
            ]);
            if (id) {
                await saveMessage(id, "assistant", answer);
                refreshHistory();
            }
        }
        catch (error) {
            setMessages(previous => [
                ...previous,
                {
                    id: `e-${Date.now()}`,
                    role: "assistant",
                    content: `LandSync lookup failed: ${String(error?.message ?? "Unknown error")}`
                }
            ]);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        .lsx-ai-fab{position:fixed!important;right:24px!important;bottom:22px!important;z-index:2147483000!important;display:flex!important;align-items:center!important;gap:10px!important;height:58px!important;padding:7px 17px 7px 8px!important;border:0!important;border-radius:30px!important;background:linear-gradient(135deg,#082b50,#0a5963)!important;color:#fff!important;cursor:pointer!important;box-shadow:0 18px 46px rgba(5,34,58,.32)!important;font:800 12px "Segoe UI",Arial,sans-serif!important}
        .lsx-ai-fab:hover{transform:translateY(-2px)}
        .lsx-ai-fab-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#ff9c2d,#e8771c);font-size:23px;font-weight:900}
        .lsx-ai-panel{position:fixed!important;right:24px!important;bottom:94px!important;z-index:2147482999!important;width:min(440px,calc(100vw - 32px))!important;height:min(675px,calc(100vh - 116px))!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;border:1px solid #d8e4ec!important;border-radius:25px!important;background:#f3f7fa!important;box-shadow:0 30px 82px rgba(4,29,51,.30)!important;font-family:"Segoe UI",Arial,sans-serif!important;color:#17304c!important}
        .lsx-ai-header{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:16px 17px!important;background:linear-gradient(135deg,#08284c,#0a4860 58%,#087451)!important;color:#fff!important}
        .lsx-ai-brand{display:flex;align-items:center;gap:11px}
        .lsx-ai-logo{width:46px;height:46px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#ff9d30,#eb741b);font-size:24px;font-weight:900}
        .lsx-ai-title{font-size:18px;font-weight:850;line-height:1.05}
        .lsx-ai-subtitle{margin-top:4px;font-size:10.5px;color:rgba(255,255,255,.75)}
        .lsx-ai-actions{display:flex;gap:6px}
        .lsx-ai-actions button{width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font-size:15px}
        .lsx-ai-actions button:hover{background:rgba(255,255,255,.2)}
        .lsx-ai-status{display:flex;align-items:center;gap:8px;padding:9px 15px;background:#fff;border-bottom:1px solid #e4ebf2;color:#6d8095;font-size:10.5px}
        .lsx-ai-dot{width:7px;height:7px;border-radius:50%;background:#15ad71}
        .lsx-ai-history{position:absolute;left:12px;right:12px;top:72px;z-index:20;max-height:315px;overflow:hidden;border:1px solid #d9e3ed;border-radius:15px;background:#fff;box-shadow:0 20px 52px rgba(4,29,51,.18)}
        .lsx-ai-history-head{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid #e8edf2;font-size:12px;font-weight:800}
        .lsx-ai-history-head button{border:0;border-radius:8px;padding:7px 9px;background:#0b4164;color:#fff;cursor:pointer;font-size:10px;font-weight:700}
        .lsx-ai-history-list{max-height:260px;overflow:auto}
        .lsx-ai-history-row{display:grid;grid-template-columns:1fr 40px;border-bottom:1px solid #edf2f5}
        .lsx-ai-history-open{min-width:0;border:0;background:transparent;text-align:left;padding:10px 12px;cursor:pointer}
        .lsx-ai-history-open strong,.lsx-ai-history-open small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lsx-ai-history-open strong{font-size:11.5px;color:#1c3653}
        .lsx-ai-history-open small{margin-top:3px;font-size:9px;color:#8796a7}
        .lsx-ai-delete{border:0;background:transparent;color:#995050;cursor:pointer}
        .lsx-ai-messages{flex:1;min-height:0;overflow:auto;padding:16px;background:linear-gradient(180deg,#fafcfd,#eff5f8)}
        .lsx-ai-row{display:flex;align-items:flex-end;gap:7px;margin:9px 0}
        .lsx-ai-row.user{justify-content:flex-end}
        .lsx-ai-mini{width:25px;height:25px;display:grid;place-items:center;flex:0 0 25px;border-radius:8px;background:linear-gradient(135deg,#ff9d30,#eb741b);color:#fff;font-size:13px;font-weight:900}
        .lsx-ai-bubble{max-width:82%;padding:11px 13px;border-radius:16px;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
        .lsx-ai-bubble.assistant{background:#fff;border:1px solid #dce6ef;border-bottom-left-radius:6px;color:#243c56}
        .lsx-ai-bubble.user{background:linear-gradient(135deg,#0d4268,#12577b);color:#fff;border-bottom-right-radius:6px}
        .lsx-ai-suggestions{display:flex;gap:7px;overflow-x:auto;padding:10px 12px;background:#fff;border-top:1px solid #e4ebf2}
        .lsx-ai-suggestions button{flex:0 0 auto;border:1px solid #d5e1ec;border-radius:999px;padding:8px 11px;background:#fff;color:#29435f;cursor:pointer;font-size:10.5px;font-weight:750;white-space:nowrap}
        .lsx-ai-composer{display:grid;grid-template-columns:minmax(0,1fr) 43px;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #e4ebf2}
        .lsx-ai-composer textarea{width:100%;min-height:43px;max-height:115px;resize:vertical;outline:none;padding:11px 12px;border:1px solid #d2dfeb;border-radius:13px;background:#fbfdff;color:#1e344d;font:12px "Segoe UI",Arial,sans-serif}
        .lsx-ai-send{min-height:43px;border:0;border-radius:13px;background:linear-gradient(135deg,#ff9b2f,#e8761f);color:#fff;cursor:pointer;font-size:12px;font-weight:900}
        .lsx-ai-send:disabled{opacity:.42;cursor:not-allowed}
        .lsx-ai-footer{padding:7px 11px 9px;text-align:center;background:#fff;border-top:1px solid #edf2f6;color:#8896a6;font-size:8.8px;line-height:1.35}
        @media(max-width:700px){.lsx-ai-panel{right:10px!important;bottom:80px!important;width:calc(100vw - 20px)!important;height:calc(100vh - 96px)!important;border-radius:20px!important}.lsx-ai-fab{right:12px!important;bottom:12px!important}}
      ` }), _jsxs("button", { className: "lsx-ai-fab", type: "button", onClick: () => { setOpen(value => !value); setHistoryOpen(false); }, title: open ? "Close LandSync AI" : "Open LandSync AI", children: [_jsx("span", { className: "lsx-ai-fab-icon", children: open ? CLOSE : STAR }), _jsx("span", { children: open ? "Close AI" : "LandSync AI" })] }), open && (_jsxs("section", { className: "lsx-ai-panel", "aria-label": "LandSync AI", children: [_jsxs("header", { className: "lsx-ai-header", children: [_jsxs("div", { className: "lsx-ai-brand", children: [_jsx("div", { className: "lsx-ai-logo", children: STAR }), _jsxs("div", { children: [_jsx("div", { className: "lsx-ai-title", children: "LandSync AI" }), _jsx("div", { className: "lsx-ai-subtitle", children: "Intelligent Land Governance Assistant" })] })] }), _jsxs("div", { className: "lsx-ai-actions", children: [_jsx("button", { type: "button", onClick: () => setHistoryOpen(value => !value), title: "History", children: "H" }), _jsx("button", { type: "button", onClick: newChat, title: "New chat", children: "+" }), _jsx("button", { type: "button", onClick: () => { setHistoryOpen(false); setOpen(false); }, title: "Close", children: CLOSE })] })] }), historyOpen && (_jsxs("div", { className: "lsx-ai-history", children: [_jsxs("div", { className: "lsx-ai-history-head", children: [_jsx("span", { children: "Conversation History" }), _jsx("button", { type: "button", onClick: newChat, children: "New chat" })] }), _jsx("div", { className: "lsx-ai-history-list", children: conversations.length ? conversations.map(item => (_jsxs("div", { className: "lsx-ai-history-row", children: [_jsxs("button", { type: "button", className: "lsx-ai-history-open", onClick: () => loadConversation(item.id), children: [_jsx("strong", { children: item.title || "LandSync Chat" }), _jsx("small", { children: item.updated_at ? new Date(item.updated_at).toLocaleString() : "Saved conversation" })] }), _jsx("button", { type: "button", className: "lsx-ai-delete", onClick: () => deleteConversation(item.id), title: "Delete", children: "X" })] }, item.id))) : _jsx("div", { className: "lsx-ai-history-head", children: "No saved conversations yet." }) })] })), _jsxs("div", { className: "lsx-ai-status", children: [_jsx("span", { className: "lsx-ai-dot" }), _jsx("span", { children: "LandSync AI - Live Governance Context" })] }), _jsxs("div", { className: "lsx-ai-messages", children: [messages.map(message => (_jsxs("div", { className: `lsx-ai-row ${message.role}`, children: [message.role === "assistant" ? _jsx("div", { className: "lsx-ai-mini", children: STAR }) : null, _jsx("div", { className: `lsx-ai-bubble ${message.role}`, children: message.content })] }, message.id))), loading ? (_jsxs("div", { className: "lsx-ai-row assistant", children: [_jsx("div", { className: "lsx-ai-mini", children: STAR }), _jsx("div", { className: "lsx-ai-bubble assistant", children: "Thinking..." })] })) : null] }), _jsxs("div", { className: "lsx-ai-suggestions", children: [_jsx("button", { type: "button", onClick: () => setInput("meri land dikhao"), children: "My land" }), _jsx("button", { type: "button", onClick: () => setInput("mere service requests dikhao"), children: "My requests" }), _jsx("button", { type: "button", onClick: () => setInput("RoR kya hota hai?"), children: "Explain RoR" }), _jsx("button", { type: "button", onClick: () => setInput("meri land ka summary do"), children: "Summary" })] }), _jsxs("div", { className: "lsx-ai-composer", children: [_jsx("textarea", { value: input, onChange: event => setInput(event.target.value), onKeyDown: event => { if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    send();
                                } }, placeholder: "Ask LandSync AI anything...", rows: 1 }), _jsx("button", { type: "button", className: "lsx-ai-send", onClick: send, disabled: !input.trim() || loading, children: "Send" })] }), _jsx("div", { className: "lsx-ai-footer", children: "Answers use your LandSync permissions. Demo data is not official land-title evidence." })] }))] }));
}
export function AIChat() {
    return _jsx(AIWidget, {});
}
export function LandSyncAI() {
    return _jsx(AIWidget, {});
}
