import React, { useEffect, useMemo, useState } from "react";

type Message = {
  id: number;
  from: string;
  to: string;
  subject: string;
  body: string;
  type: "Request" | "System" | "Update";
  unread: boolean;
  time: string;
};

function getRole() {
  try {
    const raw = localStorage.getItem("landsync_user");
    const user = raw ? JSON.parse(raw) : null;
    return String(user?.role || "CITIZEN").toUpperCase();
  } catch {
    return "CITIZEN";
  }
}

function seedForRole(role: string): Message[] {
  if (role === "ADMIN") {
    return [
      { id: 1, from: "Land Officer", to: "You", subject: "Parcel Verification Completed", body: "The requested parcel verification has been completed successfully.", type: "Update", unread: true, time: "2 min ago" },
      { id: 2, from: "Citizen Services", to: "You", subject: "New Citizen Request", body: "A new citizen service request is waiting for administrative review.", type: "Request", unread: true, time: "18 min ago" },
      { id: 3, from: "LandSync System", to: "You", subject: "System Notification", body: "LandSync communication center is active.", type: "System", unread: true, time: "Today" }
    ];
  }

  if (role === "OFFICER") {
    return [
      { id: 1, from: "Citizen", to: "You", subject: "Land Information Request", body: "A citizen has requested information regarding a land record.", type: "Request", unread: true, time: "5 min ago" },
      { id: 2, from: "Administrator", to: "You", subject: "Verification Assignment", body: "A new parcel verification task has been assigned to you.", type: "Update", unread: true, time: "25 min ago" },
      { id: 3, from: "LandSync System", to: "You", subject: "System Notification", body: "Your communication center is ready.", type: "System", unread: true, time: "Today" }
    ];
  }

  return [
    { id: 1, from: "Land Officer", to: "You", subject: "Service Request Updated", body: "Your land service request has been updated by the concerned officer.", type: "Update", unread: true, time: "4 min ago" },
    { id: 2, from: "LandSync System", to: "You", subject: "Land Record Notification", body: "Your connected land information is available in the Land Registry.", type: "System", unread: true, time: "Today" },
    { id: 3, from: "Land Officer", to: "You", subject: "Verification Update", body: "Your parcel verification status has been updated.", type: "Request", unread: true, time: "Today" }
  ];
}

function storageKey(role: string) {
  return "landsync_popup_messages_" + role;
}

