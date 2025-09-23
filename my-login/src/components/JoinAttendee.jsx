import { useState } from "react";
import { getSavedAttendeeName, saveAttendeeName } from "../lib/store";

export default function JoinAttendee({ onJoin, onBack }) {
  const [meetingId, setMeetingId] = useState("");
  const [name, setName] = useState(getSavedAttendeeName());
  const [msg, setMsg] = useState("");

  function submit(e) {
    e.preventDefault();
    const err = onJoin?.(meetingId.trim(), name.trim());
    if (err) setMsg(err);
    else if (name.trim()) saveAttendeeName(name.trim());
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Join a Meeting</h1>
        <form onSubmit={submit}>
          <label>Meeting ID</label>
          <input
            value={meetingId}
            onChange={(e) => setMeetingId(e.target.value)}
            placeholder="e.g., C-20250902-1234"
          />
          <label>Display name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Guest-1001"
          />
          <button className="btn" style={{ marginTop: 12 }}>Join</button>
          <button type="button" className="btn-outline" onClick={onBack}>Back</button>
        </form>
        {msg && <div className="hint" style={{ marginTop: 8 }}>{msg}</div>}
        <div className="hint" style={{ marginTop: 8 }}>Ask the host for the Meeting ID.</div>
      </div>
    </div>
  );
}
