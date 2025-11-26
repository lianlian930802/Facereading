import React from 'react';

const EnergyBar = ({ label, value, leftText, rightText, colorClass = "bg-blue-500" }) => (
    <div className="mb-3">
        <div className="flex justify-between text-xs font-bold text-gray-700 mb-1"><span>{label}</span><span className="text-gray-400 font-mono text-[10px]">{value}</span></div>
        <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`} style={{ width: `${(value / 9) * 100}%` }}></div><div className="absolute top-0 left-1/2 w-px h-full bg-white/50"></div></div>
        <div className="flex justify-between text-[10px] text-gray-500 mt-1 w-full"><span>{leftText}</span><span>{rightText}</span></div>
    </div>
);

export default EnergyBar;
