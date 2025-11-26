import React, { useRef } from 'react';
import { FlipHorizontal, Maximize } from 'lucide-react';
import { CROP_CONFIG, BASE_WIDTH, BASE_HEIGHT } from '../utils/constants';

// --- 3. 子组件重构：直接拖拽与缩放 ---
const LocalFocusView = ({ imageSrc, imgState, focus, fineTuning, onFineTune, isMirrored, onMirrorToggle, showMirrorBtn, onOpenModal }) => {
    const isDraggingRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // 交互处理
    // 使用 useEffect 添加 non-passive 事件监听器以防止页面滚动
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            onFineTune(focus, 'scale', delta);
        };

        container.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, [focus, onFineTune]);

    if (!imageSrc) return <div className="bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400 h-32 w-full border border-dashed border-gray-300">请上传照片</div>;

    const config = CROP_CONFIG[focus];
    const tune = fineTuning?.[focus] || { x: 0, y: 0, scale: 1 };
    const isSplitView = config.type === 'split';
    const isLeftFace = focus === 'left-face';

    const zoomScale = (config.zoom || 1) * tune.scale;

    // 内部图片样式
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

    // 世界容器
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

    // 视口组件
    const Viewport = ({ isMirrorContainer = false }) => (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', transform: isMirrorContainer ? 'scaleX(-1)' : 'none' }}>
                <div style={worldStyle}>
                    <img src={imageSrc} style={innerImgStyle} alt="detail" draggable={false} />
                </div>
            </div>
        </div>
    );

    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDraggingRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;

        // 关键：根据当前的 zoomScale 调整移动速度，保证鼠标跟手
        // 如果 zoomScale 是 2，屏幕移动 2px，图片只需要移动 1px
        onFineTune(focus, 'moveX', dx / zoomScale);
        onFineTune(focus, 'moveY', dy / zoomScale);

        lastPosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
    };

    const handleOpenModal = (e) => {
        e && e.stopPropagation();
        const width = containerRef.current ? containerRef.current.offsetWidth : config.w;
        const height = containerRef.current ? containerRef.current.offsetHeight : config.h;
        onOpenModal && onOpenModal(focus, { width, height });
    };

    return (
        <div className="flex flex-col gap-2 select-none group relative">
            <div
                ref={containerRef}
                className={`shadow-inner border border-gray-300 rounded bg-gray-200 overflow-hidden relative flex ${isLeftFace ? 'flex-row-reverse' : ''} cursor-move hover:ring-2 hover:ring-blue-400 transition-all`}
                style={{
                    width: '100%',
                    aspectRatio: isSplitView ? `${config.w * 2} / ${config.h}` : `${config.w} / ${config.h}`
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleOpenModal}
                title="拖动调整，滚轮缩放，双击查看大图"
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

                {/* 悬浮按钮组 */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={handleOpenModal}
                        className="w-6 h-6 bg-black/60 text-white rounded flex items-center justify-center hover:bg-blue-600 transition-colors backdrop-blur-sm shadow-sm"
                        title="查看大图"
                    >
                        <Maximize size={12} />
                    </button>
                </div>
            </div>

            {showMirrorBtn && (
                <button onClick={(e) => { e.stopPropagation(); onMirrorToggle(); }} className={`w-full text-xs py-2 rounded border flex items-center justify-center gap-2 transition-all ${isMirrored ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <FlipHorizontal size={14} /> {isMirrored ? '关闭镜像' : '开启镜像合成'}
                </button>
            )}
        </div>
    );
};

export default LocalFocusView;
