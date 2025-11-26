import React from 'react';
import { X } from 'lucide-react';
import { CROP_CONFIG, BASE_WIDTH, BASE_HEIGHT } from '../utils/constants';

const InspectionModal = ({ isOpen, onClose, imageSrc, imgState, focus, fineTuning, dims, isMirrored }) => {
    if (!isOpen || !imageSrc || !focus) return null;

    const config = CROP_CONFIG[focus];
    const tune = fineTuning?.[focus] || { x: 0, y: 0, scale: 1 };

    const isSplitView = config.type === 'split';
    const isLeftFace = focus === 'left-face';

    // 纯展示模式：放大 3 倍
    const scale = 3.0;
    // 如果有传入的实际容器尺寸，则使用实际尺寸，否则使用配置尺寸
    const baseW = dims?.width || config.w;
    const baseH = dims?.height || config.h;

    const frameWidth = baseW * scale;
    const frameHeight = baseH * scale;
    const zoomScale = (config.zoom || 1) * tune.scale;

    // 直接复用 LocalFocusView 的原始样式，不进行手动乘法
    const worldStyle = {
        width: `${BASE_WIDTH}px`,
        height: `${BASE_HEIGHT}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        transformOrigin: '0 0',
        transform: `translate(${-config.x}px, ${-config.y}px) scale(${zoomScale})`,
        pointerEvents: 'none'
    };

    const innerImgStyle = {
        position: 'absolute',
        left: '50%',
        top: '50%',
        maxWidth: 'none',
        maxHeight: 'none',
        transform: `
        translate(-50%, -50%) 
        translate(${imgState.x + tune.x}px, ${imgState.y + tune.y}px) 
        scale(${imgState.scale}) 
        rotate(${imgState.rotate}deg) 
        ${imgState.flipH ? 'scaleX(-1)' : ''}
      `
    };

    // 视口组件 (复用 LocalFocusView 的逻辑)
    const Viewport = ({ isMirrorContainer = false }) => (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', transform: isMirrorContainer ? 'scaleX(-1)' : 'none' }}>
                <div style={worldStyle}>
                    <img src={imageSrc} style={innerImgStyle} alt="High Def" draggable={false} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>

            <div className="relative" onClick={e => e.stopPropagation()}>
                {/* 标题 */}
                <div className="absolute -top-10 left-0 text-white font-bold text-lg tracking-wide drop-shadow-md">
                    {config.label} (预览模式)
                </div>

                {/* 视口容器 */}
                <div
                    className="overflow-hidden shadow-2xl ring-4 ring-white/20 bg-black"
                    style={{ width: frameWidth, height: frameHeight }}
                >
                    {/* 关键修复：使用 CSS scale 放大整个 World，保证 1:1 还原 */}
                    <div
                        className={`relative flex ${isLeftFace ? 'flex-row-reverse' : ''}`}
                        style={{
                            width: baseW,
                            height: baseH,
                            transform: `scale(${scale})`,
                            transformOrigin: '0 0'
                        }}
                    >
                        {/* 实图视口 */}
                        <div style={{ width: isSplitView ? '50%' : '100%', height: '100%' }}>
                            <Viewport isMirrorContainer={false} />
                        </div>

                        {/* 镜像/占位视口 */}
                        {isSplitView && (
                            <div style={{ width: '50%', height: '100%', background: isMirrored ? 'transparent' : '#f3f4f6', borderLeft: (isMirrored || isLeftFace) ? 'none' : '1px dashed #ccc', borderRight: (isLeftFace && !isMirrored) ? '1px dashed #ccc' : 'none' }}>
                                {isMirrored ? (
                                    <Viewport isMirrorContainer={true} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] pointer-events-none">镜像合成</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 关闭按钮 */}
                <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors">
                    <X size={24} />
                </button>

                <div className="absolute -bottom-8 left-0 w-full text-center text-white/50 text-xs">
                    仅供查看，请在小图上进行拖拽调整
                </div>
            </div>
        </div>
    );
};

export default InspectionModal;
