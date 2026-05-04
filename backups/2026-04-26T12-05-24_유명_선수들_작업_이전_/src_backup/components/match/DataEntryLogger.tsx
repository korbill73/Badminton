'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus, Loader2, Target, Zap, AlertCircle, XCircle, ShieldAlert, ArrowLeft
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BDPointLog } from '@/types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface CategorySelectData {
    reason: string;
    situation: string;
    pointType: string;
    rallyLength: string;
    buildUpFactor?: string;
}

interface DataEntryLoggerProps {
    player: any;
    matchId: string;
    onLogAdded: (log: any) => void;
    currentSet: number;
    onSetChange: (set: number) => void;
    categories?: any[]; // Keep for backward compatibility signature
    logs: BDPointLog[];
    onCategoryChange?: () => void;
}

// ── 3D Core Classification Data (Same as Mobile) ──
const REASONS = {
    WIN: [
        { id: 'Winner', label: '완벽한 공격 (Winner)', color: 'cyan', icon: <Zap className="w-5 h-5" /> },
        { id: 'Opponent Error', label: '상대 범실 유도 (Opp Error)', color: 'blue', icon: <Target className="w-5 h-5" /> },
    ],
    LOSS: [
        { id: 'Unforced Error', label: '어이없는 실수 (UFE)', color: 'rose', icon: <XCircle className="w-5 h-5" /> },
        { id: 'Forced Error', label: '압박에 의한 실수 (Forced Error)', color: 'orange', icon: <AlertCircle className="w-5 h-5" /> },
        { id: 'Opponent Winner', label: '상대 완벽 방어/공격', color: 'slate', icon: <ShieldAlert className="w-5 h-5" /> },
    ]
};

const SITUATIONS_WIN = [
    {
        id: '서브/리시브', groupLabel: '서브/리시브 (Serve/Receive)', color: 'indigo',
        techs: ['숏서브', '롱서브', '서브 리턴']
    },
    {
        id: '전위', groupLabel: '전위 플레이 (Net Play)', color: 'emerald',
        techs: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬']
    },
    {
        id: '후위', groupLabel: '후위 공격 (Rear Attack)', color: 'violet',
        techs: ['스매시', '반스매시', '직선 드롭', '크로스 드롭', '공격형 클리어']
    },
    {
        id: '수비/드라이브', groupLabel: '수비/드라이브 (Defense & Drive)', color: 'teal',
        techs: ['직선 드라이브', '대각 드라이브', '전위 커트', '언더 클리어', '하이 클리어', '수비 블록', '커버 플레이']
    }
];

const SITUATIONS_UFE = [
    {
        id: '판단/기술', groupLabel: '판단/기술 미스', color: 'orange',
        techs: ['무리한 공격(성급함)', '인/아웃 판단 미스', '타점/스윙 실수', '서브/리시브 범실']
    }
];

const SITUATIONS_FORCED = [
    {
        id: '실점원인', groupLabel: '실점 근본 원인', color: 'slate',
        techs: ['찬스 제공 (언더/드라이브 짧음)', '수비 위치 미스', '스텝/반응 늦음', '상대 공격 완벽']
    }
];

const BUILD_UP_FACTORS = [
    '끈질긴 수비/랠리', '예리한 코스 공략', '압도적 스피드/파워', '전술적 완급조절(흔들기)', '네트 장악력'
];

