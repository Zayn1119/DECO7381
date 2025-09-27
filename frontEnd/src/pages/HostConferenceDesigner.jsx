// src/pages/HostConferenceDesigner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// 房间布局模板配置
const ROOM_LAYOUTS = [
  {
    id: "rectangle",
    name: "Rectangular room",
    type: "rectangle",
    color: "#f8fafc",
    borderColor: "#e5e7eb"
  },
  {
    id: "circle",
    name: "Circular room",
    type: "circle",
    color: "#fef7ff",
    borderColor: "#e9d5ff"
  },
];

// 桌子类型配置
const TABLE_TYPES = [
  {
    id: "circle",
    name: "Circular Table",
    type: "circle",
    color: "#eaffea",
    borderColor: "#22c55e",
    defaultWidth: 120,
    defaultHeight: 120
  },
  {
    id: "square",
    name: "Square Table",
    type: "square", 
    color: "#fffdf5",
    borderColor: "#f59e0b",
    defaultWidth: 120,
    defaultHeight: 120
  },
  {
    id: "row",
    name: "Row of Seats",
    type: "row",
    color: "#f0f9ff",
    borderColor: "#0ea5e9",
    defaultWidth: 180,
    defaultHeight: 60
  }
];

// 会议组件配置
const CONFERENCE_COMPONENTS = [
  {
    id: "podium",
    name: "Podium",
    type: "podium",
    width: 100,
    height: 60,
    color: "#e5e7eb",
    borderColor: "#9ca3af",
    defaultWidth: 100,
    defaultHeight: 60
  },
  {
    id: "door",
    name: "Door",
    type: "door",
    width: 80,
    height: 120,
    color: "#d1d5db",
    borderColor: "#6b7280",
    defaultWidth: 80,
    defaultHeight: 120
  },
  {
    id: "window",
    name: "Window",
    type: "window",
    width: 200,
    height: 40,
    color: "#bfdbfe",
    borderColor: "#3b82f6",
    defaultWidth: 200,
    defaultHeight: 40
  },
  {
    id: "stage",
    name: "Stage",
    type: "stage",
    width: 300,
    height: 80,
    color: "#fde68a",
    borderColor: "#f59e0b",
    defaultWidth: 300,
    defaultHeight: 80
  },
  {
    id: "screen",
    name: "Screen",
    type: "screen",
    width: 60,
    height: 200,
    color: "#374151",
    borderColor: "#111827",
    defaultWidth: 60,
    defaultHeight: 200
  }
];

