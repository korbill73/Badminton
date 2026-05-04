'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import YoutubePlayer from '@/components/match/YoutubePlayer';
import MatchModal from '@/components/match/MatchModal';
import SetDashboard from '@/components/match/SetDashboard';
import { 
    ChevronLeft, Loader2, Zap, Settings2, Trash2, RotateCcw,
    Download, Upload, Plus, X, Activity, Edit2, CheckCircle2,
    Calendar, Trophy, Clock, PlayCircle, RefreshCw, Save, Check, BarChart3, Camera
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

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
        <div className="p-10 bg-rose-900 text-white h-screen overflow-auto font-mono">
          <h1 className="text-3xl font-black mb-4">CLIENT CRASH DETECTED</h1>
          <p className="whitespace-pre-wrap">{this.state.error?.stack || this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Types ---
interface BDPointLog {
    id: string;
    match_id: string;
    set_number: number;
    current_score: string;
    is_my_point: boolean;
    point_type: string;
    primary_category?: string;
    video_timestamp: number;
    created_at: string;
}

interface CategoryGroup {
    group: string;
    items: string[];
}

// --- Helper Functions ---
const parseScore = (score: any) => {
    if (!score) return [0, 0];
    const str = String(score);
    if (!str.includes('-')) return [0, 0];
    return str.split('-').map(Number);
};

const formatTime = (seconds: any) => {
    const secs = Number(seconds) || 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- Category Management Modal ---
const CategoryModal = ({ isOpen, onClose, winCats, lossCats, onSave }: { isOpen: boolean, onClose: () => void, winCats: CategoryGroup[], lossCats: CategoryGroup[], onSave: (w: CategoryGroup[], l: CategoryGroup[]) => void }) => {
    const [localWin, setLocalWin] = useState<CategoryGroup[]>([...winCats]);
    const [localLoss, setLocalLoss] = useState<CategoryGroup[]>([...lossCats]);
    const [activeTab, setActiveTab] = useState<'win' | 'loss'>('win');

    if (!isOpen) return null;

    const handleAdd = (groupIdx: number) => {
        const name = prompt('새 2차 카테고리 명:'); if (!name) return;
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        target[groupIdx] = { ...target[groupIdx], items: [...target[groupIdx].items, name] };
        activeTab === 'win' ? setLocalWin([...target]) : setLocalLoss([...target]);
    };

    const handleEdit = (groupIdx: number, itemIdx: number) => {
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        const old = target[groupIdx].items[itemIdx];
        const next = prompt('2차 카테고리 수정:', old); if (!next) return;
        target[groupIdx].items[itemIdx] = next;
        activeTab === 'win' ? setLocalWin([...target]) : setLocalLoss([...target]);
    };

    const handleDelete = (groupIdx: number, itemIdx: number) => {
        if (!confirm('삭제?')) return;
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        target[groupIdx].items.splice(itemIdx, 1);
        activeTab === 'win' ? setLocalWin([...target]) : setLocalLoss([...target]);
    };

    const handleAddGroup = () => {
        const name = prompt('새 1차 그룹 명:'); if (!name) return;
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        target.push({ group: name, items: [] });
        activeTab === 'win' ? setLocalWin(target) : setLocalLoss(target);
    };

    const handleEditGroup = (groupIdx: number) => {
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        const next = prompt('1차 그룹명 수정:', target[groupIdx].group); if (!next) return;
        target[groupIdx] = { ...target[groupIdx], group: next };
        activeTab === 'win' ? setLocalWin(target) : setLocalLoss(target);
    };

    const handleDeleteGroup = (groupIdx: number) => {
        if (!confirm('그룹과 하위 카테고리가 모두 삭제됩니다. 계속하시겠습니까?')) return;
        const target = activeTab === 'win' ? [...localWin] : [...localLoss];
        target.splice(groupIdx, 1);
        activeTab === 'win' ? setLocalWin([...target]) : setLocalLoss([...target]);
    };

    const currentCats = activeTab === 'win' ? localWin : localLoss;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 overflow-hidden">
            <div className="bg-[#0b1221] border border-white/10 w-full max-w-[95vw] h-fit max-h-[92vh] rounded-[4rem] shadow-[0_0_100px_rgba(34,211,238,0.2)] flex flex-col overflow-hidden">
                <div className="p-10 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl"><Settings2 className="w-8 h-8 text-white" /></div>
                            <h2 className="text-3xl font-black text-white tracking-tight">전술 카테고리 마스터 관리</h2>
                        </div>
                    <div className="flex bg-white/5 p-2 rounded-2xl gap-2">
                        <button onClick={() => setActiveTab('win')} className={cn("px-10 py-3 rounded-xl text-sm font-black transition-all", activeTab === 'win' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>득점 분류 (WIN)</button>
                        <button onClick={() => setActiveTab('loss')} className={cn("px-10 py-3 rounded-xl text-sm font-black transition-all", activeTab === 'loss' ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-white")}>실점 분류 (LOSS)</button>
                        <div className="w-px bg-white/10 mx-2" />
                        <button onClick={handleAddGroup} className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-black transition-all"><Plus className="w-4 h-4" /> 1차 그룹 추가</button>
                    </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-rose-500 rounded-3xl transition-all"><X className="w-10 h-10 text-white" /></button>
                </div>
                
                <div className="p-12 min-h-[400px]">
                    <div className="grid grid-cols-4 gap-6">
                        {currentCats.map((cat, idx) => (
                            <div key={idx} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 relative group/card">
                                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-3">
                                        <span className={cn("text-sm font-black uppercase tracking-widest", activeTab === 'win' ? "text-blue-400" : "text-rose-400")}>{cat.group}</span>
                                        <div className="flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-all">
                                            <button onClick={() => handleEditGroup(idx)} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDeleteGroup(idx)} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleAdd(idx)} className={cn("text-[10px] px-4 py-2 rounded-xl text-white font-black shadow-lg transition-all", activeTab === 'win' ? "bg-blue-600 hover:bg-blue-500" : "bg-rose-600 hover:bg-rose-500")}>+ 2차 추가</button>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                    {cat.items.map((item, iIdx) => (
                                        <div key={iIdx} className="group relative flex items-center gap-3 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-white/5 hover:border-blue-500/40 transition-all">
                                            <span className="text-sm font-black text-white/80">{item}</span>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleEdit(idx, iIdx)} className="hover:scale-125 transition-transform"><Edit2 className="w-4 h-4 text-cyan-400" /></button>
                                                <button onClick={() => handleDelete(idx, iIdx)} className="hover:scale-125 transition-transform"><Trash2 className="w-4 h-4 text-rose-500" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-10 bg-black/40 border-t border-white/10 flex justify-end items-center gap-10">
                    <button onClick={onClose} className="text-lg text-slate-500 font-black hover:text-white transition-all">취소 및 나가기</button>
                    <button onClick={() => { onSave(localWin, localLoss); onClose(); }} className="bg-blue-600 px-20 py-5 rounded-[2rem] text-xl text-white font-black hover:bg-blue-500 active:scale-95 transition-all shadow-2xl shadow-blue-500/20">모든 전술 변경 사항 저장하기</button>
                </div>
            </div>
        </div>
    );
};

// --- Cockpit Page Component ---
function CockpitAnalysisContent() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('id');

    // States
    const [match, setMatch] = useState<any>(null);
    const [logs, setLogs] = useState<BDPointLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [currentSet, setCurrentSet] = useState(1);
    const [activeTime, setActiveTime] = useState(0);
    const playerRef = useRef<any>(null);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [players, setPlayers] = useState<any[]>([]);
    
    // UI Mode State
    const [activeView, setActiveView] = useState<'video' | 'report'>('video');

    const timelineRef = useRef<HTMLDivElement>(null);

    const initialWin = [{ group: '스매시', items: ['직선 스매시', '대각 스매시', '반 스매시'] }, { group: '드롭', items: ['직선', '대각(크로스)'] }, { group: '네트 플레이', items: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬'] }, { group: '기타 공격', items: ['드라이브', '클리어 공격', '롱서브', '행운의 득점'] }, { group: '상대 에러', items: ['언더 에러', '스매시 에러', '서브 에러', '클리어 에러', '기본기 에러', '백핸드 에러'] }];
    const initialLoss = [{ group: '상대 공격 득점', items: ['스매시', '대각 스매시', '헤어핀', '크 헤어핀', '드롭', '헤 + 푸시'] }, { group: '전술 당함', items: ['페인트 모션', '코스 속임수', '템포 변화'] }, { group: '나의 에러', items: ['스매시 에러', '드롭 에러', '언더 에러', '헤어핀 에러', '클리어 에러', '기본기 에러'] }];

    const [winCats, setWinCats] = useState(initialWin);
    const [lossCats, setLossCats] = useState(initialLoss);

    const fetchData = async () => {
        if (!matchId) return;
        setLoading(true);
        const { data: mData } = await supabase.from('bd_matches').select(`*, tournament:bd_tournaments(*), opponent_1:bd_players!opponent_1_id(name)`).eq('id', matchId).single();
        if (mData) {
            setMatch(mData);
            if (mData.feedback_notes && mData.feedback_notes.startsWith('{')) {
                try {
                    const meta = JSON.parse(mData.feedback_notes);
                    if (meta.customCategories) {
                        const w = Array.isArray(meta.customCategories.win) ? meta.customCategories.win : initialWin;
                        const l = Array.isArray(meta.customCategories.loss) ? meta.customCategories.loss : initialLoss;
                        setWinCats(w.map((c: any) => ({ ...c, items: Array.isArray(c.items) ? c.items : [] })));
                        setLossCats(l.map((c: any) => ({ ...c, items: Array.isArray(c.items) ? c.items : [] })));
                    }
                } catch (e) {
                    setWinCats(initialWin);
                    setLossCats(initialLoss);
                }
            }
        }
        const { data: lData } = await supabase.from('bd_point_logs').select('*').eq('match_id', matchId).order('video_timestamp', { ascending: true });
        setLogs(lData || []);
        const { data: pData } = await supabase.from('bd_players').select('*');
        setPlayers(pData || []);
        
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [matchId]);

    // Timer Sync
    useEffect(() => {
        const interval = setInterval(() => {
            try { 
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    setActiveTime(Math.floor(playerRef.current.getCurrentTime())); 
                }
            } catch (e) {}
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Handle Set Change -> Seek Video to specified start time
    useEffect(() => {
        if (!match) return;
        const timeToSeconds = (timeStr: any) => {
            if (timeStr == null) return 0;
            const str = String(timeStr);
            const parts = str.split(':');
            if (parts.length === 2) return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
            return parseInt(str) || 0;
        };
        const startSeconds = timeToSeconds(match[`set_${currentSet}_start`] || '00:00');
        if (startSeconds >= 0) {
            try {
                if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                    playerRef.current.seekTo(startSeconds, true);
                }
            } catch (e) {
                console.warn('YouTube Player seekTo error:', e);
            }
        }
    }, [currentSet, match]);

    // Scroll Sync - FIXED TO PREVENT SHIFTING
    useEffect(() => {
        if (editingLogId) return; // Don't scroll while editing
        const activeLog = [...logs].reverse().find(l => l.set_number === currentSet && l.video_timestamp <= activeTime);
        if (activeLog && timelineRef.current) {
            const el = document.getElementById(`log-${activeLog.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [activeTime, logs, currentSet, editingLogId]);

    const handleSaveCols = async (w: CategoryGroup[], l: CategoryGroup[]) => {
        setWinCats(w); setLossCats(l);
        if (!matchId || !match) return;
        try {
            let meta = {}; 
            if (match.feedback_notes && match.feedback_notes.startsWith('{')) meta = JSON.parse(match.feedback_notes);
            const newMeta = { ...meta, customCategories: { win: w, loss: l } };
            await supabase.from('bd_matches').update({ feedback_notes: JSON.stringify(newMeta) }).eq('id', matchId);
        } catch (e) {}
    };

    const handleSaveMatch = async (updatedData: any) => {
        if (!matchId) return;
        try {
            const { error } = await supabase.from('bd_matches').update(updatedData).eq('id', matchId);
            if (error) throw new Error(error.message);
            setIsMatchModalOpen(false);
            fetchData();
        } catch (e: any) {
            alert("경기 정보 업데이트 실패: " + e.message);
        }
    };

    const syncScoresForSet = async (setId: number, currentLogs: BDPointLog[]) => {
        try {
            const sLogs = currentLogs.filter(l => l.set_number === setId).sort((a, b) => Number(a.video_timestamp || 0) - Number(b.video_timestamp || 0));
            let cp = 0, co = 0;
            const updates: {id: string, current_score: string}[] = [];
            
            const finalSLogs = sLogs.map(l => {
                if (l.is_my_point) cp++; else co++;
                const expectedScore = `${cp}-${co}`;
                if (l.current_score !== expectedScore) {
                    updates.push({ id: l.id, current_score: expectedScore });
                }
                return { ...l, current_score: expectedScore };
            });

            const finalLogs = currentLogs.map(l => l.set_number === setId ? (finalSLogs.find(sl => sl.id === l.id) || l) : l);
            setLogs(finalLogs); // Update UI Instantly

            // Update DB in parallel
            if (updates.length > 0) {
                await Promise.all(updates.map(u => supabase.from('bd_point_logs').update({ current_score: u.current_score }).eq('id', u.id)));
            }

            await supabase.from('bd_matches').update({
                [`set_${setId}_score_player`]: cp,
                [`set_${setId}_score_opponent`]: co
            }).eq('id', matchId);
        } catch (error: any) {
            alert("동기화 오류: " + error?.message);
        }
    };

    const handleCategoryClick = async (category: string, isMyPoint: boolean, groupLabel: string) => {
        if (!matchId) return;

        try {
            if (editingLogId) {
                const { data, error } = await supabase.from('bd_point_logs')
                    .update({ point_type: category, is_my_point: isMyPoint })
                    .eq('id', editingLogId)
                    .select().single();
                    
                if (error) throw new Error(error.message);
                if (data) {
                    const newLogs = logs.map(l => l.id === editingLogId ? { ...data, primary_category: groupLabel } : l);
                    setEditingLogId(null);
                    await syncScoresForSet(currentSet, newLogs);
                }
                return;
            }

            const currentVidTime = playerRef.current && typeof playerRef.current.getCurrentTime === 'function' ? Math.floor(playerRef.current.getCurrentTime()) : 0;
            if (!playerRef.current) console.warn("Player is null, timestamp will be 0");

            const newLogDb = { 
                match_id: matchId, set_number: currentSet, is_my_point: isMyPoint, 
                point_type: category, current_score: '0-0',
                video_timestamp: currentVidTime
            };
            const { data, error } = await supabase.from('bd_point_logs').insert([newLogDb]).select().single();
            if (error) throw new Error(error.message);
            if (data) await syncScoresForSet(currentSet, [...logs, { ...data, primary_category: groupLabel }]);
        } catch (e: any) {
            alert("카테고리 저장 실패: " + e.message);
        }
    };

    const deleteLog = async (id: string) => {
        try {
            if (!confirm('삭제 시 목록 점수도 함께 업데이트됩니다. 계속하시겠습니까?')) return;
            const { error } = await supabase.from('bd_point_logs').delete().eq('id', id);
            if (error) throw new Error(error.message);
            await syncScoresForSet(currentSet, logs.filter(l => l.id !== id));
        } catch (error: any) {
            alert("삭제 실패: " + error?.message);
        }
    };

    const cSetLogs = (currentSet === 0 ? logs : logs.filter(l => l.set_number === currentSet)).sort((a, b) => Number(a.video_timestamp || 0) - Number(b.video_timestamp || 0));
    const [sMe, sOpp] = cSetLogs.length > 0 ? parseScore(cSetLogs[cSetLogs.length - 1].current_score) : [0, 0];
    const currentActiveLog = [...cSetLogs].reverse().find(l => l.video_timestamp <= activeTime);

    if (loading) return <div className="h-screen bg-[#080d1a] flex items-center justify-center text-blue-500 font-bold uppercase tracking-widest leading-none">Restoring Expert Cockpit...</div>;

    return (
        <div className="flex flex-col h-screen bg-[#080d1a] text-slate-100 font-sans overflow-hidden">
            
            {/* STICKY HEADER */}
            <div className="h-16 bg-[#0b1221] border-b border-white/5 flex items-center justify-between px-8 shrink-0 z-50">
                <div className="flex items-center gap-6">
                    <Link href={`/tournaments/`} className="p-2 transition-all hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"><ChevronLeft className="w-5 h-5" /></Link>
                    <div className="flex flex-col group cursor-pointer" onClick={() => setIsMatchModalOpen(true)}>
                        <h1 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                            {match?.match_name} <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all text-blue-400" />
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            {match?.tournament && <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{match.tournament.name}</span>}
                            <span className="text-[10px] text-blue-500 font-black">
                                vs {match?.opponent_1?.name}{match?.opponent_1?.school ? ` (${match.opponent_1.school})` : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center p-1.5 bg-[#0b1221] rounded-2xl gap-1 mx-8 border border-white/10 shadow-2xl relative">
                    <button 
                        onClick={() => { setActiveView('video'); if (currentSet === 0) setCurrentSet(1); }} 
                        className={cn("w-40 py-3 rounded-xl text-[12px] font-black transition-all uppercase tracking-widest flex justify-center items-center gap-2", activeView === 'video' ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50" : "text-slate-400 hover:text-white hover:bg-white/5")}
                    >
                        영상 기록
                    </button>
                    <button 
                        onClick={() => setActiveView('report')} 
                        className={cn("w-40 py-3 rounded-xl text-[12px] font-black transition-all uppercase tracking-widest flex justify-center items-center gap-2", activeView === 'report' ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-400/50" : "text-slate-400 hover:text-white hover:bg-white/5")}
                    >
                        <BarChart3 className="w-4 h-4" /> 통계 리포트
                    </button>
                </div>

                <div className="flex gap-2">
                    {activeView === 'report' && (
                        <button 
                            onClick={async () => {
                                setIsBackingUp(true);
                                try {
                                    const captureZone = document.getElementById('dashboard-capture-zone');
                                    let screenshot = '';
                                    if (captureZone) {
                                        // Wait a moment for chart animations to settle if needed, but usually fine
                                        const canvas = await html2canvas(captureZone, { backgroundColor: '#080d1a', scale: 0.8 });
                                        screenshot = canvas.toDataURL('image/jpeg', 0.5);
                                    }
                                    
                                    const [{ data: t }, { data: p }, { data: m }, { data: pl }] = await Promise.all([
                                        supabase.from('bd_tournaments').select('*'), supabase.from('bd_players').select('*'),
                                        supabase.from('bd_matches').select('*'), supabase.from('bd_point_logs').select('*')
                                    ]);
                                    
                                    const backName = `${match?.match_name} 스냅샷 백업 (${currentSet === 0 ? '전체결과' : currentSet+'세트'})`;
                                    const { error } = await supabase.from('bd_backups').insert([{
                                        name: backName,
                                        data: { tournaments: t, players: p, matches: m, pointLogs: pl, screenshot }
                                    }]);
                                    
                                    if (error) throw error;
                                    alert('현재 보고 계신 대시보드 스냅샷과 함께 전체 데이터가 성공적으로 백업되었습니다.');
                                } catch (e: any) {
                                    alert('백업 실패: ' + e.message);
                                } finally {
                                    setIsBackingUp(false);
                                }
                            }}
                            disabled={isBackingUp}
                            className="mr-6 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-black text-[12px] flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50"
                        >
                            {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            {isBackingUp ? '저장 중...' : '스냅샷 백업'}
                        </button>
                    )}

                    {[1, 2, 3].map(s => (
                        <button key={s} onClick={() => setCurrentSet(s)} className={cn("px-8 py-2 rounded-xl text-[11px] font-black transition-all border", currentSet === s ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]" : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/5")}>{s} set</button>
                    ))}
                    {activeView === 'report' && (
                        <button onClick={() => setCurrentSet(0)} className={cn("px-8 py-2 rounded-xl text-[11px] font-black transition-all border", currentSet === 0 ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]" : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/5")}>전체결과</button>
                    )}
                </div>

                <div className="flex items-center gap-8 ml-8">
                    <button onClick={() => setIsCatModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black hover:bg-blue-600 transition-all group"><Settings2 className="w-4 h-4 text-blue-400 group-hover:text-white" /> 카테고리 관리</button>
                    <div className="flex items-center gap-4 font-black">
                        <span className="text-3xl text-blue-400 tabular-nums">{sMe}</span>
                        <span className="text-2xl text-slate-800 italic">:</span>
                        <span className="text-3xl text-rose-500 tabular-nums">{sOpp}</span>
                    </div>
                </div>
            </div>

            {/* MAIN WORKSPACE OR REPORT DASHBOARD */}
            {activeView === 'video' ? (
                <div className="flex-1 flex overflow-hidden p-2 gap-2 animate-in fade-in duration-500">
                    
                    {/* COLUMN 1: WIN SIDEBAR (Left) */}
                    <div className="w-[300px] bg-[#0b1221] border border-white/5 rounded-[2.5rem] p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6 shadow-2xl shrink-0">
                        <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] border-b border-white/5 pb-2">WIN TRACKER</h3>
                        {winCats.map((cat) => (
                            <div key={cat.group} className="space-y-2">
                                <label className="text-[12px] font-black text-blue-500 uppercase tracking-widest px-2">{cat.group}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {cat.items.map(item => (
                                        <button key={item} onClick={() => handleCategoryClick(item, true, cat.group)} className="py-2.5 px-1 rounded-2xl bg-blue-600 border border-blue-500 text-white text-[12px] font-bold shadow-lg hover:bg-blue-500 active:scale-95 transition-all truncate">{item}</button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* COLUMN 2: CENTER BLOCK (VIDEO + LOSS DASH) - PURE ISOLATION */}
                    <div className="flex-1 flex flex-col overflow-hidden gap-0">
                        {/* VIDEO CONTAINER (ASPECT VIDEO FIXED) */}
                        <div className="w-full aspect-video bg-black rounded-t-[2.5rem] overflow-hidden border border-white/5 flex items-center justify-center p-0 shrink-0">
                            <div className="w-full h-full"><YoutubePlayer videoId={match?.youtube_video_id || ''} onPlayerReady={(p) => { playerRef.current = p; }} /></div>
                        </div>

                        {/* LOSS DASHBOARD (PERFECTLY ANCHORED TO VIDEO BOTTOM) */}
                        <div className="flex-1 bg-[#0b1221] border-l border-r border-b border-white/10 p-6 flex gap-4 overflow-y-auto custom-scrollbar shadow-2xl rounded-b-[2.5rem]">
                            {lossCats.map((cat) => (
                                <div key={cat.group} className="flex-1 bg-rose-950/10 rounded-3xl border border-rose-500/10 p-5 space-y-3 shrink-0 h-fit">
                                    <label className="text-[12px] font-black text-rose-500 uppercase tracking-widest">{cat.group}</label>
                                    <div className="flex flex-wrap gap-2.5">
                                        {cat.items.map(item => (
                                            <button key={item} onClick={() => handleCategoryClick(item, false, cat.group)} className="py-2.5 px-5 rounded-xl bg-rose-600 border border-rose-500 text-white text-[12px] font-black shadow-lg hover:bg-rose-500 active:scale-95 transition-all">{item}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUMN 3: RALLY TIMELINE (Right) - INDEPENDENT HEIGHT */}
                    <div className="w-[440px] bg-[#0b1221] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl shrink-0 h-[814px]">
                        <div className="px-6 py-5 border-b border-white/10 bg-slate-950/40 flex items-center gap-3"><Activity className="w-4 h-4 text-white/30"/><span className="text-[11px] font-black text-white/40 uppercase tracking-widest">RALLY TIMELINE (SYNCED)</span></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5 bg-black/40" ref={timelineRef}>
                            {cSetLogs.map((l) => {
                                const isActive = currentActiveLog?.id === l.id;
                                const pCat = (l.is_my_point ? winCats : lossCats).find(c => c.items.includes(l.point_type))?.group || '';

                                return (
                                    <div key={l.id} id={`log-${l.id}`} onClick={() => playerRef.current?.seekTo(l.video_timestamp, true)} className={cn("flex items-center px-6 py-4 rounded-2xl border transition-all cursor-pointer group", isActive ? "bg-white border-white shadow-2xl scale-[1.02] z-10" : "bg-slate-900/40 border-white/5 hover:border-white/10")}>
                                        <div className={cn("w-14 font-black text-lg tabular-nums", isActive ? "text-black" : (l.is_my_point ? "text-blue-400" : "text-rose-500"))}>{l.current_score}</div>
                                        <div className="flex-1 px-4">
                                            {editingLogId === l.id ? (
                                                <div className="flex items-center justify-between gap-1 bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full text-[11px] font-black border border-yellow-500/30">
                                                    <span>카테고리를 재선택하여 수정...</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingLogId(null); }} className="px-2 py-0.5 bg-black/40 rounded hover:bg-black/60 text-white/70">취소</button>
                                                </div>
                                            ) : (
                                                <div className={cn("px-4 py-1.5 rounded-full uppercase transition-all flex items-center justify-center gap-1.5", isActive ? "bg-black text-white" : (l.is_my_point ? "bg-blue-500/10" : "bg-rose-500/10"))}>
                                                    {pCat && (
                                                        <>
                                                            <span className={cn("text-[13px] font-black", l.is_my_point ? "text-blue-400" : "text-rose-400")}>{pCat}</span>
                                                            <span className={cn("text-[13px] font-normal", l.is_my_point ? "text-blue-500/50" : "text-rose-500/50")}>|</span>
                                                        </>
                                                    )}
                                                    <span className={cn("text-[12px] font-bold", l.is_my_point ? "text-blue-300" : "text-rose-300")}>{l.point_type}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className={cn("w-12 text-center font-black text-[12px] tabular-nums", isActive ? "text-black" : "text-slate-300 opacity-90")}>{formatTime(l.video_timestamp)}</div>
                                        <div className="w-16 flex justify-end gap-2 pr-1">
                                            <button onClick={(e) => { e.stopPropagation(); setEditingLogId(l.id); }} className={cn("hover:scale-125 transition-all outline-none", isActive ? "text-black/60 hover:text-black" : "text-slate-400 hover:text-white")}><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteLog(l.id); }} className={cn("hover:scale-125 transition-all outline-none", isActive ? "text-rose-500 hover:text-rose-600" : "text-slate-500 hover:text-rose-500")}><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <SetDashboard logs={cSetLogs} setNumber={currentSet} winCats={winCats} lossCats={lossCats} />
                </div>
            )}

            <CategoryModal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} winCats={winCats} lossCats={lossCats} onSave={handleSaveCols} />
            <MatchModal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} match={match} players={players} tournamentId={match?.tournament_id} onSave={handleSaveMatch} />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                body { overflow: hidden; height: 100vh; }
            `}</style>
        </div>
    );
}

export default function PremiumCockpitPage() {
    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="h-screen bg-[#080d1a] flex items-center justify-center text-blue-500 font-bold uppercase tracking-widest leading-none">Stabilizing High-Fidelity Layout...</div>}>
                <CockpitAnalysisContent />
            </Suspense>
        </ErrorBoundary>
    );
}
