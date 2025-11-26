import React, { useRef, useState } from 'react';
import { Plus, Minus, User } from 'lucide-react';

const MindMapNode = ({ node, onMouseDown, onAdd, onStartConnect, onDelete, onUpload, onDoubleClick, onRename, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onUpload) {
            const reader = new FileReader();
            reader.onload = (e) => onUpload(node.id, e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleClick = (e) => {
        if (onClick && onClick(e)) {
            if (!node.photo) {
                fileInputRef.current.click();
            }
        }
    };

    // Reduced dimensions (80% of 304x380)
    const NODE_WIDTH = 243;
    const NODE_HEIGHT = 304;
    const SCALE_FACTOR = 0.8;

    // Adjusted transform logic
    const imgStyle = node.imgState ? {
        position: 'absolute',
        left: '50%',
        top: '50%',
        // Scale the translation and the scale itself by 0.8 to match the smaller container
        transform: `translate(-50%, -50%) translate(${node.imgState.x * SCALE_FACTOR}px, ${node.imgState.y * SCALE_FACTOR}px) scale(${node.imgState.scale * SCALE_FACTOR}) rotate(${node.imgState.rotate}deg) scaleX(${node.imgState.flipH ? -1 : 1})`,
        maxWidth: 'none',
        maxHeight: 'none'
    } : {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    };

    return (
        <div
            className="absolute group select-none flex flex-col items-center"
            style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                width: NODE_WIDTH + 60,
                zIndex: isHovered ? 50 : 10
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main Node Content */}
            <div
                className={`
                    relative rounded-lg bg-white shadow-md transition-all duration-300 overflow-hidden
                    ${isHovered ? 'ring-4 ring-amber-400 scale-105 shadow-xl' : 'border border-gray-200'}
                `}
                style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
                onMouseDown={(e) => onMouseDown(e, node.id)}
                onMouseUp={handleClick}
                onDoubleClick={() => onDoubleClick && onDoubleClick(node)}
            >
                {/* Image or Placeholder */}
                <div className="w-full h-full bg-gray-50 flex items-center justify-center cursor-pointer overflow-hidden relative">
                    {node.photo ? (
                        <div className="w-full h-full relative overflow-hidden">
                            <img
                                src={node.photo}
                                alt={node.name}
                                className="pointer-events-none"
                                draggable="false"
                                style={imgStyle}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 gap-2 pointer-events-none">
                            <User size={48} strokeWidth={1.5} />
                            <span className="text-xs">上传照片</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Actions - Positioned closer with bridge */}
            {/* Added pl-4 to create a transparent bridge so mouse doesn't leave the hover area */}
            <div className={`absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 pl-4 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Add / Connect Button */}
                <div
                    onMouseDown={(e) => onStartConnect && onStartConnect(e, node.id)}
                    onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
                    className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg hover:bg-amber-600 hover:scale-110 transition-all cursor-crosshair z-50"
                    title="点击添加，拖拽连线"
                >
                    <Plus size={16} />
                </div>

                {node.type !== 'subject' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                        className="w-7 h-7 rounded-full bg-gray-400 text-white flex items-center justify-center shadow hover:bg-red-500 hover:scale-110 transition-all z-50"
                        title="删除"
                    >
                        <Minus size={16} />
                    </button>
                )}
            </div>

            {/* Name Label */}
            <div
                className="mt-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-slate-700 cursor-text hover:bg-white hover:border-blue-300 transition-colors"
                onDoubleClick={(e) => { e.stopPropagation(); onRename && onRename(node); }}
            >
                {node.name || "请输入姓名"}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default MindMapNode;
