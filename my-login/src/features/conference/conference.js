// src/api/conference.js
import { get, post, patch, del } from "@/api/client";


// 传入会议 code（不传就作用于“最近一次会议”）
export const apiConference = (code = "") => {
  const q = code ? `?code=${encodeURIComponent(code)}` : "";
  return {
    bootstrap: () => get(`/bootstrap${q}`),

    attendees: {
      list:   ()           => get(`/attendees/${q}`),
      create: (payload)    => post(`/attendees/${q}`, payload),   // payload 里也可带 { code }
      update: (id, data)   => patch(`/attendees/${id}/${q}`, data),
      remove: (id)         => del(`/attendees/${id}/${q}`),
    },

    // 后面 tables/assignments 同理需要再接
  };
};

// 方便控制台调试：window.apiConference('你的code').attendees.create(...)
if (typeof window !== "undefined") {
  window.apiConference = apiConference;
}
