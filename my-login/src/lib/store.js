const KEYS = {
  conferenceId: "app_conf_meeting_id",
  tradeId: "app_trade_meeting_id",
  user: "app_current_user",
  users: "app_users",
  attendeeName: "app_attendee_name",
};

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${da}`;
}
function rand4() { return Math.floor(1000 + Math.random() * 9000); }
function genId(prefix) { return `${prefix}-${yyyymmdd()}-${rand4()}`; }

// Conference
export function ensureConferenceId() {
  let id = localStorage.getItem(KEYS.conferenceId);
  if (!id) {
    id = genId("C");
    localStorage.setItem(KEYS.conferenceId, id);
  }
  return id;
}
export function getConferenceId() {
  return localStorage.getItem(KEYS.conferenceId) || ensureConferenceId();
}

// Trade
export function ensureTradeId() {
  let id = localStorage.getItem(KEYS.tradeId);
  if (!id) {
    id = genId("T");
    localStorage.setItem(KEYS.tradeId, id);
  }
  return id;
}
export function getTradeId() {
  return localStorage.getItem(KEYS.tradeId) || ensureTradeId();
}

// Users
function loadUsers() {
  try { return JSON.parse(localStorage.getItem(KEYS.users)) || {}; }
  catch { return {}; }
}
function saveUsers(u) {
  localStorage.setItem(KEYS.users, JSON.stringify(u || {}));
}
export function setCurrentUser(user) {
  if (user) localStorage.setItem(KEYS.user, JSON.stringify(user));
  else localStorage.removeItem(KEYS.user);
}
export function currentUser() {
  try { return JSON.parse(localStorage.getItem(KEYS.user)); }
  catch { return null; }
}
export function logoutUser() { localStorage.removeItem(KEYS.user); }
export function registerUser({ name, email, password }) {
  email = String(email || "").trim().toLowerCase();
  if (!name || !email || !password) throw new Error("Please fill all fields.");
  const users = loadUsers();
  if (users[email]) throw new Error("This email has already been registered.");
  const user = { id: "u_" + genId("U"), name, email, password };
  users[email] = user;
  saveUsers(users);
  setCurrentUser({ id: user.id, name: user.name, email: user.email });
  return user;
}
export function loginUser({ email, password }) {
  email = String(email || "").trim().toLowerCase();
  if (!email || !password) throw new Error("Please fill email and password.");
  const users = loadUsers();
  const user = users[email];
  if (!user || user.password !== password) throw new Error("Invalid email or password.");
  setCurrentUser({ id: user.id, name: user.name, email: user.email });
  return user;
}

// Attendee name
export function getSavedAttendeeName() {
  return localStorage.getItem(KEYS.attendeeName) || "";
}
export function saveAttendeeName(name) {
  localStorage.setItem(KEYS.attendeeName, String(name || ""));
}

// Meetings
export function getMeeting(meetingId) {
  if (!meetingId) return getConferenceId();
  const isC = meetingId.startsWith("C-");
  const isT = meetingId.startsWith("T-");
  const user = currentUser();
  return {
    id: meetingId,
    type: isT ? "trade" : "conference",
    title: (isC ? "Conference " : "Trade Show ") + meetingId.slice(2),
    host: user?.name || user?.email || "Host",
  };
}
