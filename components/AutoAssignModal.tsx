import React, { useState, useMemo } from 'react';
import { Guest, Table, Seat } from '../types';
import { Button } from './Button';
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2, XCircle, Users, ShieldAlert } from 'lucide-react';

interface AutoAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  guests: Guest[];
  onApply: (assignments: { guestId: string, tableId: string, seatIndex: number }[]) => void;
}

interface Assignment {
  guest: Guest;
  table: Table;
  seatIndex: number;
}

interface SkippedGuest {
  guest: Guest;
  reason: 'conflict' | 'no_space';
}

export const AutoAssignModal: React.FC<AutoAssignModalProps> = ({
  isOpen,
  onClose,
  tables,
  guests,
  onApply
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [strictMode, setStrictMode] = useState(false); // If true, strictly categorize
  
  // Preview State
  const [previewAssignments, setPreviewAssignments] = useState<Assignment[]>([]);
  const [previewSkipped, setPreviewSkipped] = useState<SkippedGuest[]>([]);
  const [simulatedTables, setSimulatedTables] = useState<Table[]>([]);

  // 1. Prepare Data
  const unseatedGuests = useMemo(() => guests.filter(g => !g.assignedSeatId), [guests]);
  
  const categories = useMemo(() => {
    const cats = new Set<string>();
    unseatedGuests.forEach(g => cats.add(g.category));
    return Array.from(cats);
  }, [unseatedGuests]);

  // Initial selection
  React.useEffect(() => {
    if (isOpen && step === 1) {
      setSelectedCategories(categories);
      setPreviewAssignments([]);
      setPreviewSkipped([]);
    }
  }, [isOpen, categories, step]);

  if (!isOpen) return null;

  // --- Algorithm Core ---
  const runSimulation = () => {
    // Deep clone tables to simulate state
    let currentTables = JSON.parse(JSON.stringify(tables)) as Table[];
    const assignments: Assignment[] = [];
    const skipped: SkippedGuest[] = [];

    // Filter target guests
    const targetGuests = unseatedGuests.filter(g => selectedCategories.includes(g.category));

    // Group guests by category
    const grouped: Record<string, Guest[]> = {};
    targetGuests.forEach(g => {
        if(!grouped[g.category]) grouped[g.category] = [];
        grouped[g.category].push(g);
    });

    // Sort categories by group size (Largest first - Greedy approach)
    const sortedCats = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

    // Helper: Check Conflict
    const hasConflict = (guest: Guest, table: Table): boolean => {
        // Find guests ALREADY sitting there + Guests we PROPOSED to sit there
        const seatedGuests = table.seats
            .map(s => s.guestId ? guests.find(g => g.id === s.guestId) : null)
            .filter(Boolean) as Guest[];
        
        // Also check guests we just assigned in this simulation
        const newlyAssignedToThisTable = assignments
            .filter(a => a.table.id === table.id)
            .map(a => a.guest);

        const allTableGuests = [...seatedGuests, ...newlyAssignedToThisTable];

        for (const other of allTableGuests) {
            // Check current guest's avoids
            if (guest.relationships.some(r => r.startsWith('Avoid:') && r.includes(other.name))) return true;
            // Check other's avoids
            if (other.relationships.some(r => r.startsWith('Avoid:') && r.includes(guest.name))) return true;
        }
        return false;
    };

    // Helper: Find Best Seat
    const findSeat = (guest: Guest): { table: Table, seatIndex: number } | null => {
        // Strategy 1: Find table with SAME category guests (Homogeneity)
        // Sort tables by: Has same category > Most empty space
        const sortedTables = [...currentTables].sort((a, b) => {
            const aHasCat = a.seats.some(s => {
                 const g = guests.find(x => x.id === s.guestId);
                 return g?.category === guest.category;
            });
            const bHasCat = b.seats.some(s => {
                 const g = guests.find(x => x.id === s.guestId);
                 return g?.category === guest.category;
            });
            if (aHasCat && !bHasCat) return -1;
            if (!aHasCat && bHasCat) return 1;
            
            // Secondary sort: Most empty seats (to keep groups together) or Least empty seats (to fill gaps)?
            // Let's go with "Fill Gaps" if not strict, but "Most Space" if looking for new table.
            // Simplified: Sort by number of empty seats descending
            const aEmpty = a.seats.filter(s => !s.guestId).length;
            const bEmpty = b.seats.filter(s => !s.guestId).length;
            return bEmpty - aEmpty;
        });

        for (const table of sortedTables) {
            // Strict Mode: If table has guests of DIFFERENT category, skip
            if (strictMode) {
                 const hasDiff = table.seats.some(s => {
                     const g = guests.find(x => x.id === s.guestId);
                     return g && g.category !== guest.category;
                 });
                 if (hasDiff) continue;
            }

            const emptySeat = table.seats.find(s => !s.guestId);
            if (emptySeat) {
                if (!hasConflict(guest, table)) {
                    return { table, seatIndex: emptySeat.index };
                }
            }
        }
        return null;
    };

    // Execute Assignment
    sortedCats.forEach(cat => {
        const group = grouped[cat];
        group.forEach(guest => {
            const result = findSeat(guest);
            if (result) {
                // Update simulation state
                const { table, seatIndex } = result;
                // Mark seat as occupied in currentTables to prevent double booking in loop
                const tIndex = currentTables.findIndex(t => t.id === table.id);
                if (tIndex >= 0) {
                     currentTables[tIndex].seats.find(s => s.index === seatIndex)!.guestId = guest.id;
                }
                
                assignments.push({ guest, table: result.table, seatIndex });
            } else {
                // Check if skipped due to conflict or space
                // Simple heuristic: if space exists anywhere but we failed, likely conflict or strict mode
                const hasSpaceAnywhere = currentTables.some(t => t.seats.some(s => !s.guestId));
                skipped.push({ 
                    guest, 
                    reason: hasSpaceAnywhere ? 'conflict' : 'no_space' 
                });
            }
        });
    });

    setPreviewAssignments(assignments);
    setPreviewSkipped(skipped);
    setSimulatedTables(currentTables);
    setStep(2);
  };

  const handleApply = () => {
    onApply(previewAssignments.map(a => ({
        guestId: a.guest.id,
        tableId: a.table.id,
        seatIndex: a.seatIndex
    })));
    onClose();
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            智慧批次排位引擎
          </h2>
          <p className="text-indigo-100 text-sm mt-1 opacity-80">
            基於標籤親密度與衝突規則，自動尋找最佳座位配置。
          </p>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  1. 選擇目標群組 ({unseatedGuests.length} 人未入座)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(cat => {
                    const count = unseatedGuests.filter(g => g.category === cat).length;
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <div 
                        key={cat}
                        onClick={() => setSelectedCategories(prev => 
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        )}
                        className={`
                          cursor-pointer p-3 rounded-lg border flex justify-between items-center transition-all
                          ${isSelected ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}
                        `}
                      >
                        <span className="text-sm font-medium text-slate-700">{cat}</span>
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{count} 人</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                 <h3 className="text-sm font-bold text-slate-700 mb-3">2. 排位策略</h3>
                 <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      checked={strictMode}
                      onChange={e => setStrictMode(e.target.checked)}
                    />
                    <div>
                        <div className="text-sm font-bold text-slate-800">嚴格分類模式 (Strict Mode)</div>
                        <div className="text-xs text-slate-500 mt-1">
                            盡量不將不同分類的賓客混在同一桌。可能會導致部分桌次未坐滿。
                        </div>
                    </div>
                 </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               {/* Stats */}
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                      <div className="text-2xl font-bold text-emerald-600">{previewAssignments.length}</div>
                      <div className="text-xs text-emerald-700 font-medium mt-1">成功安排</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl text-center border border-amber-100">
                      <div className="text-2xl font-bold text-amber-600">{previewSkipped.length}</div>
                      <div className="text-xs text-amber-700 font-medium mt-1">未安排/略過</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl text-center border border-slate-200">
                      <div className="text-2xl font-bold text-slate-600">{tables.length}</div>
                      <div className="text-xs text-slate-500 font-medium mt-1">使用桌數</div>
                  </div>
               </div>

               {/* Skipped Warnings */}
               {previewSkipped.length > 0 && (
                   <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                       <h4 className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1">
                           <ShieldAlert className="w-3 h-3" /> 以下人員無法安排:
                       </h4>
                       <div className="max-h-24 overflow-y-auto space-y-1">
                           {previewSkipped.map((s, i) => (
                               <div key={i} className="text-xs text-rose-600 flex justify-between">
                                   <span>{s.guest.name} ({s.guest.category})</span>
                                   <span className="opacity-70">
                                       {s.reason === 'conflict' ? '衝突限制' : '無合適座位'}
                                   </span>
                               </div>
                           ))}
                       </div>
                   </div>
               )}

               {/* Success List Preview */}
               <div className="border rounded-lg overflow-hidden">
                   <div className="bg-slate-50 p-2 text-xs font-bold text-slate-500 border-b">預覽清單 (部分)</div>
                   <div className="max-h-48 overflow-y-auto p-2 space-y-2">
                       {previewAssignments.slice(0, 20).map((a, i) => (
                           <div key={i} className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded">
                               <div className="flex items-center gap-2">
                                   <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                       {a.guest.name.charAt(0)}
                                   </span>
                                   <div>
                                       <div className="font-medium text-slate-800">{a.guest.name}</div>
                                       <div className="text-[10px] text-slate-500">{a.guest.category}</div>
                                   </div>
                               </div>
                               <ArrowRight className="w-3 h-3 text-slate-300" />
                               <div className="text-right">
                                   <div className="font-bold text-slate-700">{a.table.label}</div>
                                   <div className="text-[10px] text-slate-500">Seat {a.seatIndex + 1}</div>
                               </div>
                           </div>
                       ))}
                       {previewAssignments.length > 20 && (
                           <div className="text-center text-xs text-slate-400 py-2">
                               ...還有 {previewAssignments.length - 20} 位
                           </div>
                       )}
                   </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          
          {step === 1 ? (
              <Button 
                onClick={runSimulation} 
                disabled={selectedCategories.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                icon={<Sparkles className="w-4 h-4 text-yellow-300" />}
              >
                開始運算
              </Button>
          ) : (
              <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setStep(1)}>上一步</Button>
                  <Button 
                    onClick={handleApply} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    確認應用
                  </Button>
              </div>
          )}
        </div>

      </div>
    </div>
  );
};