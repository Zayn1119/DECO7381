// src/pages/HostConferenceDesigner.jsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/* -------------------- 会议ID（本地保存/复用） -------------------- */
function ensureConferenceId() {
  let code = localStorage.getItem("app_conf_meeting_id");
  if (!code) {
    code = "M" + Math.random().toString(36).slice(2, 8).toUpperCase();
    localStorage.setItem("app_conf_meeting_id", code);
  }
  return code;
}

/* -------------------- 类型映射：前端 <-> 后端 -------------------- */
const TYPE_TO_API = { circle: "C", square: "S", row: "R" };
const TYPE_FROM_API = (v) => {
  const k = String(v || "").toUpperCase();
  if (k === "C" || k === "CIRCLE") return "circle";
  if (k === "S" || k === "SQUARE") return "square";
  if (k === "R" || k === "ROW") return "row";
  return "circle";
};

/* -------------------- 轻量 API -------------------- */
function apiConference(code = "") {
  const q = code ? `?code=${encodeURIComponent(code)}` : "";

  async function http(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`${method} ${url} -> ${res.status} ${t}`);
    }
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  }

  const Attendees = {
    list: () => http("GET", `/api/attendees/${q}`),
    create: (payload) => http("POST", `/api/attendees/${q}`, payload),
    update: (id, data) => http("PATCH", `/api/attendees/${id}/${q}`, data),
    remove: (id) => http("DELETE", `/api/attendees/${id}/${q}`),
  };

  const Tables = {
    list: () => http("GET", `/api/tables/${q}`),
    bulk: (tables) => http("POST", `/api/tables/bulk${q}`, { tables }),
    create: (row) => http("POST", `/api/tables/${q}`, row),
    update: (id, data) => http("PATCH", `/api/tables/${id}/${q}`, data),
  };

  const Assignments = {
    list: () => http("GET", `/api/assignments/${q}`),
    bulk: (items) =>
      http("POST", `/api/assignments/bulk${q}`, {
        assignments: items.map((a) => ({
          attendee: Number(a.attendee), // int PK
          table: Number(a.table), // int PK
          seat_index: Number(a.seat_index), // ⭐ seat_index
          status: a.status || "assigned",
        })),
      }),
    create: (row) =>
      http("POST", `/api/assignments/${q}`, {
        attendee: Number(row.attendee),
        table: Number(row.table),
        seat_index: Number(row.seat_index),
        status: row.status || "assigned",
      }),
    clear: () => http("DELETE", `/api/assignments/clear${q}`),
  };

  return {
    bootstrap: async () => {
      try {
        return await http("GET", `/api/bootstrap${q}`);
      } catch {
        const [attendees, tables, assignments] = await Promise.all([
          Attendees.list().catch(() => []),
          Tables.list().catch(() => []),
          Assignments.list().catch(() => []),
        ]);
        return { attendees, tables, assignments };
      }
    },
    attendees: Attendees,
    tables: Tables,
    assignments: Assignments,
  };
}

