import React from 'react';

// 智能校准模版 (适配 304x380)
const ReferenceOverlay = ({ visible }) => {
    return (
        <div className={`absolute inset-0 pointer-events-none z-30 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <svg className="w-full h-full opacity-60" viewBox="0 0 304 380" preserveAspectRatio="none">
                <defs>
                    <style>{`.guide-dashed { stroke: rgba(0, 255, 255, 0.6); stroke-width: 1; stroke-dasharray: 4, 4; } .guide-solid { stroke: rgba(255, 255, 255, 0.3); stroke-width: 1; }`}</style>
                </defs>
                {/* 中轴线 x=152 */}
                <line x1="152" y1="0" x2="152" y2="380" className="guide-dashed" />
                {/* 眼睛水平线 y=152 (原190，上移10%即38px) */}
                <line x1="0" y1="152" x2="304" y2="152" className="guide-dashed" />

                {/* 简单的脸部轮廓示意 */}
                <ellipse cx="152" cy="152" rx="100" ry="140" fill="none" className="guide-solid" />
            </svg>
        </div>
    );
};

export default ReferenceOverlay;
