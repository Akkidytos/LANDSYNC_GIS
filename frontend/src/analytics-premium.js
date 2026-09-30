const LS_ANALYTICS = "landsync-analytics-theme";
const labels = [
    "Total Parcels",
    "Verified Parcels",
    "Pending Records",
    "Encumbered Parcels",
    "Total Land Area",
    "Active Requests",
    "Completed Requests"
];
function analyticsPage() {
    return /\/analytics(?:\/|$)/.test(location.pathname);
}
function findText(text) {
    return Array.from(document.querySelectorAll("*")).find(el => el.children.length === 0 && el.textContent?.trim() === text) || null;
}
function cardOf(el) {
    let n = el?.parentElement || null;
    for (let i = 0; i < 7 && n; i++, n = n.parentElement) {
        if (n.matches("article,section,[class*='card'],[class*='Card'],[class*='panel'],[class*='Panel']")) {
            return n;
        }
    }
    return null;
}
function decorate() {
    if (!document.body.classList.contains(LS_ANALYTICS))
        return;
    labels.forEach((label, index) => {
        const labelEl = findText(label);
        const card = cardOf(labelEl);
        if (!card)
            return;
        card.classList.add("ls-kpi-card", `ls-kpi-${index + 1}`);
        labelEl?.classList.add("ls-kpi-label");
        const nodes = Array.from(card.querySelectorAll("*"));
        const number = nodes.find(el => {
            const t = el.textContent?.trim() || "";
            return el.children.length === 0 && /^[\d,.]+(?:\s*(?:sq\s*m|m²|acres?|ha))?$/i.test(t);
        });
        number?.classList.add("ls-kpi-number");
    });
    Array.from(document.querySelectorAll(".recharts-wrapper,.recharts-responsive-container,svg.recharts-surface,canvas,[class*='chart'],[class*='Chart']")).forEach(chart => {
        const card = cardOf(chart);
        if (card)
            card.classList.add("ls-chart-card");
    });
    const title = findText("Analytics");
    const header = cardOf(title);
    header?.classList.add("ls-analytics-header");
    if (header && !header.querySelector(".ls-live-analytics")) {
        const badge = document.createElement("span");
        badge.className = "ls-live-analytics";
        badge.textContent = "LIVE ANALYTICS";
        header.appendChild(badge);
    }
    document.querySelectorAll("select").forEach(s => {
        const v = (s.value || "").toLowerCase();
        const t = (s.parentElement?.textContent || "").toLowerCase();
        if (v.includes("month") || t.includes("period")) {
            s.classList.add("ls-period-select");
        }
    });
}
function sync() {
    const active = analyticsPage();
    document.body.classList.toggle(LS_ANALYTICS, active);
    if (active) {
        setTimeout(decorate, 80);
        setTimeout(decorate, 300);
        setTimeout(decorate, 800);
    }
}
document.addEventListener("DOMContentLoaded", sync);
window.addEventListener("popstate", sync);
setInterval(sync, 1000);
