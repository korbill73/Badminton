'use client';

import React, { useState } from 'react';
import YoutubePlayer from './YoutubePlayer';
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Zap,
    Clock,
    BarChart3,
    Trash2,
    Trophy,
    Target,
    AlertCircle as AlertIcon,
    Plus,
    Minus,
    Edit2,
    Check
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import Link from 'next/link';
import { BDPointLog } from '@/types';
import SetNotesEditor from './SetNotesEditor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MobileScorePanelProps {
    match: any;
    logs: BDPointLog[];
    categories: any[];
    matchId: string;
    currentSet: number;
    onSetChange: (set: number) => void;
    player: any;
    onPlayerReady: (p: any) => void;
    onShowStats?: () => void;
    onDeleteLog: (id: string) => Promise<void>;
    onQuickRecord?: (isMyPoint: boolean) => void;
    onEditLog?: (log: BDPointLog) => void;
}

export default function MobileScorePanel({
    match,
    logs,
    categories,
    matchId,
    currentSet,
    onSetChange,
    player,
    onPlayerReady,
    onShowStats,
    onDeleteLog,
    onQuickRecord,
    onEditLog,
}: MobileScorePanelProps) {
    const [showHistory, setShowHistory] = useState(false);

    const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);
    const lastLog = currentSetLogs[currentSetLogs.length - 1];
    const [scoreMe, scoreOpp] = lastLog
        ? lastLog.current_score.split('-').map(Number)
        : [0, 0];

    const currentVideoId = match.youtube_video_id;

    // ── Analytics Calculation Logic ──
    const getCatGroup = (name: string) => categories?.find(c => c.name === name)?.category_group || 'others';

    const winners = currentSetLogs.filter(l => l.is_my_point);
    const losses = currentSetLogs.filter(l => !l.is_my_point);

    const allUsedWinningTypes = Array.from(new Set(winners.map(l => l.point_type)));
    const allUsedErrorTypes = Array.from(new Set(losses.map(l => l.point_type)));

    const winnerData = allUsedWinningTypes.map(type => {
        const typeWinners = winners.filter(l => l.point_type === type).length;
        const typeFailures = losses.filter(l =>
            l.point_type.includes(type) &&
            getCatGroup(l.point_type) === 'error'
        ).length;
        const typeTotalAttempts = typeWinners + typeFailures;
        const successRate = (typeWinners / (typeTotalAttempts || 1)) * 100;
        const contributionRate = (typeWinners / (winners.length || 1)) * 100;

        return {
            name: type,
            value: typeWinners,
            percent: Math.round(contributionRate),
            rate: Math.round(successRate)
        };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const lossData = allUsedErrorTypes.map(type => {
        const typeErrors = losses.filter(l => l.point_type === type).length;
        const contributionRate = (typeErrors / (losses.length || 1)) * 100;
        const isUnforced = getCatGroup(type) === 'error';

        return {
            name: type,
            value: typeErrors,
            percent: Math.round(contributionRate),
            isUnforced
        };
    }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

    const COLORS_WIN = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];
    const COLORS_LOSS = ['#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#9F1239'];

    const handleSeekToLog = (timestamp: number) => {
        if (player && timestamp > 0) {
            player.seekTo(timestamp);
        }
    };

    const recentLogs = [...currentSetLogs].reverse();



    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percent, name, index }: any) => {
        const RADIAN = Math.PI / 180;
        // 섹터 중앙 위치 계산
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // 비중이 너무 작으면 텍스트 레이블 숨김 (Pie 차트 겹침 및 가독성 확보)
        if (percent < 0.03) return null;

        return (
            <g>
                <text
                    x={x}
                    y={y - 6}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[9px] font-black pointer-events-none drop-shadow-md opacity-80"
                >
                    {name}
                </text>
                <text
                    x={x}
                    y={y + 6}
                    fill="white"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-[11px] font-black pointer-events-none drop-shadow-md"
                >
                    {value}
                </text>
            </g>
        );
    };

    return (
        <div className="flex flex-col h-dvh bg-slate-950 text-white overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0 bg-slate-900/80 backdrop-blur border-b border-white/5" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <Link
                    href={`/tournaments/detail?id=${match.tournament_id}`}
                    className="p-2 rounded-xl bg-white/10 text-white active:bg-white/20 transition"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 truncate">{match.tournament?.name}</p>
                    <p className="text-sm font-black truncate">나 vs {match.opponent_1?.name}</p>
                </div>

                <div className="flex gap-1 shrink-0 ml-2">
                    {[1, 2, 3].map(s => (
                        <button
                            key={s}
                            onClick={() => onSetChange(s)}
                            className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg transition ${currentSet === s
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 text-slate-500 active:bg-white/10'
                                }`}
                        >
                            {s}세트
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                {/* ── Video ── */}
                <div className="bg-black">
                    {currentVideoId ? (
                        <YoutubePlayer key={currentVideoId} videoId={currentVideoId} onPlayerReady={onPlayerReady} />
                    ) : (
                        <div className="aspect-video flex items-center justify-center bg-slate-900 text-slate-600">
                            <div className="text-center">
                                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-xs font-bold uppercase tracking-widest">영상 없음</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Score & Quick Record ── */}
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/5 gap-3">
                    {/* Loss Button (-) */}
                    <button
                        onClick={() => onQuickRecord?.(false)}
                        className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center active:scale-90 transition text-rose-400"
                    >
                        <Minus className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 flex-1 justify-center">
                        <div className="text-center">
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">ME</p>
                            <p className={`text-3xl font-black tabular-nums ${scoreMe > scoreOpp ? 'text-blue-400' : 'text-white'}`}>
                                {scoreMe}
                            </p>
                        </div>
                        <div className="text-slate-700 text-xl font-black">:</div>
                        <div className="text-center">
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">OPP</p>
                            <p className={`text-3xl font-black tabular-nums ${scoreOpp > scoreMe ? 'text-rose-400' : 'text-white'}`}>
                                {scoreOpp}
                            </p>
                        </div>
                    </div>

                    {/* Win Button (+) */}
                    <button
                        onClick={() => onQuickRecord?.(true)}
                        className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center active:scale-90 transition text-blue-400"
                    >
                        <Plus className="w-6 h-6" />
                    </button>

                    <button
                        onClick={onShowStats}
                        className="p-2.5 rounded-xl bg-slate-800 border border-white/10 active:scale-95 transition flex flex-col items-center"
                    >
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <span className="text-[7px] font-black mt-0.5 whitespace-nowrap">분석</span>
                    </button>
                </div>

                {/* ── Rally History (Inline, Desktop-Style) ── */}
                <div className="px-3 py-4">
                    <button
                        onClick={() => setShowHistory(v => !v)}
                        className="w-full flex items-center justify-between py-3 px-4 mb-3 rounded-2xl bg-slate-900/80 border border-white/10 active:bg-slate-800 transition"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-left">
                                <span className="text-xs font-black text-white">경기 기록</span>
                                <span className="text-[10px] font-bold text-slate-500 ml-2">{currentSetLogs.length}개 랠리</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-[11px] font-black tabular-nums text-blue-400">{scoreMe}</span>
                                <span className="text-[11px] font-black text-slate-600 mx-1">:</span>
                                <span className="text-[11px] font-black tabular-nums text-rose-400">{scoreOpp}</span>
                            </div>
                            {showHistory ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                    </button>

                    {showHistory && (
                        <div className="space-y-1.5">
                            {recentLogs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                                    <Trophy className="w-10 h-10 opacity-20 mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest">기록된 랠리가 없습니다</p>
                                </div>
                            ) : (
                                recentLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={cn(
                                            "relative bg-slate-900 rounded-xl border transition-all flex items-center px-3 py-2.5 gap-3",
                                            log.is_my_point
                                                ? "border-blue-500/10 active:border-blue-500/40 active:bg-blue-500/10"
                                                : "border-rose-500/10 active:border-rose-500/40 active:bg-rose-500/10"
                                        )}
                                    >
                                        {/* Score Badge */}
                                        <div
                                            className={cn(
                                                "shrink-0 w-16 flex items-center justify-center cursor-pointer rounded-lg h-9 border",
                                                log.is_my_point
                                                    ? "bg-blue-500/5 border-blue-500/10"
                                                    : "bg-rose-500/5 border-rose-500/10"
                                            )}
                                            onClick={() => handleSeekToLog(log.video_timestamp ?? 0)}
                                        >
                                            <span className={cn(
                                                "text-lg font-black tabular-nums tracking-tighter",
                                                log.is_my_point ? "text-blue-400" : "text-rose-400"
                                            )}>
                                                {log.current_score}
                                            </span>
                                        </div>

                                        {/* Point Type Label */}
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => handleSeekToLog(log.video_timestamp ?? 0)}
                                        >
                                            <p className={cn(
                                                "text-[13px] font-black truncate leading-tight",
                                                log.is_my_point ? "text-white" : "text-slate-400"
                                            )}>
                                                {log.point_type}
                                            </p>
                                            {((log.video_timestamp ?? 0) > 0) && (
                                                <p className="text-[10px] font-mono tabular-nums text-slate-600 mt-0.5">
                                                    ⏱ {Math.floor((log.video_timestamp ?? 0) / 60)}:{String((log.video_timestamp ?? 0) % 60).padStart(2, '0')}
                                                </p>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditLog?.(log);
                                                }}
                                                className="p-2 rounded-lg text-slate-600 active:text-blue-400 active:bg-blue-500/10 transition"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteLog(log.id);
                                                }}
                                                className="p-2 rounded-lg text-slate-600 active:text-rose-400 active:bg-rose-500/10 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* ── Visual Analytics Section ── */}
                <div className="px-4 py-6 space-y-8">
                    {/* Distribution Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-500/5 rounded-[32px] p-4 border border-blue-500/10 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[11px] font-black text-blue-300">득점 분포</span>
                            </div>
                            <div className="w-full aspect-square relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={winnerData}
                                            innerRadius="60%"
                                            outerRadius="100%"
                                            paddingAngle={4}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            {winnerData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_WIN[index % COLORS_WIN.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-blue-400">{winners.length}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Points</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-rose-500/5 rounded-[32px] p-4 border border-rose-500/10 flex flex-col items-center">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertIcon className="w-3.5 h-3.5 text-rose-400" />
                                <span className="text-[11px] font-black text-rose-300">실점 분포</span>
                            </div>
                            <div className="w-full aspect-square relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={lossData}
                                            innerRadius="60%"
                                            outerRadius="100%"
                                            paddingAngle={4}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderCustomizedLabel}
                                        >
                                            {lossData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS_LOSS[index % COLORS_LOSS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-rose-400">{losses.length}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Errors</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* High-Readability Technical Ranking */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <Trophy className="w-4 h-4 text-blue-400" />
                                <h3 className="text-base font-black text-white">기술 득점 랭킹</h3>
                            </div>
                            <div className="space-y-2">
                                {winnerData.slice(0, 5).map((item, idx) => (
                                    <div key={item.name} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-lg font-black text-blue-100 truncate">{item.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">성공</span>
                                                        <span className="text-sm font-black text-indigo-400 tabular-nums">{item.rate}%</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 border-l border-white/10 pl-3">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">기여</span>
                                                        <span className="text-sm font-black text-blue-400 tabular-nums">{item.percent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                <span className="text-xl font-black text-white">{item.value}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Hits</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pl-11">
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${item.percent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {winnerData.length === 0 && (
                                    <p className="text-center py-8 text-slate-600 text-sm font-bold">득점 데이터 없음</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <AlertIcon className="w-4 h-4 text-rose-400" />
                                <h3 className="text-base font-black text-white">주요 실점 원인</h3>
                            </div>
                            <div className="space-y-2">
                                {lossData.slice(0, 5).map((item, idx) => (
                                    <div key={item.name} className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-lg font-black text-rose-100 truncate">{item.name}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">종류</span>
                                                        <span className="text-sm font-black text-rose-400 tabular-nums">{item.isUnforced ? '비강제' : '피습'}</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 border-l border-white/10 pl-3">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">기여</span>
                                                        <span className="text-sm font-black text-rose-400 tabular-nums">{item.percent}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                <span className="text-xl font-black text-white">{item.value}</span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase ml-1">Hits</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pl-11">
                                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-rose-500 via-rose-400 to-pink-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.5)]" style={{ width: `${item.percent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {lossData.length === 0 && (
                                    <p className="text-center py-8 text-slate-600 text-sm font-bold">실점 데이터 없음</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Set Notes Editor ── */}
                <div className="px-4 pb-8">
                    <SetNotesEditor
                        key={`${matchId}-mobile-set-${currentSet}`}
                        matchId={matchId}
                        setNumber={currentSet}
                        dark={true}
                    />
                </div>
            </div>
        </div>
    );
}
