export function ensureTradeMeetingId() {
  let code = localStorage.getItem("app_trade_meeting_id");
  if (!code) {
    code = "T" + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem("app_trade_meeting_id", code);
  }
  return code;
}