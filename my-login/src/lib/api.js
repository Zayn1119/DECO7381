// src/lib/api.js
import axios from "axios";

// 走 vite 代理，不要直连 8000
export const http = axios.create({
  baseURL: "/api",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

const ok = (p) => p.then(r => r.data);

// 当前会议信息（全局单例）
const state = {
  meetingId: null,
  meetingCode: null,
  bootstrapped: false,
};

// 从 URL 或 localStorage 取 code
const pickCode = () => {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("code");
    if (q) return q;
  } catch (_) {}
  return localStorage.getItem("conf_code") || null;
};

// 确保已经有“当前会议”（无则创建，有 code 则 bootstrap）
export async function ensureMeeting() {
  if (state.meetingId) return state;

  let code = pickCode();
  if (code) {
    try {
      const data = await ok(http.get("/bootstrap/", { params: { code } }));
      state.meetingId = data.meeting.id;
      state.meetingCode = data.meeting.code;
      state.bootstrapped = true;
      localStorage.setItem("conf_code", state.meetingCode);
      return state;
    } catch (e) {
      // 兜底：如果 code 不存在，后端也会自动创建；但这里还是防一下
    }
  }

  // 没 code 或失败：创建一场新的
  const m = await ok(http.post("/meetings/"));
  state.meetingId = m.id;
  state.meetingCode = m.code;
  state.bootstrapped = true;
  localStorage.setItem("conf_code", state.meetingCode);
  return state;
}

// —— CRUD 工具（不自动补 meeting，用于 list/get/patch/delete）——
const crud = (base) => ({
  list:   (params)    => ok(http.get(`${base}/`, { params })),
  get:    (id)        => ok(http.get(`${base}/${id}/`)),
  patch:  (id, data)  => ok(http.patch(`${base}/${id}/`, data)),
  remove: (id)        => ok(http.delete(`${base}/${id}/`)),
});

// —— 自动补 meeting 的 create ——
// 这样页面只传姓名/部门/职位，后端就能落到当前会议
const createWithMeeting = (base) => async (payload = {}) => {
  const s = await ensureMeeting();
  const data = { ...payload };

  // 统一成后端的字段名
  if (!("meeting" in data)) {
    if ("meeting_id" in data) data.meeting = data.meeting_id;
    else data.meeting = s.meetingId;
  }
  // 其它常见别名也顺手兼容一下
  if ("seat" in data && !("seat_index" in data)) data.seat_index = data.seat;
  if ("table_id" in data && !("table" in data)) data.table = data.table_id;
  if ("attendee_id" in data && !("attendee" in data)) data.attendee = data.attendee_id;

  return ok(http.post(`${base}/`, data));
};

// —— 对外 API ——
// meetings 里给一个手动 bootstrap 的方法，方便你要的时候取整包
export const api = {
  ping: () => ok(http.get("/ping/")),

  meetings: {
    ensure: ensureMeeting,
    list:   () => ok(http.get("/meetings/")),
    create: () => ok(http.post("/meetings/")),
    bootstrap: async () => {
      const s = await ensureMeeting();
      return ok(http.get("/bootstrap/", { params: { code: s.meetingCode }}));
    },
  },

  attendees: {
    ...crud("/attendees"),
    create: createWithMeeting("/attendees"),
  },

  tables: {
    ...crud("/tables"),
    create: createWithMeeting("/tables"),
  },

  assignments: {
    ...crud("/assignments"),
    create: createWithMeeting("/assignments"),
  },
};

export default api;
