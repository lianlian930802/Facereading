import React from 'react';

const AnalysisSlider = ({ label, subLabel, value, onChange, min = 0, max = 9, leftLabel, rightLabel }) => (
    <div className="mb-4">
        <div className="flex justify-between mb-1 items-end"><div className="flex flex-col"><span className="text-sm font-medium text-gray-700">{label}</span>{subLabel && <span className="text-[10px] text-gray-400">{subLabel}</span>}</div><span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 rounded">{value}</span></div>
        <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>{leftLabel || min}</span><span>{rightLabel || max}</span></div>
    </div>
);

export default AnalysisSlider;
