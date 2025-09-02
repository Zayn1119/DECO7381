import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
// import './TradeShowPlanner.css';

// 生成唯一ID
const useUid = () => {
  const seq = useRef(1);
  return () => 'id' + (seq.current++);
};

const TradeShowPlanner = () => {
  const generateId = useUid();
  const boardRef = useRef(null);
  
  // 应用状态
  const [booths, setBooths] = useState([]);
  const [exhibitors, setExhibitors] = useState([]);
  const [filters, setFilters] = useState({ industry: '', search: '' });
  const [selectedBoothType, setSelectedBoothType] = useState('exhibitor');
  const [selectedBoothSize, setSelectedBoothSize] = useState('small');
  const [boothCounter, setBoothCounter] = useState({ exhibitor: 1, lounge: 1 });
  const [industries, setIndustries] = useState([]);
  
  // 更新行业列表
  useEffect(() => {
    const industrySet = new Set();
    exhibitors.forEach(exhibitor => {
      if (exhibitor.industry) industrySet.add(exhibitor.industry);
    });
    setIndustries(Array.from(industrySet));
  }, [exhibitors]);
  
  // 添加展位
  const addBooth = () => {
    const type = selectedBoothType;
    const size = selectedBoothSize;
    const width = size === 'small' ? 120 : 240;
    const height = 120;
    
    // 生成展位编号
    const prefix = type === 'exhibitor' ? 'E' : 'L';
    const number = `${prefix}${boothCounter[type].toString().padStart(3, '0')}`;
    
    const newBooth = {
      id: generateId(),
      type,
      size,
      number,
      width,
      height,
      x: 20,
      y: 20,
      exhibitorId: null
    };
    
    setBooths([...booths, newBooth]);
    setBoothCounter({
      ...boothCounter,
      [type]: boothCounter[type] + 1
    });
    
    alert(`Booth ${number} added! Drag it to position on the canvas.`);
  };
  
  // 添加参展商
  const addExhibitor = (name, industry) => {
    const newExhibitor = {
      id: generateId(),
      name: name.trim(),
      industry: industry.trim(),
      boothId: null
    };
    
    setExhibitors([...exhibitors, newExhibitor]);
  };
  
  // 分配参展商到展位
  const assignExhibitorToBooth = (exhibitorId, boothId) => {
    const exhibitor = exhibitors.find(e => e.id === exhibitorId);
    const booth = booths.find(b => b.id === boothId);
    
    if (!exhibitor || !booth) return;
    
    // 休息区不能分配参展商
    if (booth.type === 'lounge') {
      alert("Cannot assign exhibitors to lounge areas.");
      return;
    }
    
    // 如果展位已有参展商，询问是否替换
    if (booth.exhibitorId && booth.exhibitorId !== exhibitorId) {
      if (!confirm("This booth already has an exhibitor. Replace it?")) return;
      
      // 移除原参展商的展位分配
      setExhibitors(exhibitors.map(e => 
        e.id === booth.exhibitorId ? {...e, boothId: null} : e
      ));
    }
    
    // 如果参展商已有展位，移除原分配
    if (exhibitor.boothId) {
      setBooths(booths.map(b => 
        b.id === exhibitor.boothId ? {...b, exhibitorId: null} : b
      ));
    }
    
    // 更新分配
    setBooths(booths.map(b => 
      b.id === boothId ? {...b, exhibitorId: exhibitorId} : b
    ));
    
    setExhibitors(exhibitors.map(e => 
      e.id === exhibitorId ? {...e, boothId: boothId} : e
    ));
  };
  
  // 移动展位
  const moveBooth = (boothId, x, y) => {
    setBooths(booths.map(booth => 
      booth.id === boothId ? {...booth, x, y} : booth
    ));
  };
  
  // 重置布局
  const resetLayout = () => {
    if (confirm("Are you sure you want to reset the layout? This will remove all booths and exhibitor assignments.")) {
      setBooths([]);
      setExhibitors(exhibitors.map(e => ({...e, boothId: null})));
      setBoothCounter({ exhibitor: 1, lounge: 1 });
      setFilters({ industry: '', search: '' });
    }
  };
  
  // 智能排列
  const smartArrange = () => {
    // 清除所有现有的分配
    const updatedExhibitors = exhibitors.map(e => ({...e, boothId: null}));
    const updatedBooths = booths.map(booth => ({...booth, exhibitorId: null}));
    
    // 获取所有未分配的参展商并按行业分组
    const exhibitorsByIndustry = {};
    updatedExhibitors.forEach(exhibitor => {
      const industry = exhibitor.industry || 'No Industry';
      if (!exhibitorsByIndustry[industry]) {
        exhibitorsByIndustry[industry] = [];
      }
      exhibitorsByIndustry[industry].push(exhibitor);
    });
    
    // 获取所有参展商展位
    const availableBooths = updatedBooths.filter(
      booth => !booth.exhibitorId && booth.type === 'exhibitor'
    );
    
    if (availableBooths.length === 0) {
      alert("No available exhibitor booths. Please add more booths first.");
      return;
    }
    
    let assignedCount = 0;
    
    // 分配参展商到展位
    for (const industry in exhibitorsByIndustry) {
      const industryExhibitors = exhibitorsByIndustry[industry];
      
      for (let i = 0; i < industryExhibitors.length; i++) {
        if (i < availableBooths.length) {
          const exhibitor = industryExhibitors[i];
          const booth = availableBooths[i];
          
          booth.exhibitorId = exhibitor.id;
          exhibitor.boothId = booth.id;
          assignedCount++;
        }
      }
    }
    
    setExhibitors(updatedExhibitors);
    setBooths(updatedBooths);
    
    // 显示分配结果
    const unassignedCount = exhibitors.length - assignedCount;
    if (unassignedCount > 0) {
      alert(`Assigned ${assignedCount} exhibitors to booths. ${unassignedCount} exhibitors could not be assigned due to insufficient booths.`);
    } else {
      alert(`Successfully assigned all ${assignedCount} exhibitors to booths.`);
    }
  };
  
  // 导出CSV
  const exportCSV = () => {
    let csvContent = "Company,Industry,Booth Number\n";
    
    exhibitors.forEach(exhibitor => {
      if (exhibitor.boothId) {
        const booth = booths.find(b => b.id === exhibitor.boothId);
        if (booth) {
          csvContent += `"${exhibitor.name}","${exhibitor.industry || ''}","${booth.number}"\n`;
        }
      } else {
        csvContent += `"${exhibitor.name}","${exhibitor.industry || ''}","Unassigned"\n`;
      }
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Tradeshow_Set.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // 导出PDF
  const exportPDF = () => {
    html2canvas(boardRef.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'pt', [canvas.width, canvas.height]);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('layout.pdf');
    });
  };
  
  // 导入CSV
  const importCSV = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csvData = e.target.result;
      const lines = csvData.split(/\r\n|\n/);
      let importedCount = 0;
      
      // 检查是否有标题行
      const hasHeader = lines[0].toLowerCase().includes('company') || 
                        lines[0].toLowerCase().includes('industry');
      
      const startLine = hasHeader ? 1 : 0;
      
      const newExhibitors = [...exhibitors];
      
      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 简单的CSV解析
        const parts = line.split(',').map(part => part.trim().replace(/^"|"$/g, ''));
        if (parts.length === 0) continue;
        
        const name = parts[0];
        const industry = parts.length > 1 ? parts[1] : '';
        
        if (name && name !== 'Company' && name !== 'Exhibitor') {
          newExhibitors.push({
            id: generateId(),
            name,
            industry,
            boothId: null
          });
          importedCount++;
        }
      }
      
      setExhibitors(newExhibitors);
      alert(`Successfully imported ${importedCount} exhibitors.`);
    };
    
    reader.onerror = () => {
      alert('Error reading file');
    };
    
    reader.readAsText(file);
  };
  
  // 过滤参展商
  const filteredExhibitors = exhibitors.filter(exhibitor => {
    const industryMatch = !filters.industry || exhibitor.industry === filters.industry;
    const searchMatch = !filters.search || 
                       exhibitor.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                       (exhibitor.industry && exhibitor.industry.toLowerCase().includes(filters.search.toLowerCase()));
    return industryMatch && searchMatch;
  });
  
  return (
    <div className="trade-show-planner">
      <Header 
        onReset={resetLayout}
        onSmartArrange={smartArrange}
        onExportCSV={exportCSV}
        onExportPDF={exportPDF}
      />
      
      <div className="app-content">
        <Sidebar>
          <BoothsPanel
            selectedBoothType={selectedBoothType}
            selectedBoothSize={selectedBoothSize}
            onSelectBoothType={setSelectedBoothType}
            onSelectBoothSize={setSelectedBoothSize}
            onAddBooth={addBooth}
          />
          
          <ExhibitorsPanel
            exhibitors={filteredExhibitors}
            industries={industries}
            filters={filters}
            onAddExhibitor={addExhibitor}
            onFilterChange={setFilters}
            onImportCSV={importCSV}
            onAssignExhibitor={assignExhibitorToBooth}
          />
        </Sidebar>
        
        <Canvas 
          ref={boardRef}
          booths={booths}
          exhibitors={exhibitors}
          onMoveBooth={moveBooth}
          onAssignExhibitor={assignExhibitorToBooth}
        />
      </div>
    </div>
  );
};

