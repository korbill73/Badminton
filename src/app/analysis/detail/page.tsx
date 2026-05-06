'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import YoutubePlayer from '@/components/match/YoutubePlayer';
import { 
    Settings2, Trash2, Activity, Clock, FastForward,
    Circle, CheckCircle, X, Plus, Save, Target, 
    RotateCcw, ListFilter, CheckSquare, Square, ListOrdered,
    BarChart3, Video, RefreshCcw, Maximize2, Layers, ChevronLeft, ChevronRight, PlayCircle, StopCircle, Loader2, RotateCw, SquarePen, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MatchModal from '@/components/match/MatchModal';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-[#080d1a] h-screen flex flex-col items-center justify-center text-rose-500 font-black">
          <h1 className="text-3xl mb-4 underline">RECOVERY ACTIVE</h1>
          <p className="text-xl font-mono">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl shadow-xl uppercase">Reboot</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Helpers ---
const parseScore = (score: any) => {
    if (!score) return [0, 0];
    const parts = String(score).split('-');
    return parts.length === 2 ? parts.map(Number) : [0, 0];
};

const parseTimeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return Number(timeStr) || 0;
};

const formatTime = (seconds: any) => {
    const secs = Math.max(0, Math.floor(Number(seconds) || 0));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Category Modal ---
const CategoryModal = ({ isOpen, onClose, winCats, lossCats, onSave }: any) => {
    const [localWin, setLocalWin] = useState(winCats);
    const [localLoss, setLocalLoss] = useState(lossCats);
    const [newGroupTitle, setNewGroupTitle] = useState('');
    useEffect(() => {
        if (isOpen) {
            setLocalWin(JSON.parse(JSON.stringify(winCats)));
            setLocalLoss(JSON.parse(JSON.stringify(lossCats)));
        }
    }, [isOpen, winCats, lossCats]);
    if (!isOpen) return null;

    const addItem = (type: 'win' | 'loss', gIdx: number) => {
        const target = type === 'win' ? [...localWin] : [...localLoss];
        target[gIdx].items.push('새 항목');
        if (type === 'win') setLocalWin(target); else setLocalLoss(target);
    };
    const removeItem = (type: 'win' | 'loss', gIdx: number, iIdx: number) => {
        const target = type === 'win' ? [...localWin] : [...localLoss];
        target[gIdx].items.splice(iIdx, 1);
        if (type === 'win') setLocalWin(target); else setLocalLoss(target);
    };
    const updateItem = (type: 'win' | 'loss', gIdx: number, iIdx: number, val: string) => {
        const target = type === 'win' ? [...localWin] : [...localLoss];
        target[gIdx].items[iIdx] = val;
        if (type === 'win') setLocalWin(target); else setLocalLoss(target);
    };
    const addGroup = (type: 'win' | 'loss') => {
        if (!newGroupTitle) return;
        const target = type === 'win' ? [...localWin] : [...localLoss];
        target.push({ group: newGroupTitle, items: [] });
        if (type === 'win') setLocalWin(target); else setLocalLoss(target);
        setNewGroupTitle('');
    };
    const removeGroup = (type: 'win' | 'loss', gIdx: number) => {
        const target = type === 'win' ? [...localWin] : [...localLoss];
        target.splice(gIdx, 1);
        if (type === 'win') setLocalWin(target); else setLocalLoss(target);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4 backdrop-blur-3xl overflow-hidden font-sans">
            <div className="bg-[#0b1221] border-2 border-white/10 w-[96vw] max-w-[1800px] h-[92vh] rounded-[3rem] p-8 flex flex-col gap-6 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Settings2 className="w-8 h-8 text-cyan-400" />
                        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Tactical Manager</h2>
                    </div>
                    <button onClick={onClose} className="p-2 border border-white/10 rounded-xl hover:bg-rose-600 transition-all"><X className="w-6 h-6 text-white" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center gap-4 mb-6 sticky top-0 z-10 backdrop-blur-md">
                        <input value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} placeholder="새 카테고리 그룹 이름..." className="flex-1 bg-black/40 border-2 border-white/10 rounded-xl p-3 text-white font-black text-sm outline-none focus:border-cyan-400" />
                        <button onClick={() => addGroup('win')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-blue-500 shadow-lg"><Plus className="w-4 h-4" /> 득점 그룹 추가</button>
                        <button onClick={() => addGroup('loss')} className="px-6 py-3 bg-rose-600 text-white rounded-xl font-black text-xs flex items-center gap-2 hover:bg-rose-500 shadow-lg"><Plus className="w-4 h-4" /> 실점 그룹 추가</button>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-yellow-400 uppercase tracking-widest border-b-2 border-yellow-400/30 pb-2">SCORE WIN (ME)</h3>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {localWin.map((g: any, gIdx: number) => (
                                    <div key={gIdx} className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between border-b border-blue-500/10 pb-2">
                                            <span className="text-sm font-black text-white">{g.group}</span>
                                            <button onClick={() => removeGroup('win', gIdx)} className="p-1 text-white/20 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {g.items.map((item: string, iIdx: number) => (
                                                <div key={iIdx} className="flex items-center gap-2 bg-blue-600/30 border border-blue-400/20 rounded-lg py-1.5 px-3 shrink-0">
                                                    <input value={item} onChange={e => updateItem('win', gIdx, iIdx, e.target.value)} className="bg-transparent text-white text-[11px] font-black outline-none w-20" />
                                                    <button onClick={() => removeItem('win', gIdx, iIdx)} className="text-white/20 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => addItem('win', gIdx)} className="p-1.5 bg-blue-600/50 border border-blue-400/30 rounded-lg text-white hover:bg-blue-500"><Plus className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest border-b-2 border-white/30 pb-2">LOSS LOG (OPP)</h3>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {localLoss.map((g: any, gIdx: number) => (
                                    <div key={gIdx} className="bg-rose-900/10 border border-rose-500/20 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
                                            <span className="text-sm font-black text-white">{g.group}</span>
                                            <button onClick={() => removeGroup('loss', gIdx)} className="p-1 text-white/20 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {g.items.map((item: string, iIdx: number) => (
                                                <div key={iIdx} className="flex items-center gap-2 bg-rose-600/30 border border-rose-500/20 rounded-lg py-1.5 px-3 shrink-0">
                                                    <input value={item} onChange={e => updateItem('loss', gIdx, iIdx, e.target.value)} className="bg-transparent text-white text-[11px] font-black outline-none w-20" />
                                                    <button onClick={() => removeItem('loss', gIdx, iIdx)} className="text-white/20 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => addItem('loss', gIdx)} className="p-1.5 bg-rose-600/50 border border-rose-500/30 rounded-lg text-white hover:bg-blue-500"><Plus className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 flex gap-4">
                    <button onClick={onClose} className="w-[180px] py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black hover:bg-white/10 italic">CANCEL</button>
                    <button onClick={() => { onSave(localWin, localLoss); onClose(); }} className="flex-1 py-4 bg-cyan-500 text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:bg-cyan-400 italic">
                        <Save className="w-5 h-5" /> APPLY ALL STRATEGIC CHANGES
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Mobile Cinema Mode Component ---
const AnalysisMobileView = ({ 
    match, onClose, logs, activeLoop, isSequential, setIsSequential, 
    isAutoNext, setIsAutoNext, setSequentialIndex, startRallyLoop, 
    sequentialIndex, formatTime, isPlayerReady, setIsPlayerReady, playerRef, rallyLoops,
    currentSet, setCurrentSet, batchSelect, playbackMode
}: any) => {
    if (!match) return null; // 방어 로직 추가

    const [showControls, setShowControls] = useState(true);
    const [activeFilter, setActiveFilter] = useState('전체');

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const onReady = (player: any) => {
        setIsPlayerReady(true);
        // CRITICAL: Update the parent's playerRef so the control logic (setInterval) 
        // in the parent can control this mobile player instance.
        if (playerRef) {
            playerRef.current = player;
        }
    };

    const filters = ['전체', '득점', '실점'];

    const getFilteredLogs = (filter: string) => {
        if (!logs || !Array.isArray(logs)) return [];
        if (filter === '전체') return logs;
        if (filter === '득점') return logs.filter((l: any) => l.is_my_point);
        if (filter === '실점') return logs.filter((l: any) => !l.is_my_point);
        return logs;
    };

    const currentFilteredLogs = getFilteredLogs(activeFilter);

    return (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col landscape:flex-row overflow-hidden text-white">
            <div className="flex-1 relative bg-black flex items-center justify-center" onClick={() => setShowControls(!showControls)}>
                <div className="w-full h-full">
                    <YoutubePlayer videoId={match?.youtube_video_id || ''} onPlayerReady={onReady} />
                </div>
                {!isPlayerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                )}
            </div>

            <div className={cn(
                "hidden portrait:flex absolute top-0 left-0 right-0 p-5 pt-10 items-center justify-between z-40 transition-all duration-500 bg-gradient-to-b from-black/80 to-transparent",
                !showControls && "opacity-0 -translate-y-4"
            )}>
                <div className="flex flex-col">
                    <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-0.5">{activeFilter === '전체' ? '경기 전체 분석' : `${activeFilter} 집중 분석`}</h2>
                    <p className="text-[10px] font-black text-white/40 tracking-[0.2em]">MOBILE CINEMA MODE</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onClose} className="p-2.5 bg-rose-600 text-white rounded-full"><X className="w-5 h-5" /></button>
                    <button onClick={toggleFullScreen} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20">
                        <Maximize2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className={cn(
                "z-50 bg-gradient-to-t from-black to-black/80 backdrop-blur-xl border-white/10 transition-all duration-500 transform",
                "portrait:absolute portrait:bottom-0 portrait:left-0 portrait:right-0 portrait:p-4 portrait:pb-6 portrait:rounded-t-[2.5rem] portrait:border-t",
                !showControls && "portrait:translate-y-full",
                "landscape:relative landscape:w-[160px] landscape:h-full landscape:border-l landscape:p-2 landscape:flex landscape:flex-col landscape:gap-2",
                !showControls && "landscape:translate-x-full"
            )}>
                <div className="portrait:absolute portrait:top-2 portrait:left-1/2 portrait:-translate-x-1/2 portrait:w-12 portrait:h-1 portrait:bg-white/10 portrait:rounded-full" />
                
                <div className="flex-1 flex flex-col gap-2.5 landscape:gap-1.5 portrait:mt-2">
                    {/* Landscape Top Actions */}
                    <div className="hidden landscape:flex items-center justify-between mb-1 px-1">
                        <button onClick={onClose} className="p-2 bg-rose-600/20 text-rose-500 rounded-lg border border-rose-500/30 active:scale-90 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                        <button onClick={toggleFullScreen} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 active:scale-90 transition-all">
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {[1, 2, 3].map(setNum => {
                        // 3세트가 00:00이면 2세트에서 끝난 것이므로 표시하지 않음
                        if (setNum === 3 && match?.set_3_start === '00:00') return null;
                        
                        return (
                            <button
                                key={setNum}
                                onClick={() => {
                                    setCurrentSet(setNum);
                                    setIsSequential(false);
                                }}
                                className={cn(
                                    "px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap border shrink-0",
                                    currentSet === setNum
                                        ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                                        : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                                )}
                            >
                                {setNum}세트
                            </button>
                        );
                    })}
                    </div>

                    <div className="grid grid-cols-3 gap-2 landscape:gap-1 w-full">
                        {filters.map((f: string) => {
                            const count = getFilteredLogs(f).length;
                            const isActive = activeFilter === f;
                            return (
                                <button 
                                    key={f} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFilter(f);
                                        
                                        // Update parent selection for automatic transitions
                                        if (f === '전체') batchSelect('all');
                                        else if (f === '득점') batchSelect('wins');
                                        else if (f === '실점') batchSelect('losses');

                                        const filtered = getFilteredLogs(f);
                                        if (filtered.length > 0) {
                                            setIsSequential(true);
                                            setSequentialIndex(0);
                                            startRallyLoop(filtered[0], true);
                                        }
                                    }}
                                    className={cn(
                                        "py-2 landscape:py-1.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95",
                                        isActive 
                                            ? "bg-blue-600 border-blue-400 text-white" 
                                            : "bg-white/5 border-white/10 text-white/40"
                                    )}
                                >
                                    <span className="text-[11px] landscape:text-[10px] font-black">{f}</span>
                                    <span className={cn("text-[10px] landscape:text-[8px] font-black", isActive ? "text-blue-200" : "text-white/20")}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2.5 landscape:gap-1">
                        <button 
                            onClick={() => {
                                if (currentFilteredLogs.length === 0) return;
                                const prevIdx = (sequentialIndex - 1 + currentFilteredLogs.length) % currentFilteredLogs.length;
                                setSequentialIndex(prevIdx);
                                startRallyLoop(currentFilteredLogs[prevIdx], true);
                            }}
                            className="p-3 landscape:p-1.5 bg-white/5 rounded-xl border border-white/10 flex-1 flex justify-center active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5 landscape:w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                if (isSequential) {
                                    // If in sequence, switch to individual loop
                                    setIsSequential(false);
                                    setIsAutoNext(true);
                                } else {
                                    // If in individual loop, switch back to sequence
                                    setIsSequential(true);
                                    setIsAutoNext(false);
                                }
                            }}
                            className={cn(
                                "px-4 py-3 landscape:py-1.5 rounded-xl font-black text-xs landscape:text-[8px] border transition-all flex-[2] flex items-center justify-center gap-2 landscape:gap-1 active:scale-95",
                                isSequential ? "bg-emerald-600 border-emerald-400 text-white" : "bg-amber-600 border-amber-400 text-white"
                            )}
                        >
                            {isSequential ? <RefreshCcw className="w-4 h-4 landscape:w-3 h-3" /> : <RotateCcw className="w-4 h-4 landscape:w-3 h-3" />}
                            {isSequential ? '전체 연속' : '현재 반복'}
                        </button>
                        <button 
                            onClick={() => {
                                if (currentFilteredLogs.length === 0) return;
                                const nextIdx = (sequentialIndex + 1) % currentFilteredLogs.length;
                                setSequentialIndex(nextIdx);
                                startRallyLoop(currentFilteredLogs[nextIdx], true);
                            }}
                            className="p-3 landscape:p-1.5 bg-blue-600/30 rounded-xl border border-blue-400/20 flex-1 flex justify-center active:scale-95"
                        >
                            <ChevronRight className="w-5 h-5 landscape:w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); setShowControls(true); }}
                className={cn(
                    "absolute z-[60] p-4 bg-blue-600/80 backdrop-blur-md text-white rounded-full shadow-2xl border border-white/20 transition-all duration-500",
                    "portrait:bottom-6 portrait:left-1/2 portrait:-translate-x-1/2",
                    "landscape:right-6 landscape:top-1/2 landscape:-translate-y-1/2",
                    showControls ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
                )}
            >
                <Layers className="w-6 h-6" />
            </button>
        </div>
    );
};

// --- Cockpit Page ---
const INITIAL_WIN = [{ group: '스매시', items: ['직선 스매시', '대각 스매시', '반 스매시', '스매시 + 푸시'] }, { group: '드롭', items: ['직선', '대각(크로스)'] }, { group: '네트 플레이', items: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬'] }, { group: '기타 공격', items: ['드라이브', '클리어 공격', '롱서브', '행운의 득점'] }, { group: '상대 에러', items: ['언더 에러', '스매시 에러', '서브 에러', '클리어 에러', '기본기 에러', '백핸드 에러'] }];
const INITIAL_LOSS = [{ group: '상대 공격 득점', items: ['스매시', '대각 스매시', '헤어핀', '크 헤어핀', '드롭', '헤 + 푸시'] }, { group: '전술 당함', items: ['페인트 모션', '코스 속임수', '템포 변화', '빽공략 + 공격'] }, { group: '나의 에러', items: ['스매시 에러', '드롭 에러', '언더 에러', '헤어핀 에러', '클리어 에러', '기본기 에러'] }];

function CockpitAnalysisContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawMatchId = searchParams.get('id');
    const matchId = rawMatchId ? String(rawMatchId).trim() : null;
    
    const [match, setMatch] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSet, setCurrentSet] = useState(1);
    const [activeTime, setActiveTime] = useState(0);
    const playerRef = useRef<any>(null);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [editingLog, setEditingLog] = useState<{ id: string, type: string, is_my_point: boolean, set_number: number } | null>(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [hasAutoStarted, setHasAutoStarted] = useState(false);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [players, setPlayers] = useState<any[]>([]);
    const hasTrackedViewRef = useRef(false);
    const sessionStartTimeRef = useRef<number | null>(null);
    const accumulatedSessionTimeRef = useRef(0);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // TACTICAL STATES
    const [activeLoop, setActiveLoop] = useState<{ id: string, start: number, end: number } | null>(null);
    const [rallyLoops, setRallyLoops] = useState<Record<string, { start: number, end: number }>>({});
    const [selectedIndices, setSelectedIndices] = useState<Record<string, boolean>>({});
    const [isSequentialRally, setIsSequentialRally] = useState(false);
    const [sequentialRallyIndex, setSequentialRallyIndex] = useState(0);
    const [isIndividualLooping, setIsIndividualLooping] = useState(true);
    const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
    const [playbackMode, setPlaybackMode] = useState<'all' | 'selection' | 'wins' | 'losses' | 'none'>('none');
    const logListRef = useRef<HTMLDivElement>(null);
    const hasJumpedToStartRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const handlePlayerReady = useCallback((player: any) => {
        playerRef.current = player;
        setIsPlayerReady(true);
    }, []);

    const handlePlayerStateChange = useCallback((event: any) => {
        // 1 = PLAYING
        if (event.data === 1 && !hasJumpedToStartRef.current && match) {
            const startTimeStr = match[`set_${currentSet}_start`] || '00:00';
            const startTime = parseTimeToSeconds(startTimeStr);
            if (startTime > 0) {
                    try {
                        if (typeof event.target.getIframe === 'function' && event.target.getIframe()) {
                            event.target.seekTo(startTime, true);
                            hasJumpedToStartRef.current = true;
                            console.log(`Initial Play Jump: Moved to ${startTimeStr}`);
                        }
                    } catch (e) {
                        console.warn("Play jump failed", e);
                    }
            } else {
                hasJumpedToStartRef.current = true;
            }
        }
    }, [match, currentSet]);

    const [winCats, setWinCats] = useState(INITIAL_WIN);
    const [lossCats, setLossCats] = useState(INITIAL_LOSS);

    const parseHybridNotes = (raw: string) => {
        if (!raw) return {};
        try {
            // Case 1: Simple JSON
            if (raw.trim().startsWith('{') && raw.trim().endsWith('}')) return JSON.parse(raw);
            
            // Case 2: Hybrid format with [CAT_CONFIG_V3] or multiple blocks
            // Look for the last JSON-like block or extract via regex
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            
            return {};
        } catch (e) {
            console.warn("Hybrid parse failed, attempting fallback split", e);
            try {
                const parts = raw.split('\n\n');
                for (const p of parts) {
                    if (p.trim().startsWith('{')) return JSON.parse(p);
                }
            } catch (e2) {}
            return {};
        }
    };

    const fetchData = useCallback(async (isInitial = false) => {
        const sanitizedId = String(matchId || "").trim();
        if (!sanitizedId) return;
        if (isInitial) setLoading(true);
        
        let retryCount = 0;
        const maxRetries = 3;

        const attemptFetch = async (): Promise<boolean> => {
            if (!isMountedRef.current) return true;
            try {
                const { data: mData, error: mErr } = await supabase
                    .from('bd_matches')
                    .select(`*, opponent_1:bd_players!opponent_1_id(name)`)
                    .eq('id', sanitizedId)
                    .single();
                
                if (!isMountedRef.current) return true;

                if (mErr) {
                    console.error("Match fetch error:", mErr);
                    if (mErr.message?.includes('Failed to fetch') && retryCount < maxRetries) return false;
                    if (isMountedRef.current) alert(`❌ 경기 정보 로드 실패 (네트워크 확인 필요): ${mErr.message || 'Unknown error'}\nURL: ${sanitizedId}`);
                    return true; 
                }
                
                if (mData && isMountedRef.current) {
                    setMatch(mData);
                    const meta = parseHybridNotes(mData.feedback_notes);
                    if (meta.customCategories) {
                        setWinCats(meta.customCategories.win || INITIAL_WIN);
                        setLossCats(meta.customCategories.loss || INITIAL_LOSS);
                    } else if (meta.v3_WIN) {
                        setWinCats(INITIAL_WIN); setLossCats(INITIAL_LOSS);
                    }
                    if (meta.rallyLoopsV2) setRallyLoops(meta.rallyLoopsV2);
                    if (meta.selectedIndices) setSelectedIndices(meta.selectedIndices);
                }

                if (!isMountedRef.current) return true;

                const { data: lData, error: lErr } = await supabase
                    .from('bd_point_logs')
                    .select('*')
                    .eq('match_id', sanitizedId)
                    .order('created_at', { ascending: true });
                
                if (lErr) {
                    console.error("Logs fetch error:", lErr);
                    if (lErr.message?.includes('Failed to fetch') && retryCount < maxRetries) return false;
                    if (isMountedRef.current) alert(`❌ 로그 데이터 로드 실패: ${lErr.message}`);
                } else if (isMountedRef.current) {
                    setLogs(lData || []);
                }

                if (!isMountedRef.current) return true;

                const { data: pData } = await supabase.from('bd_players').select('*').order('name');
                if (isMountedRef.current) setPlayers(pData || []);
                
                return true;
            } catch (e: any) {
                if (!isMountedRef.current) return true;
                console.error("Fetch implementation error:", e);
                if (e.message?.includes('Failed to fetch') && retryCount < maxRetries) return false;
                alert(`❗ 데이터 처리 중 오류: ${e.message}`);
                return true;
            }
        };

        const runFetchWithRetry = async () => {
            while (retryCount <= maxRetries && isMountedRef.current) {
                const success = await attemptFetch();
                if (success || !isMountedRef.current) break;
                retryCount++;
                if (retryCount <= maxRetries && isMountedRef.current) {
                    console.log(`Retrying fetch... (${retryCount}/${maxRetries})`);
                    await new Promise(res => setTimeout(res, 1000 * retryCount)); 
                }
            }
            if (isInitial && isMountedRef.current) setLoading(false);
        };

        runFetchWithRetry();
    }, [matchId]);

    useEffect(() => { 
        if (matchId) fetchData(true); 
    }, [matchId, fetchData]);



    const updatePlayTime = async (seconds: number) => {
        if (!matchId || seconds <= 0) return;
        
        const { data: m } = await supabase.from('bd_matches').select('feedback_notes').eq('id', matchId).single();
        if (!m) return;

        const meta = parseHybridNotes(m.feedback_notes);
        const stats = meta.stats || { view_count: 0, view_duration: 0, view_history: [] };
        stats.view_duration += seconds;
        
        // Update the last session's duration
        if (stats.view_history && stats.view_history.length > 0) {
            stats.view_history[stats.view_history.length - 1].duration += seconds;
        }

        const newMeta = { ...meta, stats };
        let newRaw = m.feedback_notes || "";
        const jsonMatch = newRaw.match(/\{.*\}/s);
        if (jsonMatch) newRaw = newRaw.replace(jsonMatch[0], JSON.stringify(newMeta));
        else newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify(newMeta);

        await supabase.from('bd_matches').update({ feedback_notes: newRaw }).eq('id', matchId);
    };

    // VIEW STATS TRACKING
    useEffect(() => {
        if (!matchId || !match || hasTrackedViewRef.current) return;
        hasTrackedViewRef.current = true;
        
        // Use local variable to avoid closure issues with match
        const targetMatch = match;
        const incrementMatchView = async (currentMatch: any) => {
            if (!currentMatch) return;
            const currentMeta = parseHybridNotes(currentMatch.feedback_notes);
            const stats = currentMeta.stats || { view_count: 0, view_duration: 0, view_history: [] };
            stats.view_count += 1;
            
            const newSession = { id: Date.now(), date: new Date().toISOString(), duration: 0 };
            if (!stats.view_history) stats.view_history = [];
            stats.view_history.push(newSession);

            const newMeta = { ...currentMeta, stats };
            let newRaw = currentMatch.feedback_notes || "";
            const jsonMatch = newRaw.match(/\{.*\}/s);
            if (jsonMatch) newRaw = newRaw.replace(jsonMatch[0], JSON.stringify(newMeta));
            else newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify(newMeta);

            await supabase.from('bd_matches').update({ feedback_notes: newRaw }).eq('id', matchId);
        };
        
        incrementMatchView(targetMatch);
    }, [matchId, match]);

    // AUTO SCROLL TO BOTTOM ON LOG CHANGE
    useEffect(() => {
        if (logListRef.current) {
            logListRef.current.scrollTo({
                top: logListRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [logs.length, currentSet]);

    // AUTO SEEK ON SET SWITCH
    const prevSetRef = useRef<number | null>(null);
    useEffect(() => {
        if (!playerRef.current || !match || !isPlayerReady) return;
        
        // Seek if set changed OR it's the initial load
        const setChanged = prevSetRef.current !== currentSet;
        const startTimeStr = match[`set_${currentSet}_start`];
        
        if (startTimeStr && (setChanged || prevSetRef.current === null)) {
            const seconds = parseTimeToSeconds(startTimeStr);
            if (seconds > 0) {
                try {
                    if (typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                        playerRef.current.seekTo(seconds, true);
                    }
                } catch (e) {}
            }
        }
        prevSetRef.current = currentSet;
    }, [currentSet, match, isPlayerReady]);

    // Use refs to avoid interval restarts on every state change
    const stateRef = useRef({
        activeLoop,
        isSequentialRally,
        sequentialRallyIndex,
        logs,
        rallyLoops,
        currentSet,
        selectedIndices,
        isIndividualLooping
    });

    useEffect(() => {
        stateRef.current = {
            activeLoop,
            isSequentialRally,
            sequentialRallyIndex,
            logs,
            rallyLoops,
            currentSet,
            selectedIndices,
            isIndividualLooping
        };
    }, [activeLoop, isSequentialRally, sequentialRallyIndex, logs, rallyLoops, currentSet, selectedIndices, isIndividualLooping]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!playerRef.current || !isMountedRef.current) return;
            try {
                const { 
                    activeLoop: cLoop, 
                    isSequentialRally: cSeq, 
                    sequentialRallyIndex: cIdx, 
                    logs: cLogs, 
                    rallyLoops: cLoops, 
                    currentSet: cSet, 
                    selectedIndices: cSel, 
                    isIndividualLooping: cIndiv 
                } = stateRef.current;

                if (typeof playerRef.current.getIframe !== 'function' || !playerRef.current.getIframe()) return;
                
                const curr = playerRef.current.getCurrentTime();
                setActiveTime(Math.floor(curr)); 
                
                const playerState = typeof playerRef.current.getPlayerState === 'function' ? playerRef.current.getPlayerState() : -1;
                
                if (playerState === 1) { // Playing
                    accumulatedSessionTimeRef.current += 0.1;
                    if (accumulatedSessionTimeRef.current >= 30) {
                        updatePlayTime(Math.floor(accumulatedSessionTimeRef.current));
                        accumulatedSessionTimeRef.current = 0;
                    }
                }

                // Rally Loop / Sequence Logic
                if (cLoop && playerState === 1) {
                    // Precise end detection with small buffer (0.3s for mobile stability)
                    if (curr >= cLoop.end - 0.3) {
                        if (cSeq) {
                            const activeRallies = cLogs.filter(l => l.set_number === cSet && cSel[l.id] && cLoops[l.id]?.end);
                            if (activeRallies.length > 0) {
                                // Find next index logically
                                const nextIdx = (cIdx + 1) % activeRallies.length;
                                setSequentialRallyIndex(nextIdx);
                                startRallyLoop(activeRallies[nextIdx], true);
                            } else { 
                                setActiveLoop(null); 
                                setIsSequentialRally(false); 
                            }
                        } else if (cIndiv) {
                            // Single loop
                            playerRef.current.seekTo(cLoop.start, true);
                        }
                    }
                }
            } catch (e) {
                // Silent catch for polling
            }
        }, 100); // Higher frequency (100ms) for better precision
        return () => {
            clearInterval(interval);
            if (accumulatedSessionTimeRef.current > 0) {
                updatePlayTime(Math.floor(accumulatedSessionTimeRef.current));
            }
        };
    }, []); // Empty dependency array - relies on stateRef

    useEffect(() => {
        const handleUnload = () => {
            if (accumulatedSessionTimeRef.current > 0) {
                // We use a small hack for unload - navigator.sendBeacon is better but we don't have an API endpoint for it.
                // Since this is a small update, we'll just try to fire and forget if possible, 
                // but usually the next session will catch up or we rely on the 30s intervals.
                updatePlayTime(Math.floor(accumulatedSessionTimeRef.current));
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, []);

    const saveHybridMeta = async (updates: any, refresh = true) => {
        if (!matchId) return;
        
        // Fetch latest to prevent overwriting other concurrent updates (like duration tracking)
        const { data: latestMatch } = await supabase.from('bd_matches').select('feedback_notes').eq('id', matchId).single();
        if (!latestMatch) return;
        
        const currentMeta = parseHybridNotes(latestMatch.feedback_notes);
        const newMeta = { ...currentMeta, ...updates };
        
        let newRaw = latestMatch.feedback_notes || "";
        const jsonMatch = newRaw.match(/\{.*\}/s);
        if (jsonMatch) {
            newRaw = newRaw.replace(jsonMatch[0], JSON.stringify(newMeta));
        } else {
            newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify(newMeta);
        }
        
        const { error } = await supabase.from('bd_matches').update({ feedback_notes: newRaw }).eq('id', matchId);
        if (error) alert("설정 저장 실패: " + error.message);
        else if (refresh) fetchData(false);
    };

    const recalculateScores = async (setNum: number) => {
        const sanitizedId = String(matchId || "").trim();
        if (!sanitizedId) return;

        try {
            // 1. Fetch all logs for the set with precise sorting
            const { data: allSetLogs } = await supabase.from('bd_point_logs')
                .select('*')
                .eq('match_id', sanitizedId)
                .eq('set_number', setNum)
                .order('video_timestamp', { ascending: true })
                .order('created_at', { ascending: true })
                .order('id', { ascending: true });

            if (allSetLogs) {
                let rollingMe = 0, rollingOpp = 0;
                const updates = allSetLogs.map(l => {
                    if (l.is_my_point) rollingMe++; else rollingOpp++;
                    return { id: l.id, current_score: `${rollingMe}-${rollingOpp}` };
                });

                // Batch update
                const updatePromises = updates.map(u => 
                    supabase.from('bd_point_logs').update({ current_score: u.current_score }).eq('id', u.id)
                );
                await Promise.all(updatePromises);
            }

            // 2. Sync to matches table summary
            const { data: allLogs } = await supabase.from('bd_point_logs').select('current_score, set_number').eq('match_id', sanitizedId);
            const getSetScore = (sNum: number) => {
                const sl = (allLogs || []).filter(l => Number(l.set_number) === sNum);
                let best = [0, 0], maxT = -1;
                sl.forEach(l => {
                    const nums = (l.current_score || "").match(/\d+/g);
                    if (nums && nums.length >= 2) {
                        const [m, o] = nums.map(Number);
                        if ((m + o) > maxT) { maxT = m + o; best = [m, o]; }
                    }
                });
                return best;
            };

            const [p1, o1] = getSetScore(1);
            const [p2, o2] = getSetScore(2);
            const [p3, o3] = getSetScore(3);

            let wMe = 0, wOpp = 0;
            if (p1 > o1) wMe++; else if (o1 > p1 && (p1 + o1 > 0)) wOpp++;
            if (p2 > o2) wMe++; else if (o2 > p2 && (p2 + o2 > 0)) wOpp++;
            if (p3 > o3) wMe++; else if (o3 > p3 && (p3 + o3 > 0)) wOpp++;

            await supabase.from('bd_matches').update({
                my_set_score: wMe,
                opponent_set_score: wOpp,
                set_1_score_player: String(p1),
                set_1_score_opponent: String(o1),
                set_2_score_player: String(p2),
                set_2_score_opponent: String(o2),
                set_3_score_player: String(p3),
                set_3_score_opponent: String(o3)
            }).eq('id', sanitizedId);

            await fetchData(false);
        } catch (err) {
            console.error("Score recalculation failed:", err);
        }
    };

    const recordPoint = async (isMe: boolean, type: string) => {
            const sanitizedId = String(matchId || "").trim();
        if (!sanitizedId) return;

        try {
            let timestamp = 0;
            if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                try {
                    timestamp = Math.floor(playerRef.current.getCurrentTime());
                } catch (e) {
                    console.warn("Player time fetch failed", e);
                }
            }

            // Get the very latest log from DB for this set to ensure accurate prevTimestamp
            const { data: latestLogs } = await supabase.from('bd_point_logs')
                .select('video_timestamp')
                .eq('match_id', sanitizedId)
                .eq('set_number', currentSet)
                .order('video_timestamp', { ascending: false })
                .limit(1);
            
            const lastLogTimestamp = latestLogs && latestLogs.length > 0 ? latestLogs[0].video_timestamp : null;
            
            let rallyStart = 0;
            const rallyEnd = timestamp;

            if (lastLogTimestamp !== null) {
                // 원칙: 이전 점수 기록 후 +10초가 시작점
                rallyStart = lastLogTimestamp + 10;
            } else {
                // 첫 득점인 경우 세트 시작 시간에서 시작
                const startTimeStr = match[`set_${currentSet}_start`] || '00:00';
                rallyStart = parseTimeToSeconds(startTimeStr);
            }

            // 방어 로직: 시작 시간이 종료 시간보다 늦거나 같으면 종료 시간 5초 전으로 설정
            if (rallyStart >= rallyEnd) {
                rallyStart = Math.max(0, rallyEnd - 5);
            }

            const { data: newLog, error: pErr } = await supabase.from('bd_point_logs').insert({
                match_id: sanitizedId, 
                set_number: currentSet, 
                video_timestamp: timestamp,
                current_score: "0-0", 
                is_my_point: isMe, 
                point_type: type
            }).select().single();

            if (pErr) { 
                console.error("Point record failed:", pErr); 
                return; 
            }
            
            // Auto Loop Generation
            if (newLog) {
                const updatedLoops = { ...rallyLoops, [newLog.id]: { start: rallyStart, end: rallyEnd } };
                const updatedSelected = { ...selectedIndices, [newLog.id]: true };
                
                // We need to update both state and DB
                setRallyLoops(updatedLoops);
                setSelectedIndices(updatedSelected);
                await saveHybridMeta({ 
                    rallyLoopsV2: updatedLoops,
                    selectedIndices: updatedSelected
                });
            }

            // Skip Dead Time: Jump 5 seconds ahead
            if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                if (typeof playerRef.current.seekTo === 'function') {
                    playerRef.current.seekTo(timestamp + 5, true);
                }
            }

            if (newLog) {
                setNewlyAddedId(newLog.id);
                setTimeout(() => setNewlyAddedId(null), 3000);
            }

            await recalculateScores(currentSet);
        } catch (err: any) { 
            console.error("Score recording error:", err); 
        }
    };

    const deletePoint = async (logId: string, setNum: number) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('bd_point_logs').delete().eq('id', logId);
            if (!error) {
                await recalculateScores(setNum);
            }
        } catch (e) {
            console.error("Delete point failed:", e);
        }
    };

    const submitEditPoint = async (logId: string, newType: string, isWin: boolean, setNum: number) => {
        if (!newType || newType.trim() === '') return;
        try {
            const { error } = await supabase.from('bd_point_logs').update({ point_type: newType.trim(), is_my_point: isWin }).eq('id', logId);
            if (!error) {
                await recalculateScores(setNum);
            } else {
                alert("수정 실패: " + error.message);
            }
        } catch (e) {
            console.error("Edit point failed:", e);
        } finally {
            setEditingLog(null);
        }
    };

    const resetScore = async () => {
        if (!matchId) return;
        if (!confirm('정말로 모든 점수 기록을 초기화하시겠습니까? 복구할 수 없습니다.')) return;
        try {
            await supabase.from('bd_point_logs').delete().eq('match_id', matchId);
            await supabase.from('bd_matches').update({ 
                my_set_score: 0,
                opponent_set_score: 0,
                set_1_score_player: "0", 
                set_1_score_opponent: "0", 
                set_2_score_player: "0", 
                set_2_score_opponent: "0", 
                set_3_score_player: "0", 
                set_3_score_opponent: "0" 
            }).eq('id', matchId);
            await fetchData(false);
            alert('초기화되었습니다.');
        } catch (e) { alert('초기화 중 오류가 발생했습니다.'); }
    };

    const handleCategorySave = async (win: any, loss: any) => {
        setWinCats(win); setLossCats(loss);
        await saveHybridMeta({ customCategories: { win, loss } });
    };

    const setRallyBound = async (logId: string, side: 'start' | 'end', time: number) => {
        const current = rallyLoops[logId] || { start: logs.find((it:any) => it.id === logId)?.video_timestamp || 0, end: 0 };
        const newLoops = { ...rallyLoops, [logId]: { ...current, [side]: Math.floor(time) } };
        setRallyLoops(newLoops);
        await saveHybridMeta({ rallyLoopsV2: newLoops });
        
        try {
            await supabase.from('bd_point_logs').update({ video_timestamp: Math.floor(time) }).eq('id', logId);
            const log = logs.find(l => l.id === logId);
            if (log) {
                await recalculateScores(log.set_number);
            }
        } catch (e) {
            console.error("Time sync failed:", e);
        }
    };

    const toggleIndex = (id: string) => {
        const next = { ...selectedIndices, [id]: !selectedIndices[id] };
        setSelectedIndices(next);
        saveHybridMeta({ selectedIndices: next });
    };

    const batchSelect = (mode: 'all' | 'none' | 'wins' | 'losses') => {
        const next = { ...selectedIndices };
        const currentSetLogs = logs.filter(l => Number(l.set_number) === Number(currentSet));
        currentSetLogs.forEach(l => {
            if (mode === 'all') next[l.id] = true;
            else if (mode === 'none') next[l.id] = false;
            else if (mode === 'wins') next[l.id] = l.is_my_point;
            else if (mode === 'losses') next[l.id] = !l.is_my_point;
        });
        setSelectedIndices(next);
        saveHybridMeta({ selectedIndices: next });
        setPlaybackMode(mode === 'none' ? 'none' : mode);
    };

    const startRallyLoop = (log: any, sequential: boolean = false) => {
        if (!log) return;
        const bounds = rallyLoops[log.id];
        const start = bounds?.start || log.video_timestamp;
        const end = bounds?.end || 0;
        
        if (!end) { 
            if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                if (typeof playerRef.current.seekTo === 'function') playerRef.current.seekTo(start); 
            }
            return; 
        }
        if (!sequential && activeLoop && activeLoop.id === log.id) { setActiveLoop(null); setIsSequentialRally(false); return; }
        
        setActiveLoop({ id: log.id, start, end });
        if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
            try {
                if (typeof playerRef.current.seekTo === 'function') playerRef.current.seekTo(start);
                if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
            } catch (e) { console.warn("Player not fully ready", e); }
        }
    };

    const startSelectedSequential = () => {
        const activeRallies = logs.filter(l => l.set_number === currentSet && selectedIndices[l.id] && rallyLoops[l.id]?.end);
        if (activeRallies.length === 0) { alert('체크된 항목이 없습니다.'); return; }
        setIsSequentialRally(true); setSequentialRallyIndex(0); startRallyLoop(activeRallies[0], true);
    };

    useEffect(() => {
        if (!hasAutoStarted && isPlayerReady && match && playerRef.current) {
            try {
                const startTimeStr = match[`set_${currentSet}_start`] || '00:00';
                const startTime = parseTimeToSeconds(startTimeStr);

                // 1. 영상 위치를 시작 시간으로 이동
                if (typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                    if (typeof playerRef.current.seekTo === 'function') {
                        playerRef.current.seekTo(startTime, true);
                        setHasAutoStarted(true);
                        console.log(`Auto-started at ${startTimeStr} for Set ${currentSet}`);
                    }
                }

                // 2. 득점 로그가 있다면 득점 모드(Wins)를 활성화하여 UI 강조
                if (logs.length > 0) {
                    const currentSetLogs = logs.filter(l => Number(l.set_number) === Number(currentSet));
                    const next: Record<string, boolean> = { ...selectedIndices };
                    let hasWins = false;
                    
                    currentSetLogs.forEach(l => {
                        next[l.id] = l.is_my_point;
                        if (l.is_my_point && rallyLoops[l.id]?.end) hasWins = true;
                    });
                    
                    setSelectedIndices(next);
                    setPlaybackMode('wins');
                    
                    if (hasWins) {
                        setIsSequentialRally(true);
                        setSequentialRallyIndex(0);
                    }
                }
            } catch (e) {
                console.warn("Initial auto-start failed:", e);
            }
        }
    }, [isPlayerReady, logs, hasAutoStarted, currentSet, rallyLoops, match]);

    // AUTO SCROLL TO ACTIVE LOG
    useEffect(() => {
        if (activeLoop?.id) {
            const el = document.getElementById(`log-${activeLoop.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeLoop]);

    const cSetLogs = useMemo(() => {
        const filtered = logs.filter(l => Number(l.set_number) === Number(currentSet));
        return [...filtered].sort((a,b) => {
            const tA = Number(a.video_timestamp || 0);
            const tB = Number(b.video_timestamp || 0);
            if (tA !== tB) return tA - tB;
            const dA = new Date(a.created_at).getTime();
            const dB = new Date(b.created_at).getTime();
            return dA - dB;
        });
    }, [logs, currentSet]);

    const [sMe, sOpp] = useMemo(() => {
        if (cSetLogs.length === 0) return [0, 0];
        let bestScore = [0, 0], maxT = -1, latestT = 0;
        cSetLogs.forEach(l => {
            const nums = (l.current_score || "").match(/\d+/g);
            if (nums && nums.length >= 2) {
                const [m, o] = nums.map(Number);
                const total = m + o;
                const createdTime = new Date(l.created_at).getTime();
                if (total > maxT || (total === maxT && createdTime > latestT)) {
                    maxT = total;
                    latestT = createdTime;
                    bestScore = [m, o];
                }
            }
        });
        return bestScore;
    }, [cSetLogs]);
    const totalLoopTime = useMemo(() => cSetLogs.reduce((acc, l) => {
        const loop = rallyLoops[l.id];
        if (selectedIndices[l.id] && loop?.end) return acc + (loop.end - (loop.start || l.video_timestamp));
        return acc;
    }, 0), [cSetLogs, selectedIndices, rallyLoops]);

    if (loading && !match) return <div className="h-screen bg-[#080d1a] flex items-center justify-center text-cyan-400 font-extrabold text-2xl animate-pulse italic uppercase tracking-tighter">PREPARING COMMAND CENTER...</div>;

    if (isMobile) {
        if (!match) return <div className="h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white font-black text-sm uppercase tracking-widest">Loading Match Data...</p>
            <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-white/10 text-white rounded-lg text-xs font-black">RETRY</button>
        </div>;

        return (
            <ErrorBoundary>
                <AnalysisMobileView 
                    match={match}
                    onClose={() => router.back()}
                    logs={cSetLogs}
                    activeLoop={activeLoop}
                    isSequential={isSequentialRally}
                    setIsSequential={setIsSequentialRally}
                    isAutoNext={isIndividualLooping}
                    setIsAutoNext={setIsIndividualLooping}
                    setSequentialIndex={setSequentialRallyIndex}
                    startRallyLoop={startRallyLoop}
                    sequentialIndex={sequentialRallyIndex}
                    formatTime={formatTime}
                    isPlayerReady={isPlayerReady}
                    setIsPlayerReady={setIsPlayerReady}
                    playerRef={playerRef}
                    rallyLoops={rallyLoops}
                    currentSet={currentSet}
                    setCurrentSet={setCurrentSet}
                    batchSelect={batchSelect}
                    playbackMode={playbackMode}
                />
            </ErrorBoundary>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#080d1a] text-white font-sans overflow-hidden">
            
            <div className="h-14 bg-[#0b1221] border-b border-white/10 flex items-center justify-between px-6 shrink-0 z-50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.back()} className="p-1 px-4 bg-white/5 border border-white/20 rounded-lg text-white font-black text-[10px] hover:bg-blue-600 transition-all shadow-lg active:scale-95">BACK</button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-black text-white">{match?.match_name}</h1>
                            <button onClick={() => setIsMatchModalOpen(true)} className="p-1 text-white/30 hover:text-cyan-400 transition-colors">
                                <Settings className="w-3 h-3" />
                            </button>
                        </div>
                        <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest leading-none opacity-60 italic">Strategic Hub v4.3</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex p-1 bg-black/60 rounded-xl border border-white/10 shadow-lg gap-1">
                        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-xs shadow-inner shadow-blue-400/20 active:scale-95 transition-all"><Video className="w-3.5 h-3.5" /> 영상 기록</button>
                        <Link href={`/analysis/report?id=${matchId}`} className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-black text-xs transition-all active:scale-95 border border-white/10"><BarChart3 className="w-3.5 h-3.5" /> 통계 리포트</Link>
                    </div>
                    
                    <div className="flex items-center gap-6 bg-black/40 px-10 py-1.5 rounded-full border border-white/10 shadow-[inner_0_0_20px_rgba(34,211,238,0.1)]">
                        <span className="text-2xl font-black text-cyan-400 tabular-nums drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{sMe}</span>
                        <span className="text-xl text-white/10 font-black px-1">:</span>
                        <span className="text-2xl font-black text-rose-500 tabular-nums drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">{sOpp}</span>
                    </div>

                    <button onClick={() => recalculateScores(Number(currentSet))} className="flex items-center gap-2 px-5 py-2 bg-blue-600/10 border border-blue-500/30 text-blue-400 rounded-xl font-black text-[10px] hover:bg-blue-600 hover:text-white transition-all shadow-md group">
                        <ListOrdered className="w-3.5 h-3.5" /> 타임라인 정렬 및 재계산
                    </button>
                    <button onClick={resetScore} className="flex items-center gap-2 px-5 py-2 bg-rose-600/10 border border-rose-500/30 text-rose-500 rounded-xl font-black text-[10px] hover:bg-rose-600 hover:text-white transition-all shadow-md group"><RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> 점수 초기화</button>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner">
                        {[1, 2, 3].map(s => {
                            if (s === 3 && match?.set_3_start === '00:00') return null;
                            return (
                                <button key={s} onClick={() => { setCurrentSet(s); setIsSequentialRally(false); }} className={cn("px-8 h-10 text-xs font-black transition-all rounded-lg", currentSet === s ? "text-cyan-400 bg-cyan-400/20 border border-cyan-400/30 shadow-sm" : "text-white/30 hover:text-white")}>{s}세트</button>
                            );
                        })}
                    </div>
                    {totalLoopTime > 0 && (
                        <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 px-4 h-8 rounded-xl shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                            <Clock className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-xs font-black text-yellow-400 tabular-nums">{formatTime(totalLoopTime)}</span>
                        </div>
                    )}
                    <button 
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="flex items-center gap-2 px-4 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white/50 hover:text-white"
                        title="시청 기록 로그"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">LOG</span>
                    </button>
                    <button onClick={() => setIsCatModalOpen(true)} className="p-2.5 bg-white/5 border border-white/20 rounded-lg text-white hover:bg-cyan-500 transition-all hover:rotate-90 shadow-lg active:scale-90"><Settings2 className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-2 gap-2">
                <div className="w-[180px] bg-[#0b1221] border border-white/5 rounded-[1.5rem] p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 shrink-0 h-full shadow-2xl relative">
                    <h3 className="text-[10px] font-black text-yellow-400/90 uppercase tracking-[0.2em] border-b border-white/10 pb-1 mb-1 italic">WINNER BOARD</h3>
                    {winCats.map((cat: any) => (
                        <div key={cat.group} className="space-y-2">
                            <label className="text-[10px] font-black text-yellow-400 uppercase tracking-tighter opacity-80">{cat.group}</label>
                            <div className="grid grid-cols-2 gap-1.5 focus:outline-none">
                                {cat.items.map((item: string) => (
                                    <button key={item} onClick={() => recordPoint(true, item)} className="py-2.5 px-1 rounded-xl bg-blue-600 border border-blue-400 text-white text-[9.5px] font-black text-center shadow-lg hover:bg-blue-400 active:scale-95 transition-all truncate hover:shadow-blue-500/20">{item}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col flex-1 overflow-hidden gap-1.5 h-full">
                    <div className="w-full aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] shrink-0 relative">
                        <YoutubePlayer 
                            key={match?.youtube_video_id || 'no-video'}
                            videoId={match?.youtube_video_id || ''} 
                            onPlayerReady={handlePlayerReady} 
                            onStateChange={handlePlayerStateChange}
                        />
                        
                        {/* Playback Mode Indicators */}
                        {isSequentialRally && (
                            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                {cSetLogs.every(l => selectedIndices[l.id] === l.is_my_point && l.is_my_point) && (
                                    <div className="px-4 py-1.5 bg-cyan-500 text-black text-[10px] font-black rounded-full flex items-center gap-2 animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                                        <Target className="w-3 h-3" /> 득점 재생 중 (WINS ONLY)
                                    </div>
                                )}
                                {cSetLogs.every(l => selectedIndices[l.id] === !l.is_my_point && !l.is_my_point) && (
                                    <div className="px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center gap-2 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                                        <X className="w-3 h-3" /> 실점 재생 중 (LOSS ONLY)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 bg-black/30 border border-white/5 rounded-[2rem] p-3 overflow-hidden flex flex-col shadow-inner">
                        <div className="grid grid-cols-3 gap-3 h-full overflow-hidden">
                            {lossCats.map((cat: any) => (
                                <div key={cat.group} className="bg-[#0f172a]/80 rounded-[1.8rem] border border-white/5 p-3 flex flex-col h-full overflow-hidden shadow-lg">
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest mb-2 block border-b border-white/10 pb-1 shrink-0 opacity-60 italic">{cat.group}</label>
                                    <div className="flex flex-wrap gap-1.5 overflow-y-auto custom-scrollbar content-start p-0.5">
                                        {cat.items.map((item: string) => (
                                            <button key={item} onClick={() => recordPoint(false, item)} className="py-2.5 px-3 rounded-xl bg-rose-600 border border-rose-500 text-white text-[10px] font-black shadow-lg hover:bg-rose-500 active:scale-95 transition-all w-fit min-w-[50px] hover:shadow-rose-500/20">{item}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col w-[420px] bg-[#0b1221] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl shrink-0 h-[82%] relative group/timeline">
                    <div className="bg-black/60 shrink-0 flex flex-col p-4 border-b border-white/10 gap-3 shadow-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-6 bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.7)]" />
                                <h3 className="text-base font-black text-white uppercase italic tracking-tighter">FLEET TIMELINE ({logs.length} / {cSetLogs.length})</h3>
                            </div>
                            <button onClick={startSelectedSequential} className="px-7 py-2 bg-yellow-400 text-black rounded-full font-black text-xs flex items-center gap-2 shadow-[0_0_30px_rgba(250,204,21,0.6)] hover:bg-yellow-300 transition-all hover:scale-105 active:scale-95 uppercase italic">
                                <FastForward className="w-4 h-4" /> AUTO PLAY
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-black/40 p-2 pr-6 rounded-[1.2rem] border border-white/5 overflow-x-auto custom-scrollbar-hidden">
                            <button 
                                onClick={() => {
                                    const allChecked = cSetLogs.every(l => selectedIndices[l.id]);
                                    batchSelect(allChecked ? 'none' : 'all');
                                }} 
                                className={cn(
                                    "px-5 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-black shrink-0",
                                    playbackMode === 'all'
                                        ? "bg-yellow-400 border-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)] scale-105"
                                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                            >
                                <CheckSquare className="w-4 h-4" /> 전체
                            </button>
                            <button onClick={() => {
                                setIsSequentialRally(true);
                                setSequentialRallyIndex(0);
                                setPlaybackMode('selection');
                                const firstSelected = cSetLogs.find(l => selectedIndices[l.id] && rallyLoops[l.id]?.end);
                                if (firstSelected) startRallyLoop(firstSelected, true);
                            }} className={cn(
                                "px-5 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-black shrink-0",
                                playbackMode === 'selection'
                                    ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-105"
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            )}>
                                <Square className="w-4 h-4" /> 선택
                            </button>
                            <button onClick={() => batchSelect('wins')} className={cn(
                                "px-5 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-black shrink-0",
                                playbackMode === 'wins'
                                    ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-105"
                                    : "bg-blue-600/20 border-blue-400/30 text-blue-400 hover:bg-blue-600 hover:text-white"
                            )}><Target className="w-4 h-4" /> 득점</button>
                            <button onClick={() => batchSelect('losses')} className={cn(
                                "px-5 py-2.5 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-black shrink-0",
                                playbackMode === 'losses'
                                    ? "bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(225,29,72,0.5)] scale-105"
                                    : "bg-rose-600/20 border-rose-400/30 text-rose-400 hover:bg-rose-500 hover:text-white"
                            )}><X className="w-4 h-4" /> 실점</button>
                            
                            <div className="flex-1 min-w-[20px]" />
                            <button onClick={() => setIsIndividualLooping(!isIndividualLooping)} className={cn(
                                "px-6 py-2.5 rounded-lg border flex items-center gap-2 text-xs font-black shrink-0 transition-all shadow-lg",
                                isIndividualLooping ? "bg-yellow-400 border-yellow-300 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "bg-white/5 border-white/10 text-white/30"
                            )}>
                                <RotateCcw className={cn("w-4 h-4", isIndividualLooping && "animate-spin-slow")} /> 무한반복:{isIndividualLooping ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>

                    <div ref={logListRef} className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#080d1a] custom-scrollbar-hidden">
                        {cSetLogs.map((l, idx) => {
                            const loop = rallyLoops[l.id];
                            const isLooping = activeLoop?.id === l.id;
                            const isChecked = selectedIndices[l.id];
                            const isNew = newlyAddedId === l.id;
                            return (
                                <div id={`log-${l.id}`} key={l.id} className={cn(
                                    "group/row p-2 px-3 rounded-[1.5rem] border transition-all duration-300 relative overflow-hidden",
                                    isLooping ? "bg-blue-600/30 border-cyan-500 shadow-[inset_0_0_30px_rgba(6,182,212,0.3)] scale-[1.02] z-10" : "bg-[#0b1221] border-white/5 hover:border-white/20 shadow-sm",
                                    isNew && "border-yellow-400 ring-2 ring-yellow-400/50 animate-pulse-glow"
                                )}>
                                    {isLooping && <div className="absolute left-0 top-0 w-1.5 h-full bg-cyan-400 shadow-[0_0_25px_rgba(34,211,238,1)] animate-pulse" />}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <button onClick={() => toggleIndex(l.id)} className="shrink-0 transition-all active:scale-125">
                                                {isChecked ? <CheckCircle className="w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] shadow-xl" /> : <Circle className="w-7 h-7 text-white/10 hover:text-white/40" />}
                                            </button>
                                            <div className="flex flex-col cursor-pointer flex-1" onClick={() => startRallyLoop(l)}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-2xl font-black tabular-nums tracking-tighter", l.is_my_point ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]")}>{l.current_score}</span>
                                                    <span className="text-[13px] font-black text-white/95 uppercase truncate tracking-tight italic max-w-[120px]">{l.point_type}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 px-4 py-1 bg-black/60 rounded-full w-fit border border-white/10 shadow-inner">
                                                    <Target className="w-3.5 h-3.5 text-cyan-400/70" />
                                                    <span className="text-xs font-black text-cyan-400/90 tabular-nums">@{formatTime(loop?.start || l.video_timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 bg-black/50 p-2 rounded-2xl border border-white/10 shadow-lg">
                                            <div className="flex flex-col items-center gap-1">
                                                <button onClick={() => {
                                                    if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                                                        setRallyBound(l.id, 'start', playerRef.current.getCurrentTime());
                                                    }
                                                }} className={cn("px-4 py-1.5 rounded-xl font-black text-[11px] transition-all shadow-md", (loop?.start !== undefined) ? "bg-cyan-500 text-white shadow-cyan-500/30" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10")}>A</button>
                                                <span className="text-[9px] font-black text-cyan-400/90 tabular-nums">{(loop?.start !== undefined) ? formatTime(loop.start) : '--:--'}</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <button onClick={() => {
                                                    if (playerRef.current && typeof playerRef.current.getIframe === 'function' && playerRef.current.getIframe()) {
                                                        setRallyBound(l.id, 'end', playerRef.current.getCurrentTime());
                                                    }
                                                }} className={cn("px-4 py-1.5 rounded-xl font-black text-[11px] transition-all shadow-md", (loop?.end !== undefined) ? "bg-rose-600 text-white shadow-rose-600/30" : "bg-white/5 text-white/30 hover:text-white hover:bg-white/10")}>B</button>
                                                <span className="text-[9px] font-black text-rose-500/90 tabular-nums">{(loop?.end !== undefined) ? formatTime(loop.end) : '--:--'}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 ml-1 border-l border-white/10 pl-1.5">
                                                <button onClick={() => setEditingLog({ id: l.id, type: l.point_type, is_my_point: l.is_my_point, set_number: l.set_number })} className="p-1.5 text-white/20 hover:text-blue-400 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-110" title="유형 수정"><SquarePen className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => deletePoint(l.id, l.set_number)} className="p-1.5 text-white/20 hover:text-rose-500 transition-all opacity-0 group-hover/row:opacity-100 hover:scale-110" title="삭제"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {editingLog && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEditingLog(null)}>
                    <div className="bg-[#0b1221] border border-white/10 w-[90vw] max-w-[600px] max-h-[80vh] rounded-[2rem] p-6 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6 shrink-0">
                            <h2 className="text-xl font-black text-white italic uppercase">점수 유형 변경</h2>
                            <button onClick={() => setEditingLog(null)} className="p-2 border border-white/10 rounded-xl hover:bg-rose-600 transition-all"><X className="w-5 h-5 text-white" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-400/20 pb-1">득점 (WIN)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {winCats.flatMap((cat: any) => cat.items).map((item: string) => (
                                        <button key={`win-${item}`} onClick={() => submitEditPoint(editingLog.id, item, true, editingLog.set_number)} className={cn("py-3 px-2 rounded-xl text-[11px] font-black shadow-md transition-all truncate border", editingLog.type === item ? "bg-cyan-500 border-cyan-400 text-black shadow-cyan-400/50 scale-[1.02]" : "bg-blue-600/20 border-blue-500/20 text-blue-100 hover:bg-blue-600 hover:text-white")}>{item}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest border-b border-rose-500/20 pb-1">실점 (LOSS)</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {lossCats.flatMap((cat: any) => cat.items).map((item: string) => (
                                        <button key={`loss-${item}`} onClick={() => submitEditPoint(editingLog.id, item, false, editingLog.set_number)} className={cn("py-3 px-2 rounded-xl text-[11px] font-black shadow-md transition-all truncate border", editingLog.type === item ? "bg-rose-500 border-rose-400 text-black shadow-rose-400/50 scale-[1.02]" : "bg-rose-600/20 border-rose-500/20 text-rose-100 hover:bg-rose-600 hover:text-white")}>{item}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CategoryModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} winCats={winCats} lossCats={lossCats} onSave={handleCategorySave} />

            {isMatchModalOpen && (
                <MatchModal 
                    isOpen={isMatchModalOpen}
                    onClose={() => setIsMatchModalOpen(false)}
                    match={match}
                    players={players}
                    onSave={async (data: any) => {
                        const { id, opponent_1, opponent_2, partner, ...cleanData } = data;
                        const { error } = await supabase.from('bd_matches').update(cleanData).eq('id', matchId);
                        if (error) alert("경기 정보 업데이트 실패: " + error.message);
                        else {
                            setIsMatchModalOpen(false);
                            fetchData(false);
                        }
                    }}
                />
            )}

            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setIsHistoryModalOpen(false)}>
                    <div className="bg-[#0b1221] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 flex flex-col shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">View History Log</h2>
                                <p className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest">영상 시청 세션 상세 기록</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-rose-500/20 text-white/50 hover:text-rose-500 transition-all"><X className="w-6 h-6" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 max-h-[50vh]">
                            {(() => {
                                const meta = parseHybridNotes(match?.feedback_notes);
                                const stats = meta?.stats;
                                const history = stats?.view_history || [];
                                if (history.length === 0) return <div className="py-20 text-center text-white/20 font-black italic">기록된 시청 세션이 없습니다.</div>;
                                
                                return [...history].reverse().map((h: any) => (
                                    <div key={h.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(h.date).toLocaleDateString()}</span>
                                            <span className="text-sm font-black text-white">{new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[9px] font-black text-cyan-400/40 uppercase tracking-widest">Duration</span>
                                            <span className="text-base font-black text-cyan-400 tabular-nums">{Math.floor(h.duration / 60)}분 {h.duration % 60}초</span>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Play Time</span>
                                <span className="text-xl font-black text-yellow-400 tabular-nums">
                                    {Math.floor((parseHybridNotes(match?.feedback_notes).stats?.view_duration || 0) / 60)}분 {(parseHybridNotes(match?.feedback_notes).stats?.view_duration || 0) % 60}초
                                </span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Views</span>
                                <span className="text-xl font-black text-blue-400 tabular-nums">
                                    {parseHybridNotes(match?.feedback_notes).stats?.view_count || 0}회
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                .custom-scrollbar-hidden::-webkit-scrollbar { width: 0px; height: 0px; } 
                .custom-scrollbar::-webkit-scrollbar { width: 3px; } 
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; } 
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } 
                .animate-spin-slow { animation: spin-slow 3s linear infinite; }
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.4); }
                    50% { box-shadow: 0 0 20px 10px rgba(250, 204, 21, 0.2); }
                    100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
                }
                .animate-pulse-glow { animation: pulse-glow 1.5s infinite; }
            `}</style>
        </div>
    );
}

export default function PremiumCockpitPage() {
    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="h-screen bg-[#080d1a] flex items-center justify-center text-cyan-400 font-extrabold text-2xl animate-pulse italic">DEPLOYING TACTICAL HUB...</div>}>
                <CockpitAnalysisContent />
            </Suspense>
        </ErrorBoundary>
    );
}
