import React, { useState, useRef } from 'react';
import MindMapNode from './MindMapNode';

const RelationshipMap = ({ basicInfo, graph, onUpdateGraph, onBack, onSelectSubject }) => {
    const nodes = graph.nodes;
    const connections = graph.connections;

    const draggingIdRef = useRef(null);
    const containerRef = useRef(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const dragStartPositionRef = useRef({ x: 0, y: 0 });

    // Drag-to-Connect State
    const [connectingNodeId, setConnectingNodeId] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const updateGraph = (newNodes, newConnections) => {
        onUpdateGraph({
            nodes: newNodes !== undefined ? newNodes : nodes,
            connections: newConnections !== undefined ? newConnections : connections
        });
    };

    const handleAddNode = (parentId) => {
        const parentNode = nodes.find(n => n.id === parentId);
        const newId = `node_${Date.now()}`;
        const offsetX = 250;
        const newX = parentNode.x + offsetX;
        const newY = parentNode.y + (Math.random() * 100 - 50);

        const newNode = {
            id: newId,
            type: 'relative',
            name: '新人物',
            x: newX,
            y: newY,
            photo: null,
            relation: '关系'
        };

        updateGraph(
            [...nodes, newNode],
            [...connections, { from: parentId, to: newId, label: '关系' }]
        );
    };

    const handleDeleteNode = (nodeId) => {
        updateGraph(
            nodes.filter(n => n.id !== nodeId),
            connections.filter(c => c.from !== nodeId && c.to !== nodeId)
        );
    };

    const handleUploadPhoto = (nodeId, photoData) => {
        updateGraph(
            nodes.map(n => n.id === nodeId ? { ...n, photo: photoData } : n)
        );
    };

    const handleRename = (node) => {
        const newName = prompt("请输入人物姓名:", node.name);
        if (newName) {
            updateGraph(
                nodes.map(n => n.id === node.id ? { ...n, name: newName } : n)
            );
        }
    };

    // Rename Connection Label
    const handleRenameConnection = (conn) => {
        const newLabel = prompt("请输入关系名称:", conn.label);
        if (newLabel) {
            updateGraph(
                undefined,
                connections.map(c => (c.from === conn.from && c.to === conn.to) ? { ...c, label: newLabel } : c)
            );
        }
    };

    const handleAnalyze = (node) => {
        if (node.photo) {
            if (window.confirm(`是否进入 ${node.name} 的详细分析界面？`)) {
                if (onSelectSubject) {
                    onSelectSubject(node);
                }
            }
        } else {
            alert("请先上传照片");
        }
    };

    // --- Drag Logic ---

    const handleMouseDown = (e, id) => {
        e.stopPropagation();
        draggingIdRef.current = id;
        const node = nodes.find(n => n.id === id);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            dragOffsetRef.current = {
                x: e.clientX - rect.left - node.x,
                y: e.clientY - rect.top - node.y
            };
            dragStartPositionRef.current = { x: e.clientX, y: e.clientY };
        }
    };

    // Start connecting from the "+" button
    const handleStartConnect = (e, nodeId) => {
        e.stopPropagation();
        setConnectingNodeId(nodeId);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const handleMouseMove = (e) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;

            if (connectingNodeId) {
                setMousePos({ x: relX, y: relY });
            } else if (draggingIdRef.current) {
                const id = draggingIdRef.current;
                const newX = relX - dragOffsetRef.current.x;
                const newY = relY - dragOffsetRef.current.y;

                updateGraph(
                    nodes.map(n => n.id === id ? { ...n, x: newX, y: newY } : n)
                );
            }
        }
    };

    const handleMouseUp = (e) => {
        if (connectingNodeId) {
            // Check if dropped on another node
            // We need to find if the mouse is over a node. 
            // Since we don't have easy access to the target element here without complex hit testing or event bubbling,
            // we'll rely on the node's onMouseUp to handle the "drop" if we want to be precise, 
            // OR we can just check distances.

            // Let's use distance check for simplicity
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const relX = e.clientX - rect.left;
                const relY = e.clientY - rect.top;

                const targetNode = nodes.find(n => {
                    if (n.id === connectingNodeId) return false;
                    const dx = n.x - relX;
                    const dy = n.y - relY;
                    return Math.sqrt(dx * dx + dy * dy) < 60; // Node radius approx
                });

                if (targetNode) {
                    // Create connection
                    // Check if exists
                    const exists = connections.some(c =>
                        (c.from === connectingNodeId && c.to === targetNode.id) ||
                        (c.from === targetNode.id && c.to === connectingNodeId)
                    );

                    if (!exists) {
                        updateGraph(
                            undefined,
                            [...connections, { from: connectingNodeId, to: targetNode.id, label: '关系' }]
                        );
                    }
                } else {
                    // If dropped on empty space, maybe create a new node?
                    // For now, just cancel.
                    // Or we can implement "Drag to empty space creates new node"
                    // handleAddNode(connectingNodeId); // Optional: enable this if desired
                }
            }
            setConnectingNodeId(null);
        }

        draggingIdRef.current = null;
    };

    const handleNodeClick = (node, e) => {
        const dist = Math.hypot(e.clientX - dragStartPositionRef.current.x, e.clientY - dragStartPositionRef.current.y);
        if (dist < 5) {
            return true;
        }
        return false;
    };

    const getOrthogonalPath = (x1, y1, x2, y2) => {
        const midX = (x1 + x2) / 2;
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    };

    const getMidPoint = (x1, y1, x2, y2) => {
        const midX = (x1 + x2) / 2;
        // The path goes (x1,y1) -> (midX,y1) -> (midX,y2) -> (x2,y2)
        // The vertical segment is at x=midX, from y1 to y2.
        // Midpoint of vertical segment:
        return { x: midX, y: (y1 + y2) / 2 };
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 bg-slate-50 relative overflow-hidden select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="absolute top-4 left-4 z-50 pointer-events-none">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    人物关系图谱 <span className="text-sm font-normal text-gray-500">(Mind Map)</span>
                </h2>
            </div>
            <button onClick={onBack} className="absolute top-4 right-4 z-50 bg-white px-3 py-1.5 rounded shadow-sm border border-gray-200 text-sm hover:bg-gray-50 cursor-pointer">
                返回分析
            </button>

            <div className="w-full h-full relative">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {connections.map((conn, idx) => {
                        const fromNode = nodes.find(n => n.id === conn.from);
                        const toNode = nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;

                        const path = getOrthogonalPath(fromNode.x, fromNode.y, toNode.x, toNode.y);
                        const mid = getMidPoint(fromNode.x, fromNode.y, toNode.x, toNode.y);

                        return (
                            <g key={idx}>
                                <path
                                    d={path}
                                    stroke="#EAB308"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Label Background */}
                                <rect
                                    x={mid.x - 20} y={mid.y - 10} width="40" height="20"
                                    fill="white" rx="4"
                                    className="pointer-events-auto cursor-pointer hover:stroke-amber-500"
                                    onClick={(e) => { e.stopPropagation(); handleRenameConnection(conn); }}
                                />
                                {/* Label Text */}
                                <text
                                    x={mid.x} y={mid.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[10px] font-bold fill-slate-600 pointer-events-none"
                                >
                                    {conn.label || '关系'}
                                </text>
                            </g>
                        );
                    })}

                    {/* Temporary Connection Line */}
                    {connectingNodeId && (() => {
                        const fromNode = nodes.find(n => n.id === connectingNodeId);
                        if (!fromNode) return null;
                        return (
                            <path
                                d={getOrthogonalPath(fromNode.x, fromNode.y, mousePos.x, mousePos.y)}
                                stroke="#EAB308"
                                strokeWidth="3"
                                strokeDasharray="5,5"
                                fill="none"
                                opacity="0.6"
                            />
                        );
                    })()}
                </svg>

                {nodes.map(node => (
                    <MindMapNode
                        key={node.id}
                        node={node}
                        onMouseDown={handleMouseDown}
                        onAdd={handleAddNode}
                        onStartConnect={handleStartConnect}
                        onDelete={handleDeleteNode}
                        onUpload={handleUploadPhoto}
                        onDoubleClick={handleAnalyze}
                        onRename={handleRename}
                        onClick={(e) => handleNodeClick(node, e)}
                    />
                ))}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 pointer-events-none">
                拖拽移动 • 拖拽+号连线 • 点击标签改名
            </div>
        </div>
    );
};

export default RelationshipMap;
