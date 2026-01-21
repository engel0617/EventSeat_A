import React from 'react';
import { Button } from './Button';
import { Settings2, Armchair, Layout, Scaling } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainTableRatio: number;
  setMainTableRatio: (val: number) => void;
  defaultRoundSeats: number;
  setDefaultRoundSeats: (val: number) => void;
  defaultRectSeats: number;
  setDefaultRectSeats: (val: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  mainTableRatio,
  setMainTableRatio,
  defaultRoundSeats,
  setDefaultRoundSeats,
  defaultRectSeats,
  setDefaultRectSeats,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[400px] max-w-[90vw] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded text-indigo-600">
             <Settings2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">基本設定</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Main Table Ratio */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                     <Scaling className="w-4 h-4 text-slate-500" />
                     大主桌比例設定
                 </label>
                 <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                     +{mainTableRatio}%
                 </span>
             </div>
             <input 
               type="range" 
               min="0" 
               max="40" 
               step="5"
               value={mainTableRatio}
               onChange={(e) => setMainTableRatio(Number(e.target.value))}
               className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                 <span>標準 (0%)</span>
                 <span>最大 (40%)</span>
             </div>
             <p className="text-xs text-slate-500">
                 設定「大主桌」相較於標準圓桌的放大比例。
             </p>
          </div>

          <div className="border-t border-slate-100"></div>

          {/* Default Seats */}
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400"></div>
                      圓桌預設座位
                  </label>
                  <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDefaultRoundSeats(Math.max(1, defaultRoundSeats - 1))}>-</Button>
                      <input 
                        type="number" 
                        className="flex-1 w-0 text-center outline-none font-bold text-slate-700 bg-slate-50 rounded-md border border-slate-200 py-1" 
                        value={defaultRoundSeats}
                        readOnly
                      />
                      <Button variant="secondary" size="sm" onClick={() => setDefaultRoundSeats(Math.min(20, defaultRoundSeats + 1))}>+</Button>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <div className="w-3 h-2 border-2 border-slate-400"></div>
                      長桌預設座位
                  </label>
                  <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setDefaultRectSeats(Math.max(1, defaultRectSeats - 1))}>-</Button>
                      <input 
                        type="number" 
                        className="flex-1 w-0 text-center outline-none font-bold text-slate-700 bg-slate-50 rounded-md border border-slate-200 py-1" 
                        value={defaultRectSeats}
                        readOnly
                      />
                      <Button variant="secondary" size="sm" onClick={() => setDefaultRectSeats(Math.min(20, defaultRectSeats + 1))}>+</Button>
                  </div>
              </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
           <Button onClick={onClose} className="w-full sm:w-auto">完成</Button>
        </div>
      </div>
    </div>
  );
};