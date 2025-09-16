// src/pages/JoinAttendee.jsx
// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const LS_NAME = "attendee_display_name";

export default function JoinAttendee({
  initialMeetingId = "",    // 可从路由包装组件传入
  onBack,                   // 可传自定义返回；不传则默认 nav(-1)
}) {
  const nav = useNavigate();
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [displayName, setDisplayName] = useState("Guest-1");

  useEffect(() => {
    // 读本地默认名字（如果存过）
    try {
      const v = localStorage.getItem(LS_NAME);
      if (v && !initialMeetingId) setDisplayName(v);
    } catch {}
  }, []);

  function handleJoin() {
    const id = (meetingId || "").trim();
    const name = (displayName || "Guest-1").trim();
    if (!id) return;

    // 记住名字，方便下次进入
    try {
      localStorage.setItem(LS_NAME, name);
    } catch {}

    // 跳转到参会界面，名字用 ?att= 传递
    nav(`/attendee/live/${encodeURIComponent(id)}?att=${encodeURIComponent(name)}`);
  }

  const canJoin = (meetingId || "").trim().length > 0;

  return (
    <div className="conf-app">
      <div className="conf-header">
        <div className="conf-title">
          <h1>Join a Meeting</h1>
        </div>
      </div>

      <div className="conf-body" style={{ gridTemplateColumns: "1fr" }}>
        <section className="conf-canvas" style={{ display: "grid", placeItems: "start center" }}>
          <div
            className="conf-panel"
            style={{ width: 560, marginTop: 24, padding: 24, borderRadius: 16 }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 48, lineHeight: 1.1 }}>
              Join a Meeting
            </h2>

            <div style={{ fontWeight: 600, marginBottom: 8 }}>Meeting ID</div>
            <input
              placeholder="e.g., C-20250902-1234"
              value={meetingId}
              onChange={(e) => setMeetingId(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
            />

            <div style={{ fontWeight: 600, marginBottom: 8 }}>Display name (optional)</div>
            <input
              placeholder="Guest-1"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ width: "100%", marginBottom: 16 }}
            />

            <button
              className="conf-btn"
              onClick={handleJoin}
              disabled={!canJoin}
              style={{
                width: "100%",
                marginBottom: 12,
                opacity: canJoin ? 1 : 0.6,
                cursor: canJoin ? "pointer" : "not-allowed",
              }}
            >
              Join
            </button>

            <button
              className="conf-btn"
              onClick={onBack ? onBack : () => nav(-1)}
              style={{ width: "100%", background: "#fff" }}
            >
              Back
            </button>

            <div style={{ marginTop: 16, color: "#6b7280" }}>
              Ask the host for the Meeting ID.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