export default function DataEntryLogger({
    player,
    matchId,
    onLogAdded,
    currentSet,
    logs,
}: DataEntryLoggerProps) {
    const [submitting, setSubmitting] = useState(false);
    
    // Step state
    const [pendingReason, setPendingReason] = useState<{ isMyPoint: boolean; reason: string } | null>(null);
    const [selectedRally, setSelectedRally] = useState<string>("4~9구 (중반)");
    const [userTouchedRally, setUserTouchedRally] = useState(false);
    const [selectedBuildUp, setSelectedBuildUp] = useState<string | null>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    if (player) {
                        const state = player.getPlayerState();
                        if (state === 1) player.pauseVideo();
                        else player.playVideo();
                    }
                    break;
                case 'a':
                    if (player) player.seekTo(player.getCurrentTime() - 5);
                    break;
                case 'd':
                    if (player) player.seekTo(player.getCurrentTime() + 5);
                    break;
                case 'Escape':
                    setPendingReason(null);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player]);

    const handleAddLog = async (data: CategorySelectData) => {
        if (!pendingReason || submitting) return;
        setSubmitting(true);

        try {
            const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);
            const currentMe = currentSetLogs.filter(l => l.is_my_point).length;
            const currentOpp = currentSetLogs.filter(l => !l.is_my_point).length;
            const nextScore = pendingReason.isMyPoint ? `${currentMe + 1}-${currentOpp}` : `${currentMe}-${currentOpp + 1}`;

            const timestamp = player ? Math.floor(player.getCurrentTime()) : 0;
            const { data: insertedData, error } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: currentSet,
                    current_score: nextScore,
                    is_my_point: pendingReason.isMyPoint,
                    point_type: data.pointType,
                    reason: data.reason,
                    situation: data.situation,
                    rally_length: data.rallyLength,
                    build_up_factor: data.buildUpFactor,
                    video_timestamp: timestamp
                }])
                .select()
                .single();

            if (error) throw error;
            if (insertedData) {
                onLogAdded(insertedData);
            }
        } catch (err: any) {
            alert('기록 저장 중 오류: ' + err.message);
        } finally {
            setSubmitting(false);
            setPendingReason(null); // Return to Step 1
            setSelectedRally("4~9구 (중반)");
            setUserTouchedRally(false);
            setSelectedBuildUp(null);
        }
    };

    const getActiveSituations = () => {
        if (!pendingReason) return SITUATIONS_WIN;
        if (pendingReason.reason === 'Unforced Error' || pendingReason.reason === '어이없는 실수 (UFE)') return SITUATIONS_UFE;
        if (pendingReason.reason === 'Forced Error' || pendingReason.reason === '압박에 의한 실수 (Forced Error)' || pendingReason.reason === 'Opponent Winner' || pendingReason.reason === '상대 완벽 방어/공격') return SITUATIONS_FORCED;
        return SITUATIONS_WIN;
    };

    const activeSituations = getActiveSituations();

    return (
        <div className="h-full flex flex-col bg-slate-950 rounded-[24px] border border-white/10 p-2 shadow-2xl overflow-hidden relative group/logger">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

            <div className="flex-1 flex flex-col min-h-0 relative z-10 bg-slate-900/30 rounded-xl border border-white/5 p-3">
                
                {/* Header Sequence */}
                <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                    <div className="flex items-center gap-2">
                        {pendingReason ? (
                            <button 
                                onClick={() => setPendingReason(null)}
                                className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                        ) : (
                            <div className="w-6 h-6 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                <Target className="w-3.5 h-3.5 text-cyan-400" />
                            </div>
                        )}
                        <span className="text-[14px] font-black text-white tracking-tight">
                            {pendingReason ? "상황 통계(Where/What) 선택" : "원인 분석(Why) 단축 입력"}
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                    {!pendingReason ? (
                        <>
                            {/* Step 1: Reasons - WIN */}
                            <div>
                                <div className="flex items-center gap-1.5 px-1 mb-2 shrink-0">
                                    <Zap className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[12px] font-black tracking-tighter uppercase text-cyan-400">우리 득점 사유</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 p-1">
                                    {REASONS.WIN.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setPendingReason({ isMyPoint: true, reason: r.id })}
                                            className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all flex flex-col items-center gap-2 group active:scale-95"
                                        >
                                            <div className="text-cyan-400/80 group-hover:text-cyan-300">{r.icon}</div>
                                            <span className="text-[12px] font-bold text-cyan-100 whitespace-nowrap">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="h-px bg-white/5 mx-1 my-2" />

                            {/* Step 1: Reasons - LOSS */}
                            <div>
                                <div className="flex items-center gap-1.5 px-1 mb-2 shrink-0">
                                    <AlertCircle className="w-3 h-3 text-rose-500" />
                                    <span className="text-[12px] font-black tracking-tighter uppercase text-rose-500">상대 득점(우리 실점) 사유</span>
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-2 p-1">
                                    {REASONS.LOSS.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => setPendingReason({ isMyPoint: false, reason: r.id })}
                                            className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-400 transition-all flex flex-col items-center justify-center gap-2 group active:scale-95 text-center min-h-[85px]"
                                        >
                                            <div className="text-rose-400/80 group-hover:text-rose-300">{r.icon}</div>
                                            <span className="text-[11px] font-bold text-rose-100 max-w-full overflow-hidden leading-tight">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Step 2: Situations & Techs Grid */
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 relative">
                            {/* Selected Reason Badge */}
                            <div className="flex justify-center mb-2">
                                <span className={cn(
                                    "px-3 py-1 font-black text-[12px] rounded-full border",
                                    pendingReason.isMyPoint ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                )}>
                                    {pendingReason.reason}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Top Area: Rally Length Selector (Desktop) */}
                                <div className="bg-slate-950/80 rounded-[14px] p-1.5 border border-slate-800">
                                    <div className="flex bg-slate-900 rounded-xl p-1 gap-1">
                                        {["1~3구 (초반)", "4~9구 (중반)", "10구+ (장기전)"].map(rally => (
                                            <button
                                                key={rally}
                                                onClick={() => {
                                                    setSelectedRally(rally);
                                                    setUserTouchedRally(true);
                                                }}
                                                className={cn(
                                                    "flex-1 py-1.5 px-1.5 rounded-[8px] text-[11px] font-black transition-all text-center",
                                                    selectedRally === rally
                                                        ? (pendingReason.isMyPoint ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]")
                                                        : "text-slate-400 hover:text-slate-200 active:scale-95"
                                                )}
                                            >
                                                {rally}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* BuildUp Factors (Only for WIN causes) */}
                                {(pendingReason.reason === 'Winner' || pendingReason.reason === '완벽한 공격 (Winner)' || pendingReason.reason === 'Opponent Error' || pendingReason.reason === '상대 범실 유도 (Opp Error)') && (
                                    <div className="bg-cyan-950/30 rounded-xl border border-cyan-500/20 p-3 mb-2">
                                        <h4 className="text-[11px] font-black tracking-tight text-cyan-400 mb-2 flex items-center gap-1.5">
                                            득점의 결정적 요인 (Key Factor)
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {BUILD_UP_FACTORS.map(factor => (
                                                <button
                                                    key={factor}
                                                    onClick={() => setSelectedBuildUp(factor)}
                                                    className={cn(
                                                        "flex-1 min-w-[45%] py-1.5 px-2 border rounded-[8px] text-[11px] font-black transition-all text-center break-keep leading-tight",
                                                        selectedBuildUp === factor
                                                            ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                                                            : "bg-slate-800/80 border-white/10 text-slate-300 hover:text-white"
                                                    )}
                                                >
                                                    {factor}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeSituations.map(sit => (
                                    <div key={sit.id} className="bg-slate-950/40 rounded-xl border border-white/5 p-3 relative overflow-hidden">
                                        <h4 className="text-[11px] font-black tracking-tight text-white/80 mb-2 flex items-center gap-1.5 relative z-10">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                sit.color === 'indigo' ? "bg-indigo-400" :
                                                sit.color === 'emerald' ? "bg-emerald-400" :
                                                sit.color === 'violet' ? "bg-violet-400" :
                                                sit.color === 'amber' ? "bg-amber-400" :
                                                sit.color === 'rose' ? "bg-rose-400" :
                                                sit.color === 'orange' ? "bg-orange-400" :
                                                sit.color === 'blue' ? "bg-blue-400" :
                                                sit.color === 'slate' ? "bg-slate-400" :
                                                "bg-teal-400"
                                            )} />
                                            {sit.groupLabel}
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 relative z-10 w-full">
                                            {sit.techs.map(tech => {
                                                const isChanceGiver = tech.includes('찬스 제공');
                                                return (
                                                    <button
                                                        key={tech}
                                                        onClick={() => {
                                                            const isWin = pendingReason.reason === 'Winner' || pendingReason.reason === '완벽한 공격 (Winner)' || pendingReason.reason === 'Opponent Error' || pendingReason.reason === '상대 범실 유도 (Opp Error)';
                                                            if (isWin && !selectedBuildUp) {
                                                                alert('결정적 요인(빌드업 과정)을 위 블록에서 먼저 한 가지 선택해주세요.');
                                                                return;
                                                            }

                                                            let finalRallyLength = selectedRally;
                                                            if (!userTouchedRally && sit.id === '서브/리시브') {
                                                                finalRallyLength = "1~3구 (초반)";
                                                            }
                                                            handleAddLog({
                                                                reason: pendingReason.reason,
                                                                situation: sit.id,
                                                                pointType: tech,
                                                                rallyLength: finalRallyLength,
                                                                buildUpFactor: isWin ? (selectedBuildUp || undefined) : undefined
                                                            });
                                                        }}
                                                        className={cn(
                                                            "flex-1 min-w-[28%] min-h-[36px] px-2.5 py-1.5 hover:bg-white/15 active:bg-white/20 active:scale-95 border rounded-lg text-[11px] font-bold transition-all whitespace-nowrap flex items-center justify-center",
                                                            isChanceGiver ? "bg-rose-600/90 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:bg-rose-500 hover:text-white" : "bg-slate-800/80 border-white/5 text-slate-300 hover:text-white",
                                                            (sit.id === '서브/리시브' && !userTouchedRally && selectedRally === "4~9구 (중반)") && "relative overflow-hidden group/hint"
                                                        )}
                                                    >
                                                        {sit.id === '서브/리시브' && !userTouchedRally && selectedRally === "4~9구 (중반)" && (
                                                            <div className="absolute inset-0 bg-blue-500/15 opacity-0 group-hover/hint:opacity-100 transition-opacity pointer-events-none" />
                                                        )}
                                                        <span>{tech}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {submitting && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[110]">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
            )}
        </div>
    );
}
