import { getMeeting } from "../lib/store";

export default function AttendeePage({ meetingId, displayName, onExit }) {
  const m = meetingId ? getMeeting(meetingId) : null;

  if (!m) {
    return (
      <div className="page">
        <div className="card">
          <h1>Meeting not found</h1>
          <p>Please check the Meeting ID with your host.</p>
          <button className="btn-outline" onClick={onExit}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Attendee</h1>
        <p>Welcome, <strong>{displayName || "Guest"}</strong>!</p>
        <p>
          You joined: <strong>{m.title}</strong><br />
          Meeting ID: <code>{m.id}</code><br />
          Type: <strong>{m.type === "conference" ? "Conference" : "Trade Show"}</strong><br />
          Host: <strong>{m.host}</strong>
        </p>
        <button className="btn-outline" onClick={onExit}>Leave</button>
      </div>
    </div>
  );
}
