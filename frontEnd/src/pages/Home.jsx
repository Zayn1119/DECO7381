import React from "react";

export default function Home({ onHost, onJoin }) {
  return (
    <div className="home-wrap">
      <div className="home-card">
        <h1 className="home-title">Welcome</h1>
        <p className="home-sub">Please choose your role:</p>

        <button
          type="button"
          className="conf-btn primary block"
          onClick={() => onHost?.()}
        >
          I am a Host (Login / Register)
        </button>

        <button
          type="button"
          className="conf-btn block"
          style={{ marginTop: 10 }}
          onClick={() => onJoin?.()}
        >
          I am an Attendee (Join with ID)
        </button>

        
      </div>
    </div>
  );
}
