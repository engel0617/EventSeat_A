import React, { useState, useRef, useMemo } from 'react';
import { Guest, RsvpStatus, Table } from '../types';
import { Button } from './Button';
import { generateGuestList } from '../services/geminiService';
import { Users, UserPlus, Sparkles, Search, Trash2, Upload, AlertCircle, CheckCircle2, XCircle, HelpCircle, FileSpreadsheet, User, Filter, GripVertical, Zap, Download, Key, ShieldAlert, Layers } from 'lucide-react';
import Papa from 'papaparse';

interface GuestSidebarProps {
  guests: Guest[];
  tables: Table[];
  onAddGuest: (guest: Omit<Guest, 'id' | 'assignedSeatId'>) => void;
  onRemoveGuest: (id: string) => void;
  onSelectGuest: (id: string | null) => void;
  selectedGuestId: string | null;
  onBulkAddGuests: (guests: Partial<Guest>[]) => void;
  onUpdateGuest: (id: string, updates: Partial<Guest>) => void;
  activeFilterTag: string | null;
  onSetFilterTag: (tag: string | null) => void;
  activeFilterCategory: string | null;
  onSetFilterCategory: (category: string | null) => void;
  onOpenAutoAssign: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const GuestSidebar: React.FC<GuestSidebarProps> = ({
  guests,
  tables,
  onAddGuest,
  onRemoveGuest,
  onSelectGuest,
  selectedGuestId,
  onBulkAddGuests,
  onUpdateGuest,
  activeFilterTag,
  onSetFilterTag,
  activeFilterCategory,
  onSetFilterCategory,
  onOpenAutoAssign,
  searchTerm,
  onSearchChange
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'import'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'confirmed' | 'pending' | 'unassigned'>('all');

  // New Guest Form
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestCategory, setNewGuestCategory] = useState('一般賓客');
  const [newGuestTags, setNewGuestTags] = useState(''); // Comma separated
  const [newGuestAvoid, setNewGuestAvoid] = useState(''); // Relationship: Avoid

  // AI
  const [isGenerating, setIsGenerating] = useState(false);
  const [eventDesc, setEventDesc] = useState('一場溫馨的婚禮');
  const [guestCount, setGuestCount] = useState(10);
  const [apiKey, setApiKey] = useState('');

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  // Statistics
  const totalSeats = tables.reduce((acc, t) => acc + t.seats.length, 0);
  const assignedSeats = tables.reduce((acc, t) => acc + t.seats.filter(s => s.guestId).length, 0);

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvpStatus === 'confirmed').length,
    // "Waiting" means guests who are not declined AND not seated yet.
    // This combines "Pending RSVP" guests and "Confirmed but Unassigned" guests.
    // Guests who are "Seated" are considered "Arranged" regardless of RSVP, so they don't show up here.
    waiting: guests.filter(g => !g.assignedSeatId && g.rsvpStatus !== 'declined').length,
    assigned: assignedSeats,
    empty: totalSeats - assignedSeats
  };

  // Collect all unique tags for filter pills
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    guests.forEach(g => g.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [guests]);

  // Collect all unique categories for filter pills
  const allCategories = useMemo(() => {
    return Array.from(new Set(guests.map(g => g.category))).filter(Boolean);
  }, [guests]);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGuestName.trim()) {
      const relationships = [];
      if (newGuestAvoid.trim()) {
        relationships.push(`Avoid:${newGuestAvoid.trim()}`);
      }

      onAddGuest({ 
        name: newGuestName, 
        category: newGuestCategory,
        tags: newGuestTags.split(',').map(t => t.trim()).filter(Boolean),
        rsvpStatus: 'pending',
        relationships: relationships
      });
      setNewGuestName('');
      setNewGuestTags('');
      setNewGuestAvoid('');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateGuestList(eventDesc, guestCount, apiKey);
      // Augment AI data with defaults
      const augmented = generated.map(g => ({
        ...g,
        rsvpStatus: 'pending' as RsvpStatus,
        tags: [],
        relationships: []
      }));
      onBulkAddGuests(augmented);
      setActiveTab('list');
    } catch (e: any) {
      alert("AI 生成失敗: " + (e.message || "未知錯誤"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadSample = () => {
    // Standard UTF-8
    const csvContent = "姓名,分類,RSVP,標籤,避嫌\n王大明,男方親友,已確認,\"素食, VIP\",陳小美\n陳小美,女方親友,未定,伴娘,王大明\n張三,公司同事,已確認,,";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "guest_list_sample.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data as any[];
        // Expected columns: Name, Category, RSVP, Tags, Avoid
        const parsedGuests = rawData.map(row => {
          const relationships = [];
          const avoidTarget = row['Avoid'] || row['避嫌'] || row['Relationships'];
          if (avoidTarget && typeof avoidTarget === 'string' && avoidTarget.trim()) {
             relationships.push(`Avoid:${avoidTarget.trim()}`);
          }

          return {
            name: row['Name'] || row['姓名'] || 'Unknown',
            category: row['Category'] || row['分類'] || 'Uncategorized',
            rsvpStatus: (row['RSVP'] === 'confirmed' || row['RSVP'] === '已確認') ? 'confirmed' : 'pending',
            tags: (row['Tags'] || row['標籤'] || '').split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
            relationships: relationships
          };
        });

        // Check duplicates
        const existingNames = new Set(guests.map(g => g.name));
        const foundDuplicates = parsedGuests
          .filter(g => existingNames.has(g.name))
          .map(g => g.name);

        setDuplicates(foundDuplicates);
        setImportPreview(parsedGuests);
      }
    });
  };

  const confirmImport = () => {
    const finalImport = importPreview.filter(g => !duplicates.includes(g.name) || confirm(`允許重複匯入 ${g.name}?`));
    
    if (finalImport.length > 0) {
      onBulkAddGuests(finalImport.map(g => ({
        ...g,
        rsvpStatus: g.rsvpStatus as RsvpStatus,
        // relationships already parsed
      })));
      setImportPreview([]);
      setDuplicates([]);
      setActiveTab('list');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          g.category.includes(searchTerm) ||
                          g.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesMode = true;
    if (filterMode === 'confirmed') matchesMode = g.rsvpStatus === 'confirmed';
    else if (filterMode === 'pending') matchesMode = g.rsvpStatus === 'pending';
    else if (filterMode === 'unassigned') matchesMode = !g.assignedSeatId && g.rsvpStatus !== 'declined';

    return matchesSearch && matchesMode;
  });

  const getRsvpIcon = (status: RsvpStatus) => {
    switch (status) {
      case 'confirmed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'declined': return <XCircle className="w-4 h-4 text-slate-300" />;
      default: return <HelpCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const toggleRsvp = (e: React.MouseEvent, guest: Guest) => {
    e.stopPropagation();
    const next: Record<RsvpStatus, RsvpStatus> = {
      'pending': 'confirmed',
      'confirmed': 'declined',
      'declined': 'pending'
    };
    onUpdateGuest(guest.id, { rsvpStatus: next[guest.rsvpStatus] });
  };

  const handleDragStart = (e: React.DragEvent, guestId: string) => {
    e.dataTransfer.setData('guestId', guestId);
    e.dataTransfer.effectAllowed = 'move';
    // Create a drag image if needed, or default browser ghost
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 shadow-xl w-96 z-20">
      {/* Header Stats */}
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          賓客資料中心
        </h2>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white p-2 rounded border border-slate-200 text-center">
            <div className="text-xs text-slate-500">總人數</div>
            <div className="font-bold text-slate-700">{stats.total}</div>
          </div>
          <div className="bg-emerald-50 p-2 rounded border border-emerald-100 text-center">
            <div className="text-xs text-emerald-600">已確認</div>
            <div className="font-bold text-emerald-700">{stats.confirmed}</div>
          </div>
          <div className="bg-amber-50 p-2 rounded border border-amber-100 text-center">
            <div className="text-xs text-amber-600">未定/待排</div>
            <div className="font-bold text-amber-700">{stats.waiting}</div>
          </div>
        </div>
        
        {/* Seat Stats */}
        <div className="grid grid-cols-2 gap-2 mt-2">
           <div className="bg-indigo-50 p-2 rounded border border-indigo-100 text-center">
             <div className="text-xs text-indigo-600">已安排座位</div>
             <div className="font-bold text-indigo-700">{stats.assigned}</div>
           </div>
           <div className="bg-slate-100 p-2 rounded border border-slate-200 text-center">
             <div className="text-xs text-slate-500">剩餘空位</div>
             <div className="font-bold text-slate-700">{stats.empty}</div>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'list' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}`}>列表</button>
        <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'add' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}`}>新增/AI</button>
        <button onClick={() => setActiveTab('import')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700'}`}>匯入</button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'list' && (
          <>
            {/* Search & Filter Bar */}
            <div className="p-3 border-b border-slate-100 space-y-2 bg-white">
              <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜尋..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    onClick={onOpenAutoAssign} 
                    className="shrink-0 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white border-none shadow-sm"
                    title="智慧自動排位"
                  >
                     <Zap className="w-4 h-4" />
                  </Button>
              </div>
              
              {/* Filter Mode Buttons */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scroll">
                <button onClick={() => setFilterMode('all')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border ${filterMode === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>全部</button>
                <button onClick={() => setFilterMode('confirmed')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border ${filterMode === 'confirmed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>已確認</button>
                <button onClick={() => setFilterMode('pending')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border ${filterMode === 'pending' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'}`}>未定</button>
                <button onClick={() => setFilterMode('unassigned')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border ${filterMode === 'unassigned' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-600 border-slate-200'}`}>未安排</button>
              </div>

              {/* Tag Filters (Visual Highlight) */}
              {allTags.length > 0 && (
                  <div className="flex gap-2 items-center overflow-x-auto pb-2 no-scroll border-t border-slate-50 pt-2">
                     <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                     {allTags.map(tag => (
                         <button
                            key={tag}
                            onClick={() => onSetFilterTag(activeFilterTag === tag ? null : tag)}
                            className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] border transition-colors
                                ${activeFilterTag === tag ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                            `}
                         >
                             {tag}
                         </button>
                     ))}
                  </div>
              )}

              {/* Category Filters (Visual Highlight) */}
              {allCategories.length > 0 && (
                  <div className="flex gap-2 items-center overflow-x-auto pb-2 no-scroll border-t border-slate-50 pt-2">
                     <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                     {allCategories.map(cat => (
                         <button
                            key={cat}
                            onClick={() => onSetFilterCategory(activeFilterCategory === cat ? null : cat)}
                            className={`whitespace-nowrap px-2 py-0.5 rounded text-[10px] border transition-colors
                                ${activeFilterCategory === cat ? 'bg-blue-100 text-blue-700 border-blue-300 ring-1 ring-blue-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}
                            `}
                         >
                             {cat}
                         </button>
                     ))}
                  </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredGuests.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <User className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                  沒有符合條件的賓客
                </div>
              ) : (
                filteredGuests.map(guest => {
                  const assignedTable = guest.assignedSeatId 
                    ? tables.find(t => t.id === guest.assignedSeatId?.split('-')[0]) 
                    : null;

                  const isDimmed = (activeFilterTag && !guest.tags.includes(activeFilterTag)) || 
                                   (activeFilterCategory && guest.category !== activeFilterCategory);
                  
                  return (
                    <div
                      key={guest.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, guest.id)}
                      onClick={() => onSelectGuest(guest.id === selectedGuestId ? null : guest.id)}
                      className={`
                        group relative p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing
                        ${guest.assignedSeatId 
                           ? 'bg-emerald-50 border-emerald-200 shadow-sm opacity-90' 
                           : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                        }
                        ${selectedGuestId === guest.id ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 !opacity-100' : ''}
                        ${guest.rsvpStatus === 'declined' ? 'opacity-50 grayscale' : ''}
                        ${isDimmed ? 'opacity-20' : ''}
                      `}
                    >
                      {/* Drag Handle Indicator */}
                      <div className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Added pr-8 to prevent overlap with absolute trash icon */}
                      <div className="flex justify-between items-start pl-4 pr-8">
                          <div className="flex items-start gap-3 w-full">
                              <div className={`
                                  w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                                  ${guest.category.includes('男') ? 'bg-blue-100 text-blue-700' : 
                                    guest.category.includes('女') ? 'bg-pink-100 text-pink-700' : 'bg-slate-200 text-slate-600'}
                              `}>
                                  {guest.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                      {guest.name}
                                      {assignedTable && (
                                        <span className="shrink-0 text-[10px] font-medium text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-100">
                                          {assignedTable.label}
                                        </span>
                                      )}
                                      <button 
                                          onClick={(e) => toggleRsvp(e, guest)}
                                          className="hover:scale-110 transition-transform ml-auto"
                                          title={`RSVP: ${guest.rsvpStatus} (點擊切換)`}
                                      >
                                          {getRsvpIcon(guest.rsvpStatus)}
                                      </button>
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5">{guest.category}</div>
                                  
                                  {/* Tags */}
                                  {guest.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                          {guest.tags.map(tag => (
                                              <span key={tag} className={`px-1.5 py-0.5 rounded text-[10px] border
                                                  ${activeFilterTag === tag ? 'bg-yellow-200 text-yellow-800 border-yellow-300 font-bold' : 'bg-slate-100 text-slate-600 border-slate-200'}
                                              `}>
                                                  {tag}
                                              </span>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>
                          
                          {/* Actions */}
                          {selectedGuestId !== guest.id && (
                               <button 
                                  onClick={(e) => { e.stopPropagation(); onRemoveGuest(guest.id); }}
                                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity rounded hover:bg-rose-50"
                              >
                                  <Trash2 className="w-3 h-3" />
                              </button>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Import Tab */}
        {activeTab === 'import' && (
          <div className="p-4 space-y-6 overflow-y-auto">
             <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                 <h3 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">
                     <FileSpreadsheet className="w-4 h-4" /> 批次匯入
                 </h3>
                 <p className="text-xs text-indigo-700 mb-3">
                     支援 CSV 格式。請確保欄位包含: Name (姓名), Category (分類). 可選: RSVP (已確認/未定), Tags (標籤, 以逗號分隔), <strong>Avoid (避嫌/不願同桌)</strong>。
                 </p>
                 
                 <div className="mb-4">
                    <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={handleDownloadSample} 
                        className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                        icon={<Download className="w-3 h-3" />}
                    >
                        下載範例 CSV
                    </Button>
                 </div>

                 <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-600 file:text-white
                      file:cursor-pointer hover:file:bg-indigo-700
                    "
                  />
             </div>

             {importPreview.length > 0 && (
                 <div className="space-y-3">
                     <div className="flex justify-between items-center">
                         <h4 className="text-sm font-bold">預覽 ({importPreview.length} 筆)</h4>
                         {duplicates.length > 0 && (
                             <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                                 <AlertCircle className="w-3 h-3" /> {duplicates.length} 筆重複
                             </span>
                         )}
                     </div>
                     <div className="max-h-60 overflow-y-auto border rounded bg-slate-50 p-2 text-xs space-y-1">
                         {importPreview.map((g, i) => (
                             <div key={i} className={`flex justify-between p-1 ${duplicates.includes(g.name) ? 'bg-rose-100 text-rose-700' : ''}`}>
                                 <span>{g.name}</span>
                                 <span className="opacity-70">{g.category}</span>
                             </div>
                         ))}
                     </div>
                     <Button className="w-full" onClick={confirmImport}>
                         確認匯入
                     </Button>
                     <Button variant="ghost" className="w-full" onClick={() => { setImportPreview([]); setDuplicates([]); if(fileInputRef.current) fileInputRef.current.value=''; }}>
                         取消
                     </Button>
                 </div>
             )}
          </div>
        )}

        {/* Add / AI Tab */}
        {activeTab === 'add' && (
          <div className="p-4 space-y-6 overflow-y-auto">
            {/* Manual Add */}
            <form onSubmit={handleManualAdd} className="space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> 手動新增
              </h3>
              <div>
                  <label className="text-xs text-slate-500 block mb-1">姓名 *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-indigo-500 outline-none"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                  />
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">分類</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-indigo-500 outline-none"
                        value={newGuestCategory}
                        onChange={(e) => setNewGuestCategory(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">標籤 (逗號分隔)</label>
                    <input
                        type="text"
                        placeholder="素食, VIP"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-indigo-500 outline-none"
                        value={newGuestTags}
                        onChange={(e) => setNewGuestTags(e.target.value)}
                    />
                  </div>
              </div>
              <div>
                  <label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> 避免同桌對象 (輸入姓名)</label>
                  <input
                      type="text"
                      placeholder="例: 陳小美"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-indigo-500 outline-none placeholder:text-slate-300"
                      value={newGuestAvoid}
                      onChange={(e) => setNewGuestAvoid(e.target.value)}
                  />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={!newGuestName}>
                加入列表
              </Button>
            </form>

            <div className="border-t border-slate-200 pt-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> AI 快速生成名單
              </h3>

              {/* API Key Input */}
              <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                  <label className="text-xs text-purple-800 font-medium mb-1 flex items-center gap-1"><Key className="w-3 h-3"/> API Key (選填)</label>
                  <input
                    type="password"
                    placeholder="若無環境變數，請在此輸入 Gemini API Key"
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-md text-sm focus:border-purple-500 outline-none text-slate-600 placeholder:text-slate-400"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-purple-600 mt-1 opacity-70">
                      您的 Key 僅用於此請求，不會被儲存。
                  </p>
              </div>
              
              <p className="text-xs text-slate-500">
                描述你的活動，讓 Gemini 幫你產生含有人設、關係與屬性的測試資料。
              </p>
              
              <div>
                <label className="text-xs text-slate-600 mb-1 block">活動描述</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:border-purple-500 outline-none"
                  rows={2}
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-1 block">生成人數: {guestCount}</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  className="w-full accent-purple-600"
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-none"
              >
                生成資料
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}