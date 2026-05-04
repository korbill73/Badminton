'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Zap, AlertCircle, Info, Target, ArrowUpCircle, ShieldAlert, XCircle, ArrowLeft
} from 'lucide-react';

import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

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

interface CategorySelectModalProps {
    isOpen: boolean;
    isMyPoint: boolean;
    categories?: any[]; // For backward compatibility
    onSelect: (data: CategorySelectData) => void;
    onClose: () => void;
}

// ── 3D Core Classification Data ──
const REASONS = {
    WIN: [
        { id: 'Winner', label: '완벽한 공격 (Winner)', desc: '상대가 막을 수 없는 완벽한 주도적 득점', color: 'cyan', icon: <Zap className="w-5 h-5" /> },
        { id: 'Opponent Error', label: '상대 범실 유도 (Opp Error)', desc: '나의 좋은 코스/압박으로 상대의 실수를 유도', color: 'blue', icon: <Target className="w-5 h-5" /> },
    ],
    LOSS: [
        { id: 'Unforced Error', label: '어이없는 실수 (Unforced Error)', desc: '충분히 칠 수 있는 공인데 네트/아웃 범실', color: 'rose', icon: <XCircle className="w-5 h-5" /> },
        { id: 'Forced Error', label: '압박에 의한 실수 (Forced Error)', desc: '상대의 날카로운 공격에 억지로 치다가 범실', color: 'orange', icon: <AlertCircle className="w-5 h-5" /> },
        { id: 'Opponent Winner', label: '상대 완벽 방어/공격 (Opp Winner)', desc: '상대가 너무 잘 쳐서 손을 댈 수 없는 실점', color: 'slate', icon: <ShieldAlert className="w-5 h-5" /> },
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
        id: '판단/기술', groupLabel: '판단/기술 미스 (Mental & Skill)', color: 'orange',
        techs: ['무리한 공격(성급함)', '인/아웃 판단 미스', '타점/스윙 실수', '서브/리시브 범실']
    }
];

const SITUATIONS_FORCED = [
    {
        id: '실점원인', groupLabel: '실점 근본 원인 (Root Cause of Loss)', color: 'slate',
        techs: ['찬스 제공 (언더/드라이브 짧음)', '수비 위치 미스', '스텝/반응 늦음', '상대 공격 완벽']
    }
];

const BUILD_UP_FACTORS = [
    '끈질긴 수비/랠리', '예리한 코스 공략', '압도적 스피드/파워', '전술적 완급조절(흔들기)', '네트 장악력'
];

