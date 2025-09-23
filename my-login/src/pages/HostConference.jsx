// src/pages/HostConference.jsx
import React, { useEffect, useState } from "react";
import { ensureConferenceId } from "../lib/store";

export default function HostConference({ onBack, onOpenPlanner }) {
  const [meetingId, setMeetingId] = useState("");

  // 进入页面时自动生成（或读取已有）会议ID，并显示在输入框中
  useEffect(() => {
    const id = ensureConferenceId();
    setMeetingId(id);
  }, []);

  const copy = async () => {
    if (!meetingId) return;
    try {
      await navigator.clipboard.writeText(meetingId);
    } catch (e) {
      console.warn("Clipboard not available:", e);
    }
  };

  return (
    <div className="conf-app">
      <header className="conf-header">
        <div className="conf-title">
          <h1>Conference · Host</h1>
          <div className="conf-muted">A single conference meeting is maintained. Share the ID with attendees.</div>
        </div>
      </header>

      <div className="conf-body" style={{ display: "block" }}>
        <div
          className="home-card"
          style={{
            maxWidth: 900,
            margin: "16px auto",
          }}
        >
          <h2 className="home-title" style={{ marginBottom: 12 }}>Meeting ID</h2>

          <input
            value={meetingId}
            readOnly
            placeholder=""
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              fontSize: 16,
              marginBottom: 16,
              background: "#fff",
            }}
          />

          <button
            className="conf-btn primary block"
            onClick={copy}
            style={{ marginBottom: 12 }}
          >
            Copy
          </button>

          <button
            className="conf-btn primary block"
            onClick={() => onOpenPlanner?.()}
            style={{ marginBottom: 12 }}
          >
            Open Planner
          </button>

          <button
            className="conf-btn block"
            onClick={() => onBack?.()}
            style={{ marginBottom: 12 }}
          >
            Back to menu
          </button>

          <button
            className="conf-btn block"
            onClick={() => {/* TODO: sign out if needed */}}
            style={{ marginBottom: 16 }}
          >
            Sign out
          </button>

          <div
            className="conf-hint"
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
            }}
          >
            Tip: This ID is created automatically and kept as the only active conference.
          </div>
        </div>
      </div>
    </div>
  );
}
