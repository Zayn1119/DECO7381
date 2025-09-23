// src/pages/HostTradeDesigner.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ensureTradeMeetingId } from "../features/tradeshow/lib/store";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  bootstrapShow,
  createBooth,
  updateBooth,
  createExhibitor,
  updateExhibitor,
  resetShow,
} from "../features/tradeshow/tradeshow";

/**
 * Trade Show Planner
 * - 顶部按钮与 Conference 一致且同位置：Reset Layout / Smart Arrange / Export CSV / Export PDF
 * - 左侧面板与 Conference 同风格：Booths 与 Exhibitors，支持 Note/Tag（chips）
 * - 画布为可拖动网格；展位为矩形；参展商以“徽章”展示，可拖拽到展位里进行分配
 * - Reset Layout 清空整个画布（DOM、展位、参展商）
 * - Smart Arrange 将参展商均匀分配到各展位
 * - Export CSV 导出分配结果
 * - Export PDF 导出画布快照
 */

export default function HostTradeDesigner({ showId, onBack }) {
  // ---------- state ----------
  const [show, setShow] = useState(null);           // 后端的 tradeshow（含 id, meeting_id）
  const [booths, setBooths] = useState([]);         // {id,label,w,h,x,y,el?:HTMLElement}
  const [exhibitors, setExhibitors] = useState([]); // {id,name,company,tags:string[],boothId,x,y}
  const [meetingCode, setMeetingCode] = useState(""); // ← 新增：展示/传参用

  // booth controls
  const [boothW, setBoothW] = useState(140);
  const [boothH, setBoothH] = useState(90);

  // exhibitor inputs
  const nameRef = useRef(null);
  const compRef = useRef(null);
  const [noteInput, setNoteInput] = useState("");
  const [pendingNotes, setPendingNotes] = useState([]);

  // filters
  const [filterCompany, setFilterCompany] = useState("");

  // dom refs
  const boardRef = useRef(null);
  const exhibitorListRef = useRef(null);

  // ---------- bootstrap ----------
  useEffect(() => {
    const code = showId || ensureTradeMeetingId(); // 优先用传入的，其次用本地生成/复用
    setMeetingCode(code);
    bootstrapShow(code).then(({ show, booths, exhibitors }) => {
      setShow(show); setBooths(booths); setExhibitors(exhibitors);
    });
  }, [showId]);

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const companyOptions = useMemo(() => {
    const s = new Set();
    exhibitors.forEach((x) => x.company && s.add(x.company));
    return ["", ...Array.from(s)];
  }, [exhibitors]);

  const passFilter = (e) => !filterCompany || e.company === filterCompany;

  function nextBoothLabel(currentBooths) {
    const n = currentBooths.length + 1;
    return "B" + n;
  }

  function extractBox(el, canvasEl) {
    const b = el.getBoundingClientRect();
    const c = canvasEl.getBoundingClientRect();
    return {
      x: Math.round(b.left - c.left),
      y: Math.round(b.top - c.top),
      w: Math.round(b.width),
      h: Math.round(b.height),
    };
  }

  // ---------- API-wired actions ----------
  // Add Booth（按钮使用这个）
  async function addBooth() {
    if (!show) return;
    const label = nextBoothLabel(booths);
    const created = await createBooth({
      tradeshow: show.id,
      label,
      x: 20,
      y: 20,
      w: Number(boothW) || 140,
      h: Number(boothH) || 90,
    });
    setBooths((prev) => [...prev, created]); // 后端返回的对象已含 id/label/x/y/w/h
  }

  // 鼠标拖拽结束时，保存 booth 的 x/y/w/h
  async function onBoothDragEnd(boothId, el) {
    const { x, y, w, h } = extractBox(el, boardRef.current);
    setBooths((prev) => prev.map((b) => (b.id === boothId ? { ...b, x, y, w, h } : b)));
    await updateBooth(boothId, { x, y, w, h }); // 序列化器会把 w/h 映射为 width/height
  }

  // Add Exhibitor（按钮使用这个）
  async function addExhibitor() {
    if (!show) return;
    const name = (nameRef.current?.value || "").trim();
    const comp = (compRef.current?.value || "").trim();
    if (!name) return;
    const created = await createExhibitor({
      tradeshow: show.id,
      name,
      company: comp,
      tags: pendingNotes.slice(),
    });
    setExhibitors((prev) => [...prev, created]);
    if (nameRef.current) nameRef.current.value = "";
    if (compRef.current) compRef.current.value = "";
    setPendingNotes([]);
  }

  // 把参展商分配到展位（拖拽放下时调用）
  async function assignExhibitorToBooth(exId, boothIdOrNull) {
    const exNum = typeof exId === "string" ? parseInt(exId, 10) : exId;
    const boothNum =
      boothIdOrNull == null
        ? null
        : typeof boothIdOrNull === "string"
        ? parseInt(boothIdOrNull, 10)
        : boothIdOrNull;

    setExhibitors((prev) =>
      prev.map((e) => (e.id === exNum ? { ...e, boothId: boothNum } : e))
    );
    await updateExhibitor(exNum, { boothId: boothNum });
  }

  async function handleResetLayout() {
    if (!show) return;
    if (!confirm("Clear the entire canvas?")) return;
    await resetShow(show.id);
    const board = boardRef.current;
    if (board) board.innerHTML = "";
    setBooths([]);
    setExhibitors([]);
    setPendingNotes([]);
    setFilterCompany("");
  }

  // ---------- booth DOM ----------
  function buildBoothDOM(b) {
    const board = boardRef.current;
    if (!board) return;

    const el = document.createElement("div");
    el.className = "conf-table square"; // 复用矩形样式
    el.style.width = b.w + "px";
    el.style.height = b.h + "px";
    el.style.left = b.x + "px";
    el.style.top = b.y + "px";
    el.dataset.id = b.id;

    const label = document.createElement("div");
    label.className = "conf-table-title";
    label.innerHTML = b.label + "<small>Booth</small>";
    el.appendChild(label);

    // 允许放置 Exhibitor
    el.ondragover = (e) => e.preventDefault();
    el.ondrop = (e) => {
      e.preventDefault();
      const exId = e.dataTransfer.getData("text/plain");
      assignExhibitorToBooth(exId, b.id);
    };

    // 拖动 Booth
    let down = false,
      sx = 0,
      sy = 0,
      ox = 0,
      oy = 0;
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      down = true;
      sx = e.clientX;
      sy = e.clientY;
      ox = parseInt(el.style.left || 0, 10);
      oy = parseInt(el.style.top || 0, 10);
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!down) return;
      const nx = clamp(ox + e.clientX - sx, 0, board.clientWidth - el.offsetWidth);
      const ny = clamp(oy + e.clientY - sy, 0, board.clientHeight - el.offsetHeight);
      el.style.left = nx + "px";
      el.style.top = ny + "px";
    });
    window.addEventListener("mouseup", () => {
      if (!down) return;
      down = false;
      // 结束时只调用一次统一的保存函数，避免重复 setState
      onBoothDragEnd(b.id, el);
    });

    board.appendChild(el);
    b.el = el;
  }

  // 侧栏 Exhibitor 徽章（拖拽 + 过滤 + tags chips）
  useEffect(() => {
    const list = exhibitorListRef.current;
    if (!list) return;
    list.innerHTML = "";

    exhibitors.forEach((ex) => {
      const badge = document.createElement("span");
      badge.className = "conf-badge" + (ex.boothId ? " assigned" : "");
      badge.draggable = true;
      badge.dataset.id = ex.id;

      const notesHTML =
        ex.tags && ex.tags.length
          ? '<div class="conf-badge-notes">' +
            ex.tags
              .map(
                (n) =>
                  '<span class="conf-chip">' +
                  String(n).replace(/[<>&]/g, (s) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[s])) +
                  "</span>"
              )
              .join("") +
            "</div>"
          : "";

      badge.innerHTML =
        ex.name +
        (ex.company ? '<span class="conf-badge-info">' + ex.company + "</span>" : "") +
        notesHTML;

      badge.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", String(ex.id)));

      if (!passFilter(ex)) badge.style.display = "none";
      list.appendChild(badge);
    });
  }, [exhibitors, filterCompany]);

  // ---------- actions（本地） ----------
  function clearFilters() {
    setFilterCompany("");
  }

  function smartArrange() {
    if (!booths.length) {
      alert("No booths yet. Please add booths first.");
      return;
    }
    // 仅本地分配；如需持久化，可循环调用 updateExhibitor
    const sorted = booths.slice().sort((a, b) => a.label.localeCompare(b.label));
    setExhibitors((prev) => {
      const copy = prev.map((e) => ({ ...e, boothId: null }));
      let i = 0;
      for (const ex of copy) {
        ex.boothId = sorted[i % sorted.length].id;
        i++;
      }
      return copy;
    });
  }

  function exportCSV() {
    let csv = "Name,Company,Tags,Booth\n";
    exhibitors.forEach((ex) => {
      const booth = ex.boothId ? booths.find((b) => b.id === ex.boothId) : null;
      const tags = (ex.tags || []).join(" | ");
      csv +=
        '"' +
        ex.name.replace(/"/g, '""') +
        '","' +
        (ex.company || "").replace(/"/g, '""') +
        '","' +
        tags.replace(/"/g, '""') +
        '","' +
        (booth ? booth.label : "Unassigned") +
        '"\n';
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "trade_show_assignments.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportPDF() {
    const board = boardRef.current;
    if (!board) return;
    const canvas = await html2canvas(board);
    const pdf = new jsPDF("landscape", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("trade_show_layout.pdf");
  }

  // 画布：仅在 booths 变化时重建 DOM
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.innerHTML = "";
    booths.forEach((b) => buildBoothDOM(b));
  }, [booths]);

  // ---------- UI ----------
  return (
    <div className="conf-app">
      <div className="conf-header">
        <div className="conf-title">
          <h1>Trade Show Planner</h1>
          <div className="conf-muted">
            ID: {meetingCode || showId || "(local)"} · Arrange booths and exhibitors, then share the ID.
          </div>
        </div>
        <div className="conf-actions">
          <button className="conf-btn" onClick={handleResetLayout}>Reset Layout</button>
          <button className="conf-btn" onClick={smartArrange}>Smart Arrange</button>
          <button className="conf-btn" onClick={exportCSV}>Export CSV</button>
          <button className="conf-btn" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="conf-body">
        {/* 左侧 */}
        <aside className="conf-sidebar">
          <div className="conf-panel">
            <h3>Booths</h3>
            <div className="conf-row">
              <div>Width:&nbsp;</div>
              <input
                type="number"
                min={60}
                value={boothW}
                onChange={(e) => setBoothW(Number(e.target.value))}
              />
            </div>
            <div className="conf-row" style={{ marginTop: 8 }}>
              <div>Height:&nbsp;</div>
              <input
                type="number"
                min={50}
                value={boothH}
                onChange={(e) => setBoothH(Number(e.target.value))}
              />
            </div>
            <div className="conf-row" style={{ marginTop: 8 }}>
              <button className="conf-btn" onClick={addBooth}>Add Booth »</button>
            </div>
          </div>

          <div className="conf-panel">
            <h3>Exhibitors</h3>
            <input ref={nameRef} placeholder="Name" />
            <input ref={compRef} placeholder="Company" />

            {/* Notes / Tags 输入区 */}
            <div className="conf-notes">
              <div className="conf-row">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Note / Tag"
                />
                <button className="conf-btn" onClick={() => {
                  const v = (noteInput || "").trim();
                  if (!v) return;
                  if (pendingNotes.includes(v)) { setNoteInput(""); return; }
                  setPendingNotes((arr) => [...arr, v]);
                  setNoteInput("");
                }} aria-label="Add note">＋</button>
              </div>
              <div className="conf-pending-notes">
                {pendingNotes.map((n, i) => (
                  <span className="conf-chip" key={n + i}>
                    {n}
                    <span className="x" onClick={() => setPendingNotes(arr => arr.filter((_, idx) => idx !== i))} aria-label="remove">×</span>
                  </span>
                ))}
              </div>
            </div>

            <button className="conf-btn block" onClick={addExhibitor}>Add Exhibitor</button>

            {/* Filters（仅公司） */}
            <div className="conf-filters">
              <h4 style={{ marginBottom: 8 }}>Filters</h4>
              <div className="conf-filter-row">
                <div className="conf-filter-label">Company:</div>
                <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}>
                  {companyOptions.map((opt) => (
                    <option key={opt || "ALL"} value={opt}>
                      {opt || "All Companies"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="conf-filter-buttons">
                <button className="conf-btn" onClick={() => setFilterCompany("")}>Clear Filters</button>
              </div>
            </div>

            {/* Exhibitors 列表（可拖拽） */}
            <div ref={exhibitorListRef} style={{ marginTop: 8 }} />

            <button className="conf-btn" style={{ marginTop: 12 }} onClick={onBack}>
              Back to menu
            </button>
          </div>
        </aside>

        {/* 右侧画布 */}
        <section className="conf-canvas">
          <div className="conf-scroll">
            <div id="trade-board" ref={boardRef} />
          </div>
        </section>
      </div>
    </div>
  );
}