import React, { useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';

const SelectionModal = ({ isOpen, onClose, title, options, selectedItems, onToggle, colorClass = "blue" }) => {
    const [customInput, setCustomInput] = useState("");
    if (!isOpen) return null;

    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500' },
        red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-500' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-500' },
    };
    const theme = colorMap[colorClass] || colorMap.blue;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-5 w-96 border border-gray-200 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                    <h3 className={`font-bold text-sm flex items-center gap-2 ${theme.text}`}>
                        <Sparkles size={16} /> {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto custom-scrollbar">
                    {options.map(item => {
                        const isSelected = selectedItems.includes(item);
                        return (
                            <button
                                key={item}
                                onClick={() => onToggle(item)}
                                className={`text-xs py-2 px-1 rounded border transition-all text-center relative truncate ${isSelected ? `${theme.bg} ${theme.border} ${theme.text} font-bold shadow-sm` : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'}`}
                                title={item}
                            >
                                {item}
                                {isSelected && <div className={`absolute top-0.5 right-0.5 ${theme.text}`}><Check size={8} /></div>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                    <input
                        type="text"
                        placeholder="输入自定义词汇..."
                        className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 transition-colors"
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && customInput) { onToggle(customInput); setCustomInput(""); } }}
                    />
                    <button
                        onClick={() => { if (customInput) { onToggle(customInput); setCustomInput(""); } }}
                        className="bg-slate-800 text-white text-xs px-4 py-2 rounded-lg hover:bg-slate-900 font-medium"
                    >
                        添加
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectionModal;
