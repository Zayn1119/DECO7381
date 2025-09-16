// src/pages/HostTrade.jsx
import React, { useEffect, useState } from "react";
import { ensureTradeId } from "../lib/store";

export default function HostTrade({ onBack, onOpenPlanner, openPlanner }) {
  const [meetingId, setMeetingId] = useState("");

  useEffect(() => {
    const id = ensureTradeId();
    setMeetingId(id);
  }, []);

  const handleOpenPlanner = () => {
    const fn = onOpenPlanner ?? openPlanner; // 兼容两种命名
    if (typeof fn === "function") fn(meetingId);
  };

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
          <h1>Trade Show · Host</h1>
        </div>
      </header>

      {/* 和 Conference Host 完全一致的容器结构与类名 */}
      <div className="conf-body">
        <div className="conf-panel join-card">
          <h2 className="home-title">Meeting ID</h2>

          <input
            className="conf-input"
            value={meetingId}
            readOnly
          />

          <button type="button" className="conf-btn primary block" onClick={copy}>
            Copy
          </button>

          <button type="button" className="conf-btn primary block" onClick={handleOpenPlanner}>
            Open Planner
          </button>

          <button type="button" className="conf-btn block" onClick={onBack}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
