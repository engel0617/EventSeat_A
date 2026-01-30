import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Table, Guest, TableShape, Seat } from './types';
import { GuestSidebar } from './components/GuestSidebar';
import { SeatingCanvas } from './components/SeatingCanvas';
import { AutoAssignModal } from './components/AutoAssignModal';
import { SettingsModal } from './components/SettingsModal';
import { Button } from './components/Button';
import { Plus, Download, RotateCcw, Layout, Armchair, Trash, Settings2, Sparkles, ArrowRight, Printer, UploadCloud, RotateCw, Scaling, FileSpreadsheet, Type } from 'lucide-react';

// Utility for safe IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  // State
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); // Lifted state for search
  const importFileRef = useRef<HTMLInputElement>(null);
  
  // Settings State
  const [mainTableRatio, setMainTableRatio] = useState(20);
  const [defaultRoundSeats, setDefaultRoundSeats] = useState(8);
  const [defaultRectSeats, setDefaultRectSeats] = useState(6);
  const [defaultFontSize, setDefaultFontSize] = useState(14);
  const [nameDisplayMode, setNameDisplayMode] = useState<'surname' | 'full'>('surname'); // New state for name display
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Modals
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);

  // Initialize with example data
  useEffect(() => {
    setTables([
      {
        id: 't1',
        label: '主桌',
        x: 400,
        y: 300,
        shape: TableShape.ROUND,
        radius: 80, // Slightly larger for main example
        rotation: 0,
        fontSize: 16,
        seats: Array.from({ length: 10 }, (_, i) => ({ id: `t1-${i}`, index: i, guestId: null }))
      },
      {
        id: 't2',
        label: '親友桌',
        x: 200,
        y: 450,
        shape: TableShape.ROUND,
        radius: 60,
        rotation: 0,
        fontSize: 14,
        seats: Array.from({ length: 8 }, (_, i) => ({ id: `t2-${i}`, index: i, guestId: null }))
      }
    ]);
    
    setGuests([
        { id: 'g1', name: '王大明', category: '男方親友', rsvpStatus: 'confirmed', tags: ['素食'], relationships: ['Avoid:陳小美'], assignedSeatId: null },
        { id: 'g2', name: '陳小美', category: '女方親友', rsvpStatus: 'confirmed', tags: ['伴娘'], relationships: ['Avoid:王大明'], assignedSeatId: null },
        { id: 'g3', name: '林董事長', category: '貴賓', rsvpStatus: 'pending', tags: ['VIP'], relationships: [], assignedSeatId: null },
        { id: 'g4', name: '張三', category: '公司同事', rsvpStatus: 'confirmed', tags: [], relationships: [], assignedSeatId: null },
        { id: 'g5', name: '李四', category: '公司同事', rsvpStatus: 'confirmed', tags: [], relationships: [], assignedSeatId: null },
        { id: 'g6', name: '王五', category: '公司同事', rsvpStatus: 'confirmed', tags: [], relationships: [], assignedSeatId: null },
    ]);
  }, []);

  // Handlers
  const handleAddTable = (shape: TableShape) => {
    const id = generateId();
    const seatCount = shape === TableShape.ROUND ? defaultRoundSeats : defaultRectSeats;
    
    // Find a non-overlapping position using spiral search
    let cx = 400; // Center reference
    let cy = 350;
    let x = cx;
    let y = cy;
    const minDistance = 180; // Safe distance between tables (approx diameter + gap)

    const isOverlapping = (checkX: number, checkY: number) => {
      return tables.some(t => {
        const dist = Math.sqrt(Math.pow(t.x - checkX, 2) + Math.pow(t.y - checkY, 2));
        return dist < minDistance;
      });
    };

    if (isOverlapping(x, y)) {
       let angle = 0;
       let radius = 50;
       const maxIter = 2500; // Increased to prevent overlap after many tables
       
       for(let i = 0; i < maxIter; i++) {
          x = cx + radius * Math.cos(angle);
          y = cy + radius * Math.sin(angle);
          if (!isOverlapping(x, y)) {
             break;
          }
          angle += 0.5; // ~28 degrees
          radius += 4; // Expand radius faster
       }
    }

    const newTable: Table = {
      id,
      label: `第 ${tables.length + 1} 桌`,
      x, 
      y,
      shape,
      radius: shape === TableShape.ROUND ? 60 : undefined,
      width: shape === TableShape.RECTANGLE ? 140 : undefined,
      height: shape === TableShape.RECTANGLE ? 80 : undefined,
      rotation: 0,
      fontSize: defaultFontSize,
      seats: Array.from({ length: seatCount }, (_, i) => ({ id: `${id}-${i}`, index: i, guestId: null }))
    };
    setTables([...tables, newTable]);
    setActiveTableId(id);
  };

  const handleUpdateTablePos = useCallback((id: string, x: number, y: number) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
  }, []);

  const assignGuestToSeat = useCallback((guestId: string, tableId: string, seatIndex: number) => {
    setTables(prevTables => {
        const targetTable = prevTables.find(t => t.id === tableId);
        if (!targetTable) return prevTables;
        const targetSeat = targetTable.seats.find(s => s.index === seatIndex);
        const existingGuestIdAtSeat = targetSeat?.guestId;

        const sourceSeatInfo = (() => {
            for (const t of prevTables) {
                const s = t.seats.find(s => s.guestId === guestId);
                if (s) return { tableId: t.id, seatIndex: s.index };
            }
            return null;
        })();

        return prevTables.map(table => {
             let newSeats = [...table.seats];
             if (sourceSeatInfo && table.id === sourceSeatInfo.tableId) {
                 newSeats = newSeats.map(s => s.index === sourceSeatInfo.seatIndex ? { ...s, guestId: existingGuestIdAtSeat || null } : s);
             }
             if (table.id === tableId) {
                 newSeats = newSeats.map(s => s.index === seatIndex ? { ...s, guestId: guestId } : s);
             }
             if (sourceSeatInfo && table.id === sourceSeatInfo.tableId && table.id !== tableId) {
                 newSeats = newSeats.map(s => s.index === sourceSeatInfo.seatIndex ? { ...s, guestId: existingGuestIdAtSeat || null } : s);
             }
             return { ...table, seats: newSeats };
        });
    });

    setGuests(prevGuests => {
        const targetTable = tables.find(t => t.id === tableId);
        const targetSeat = targetTable?.seats.find(s => s.index === seatIndex);
        const existingGuestIdAtSeat = targetSeat?.guestId;

        return prevGuests.map(g => {
            if (g.id === guestId) return { ...g, assignedSeatId: `${tableId}-${seatIndex}` };
            if (existingGuestIdAtSeat && g.id === existingGuestIdAtSeat) {
                 const sourceSeatInfo = (() => {
                    for (const t of tables) {
                        const s = t.seats.find(s => s.guestId === guestId);
                        if (s) return { tableId: t.id, seatIndex: s.index };
                    }
                    return null;
                })();
                return { ...g, assignedSeatId: sourceSeatInfo ? `${sourceSeatInfo.tableId}-${sourceSeatInfo.seatIndex}` : null };
            }
            return g;
        });
    });
  }, [tables]);

  const handleGuestDrop = useCallback((guestId: string, tableId: string, seatIndex?: number) => {
      const table = tables.find(t => t.id === tableId);
      if(!table) return;
      if (typeof seatIndex === 'number') {
          assignGuestToSeat(guestId, tableId, seatIndex);
      } else {
          const emptySeat = table.seats.find(s => !s.guestId);
          if (emptySeat) assignGuestToSeat(guestId, tableId, emptySeat.index);
      }
  }, [tables, assignGuestToSeat]);

  const handleSeatClick = useCallback((tableId: string, seatIndex: number) => {
    if (selectedGuestId) {
      assignGuestToSeat(selectedGuestId, tableId, seatIndex);
      setSelectedGuestId(null); 
    }
  }, [selectedGuestId, assignGuestToSeat]);

  const handleAutoAssignApply = (assignments: { guestId: string, tableId: string, seatIndex: number }[]) => {
      let newTables = [...tables];
      let newGuests = [...guests];
      assignments.forEach(a => {
          newTables = newTables.map(t => t.id !== a.tableId ? t : {
              ...t, seats: t.seats.map(s => s.index === a.seatIndex ? { ...s, guestId: a.guestId } : s)
          });
          newGuests = newGuests.map(g => g.id === a.guestId ? { ...g, assignedSeatId: `${a.tableId}-${a.seatIndex}` } : g);
      });
      setTables(newTables);
      setGuests(newGuests);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ tables, guests }, null, 2));
    const a = document.createElement('a');
    a.href = dataStr; a.download = `event-seating-${new Date().toISOString().split('T')[0]}.json`; a.click();
  };

  const handleExportCSV = () => {
    const headers = ['姓名', '分類', 'RSVP', '標籤', '避嫌', '桌號'];
    const rsvpMap: Record<string, string> = {
        'confirmed': '已確認',
        'pending': '未定',
        'declined': '無法出席'
    };

    const rows = guests.map(g => {
        const tableId = g.assignedSeatId ? g.assignedSeatId.split('-')[0] : null;
        const table = tableId ? tables.find(t => t.id === tableId) : null;
        const tableName = table ? table.label : '';
        
        const avoid = g.relationships
            .filter(r => r.startsWith('Avoid:'))
            .map(r => r.replace('Avoid:', ''))
            .join('; ');

        return [
            g.name,
            g.category,
            rsvpMap[g.rsvpStatus] || g.rsvpStatus,
            g.tags.join(', '),
            avoid,
            tableName
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','); // Escape quotes
    });

    // Remove BOM for standard UTF-8
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guest-list-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.tables && json.guests) {
          setTables(json.tables);
          setGuests(json.guests);
          setActiveTableId(null);
          setSelectedGuestId(null);
        } else {
          alert("不正確的檔案格式");
        }
      } catch (err) {
        alert("讀取檔案失敗");
      }
    };
    reader.readAsText(file);
    if(importFileRef.current) importFileRef.current.value = "";
  };

  const handlePrint = () => {
    window.print();
  };

  const activeTable = tables.find(t => t.id === activeTableId);
  const selectedGuest = guests.find(g => g.id === selectedGuestId);

  // Calculate dynamic radius for main table based on settings
  const standardRadius = 60;
  const bigTableRadius = standardRadius * (1 + mainTableRatio / 100);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50">
      <style>{`
        @media print {
          header, aside, .no-print, .properties-panel, .toolbar, .toast {
            display: none !important;
          }
          main {
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            background: white !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Layout className="w-5 h-5" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-800">EventSeatPro</h1>
                <p className="text-xs text-slate-500">專業座位表製作</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsSettingsOpen(true)} icon={<Settings2 className="w-4 h-4" />}>基本設定</Button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <input type="file" ref={importFileRef} onChange={handleImport} accept=".json" className="hidden" />
            <Button variant="ghost" onClick={() => importFileRef.current?.click()} icon={<UploadCloud className="w-4 h-4" />}>匯入專案</Button>
            <Button variant="ghost" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>列印</Button>
            <Button variant="ghost" onClick={() => { if(window.confirm('確定清除?')) { setTables([]); setGuests([]); }}} icon={<RotateCcw className="w-4 h-4" />}>重置</Button>
            <Button variant="secondary" onClick={handleExportCSV} icon={<FileSpreadsheet className="w-4 h-4" />}>匯出名單 (CSV)</Button>
            <Button variant="secondary" onClick={handleExportJSON} icon={<Download className="w-4 h-4" />}>匯出 JSON</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="no-print">
          <GuestSidebar 
            guests={guests} 
            tables={tables}
            onAddGuest={(g) => setGuests(prev => [...prev, {id: generateId(), ...g, assignedSeatId: null}])}
            onRemoveGuest={(id) => {
              setGuests(guests.filter(g => g.id !== id));
              setTables(prev => prev.map(t => ({ ...t, seats: t.seats.map(s => s.guestId === id ? { ...s, guestId: null } : s) })));
            }}
            onSelectGuest={setSelectedGuestId}
            selectedGuestId={selectedGuestId}
            onBulkAddGuests={(ng) => setGuests(prev => [...prev, ...ng.map((g:any) => ({id: generateId(), ...g, assignedSeatId: null} as Guest))])}
            onUpdateGuest={(id, u) => setGuests(prev => prev.map(g => g.id === id ? { ...g, ...u } : g))}
            activeFilterTag={activeFilterTag}
            onSetFilterTag={setActiveFilterTag}
            activeFilterCategory={activeFilterCategory}
            onSetFilterCategory={setActiveFilterCategory}
            onOpenAutoAssign={() => setIsAutoAssignOpen(true)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 relative flex flex-col">
          {/* Toolbar */}
          <div className="toolbar absolute top-4 left-4 right-4 z-10 flex justify-center pointer-events-none no-print">
            <div className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 flex gap-2 pointer-events-auto">
              <Button size="sm" variant="secondary" onClick={() => handleAddTable(TableShape.ROUND)}>
                <div className="w-4 h-4 rounded-full border-2 border-slate-400 mr-2"></div>
                圓桌
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleAddTable(TableShape.RECTANGLE)}>
                 <div className="w-4 h-3 border-2 border-slate-400 mr-2"></div>
                長桌
              </Button>
            </div>
          </div>

          {/* Properties Panel */}
          {activeTable && (
               <div className="properties-panel absolute top-4 right-4 z-10 w-64 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-4 pointer-events-auto transition-all no-print">
                   <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold text-slate-700 flex items-center gap-2"><Settings2 className="w-4 h-4" /> 桌次設定</h3>
                       <button onClick={() => setActiveTableId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                   </div>
                   <div className="space-y-4">
                       <div>
                           <label className="text-xs text-slate-500 block mb-1">名稱</label>
                           <input 
                              value={activeTable.label} 
                              onChange={(e) => setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, label: e.target.value} : t))} 
                              className="w-full px-2 py-1.5 border border-slate-200 bg-slate-50 rounded-md text-sm outline-none focus:border-indigo-500" 
                           />
                       </div>

                       {/* Font Size Control */}
                       <div>
                           <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><Type className="w-3 h-3"/> 字體大小</label>
                           <div className="flex items-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => {
                                  setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, fontSize: Math.max(10, (t.fontSize || 14) - 1)} : t));
                              }}>-</Button>
                              <span className="flex-1 text-center text-sm font-medium">{activeTable.fontSize || 14}px</span>
                              <Button size="sm" variant="secondary" onClick={() => {
                                  setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, fontSize: Math.min(32, (t.fontSize || 14) + 1)} : t));
                              }}>+</Button>
                           </div>
                       </div>

                       {/* Round Table Options */}
                       {activeTable.shape === TableShape.ROUND && (
                          <div>
                            <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><Scaling className="w-3 h-3"/> 尺寸設定</label>
                            <div className="flex gap-2">
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  className={`flex-1 border transition-all ${activeTable.radius === standardRadius ? 'bg-indigo-100 border-indigo-600 text-indigo-900 font-bold ring-1 ring-indigo-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                  onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, radius: standardRadius} : t))}
                                >
                                  標準桌
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="ghost"
                                  className={`flex-1 border transition-all ${activeTable.radius && Math.abs(activeTable.radius - bigTableRadius) < 1 ? 'bg-indigo-100 border-indigo-600 text-indigo-900 font-bold ring-1 ring-indigo-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                  onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, radius: bigTableRadius} : t))}
                                >
                                  大主桌 (+{mainTableRatio}%)
                                </Button>
                            </div>
                          </div>
                       )}

                       {/* Rectangle Table Options (Rotation) */}
                       {activeTable.shape === TableShape.RECTANGLE && (
                          <div>
                             <label className="text-xs text-slate-500 block mb-1 flex items-center gap-1"><RotateCw className="w-3 h-3"/> 旋轉角度</label>
                             <div className="flex gap-2">
                                {[0, 45, 90, 135].map(deg => (
                                    <Button 
                                      key={deg}
                                      size="sm"
                                      variant="ghost"
                                      className={`flex-1 border transition-all ${(!activeTable.rotation && deg === 0) || activeTable.rotation === deg ? 'bg-indigo-100 border-indigo-600 text-indigo-900 font-bold ring-1 ring-indigo-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                      onClick={() => setTables(prev => prev.map(t => t.id === activeTable.id ? {...t, rotation: deg} : t))}
                                    >
                                      {deg}°
                                    </Button>
                                ))}
                             </div>
                          </div>
                       )}

                       <div>
                          <label className="text-xs text-slate-500 block mb-1">座位數: {activeTable.seats.length}</label>
                          <div className="flex items-center gap-2">
                              <Button size="sm" variant="secondary" onClick={() => {
                                  if(activeTable.seats.length <= 1) return;
                                  setTables(prev => prev.map(t => {
                                      if(t.id !== activeTableId) return t;
                                      const lastSeat = t.seats[t.seats.length - 1];
                                      if(lastSeat.guestId) setGuests(gs => gs.map(g => g.id === lastSeat.guestId ? { ...g, assignedSeatId: null } : g));
                                      return { ...t, seats: t.seats.slice(0, -1) };
                                  }));
                              }}>-</Button>
                              <span className="flex-1 text-center text-sm font-medium">{activeTable.seats.length}</span>
                              <Button size="sm" variant="secondary" onClick={() => {
                                  setTables(prev => prev.map(t => {
                                      if(t.id !== activeTableId) return t;
                                      return { ...t, seats: [...t.seats, { id: `${t.id}-${t.seats.length}`, index: t.seats.length, guestId: null }] };
                                  }));
                              }}>+</Button>
                          </div>
                       </div>
                       <Button variant="danger" size="sm" className="w-full" onClick={() => {
                            setTables(prev => prev.filter(t => t.id !== activeTableId));
                            setGuests(prev => prev.map(g => g.assignedSeatId?.startsWith(activeTableId) ? { ...g, assignedSeatId: null } : g));
                            setActiveTableId(null);
                       }} icon={<Trash className="w-4 h-4"/>}>刪除此桌</Button>
                   </div>
               </div>
          )}

          <div className="flex-1 w-full h-full">
            <SeatingCanvas 
              tables={tables} 
              guests={guests}
              onTableUpdate={handleUpdateTablePos}
              onSeatClick={handleSeatClick}
              selectedGuestId={selectedGuestId}
              onTableSelect={setActiveTableId}
              activeTableId={activeTableId}
              onGuestDrop={handleGuestDrop}
              activeFilterTag={activeFilterTag}
              activeFilterCategory={activeFilterCategory}
              searchTerm={searchTerm}
              nameDisplayMode={nameDisplayMode}
            />
          </div>
        </main>
      </div>
      
      {/* Toast */}
      {selectedGuestId && (
        <div className="toast absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 pointer-events-none no-print">
          <Armchair className="w-5 h-5" />
          <span className="font-medium">請點擊座位以安排: {guests.find(g => g.id === selectedGuestId)?.name}</span>
          <button onClick={() => setSelectedGuestId(null)} className="ml-2 bg-indigo-700 hover:bg-indigo-800 rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs pointer-events-auto">✕</button>
        </div>
      )}

      {/* Auto Assign Modal */}
      <AutoAssignModal isOpen={isAutoAssignOpen} onClose={() => setIsAutoAssignOpen(false)} tables={tables} guests={guests} onApply={handleAutoAssignApply} />
      
      {/* Global Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        mainTableRatio={mainTableRatio}
        setMainTableRatio={setMainTableRatio}
        defaultRoundSeats={defaultRoundSeats}
        setDefaultRoundSeats={setDefaultRoundSeats}
        defaultRectSeats={defaultRectSeats}
        setDefaultRectSeats={setDefaultRectSeats}
        defaultFontSize={defaultFontSize}
        setDefaultFontSize={setDefaultFontSize}
        nameDisplayMode={nameDisplayMode}
        setNameDisplayMode={setNameDisplayMode}
      />
    </div>
  );
}

export default App;