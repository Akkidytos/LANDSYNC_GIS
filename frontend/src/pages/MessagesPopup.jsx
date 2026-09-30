import React, { useEffect, useState } from "react";

const KEY = "landsync_messages_popup";

const demoMessages = [
  {
    id: 1,
    sender: "Land Officer",
    subject: "Parcel Verification Update",
    text: "Your land record verification has been updated in LandSync.",
    time: "2m",
    unread: true,
    type: "Update"
  },
  {
    id: 2,
    sender: "LandSync System",
    subject: "Welcome to Messages",
    text: "Use this communication center for important land governance updates.",
    time: "18m",
    unread: true,
    type: "System"
  },
  {
    id: 3,
    sender: "Citizen Services",
    subject: "Service Request Update",
    text: "Your service request status has changed.",
    time: "Today",
    unread: true,
    type: "Request"
  }
];

function loadMessages() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return demoMessages;
}

export default function MessagesPopup() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages));
  }, [messages]);

  const unread = messages.filter((m) => m.unread).length;

  const filtered = messages.filter((m) =>
    `${m.sender} ${m.subject} ${m.text}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const readMessage = (id) => {
    const msg = messages.find((m) => m.id === id);
    setSelected(msg || null);

    setMessages((list) =>
      list.map((m) =>
        m.id === id ? { ...m, unread: false } : m
      )
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setSelected(null);
        }}
        className="ls-msg-button"
        title="Messages"
      >
        <span className="ls-msg-envelope">✉</span>
        <span className="ls-msg-text">Messages</span>
        {unread > 0 && (
          <span className="ls-msg-number">{unread}</span>
        )}
      </button>

      {open && (
        <div className="ls-msg-overlay">
          <div className="ls-msg-panel">

            <div className="ls-msg-header">
              <div>
                <div className="ls-msg-mini">LANDSYNC COMMUNICATION</div>
                <div className="ls-msg-heading">Messages</div>
                <div className="ls-msg-status">
                  {unread} unread notification{unread === 1 ? "" : "s"}
                </div>
              </div>

              <button
                type="button"
                className="ls-msg-x"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                }}
              >
                ×
              </button>
            </div>

            {!selected ? (
              <>
                <div className="ls-msg-search">
                  <span>⌕</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages..."
                  />
                </div>

                <div className="ls-msg-list">
                  {filtered.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className={`ls-msg-card ${m.unread ? "new" : ""}`}
                      onClick={() => readMessage(m.id)}
                    >
                      <div className="ls-msg-avatar">
                        {m.sender.charAt(0)}
                      </div>

                      <div className="ls-msg-card-main">
                        <div className="ls-msg-card-line">
                          <strong>{m.sender}</strong>
                          <span>{m.time}</span>
                        </div>

                        <div className="ls-msg-card-subject">
                          {m.subject}
                        </div>

                        <div className="ls-msg-card-preview">
                          {m.text}
                        </div>
                      </div>

                      {m.unread && (
                        <span className="ls-msg-red-dot" />
                      )}
                    </button>
                  ))}

                  {!filtered.length && (
                    <div className="ls-msg-empty">
                      No messages found.
                    </div>
                  )}
                </div>

                <div className="ls-msg-footer">
                  <span>LandSync Communication Center</span>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setMessages((list) =>
                          list.map((m) => ({
                            ...m,
                            unread: false
                          }))
                        )
                      }
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="ls-msg-detail">
                <button
                  type="button"
                  className="ls-msg-back"
                  onClick={() => setSelected(null)}
                >
                  ← Back
                </button>

                <div className="ls-msg-detail-type">
                  {selected.type}
                </div>

                <h3>{selected.subject}</h3>

                <div className="ls-msg-from">
                  <b>From</b>
                  <span>{selected.sender}</span>
                  <small>{selected.time}</small>
                </div>

                <div className="ls-msg-body">
                  {selected.text}
                </div>

                <button
                  type="button"
                  className="ls-msg-reply"
                  onClick={() => setSelected(null)}
                >
                  Reply
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .ls-msg-button{
          position:fixed;
          left:18px;
          bottom:112px;
          z-index:9990;
          height:48px;
          min-width:150px;
          padding:0 12px;
          border:1px solid rgba(255,255,255,.16);
          border-radius:13px;
          background:linear-gradient(135deg,#12365c,#0a2948);
          color:#fff;
          display:flex;
          align-items:center;
          gap:9px;
          box-shadow:0 10px 28px rgba(7,25,46,.28);
          cursor:pointer;
          transition:.18s ease;
          font-weight:800;
        }

        .ls-msg-button:hover{
          transform:translateY(-2px);
          box-shadow:0 14px 34px rgba(7,25,46,.34);
        }

        .ls-msg-envelope{
          width:28px;
          height:28px;
          border-radius:8px;
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.12);
          font-size:15px;
        }

        .ls-msg-text{
          font-size:13px;
        }

        .ls-msg-number{
          margin-left:auto;
          min-width:21px;
          height:21px;
          padding:0 6px;
          border-radius:50px;
          display:grid;
          place-items:center;
          background:#e53935;
          color:#fff;
          font-size:10px;
          font-weight:900;
          box-shadow:0 0 0 3px rgba(229,57,53,.15);
        }

        .ls-msg-overlay{
          position:fixed;
          inset:0;
          background:rgba(8,20,35,.08);
          z-index:9989;
          pointer-events:none;
        }

        .ls-msg-panel{
          pointer-events:auto;
          position:absolute;
          left:180px;
          bottom:168px;
          width:390px;
          max-height:575px;
          background:#fff;
          border:1px solid #dce5ee;
          border-radius:19px;
          overflow:hidden;
          box-shadow:0 25px 65px rgba(9,29,53,.25);
          animation:ls-msg-open .18s ease-out;
        }

        @keyframes ls-msg-open{
          from{opacity:0;transform:translateY(12px) scale(.985)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }

        .ls-msg-header{
          padding:17px 18px;
          color:#fff;
          background:linear-gradient(135deg,#0c3158,#17608e);
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
        }

        .ls-msg-mini{
          font-size:9px;
          font-weight:900;
          letter-spacing:1.7px;
          opacity:.72;
        }

        .ls-msg-heading{
          margin-top:3px;
          font-size:22px;
          font-weight:900;
        }

        .ls-msg-status{
          margin-top:3px;
          font-size:10px;
          opacity:.78;
        }

        .ls-msg-x{
          width:31px;
          height:31px;
          border:0;
          border-radius:9px;
          color:#fff;
          background:rgba(255,255,255,.14);
          font-size:23px;
          line-height:1;
          cursor:pointer;
        }

        .ls-msg-search{
          margin:12px 13px 8px;
          height:36px;
          border:1px solid #dde5ee;
          border-radius:10px;
          background:#f8fafc;
          display:flex;
          align-items:center;
          padding:0 10px;
          gap:7px;
        }

        .ls-msg-search span{
          color:#7c8a9a;
          font-size:16px;
        }

        .ls-msg-search input{
          width:100%;
          border:0;
          outline:0;
          background:transparent;
          font-size:11px;
        }

        .ls-msg-list{
          max-height:375px;
          overflow:auto;
          border-top:1px solid #eef2f5;
        }

        .ls-msg-card{
          width:100%;
          display:flex;
          align-items:flex-start;
          gap:10px;
          padding:13px;
          border:0;
          border-bottom:1px solid #eef2f5;
          background:#fff;
          text-align:left;
          cursor:pointer;
        }

        .ls-msg-card:hover{
          background:#f7fbff;
        }

        .ls-msg-card.new{
          background:#f3f8fe;
        }

        .ls-msg-avatar{
          flex:none;
          width:34px;
          height:34px;
          border-radius:10px;
          display:grid;
          place-items:center;
          background:linear-gradient(135deg,#d9eafa,#eef5fc);
          color:#16598d;
          font-size:12px;
          font-weight:900;
        }

        .ls-msg-card-main{
          min-width:0;
          flex:1;
        }

        .ls-msg-card-line{
          display:flex;
          justify-content:space-between;
          gap:8px;
        }

        .ls-msg-card-line strong{
          color:#1b2e45;
          font-size:11px;
        }

        .ls-msg-card-line span{
          color:#8a97a7;
          font-size:9px;
        }

        .ls-msg-card-subject{
          margin-top:3px;
          color:#263b52;
          font-size:11px;
          font-weight:800;
        }

        .ls-msg-card-preview{
          margin-top:3px;
          color:#7a8797;
          font-size:10px;
          line-height:1.35;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          max-width:275px;
        }

        .ls-msg-red-dot{
          flex:none;
          width:8px;
          height:8px;
          margin-top:4px;
          border-radius:50%;
          background:#e53935;
        }

        .ls-msg-empty{
          padding:38px 15px;
          text-align:center;
          color:#8290a1;
          font-size:11px;
        }

        .ls-msg-footer{
          height:42px;
          padding:0 13px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          background:#fbfcfd;
          color:#8a96a5;
          font-size:9px;
          border-top:1px solid #eef2f5;
        }

        .ls-msg-footer button{
          border:0;
          background:transparent;
          color:#286491;
          font-size:9px;
          font-weight:900;
          cursor:pointer;
        }

        .ls-msg-detail{
          padding:19px;
        }

        .ls-msg-back{
          border:0;
          background:transparent;
          color:#2b6794;
          font-size:11px;
          font-weight:800;
          cursor:pointer;
        }

        .ls-msg-detail-type{
          margin-top:22px;
          font-size:9px;
          color:#55738f;
          font-weight:900;
          letter-spacing:1.4px;
        }

        .ls-msg-detail h3{
          margin:6px 0 14px;
          font-size:19px;
          color:#172d45;
        }

        .ls-msg-from{
          padding:10px 12px;
          border-radius:10px;
          background:#f5f8fb;
          color:#607084;
          font-size:10px;
        }

        .ls-msg-from b{
          margin-right:6px;
          color:#354a61;
        }

        .ls-msg-from small{
          float:right;
          color:#8996a6;
        }

        .ls-msg-body{
          margin-top:18px;
          color:#46566a;
          font-size:12px;
          line-height:1.65;
        }

        .ls-msg-reply{
          width:100%;
          margin-top:20px;
          padding:10px;
          border:0;
          border-radius:10px;
          background:#123b67;
          color:#fff;
          font-size:11px;
          font-weight:900;
          cursor:pointer;
        }

        @media(max-width:800px){
          .ls-msg-button{
            left:12px;
            bottom:88px;
            min-width:48px;
            width:48px;
            justify-content:center;
          }
          .ls-msg-text{display:none}
          .ls-msg-number{
            position:absolute;
            right:-5px;
            top:-5px;
          }
          .ls-msg-panel{
            left:12px;
            right:12px;
            bottom:148px;
            width:auto;
          }
        }
      `}</style>
    </>
  );
}