// 头部组件
const Header = ({ onReset, onSmartArrange, onExportCSV, onExportPDF }) => {
  return (
    <header>
      <strong>Trade Show Planner</strong>
      <div className="row">
        <button onClick={onReset}>Reset Layout</button>
        <button onClick={onSmartArrange}>Smart Arrange</button>
        <button onClick={onExportCSV}>Export CSV</button>
        <button onClick={onExportPDF}>Export PDF</button>
      </div>
    </header>
  );
};

// 侧边栏组件
const Sidebar = ({ children }) => {
  return <aside className="sidebar">{children}</aside>;
};

// 展位面板组件
const BoothsPanel = ({
  selectedBoothType,
  selectedBoothSize,
  onSelectBoothType,
  onSelectBoothSize,
  onAddBooth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="panel-container">
      <button className="navbtn" onClick={() => setIsOpen(!isOpen)}>
        Booths »
      </button>
      
      {isOpen && (
        <div className="panel">
          <h3>Booths</h3>
          
          <div className="booth-type-selector">
            <div 
              className={`booth-type ${selectedBoothType === 'exhibitor' ? 'selected' : ''}`}
              onClick={() => onSelectBoothType('exhibitor')}
            >
              Exhibitor Booth
            </div>
            <div 
              className={`booth-type ${selectedBoothType === 'lounge' ? 'selected' : ''}`}
              onClick={() => onSelectBoothType('lounge')}
            >
              Lounge Area
            </div>
          </div>
          
          <div className="booth-size-selector">
            <div 
              className={`booth-size ${selectedBoothSize === 'small' ? 'selected' : ''}`}
              onClick={() => onSelectBoothSize('small')}
            >
              3x3m
            </div>
            <div 
              className={`booth-size ${selectedBoothSize === 'large' ? 'selected' : ''}`}
              onClick={() => onSelectBoothSize('large')}
            >
              6x3m
            </div>
          </div>
          
          <div className="row" style={{ marginTop: '8px' }}>
            <button className="primary" onClick={onAddBooth}>
              Add Booth »
            </button>
            <div className="hint">
              <span style={{ fontSize: '18px' }}>ℹ️</span>
              <span className="hint-text">
                Click "Add Booth" and then click on canvas to place it
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 参展商面板组件
const ExhibitorsPanel = ({
  exhibitors,
  industries,
  filters,
  onAddExhibitor,
  onFilterChange,
  onImportCSV,
  onAssignExhibitor
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const fileInputRef = useRef(null);
  
  const handleAddExhibitor = () => {
    if (name.trim()) {
      onAddExhibitor(name, industry);
      setName('');
      setIndustry('');
    }
  };
  
  const handleFileSelect = (e) => {
    if (e.target.files.length) {
      onImportCSV(e.target.files[0]);
      e.target.value = ''; // 重置文件输入
    }
  };
  
  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };
  
  const clearFilters = () => {
    onFilterChange({ industry: '', search: '' });
  };
  
  return (
    <div className="panel-container">
      <button className="navbtn" onClick={() => setIsOpen(!isOpen)}>
        Exhibitors »
      </button>
      
      {isOpen && (
        <div className="panel">
          <h3>Exhibitors</h3>
          
          <input
            type="text"
            className="search-box"
            placeholder="Search exhibitors..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <div className="row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company Name"
            />
          </div>
          <div className="row">
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Industry"
            />
          </div>
          <button onClick={handleAddExhibitor}>Add Exhibitor</button>
          
          {/* 筛选器 */}
          <div className="filters">
            <h4>Filters</h4>
            <div className="filter-row">
              <div className="filter-label">Industry:</div>
              <select
                value={filters.industry}
                onChange={(e) => handleFilterChange('industry', e.target.value)}
              >
                <option value="">All Industries</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-buttons">
              <button onClick={clearFilters}>Clear Filters</button>
            </div>
          </div>
          
          <div className="exhibitor-list" style={{ marginTop: '8px' }}>
            {exhibitors.map((exhibitor) => (
              <ExhibitorBadge
                key={exhibitor.id}
                exhibitor={exhibitor}
                isAssigned={!!exhibitor.boothId}
                onAssign={onAssignExhibitor}
              />
            ))}
          </div>
          
          <div className="small hint" style={{ marginTop: '6px' }}>
            Drag an exhibitor badge onto a booth to assign
            <span className="hint-text">
              Drag exhibitor names to booths to assign placement
            </span>
          </div>
          
          {/* CSV Import */}
          <div className="csv-import">
            <h4>Import Exhibitors from CSV</h4>
            <div className="small">
              CSV format: Company,Industry (WITHOUT header row)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept=".csv"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="csvFile"
              className="file-label"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose CSV File
            </label>
            <button onClick={() => fileInputRef.current?.click()}>
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 参展商标签组件
const ExhibitorBadge = ({ exhibitor, isAssigned, onAssign }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', exhibitor.id);
  };
  
  return (
    <div
      className={`badge ${isAssigned ? 'assigned' : ''}`}
      draggable
      onDragStart={handleDragStart}
      data-id={exhibitor.id}
    >
      <span className="company-name">{exhibitor.name}</span>
      <span className="company-info">
        {exhibitor.industry || 'No industry specified'}
      </span>
    </div>
  );
};

// 画布组件
const Canvas = React.forwardRef(({ booths, exhibitors, onMoveBooth, onAssignExhibitor }, ref) => {
  const handleDrop = (e) => {
    e.preventDefault();
    const exhibitorId = e.dataTransfer.getData('text/plain');
    const boothId = e.target.dataset.id;
    
    if (boothId && exhibitorId) {
      onAssignExhibitor(exhibitorId, boothId);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  return (
    <section className="canvas-wrap">
      <div className="scroll">
        <div
          ref={ref}
          id="board"
          aria-label="floor canvas"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {booths.map((booth) => (
            <Booth
              key={booth.id}
              booth={booth}
              exhibitor={exhibitors.find(e => e.id === booth.exhibitorId)}
              onMove={onMoveBooth}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

// 展位组件
const Booth = ({ booth, exhibitor, onMove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setOffset({ x: parseInt(booth.x), y: parseInt(booth.y) });
    e.preventDefault();
    e.stopPropagation();
  };
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const board = document.getElementById('board');
      if (!board) return;
      
      const nx = Math.max(0, Math.min(
        board.clientWidth - booth.width,
        offset.x + e.clientX - startPos.x
      ));
      
      const ny = Math.max(0, Math.min(
        board.clientHeight - booth.height,
        offset.y + e.clientY - startPos.y
      ));
      
      onMove(booth.id, nx, ny);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, offset, booth, onMove]);
  
  return (
    <div
      className={`booth ${booth.type} ${exhibitor ? 'assigned' : ''}`}
      style={{
        left: booth.x + 'px',
        top: booth.y + 'px',
        width: booth.width + 'px',
        height: booth.height + 'px'
      }}
      data-id={booth.id}
      onMouseDown={handleMouseDown}
    >
      <div className="booth-number" style={{ color: exhibitor ? '#1976d2' : '' }}>
        {booth.number}
      </div>
      <div className="booth-info">
        {booth.size === 'small' ? '3x3m' : '6x3m'} | {booth.type === 'exhibitor' ? 'Exhibitor' : 'Lounge'}
      </div>
      {exhibitor && (
        <div className="booth-exhibitor">
          {exhibitor.name}
        </div>
      )}
    </div>
  );
};

export default TradeShowPlanner;