import React, { useRef, useEffect, useState } from 'react';
import { Plus, Minus, User, Upload } from 'lucide-react';

const ParticleNode = ({ node, onMouseDown, onAdd, onDelete, onUpload, onDoubleClick, onRename }) => {
    const canvasRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    // 粒子系统配置
    const PARTICLE_COUNT = 150; // 增加粒子数量，但更细微
    const ELLIPSE_WIDTH = 120;
    const ELLIPSE_HEIGHT = 150;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !node.photo) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let animationFrameId;
        let particles = [];

        // 初始化粒子
        const initParticles = () => {
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle());
            }
        };

        const createParticle = () => {
            // 在椭圆边缘随机生成
            const angle = Math.random() * Math.PI * 2;
            const rx = ELLIPSE_WIDTH / 2;
            const ry = ELLIPSE_HEIGHT / 2;

            // 基础位置
            const baseX = rx * Math.cos(angle) + rx;
            const baseY = ry * Math.sin(angle) + ry;

            return {
                baseX,
                baseY,
                x: baseX,
                y: baseY,
                angle, // 记录角度用于径向移动
                speed: Math.random() * 0.2 + 0.05, // 极慢的速度
                offset: Math.random() * Math.PI * 2, // 呼吸相位偏移
                life: Math.random() * 100,
                maxLife: 100 + Math.random() * 50,
                size: Math.random() * 1.5 + 0.5, // 更小的粒子
                color: 'rgba(200, 200, 200, 0.5)'
            };
        };

        // 加载图片并绘制
        const img = new Image();
        img.src = node.photo;
        img.onload = () => {
            // 离屏Canvas用于读取像素
            const offCanvas = document.createElement('canvas');
            offCanvas.width = ELLIPSE_WIDTH;
            offCanvas.height = ELLIPSE_HEIGHT;
            const offCtx = offCanvas.getContext('2d');

            // 1. 绘制椭圆遮罩 (带羽化效果)
            offCtx.beginPath();
            offCtx.ellipse(ELLIPSE_WIDTH / 2, ELLIPSE_HEIGHT / 2, ELLIPSE_WIDTH / 2, ELLIPSE_HEIGHT / 2, 0, 0, Math.PI * 2);
            offCtx.clip();

            // 2. 计算 Object-fit: cover
            const imgRatio = img.width / img.height;
            const canvasRatio = ELLIPSE_WIDTH / ELLIPSE_HEIGHT;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgRatio > canvasRatio) {
                drawHeight = ELLIPSE_HEIGHT;
                drawWidth = img.width * (ELLIPSE_HEIGHT / img.height);
                offsetX = -(drawWidth - ELLIPSE_WIDTH) / 2;
                offsetY = 0;
            } else {
                drawWidth = ELLIPSE_WIDTH;
                drawHeight = img.height * (ELLIPSE_WIDTH / img.width);
                offsetX = 0;
                offsetY = -(drawHeight - ELLIPSE_HEIGHT) / 2;
            }

            offCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

            // 3. 应用边缘渐变遮罩 (Soft Edge)
            offCtx.globalCompositeOperation = 'destination-in';
            const gradient = offCtx.createRadialGradient(
                ELLIPSE_WIDTH / 2, ELLIPSE_HEIGHT / 2, ELLIPSE_WIDTH / 2 * 0.7, // Inner radius (opaque)
                ELLIPSE_WIDTH / 2, ELLIPSE_HEIGHT / 2, ELLIPSE_WIDTH / 2        // Outer radius (transparent)
            );
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(0.8, 'rgba(0,0,0,0.8)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            offCtx.fillStyle = gradient;
            offCtx.fillRect(0, 0, ELLIPSE_WIDTH, ELLIPSE_HEIGHT);

            // 获取图片数据用于粒子取色
            const imgData = offCtx.getImageData(0, 0, ELLIPSE_WIDTH, ELLIPSE_HEIGHT);

            const render = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // 全局呼吸因子
                const time = Date.now() / 2000;
                const breath = (Math.sin(time) + 1) / 2; // 0 ~ 1

                // 1. 绘制主体图片 (微弱浮动)
                const floatY = Math.sin(time * 2) * 2;
                ctx.save();
                ctx.translate(20, 20 + floatY); // Canvas padding 20px
                ctx.drawImage(offCanvas, 0, 0);
                ctx.restore();

                // 2. 更新和绘制粒子
                particles.forEach((p, index) => {
                    // 呼吸运动：在基础位置周围轻微浮动，而不是一直向外飞
                    // 结合一点点向外的漂移
                    const drift = (p.maxLife - p.life) / p.maxLife * 10; // 最多飘远10px

                    // 呼吸波动
                    const wave = Math.sin(time * 3 + p.offset) * 2;

                    p.x = p.baseX + Math.cos(p.angle) * (drift + wave);
                    p.y = p.baseY + Math.sin(p.angle) * (drift + wave);

                    p.life--;

                    // 重置
                    if (p.life <= 0) {
                        particles[index] = createParticle();
                        // 取色
                        const px = Math.floor(particles[index].x);
                        const py = Math.floor(particles[index].y);
                        if (px >= 0 && px < ELLIPSE_WIDTH && py >= 0 && py < ELLIPSE_HEIGHT) {
                            const i = (py * ELLIPSE_WIDTH + px) * 4;
                            const r = imgData.data[i];
                            const g = imgData.data[i + 1];
                            const b = imgData.data[i + 2];
                            particles[index].color = `rgba(${r},${g},${b},`;
                        }
                    }

                    ctx.save();
                    ctx.translate(20, 20 + floatY);

                    // 透明度随生命周期和呼吸变化
                    const alpha = (p.life / p.maxLife) * 0.6 * (0.5 + breath * 0.5);
                    ctx.fillStyle = p.color + alpha + ')';

                    // 绘制矩形 (Matrix style pixel)
                    ctx.fillRect(p.x, p.y, p.size, p.size);

                    ctx.restore();
                });

                animationFrameId = requestAnimationFrame(render);
            };

            initParticles();
            render();
        };

        return () => cancelAnimationFrame(animationFrameId);
    }, [node.photo]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && onUpload) {
            const reader = new FileReader();
            reader.onload = (e) => onUpload(node.id, e.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            className="absolute group select-none"
            style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                width: ELLIPSE_WIDTH + 40, // + padding
                height: ELLIPSE_HEIGHT + 40
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Canvas Layer for Image & Particles */}
            <canvas
                ref={canvasRef}
                width={ELLIPSE_WIDTH + 40}
                height={ELLIPSE_HEIGHT + 40}
                className="absolute inset-0 pointer-events-none z-10"
            />

            {/* Interactive Layer (Invisible Ellipse) */}
            <div
                className="absolute left-[20px] top-[20px] cursor-move z-20"
                style={{ width: ELLIPSE_WIDTH, height: ELLIPSE_HEIGHT, borderRadius: '50%' }}
                onMouseDown={(e) => onMouseDown(e, node.id)}
                onDoubleClick={() => onDoubleClick && onDoubleClick(node)}
                onClick={() => !node.photo && fileInputRef.current.click()}
            >
                {!node.photo && (
                    <div className="w-full h-full rounded-[50%] border-2 border-dashed border-gray-300 flex items-center justify-center bg-white/50 hover:bg-white/80 transition-colors">
                        <div className="flex flex-col items-center text-gray-400">
                            <Upload size={24} />
                            <span className="text-[10px]">上传</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Name - Double click to rename */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 z-30 flex gap-0.5 cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); onRename && onRename(node); }}
            >
                <div className="px-2 py-0.5 rounded-full bg-white/40 backdrop-blur-sm shadow-sm border border-white/20 hover:bg-white/60 transition-colors">
                    {node.name.split('').map((char, i) => (
                        <span
                            key={i}
                            className="inline-block text-xs font-bold text-slate-700"
                            style={{
                                animation: `float 3s ease-in-out infinite`,
                                animationDelay: `${i * 0.1}s`
                            }}
                        >
                            {char}
                        </span>
                    ))}
                </div>
            </div>

            {/* Floating Action Buttons */}
            <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 flex flex-col gap-2 z-40 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
                {/* Add Button (Blue Orb) */}
                <button
                    onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
                    className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-110 transition-all"
                    title="添加关联人物"
                >
                    <Plus size={16} />
                </button>

                {/* Delete Button (Gray Orb) */}
                {node.type !== 'subject' && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
                        className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center shadow hover:bg-red-500 hover:scale-110 transition-all self-center"
                        title="删除节点"
                    >
                        <Minus size={12} />
                    </button>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
            `}</style>
        </div>
    );
};

export default ParticleNode;