export default function CategorySelectModal({
    isOpen,
    isMyPoint,
    categories,
    onSelect,
    onClose
}: CategorySelectModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [selectedRally, setSelectedRally] = useState<string>("4~9구 (중반)");
    const [userTouchedRally, setUserTouchedRally] = useState(false);
    const [selectedBuildUp, setSelectedBuildUp] = useState<string | null>(null);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedReason(null);
            setSelectedRally("4~9구 (중반)");
            setUserTouchedRally(false);
            setSelectedBuildUp(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const reasonsList = isMyPoint ? REASONS.WIN : REASONS.LOSS;
    const themeColor = isMyPoint ? 'cyan' : 'rose';

    const handleReasonSelect = (reasonId: string) => {
        setSelectedReason(reasonId);
        setStep(2);
    };

    const handleTechSelect = (situationId: string, pointType: string) => {
        if (!selectedReason) return;
        const isWin = selectedReason === 'Winner' || selectedReason === 'Opponent Error';
        
        if (isWin && !selectedBuildUp) {
            alert('득점의 결정적 요인(어떻게 찬스를 만들었는가)을 먼저 선택해주세요.');
            return;
        }

        let finalRallyLength = selectedRally;
        // 스마트 로직: 타수 미선택 상태에서 서브/리시브 그룹 기술 선택 시 자동 1~3구 세팅 (WIN일 때만 서브/리시브 그룹존재하므로 예외처리 완화)
        if (!userTouchedRally && situationId === '서브/리시브') {
            finalRallyLength = "1~3구 (초반)";
        }

        onSelect({
            reason: selectedReason,
            situation: situationId,
            pointType: pointType,
            rallyLength: finalRallyLength,
            buildUpFactor: isWin ? (selectedBuildUp || undefined) : undefined
        });
        onClose();
    };

    const getActiveSituations = () => {
        if (selectedReason === 'Unforced Error') return SITUATIONS_UFE;
        if (selectedReason === 'Forced Error' || selectedReason === 'Opponent Winner') return SITUATIONS_FORCED;
        return SITUATIONS_WIN;
    };

    const activeSituations = getActiveSituations();

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 animate-in fade-in duration-300 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/50">
                    <div className="flex items-center gap-4">
                        {step === 2 && (
                            <button
                                onClick={() => setStep(1)}
                                className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg",
                            isMyPoint ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        )}>
                            {isMyPoint ? <Zap className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className={cn(
                                "text-lg font-black tracking-tight",
                                isMyPoint ? "text-cyan-400" : "text-rose-500"
                            )}>
                                {step === 1 ? "1단계: 왜 득/실을 했는가? (Why)" : "2/3단계: 랠리 타수 및 상세 기술 (When/Where/What)"}
                            </h2>
                            <p className="text-slate-500 text-[10px] font-bold mt-0.5">
                                {step === 1 
                                    ? (isMyPoint ? "득점의 원인을 한 가지 선택해주세요" : "실점의 원인을 한 가지 선택해주세요 (특히 UFE 구분이 중요합니다)")
                                    : "상단의 랠리 타수 선택 후 하단에서 해당하는 기술을 터치하세요"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {reasonsList.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => handleReasonSelect(r.id)}
                                    className={cn(
                                        "text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden",
                                        r.color === 'cyan' ? "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10" :
                                        r.color === 'blue' ? "bg-blue-500/5 border-blue-500/20 hover:border-blue-400 hover:bg-blue-500/10" :
                                        r.color === 'rose' ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-400 hover:bg-rose-500/10" :
                                        r.color === 'orange' ? "bg-orange-500/5 border-orange-500/20 hover:border-orange-400 hover:bg-orange-500/10" :
                                        "bg-slate-500/5 border-slate-500/30 hover:border-slate-400 hover:bg-slate-500/10"
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            r.color === 'cyan' ? "bg-cyan-500/20 text-cyan-400" :
                                            r.color === 'blue' ? "bg-blue-500/20 text-blue-400" :
                                            r.color === 'rose' ? "bg-rose-500/20 text-rose-400" :
                                            r.color === 'orange' ? "bg-orange-500/20 text-orange-400" :
                                            "bg-slate-700/50 text-slate-300"
                                        )}>
                                            {r.icon}
                                        </div>
                                        <h3 className={cn(
                                            "text-lg font-black",
                                            r.color === 'cyan' ? "text-cyan-300" :
                                            r.color === 'blue' ? "text-blue-300" :
                                            r.color === 'rose' ? "text-rose-300" :
                                            r.color === 'orange' ? "text-orange-300" :
                                            "text-slate-300"
                                        )}>
                                            {r.label}
                                        </h3>
                                    </div>
                                    <p className="text-[13px] font-bold text-slate-400 leading-relaxed pl-1">
                                        {r.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Selected Reason Header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-950/80 rounded-xl border border-white/5">
                                <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded bg-white/10",
                                    themeColor === 'cyan' ? 'text-cyan-400' : 'text-rose-400'
                                )}>Step 1 결과</span>
                                <span className="text-sm font-bold text-white">{selectedReason}</span>
                            </div>

                            {/* Top Area: Rally Length Selector */}
                            <div className="bg-slate-950/80 rounded-[20px] p-2 border border-slate-800">
                                <div className="flex bg-slate-900 rounded-[16px] p-1 gap-1">
                                    {["1~3구 (초반)", "4~9구 (중반)", "10구+ (장기전)"].map(rally => (
                                        <button
                                            key={rally}
                                            onClick={() => {
                                                setSelectedRally(rally);
                                                setUserTouchedRally(true);
                                            }}
                                            className={cn(
                                                "flex-1 py-3 px-2 rounded-[12px] text-sm font-black transition-all text-center",
                                                selectedRally === rally
                                                    ? (themeColor === 'cyan' ? "bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.4)]" : "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]")
                                                    : "text-slate-400 hover:text-slate-200 active:scale-95"
                                            )}
                                        >
                                            {rally}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* BuildUp Factors (Only for WIN causes) */}
                            {(selectedReason === 'Winner' || selectedReason === 'Opponent Error') && (
                                <div className="bg-cyan-950/30 rounded-[24px] border border-cyan-500/20 p-5 mb-2">
                                    <h4 className="text-[13px] font-black tracking-tight text-cyan-400 mb-4 flex items-center gap-2">
                                        득점의 결정적 요인 (Key Factor)
                                    </h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {BUILD_UP_FACTORS.map(factor => (
                                            <button
                                                key={factor}
                                                onClick={() => setSelectedBuildUp(factor)}
                                                className={cn(
                                                    "px-3 py-2 border rounded-[14px] text-[13px] font-black transition-all shadow-sm break-keep",
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

                            {/* Grouped Situations */}
                            <div className="columns-1 md:columns-2 gap-6 space-y-6">
                                {activeSituations.map(sit => (
                                    <div key={sit.id} className="break-inside-avoid bg-slate-950/30 rounded-[24px] border border-white/5 p-5 relative overflow-hidden">
                                        {/* Background Hint */}
                                        <div className={cn(
                                            "absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none rounded-full",
                                            sit.color === 'indigo' ? "bg-indigo-500" :
                                            sit.color === 'emerald' ? "bg-emerald-500" :
                                            sit.color === 'violet' ? "bg-violet-500" :
                                            sit.color === 'amber' ? "bg-amber-500" :
                                            sit.color === 'rose' ? "bg-rose-500" :
                                            sit.color === 'orange' ? "bg-orange-500" :
                                            sit.color === 'blue' ? "bg-blue-500" :
                                            sit.color === 'slate' ? "bg-slate-500" :
                                            "bg-teal-500"
                                        )} />
                                        
                                        <h4 className="text-[13px] font-black tracking-tight text-white mb-4 relative z-10 flex items-center gap-2">
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full",
                                                sit.color === 'indigo' ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" :
                                                sit.color === 'emerald' ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" :
                                                sit.color === 'violet' ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]" :
                                                sit.color === 'amber' ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" :
                                                sit.color === 'rose' ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]" :
                                                sit.color === 'orange' ? "bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]" :
                                                sit.color === 'blue' ? "bg-blue-400 shadow-[0_0_8px_rgba(56,187,248,0.8)]" :
                                                sit.color === 'slate' ? "bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.8)]" :
                                                "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"
                                            )} />
                                            {sit.groupLabel}
                                        </h4>
                                        <div className="flex flex-wrap gap-2.5 relative z-10 w-full">
                                            {sit.techs.map(tech => {
                                                const isChanceGiver = tech.includes('찬스 제공');
                                                return (
                                                    <button
                                                        key={tech}
                                                        onClick={() => handleTechSelect(sit.id, tech)}
                                                        className={cn(
                                                            "flex-1 min-w-[30%] min-h-[48px] px-3 py-2 hover:bg-white/10 active:bg-white/20 active:scale-95 border rounded-[14px] text-[13px] font-black transition-all shadow-sm break-keep leading-tight flex items-center justify-center",
                                                            isChanceGiver ? "bg-rose-600/90 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:bg-rose-500" : "bg-slate-800/80 border-white/10 text-slate-300 hover:text-white",
                                                            (sit.id === '서브/리시브' && !userTouchedRally && selectedRally === "4~9구 (중반)") && "relative overflow-hidden group/hint"
                                                        )}
                                                    >
                                                        {sit.id === '서브/리시브' && !userTouchedRally && selectedRally === "4~9구 (중반)" && (
                                                            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/hint:opacity-100 transition-opacity pointer-events-none" />
                                                        )}
                                                        <span className="text-center">{tech}</span>
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
        </div>
    );
}
