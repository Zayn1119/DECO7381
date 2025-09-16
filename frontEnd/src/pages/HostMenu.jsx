import React from "react";

export default function HostMenu({ onOpenConference, onOpenTrade, onBack }) {
  return (
    <div className="home-wrap">
      <div className="home-card" role="group" aria-label="Host menu">
        <h1 className="home-title">Host Menu</h1>
        <p className="home-sub">Choose what to host:</p>

        <button
          type="button"
          className="conf-btn primary block"
          onClick={() => onOpenConference?.()}
        >
          Conference
        </button>

        <button
          type="button"
          className="conf-btn block"
          style={{ marginTop: 16 }}
          onClick={() => onOpenTrade?.()}
        >
          Trade Show
        </button>

        <button
          type="button"
          className="conf-btn block"
          style={{ marginTop: 12 }}
          onClick={() => onBack?.()}
        >
          Back
        </button>
      </div>
    </div>
  );
}
