// src/pages/HostConferenceDesigner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function HostConferenceDesigner({ meetingId, onBack }) {
  // ---------- state ----------
  const [tables, setTables] = useState([]); // {id,type,label,seats,x,y,chairs:DOM[]}
  const [guests, setGuests] = useState([]); // {id,name,department,position,notes:string[],tableId}
  const [seq, setSeq] = useState(1);

  // table controls
  const [tableType, setTableType] = useState("circle");
  const [tableSeats, setTableSeats] = useState(6);

  // filters
  const [filterDept, setFilterDept] = useState("");
  const [filterPos, setFilterPos] = useState("");

  // attendee inputs
  const nameRef = useRef(null);
  const deptRef = useRef(null);
  const posRef = useRef(null);

  // notes/tags
  const [noteInput, setNoteInput] = useState("");
  const [pendingNotes, setPendingNotes] = useState([]);

  // dom refs
  const boardRef = useRef(null);
  const guestListRef = useRef(null);
  // 保存已创建的桌子 DOM，避免重建导致丢失座位分配
  const tableDomMapRef = useRef(new Map()); // id -> {el}

  // ---------- helpers ----------
  const uid = () => {
    const id = "id" + (seq + 1);
    setSeq((s) => s + 1);
    return id;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const getTable = (id) => tables.find((t) => t.id === id);

  const deptOptions = useMemo(() => {
    const s = new Set();
    guests.forEach((g) => g.department && s.add(g.department));
    return ["", ...Array.from(s)];
  }, [guests]);

  const posOptions = useMemo(() => {
    const s = new Set();
    guests.forEach((g) => g.position && s.add(g.position));
    return ["", ...Array.from(s)];
  }, [guests]);

  const passFilter = (g) =>
    (!filterDept || g.department === filterDept) &&
    (!filterPos || g.position === filterPos);

  // ---------- tables ----------
  function addTable() {
    setTables((prev) => {
      const id = uid();
      const type = tableType;
      const seats = Number(tableSeats) || 6;
      const isRow = type === "row";
      const countSameType = prev.filter((t) => (t.type === "row") === isRow).length + 1;
      const label = (isRow ? "R" : "T") + countSameType;
      const t = { id, type, label, seats, x: 20, y: 20, chairs: [] };
      return [...prev, t];
    });
  }

  function updateSeatCount(tableId) {
    const t = getTable(tableId);
    if (!t) return;
    const assigned = t.chairs.filter((c) => c.dataset.guest).length;
    const cnt = tableDomMapRef.current.get(tableId)?.el.querySelector(".conf-seat-count");
    if (cnt) {
      cnt.textContent = assigned + "/" + t.seats;
      cnt.style.color = assigned === t.seats ? "#d32f2f" : assigned > 0 ? "#1976d2" : "#0f172a";
    }
  }

  function setupChairDrop(chair, tableId) {
    chair.ondragover = (e) => e.preventDefault();
    chair.ondrop = (e) => {
      e.preventDefault();
      const gid = e.dataTransfer.getData("text/plain");
      assignGuestToChair(gid, chair, tableId);
    };
    // 点击已占用的椅子可移除该参会者
    chair.onclick = () => {
      const gid = chair.dataset.guest;
      if (!gid) return;
      chair.dataset.guest = "";
      chair.textContent = "";
      chair.classList.remove("assigned");
      setGuests((arr) => arr.map((g) => (g.id === gid ? { ...g, tableId: null } : g)));
      updateSeatCount(tableId);
    };
  }

  function placeChairs(t, el) {
    t.chairs = [];

    // 用真实宽高来计算，保证圆桌不因样式改变而错位
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const mk = (left, top) => {
      const c = document.createElement("div");
      c.className = "conf-chair";
      c.style.left = left;
      c.style.top = top;
      c.dataset.guest = "";
      setupChairDrop(c, t.id);
      el.appendChild(c);
      t.chairs.push(c);
    };

    if (t.type === "circle") {
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 + 25;
      for (let i = 0; i < t.seats; i++) {
        const a = (2 * Math.PI * i) / t.seats;
        mk(cx + r * Math.cos(a) - 12 + "px", cy + r * Math.sin(a) - 12 + "px");
      }
    } else if (t.type === "square") {
      const per = Math.ceil(t.seats / 4);
      let k = 0;
      for (let s = 0; s < 4; s++) {
        for (let i = 0; i < per && k < t.seats; i++, k++) {
          if (s === 0) mk((w / (per + 1)) * (i + 1) - 12 + "px", "-30px");
          if (s === 1) mk(w + 6 + "px", (h / (per + 1)) * (i + 1) - 12 + "px");
          if (s === 2) mk((w / (per + 1)) * (i + 1) - 12 + "px", h + 6 + "px");
          if (s === 3) mk("-30px", (h / (per + 1)) * (i + 1) - 12 + "px");
        }
      }
    } else {
      const half = Math.ceil(t.seats / 2);
      for (let i = 0; i < half; i++) mk((w / (half + 1)) * (i + 1) - 12 + "px", "-30px");
      for (let i = 0; i < t.seats - half; i++) mk((w / (half + 1)) * (i + 1) - 12 + "px", h + 6 + "px");
    }

    updateSeatCount(t.id);
  }

  function makeTableDom(t) {
    const board = boardRef.current;
    if (!board || tableDomMapRef.current.has(t.id)) return;

    const el = document.createElement("div");
    el.className = "conf-table " + (t.type === "square" ? "square" : t.type === "row" ? "row" : "circle");
    el.style.left = t.x + "px";
    el.style.top = t.y + "px";
    el.dataset.id = t.id;

    const title = document.createElement("div");
    title.className = "conf-table-title";
    title.innerHTML = t.label + '<small>Seats: ' + t.seats + "</small>";

    const cnt = document.createElement("div");
    cnt.className = "conf-seat-count";
    cnt.textContent = "0/" + t.seats;

    el.appendChild(title);
    el.appendChild(cnt);
    board.appendChild(el);

    // 拖动桌子：仅更新位置，不重建 DOM（不会清空座位）
    let down = false, sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener("mousedown", (e) => {
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
      setTables((prev) =>
        prev.map((tt) =>
          tt.id === id ? { ...tt, x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) } : tt
        )
      );
    });

    placeChairs(t, el);
    tableDomMapRef.current.set(t.id, { el });
  }

  function assignGuestToChair(guestId, chair, tableId) {
    const g = guests.find((x) => x.id === guestId);
    const t = tables.find((x) => x.id === tableId);
    if (!g || !t) return;
    if (chair.dataset.guest) return;

    // 若该人原本在其他椅子，先释放
    if (g.tableId) {
      const prev = getTable(g.tableId);
      if (prev) {
        prev.chairs.forEach((c) => {
          if (c.dataset.guest === g.id) {
            c.dataset.guest = "";
            c.textContent = "";
            c.classList.remove("assigned");
          }
        });
        updateSeatCount(g.tableId);
      }
    }

    chair.dataset.guest = g.id;
    chair.textContent = g.name[0];
    chair.classList.add("assigned");
    setGuests((arr) => arr.map((x) => (x.id === g.id ? { ...x, tableId } : x)));
    updateSeatCount(tableId);
  }

  // ---------- notes/tags ----------
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

  // ---------- 删除参会者（左侧×按钮） ----------
  function removeGuest(gid) {
    const g = guests.find((x) => x.id === gid);
    if (!g) return;
    if (g.tableId) {
      const t = getTable(g.tableId);
      if (t) {
        t.chairs.forEach((c) => {
          if (c.dataset.guest === gid) {
            c.dataset.guest = "";
            c.textContent = "";
            c.classList.remove("assigned");
          }
        });
        updateSeatCount(t.id);
      }
    }
    setGuests((arr) => arr.filter((x) => x.id !== gid));
  }

  // ---------- guests ----------
  function addGuest() {
    const name = (nameRef.current?.value || "").trim();
    const dep = (deptRef.current?.value || "").trim();
    const pos = (posRef.current?.value || "").trim();
    if (!name) return;

    setGuests((arr) => [
      ...arr,
      { id: uid(), name, department: dep, position: pos, notes: pendingNotes.slice(), tableId: null }
    ]);
    if (nameRef.current) nameRef.current.value = "";
    if (deptRef.current) deptRef.current.value = "";
    if (posRef.current) posRef.current.value = "";
    setPendingNotes([]);
  }

  // 渲染 Guest 徽章（拖拽 & 过滤 & notes 展示 & 删除按钮）
  useEffect(() => {
    const list = guestListRef.current;
    if (!list) return;
    list.innerHTML = "";

    guests.forEach((g) => {
      const badge = document.createElement("span");
      badge.className = "conf-badge" + (g.tableId ? " assigned" : "");
      badge.draggable = true;
      badge.dataset.id = g.id;
      badge.dataset.department = g.department || "";
      badge.dataset.position = g.position || "";

      const notesHTML =
        g.notes && g.notes.length
          ? '<div class="conf-badge-notes">' +
            g.notes
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
        g.name +
        (g.department ? '<span class="conf-badge-info">' + g.department + "</span>" : "") +
        (g.position ? '<span class="conf-badge-info">' + g.position + "</span>" : "") +
        notesHTML;

      const del = document.createElement("button");
      del.className = "conf-badge-del";
      del.title = "Remove";
      del.textContent = "×";
      del.onclick = (e) => {
        e.stopPropagation();
        removeGuest(g.id);
      };
      del.onmousedown = (e) => e.stopPropagation();
      badge.appendChild(del);

      badge.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", g.id));
      if (!passFilter(g)) badge.style.display = "none";
      list.appendChild(badge);
    });
  }, [guests, filterDept, filterPos]);

  // ---------- filters ----------
  function clearFilters() {
    setFilterDept("");
    setFilterPos("");
  }

  // ---------- actions ----------
  function resetLayout() {
    if (!confirm("Clear the entire canvas?")) return;
    const board = boardRef.current;
    if (board) board.innerHTML = "";
    tableDomMapRef.current.clear();
    setTables([]);
    setGuests([]);
    setPendingNotes([]);
  }

  function smartArrange() {
    if (!tables.length) {
      alert("No tables yet. Please add tables first.");
      return;
    }

    // 清空当前分配
    setGuests((arr) => arr.map((g) => ({ ...g, tableId: null })));
    tables.forEach((t) => {
      t.chairs.forEach((c) => {
        c.dataset.guest = "";
        c.textContent = "";
        c.classList.remove("assigned");
      });
      updateSeatCount(t.id);
    });

    // 简单的按部门集中就座
    const groups = {};
    guests.forEach((g) => {
      (groups[g.department || "No Department"] ||= []).push(g);
    });

    const usable = tables
      .filter((t) => t.chairs.length > 0)
      .sort((a, b) => b.chairs.length - a.chairs.length);

    for (const dep of Object.keys(groups)) {
      const arr = groups[dep];
      let ti = 0;
      for (const g of arr) {
        let placed = false;
        for (let j = 0; j < usable.length; j++) {
          const table = usable[(ti + j) % usable.length];
          const empty = table.chairs.find((c) => !c.dataset.guest);
          if (empty) {
            empty.dataset.guest = g.id;
            empty.textContent = g.name[0];
            empty.classList.add("assigned");
            g.tableId = table.id;
            placed = true;
            break;
          }
        }
        if (!placed) break;
        ti++;
      }
    }

    setGuests((arr) => arr.map((g) => ({ ...g })));
    tables.forEach((t) => updateSeatCount(t.id));
  }

  function exportCSV() {
    let csv = "Name,Department,Position,Notes,Table\n";
    guests.forEach((g) => {
      const t = g.tableId ? tables.find((x) => x.id === g.tableId) : null;
      const notes = (g.notes || []).join(" | ");
      csv += `"${g.name}","${g.department || ""}","${g.position || ""}","${notes.replace(
        /"/g,
        '""'
      )}","${t ? t.label : "Unassigned"}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "assignments.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportPDF() {
    const board = boardRef.current;
    if (!board) return;
    const canvas = await html2canvas(board);
    const pdf = new jsPDF("landscape", "pt", [canvas.width, canvas.height]);
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("layout.pdf");
  }

  // 只在“发现有新桌子但还没有DOM”时创建DOM；不会清空画布
  useEffect(() => {
    tables.forEach((t) => makeTableDom(t));
  }, [tables]);

  // ---------- UI ----------
  return (
    <div className="conf-app">
      <div className="conf-header">
        <div className="conf-title">
          <h1>Conference Planner</h1>
          <div className="conf-muted">
            ID: {meetingId || "(local)"} · Arrange tables and attendees, then share the ID.
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
            <h3>Tables</h3>
            <div className="conf-row">
              <div>Type:&nbsp;</div>
              <select value={tableType} onChange={(e) => setTableType(e.target.value)}>
                <option value="circle">Circular</option>
                <option value="square">Square</option>
                <option value="row">Row of Seats</option>
              </select>
            </div>

            <div className="conf-row mt-8">
              <div>Seats:&nbsp;</div>
              <select value={tableSeats} onChange={(e) => setTableSeats(Number(e.target.value))}>
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="conf-row mt-8">
              <button className="conf-btn" onClick={addTable}>Add Table »</button>
            </div>
          </div>

          <div className="conf-panel">
            <h3>Attendees</h3>
            <input ref={nameRef} placeholder="Name" />
            <input ref={deptRef} placeholder="Department" />
            <input ref={posRef} placeholder="Position" />

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

            <button className="conf-btn block" onClick={addGuest}>Add Attendee</button>

            {/* Guests 列表（可拖拽） */}
            <div ref={guestListRef} className="conf-guest-list mt-8" />

            {/* Filters */}
            <div className="conf-filters">
              <h4 style={{ marginBottom: 8 }}>Filters</h4>
              <div className="conf-filter-row">
                <div className="conf-filter-label">Department:</div>
                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                  {deptOptions.map((opt) => (
                    <option key={opt || "ALL"} value={opt}>
                      {opt || "All Departments"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="conf-filter-row">
                <div className="conf-filter-label">Position:</div>
                <select value={filterPos} onChange={(e) => setFilterPos(e.target.value)}>
                  {posOptions.map((opt) => (
                    <option key={opt || "ALL"} value={opt}>
                      {opt || "All Positions"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="conf-filter-buttons">
                <button className="conf-btn" onClick={clearFilters}>Clear Filters</button>
              </div>
            </div>

            <button className="conf-btn mt-12" onClick={onBack}>
              Back to menu
            </button>
          </div>
        </aside>

        {/* 右侧画布 */}
        <section className="conf-canvas">
          <div className="conf-scroll">
            <div id="conf-board" ref={boardRef} />
          </div>
        </section>
      </div>
    </div>
  );
}
