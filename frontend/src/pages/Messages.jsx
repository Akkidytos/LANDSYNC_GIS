import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "landsync_messages";

const seedMessages = [
  {
    id: 1,
    from: "LandSync System",
    to: "You",
    subject: "Welcome to Messages",
    body: "This is your LandSync message center. You can search, filter, read, reply and compose messages here.",
    type: "System",
    unread: true,
    time: "Just now"
  },
  {
    id: 2,
    from: "Land Officer",
    to: "You",
    subject: "Land Record Update",
    body: "Your land record information has been updated and is available in the Land Registry section.",
    type: "Request",
    unread: true,
    time: "Today"
  },
  {
    id: 3,
    from: "LandSync Administration",
    to: "You",
    subject: "Portal Notification",
    body: "The LandSync portal is ready for communication between citizens, officers and administrators.",
    type: "System",
    unread: false,
    time: "Yesterday"
  }
];

function getRole() {
  try {
    const raw =
      localStorage.getItem("landsync_user") ||
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser");

    if (!raw) return "CITIZEN";

    const parsed = JSON.parse(raw);
    return String(parsed?.role || "CITIZEN").toUpperCase();
  } catch {
    return "CITIZEN";
  }
}

function getMessages() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : seedMessages;
  } catch {
    return seedMessages;
  }
}

