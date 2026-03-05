'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BDPointType } from '@/types';
import {
    Clock,
    Plus,
    Minus,
    Loader2,
    Trophy,
    AlertCircle,
    Info,
    Sparkles,
    ChevronRight,
    MousePointer2,
    CheckCircle2,
    Settings2,
    Trash2,
    X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function ScoreCounter({ label, score, setScore, color, compact }: {
    label: string,
    score: number,
    setScore: (s: number) => void,
    color: 'blue' | 'red',
    compact?: boolean
}) {
    const activeColor = color === 'blue' ? 'text-blue-600' : 'text-red-600';
    const bgColor = color === 'blue' ? 'hover:bg-blue-50' : 'hover:bg-red-50';

    return (
        <div className="flex items-center gap-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setScore(Math.max(0, score - 1))}
                    className={cn("p-1.5 rounded-lg transition-colors", bgColor)}
                >
                    <Minus className="w-4 h-4 text-slate-400" />
                </button>
                <span className={cn("text-3xl font-black tabular-nums tracking-tighter", activeColor)}>{score}</span>
                <button
                    onClick={() => setScore(score + 1)}
                    className={cn("p-1.5 rounded-lg transition-colors", bgColor)}
                >
                    <Plus className="w-4 h-4 text-slate-400" />
                </button>
            </div>
        </div>
    );
}

interface DataEntryLoggerProps {
    player: any;
    matchId: string;
    onLogAdded: (log: any) => void;
    initialScoreMe?: number;
    initialScoreOpp?: number;
    currentSet: number;
    onSetChange: (set: number) => void;
}

export default function DataEntryLogger({
    player,
    matchId,
    onLogAdded,
    initialScoreMe = 0,
    initialScoreOpp = 0,
    currentSet,
    onSetChange
}: DataEntryLoggerProps) {
    const [customType, setCustomType] = useState<string>('');
    const [sessionCustomWinners, setSessionCustomWinners] = useState<string[]>([]);
    const [sessionCustomLosses, setSessionCustomLosses] = useState<string[]>([]);
    const [scoreMe, setScoreMe] = useState(initialScoreMe);
    const [scoreOpp, setScoreOpp] = useState(initialScoreOpp);
    const [submitting, setSubmitting] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);

    useEffect(() => {
        setScoreMe(initialScoreMe);
        setScoreOpp(initialScoreOpp);
    }, [initialScoreMe, initialScoreOpp]);

    // Persist custom categories
    useEffect(() => {
        const savedWinners = localStorage.getItem('bd_custom_winners');
        const savedLosses = localStorage.getItem('bd_custom_losses');
        if (savedWinners) {
            try { setSessionCustomWinners(JSON.parse(savedWinners)); } catch (e) { console.error(e); }
        }
        if (savedLosses) {
            try { setSessionCustomLosses(JSON.parse(savedLosses)); } catch (e) { console.error(e); }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('bd_custom_winners', JSON.stringify(sessionCustomWinners));
    }, [sessionCustomWinners]);

    useEffect(() => {
        localStorage.setItem('bd_custom_losses', JSON.stringify(sessionCustomLosses));
    }, [sessionCustomLosses]);

    // Simplified labels (names only)
    const pointTypes: { value: BDPointType; label: string, category: 'offensive' | 'tactical' | 'error' | 'others' }[] = [
        { value: 'smash_winner', label: '스매시', category: 'offensive' },
        { value: 'net_kill', label: '네트킬', category: 'offensive' },
        { value: 'push_winner', label: '푸시', category: 'offensive' },
        { value: 'drive_winner', label: '드라이브', category: 'tactical' },
        { value: 'drop_winner', label: '드롭', category: 'tactical' },
        { value: 'hairpin_winner', label: '헤어핀', category: 'tactical' },
        { value: 'clear_winner', label: '클리어', category: 'tactical' },
        { value: 'unforced_error', label: '범실', category: 'error' },
        { value: 'out_error', label: '아웃', category: 'error' },
        { value: 'net_error', label: '네트', category: 'error' },
        { value: 'service_fault', label: '서브폴트', category: 'error' },
        { value: 'receive_error', label: '리시브불안', category: 'others' },
        { value: 'opponent_winner', label: '상대득점', category: 'others' },
    ];

    const handleAddLog = async (isMyPoint: boolean, pointType: string) => {
        if (submitting) return;
        setSubmitting(true);

        const timestamp = player ? Math.floor(player.getCurrentTime()) : 0;
        const newScoreMe = isMyPoint ? scoreMe + 1 : scoreMe;
        const newScoreOpp = !isMyPoint ? scoreOpp + 1 : scoreOpp;
        const currentScore = `${newScoreMe}-${newScoreOpp}`;

        try {
            const { data, error } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: currentSet,
                    current_score: currentScore,
                    is_my_point: isMyPoint,
                    point_type: pointType,
                    video_timestamp: timestamp
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onLogAdded(data);
                setScoreMe(newScoreMe);
                setScoreOpp(newScoreOpp);
            }
        } catch (err: any) {
            alert('기록 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddCustomCategory = (isMyPoint: boolean) => {
        if (!customType.trim()) return;
        if (isMyPoint) {
            if (!sessionCustomWinners.includes(customType)) {
                setSessionCustomWinners(prev => [...prev, customType]);
            }
        } else {
            if (!sessionCustomLosses.includes(customType)) {
                setSessionCustomLosses(prev => [...prev, customType]);
            }
        }
        setCustomType('');
    };

    const handleDeleteCustomCategory = (isMyPoint: boolean, label: string) => {
        if (isMyPoint) {
            setSessionCustomWinners(prev => prev.filter(l => l !== label));
        } else {
            setSessionCustomLosses(prev => prev.filter(l => l !== label));
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 p-10 shadow-2xl space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* 1. Integrated Header: Score & Set Switcher */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-8">
                    <div className="space-y-3">
                        <h3 className="font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-2 text-slate-400">
                            <Clock className="w-5 h-5 text-blue-500" /> LOG RECORDING
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                            {[1, 2, 3].map(s => (
                                <button
                                    key={s}
                                    onClick={() => onSetChange(s)}
                                    className={cn(
                                        "px-8 py-3 rounded-xl text-[11px] font-black transition-all",
                                        currentSet === s
                                            ? "bg-white dark:bg-slate-700 text-slate-900 shadow-xl scale-110 z-10"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Set {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-12 py-5 px-12 bg-slate-50 dark:bg-slate-800/50 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-inner">
                    <ScoreCounter label="ME" score={scoreMe} setScore={setScoreMe} color="blue" />
                    <div className="text-4xl font-black text-slate-200 px-2">:</div>
                    <ScoreCounter label="OPP" score={scoreOpp} setScore={setScoreOpp} color="red" />
                </div>
            </div>

            {/* 2. Main Categories Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                {/* Winners Column */}
                <div className="space-y-10">
                    <div className="flex items-center justify-between border-b-4 border-blue-50 dark:border-blue-900/30 pb-5">
                        <div className="flex items-center gap-5 text-xl font-black text-blue-600 uppercase tracking-widest">
                            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-200">
                                <Trophy className="w-8 h-8" />
                            </div>
                            내 득점 (Winners)
                        </div>
                        <button
                            onClick={() => setIsManageMode(!isManageMode)}
                            className={cn(
                                "p-3 rounded-xl transition-all",
                                isManageMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                            title="카테고리 관리"
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-10">
                        {/* Offensive */}
                        <div className="space-y-5">
                            <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                공격 (Offensive) <ChevronRight className="w-4 h-4 opacity-30" />
                            </span>
                            <div className="flex flex-wrap gap-4">
                                {pointTypes.filter(t => t.category === 'offensive').map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleAddLog(true, type.value)}
                                        disabled={submitting || isManageMode}
                                        className="px-8 py-4.5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tactical & Custom Winners */}
                        <div className="space-y-5">
                            <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                기술/나만의 (Tactical) <ChevronRight className="w-4 h-4 opacity-30" />
                            </span>
                            <div className="flex flex-wrap gap-4">
                                {pointTypes.filter(t => t.category === 'tactical').map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleAddLog(true, type.value)}
                                        disabled={submitting || isManageMode}
                                        className="px-8 py-4.5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                                {sessionCustomWinners.map(label => (
                                    <div key={label} className="relative group">
                                        <button
                                            onClick={() => handleAddLog(true, label)}
                                            disabled={submitting || isManageMode}
                                            className="px-8 py-4.5 rounded-[24px] border-2 border-emerald-100 bg-emerald-50/30 text-emerald-700 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                        >
                                            {label}
                                        </button>
                                        {isManageMode && (
                                            <button
                                                onClick={() => handleDeleteCustomCategory(true, label)}
                                                className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Losses Column */}
                <div className="space-y-10">
                    <div className="flex items-center justify-between border-b-4 border-red-50 dark:border-red-900/30 pb-5">
                        <div className="flex items-center gap-5 text-xl font-black text-red-600 uppercase tracking-widest">
                            <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-200">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            내 실점 (Losses)
                        </div>
                    </div>

                    <div className="space-y-10">
                        {/* Errors */}
                        <div className="space-y-5">
                            <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                범실 (Errors) <ChevronRight className="w-4 h-4 opacity-30" />
                            </span>
                            <div className="flex flex-wrap gap-4">
                                {pointTypes.filter(t => t.category === 'error').map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleAddLog(false, type.value)}
                                        disabled={submitting || isManageMode}
                                        className="px-8 py-4.5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 hover:border-red-500 hover:bg-red-50 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                                {sessionCustomLosses.map(label => (
                                    <div key={label} className="relative group">
                                        <button
                                            onClick={() => handleAddLog(false, label)}
                                            disabled={submitting || isManageMode}
                                            className="px-8 py-4.5 rounded-[24px] border-2 border-rose-100 bg-rose-50/30 text-rose-700 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                        >
                                            {label}
                                        </button>
                                        {isManageMode && (
                                            <button
                                                onClick={() => handleDeleteCustomCategory(false, label)}
                                                className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Others */}
                        <div className="space-y-5">
                            <span className="text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                기타 (Others) <ChevronRight className="w-4 h-4 opacity-30" />
                            </span>
                            <div className="flex flex-wrap gap-4">
                                {pointTypes.filter(t => t.category === 'others').map(type => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleAddLog(false, type.value)}
                                        disabled={submitting || isManageMode}
                                        className="px-8 py-4.5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 hover:border-red-500 hover:bg-red-50 text-[16px] font-black transition-all active:scale-95 shadow-sm"
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Direct Input Area - Simplified (Separate Add action) */}
            <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                <div className="relative group p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-700 transition-all focus-within:border-blue-500 focus-within:bg-white">
                    <div className="flex flex-col xl:flex-row gap-6 items-center">
                        <div className="flex-1 flex items-center px-6 gap-5 w-full">
                            <MousePointer2 className="w-7 h-7 text-slate-300" />
                            <input
                                type="text"
                                placeholder="나만의 새로운 기술명을 입력해 보세요..."
                                value={customType}
                                onChange={(e) => setCustomType(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddCustomCategory(true);
                                }}
                                className="w-full bg-transparent border-none focus:ring-0 text-xl font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex gap-4 w-full xl:w-auto">
                            <button
                                onClick={() => handleAddCustomCategory(true)}
                                disabled={!customType.trim()}
                                className="flex-1 xl:flex-none px-10 py-5 bg-slate-900 text-white rounded-[28px] text-sm font-black shadow-2xl disabled:opacity-20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Plus className="w-5 h-5 text-blue-400" /> 득점카테고리 추가
                            </button>
                            <button
                                onClick={() => handleAddCustomCategory(false)}
                                disabled={!customType.trim()}
                                className="flex-1 xl:flex-none px-10 py-5 bg-slate-900 text-white rounded-[28px] text-sm font-black shadow-2xl disabled:opacity-20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Plus className="w-5 h-5 text-red-500" /> 실점카테고리 추가
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-5 flex items-center gap-3 px-8 text-[14px] font-bold text-slate-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>여기서 기술을 추가하면 위의 <b>내 득점/실점</b> 섹션에 버튼이 생성됩니다. 생성된 버튼을 클릭해야 점수가 기록됩니다.</span>
                </div>
            </div>

            {/* 4. Terminology Guide */}
            <div className="p-10 bg-blue-50/30 rounded-[48px] border border-blue-100/50">
                <div className="flex items-center gap-3 text-xs font-black text-blue-500 uppercase tracking-[0.3em] mb-8">
                    <Info className="w-6 h-6" /> Terminology Guide
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="flex gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-black">득</div>
                        <div>
                            <p className="text-lg font-black text-slate-800">네트킬 (Net Kill)</p>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">네트 상단에서 셔틀콕을 내리꽂는 강력한 공격 기술입니다.</p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start">
                        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-black">실</div>
                        <div>
                            <p className="text-lg font-black text-slate-800">네트 (Net Error)</p>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed">셔틀콕이 네트에 걸려 상대방에게 점수를 내주는 범실입니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            {submitting && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-12 py-6 rounded-[32px] shadow-2xl flex items-center gap-5 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="font-black tracking-[0.2em] text-sm">연속 분석 데이터 기록 중...</span>
                </div>
            )}
        </div>
    );
}