// CSV Import Modal Component
const CSVImportModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const importedGuests = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const guest = {
          id: `imported-${Date.now()}-${index}`,
          name: values[0] || '',
          department: values[1] || '',
          position: values[2] || '',
          notes: values[3] ? values[3].split(';').map(n => n.trim()) : [],
          tableId: null
        };
        return guest;
      }).filter(guest => guest.name);

      onImport(importedGuests);
      onClose();
    } catch (error) {
      alert('CSV import failed. Please check the file format and try again.');
      console.error('CSV import error:', error);
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="conf-modal-overlay">
      <div className="conf-modal">
        <h3>Import Attendees from CSV</h3>
        <p>CSV format: Name, Department, Position, Tags (semicolon separated)</p>
        
        <div className="conf-modal-content">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange}
            className="conf-input"
          />
          
          <div className="conf-modal-actions">
            <button 
              className="conf-btn" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              className="conf-btn primary" 
              onClick={handleImport}
              disabled={!file || isLoading}
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Capacity Estimation Modal
const CapacityEstimationModal = ({ isOpen, onClose, roomDimensions, onAutoArrange }) => {
  const [estimation, setEstimation] = useState(null);

  useEffect(() => {
    if (isOpen && roomDimensions.width > 0 && roomDimensions.height > 0) {
      calculateCapacity();
    }
  }, [isOpen, roomDimensions]);

  const calculateCapacity = () => {
    const roomArea = roomDimensions.width * roomDimensions.height;
    
    const tableArea = 120 * 120;
    const spacingFactor = 1.5;
    
    const maxTables = Math.floor(roomArea / (tableArea * spacingFactor));
    const estimatedSeats = maxTables * 6;
    
    setEstimation({
      maxTables,
      estimatedSeats,
      roomArea: Math.round(roomArea / 10000),
      utilization: Math.round((maxTables * tableArea) / roomArea * 100)
    });
  };

  const handleAutoArrange = () => {
    if (window.confirm(`This will clear all existing tables and add ${estimation.maxTables} new tables. Continue?`)) {
      onAutoArrange(estimation.maxTables);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="conf-modal-overlay">
      <div className="conf-modal">
        <h3>Room Capacity Estimation</h3>
        
        <div className="conf-modal-content">
          {estimation ? (
            <div className="capacity-results">
              <div className="capacity-row">
                <span>Room Area:</span>
                <span>{estimation.roomArea} m²</span>
              </div>
              <div className="capacity-row">
                <span>Max Tables:</span>
                <span>{estimation.maxTables}</span>
              </div>
              <div className="capacity-row">
                <span>Estimated Seats:</span>
                <span>{estimation.estimatedSeats}</span>
              </div>
              <div className="capacity-row">
                <span>Space Utilization:</span>
                <span>{estimation.utilization}%</span>
              </div>
            </div>
          ) : (
            <p>Calculating...</p>
          )}
          
          <div className="conf-modal-actions">
            <button className="conf-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="conf-btn primary" 
              onClick={handleAutoArrange}
              disabled={!estimation}
            >
              Auto Arrange Tables
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Properties Panel Component
const PropertiesPanel = ({ selectedElement, tables, components, onUpdate }) => {
  const element = useMemo(() => {
    if (!selectedElement) return null;
    
    const table = tables.find(t => t.id === selectedElement);
    if (table) return { ...table, type: 'table' };
    
    const component = components.find(c => c.id === selectedElement);
    if (component) return { ...component, type: 'component' };
    
    return null;
  }, [selectedElement, tables, components]);

  const handleSizeChange = (width, height) => {
    if (!element) return;
    
    if (element.type === 'table') {
      onUpdate('table', element.id, { 
        width, 
        height,
        chairs: calculateChairPositions({ ...element, width, height })
      });
    } else {
      onUpdate('component', element.id, { width, height });
    }
  };

  if (!element) {
    return (
      <div className="conf-properties-panel">
        <h3>Properties</h3>
        <p>Select an element to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="conf-properties-panel">
      <h3>Properties - {element.name || element.label}</h3>
      
      <div className="property-group">
        <label>Width (cm)</label>
        <input
          type="number"
          value={element.width}
          onChange={(e) => handleSizeChange(Number(e.target.value), element.height)}
          min="20"
          max="500"
          className="conf-input-sm"
        />
      </div>
      
      <div className="property-group">
        <label>Height (cm)</label>
        <input
          type="number"
          value={element.height}
          onChange={(e) => handleSizeChange(element.width, Number(e.target.value))}
          min="20"
          max="500"
          className="conf-input-sm"
        />
      </div>
      
      {element.type === 'table' && (
        <>
          <div className="property-group">
            <label>Seats</label>
            <span>{element.seats}</span>
          </div>
          <div className="property-group">
            <label>Assigned</label>
            <span>{element.chairs.filter(c => c.guestId).length}/{element.seats}</span>
          </div>
        </>
      )}
      
      <div className="property-group">
        <label>Position</label>
        <span>X: {Math.round(element.x)}cm, Y: {Math.round(element.y)}cm</span>
      </div>
      
      {element.rotation !== undefined && (
        <div className="property-group">
          <label>Rotation</label>
          <span>{Math.round(element.rotation)}°</span>
        </div>
      )}
    </div>
  );
};

// 桌子类型预览组件
const TableTypePreview = ({ tableType, onSelect, isSelected }) => {
  return (
    <div 
      className={`conf-table-preview ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(tableType)}
    >
      <div 
        className={`conf-table-thumbnail ${tableType.type}`}
        style={{
          backgroundColor: tableType.color,
          borderColor: tableType.borderColor,
          width: '60px',
          height: '60px',
          borderRadius: tableType.type === 'circle' ? '50%' : '8px'
        }}
      />
      <div className="conf-table-name">{tableType.name}</div>
    </div>
  );
};

// 组件化椅子元素
const Chair = ({ chair, onDrop, onClick }) => {
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e) => {
    e.preventDefault();
    const guestId = e.dataTransfer.getData("text/plain");
    onDrop(guestId);
  };

  return (
    <div
      className={`conf-chair ${chair.guestId ? "assigned" : ""}`}
      style={{ left: chair.left, top: chair.top }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={onClick}
      data-guest={chair.guestId || ""}
    >
      {chair.guestInitial}
    </div>
  );
};

// 旋转控制点组件
const RotationHandle = ({ onRotate }) => {
  const handleMouseDown = (e) => {
    e.stopPropagation();
    onRotate(e);
  };

  return (
    <div
      className="conf-rotation-handle"
      onMouseDown={handleMouseDown}
    >
      🔄
    </div>
  );
};

// 画布控制组件
const CanvasControls = ({ scale, onZoomIn, onZoomOut, onResetView }) => {
  return (
    <div className="conf-canvas-controls">
      <button className="conf-zoom-btn" onClick={onZoomIn} title="Zoom In">+</button>
      <button className="conf-zoom-btn" onClick={onZoomOut} title="Zoom Out">-</button>
      <button className="conf-zoom-btn" onClick={onResetView} title="Reset View">⟳</button>
      <span className="conf-zoom-level">{Math.round(scale * 100)}%</span>
    </div>
  );
};

// 组件化桌子元素
const Table = ({ table, onMove, onChairDrop, onChairClick, onDelete, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(table.rotation || 0);
  const tableRef = useRef(null);
  const clickTimer = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.conf-rotation-handle')) return;
    
    setIsDragging(true);
    setStartPos({
      x: e.clientX - table.x,
      y: e.clientY - table.y
    });
    onSelect(table.id);
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    if (window.confirm(`Are you sure to remove "${table.label}"?`)) {
      onDelete(table.id, "table");
    }
  };

  const handleClick = (e) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      handleDoubleClick();
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onSelect(table.id);
      }, 300);
    }
  };

  const handleRotate = (e) => {
    setIsRotating(true);
    const rect = tableRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startRotation = rotation;

    const handleMouseMove = (moveEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const newRotation = startRotation + (angle - startAngle) * (180 / Math.PI);
      setRotation(newRotation);
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!tableRef.current) return;
      
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      
      tableRef.current.style.left = `${newX}px`;
      tableRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      if (!tableRef.current) return;
      
      const newX = parseInt(tableRef.current.style.left, 10);
      const newY = parseInt(tableRef.current.style.top, 10);
      
      onMove(table.id, newX, newY, rotation);
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startPos, table.id, onMove, rotation]);

  const assignedCount = table.chairs.filter(c => c.guestId).length;

  return (
    <div
      ref={tableRef}
      className={`conf-table ${table.type} ${isSelected ? 'selected' : ''}`}
      style={{ 
        left: table.x, 
        top: table.y,
        width: table.width,
        height: table.height,
        transform: `rotate(${rotation}deg)`
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      data-id={table.id}
    >
      <div className="conf-table-title">
        {table.label}
        <small>Seats: {table.seats}</small>
        <small>Size: {table.width}×{table.height}cm</small>
      </div>
      <div 
        className="conf-seat-count"
        style={{ 
          color: assignedCount === table.seats ? "#d32f2f" : 
                 assignedCount > 0 ? "#1976d2" : "#0f172a" 
        }}
      >
        {assignedCount}/{table.seats}
      </div>
      {table.chairs.map((chair, index) => (
        <Chair
          key={index}
          chair={chair}
          onDrop={(guestId) => onChairDrop(guestId, chair.id, table.id)}
          onClick={() => onChairClick(chair.guestId, table.id)}
        />
      ))}
      {isSelected && <RotationHandle onRotate={handleRotate} />}
    </div>
  );
};

// 会议组件元素
const ConferenceComponent = ({ component, onMove, onDelete, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(component.rotation || 0);
  const compRef = useRef(null);
  const clickTimer = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.conf-rotation-handle')) return;
    
    setIsDragging(true);
    setStartPos({
      x: e.clientX - component.x,
      y: e.clientY - component.y
    });
    onSelect(component.id);
    e.preventDefault();
  };

  const handleDoubleClick = () => {
    if (window.confirm(`Are you sure to remove "${component.name}"?`)) {
      onDelete(component.id, "conference-component");
    }
  };

  const handleClick = (e) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      handleDoubleClick();
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onSelect(component.id);
      }, 300);
    }
  };

  const handleRotate = (e) => {
    setIsRotating(true);
    const rect = compRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const startRotation = rotation;

    const handleMouseMove = (moveEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const newRotation = startRotation + (angle - startAngle) * (180 / Math.PI);
      setRotation(newRotation);
    };

    const handleMouseUp = () => {
      setIsRotating(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!compRef.current) return;
      
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      
      compRef.current.style.left = `${newX}px`;
      compRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      if (!compRef.current) return;
      
      const newX = parseInt(compRef.current.style.left, 10);
      const newY = parseInt(compRef.current.style.top, 10);
      
      onMove(component.id, newX, newY, rotation);
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startPos, component.id, onMove, rotation]);

  return (
    <div
      ref={compRef}
      className={`conf-component ${component.type} ${isSelected ? 'selected' : ''}`}
      style={{ 
        left: component.x, 
        top: component.y,
        width: component.width,
        height: component.height,
        backgroundColor: component.color,
        borderColor: component.borderColor,
        transform: `rotate(${rotation}deg)`
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      data-id={component.id}
    >
      <div className="conf-component-label">{component.name}</div>
      {isSelected && <RotationHandle onRotate={handleRotate} />}
    </div>
  );
};

// 组件化参会者徽章
const GuestBadge = ({ guest, onRemove, passFilter }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", guest.id);
  };

  if (!passFilter(guest)) {
    return null;
  }

  return (
    <span
      className={`conf-badge ${guest.tableId ? "assigned" : ""}`}
      draggable
      onDragStart={handleDragStart}
      data-id={guest.id}
      data-department={guest.department || ""}
      data-position={guest.position || ""}
    >
      {guest.name}
      {guest.department && (
        <span className="conf-badge-info">{guest.department}</span>
      )}
      {guest.position && (
        <span className="conf-badge-info">{guest.position}</span>
      )}
      {guest.notes && guest.notes.length > 0 && (
        <div className="conf-badge-notes">
          {guest.notes.map((note, i) => (
            <span key={i} className="conf-chip">
              {note}
            </span>
          ))}
        </div>
      )}
      <button
        className="conf-badge-del"
        title="Remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(guest.id);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        ×
      </button>
    </span>
  );
};

// 房间布局预览组件
const RoomLayoutPreview = ({ layout, onSelect, isSelected }) => {
  return (
    <div 
      className={`conf-room-preview ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div 
        className={`conf-room-thumbnail ${layout.type}`}
        style={{
          backgroundColor: layout.color,
          borderColor: layout.borderColor,
          width: '60px',
          height: '60px',
          borderRadius: layout.type === 'circle' ? '50%' : '8px'
        }}
      />
      <div className="conf-room-name">{layout.name}</div>
    </div>
  );
};

// 会议组件预览
const ComponentPreview = ({ component, onAdd }) => {
  return (
    <div 
      className="conf-component-preview"
      onClick={() => onAdd(component)}
    >
      <div 
        className="conf-component-thumbnail"
        style={{
          backgroundColor: component.color,
          borderColor: component.borderColor,
          width: '40px',
          height: '40px'
        }}
      />
      <div className="conf-component-name">{component.name}</div>
      <div className="conf-component-size">{component.width}×{component.height}cm</div>
    </div>
  );
};

// 房间背景组件
const RoomBackground = ({ layout, roomDimensions, scale }) => {
  if (!layout) return null;

  const roomStyle = {
    backgroundColor: layout.color,
    border: `2px solid ${layout.borderColor}`,
    borderRadius: layout.type === 'circle' ? '50%' : '12px',
    width: roomDimensions.width,
    height: roomDimensions.height,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0
  };

  return <div className="conf-room-background" style={roomStyle} />;
};

// 计算椅子位置（考虑尺寸比例）
const calculateChairPositions = (table) => {
  const chairs = [];
  const { type, seats, width = 120, height = 120, rotation = 0 } = table;
  
  const scaleFactor = Math.min(width, height) / 120;
  const radRotation = rotation * (Math.PI / 180);
  
  if (type === "circle") {
    const r = (width / 2) + 25 * scaleFactor;
    for (let i = 0; i < seats; i++) {
      const a = (2 * Math.PI * i) / seats;
      const chairX = (width / 2) + r * Math.cos(a);
      const chairY = (height / 2) + r * Math.sin(a);
      
      const rotatedX = chairX * Math.cos(radRotation) - chairY * Math.sin(radRotation);
      const rotatedY = chairX * Math.sin(radRotation) + chairY * Math.cos(radRotation);
      
      chairs.push({
        id: `${table.id}-chair-${i}`,
        left: `${rotatedX - 12}px`,
        top: `${rotatedY - 12}px`,
        guestId: "",
        guestInitial: ""
      });
    }
  } else if (type === "square") {
    const per = Math.ceil(seats / 4);
    let k = 0;
    for (let s = 0; s < 4; s++) {
      for (let i = 0; i < per && k < seats; i++, k++) {
        let chairX, chairY;
        if (s === 0) {
          chairX = (width / (per + 1)) * (i + 1);
          chairY = -30;
        } else if (s === 1) {
          chairX = width + 6;
          chairY = (height / (per + 1)) * (i + 1);
        } else if (s === 2) {
          chairX = (width / (per + 1)) * (i + 1);
          chairY = height + 6;
        } else {
          chairX = -30;
          chairY = (height / (per + 1)) * (i + 1);
        }
        
        const rotatedX = chairX * Math.cos(radRotation) - chairY * Math.sin(radRotation);
        const rotatedY = chairX * Math.sin(radRotation) + chairY * Math.cos(radRotation);
        
        chairs.push({
          id: `${table.id}-chair-${k}`,
          left: `${rotatedX - 12}px`,
          top: `${rotatedY - 12}px`,
          guestId: "",
          guestInitial: ""
        });
      }
    }
  } else if (type === "row") {
    for (let i = 0; i < seats; i++) {
      const chairX = (width / (seats + 1)) * (i + 1);
      const chairY = -30;
      
      const rotatedX = chairX * Math.cos(radRotation) - chairY * Math.sin(radRotation);
      const rotatedY = chairX * Math.sin(radRotation) + chairY * Math.cos(radRotation);
      
      chairs.push({
        id: `${table.id}-chair-${i}`,
        left: `${rotatedX - 12}px`,
        top: `${rotatedY - 12}px`,
        guestId: "",
        guestInitial: ""
      });
    }
  } else {
    const half = Math.ceil(seats / 2);
    for (let i = 0; i < half; i++) {
      const chairX = (width / (half + 1)) * (i + 1);
      const chairY = -30;
      
      const rotatedX = chairX * Math.cos(radRotation) - chairY * Math.sin(radRotation);
      const rotatedY = chairX * Math.sin(radRotation) + chairY * Math.cos(radRotation);
      
      chairs.push({
        id: `${table.id}-chair-top-${i}`,
        left: `${rotatedX - 12}px`,
        top: `${rotatedY - 12}px`,
        guestId: "",
        guestInitial: ""
      });
    }
    for (let i = 0; i < seats - half; i++) {
      const chairX = (width / (half + 1)) * (i + 1);
      const chairY = height + 6;
      
      const rotatedX = chairX * Math.cos(radRotation) - chairY * Math.sin(radRotation);
      const rotatedY = chairX * Math.sin(radRotation) + chairY * Math.cos(radRotation);
      
      chairs.push({
        id: `${table.id}-chair-bottom-${i}`,
        left: `${rotatedX - 12}px`,
        top: `${rotatedY - 12}px`,
        guestId: "",
        guestInitial: ""
      });
    }
  }
  
  return chairs;
};

export default function HostConferenceDesigner({ meetingId, onBack }) {
  // ---------- state ----------
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [components, setComponents] = useState([]);
  const [seq, setSeq] = useState(1);
  const [selectedRoomLayout, setSelectedRoomLayout] = useState(null);
  const [roomDimensions, setRoomDimensions] = useState({
    width: 1600,
    height: 900
  });
  const [selectedElement, setSelectedElement] = useState(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0, canvasX: 0, canvasY: 0 });
  
  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  
  // table controls
  const [selectedTableType, setSelectedTableType] = useState(TABLE_TYPES[0]);
  const [tableSeats, setTableSeats] = useState(6);
  const [tableWidth, setTableWidth] = useState(120);
  const [tableHeight, setTableHeight] = useState(120);
  const [tableQuantity, setTableQuantity] = useState(1);

  // component controls
  const [selectedComponent, setSelectedComponent] = useState(CONFERENCE_COMPONENTS[0]);
  const [compWidth, setCompWidth] = useState(100);
  const [compHeight, setCompHeight] = useState(60);

  // filters
  const [filterDept, setFilterDept] = useState("");
  const [filterPos, setFilterPos] = useState("");

  // notes/tags
  const [noteInput, setNoteInput] = useState("");
  const [pendingNotes, setPendingNotes] = useState([]);

  // refs
  const nameRef = useRef(null);
  const deptRef = useRef(null);
  const posRef = useRef(null);
  const boardRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // ---------- helpers ----------
  const uid = () => {
    return `id-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  };


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

  // 应用房间布局
  const applyRoomLayout = (layout) => {
    setSelectedRoomLayout(layout);
    setRoomDimensions({
      width: 1600,
      height: 900
    });
  };

  // 添加会议组件
  const addConferenceComponent = (component) => {
    if (!selectedRoomLayout) {
      alert("Please select and apply a room layout first!");
      return;
    }

    const id = uid();
    const newComponent = {
      id,
      name: component.name,
      type: component.type,
      width: compWidth,
      height: compHeight,
      x: 100,
      y: 100,
      rotation: 0,
      color: component.color,
      borderColor: component.borderColor
    };
    
    setComponents(prev => [...prev, newComponent]);
    setSelectedElement(id);
  };

  // 移动会议组件
  const moveComponent = (componentId, x, y, rotation) => {
    setComponents(prev =>
      prev.map(comp =>
        comp.id === componentId ? { ...comp, x, y, rotation: rotation || comp.rotation } : comp
      )
    );
  };

  // 移动桌子
  const moveTable = (tableId, x, y, rotation) => {
    setTables(prev => 
      prev.map(table => 
        table.id === tableId ? { ...table, x, y, rotation: rotation || table.rotation } : table
      )
    );
  };

  // 删除组件
  const deleteComponent = (componentId, componentType) => {
    if (componentType === "table") {
      setTables(prev => prev.filter(table => table.id !== componentId));
    } else if (componentType === "conference-component") {
      setComponents(prev => prev.filter(comp => comp.id !== componentId));
    }
    setSelectedElement(null);
  };

  // 选择元素
  const selectElement = (elementId) => {
    setSelectedElement(elementId);
  };

  // 画布缩放
  const zoomIn = () => {
    setCanvasScale(prev => Math.min(prev + 0.1, 2));
  };

  const zoomOut = () => {
    setCanvasScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const resetView = () => {
    setCanvasScale(1);
    setCanvasPosition({ x: 0, y: 0 });
  };

  // 画布拖动
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.conf-table') || e.target.closest('.conf-component')) return;
    
    setIsDraggingCanvas(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY,
      canvasX: canvasPosition.x,
      canvasY: canvasPosition.y
    });
    setSelectedElement(null);
  };

  useEffect(() => {
    if (!isDraggingCanvas) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;
      
      const newX = startPos.canvasX + deltaX;
      const newY = startPos.canvasY + deltaY;
      
      setCanvasPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingCanvas(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingCanvas, startPos]);

  // 新增：添加多个桌子（修复独立性问题）
  const addMultipleTables = () => {
    if (!selectedRoomLayout) {
      alert("Please select and apply a room layout first!");
      return;
    }

    const quantity = Math.max(1, Math.min(50, tableQuantity));
    
    setTables(prev => {
      const newTables = [];
      const existingCount = prev.length;
      
      for (let i = 0; i < quantity; i++) {
        const id = uid();
        const type = selectedTableType.type;
        const seats = Number(tableSeats) || 6;
        const isRow = type === "row";
        const countSameType = prev.filter((t) => (t.type === "row") === isRow).length + newTables.length + 1;
        const label = (isRow ? "R" : "T") + countSameType;
        
        const tableHeightForRow = isRow ? 60 : tableHeight;
        
        // 自动排列桌子位置，避免重叠
        const tablesInRow = 4;
        const x = 100 + ((existingCount + newTables.length) % tablesInRow) * 250;
        const y = 100 + Math.floor((existingCount + newTables.length) / tablesInRow) * 250;
        
        newTables.push({
          id,
          type,
          label,
          seats,
          width: tableWidth,
          height: tableHeightForRow,
          x,
          y,
          rotation: 0,
          chairs: calculateChairPositions({ id, type, seats, width: tableWidth, height: tableHeightForRow })
        });
      }
      
      return [...prev, ...newTables];
    });
    setSelectedElement(null);
  };

  function assignGuestToChair(guestId, chairId, tableId) {
    const guest = guests.find(g => g.id === guestId);
    if (!guest) return;

    // 清除之前的分配
    setTables(prev => 
      prev.map(table => {
        if (table.id === guest.tableId) {
          return {
            ...table,
            chairs: table.chairs.map(chair => 
              chair.guestId === guestId 
                ? { ...chair, guestId: "", guestInitial: "" } 
                : chair
            )
          };
        }
        return table;
      })
    );

    // 设置新的分配
    setTables(prev =>
      prev.map(table =>
        table.id === tableId
          ? {
              ...table,
              chairs: table.chairs.map(chair =>
                chair.id === chairId
                  ? { ...chair, guestId, guestInitial: guest.name[0] }
                  : chair
              )
            }
          : table
      )
    );

    setGuests(prev =>
      prev.map(g =>
        g.id === guestId ? { ...g, tableId } : g
      )
    );
  }

  function removeGuestFromChair(guestId, tableId) {
    setTables(prev =>
      prev.map(table =>
        table.id === tableId
          ? {
              ...table,
              chairs: table.chairs.map(chair =>
                chair.guestId === guestId
                  ? { ...chair, guestId: "", guestInitial: "" }
                  : chair
              )
            }
          : table
      )
    );

    setGuests(prev =>
      prev.map(g =>
        g.id === guestId ? { ...g, tableId: null } : g
      )
    );
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

  // ---------- 删除参会者 ----------
  function removeGuest(gid) {
    const guest = guests.find(g => g.id === gid);
    if (!guest) return;

    if (guest.tableId) {
      removeGuestFromChair(gid, guest.tableId);
    }

    setGuests(prev => prev.filter(g => g.id !== gid));
  }

  // ---------- guests ----------
  function addGuest() {
    const name = (nameRef.current?.value || "").trim();
    const dep = (deptRef.current?.value || "").trim();
    const pos = (posRef.current?.value || "").trim();
    if (!name) return;

    const newGuest = {
      id: uid(),
      name,
      department: dep,
      position: pos,
      notes: pendingNotes.slice(),
      tableId: null
    };

    setGuests(prev => [...prev, newGuest]);
    
    if (nameRef.current) nameRef.current.value = "";
    if (deptRef.current) deptRef.current.value = "";
    if (posRef.current) posRef.current.value = "";
    setPendingNotes([]);
  }

  // ---------- CSV Import ----------
  const handleCSVImport = (importedGuests) => {
    setGuests(prev => [...prev, ...importedGuests]);
  };

  // ---------- Property Updates ----------
  const handleElementUpdate = (elementType, elementId, updates) => {
    if (elementType === 'table') {
      setTables(prev => prev.map(table => 
        table.id === elementId ? { ...table, ...updates } : table
      ));
    } else if (elementType === 'component') {
      setComponents(prev => prev.map(comp => 
        comp.id === elementId ? { ...comp, ...updates } : comp
      ));
    }
  };


  // ---------- Auto Arrange Tables ----------
  const handleAutoArrangeTables = (tableCount) => {
  setTables([]);

  const newTables = [];
  const margin = 100;

  const baseWidth = tableWidth || 160;
  const baseHeight = (selectedTableType.type === "row") ? 60 : (tableHeight || 160);

  // 每张桌子的安全占位大小（桌子 + 椅子 + 间隙）
  const safetyWidth = baseWidth + 80;
  const safetyHeight = baseHeight + 120;

  // 房间左上角位置（偏移量）
  const roomX = selectedRoomLayout?.x || 0;
  const roomY = selectedRoomLayout?.y || 0;

  // ================= 圆形房间 =================
  if (selectedRoomLayout?.type === "circle") {
    const centerX = roomX + roomDimensions.width / 2;
    const centerY = roomY + roomDimensions.height / 2;

    const radiusStep = Math.max(safetyWidth, safetyHeight);
    const maxRadius = Math.min(roomDimensions.width, roomDimensions.height) / 2
      - margin
      - Math.max(baseWidth, baseHeight) / 2;

    let placed = 0;
    let ring = 0;

    while (placed < tableCount && ring * radiusStep < maxRadius) {
      const radius = (ring + 1) * radiusStep;
      const circumference = 2 * Math.PI * radius;

      const maxTablesOnRing = Math.floor(circumference / safetyWidth);
      const actualTables = Math.min(tableCount - placed, maxTablesOnRing);

      const angleStep = (2 * Math.PI) / actualTables;

      for (let i = 0; i < actualTables; i++) {
        const angle = i * angleStep;
        const x = centerX + radius * Math.cos(angle) - baseWidth / 2;
        const y = centerY + radius * Math.sin(angle) - baseHeight / 2;

        // ✅ 边界检查
        if (
          x - 40 < roomX + margin ||
          y - 60 < roomY + margin ||
          x + baseWidth + 40 > roomX + roomDimensions.width - margin ||
          y + baseHeight + 60 > roomY + roomDimensions.height - margin
        ) {
          continue;
        }

        const id = uid();
        const type = selectedTableType.type;
        const seats = Number(tableSeats) || 6;
        const label = (type === "row" ? "R" : "T") + (placed + 1);

        newTables.push({
          id,
          type,
          label,
          seats,
          width: baseWidth,
          height: baseHeight,
          x,
          y,
          rotation: 0,
          chairs: calculateChairPositions({
            id,
            type,
            seats,
            width: baseWidth,
            height: baseHeight,
          }),
        });

        placed++;
        if (placed >= tableCount) break;
      }

      ring++;
    }
  }

  // ================= 矩形房间 =================
  else {
    const tablesPerRow = Math.max(
      1,
      Math.floor((roomDimensions.width - 2 * margin) / safetyWidth)
    );

    for (let i = 0; i < tableCount; i++) {
      const row = Math.floor(i / tablesPerRow);
      const col = i % tablesPerRow;

      const x = roomX + margin + col * safetyWidth;
      const y = roomY + margin + row * safetyHeight;

      // ✅ 边界检查
      if (
        x - 40 < roomX + margin ||
        y - 60 < roomY + margin ||
        x + baseWidth + 40 > roomX + roomDimensions.width - margin ||
        y + baseHeight + 60 > roomY + roomDimensions.height - margin
      ) {
        continue;
      }

      const id = uid();
      const type = selectedTableType.type;
      const seats = Number(tableSeats) || 6;
      const label = (type === "row" ? "R" : "T") + (i + 1);

      newTables.push({
        id,
        type,
        label,
        seats,
        width: baseWidth,
        height: baseHeight,
        x,
        y,
        rotation: 0,
        chairs: calculateChairPositions({
          id,
          type,
          seats,
          width: baseWidth,
          height: baseHeight,
        }),
      });
    }
  }

  setTables(newTables);
};



  // ---------- filters ----------
  function clearFilters() {
    setFilterDept("");
    setFilterPos("");
  }

  // ---------- actions ----------
  function resetLayout() {
    if (!confirm("Reset the ALL layout")) return;
    setTables([]);
    setGuests([]);
    setComponents([]);
    setPendingNotes([]);
    setSelectedElement(null);
  }

  function smartArrange() {
    if (!tables.length) {
      alert("Please add table first");
      return;
    }

    // 清空当前分配
    setGuests(prev => prev.map(g => ({ ...g, tableId: null })));
    setTables(prev =>
      prev.map(table => ({
        ...table,
        chairs: table.chairs.map(chair => ({
          ...chair,
          guestId: "",
          guestInitial: ""
        }))
      }))
    );

    // 简单的按部门集中就座
    const groups = {};
    guests.forEach((g) => {
      (groups[g.department || "No Department"] ||= []).push(g);
    });

    const usableTables = tables
      .filter(t => t.chairs.length > 0)
      .sort((a, b) => b.chairs.length - a.chairs.length);

    const chairMap = {};
    usableTables.forEach(table => {
      chairMap[table.id] = table.chairs.map(chair => ({
        ...chair,
        tableId: table.id
      }));
    });

    const updatedTables = [...usableTables];
    const updatedGuests = [...guests];

    for (const dep of Object.keys(groups)) {
      const departmentGuests = groups[dep];
      let tableIndex = 0;

      for (const guest of departmentGuests) {
        let placed = false;

        for (let j = 0; j < usableTables.length; j++) {
          const table = usableTables[(tableIndex + j) % usableTables.length];
          const emptyChairIndex = chairMap[table.id].findIndex(chair => !chair.guestId);

          if (emptyChairIndex !== -1) {
            const tableIdx = updatedTables.findIndex(t => t.id === table.id);
            if (tableIdx !== -1) {
              const chairIdx = updatedTables[tableIdx].chairs.findIndex(
                c => c.id === chairMap[table.id][emptyChairIndex].id
              );
              
              if (chairIdx !== -1) {
                updatedTables[tableIdx].chairs[chairIdx] = {
                  ...updatedTables[tableIdx].chairs[chairIdx],
                  guestId: guest.id,
                  guestInitial: guest.name[0]
                };
                
                const guestIdx = updatedGuests.findIndex(g => g.id === guest.id);
                if (guestIdx !== -1) {
                  updatedGuests[guestIdx] = {
                    ...updatedGuests[guestIdx],
                    tableId: table.id
                  };
                }
                
                chairMap[table.id][emptyChairIndex].guestId = guest.id;
                placed = true;
                break;
              }
            }
          }
        }

        if (!placed) break;
        tableIndex++;
      }
    }

    setTables(updatedTables);
    setGuests(updatedGuests);
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

  // 更新桌子类型时重置尺寸
  useEffect(() => {
    if (selectedTableType) {
      setTableWidth(selectedTableType.defaultWidth);
      setTableHeight(selectedTableType.defaultHeight);
    }
  }, [selectedTableType]);

  // 更新组件选择时重置尺寸
  useEffect(() => {
    if (selectedComponent) {
      setCompWidth(selectedComponent.defaultWidth);
      setCompHeight(selectedComponent.defaultHeight);
    }
  }, [selectedComponent]);

  const tableCount = tables.length;

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
          <button 
            className="conf-btn" 
            onClick={() => setIsCapacityModalOpen(true)}
            title="Estimate room capacity"
          >
            Capacity: {tableCount} tables
          </button>
          <button className="conf-btn" onClick={exportCSV}>Export CSV</button>
          <button className="conf-btn" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="conf-body">
        {/* Left Sidebar */}
        <aside className="conf-sidebar">
          <div className="conf-scale-info">
            Canvas scale: 1cm = 100cm in reality
          </div>
          
          <button 
            className="conf-btn block" 
            onClick={() => setIsImportModalOpen(true)}
          >
            CSV Import
          </button>

          {/* Room Layout */}
          <div className="conf-panel">
            <h3>Room Layout</h3>
            <div className="conf-room-layouts">
              {ROOM_LAYOUTS.map(layout => (
                <RoomLayoutPreview
                  key={layout.id}
                  layout={layout}
                  isSelected={selectedRoomLayout?.id === layout.id}
                  onSelect={() => setSelectedRoomLayout(layout)}
                />
              ))}
            </div>

            <div className="conf-custom-dimensions">
              <h4>Room Dimensions (cm)</h4>
              <div className="conf-dimension-row">
                <label>Width:</label>
                <input
                  type="number"
                  value={roomDimensions.width}
                  onChange={(e) => setRoomDimensions(prev => ({...prev, width: Number(e.target.value)}))}
                  min="400"
                  max="5000"
                  className="conf-input-sm"
                />
              </div>
              <div className="conf-dimension-row">
                <label>Height:</label>
                <input
                  type="number"
                  value={roomDimensions.height}
                  onChange={(e) => setRoomDimensions(prev => ({...prev, height: Number(e.target.value)}))}
                  min="400"
                  max="5000"
                  className="conf-input-sm"
                />
              </div>
              <button 
                className="conf-btn" 
                onClick={() => applyRoomLayout(selectedRoomLayout)}
                disabled={!selectedRoomLayout}
              >
                Apply Layout
              </button>
            </div>
          </div>

          {/* Conference Components */}
          <div className="conf-panel">
            <h3>Conference Components</h3>
            <div className="conf-components-grid">
              {CONFERENCE_COMPONENTS.map(comp => (
                <ComponentPreview
                  key={comp.id}
                  component={comp}
                  onAdd={addConferenceComponent}
                />
              ))}
            </div>

            <div className="conf-component-controls">
              <div className="conf-row">
                <div>Component:&nbsp;</div>
                <select 
                  value={selectedComponent?.id} 
                  onChange={(e) => setSelectedComponent(CONFERENCE_COMPONENTS.find(c => c.id === e.target.value))}
                >
                  {CONFERENCE_COMPONENTS.map(comp => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
              </div>

              <div className="conf-row mt-8">
                <div>Width (cm):&nbsp;</div>
                <input
                  type="number"
                  value={compWidth}
                  onChange={(e) => setCompWidth(Number(e.target.value))}
                  min="20"
                  max="500"
                  className="conf-input-sm"
                />
              </div>

              <div className="conf-row mt-8">
                <div>Height (cm):&nbsp;</div>
                <input
                  type="number"
                  value={compHeight}
                  onChange={(e) => setCompHeight(Number(e.target.value))}
                  min="20"
                  max="500"
                  className="conf-input-sm"
                />
              </div>

              <div className="conf-row mt-8">
                <button 
                  className="conf-btn" 
                  onClick={() => addConferenceComponent(selectedComponent)}
                >
                  Add {selectedComponent?.name}
                </button>
              </div>
            </div>
          </div>

          {/* Tables */}
          <div className="conf-panel">
            <h3>Tables</h3>
            <div className="conf-table-types">
              {TABLE_TYPES.map(tableType => (
                <TableTypePreview
                  key={tableType.id}
                  tableType={tableType}
                  onSelect={setSelectedTableType}
                  isSelected={selectedTableType?.id === tableType.id}
                />
              ))}
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
              <div>Quantity:&nbsp;</div>
              <input
                type="number"
                value={tableQuantity}
                onChange={(e) => setTableQuantity(Number(e.target.value))}
                min="1"
                max="50"
                className="conf-input-sm"
              />
            </div>

            <div className="conf-row mt-8">
              <div>Width (cm):&nbsp;</div>
                <input
                  type="number"
                  value={tableWidth}
                  onChange={(e) => setTableWidth(Number(e.target.value))}
                  min="60"
                  max="300"
                  className="conf-input-sm"
                />
              </div>

              <div className="conf-row mt-8">
                <div>Height (cm):&nbsp;</div>
                <input
                  type="number"
                  value={tableHeight}
                  onChange={(e) => setTableHeight(Number(e.target.value))}
                  min="60"
                  max="300"
                  className="conf-input-sm"
                />
              </div>

              <div className="conf-row mt-8">
                <button className="conf-btn primary" onClick={addMultipleTables}>
                  Add {tableQuantity} Table{tableQuantity > 1 ? 's' : ''}
                </button>
              </div>
            </div>

            {/* Attendees */}
            <div className="conf-panel">
              <h3>Attendees</h3>
              <input ref={nameRef} placeholder="Name" className="conf-input" />
              <input ref={deptRef} placeholder="Department" className="conf-input" />
              <input ref={posRef} placeholder="Position" className="conf-input" />

              <div className="conf-notes">
                <div className="conf-row">
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Note / Tag"
                    className="conf-input"
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
              <div className="conf-guest-list mt-8">
                {guests.map(guest => (
                  <GuestBadge
                    key={guest.id}
                    guest={guest}
                    onRemove={removeGuest}
                    passFilter={passFilter}
                  />
                ))}
              </div>

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

        {/* Main Canvas */}
        <section className="conf-canvas">
          <CanvasControls 
            scale={canvasScale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
          />
          <div 
            className="conf-scroll"
            ref={canvasContainerRef}
            onMouseDown={handleCanvasMouseDown}
            style={{ cursor: isDraggingCanvas ? 'grabbing' : 'grab' }}
          >
            {selectedRoomLayout && roomDimensions.width > 0 && (
              <div 
                id="conf-board" 
                ref={boardRef}
                style={{
                  width: '1600px',
                  height: '900px',
                  transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasScale})`,
                  transformOrigin: '0 0'
                }}
              >
                <RoomBackground 
                  layout={selectedRoomLayout} 
                  roomDimensions={roomDimensions}
                  scale={canvasScale} 
                />
                {tables.map(table => (
                  <Table
                    key={table.id}
                    table={table}
                    onMove={moveTable}
                    onChairDrop={assignGuestToChair}
                    onChairClick={removeGuestFromChair}
                    onDelete={deleteComponent}
                    isSelected={selectedElement === table.id}
                    onSelect={selectElement}
                  />
                ))}
                {components.map(component => (
                  <ConferenceComponent
                    key={component.id}
                    component={component}
                    onMove={moveComponent}
                    onDelete={deleteComponent}
                    isSelected={selectedElement === component.id}
                    onSelect={selectElement}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Properties Panel */}
        <aside className="conf-properties-sidebar">
          <PropertiesPanel
            selectedElement={selectedElement}
            tables={tables}
            components={components}
            onUpdate={handleElementUpdate}
          />
        </aside>
      </div>

      {/* Modals */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleCSVImport}
      />
      
      <CapacityEstimationModal
        isOpen={isCapacityModalOpen}
        onClose={() => setIsCapacityModalOpen(false)}
        roomDimensions={roomDimensions}
        onAutoArrange={handleAutoArrangeTables}
      />
    </div>
  );
}