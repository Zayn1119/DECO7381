// src/pages/HostConference.jsx
import React, { useEffect, useState } from "react";
import { ensureConferenceId } from "../lib/store";

export default function HostConference({ onBack, onOpenPlanner }) {
  const [meetingId, setMeetingId] = useState("");

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
        </div>
      </header>

      <div className="conf-body">
        <div className="home-card meeting-card">
          <h2 className="home-title">Meeting ID</h2>

          <input
            value={meetingId}
            readOnly
            className="meeting-input"
            placeholder=""
          />

          <button className="conf-btn primary block meeting-btn" onClick={copy}>
            Copy
          </button>

          <button
            className="conf-btn primary block meeting-btn"
            onClick={() => onOpenPlanner?.()}
          >
            Open Planner
          </button>

          <button
            className="conf-btn block meeting-btn"
            onClick={() => onBack?.()}
          >
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
