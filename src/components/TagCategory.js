import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const TagCategory = ({ title, tags, selectedTags, onToggle, onAdd, color = "blue", allowCustom = false }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTag, setNewTag] = useState("");

    const colorStyles = {
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        red: "bg-red-50 text-red-700 border-red-200",
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-200"
    };

    const handleAdd = () => {
        if (newTag.trim()) {
            onAdd(newTag.trim());
            setNewTag("");
            setIsAdding(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleAdd();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
            setNewTag("");
        }
    };

    return (
        <div className="mb-4">
            <h4 className="text-[10px] font-bold text-gray-400 mb-2 uppercase flex items-center gap-1">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => onToggle(tag)}
                        className={`px-2 py-0.5 text-[10px] rounded border transition-all ${selectedTags.includes(tag) ? `${colorStyles[color]} shadow-sm font-bold` : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
                    >
                        {selectedTags.includes(tag) && "✓ "}{tag}
                    </button>
                ))}

                {allowCustom && (
                    isAdding ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="w-20 px-1 py-0.5 text-[10px] border border-blue-300 rounded outline-none focus:ring-1 focus:ring-blue-200"
                                placeholder="新标签..."
                                onBlur={() => {
                                    if (!newTag.trim()) setIsAdding(false);
                                }}
                            />
                            <button onClick={handleAdd} className="text-blue-600 hover:text-blue-800"><Plus size={12} /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-2 py-0.5 text-[10px] rounded border border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500 flex items-center gap-1 transition-colors"
                        >
                            <Plus size={10} /> 添加
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default TagCategory;
