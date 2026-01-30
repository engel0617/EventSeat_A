import React, { useState } from 'react';
import { Button } from './Button';
import { Settings2, Armchair, Layout, Scaling, BookOpen, MousePointerClick, Users, Sparkles, Download, Save, RotateCw, Type, CaseSensitive } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainTableRatio: number;
  setMainTableRatio: (val: number) => void;
  defaultRoundSeats: number;
  setDefaultRoundSeats: (val: number) => void;
  defaultRectSeats: number;
  setDefaultRectSeats: (val: number) => void;
  defaultFontSize: number;
  setDefaultFontSize: (val: number) => void;
  nameDisplayMode: 'surname' | 'full';
  setNameDisplayMode: (mode: 'surname' | 'full') => void;
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
  defaultFontSize,
  setDefaultFontSize,
  nameDisplayMode,
  setNameDisplayMode,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'guide'>('general');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[500px] max-w-[95vw] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded text-indigo-600">
               <Settings2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">系統設定與說明</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 pt-2">
            <button 
                onClick={() => setActiveTab('general')}
                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                偏好設定
            </button>
            <button 
                onClick={() => setActiveTab('guide')}
                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'guide' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                操作說明
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {activeTab === 'general' && (
              <div className="space-y-6">
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

                {/* Name Display Mode */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <CaseSensitive className="w-4 h-4 text-slate-500"/>
                        座位顯示名稱
                    </label>
                    <div className="flex gap-2">
                         <Button 
                            variant={nameDisplayMode === 'surname' ? 'primary' : 'secondary'} 
                            onClick={() => setNameDisplayMode('surname')}
                            className="flex-1"
                         >
                            姓氏 (預設)
                         </Button>
                         <Button 
                            variant={nameDisplayMode === 'full' ? 'primary' : 'secondary'} 
                            onClick={() => setNameDisplayMode('full')}
                            className="flex-1"
                         >
                            全名
                         </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                        「全名」模式下，中文最多顯示 3 字，英文最多 6 字。
                    </p>
                </div>

                <div className="border-t border-slate-100"></div>

                {/* Default Font Size */}
                <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <Type className="w-3 h-3 text-slate-500"/>
                          預設桌名大小
                      </label>
                      <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setDefaultFontSize(Math.max(10, defaultFontSize - 1))}>-</Button>
                          <input 
                            type="number" 
                            className="flex-1 w-0 text-center outline-none font-bold text-slate-700 bg-slate-50 rounded-md border border-slate-200 py-1" 
                            value={defaultFontSize}
                            readOnly
                          />
                          <Button variant="secondary" size="sm" onClick={() => setDefaultFontSize(Math.min(32, defaultFontSize + 1))}>+</Button>
                      </div>
                      <p className="text-xs text-slate-400">此設定將套用於新建立的桌次。</p>
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
          )}

          {activeTab === 'guide' && (
              <div className="space-y-6">
                  <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-sm">1. 建立賓客名單</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              您可以在左側列表<b>手動新增</b>賓客，或是透過<b>CSV 檔案匯入</b>大量名單。
                              如果不確定名單，也可以使用 <b>AI 生成</b>功能來建立測試資料。
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <Layout className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-sm">2. 佈置場地桌次</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              點擊上方工具列新增<b>圓桌</b>或<b>長桌</b>。
                              拖曳桌子可移動位置。點擊桌子後，右上方會出現屬性面板，可設定<b>桌名</b>、<b>座位數</b>、<b>尺寸</b>或<b>旋轉角度</b>。
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <MousePointerClick className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-sm">3. 安排座位 (拖放與點擊)</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              <b>方式 A：</b> 直接從左側列表將賓客<b>拖曳 (Drag & Drop)</b> 到空座位上。<br/>
                              <b>方式 B：</b> 先點選左側賓客(變成選取狀態)，再點擊圖面上的空座位。
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-sm">4. 智慧輔助</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              使用左側列表上方的 <b>閃電圖示</b> 開啟自動排位功能。系統會依據賓客分類與避嫌規則，自動將其填入空位。
                              若有紅色的虛線連接兩人，代表有<b>避嫌衝突</b>，請調整座位。
                          </p>
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                          <Save className="w-4 h-4" />
                      </div>
                      <div>
                          <h3 className="font-bold text-slate-800 text-sm">5. 儲存與匯出</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              完成後，可匯出 <b>CSV 名單</b> (含桌號) 供報到使用，或匯出 <b>JSON 檔</b> 以便日後重新匯入編輯。
                              點擊<b>列印</b>按鈕可將座位圖輸出為 PDF (建議使用橫向配置)。
                          </p>
                      </div>
                  </div>
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
           <Button onClick={onClose} className="w-full sm:w-auto">關閉</Button>
        </div>
      </div>
    </div>
  );
};