export default function MessagesPopup() {
  const [role] = useState(getRole);
  const [open, setOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "REQUEST" | "SYSTEM">("ALL");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey(getRole()));
      if (saved) return JSON.parse(saved);
    } catch {}
    return seedForRole(getRole());
  });

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey(role), JSON.stringify(messages));
  }, [messages, role]);

  const unread = messages.filter((m) => m.unread).length;

  const visible = useMemo(() => {
    const q = search.toLowerCase();

    return messages.filter((m) => {
      const matchesSearch =
        `${m.from} ${m.subject} ${m.body}`.toLowerCase().includes(q);

      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && m.unread) ||
        (filter === "REQUEST" && m.type === "Request") ||
        (filter === "SYSTEM" && m.type === "System");

      return matchesSearch && matchesFilter;
    });
  }, [messages, search, filter]);

  const selected =
    messages.find((m) => m.id === selectedId) || null;

  function openMessage(id: number) {
    setSelectedId(id);
    setMessages((list) =>
      list.map((m) =>
        m.id === id ? { ...m, unread: false } : m
      )
    );
  }

  function sendMessage() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) return;

    const item: Message = {
      id: Date.now(),
      from: role,
      to: recipient,
      subject,
      body,
      type: "Request",
      unread: false,
      time: "Just now"
    };

    setMessages((list) => [item, ...list]);
    setRecipient("");
    setSubject("");
    setBody("");
    setCompose(false);
    setSelectedId(item.id);
  }

  const recipients =
    role === "ADMIN"
      ? ["OFFICER"]
      : role === "OFFICER"
      ? ["ADMIN", "CITIZEN"]
      : ["OFFICER", "ADMIN"];

  return (
    <>
      <button
        className="ls-msg-launcher"
        onClick={() => setOpen(true)}
        aria-label="Open Messages"
      >
        <span className="ls-msg-icon">✉</span>
        <span className="ls-msg-label">Messages</span>
        {unread > 0 && <span className="ls-msg-badge">{unread}</span>}
      </button>

      {open && (
        <div className="ls-msg-popup">
          <div className="ls-msg-head">
            <div>
              <div className="ls-msg-kicker">LANDSYNC</div>
              <div className="ls-msg-title">Messages</div>
              <div className="ls-msg-sub">
                {unread > 0 ? `${unread} unread notifications` : "All messages read"}
              </div>
            </div>

            <button
              className="ls-msg-close"
              onClick={() => {
                setOpen(false);
                setSelectedId(null);
              }}
            >
              ×
            </button>
          </div>

          {!compose && !selected && (
            <>
              <div className="ls-msg-tools">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages..."
                />
              </div>

              <div className="ls-msg-tabs">
                {[
                  ["ALL", "All"],
                  ["UNREAD", "Unread"],
                  ["REQUEST", "Requests"],
                  ["SYSTEM", "System"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value as any)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="ls-msg-list">
                {visible.length === 0 ? (
                  <div className="ls-msg-empty">No messages found.</div>
                ) : (
                  visible.map((m) => (
                    <button
                      key={m.id}
                      className={`ls-msg-item ${m.unread ? "unread" : ""}`}
                      onClick={() => openMessage(m.id)}
                    >
                      <div className="ls-msg-avatar">
                        {m.from.charAt(0)}
                      </div>

                      <div className="ls-msg-item-content">
                        <div className="ls-msg-row">
                          <strong>{m.from}</strong>
                          <span>{m.time}</span>
                        </div>

                        <div className="ls-msg-item-subject">
                          {m.subject}
                        </div>

                        <div className="ls-msg-preview">
                          {m.body}
                        </div>
                      </div>

                      {m.unread && <span className="ls-msg-dot" />}
                    </button>
                  ))
                )}
              </div>

              <div className="ls-msg-footer">
                <button onClick={() => setCompose(true)}>
                  ＋ New Message
                </button>
                {unread > 0 && (
                  <button
                    onClick={() =>
                      setMessages((list) =>
                        list.map((m) => ({ ...m, unread: false }))
                      )
                    }
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </>
          )}

          {!compose && selected && (
            <div className="ls-msg-detail">
              <button
                className="ls-msg-back"
                onClick={() => setSelectedId(null)}
              >
                ← Back to inbox
              </button>

              <div className="ls-msg-detail-type">
                {selected.type}
              </div>

              <h3>{selected.subject}</h3>

              <div className="ls-msg-meta">
                <b>From:</b> {selected.from}
                <br />
                <b>To:</b> {selected.to}
              </div>

              <div className="ls-msg-detail-body">
                {selected.body}
              </div>

              <button
                className="ls-msg-reply"
                onClick={() => {
                  setRecipient(selected.from);
                  setSubject(`Re: ${selected.subject}`);
                  setCompose(true);
                }}
              >
                Reply
              </button>
            </div>
          )}

          {compose && (
            <div className="ls-msg-compose">
              <div className="ls-msg-compose-title">
                New Message
              </div>

              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              >
                <option value="">Select recipient</option>
                {recipients.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
              />

              <div className="ls-msg-compose-actions">
                <button onClick={() => setCompose(false)}>
                  Cancel
                </button>
                <button
                  className="send"
                  onClick={sendMessage}
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .ls-msg-launcher{
          position:fixed;
          left:18px;
          bottom:118px;
          width:230px;
          height:52px;
          z-index:2500;
          border:1px solid rgba(255,255,255,.12);
          border-radius:14px;
          background:linear-gradient(135deg,#123b67,#0a294c);
          color:#fff;
          display:flex;
          align-items:center;
          gap:11px;
          padding:0 14px;
          cursor:pointer;
          box-shadow:0 12px 30px rgba(4,24,45,.30);
          transition:.2s ease;
        }
        .ls-msg-launcher:hover{
          transform:translateY(-2px);
          box-shadow:0 16px 34px rgba(4,24,45,.38);
        }
        .ls-msg-icon{
          width:30px;
          height:30px;
          border-radius:9px;
          background:rgba(255,255,255,.13);
          display:grid;
          place-items:center;
          font-size:16px;
        }
        .ls-msg-label{
          font-size:14px;
          font-weight:800;
          letter-spacing:.2px;
        }
        .ls-msg-badge{
          margin-left:auto;
          min-width:21px;
          height:21px;
          padding:0 6px;
          border-radius:999px;
          background:#e53935;
          color:#fff;
          font-size:11px;
          font-weight:900;
          display:grid;
          place-items:center;
          box-shadow:0 0 0 3px rgba(229,57,53,.14);
        }

        .ls-msg-popup{
          position:fixed;
          left:262px;
          bottom:92px;
          width:385px;
          max-height:calc(100vh - 130px);
          z-index:2600;
          background:#fff;
          border:1px solid #dce4ed;
          border-radius:20px;
          overflow:hidden;
          box-shadow:0 28px 70px rgba(19,38,63,.25);
          animation:lsMsgIn .18s ease-out;
        }
        @keyframes lsMsgIn{
          from{opacity:0;transform:translateY(10px) scale(.98)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }

        .ls-msg-head{
          padding:17px 18px 15px;
          background:linear-gradient(135deg,#0c3158,#164e7c);
          color:#fff;
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }
        .ls-msg-kicker{
          font-size:9px;
          letter-spacing:2px;
          font-weight:900;
          opacity:.72;
        }
        .ls-msg-title{
          margin-top:4px;
          font-size:22px;
          font-weight:900;
        }
        .ls-msg-sub{
          margin-top:4px;
          font-size:11px;
          opacity:.78;
        }
        .ls-msg-close{
          width:32px;
          height:32px;
          border:0;
          border-radius:9px;
          background:rgba(255,255,255,.13);
          color:#fff;
          font-size:23px;
          line-height:1;
          cursor:pointer;
        }

        .ls-msg-tools{
          padding:12px 14px 8px;
        }
        .ls-msg-tools input,
        .ls-msg-compose input,
        .ls-msg-compose select,
        .ls-msg-compose textarea{
          width:100%;
          border:1px solid #dce4ed;
          border-radius:10px;
          outline:none;
          box-sizing:border-box;
          font:inherit;
        }
        .ls-msg-tools input{
          padding:10px 12px;
          font-size:12px;
          background:#f8fafc;
        }

        .ls-msg-tabs{
          display:flex;
          gap:5px;
          padding:0 14px 10px;
        }
        .ls-msg-tabs button{
          border:0;
          background:#f2f5f8;
          color:#627184;
          padding:7px 9px;
          border-radius:8px;
          font-size:10px;
          font-weight:800;
          cursor:pointer;
        }
        .ls-msg-tabs button.active{
          background:#123b67;
          color:#fff;
        }

        .ls-msg-list{
          max-height:310px;
          overflow:auto;
          border-top:1px solid #edf1f5;
        }
        .ls-msg-item{
          width:100%;
          border:0;
          border-bottom:1px solid #edf1f5;
          background:#fff;
          display:flex;
          gap:11px;
          padding:12px 13px;
          text-align:left;
          cursor:pointer;
          position:relative;
        }
        .ls-msg-item:hover{
          background:#f7fbff;
        }
        .ls-msg-item.unread{
          background:#f4f9ff;
        }
        .ls-msg-avatar{
          width:34px;
          height:34px;
          flex:none;
          border-radius:10px;
          display:grid;
          place-items:center;
          background:linear-gradient(135deg,#dbeaf9,#edf5fc);
          color:#17578c;
          font-size:13px;
          font-weight:900;
        }
        .ls-msg-item-content{
          min-width:0;
          flex:1;
        }
        .ls-msg-row{
          display:flex;
          justify-content:space-between;
          gap:8px;
        }
        .ls-msg-row strong{
          font-size:12px;
          color:#172b42;
        }
        .ls-msg-row span{
          flex:none;
          font-size:9px;
          color:#8a96a5;
        }
        .ls-msg-item-subject{
          margin-top:3px;
          color:#26384c;
          font-size:11px;
          font-weight:800;
        }
        .ls-msg-preview{
          margin-top:3px;
          color:#758397;
          font-size:10px;
          line-height:1.4;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          max-width:275px;
        }
        .ls-msg-dot{
          width:8px;
          height:8px;
          background:#e53935;
          border-radius:50%;
          flex:none;
          margin-top:5px;
        }

        .ls-msg-footer{
          display:flex;
          justify-content:space-between;
          gap:8px;
          padding:11px 13px;
          background:#fbfcfe;
          border-top:1px solid #edf1f5;
        }
        .ls-msg-footer button{
          border:0;
          background:transparent;
          color:#245f90;
          font-size:10px;
          font-weight:900;
          cursor:pointer;
        }

        .ls-msg-empty{
          padding:35px 15px;
          text-align:center;
          color:#8290a0;
          font-size:12px;
        }

        .ls-msg-detail{
          padding:17px;
        }
        .ls-msg-back{
          border:0;
          background:transparent;
          padding:0;
          color:#2e6b99;
          font-size:11px;
          font-weight:800;
          cursor:pointer;
        }
        .ls-msg-detail-type{
          margin-top:20px;
          color:#557593;
          font-size:9px;
          text-transform:uppercase;
          letter-spacing:1.5px;
          font-weight:900;
        }
        .ls-msg-detail h3{
          margin:6px 0 13px;
          color:#172b42;
          font-size:18px;
        }
        .ls-msg-meta{
          padding:10px 12px;
          border-radius:10px;
          background:#f5f8fb;
          color:#607083;
          font-size:10px;
          line-height:1.65;
        }
        .ls-msg-detail-body{
          margin-top:16px;
          color:#425267;
          font-size:12px;
          line-height:1.65;
        }
        .ls-msg-reply{
          margin-top:17px;
          width:100%;
          border:0;
          border-radius:10px;
          padding:10px;
          background:#123b67;
          color:#fff;
          font-size:11px;
          font-weight:900;
          cursor:pointer;
        }

        .ls-msg-compose{
          padding:15px;
        }
        .ls-msg-compose-title{
          font-size:16px;
          font-weight:900;
          color:#172b42;
          margin-bottom:12px;
        }
        .ls-msg-compose input,
        .ls-msg-compose select{
          margin-bottom:9px;
          padding:10px 11px;
          font-size:11px;
          background:#fff;
        }
        .ls-msg-compose textarea{
          height:125px;
          padding:10px 11px;
          resize:vertical;
          font-size:11px;
          font-family:inherit;
        }
        .ls-msg-compose-actions{
          display:flex;
          justify-content:flex-end;
          gap:7px;
          margin-top:10px;
        }
        .ls-msg-compose-actions button{
          border:1px solid #dce4ed;
          background:#fff;
          border-radius:9px;
          padding:8px 12px;
          cursor:pointer;
          font-size:10px;
          font-weight:800;
        }
        .ls-msg-compose-actions button.send{
          background:#123b67;
          border-color:#123b67;
          color:#fff;
        }

        @media(max-width:700px){
          .ls-msg-launcher{
            left:12px;
            bottom:82px;
            width:55px;
            padding:0;
            justify-content:center;
            border-radius:15px;
          }
          .ls-msg-label{display:none}
          .ls-msg-badge{
            position:absolute;
            top:-5px;
            right:-5px;
          }
          .ls-msg-popup{
            left:12px;
            right:12px;
            bottom:72px;
            width:auto;
            max-height:78vh;
          }
        }
      `}</style>
    </>
  );
}
