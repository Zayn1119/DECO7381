import { api, get, post, patch, del } from "@/api/client";
export async function bootstrapShow(meetingId){ const {data}=await api.get(`/tradeshow/shows/bootstrap`,{params:{meeting_id:meetingId}}); return data; }
export async function createBooth(p){ const {data}=await api.post(`/tradeshow/booths/`,p); return data; }
export async function updateBooth(id,p){ const {data}=await api.patch(`/tradeshow/booths/${id}/`,p); return data; }
export async function createExhibitor(p){ const {data}=await api.post(`/tradeshow/exhibitors/`,p); return data; }
export async function updateExhibitor(id,p){ const {data}=await api.patch(`/tradeshow/exhibitors/${id}/`,p); return data; }
export async function resetShow(id){ const {data}=await api.post(`/tradeshow/shows/${id}/reset/`); return data; }
