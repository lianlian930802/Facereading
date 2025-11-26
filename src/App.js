import React, { useState, useEffect, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import {
  User, Eye, Smile, Save, Upload, Activity,
  ZoomIn, ZoomOut, FlipHorizontal, RefreshCw, Target, Sparkles,
  Database, Trash2, Bot, ImagePlus,
  Zap, Star, AlertTriangle, Heart, // Added icons
  FileJson, FileDown, FileUp // Added icons for export/import
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import { fileToBase64 } from './utils/helpers';
import { VOCAB_LIBRARY } from './utils/constants';
import SelectionModal from './components/SelectionModal';
import ReferenceOverlay from './components/ReferenceOverlay';
import LocalFocusView from './components/LocalFocusView';
import InspectionModal from './components/InspectionModal';
import AnalysisSlider from './components/AnalysisSlider';
import EnergyBar from './components/EnergyBar';
import TagCategory from './components/TagCategory';
import RelationshipMap from './components/RelationshipMap';
import { Network } from 'lucide-react';

// Custom Tick Component for Radar Chart
const CustomPolarAngleAxisTick = ({ payload, x, y, cx, cy, ...rest }) => {
  const { value } = payload;

  let Icon = null;
  let color = '#64748b';

  if (value === '力量感') { Icon = Zap; color = '#f59e0b'; }
  else if (value === '卓越度') { Icon = Star; color = '#8b5cf6'; }
  else if (value === '谨慎感') { Icon = AlertTriangle; color = '#ef4444'; }
  else if (value === '共情力') { Icon = Heart; color = '#ec4899'; }

  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-15} y={-20} width={30} height={30}>
        <div className="flex flex-col items-center justify-center w-full h-full">
          {Icon && <Icon size={14} color={color} fill={color} fillOpacity={0.1} />}
        </div>
      </foreignObject>
      <text x={0} y={12} dy={0} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold">
        {value}
      </text>
    </g>
  );
};