export default function Messages() {
  const [role] = useState(getRole);
  const [messages, setMessages] = useState(getMessages);
  const [selectedId, setSelectedId] = useState(messages[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [compose, setCompose] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const unreadCount = messages.filter((m) => m.unread).length;

  const visibleMessages = useMemo(() => {
    return messages.filter((m) => {
      const text =
        `${m.from} ${m.to} ${m.subject} ${m.body}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && m.unread) ||
        (filter === "REQUEST" && m.type === "Request") ||
        (filter === "SYSTEM" && m.type === "System");

      return matchesSearch && matchesFilter;
    });
  }, [messages, search, filter]);

  const selected =
    messages.find((m) => m.id === selectedId) ||
    visibleMessages[0] ||
    null;

  function openMessage(id) {
    setSelectedId(id);

    setMessages((current) =>
      current.map((m) =>
        m.id === id ? { ...m, unread: false } : m
      )
    );
  }

  function sendMessage() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) return;

    const newMessage = {
      id: Date.now(),
      from: role,
      to: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
      type: "Request",
      unread: false,
      time: "Just now"
    };

    setMessages((current) => [newMessage, ...current]);
    setSelectedId(newMessage.id);

    setRecipient("");
    setSubject("");
    setBody("");
    setCompose(false);
  }

  function closeMessages() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  }

  const recipients =
    role === "ADMIN"
      ? ["OFFICER"]
      : role === "OFFICER"
      ? ["ADMIN", "CITIZEN"]
      : ["OFFICER", "ADMIN"];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>LANDSYNC</div>
          <h1 style={styles.title}>Messages</h1>
          <div style={styles.subtitle}>
            Inbox, updates and communication
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.roleBadge}>
            {role}
          </div>

          <button
            onClick={closeMessages}
            style={styles.closeButton}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.toolbar}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            style={styles.search}
          />

          <div style={styles.filters}>
            {[
              ["ALL", "All"],
              ["UNREAD", `Unread ${unreadCount}`],
              ["REQUEST", "Requests"],
              ["SYSTEM", "System"]
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  ...styles.filterButton,
                  ...(filter === key ? styles.activeFilter : {})
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCompose(true)}
            style={styles.composeButton}
          >
            + New Message
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.inbox}>
            <div style={styles.inboxTitle}>
              Inbox
              <span>{messages.length}</span>
            </div>

            {visibleMessages.length === 0 ? (
              <div style={styles.empty}>
                No messages found.
              </div>
            ) : (
              visibleMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => openMessage(message.id)}
                  style={{
                    ...styles.messageRow,
                    ...(selected?.id === message.id
                      ? styles.selectedRow
                      : {})
                  }}
                >
                  <div style={styles.rowTop}>
                    <span style={styles.sender}>
                      {message.from}
                    </span>
                    {message.unread && <span style={styles.dot} />}
                  </div>

                  <div style={styles.subject}>
                    {message.subject}
                  </div>

                  <div style={styles.preview}>
                    {message.body}
                  </div>

                  <div style={styles.rowBottom}>
                    <span>{message.type}</span>
                    <span>{message.time}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div style={styles.detail}>
            {selected ? (
              <>
                <div style={styles.detailHeader}>
                  <div>
                    <div style={styles.detailType}>
                      {selected.type}
                    </div>
                    <h2 style={styles.detailTitle}>
                      {selected.subject}
                    </h2>
                  </div>

                  <span style={styles.time}>
                    {selected.time}
                  </span>
                </div>

                <div style={styles.meta}>
                  <strong>From:</strong> {selected.from}
                  <br />
                  <strong>To:</strong> {selected.to}
                </div>

                <div style={styles.body}>
                  {selected.body}
                </div>

                <div style={styles.detailActions}>
                  <button
                    onClick={() => setCompose(true)}
                    style={styles.actionButton}
                  >
                    Reply
                  </button>

                  <button
                    onClick={() =>
                      setMessages((current) =>
                        current.map((m) =>
                          m.id === selected.id
                            ? { ...m, unread: !m.unread }
                            : m
                        )
                      )
                    }
                    style={styles.actionButton}
                  >
                    {selected.unread
                      ? "Mark as Read"
                      : "Mark as Unread"}
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.noSelection}>
                Select a message to view it.
              </div>
            )}
          </div>
        </div>
      </div>

      {compose && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.eyebrow}>LANDSYNC</div>
                <h2 style={{ margin: 0 }}>New Message</h2>
              </div>

              <button
                onClick={() => setCompose(false)}
                style={styles.modalClose}
              >
                ×
              </button>
            </div>

            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              style={styles.input}
            >
              <option value="">Select recipient</option>
              {recipients.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              style={styles.input}
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              style={styles.textarea}
            />

            <div style={styles.modalActions}>
              <button
                onClick={() => setCompose(false)}
                style={styles.cancel}
              >
                Cancel
              </button>

              <button
                onClick={sendMessage}
                style={styles.send}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background:
      "linear-gradient(135deg, #f5f7fb 0%, #eef2f7 100%)",
    boxSizing: "border-box",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#172033"
  },

  header: {
    maxWidth: "1400px",
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  eyebrow: {
    fontSize: "11px",
    letterSpacing: "2px",
    fontWeight: 800,
    color: "#56657a",
    marginBottom: "5px"
  },

  title: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 800
  },

  subtitle: {
    marginTop: "5px",
    color: "#69778a",
    fontSize: "14px"
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  roleBadge: {
    padding: "8px 13px",
    borderRadius: "999px",
    background: "#e7edf7",
    color: "#29405e",
    fontSize: "12px",
    fontWeight: 800
  },

  closeButton: {
    width: "42px",
    height: "42px",
    border: "1px solid #d7dee8",
    borderRadius: "12px",
    background: "#fff",
    fontSize: "28px",
    lineHeight: 1,
    cursor: "pointer",
    color: "#39465b"
  },

  card: {
    maxWidth: "1400px",
    margin: "0 auto",
    background: "#fff",
    border: "1px solid #dde3eb",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 18px 50px rgba(33, 45, 66, 0.08)"
  },

  toolbar: {
    padding: "18px",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    borderBottom: "1px solid #e8edf3",
    flexWrap: "wrap"
  },

  search: {
    flex: "1 1 230px",
    minWidth: "220px",
    padding: "12px 14px",
    border: "1px solid #dce3ec",
    borderRadius: "12px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box"
  },

  filters: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap"
  },

  filterButton: {
    border: "1px solid #dce3ec",
    background: "#fff",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 700,
    color: "#536176"
  },

  activeFilter: {
    background: "#172033",
    borderColor: "#172033",
    color: "#fff"
  },

  composeButton: {
    border: 0,
    borderRadius: "11px",
    padding: "11px 15px",
    background: "#172033",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800
  },

  content: {
    display: "grid",
    gridTemplateColumns: "410px 1fr",
    minHeight: "610px"
  },

  inbox: {
    borderRight: "1px solid #e8edf3",
    background: "#fbfcfe",
    overflow: "auto"
  },

  inboxTitle: {
    padding: "17px 18px",
    fontWeight: 800,
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #e8edf3"
  },

  messageRow: {
    width: "100%",
    textAlign: "left",
    border: 0,
    borderBottom: "1px solid #edf1f5",
    padding: "17px",
    background: "transparent",
    cursor: "pointer",
    display: "block",
    boxSizing: "border-box"
  },

  selectedRow: {
    background: "#eef4ff"
  },

  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  sender: {
    fontWeight: 800,
    fontSize: "13px"
  },

  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#1e6fff",
    display: "inline-block"
  },

  subject: {
    marginTop: "7px",
    fontWeight: 750,
    fontSize: "14px"
  },

  preview: {
    marginTop: "5px",
    color: "#718096",
    fontSize: "12px",
    lineHeight: 1.45,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  },

  rowBottom: {
    marginTop: "10px",
    display: "flex",
    justifyContent: "space-between",
    color: "#8a96a8",
    fontSize: "11px"
  },

  detail: {
    padding: "34px",
    background: "#fff"
  },

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px"
  },

  detailType: {
    fontSize: "11px",
    letterSpacing: "1px",
    textTransform: "uppercase",
    color: "#55708f",
    fontWeight: 800
  },

  detailTitle: {
    margin: "7px 0 0",
    fontSize: "25px"
  },

  time: {
    color: "#8995a5",
    fontSize: "12px"
  },

  meta: {
    marginTop: "20px",
    padding: "14px 16px",
    background: "#f7f9fc",
    borderRadius: "12px",
    color: "#5c6878",
    fontSize: "13px",
    lineHeight: 1.7
  },

  body: {
    marginTop: "24px",
    fontSize: "15px",
    lineHeight: 1.8,
    color: "#3c4757",
    whiteSpace: "pre-wrap"
  },

  detailActions: {
    marginTop: "30px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },

  actionButton: {
    border: "1px solid #dce3ec",
    background: "#fff",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    color: "#354257"
  },

  empty: {
    padding: "30px",
    color: "#8a96a8",
    textAlign: "center"
  },

  noSelection: {
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "#8995a5"
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(13, 21, 34, 0.48)",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    zIndex: 9999
  },

  modal: {
    width: "min(620px, 100%)",
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    boxSizing: "border-box",
    boxShadow: "0 30px 80px rgba(0,0,0,.2)"
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "20px"
  },

  modalClose: {
    border: 0,
    background: "transparent",
    fontSize: "28px",
    cursor: "pointer"
  },

  input: {
    width: "100%",
    marginBottom: "12px",
    padding: "12px 13px",
    border: "1px solid #dce3ec",
    borderRadius: "10px",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "#fff"
  },

  textarea: {
    width: "100%",
    height: "180px",
    resize: "vertical",
    padding: "13px",
    border: "1px solid #dce3ec",
    borderRadius: "10px",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none"
  },

  modalActions: {
    marginTop: "15px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px"
  },

  cancel: {
    border: "1px solid #dce3ec",
    background: "#fff",
    borderRadius: "10px",
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 700
  },

  send: {
    border: 0,
    background: "#172033",
    color: "#fff",
    borderRadius: "10px",
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 800
  }
};