// src/pages/HostTradeDesigner.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  const [booths, setBooths] = useState([]);         // {id,label,w,h,x,y,el?:HTMLElement}
  const [exhibitors, setExhibitors] = useState([]); // {id,name,company,tags:string[],boothId,x,y}
  const [seq, setSeq] = useState(1);

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

  // ---------- helpers ----------
  const uid = () => {
    const id = "id" + (seq + 1);
    setSeq((s) => s + 1);
    return id;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const companyOptions = useMemo(() => {
    const s = new Set();
    exhibitors.forEach((x) => x.company && s.add(x.company));
    return ["", ...Array.from(s)];
  }, [exhibitors]);

  const passFilter = (e) => !filterCompany || e.company === filterCompany;

  // ---------- booths ----------
  function nextBoothLabel(prev) {
    const n = prev.length + 1;
    return "B" + n;
  }

  function addBooth() {
    setBooths((prev) => {
      const id = uid();
      const label = nextBoothLabel(prev);
      const b = {
        id,
        label,
        w: Number(boothW) || 140,
        h: Number(boothH) || 90,
        x: 20,
        y: 20
      };
      return [...prev, b];
    });
  }

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
    let down = false, sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      down = true;
      sx = e.clientX; sy = e.clientY;
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
      const id = el.dataset.id;
      setBooths((prev) =>
        prev.map((bb) =>
          bb.id === id ? { ...bb, x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) } : bb
        )
      );
    });

    board.appendChild(el);
    b.el = el;
  }

  // ---------- exhibitors ----------
  function addNote() {
    const v = (noteInput || "").trim();
    if (!v) return;
    if (pendingNotes.includes(v)) {
      setNoteInput("");
      return;
    }
    setPendingNotes((arr) => [...arr, v]);
    setNoteInput("");
  }
  function removePendingNote(idx) {
    setPendingNotes((arr) => arr.filter((_, i) => i !== idx));
  }

  function addExhibitor() {
    const name = (nameRef.current?.value || "").trim();
    const comp = (compRef.current?.value || "").trim();
    if (!name) return;
    setExhibitors((prev) => [
      ...prev,
      { id: uid(), name, company: comp, tags: pendingNotes.slice(), boothId: null, x: 60, y: 60 }
    ]);
    if (nameRef.current) nameRef.current.value = "";
    if (compRef.current) compRef.current.value = "";
    setPendingNotes([]);
  }

  function assignExhibitorToBooth(exId, boothId) {
    setExhibitors((prev) => prev.map((e) => (e.id === exId ? { ...e, boothId } : e)));
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

      badge.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", ex.id));

      if (!passFilter(ex)) badge.style.display = "none";
      list.appendChild(badge);
    });
  }, [exhibitors, filterCompany]);

  // ---------- actions ----------
  function clearFilters() {
    setFilterCompany("");
  }

  function resetLayout() {
    if (!confirm("Clear the entire canvas?")) return;
    const board = boardRef.current;
    if (board) board.innerHTML = "";
    setBooths([]);
    setExhibitors([]);
    setPendingNotes([]);
    setFilterCompany("");
  }

  function smartArrange() {
    if (!booths.length) {
      alert("No booths yet. Please add booths first.");
      return;
    }
    // 均匀分配参展商到展位
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

  // 画布：仅在 booths 变化时重建 DOM（避免重复渲染）
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
            ID: {showId || "(local)"} · Arrange booths and exhibitors, then share the ID.
          </div>
        </div>
        <div className="conf-actions">
          <button className="conf-btn" onClick={resetLayout}>Reset Layout</button>
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

            {/* Notes / Tags 输入区（与 Conference 一致） */}
            <div className="conf-notes">
              <div className="conf-row">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Note / Tag"
                />
                <button className="conf-btn" onClick={addNote} aria-label="Add note">＋</button>
              </div>
              <div className="conf-pending-notes">
                {pendingNotes.map((n, i) => (
                  <span className="conf-chip" key={n + i}>
                    {n}
                    <span className="x" onClick={() => removePendingNote(i)} aria-label="remove">×</span>
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
                <button className="conf-btn" onClick={clearFilters}>Clear Filters</button>
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
          {/* 不显示底部提示，保持与 Conference 一致 */}
        </section>
      </div>
    </div>
  );
}