// --- 主程序 ---
export default function FaceReadingApp() {
  const initialBasicInfo = { name: "请输入姓名", gender: "male", ageStage: 3, date: new Date().toISOString().slice(2, 10).replace(/-/g, ''), seq: "01", photo: null };
  const [basicInfo, setBasicInfo] = useState(initialBasicInfo);
  const initialImgState = { scale: 1, x: 0, y: 0, rotate: 0, flipH: false };
  const [imgState, setImgState] = useState(initialImgState);
  const [generatedID, setGeneratedID] = useState("");
  const [viewMode, setViewMode] = useState('analysis'); // 'analysis' | 'relationship'

  // Relationship Graph State (Global)
  const [relationshipGraph, setRelationshipGraph] = useState({
    nodes: [],
    connections: []
  });

  // Initialize graph with current subject if empty
  useEffect(() => {
    if (relationshipGraph.nodes.length === 0 && basicInfo.name) {
      setRelationshipGraph({
        nodes: [{
          id: 'subject',
          type: 'subject',
          name: basicInfo.name,
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2,
          photo: basicInfo.photo,
          imgState: imgState, // Pass current imgState
          relation: '本人'
        }],
        connections: []
      });
    }
  }, [relationshipGraph.nodes.length, basicInfo]);

  const [currentSubjectId, setCurrentSubjectId] = useState('subject');

  // Helper to save current state to graph
  const saveCurrentStateToGraph = () => {
    setRelationshipGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === currentSubjectId
          ? { ...n, imgState: { ...imgState }, photo: basicInfo.photo, name: basicInfo.name }
          : n
      )
    }));
  };

  // 微调状态：存储每个部位的独立偏移量 { x, y, scale }
  const [fineTuning, setFineTuning] = useState({
    'eyes': { x: 0, y: 0, scale: 1 },
    'right-eye': { x: 0, y: 0, scale: 1 },
    'left-eye': { x: 0, y: 0, scale: 1 },
    'right-face': { x: 0, y: 0, scale: 1 },
    'left-face': { x: 0, y: 0, scale: 1 },
  });

  // 处理微调的函数
  const handleFineTune = (focusKey, type, delta) => {
    setFineTuning(prev => {
      const current = prev[focusKey] || { x: 0, y: 0, scale: 1 };
      let newData = { ...current };

      if (type === 'moveX') newData.x += delta;
      if (type === 'moveY') newData.y += delta;
      if (type === 'scale') newData.scale = Math.max(0.5, newData.scale + delta);

      return { ...prev, [focusKey]: newData };
    });
  };
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const guideTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const rotateStartRef = useRef({ x: 0, initialAngle: 0 });

  const [mirrorView, setMirrorView] = useState({ right: false, left: false });
  const [inspectionModal, setInspectionModal] = useState({ isOpen: false, focus: null });

  // 弹窗状态
  const [modalState, setModalState] = useState({ isOpen: false, type: null, side: null, category: null });
  const [eyeText, setEyeText] = useState({ right: { anger: "", sadness: "", fear: "", note: "" }, left: { anger: "", sadness: "", fear: "", note: "" } });
  const [rightTraits, setRightTraits] = useState([]);
  const [leftTraits, setLeftTraits] = useState([]);
  const [rightNote, setRightNote] = useState("");
  const [leftNote, setLeftNote] = useState("");

  const initialMetrics = { rightEyeInOut: 7, rightEyeAnger: 2, rightEyeSadness: 1, rightEyeFear: 2, rightEyeStability: 6, leftEyeInOut: 3, leftEyeAnger: 3, leftEyeSadness: 4, leftEyeFear: 5, leftEyeStability: 4, eyeDepth: 5, rightFaceControl: 6, rightFaceDisgust: 8, leftFaceControl: 3, leftFaceDisgust: 5 };
  const [metrics, setMetrics] = useState(initialMetrics);
  const [availableTags, setAvailableTags] = useState(["明星", "演员", "杀人犯", "认识的人", "客户", "Gay", "Les", "国家领导人", "企业家", "艺术家", "普通职员", "学生"]);
  const [selectedTags, setSelectedTags] = useState(["主见强烈"]);
  const [savedRecords, setSavedRecords] = useState([]);
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => { const saved = localStorage.getItem('faceReadingDB'); if (saved) { try { setSavedRecords(JSON.parse(saved)); } catch (e) { console.error(e); } } }, []);

  const triggerGuides = () => { setShowGuides(true); if (guideTimeoutRef.current) clearTimeout(guideTimeoutRef.current); if (!isDragging && !isRotating) { guideTimeoutRef.current = setTimeout(() => setShowGuides(false), 1500); } };
  useEffect(() => { if (isDragging || isRotating) { setShowGuides(true); if (guideTimeoutRef.current) clearTimeout(guideTimeoutRef.current); } else { guideTimeoutRef.current = setTimeout(() => setShowGuides(false), 1000); } }, [isDragging, isRotating]);

  const handleSaveToDB = () => { if (!basicInfo.photo || basicInfo.name === "请输入姓名") { alert("请先上传照片并输入姓名"); return; } const newRecord = { id: Date.now(), saveTime: new Date().toLocaleString(), basicInfo, imgState, metrics, eyeText, generatedID, summary, rightTraits, leftTraits, rightNote, leftNote }; const updated = [newRecord, ...savedRecords]; try { localStorage.setItem('faceReadingDB', JSON.stringify(updated)); setSavedRecords(updated); alert("保存成功！"); } catch (e) { alert("保存失败：存储空间不足"); } };
  const loadRecord = (record) => { if (window.confirm(`确定要加载 "${record.basicInfo.name}" 的记录吗？`)) { setBasicInfo(record.basicInfo); setImgState(record.imgState || initialImgState); setMetrics(record.metrics || initialMetrics); setEyeText(record.eyeText || { right: { anger: "", sadness: "", fear: "", note: "" }, left: { anger: "", sadness: "", fear: "", note: "" } }); setSummary(record.summary || ""); setRightTraits(record.rightTraits || []); setLeftTraits(record.leftTraits || []); setRightNote(record.rightNote || ""); setLeftNote(record.leftNote || ""); } };
  const deleteRecord = (id, e) => { e.stopPropagation(); if (window.confirm("确定删除？")) { const updated = savedRecords.filter(r => r.id !== id); localStorage.setItem('faceReadingDB', JSON.stringify(updated)); setSavedRecords(updated); } };
  const handleImageUpload = async (event) => { const file = event.target.files[0]; if (file) { try { const base64Data = await fileToBase64(file); setBasicInfo({ ...basicInfo, photo: base64Data }); setImgState(initialImgState); } catch (error) { alert("图片处理失败"); } } };
  const handleDragStart = (e) => { if (!basicInfo.photo) return; setIsDragging(true); dragStartRef.current = { x: e.clientX - imgState.x, y: e.clientY - imgState.y }; };
  const handleRotateStart = (e) => { if (!basicInfo.photo) return; e.stopPropagation(); e.preventDefault(); setIsRotating(true); rotateStartRef.current = { x: e.clientX, initialAngle: imgState.rotate }; };
  const handleGlobalMouseMove = (e) => { if (isDragging) { e.preventDefault(); setImgState(prev => ({ ...prev, x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })); } else if (isRotating) { e.preventDefault(); const deltaX = e.clientX - rotateStartRef.current.x; setImgState(prev => ({ ...prev, rotate: rotateStartRef.current.initialAngle + (deltaX * 0.5) })); } };
  const handleGlobalMouseUp = () => { setIsDragging(false); setIsRotating(false); };
  const adjustScale = (delta) => { setImgState(s => ({ ...s, scale: Math.max(0.1, s.scale + delta) })); triggerGuides(); };

  // 动态 ID 生成逻辑 (v2.0 Strict 17-Digits Rule)
  useEffect(() => {
    // 1. Date (6 digits): YYMMDD
    const dateStr = basicInfo.date; // 假设格式已经是 YYMMDD

    // 2. Sequence (2 digits)
    const seqStr = basicInfo.seq;

    // 3. Gender & Age (1 digit)
    // Male: 0(Young) -> 4(Old), Female: 5(Young) -> 9(Old)
    let genderAgeVal = 0;
    if (basicInfo.gender === 'male') {
      genderAgeVal = Math.min(4, basicInfo.ageStage); // Ensure 0-4
    } else {
      genderAgeVal = Math.min(4, basicInfo.ageStage) + 5; // Ensure 5-9
    }

    // 4. Feature Codes (8 digits)
    // R-Eye-IO, L-Eye-IO, R-Ang, L-Ang, R-Sad, L-Sad, R-Fear, L-Fear
    const f1 = metrics.rightEyeInOut;
    const f2 = metrics.leftEyeInOut;
    const f3 = metrics.rightEyeAnger;
    const f4 = metrics.leftEyeAnger;
    const f5 = metrics.rightEyeSadness;
    const f6 = metrics.leftEyeSadness;
    const f7 = metrics.rightEyeFear;
    const f8 = metrics.leftEyeFear;
    // 注：Disgust 值因 17 位长度限制暂未包含，如需包含请扩展 ID 长度

    const finalID = `${dateStr}${seqStr}${genderAgeVal}${f1}${f2}${f3}${f4}${f5}${f6}${f7}${f8}`;
    setGeneratedID(finalID);

  }, [basicInfo, metrics]);

  const openEmotionModal = (side, category) => { setModalState({ isOpen: true, type: 'emotion', side, category }); };
  const openTraitModal = (side) => { setModalState({ isOpen: true, type: 'trait', side, category: null }); };
  const handleModalToggle = (item) => {
    const { type, side, category } = modalState;
    if (type === 'emotion') {
      const currentText = eyeText[side][category];
      const newText = currentText ? `${currentText} ${item}` : item;
      setEyeText({ ...eyeText, [side]: { ...eyeText[side], [category]: newText } });
    } else if (type === 'trait') {
      if (side === 'right') setRightTraits(prev => prev.includes(item) ? prev.filter(t => t !== item) : [...prev, item]);
      else setLeftTraits(prev => prev.includes(item) ? prev.filter(t => t !== item) : [...prev, item]);
    }
  };
  const getModalOptions = () => { if (modalState.type === 'emotion') return VOCAB_LIBRARY[modalState.category] || []; if (modalState.type === 'trait') return VOCAB_LIBRARY.traits; return []; };
  const getModalSelected = () => { if (modalState.type === 'trait') return modalState.side === 'right' ? rightTraits : leftTraits; return []; };
  const getModalColor = () => { if (modalState.category === 'anger') return 'red'; if (modalState.category === 'sadness') return 'indigo'; if (modalState.category === 'fear') return 'amber'; return 'blue'; };

  const generateAISummary = () => {
    const getLevel = (val) => {
      if (val <= 3) return "程度较低";
      if (val <= 6) return "程度中等";
      return "程度较高";
    };

    const getMetricDesc = (val, lowText, highText) => {
      if (val <= 3) return `${lowText}(${val})`;
      if (val <= 6) return `中等(${val})`;
      return `${highText}(${val})`;
    };

    let summaryText = "【AI 智能分析报告】\n\n";

    // 1. 核心人格与天赋 (Radar Chart)
    summaryText += "一、核心人格与天赋 (四维雷达)\n";
    summaryText += `1. 力量感 (Power): 社交展现-${getLevel(metrics.rightEyeAnger + 1)}, 真实需求-${getLevel(metrics.leftEyeAnger + 1)}\n`;
    summaryText += `2. 卓越度 (Excellence): 社交展现-${getLevel(metrics.rightFaceDisgust)}, 真实需求-${getLevel(metrics.leftFaceDisgust)}\n`;
    summaryText += `3. 谨慎感 (Caution): 社交展现-${getLevel(metrics.rightEyeFear + 2)}, 真实需求-${getLevel(metrics.leftEyeFear + 2)}\n`;
    summaryText += `4. 共情力 (Empathy): 社交展现-${getLevel(metrics.rightEyeSadness + 2)}, 真实需求-${getLevel(metrics.leftEyeSadness + 2)}\n\n`;

    // 2. 人际关系与沟通表达 (Energy Bars)
    summaryText += "二、人际关系与沟通表达\n";
    summaryText += `1. 社牛指数: ${getMetricDesc(metrics.rightEyeInOut, '内敛', '积极')}\n`;
    summaryText += `2. 价值体系: ${getMetricDesc(metrics.leftEyeInOut, '听从内心', '关注他人')}\n`;
    summaryText += `3. 宅人指数: ${getMetricDesc(metrics.leftEyeInOut, '享受独处', '享受链接')}\n`; // Note: Using leftEyeInOut as per existing code
    summaryText += `4. 社交方法: ${getMetricDesc(metrics.rightFaceControl, '直接诉求', '委婉暗示')}\n`;
    summaryText += `5. 社交理念: ${getMetricDesc(metrics.leftFaceControl, '情绪自由', '情绪管理')}\n`;
    summaryText += `6. 淡定程度: ${getMetricDesc(metrics.leftEyeStability, '平稳', '浓烈')}\n`;
    summaryText += `7. 人生追求: ${getMetricDesc(metrics.eyeDepth, '享受日常', '追求成长')}\n\n`;

    // 3. 核心优势与挑战 (Text Inputs)
    summaryText += "三、核心优势与挑战\n";
    if (strengths) summaryText += `[优势]: ${strengths}\n`;
    if (weaknesses) summaryText += `[挑战]: ${weaknesses}\n`;

    // 4. 详细备注 (Notes)
    summaryText += "\n四、详细备注\n";
    if (rightNote) summaryText += `[右脸备注]: ${rightNote}\n`;
    if (leftNote) summaryText += `[左脸备注]: ${leftNote}\n`;

    // Eye Emotions
    const rightEmotions = [];
    if (eyeText.right.anger) rightEmotions.push(`愤怒: ${eyeText.right.anger}`);
    if (eyeText.right.sadness) rightEmotions.push(`悲伤: ${eyeText.right.sadness}`);
    if (eyeText.right.fear) rightEmotions.push(`恐惧: ${eyeText.right.fear}`);
    if (eyeText.right.note) rightEmotions.push(`备注: ${eyeText.right.note}`);
    if (rightEmotions.length > 0) summaryText += `[右眼情绪]: ${rightEmotions.join(', ')}\n`;

    const leftEmotions = [];
    if (eyeText.left.anger) leftEmotions.push(`愤怒: ${eyeText.left.anger}`);
    if (eyeText.left.sadness) leftEmotions.push(`悲伤: ${eyeText.left.sadness}`);
    if (eyeText.left.fear) leftEmotions.push(`恐惧: ${eyeText.left.fear}`);
    if (eyeText.left.note) leftEmotions.push(`备注: ${eyeText.left.note}`);
    if (leftEmotions.length > 0) summaryText += `[左眼情绪]: ${leftEmotions.join(', ')}\n`;

    setSummary(summaryText);
  };

  const radarData = [{ subject: '力量感', A: metrics.rightEyeAnger + 1, B: metrics.leftEyeAnger + 1, fullMark: 10 }, { subject: '卓越度', A: metrics.rightFaceDisgust, B: metrics.leftFaceDisgust, fullMark: 10 }, { subject: '谨慎感', A: metrics.rightEyeFear + 2, B: metrics.leftEyeFear + 2, fullMark: 10 }, { subject: '共情力', A: metrics.rightEyeSadness + 2, B: metrics.leftEyeSadness + 2, fullMark: 10 }];

  // --- Export & Import Logic ---
  const [isExporting, setIsExporting] = useState(false);
  const jsonInputRef = useRef(null);

  const handleExportJSON = () => {
    const data = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      basicInfo,
      imgState,
      metrics,
      eyeText,
      strengths,
      weaknesses,
      summary,
      rightTraits,
      leftTraits,
      rightNote,
      leftNote,
      selectedTags
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${basicInfo.name || 'analysis'}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (window.confirm(`确定导入 "${data.basicInfo?.name || '未知'}" 的数据吗？当前未保存的内容将丢失。`)) {
          if (data.basicInfo) setBasicInfo(data.basicInfo);
          if (data.imgState) setImgState(data.imgState);
          if (data.metrics) setMetrics(data.metrics);
          if (data.eyeText) setEyeText(data.eyeText);
          if (data.strengths) setStrengths(data.strengths);
          if (data.weaknesses) setWeaknesses(data.weaknesses);
          if (data.summary) setSummary(data.summary);
          if (data.rightTraits) setRightTraits(data.rightTraits);
          if (data.leftTraits) setLeftTraits(data.leftTraits);
          if (data.rightNote) setRightNote(data.rightNote);
          if (data.leftNote) setLeftNote(data.leftNote);
          if (data.selectedTags) setSelectedTags(data.selectedTags);
          alert("导入成功！");
        }
      } catch (err) {
        alert("导入失败：文件格式错误");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    // Wait for render
    setTimeout(async () => {
      const pages = document.querySelectorAll('.pdf-page');
      if (pages.length === 0) {
        setIsExporting(false);
        return;
      }

      try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const canvas = await html2canvas(page, {
            scale: 2, // Higher resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`${basicInfo.name || 'report'}_analysis.pdf`);
      } catch (err) {
        console.error("PDF Export failed:", err);
        alert("导出 PDF 失败，请重试");
      } finally {
        setIsExporting(false);
      }
    }, 500); // Give time for the hidden container to render images
  };



  // 1. 主图容器 Ref
  const mainImageRef = useRef(null);

  // 2. 主图滚轮缩放逻辑
  useEffect(() => {
    const container = mainImageRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      adjustScale(delta);
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-800" onMouseMove={handleGlobalMouseMove} onMouseUp={handleGlobalMouseUp} onMouseLeave={handleGlobalMouseUp}>
      <InspectionModal
        isOpen={inspectionModal.isOpen}
        onClose={() => setInspectionModal({ ...inspectionModal, isOpen: false })}
        imageSrc={basicInfo.photo}
        imgState={imgState}
        focus={inspectionModal.focus}
        dims={inspectionModal.dims}
        fineTuning={fineTuning}
        onFineTune={handleFineTune}
        isMirrored={inspectionModal.focus?.includes('right') ? mirrorView.right : mirrorView.left}
      />
      <SelectionModal isOpen={modalState.isOpen} onClose={() => setModalState({ ...modalState, isOpen: false })} title={modalState.type === 'emotion' ? `${modalState.category === 'anger' ? '愤怒' : modalState.category === 'sadness' ? '悲伤' : '恐惧'}类词汇` : '选择性格特质'} options={getModalOptions()} selectedItems={getModalSelected()} onToggle={handleModalToggle} colorClass={getModalColor()} />

      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 shrink-0">
        <div className="p-4 border-b border-gray-200 bg-slate-900 text-white">
          <h1 className="text-lg font-bold tracking-wider flex items-center gap-2"><User size={18} /> FACE READING</h1>
          <p className="text-[10px] opacity-60 mt-0.5">Pro System v4.2</p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
          <div className="p-4 border-b border-gray-200">

            <div
              ref={mainImageRef}
              className="relative w-[304px] h-[380px] bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 group mx-auto shadow-inner transition-all select-none cursor-move"
              onMouseDown={handleDragStart}
            >
              {/* System ID Overlay */}
              <div className="absolute top-1 left-1 z-10 text-[10px] font-mono text-white/50 pointer-events-none select-none">
                ID: {generatedID}
              </div>

              {/* Face Labels */}
              <div className="absolute bottom-1 left-1 z-10 px-1.5 py-0.5 bg-black/20 backdrop-blur-[2px] rounded text-[8px] text-white/70 pointer-events-none select-none">
                右脸
              </div>
              <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 bg-black/20 backdrop-blur-[2px] rounded text-[8px] text-white/70 pointer-events-none select-none">
                左脸
              </div>
              {basicInfo.photo ? (
                <>
                  <div className="w-full h-full relative overflow-hidden">
                    <img
                      src={basicInfo.photo}
                      alt="Subject"
                      className="max-w-none max-h-none pointer-events-none"
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${imgState.x}px, ${imgState.y}px) scale(${imgState.scale}) rotate(${imgState.rotate}deg) scaleX(${imgState.flipH ? -1 : 1})`
                      }}
                    />
                  </div>
                  <ReferenceOverlay visible={showGuides} />

                  <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md rounded p-1 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-lg w-32"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-1 justify-between w-full px-1">
                      <button onClick={() => adjustScale(0.1)} className="text-white hover:text-blue-300"><ZoomIn size={12} /></button>
                      <button onClick={() => adjustScale(-0.1)} className="text-white hover:text-blue-300"><ZoomOut size={12} /></button>
                      <button onClick={() => fileInputRef.current.click()} className="text-white hover:text-green-400" title="更换图片"><ImagePlus size={12} /></button>
                      <button onClick={() => setImgState(initialImgState)} className="text-white hover:text-red-400"><RefreshCw size={12} /></button>
                      <button onClick={() => setImgState(s => ({ ...s, flipH: !s.flipH }))} className={`text-white hover:text-blue-300 ${imgState.flipH ? 'text-blue-400' : ''}`} title="主图翻转">
                        <FlipHorizontal size={12} />
                      </button>
                    </div>
                    <div
                      className={`w-full bg-white/10 rounded h-4 cursor-ew-resize flex items-center justify-center gap-1 hover:bg-white/20 ${isRotating ? 'bg-blue-600/50' : ''}`}
                      onMouseDown={handleRotateStart}
                    >
                      <span className="text-[8px] text-white font-mono">{Math.round(imgState.rotate)}°</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 cursor-pointer hover:text-blue-500 group-hover:bg-blue-50 transition-colors" onClick={() => fileInputRef.current.click()}>
                  <Upload size={24} className="mb-1" />
                  <span className="text-[10px]">上传照片 (304x380)</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase">Name</label><input type="text" value={basicInfo.name} onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })} className="w-full p-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:border-blue-500 outline-none font-medium" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Gender</label><div className="flex gap-1"><button onClick={() => setBasicInfo({ ...basicInfo, gender: 'male' })} className={`flex-1 py-1 text-[10px] rounded ${basicInfo.gender === 'male' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>男</button><button onClick={() => setBasicInfo({ ...basicInfo, gender: 'female' })} className={`flex-1 py-1 text-[10px] rounded ${basicInfo.gender === 'female' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}>女</button></div></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Age</label><div className="flex gap-0.5">{['幼', '少', '青', '中', '老'].map((label, idx) => (<button key={idx} onClick={() => setBasicInfo({ ...basicInfo, ageStage: idx })} className={`flex-1 py-1 text-[10px] rounded ${basicInfo.ageStage === idx ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>))}</div></div>
              </div>
            </div>



            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                <Database size={10} /> 身份标签
              </label>
              <TagCategory
                title="身份/职业/关系"
                tags={availableTags}
                selectedTags={selectedTags}
                onToggle={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                onAdd={(newTag) => {
                  if (!availableTags.includes(newTag)) {
                    setAvailableTags([...availableTags, newTag]);
                  }
                  if (!selectedTags.includes(newTag)) {
                    setSelectedTags([...selectedTags, newTag]);
                  }
                }}
                color="blue"
                allowCustom={true}
              />

              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">背景备注</label>
                  <button
                    className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-purple-200"
                    title={`搜索: ${basicInfo.name} ${selectedTags.join(' ')}`}
                  >
                    <Bot size={8} /> AI搜索履历
                  </button>
                </div>
                <textarea
                  className="w-full h-16 bg-yellow-50/50 border border-yellow-200 rounded p-2 text-[10px] resize-none focus:bg-white transition-colors"
                  placeholder="输入人物背景或点击AI搜索..."
                  value={rightNote} // Using rightNote as a placeholder for background note for now, or create a new state
                  onChange={(e) => setRightNote(e.target.value)}
                ></textarea>
              </div>

              <button
                onClick={() => {
                  saveCurrentStateToGraph();
                  setViewMode('relationship');
                }}
                className={`w-full mt-4 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded p-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors ${viewMode === 'relationship' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
                title="人物关系图谱"
              >
                <Network size={14} />
                人物关系图谱
              </button>
            </div>
          </div>

          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><Database size={12} />Saved Records</h2>
            <div className="space-y-2">
              {savedRecords.map(r => (
                <div key={r.id} className="bg-white p-2 border rounded text-xs flex items-center gap-2 cursor-pointer hover:shadow-sm" onClick={() => loadRecord(r)}>
                  <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden"><img src={r.basicInfo.photo} className="w-full h-full object-cover" alt="record" /></div>
                  <span className="flex-1 truncate">{r.basicInfo.name}</span>
                  <button onClick={(e) => deleteRecord(r.id, e)} className="text-gray-400 hover:text-red-500"><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>





      {viewMode === 'relationship' ? (
        <RelationshipMap
          basicInfo={basicInfo}
          graph={relationshipGraph}
          onUpdateGraph={setRelationshipGraph}
          onBack={() => setViewMode('analysis')}
          onSelectSubject={(node) => {
            // 1. Save current state (already saved when entering map, but good to be safe)
            // Actually, we are in map mode, so the state in App.js might be stale if we didn't update it?
            // No, imgState is preserved in App.js while in map mode.

            // 2. Load new state
            setCurrentSubjectId(node.id);
            setBasicInfo({
              ...basicInfo,
              name: node.name,
              photo: node.photo || basicInfo.photo
            });

            if (node.imgState) {
              setImgState(node.imgState);
            } else {
              // Reset to default if no saved state
              setImgState(initialImgState);
            }

            setViewMode('analysis');
          }}
        />
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <header className="bg-white border-b border-gray-200 h-12 flex items-center px-6 justify-between shrink-0 z-10">
            <div className="flex gap-6"><span className="text-blue-600 font-bold border-b-2 border-blue-600 h-12 flex items-center text-xs px-1">初级版 (Beginner)</span></div>
            <div className="flex gap-2">
              <button onClick={handleSaveToDB} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 flex items-center gap-1 text-xs font-medium transition-colors"><Save size={14} /> 保存</button>
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              <input type="file" ref={jsonInputRef} className="hidden" accept=".json" onChange={handleImportJSON} />
              <button onClick={() => jsonInputRef.current.click()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 flex items-center gap-1 text-xs font-medium transition-colors"><FileUp size={14} /> 导入</button>
              <button onClick={handleExportJSON} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 flex items-center gap-1 text-xs font-medium transition-colors"><FileJson size={14} /> 导出JSON</button>
              <button onClick={handleExportPDF} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-xs font-medium transition-colors shadow-sm"><FileDown size={14} /> 导出报告</button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {/* Hidden PDF Export Container */}
            {isExporting && (
              <div id="pdf-export-container" className="fixed top-0 left-0 z-[9999]">
                {/* Page 1: Profile & Radar */}
                <div className="pdf-page bg-white p-10 relative flex flex-col" style={{ width: '794px', height: '1123px' }}>
                  {/* Header */}
                  <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8 shrink-0">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><User size={28} /> FACE READING REPORT</h1>
                      <p className="text-sm text-slate-500 mt-1">Professional Analysis System v2.0</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Generated on</p>
                      <p className="text-sm font-medium text-slate-700">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Profile Section */}
                  <div className="flex gap-8 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 shrink-0">
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="w-40 h-[200px] bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200 relative">
                        {basicInfo.photo && (
                          <div className="w-full h-full relative overflow-hidden">
                            <img
                              src={basicInfo.photo}
                              alt="Profile"
                              className="max-w-none max-h-none"
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                // Sidebar is 304x380. PDF box is 160x200 (approx 0.526 scale)
                                // We apply the same transform logic but scale the container context
                                transform: `translate(-50%, -50%) translate(${imgState.x * 0.52}px, ${imgState.y * 0.52}px) scale(${imgState.scale * 0.52}) rotate(${imgState.rotate}deg) scaleX(${imgState.flipH ? -1 : 1})`
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-mono">ID: {generatedID}</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Name</p>
                          <p className="text-lg font-bold text-slate-800">{basicInfo.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Gender</p>
                          <p className="text-sm font-medium text-slate-700">{basicInfo.gender === 'male' ? 'Male (男)' : 'Female (女)'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold mb-1">Age Stage</p>
                          <p className="text-sm font-medium text-slate-700">{['幼年', '少年', '青年', '中年', '老年'][basicInfo.ageStage]}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-slate-200">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-2">Identity Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedTags.filter(t => t !== "主见强烈").map(tag => (
                            <span key={tag} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. Radar Chart */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                      <Target className="text-blue-600" size={20} /> 1. 核心人格与天赋 (Core Personality)
                    </h2>
                    <div className="flex-1 w-full flex justify-center items-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                          { subject: '力量感', A: metrics.rightEyeAnger + 1, B: metrics.leftEyeAnger + 1, fullMark: 10 },
                          { subject: '卓越度', A: metrics.rightFaceDisgust, B: metrics.leftFaceDisgust, fullMark: 10 },
                          { subject: '谨慎感', A: metrics.rightEyeFear + 2, B: metrics.leftEyeFear + 2, fullMark: 10 },
                          { subject: '共情力', A: metrics.rightEyeSadness + 2, B: metrics.leftEyeSadness + 2, fullMark: 10 }
                        ]}>
                          <PolarGrid stroke="#e2e8f0" gridType="polygon" />
                          <PolarAngleAxis dataKey="subject" tick={<CustomPolarAngleAxisTick />} />
                          <PolarRadiusAxis angle={30} domain={[0, 7]} tickCount={5} tick={false} axisLine={false} />
                          <Radar name="社交" dataKey="A" stroke="#f59e0b" strokeWidth={3} fill="#f59e0b" fillOpacity={0.2} isAnimationActive={false} />
                          <Radar name="真实" dataKey="B" stroke="#2563eb" strokeWidth={3} fill="#2563eb" fillOpacity={0.2} isAnimationActive={false} />
                        </RadarChart>
                      </ResponsiveContainer>
                      {/* Legend Overlay */}
                      <div className="absolute bottom-4 right-4 flex flex-col gap-2 text-xs bg-white/90 p-3 rounded border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> 真实需求 (True Self)</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-400 rounded-full"></span> 社交展现 (Social)</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Page 1 */}
                  <div className="mt-8 pt-4 border-t border-slate-200 text-center shrink-0">
                    <p className="text-xs text-slate-400">Face Reading Analysis System © 2024 - Page 1/3</p>
                  </div>
                </div>

                {/* Page 2: Energy Bars */}
                <div className="pdf-page bg-white p-10 relative flex flex-col mt-10" style={{ width: '794px', height: '1123px' }}>
                  {/* Header Small */}
                  <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-8 shrink-0">
                    <h1 className="text-sm font-bold text-slate-400 flex items-center gap-2">FACE READING REPORT</h1>
                    <p className="text-xs text-slate-400">{basicInfo.name} - {generatedID}</p>
                  </div>

                  {/* 2. Energy Bars */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                      <Activity className="text-amber-500" size={20} /> 2. 人际关系与沟通 (Interpersonal)
                    </h2>
                    <div className="flex flex-col gap-4 px-8 flex-1 justify-center">
                      <EnergyBar label="1. 社牛指数" value={metrics.rightEyeInOut} leftText="内敛" rightText="积极" colorClass="bg-blue-500" />
                      <EnergyBar label="2. 价值体系" value={metrics.leftEyeInOut} leftText="听从内心" rightText="关注他人" colorClass="bg-indigo-500" />
                      <EnergyBar label="3. 宅人指数" value={metrics.leftEyeInOut} leftText="享受独处" rightText="享受链接" colorClass="bg-teal-500" />
                      <EnergyBar label="4. 社交方法" value={metrics.rightFaceControl} leftText="直接诉求" rightText="委婉暗示" colorClass="bg-amber-500" />
                      <EnergyBar label="5. 社交理念" value={metrics.leftFaceControl} leftText="情绪自由" rightText="情绪管理" colorClass="bg-purple-500" />
                      <EnergyBar label="6. 淡定程度" value={metrics.leftEyeStability} leftText="平稳" rightText="浓烈" colorClass="bg-pink-500" />
                      <EnergyBar label="7. 人生追求" value={metrics.eyeDepth} leftText="享受日常" rightText="追求成长" colorClass="bg-cyan-500" />
                    </div>
                  </div>

                  {/* Footer Page 2 */}
                  <div className="mt-8 pt-4 border-t border-slate-200 text-center shrink-0">
                    <p className="text-xs text-slate-400">Face Reading Analysis System © 2024 - Page 2/3</p>
                  </div>
                </div>

                {/* Page 3: Summary */}
                <div className="pdf-page bg-white p-10 relative flex flex-col mt-10" style={{ width: '794px', height: '1123px' }}>
                  {/* Header Small */}
                  <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-8 shrink-0">
                    <h1 className="text-sm font-bold text-slate-400 flex items-center gap-2">FACE READING REPORT</h1>
                    <p className="text-xs text-slate-400">{basicInfo.name} - {generatedID}</p>
                  </div>

                  {/* 3. Summary */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
                      <Sparkles className="text-purple-500" size={20} /> 3. 汇总分析 (Summary Analysis)
                    </h2>
                    <div className="bg-slate-50 p-8 rounded-lg border border-slate-100 flex-1">
                      <p className="text-sm leading-loose text-slate-700 whitespace-pre-wrap font-medium text-justify">
                        {summary || "暂无生成总结..."}
                      </p>
                    </div>
                  </div>

                  {/* Footer Page 3 */}
                  <div className="mt-8 pt-4 border-t border-slate-200 text-center shrink-0">
                    <p className="text-xs text-slate-400">Face Reading Analysis System © 2024 - Page 3/3</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-6 max-w-[1400px] mx-auto">
              <div className="w-3/5 space-y-4 pb-10">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex gap-5">
                  <div className="w-[320px] shrink-0">
                    <LocalFocusView
                      imageSrc={basicInfo.photo}
                      imgState={imgState}
                      focus="eyes"
                      fineTuning={fineTuning}
                      onFineTune={handleFineTune}
                      onOpenModal={(focus, dims) => setInspectionModal({ isOpen: true, focus, dims })}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="bg-purple-100 p-1.5 rounded text-purple-600"><Eye size={16} /></div>
                      <h3 className="font-bold text-sm text-gray-800">眼睛深度 (Eye Depth)</h3>
                    </div>
                    <AnalysisSlider label="深度值" value={metrics.eyeDepth} onChange={(v) => setMetrics({ ...metrics, eyeDepth: v })} leftLabel="浅(当下)" rightLabel="深(成长)" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex gap-5">
                  <div className="w-[150px] shrink-0">
                    <LocalFocusView
                      imageSrc={basicInfo.photo}
                      imgState={imgState}
                      focus="right-eye"
                      fineTuning={fineTuning}
                      onFineTune={handleFineTune}
                      onOpenModal={(focus, dims) => setInspectionModal({ isOpen: true, focus, dims })}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                      <div className="bg-blue-100 p-1.5 rounded text-blue-600"><Eye size={16} /></div>
                      <h3 className="font-bold text-sm text-gray-800">右眼 (我眼中的世界)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                      <AnalysisSlider label="眼神内外" value={metrics.rightEyeInOut} onChange={(v) => setMetrics({ ...metrics, rightEyeInOut: v })} leftLabel="内向" rightLabel="外向" />
                      <AnalysisSlider label="稳定值" value={metrics.rightEyeStability} onChange={(v) => setMetrics({ ...metrics, rightEyeStability: v })} leftLabel="波动" rightLabel="稳定" />
                      <AnalysisSlider label="愤怒值" value={metrics.rightEyeAnger} onChange={(v) => setMetrics({ ...metrics, rightEyeAnger: v })} />
                      <AnalysisSlider label="恐惧值" value={metrics.rightEyeFear} onChange={(v) => setMetrics({ ...metrics, rightEyeFear: v })} />
                      <AnalysisSlider label="悲伤值" value={metrics.rightEyeSadness} onChange={(v) => setMetrics({ ...metrics, rightEyeSadness: v })} />
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('right', 'anger')} className="shrink-0 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 border border-red-200">😡 愤怒类</button>
                        <input type="text" value={eyeText.right.anger} onChange={(e) => setEyeText({ ...eyeText, right: { ...eyeText.right, anger: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-red-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('right', 'sadness')} className="shrink-0 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded hover:bg-indigo-100 border border-indigo-200">😢 悲伤类</button>
                        <input type="text" value={eyeText.right.sadness} onChange={(e) => setEyeText({ ...eyeText, right: { ...eyeText.right, sadness: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-indigo-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('right', 'fear')} className="shrink-0 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded hover:bg-amber-100 border border-amber-200">😨 恐惧类</button>
                        <input type="text" value={eyeText.right.fear} onChange={(e) => setEyeText({ ...eyeText, right: { ...eyeText.right, fear: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-amber-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <textarea className="w-full h-10 p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none resize-none mt-1" placeholder="补充词..." value={eyeText.right.note} onChange={e => setEyeText({ ...eyeText, right: { ...eyeText.right, note: e.target.value } })}></textarea>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex gap-5">
                  <div className="w-[150px] shrink-0">
                    <LocalFocusView
                      imageSrc={basicInfo.photo}
                      imgState={imgState}
                      focus="left-eye"
                      fineTuning={fineTuning}
                      onFineTune={handleFineTune}
                      onOpenModal={(focus, dims) => setInspectionModal({ isOpen: true, focus, dims })}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                      <div className="bg-indigo-100 p-1.5 rounded text-indigo-600"><Eye size={16} /></div>
                      <h3 className="font-bold text-sm text-gray-800">左眼 (我如何看待自己)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                      <AnalysisSlider label="眼神内外" value={metrics.leftEyeInOut} onChange={(v) => setMetrics({ ...metrics, leftEyeInOut: v })} leftLabel="内向" rightLabel="外向" />
                      <AnalysisSlider label="稳定值" value={metrics.leftEyeStability} onChange={(v) => setMetrics({ ...metrics, leftEyeStability: v })} leftLabel="波动" rightLabel="稳定" />
                      <AnalysisSlider label="愤怒值" value={metrics.leftEyeAnger} onChange={(v) => setMetrics({ ...metrics, leftEyeAnger: v })} />
                      <AnalysisSlider label="恐惧值" value={metrics.leftEyeFear} onChange={(v) => setMetrics({ ...metrics, leftEyeFear: v })} />
                      <AnalysisSlider label="悲伤值" value={metrics.leftEyeSadness} onChange={(v) => setMetrics({ ...metrics, leftEyeSadness: v })} />
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('left', 'anger')} className="shrink-0 px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded hover:bg-red-100 border border-red-200">😡 愤怒类</button>
                        <input type="text" value={eyeText.left.anger} onChange={(e) => setEyeText({ ...eyeText, left: { ...eyeText.left, anger: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-red-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('left', 'sadness')} className="shrink-0 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded hover:bg-indigo-100 border border-indigo-200">😢 悲伤类</button>
                        <input type="text" value={eyeText.left.sadness} onChange={(e) => setEyeText({ ...eyeText, left: { ...eyeText.left, sadness: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-indigo-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEmotionModal('left', 'fear')} className="shrink-0 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded hover:bg-amber-100 border border-amber-200">😨 恐惧类</button>
                        <input type="text" value={eyeText.left.fear} onChange={(e) => setEyeText({ ...eyeText, left: { ...eyeText.left, fear: e.target.value } })} className="flex-1 text-xs border-b border-gray-200 focus:border-amber-400 outline-none py-1 bg-transparent" placeholder="选择或输入..." />
                      </div>
                      <textarea className="w-full h-10 p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none resize-none mt-1" placeholder="补充词..." value={eyeText.left.note} onChange={e => setEyeText({ ...eyeText, left: { ...eyeText.left, note: e.target.value } })}></textarea>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex gap-5 items-start">
                      <div className="w-[320px] shrink-0">
                        <LocalFocusView
                          imageSrc={basicInfo.photo}
                          imgState={imgState}
                          focus="right-face"
                          fineTuning={fineTuning}
                          onFineTune={handleFineTune}
                          isMirrored={mirrorView.right}
                          onMirrorToggle={() => setMirrorView(prev => ({ ...prev, right: !prev.right }))}
                          showMirrorBtn={true}
                          onOpenModal={(focus, dims) => setInspectionModal({ isOpen: true, focus, dims })}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-amber-100 p-1.5 rounded text-amber-600"><Smile size={16} /></div>
                            <h3 className="font-bold text-sm text-gray-800">右脸 (社交工具箱)</h3>
                          </div>
                          <button onClick={() => openTraitModal('right')} className="text-[10px] flex items-center gap-1 text-amber-600 border border-amber-200 px-2 py-1 rounded hover:bg-amber-50">
                            <Sparkles size={12} /> 性格特质 ({rightTraits.length})
                          </button>
                        </div>
                        <AnalysisSlider label="操控值" value={metrics.rightFaceControl} onChange={(v) => setMetrics({ ...metrics, rightFaceControl: v })} leftLabel="操控" rightLabel="压抑" subLabel="中间: 得意" />
                        <AnalysisSlider label="厌恶值" subLabel="*报告: 卓越度" value={metrics.rightFaceDisgust} onChange={(v) => setMetrics({ ...metrics, rightFaceDisgust: v })} />
                        {rightTraits.length > 0 && <div className="mb-3 flex flex-wrap gap-1">{rightTraits.map(t => <span key={t} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{t}</span>)}</div>}
                        <textarea className="w-full h-12 p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none resize-none" placeholder="右脸备注..." value={rightNote} onChange={e => setRightNote(e.target.value)}></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex gap-5 items-start">
                      <div className="w-[320px] shrink-0">
                        <LocalFocusView
                          imageSrc={basicInfo.photo}
                          imgState={imgState}
                          focus="left-face"
                          fineTuning={fineTuning}
                          onFineTune={handleFineTune}
                          isMirrored={mirrorView.left}
                          onMirrorToggle={() => setMirrorView(prev => ({ ...prev, left: !prev.left }))}
                          showMirrorBtn={true}
                          onOpenModal={(focus, dims) => setInspectionModal({ isOpen: true, focus, dims })}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-emerald-100 p-1.5 rounded text-emerald-600"><Smile size={16} /></div>
                            <h3 className="font-bold text-sm text-gray-800">左脸 (真实自己)</h3>
                          </div>
                          <button onClick={() => openTraitModal('left')} className="text-[10px] flex items-center gap-1 text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50">
                            <Sparkles size={12} /> 性格特质 ({leftTraits.length})
                          </button>
                        </div>
                        <AnalysisSlider label="操控值" value={metrics.leftFaceControl} onChange={(v) => setMetrics({ ...metrics, leftFaceControl: v })} leftLabel="操控" rightLabel="压抑" subLabel="中间: 得意" />
                        <AnalysisSlider label="厌恶值" subLabel="*报告: 卓越度" value={metrics.leftFaceDisgust} onChange={(v) => setMetrics({ ...metrics, leftFaceDisgust: v })} />
                        {leftTraits.length > 0 && <div className="mb-3 flex flex-wrap gap-1">{leftTraits.map(t => <span key={t} className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">{t}</span>)}</div>}
                        <textarea className="w-full h-12 p-2 bg-gray-50 border border-gray-200 rounded text-xs outline-none resize-none" placeholder="左脸备注..." value={leftNote} onChange={e => setLeftNote(e.target.value)}></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-2/5 space-y-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative">
                  <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-4"><Target size={16} className="text-blue-600" /> 1. 核心人格与天赋</h2>
                  <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" gridType="polygon" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={<CustomPolarAngleAxisTick />}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 10]}
                          tickCount={6} // 0, 2, 4, 6, 8, 10
                          tick={false}
                          axisLine={false}
                        />
                        <Radar name="社交" dataKey="A" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b" fillOpacity={0.2} />
                        <Radar name="真实" dataKey="B" stroke="#2563eb" strokeWidth={2} fill="#2563eb" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute bottom-2 right-4 flex flex-col gap-1 text-[10px] bg-white/80 p-2 rounded backdrop-blur-sm border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded-full"></span> 真实需求 (True Self)</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full"></span> 社交展现 (Social)</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2 mb-5"><Activity size={16} className="text-amber-500" /> 2. 人际关系与沟通表达</h2>
                  <EnergyBar label="1. 社牛指数" value={metrics.rightEyeInOut} leftText="内敛" rightText="积极" colorClass="bg-blue-500" />
                  <EnergyBar label="2. 价值体系" value={metrics.leftEyeInOut} leftText="听从内心" rightText="关注他人" colorClass="bg-indigo-500" />
                  <EnergyBar label="3. 宅人指数" value={metrics.leftEyeInOut} leftText="享受独处" rightText="享受链接" colorClass="bg-teal-500" />
                  <EnergyBar label="4. 社交方法" value={metrics.rightFaceControl} leftText="直接诉求" rightText="委婉暗示" colorClass="bg-amber-500" />
                  <EnergyBar label="5. 社交理念" value={metrics.leftFaceControl} leftText="情绪自由" rightText="情绪管理" colorClass="bg-purple-500" />
                  <EnergyBar label="6. 淡定程度" value={metrics.leftEyeStability} leftText="平稳" rightText="浓烈" colorClass="bg-pink-500" />
                  <EnergyBar label="7. 人生追求" value={metrics.eyeDepth} leftText="享受日常" rightText="追求成长" colorClass="bg-cyan-500" />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Sparkles size={16} className="text-purple-500" /> 3. 核心优势与挑战</h2>
                    <button onClick={generateAISummary} className="text-[10px] flex items-center gap-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-full shadow hover:opacity-90 transition-opacity"><Bot size={12} /> AI 生成总结</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] font-bold text-white bg-amber-400 px-2 py-0.5 rounded-t inline-block">优势</div>
                      <textarea
                        className="w-full h-20 p-2 bg-gray-50 border border-gray-200 rounded-b rounded-tr text-xs resize-none focus:border-blue-500 outline-none"
                        placeholder="请输入优势..."
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                      ></textarea>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white bg-slate-500 px-2 py-0.5 rounded-t inline-block">挑战</div>
                      <textarea
                        className="w-full h-20 p-2 bg-gray-50 border border-gray-200 rounded-b rounded-tr text-xs resize-none focus:border-blue-500 outline-none"
                        placeholder="请输入挑战..."
                        value={weaknesses}
                        onChange={(e) => setWeaknesses(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                  <div><div className="text-[10px] font-bold text-gray-500 mb-1">总结描述</div><textarea className="w-full h-24 p-2 bg-gray-50 border border-gray-200 rounded text-xs resize-none focus:border-blue-500 outline-none leading-relaxed" placeholder="请输入或点击上方AI生成..." value={summary} onChange={(e) => setSummary(e.target.value)}></textarea></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}