export default function HostConferenceDesigner({ meetingId, onBack }) {
  // ---------- state ----------
  const [tables, setTables] = useState([]); // {id,type,label,seats,x,y,chairs:DOM[]}
  const [guests, setGuests] = useState([]); // {id,name,department,position,notes:string[],tableId}
  const [seq, setSeq] = useState(1);
  const [meetingCode, setMeetingCode] = useState("");

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

  // helpers
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

  /* -------------------- 初始化：拉后端数据 -------------------- */
  useEffect(() => {
    const code = meetingId || ensureConferenceId();
    setMeetingCode(code);
    const api = apiConference(code);

    api
      .bootstrap()
      .then((data) => {
        const listGuests = (data.attendees || []).map((a, i) => ({
          id: String(a.id ?? a.pk ?? `srv${i}`),
          name: a.full_name || a.name || "",
          department: a.department || a.dept || "",
          position: a.position || a.job_title || "",
          notes: Array.isArray(a.notes) ? a.notes : a.note ? [a.note] : [],
          tableId: null,
        }));
        setGuests(listGuests);

        const listTables = (data.tables || []).map((t, i) => ({
          id: String(t.id ?? t.pk ?? `tbl${i}`),
          type: TYPE_FROM_API(t.table_type ?? t.type),
          label: t.label || t.name || `T${i + 1}`,
          seats: Number(t.seats ?? t.capacity ?? 6),
          x: Number(t.x ?? t.left ?? 20),
          y: Number(t.y ?? t.top ?? 20),
          chairs: [],
        }));
        setTables(listTables);

        const listAssign = (data.assignments || []).map((a) => ({
          attendee_id: String(a.attendee_id ?? a.attendee),
          table_id: String(a.table_id ?? a.table),
          seat_index: Number(a.seat_index ?? a.seat ?? 0),
        }));
        window.__pending_assignments = listAssign;
      })
      .catch(console.error);
  }, [meetingId]);

  /* -------------------- 桌子画布 -------------------- */
  function addTable() {
    setTables((prev) => {
      const id = uid();
      const type = tableType;
      const seats = Number(tableSeats) || 6;
      const isRow = type === "row";
      const countSameType = prev.filter((t) => (t.type === "row") === isRow).length + 1;
      const label = (isRow ? "R" : "T") + countSameType;
      return [...prev, { id, type, label, seats, x: 20, y: 20, chairs: [] }];
    });
  }

  function makeTableDom(t) {
    const board = boardRef.current;
    if (!board) return;

    const el = document.createElement("div");
    el.className =
      "conf-table " + (t.type === "square" ? "square" : t.type === "row" ? "row" : "circle");
    el.style.left = t.x + "px";
    el.style.top = t.y + "px";
    el.dataset.id = t.id;

    const title = document.createElement("div");
    title.className = "conf-table-title";
    title.innerHTML = t.label + '<small>Seats: ' + t.seats + "</small>";

    const cnt = document.createElement("div");
    cnt.className = "conf-seat-count";
    cnt.id = "conf-count-" + t.id;
    cnt.textContent = "0/" + t.seats;

    el.appendChild(title);
    el.appendChild(cnt);
    board.appendChild(el);

    // drag move
    let down = false,
      sx = 0,
      sy = 0,
      ox = 0,
      oy = 0;
    el.addEventListener("mousedown", (e) => {
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
      const id = el.dataset.id;
      setTables((prev) =>
        prev.map((tt) =>
          tt.id === id ? { ...tt, x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) } : tt
        )
      );
    });

    placeChairs(t, el);
  }

  function updateSeatCount(tableId) {
    const t = getTable(tableId);
    if (!t) return;
    const assigned = t.chairs.filter((c) => c.dataset.guest).length;
    const el = document.getElementById("conf-count-" + tableId);
    if (el) {
      el.textContent = assigned + "/" + t.seats;
      el.style.color = assigned === t.seats ? "#d32f2f" : assigned > 0 ? "#1976d2" : "#0f172a";
    }
  }

  function placeChairs(t, el) {
    t.chairs = [];
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
      const cx = el.offsetWidth / 2,
        cy = el.offsetHeight / 2,
        r = el.offsetWidth / 2 + 25;
      for (let i = 0; i < t.seats; i++) {
        const a = (2 * Math.PI * i) / t.seats;
        mk(cx + r * Math.cos(a) - 12 + "px", cy + r * Math.sin(a) - 12 + "px");
      }
    } else if (t.type === "square") {
      const w = el.offsetWidth,
        h = el.offsetHeight,
        per = Math.ceil(t.seats / 4);
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
      const w = el.offsetWidth,
        half = Math.ceil(t.seats / 2);
      for (let i = 0; i < half; i++) mk((w / (half + 1)) * (i + 1) - 12 + "px", "-30px");
      for (let i = 0; i < t.seats - half; i++) mk((w / (half + 1)) * (i + 1) - 12 + "px", el.offsetHeight + 6 + "px");
    }

    updateSeatCount(t.id);
  }

  function setupChairDrop(chair, tableId) {
    chair.ondragover = (e) => e.preventDefault();
    chair.ondrop = (e) => {
      e.preventDefault();
      const gid = e.dataTransfer.getData("text/plain");
      assignGuestToChair(gid, chair, tableId);
    };
  }

  function assignGuestToChair(guestId, chair, tableId) {
    const g = guests.find((x) => x.id === guestId);
    const t = tables.find((x) => x.id === tableId);
    if (!g || !t) return;

    if (chair.dataset.guest) return; // 已占

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

  /* -------------------- notes/tags -------------------- */
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

  /* -------------------- 新增参会者：写库 -------------------- */
  async function addGuest() {
    const name = (nameRef.current?.value || "").trim();
    const dep = (deptRef.current?.value || "").trim();
    const pos = (posRef.current?.value || "").trim();
    if (!name) return;

    try {
      const created = await apiConference(meetingCode).attendees.create({
        full_name: name,
        department: dep || "",
        position: pos || "",
        note: pendingNotes.join(" | "),
      });
      setGuests((arr) => [
        ...arr,
        {
          id: String(created.id ?? uid()),
          name: created.full_name || created.name || name,
          department: created.department ?? dep,
          position: created.position ?? pos,
          notes: pendingNotes.slice(),
          tableId: null,
        },
      ]);
      if (nameRef.current) nameRef.current.value = "";
      if (deptRef.current) deptRef.current.value = "";
      if (posRef.current) posRef.current.value = "";
      setPendingNotes([]);
    } catch (e) {
      console.error(e);
      alert("Create attendee failed:\n" + e.message);
    }
  }

  /* -------------------- 初次还原座位（等待 DOM） -------------------- */
  useEffect(() => {
    const pend = window.__pending_assignments;
    if (!pend || !tables.length) return;

    const gMap = new Map(guests.map((g) => [String(g.id), g]));
    const tMap = new Map(tables.map((t) => [String(t.id), t]));

    pend.forEach((a) => {
      const g = gMap.get(String(a.attendee_id));
      const t = tMap.get(String(a.table_id));
      if (!g || !t || !t.chairs.length) return;
      const seat = t.chairs[a.seat_index] || t.chairs.find((c) => !c.dataset.guest);
      if (!seat || seat.dataset.guest) return;
      seat.dataset.guest = g.id;
      seat.textContent = g.name[0];
      seat.classList.add("assigned");
      g.tableId = t.id;
      updateSeatCount(t.id);
    });

    setGuests((arr) => arr.map((x) => ({ ...x })));
    delete window.__pending_assignments;
  }, [tables]);

  /* -------------------- 保存：Tables → 映射 → Assignments -------------------- */
  async function saveLayout() {
    const api = apiConference(meetingCode);

    // 1) 采集 tables（转 C/S/R）
    const outTables = tables.map((t) => {
      const el = boardRef.current?.querySelector(`[data-id="${t.id}"]`);
      const left = el ? parseInt(el.style.left || `${t.x}`, 10) : t.x;
      const top = el ? parseInt(el.style.top || `${t.y}`, 10) : t.y;
      return {
        id: /^[0-9]+$/.test(String(t.id)) ? Number(t.id) : undefined,
        label: t.label,
        table_type: TYPE_TO_API[t.type] ?? t.type,
        seats: Number(t.seats),
        x: Number(left),
        y: Number(top),
      };
    });

    // 2) 保存 tables
    try {
      await api.tables.bulk(outTables);
    } catch {
      for (const row of outTables) {
        if (row.id) await api.tables.update(row.id, row);
        else await api.tables.create(row);
      }
    }

    // 3) 拉服务器 tables，建立映射
    const serverTables = await api.tables.list().catch(() => []);
    const toKeySrv = (st) =>
      `${st.label}|${TYPE_FROM_API(st.table_type ?? st.type)}|${Number(st.seats)}`;
    const groups = {};
    serverTables.forEach((st) => {
      (groups[toKeySrv(st)] ||= []).push({
        id: Number(st.id),
        x: Number(st.x ?? st.left ?? 0),
        y: Number(st.y ?? st.top ?? 0),
      });
    });

    const localToServerId = new Map();
    tables.forEach((lt) => {
      const key = `${lt.label}|${lt.type}|${Number(lt.seats)}`;
      const candidates = (groups[key] || []).slice();
      if (!candidates.length) return;

      const el = boardRef.current?.querySelector(`[data-id="${lt.id}"]`);
      const lx = el ? parseInt(el.style.left || `${lt.x}`, 10) : lt.x;
      const ly = el ? parseInt(el.style.top || `${lt.y}`, 10) : lt.y;

      candidates.sort(
        (a, b) =>
          Math.abs(a.x - lx) +
          Math.abs(a.y - ly) -
          (Math.abs(b.x - lx) + Math.abs(b.y - ly))
      );
      const pick = candidates.shift();
      localToServerId.set(String(lt.id), pick.id);
      groups[key] = candidates;
    });

    // 4) 采集 assignments（把 table 映射成服务器 PK）
    const outAssign = [];
    tables.forEach((t) => {
      const srvTid =
        localToServerId.get(String(t.id)) ??
        (/^[0-9]+$/.test(String(t.id)) ? Number(t.id) : null);
      if (!srvTid) return;
      t.chairs.forEach((c, idx) => {
        if (c.dataset.guest) {
          const attId = Number(c.dataset.guest);
          if (!Number.isFinite(attId)) return;
          outAssign.push({
            attendee: attId,
            table: srvTid,
            seat_index: idx,
          });
        }
      });
    });

    try {
      // 5) 保存 assignments
      try {
        await api.assignments.clear().catch(() => {});
        await api.assignments.bulk(outAssign);
      } catch {
        await api.assignments.clear().catch(() => {});
        for (const a of outAssign) {
          await api.assignments.create(a);
        }
      }
      alert("Saved!");
    } catch (e) {
      console.error(e);
      alert("Save failed:\n" + e.message);
    }
  }

  /* -------------------- Guests 列表（拖拽/过滤） -------------------- */
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

      badge.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", g.id));
      if (!passFilter(g)) badge.style.display = "none";
      list.appendChild(badge);
    });
  }, [guests, filterDept, filterPos]);

  /* -------------------- 其它动作/导出 -------------------- */
  const clearFilters = () => {
    setFilterDept("");
    setFilterPos("");
  };

  function resetLayout() {
    if (!confirm("Clear the entire canvas?")) return;
    const board = boardRef.current;
    if (board) board.innerHTML = "";
    setTables([]);
    setGuests([]);
    setPendingNotes([]);
  }

  function smartArrange() {
    if (!tables.length) {
      alert("No tables yet. Please add tables first.");
      return;
    }

    setGuests((arr) => arr.map((g) => ({ ...g, tableId: null })));
    tables.forEach((t) => {
      t.chairs.forEach((c) => {
        c.dataset.guest = "";
        c.textContent = "";
        c.classList.remove("assigned");
      });
      updateSeatCount(t.id);
    });

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
        let ok = false;
        for (let j = 0; j < usable.length; j++) {
          const table = usable[(ti + j) % usable.length];
          const empty = table.chairs.find((c) => !c.dataset.guest);
          if (empty) {
            empty.dataset.guest = g.id;
            empty.textContent = g.name[0];
            empty.classList.add("assigned");
            g.tableId = table.id;
            ok = true;
            break;
          }
        }
        if (!ok) break;
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

  // 画布重绘
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.innerHTML = "";
    tables.forEach((t) => makeTableDom(t));
  }, [tables]);

  /* -------------------- UI -------------------- */
  return (
    <div className="conf-app">
      <div className="conf-header">
        <div className="conf-title">
          <h1>Conference Planner</h1>
          <div className="conf-muted">
            ID: {meetingCode || meetingId || "(local)"} · Arrange tables and attendees, then share the ID.
          </div>
        </div>
        <div className="conf-actions">
          <button className="conf-btn" onClick={resetLayout}>Reset Layout</button>
          <button className="conf-btn" onClick={smartArrange}>Smart Arrange</button>
          <button className="conf-btn" onClick={exportCSV}>Export CSV</button>
          <button className="conf-btn" onClick={exportPDF}>Export PDF</button>
          <button className="conf-btn" onClick={saveLayout}>Save Layout</button>
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
            <div className="conf-row" style={{ marginTop: 8 }}>
              <div>Seats:&nbsp;</div>
              <select value={tableSeats} onChange={(e) => setTableSeats(Number(e.target.value))}>
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="conf-row" style={{ marginTop: 8 }}>
              <button className="conf-btn" onClick={addTable}>Add Table »</button>
            </div>
          </div>

          <div className="conf-panel">
            <h3>Attendees</h3>
            <input ref={nameRef} placeholder="Name" />
            <input ref={deptRef} placeholder="Department" />
            <input ref={posRef} placeholder="Position" />

            {/* Notes / Tags */}
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

            {/* Guests 列表（可拖拽） */}
            <div ref={guestListRef} style={{ marginTop: 8 }} />

            <button className="conf-btn" style={{ marginTop: 12 }} onClick={onBack}>
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
