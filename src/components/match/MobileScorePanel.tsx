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
    AlertCircle as AlertIcon
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
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MobileScorePanelProps {
    match: any;
    logs: BDPointLog[];
    matchId: string;
    currentSet: number;
    onSetChange: (set: number) => void;
    player: any;
    onPlayerReady: (p: any) => void;
    onShowStats?: () => void;
    onDeleteLog: (id: string) => Promise<void>;
}

export default function MobileScorePanel({
    match,
    logs,
    matchId,
    currentSet,
    onSetChange,
    player,
    onPlayerReady,
    onShowStats,
    onDeleteLog,
}: MobileScorePanelProps) {
    const [showHistory, setShowHistory] = useState(false);

    const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);
    const lastLog = currentSetLogs[currentSetLogs.length - 1];
    const [scoreMe, scoreOpp] = lastLog
        ? lastLog.current_score.split('-').map(Number)
        : [0, 0];

    const currentVideoId = (() => {
        if (currentSet === 2 && match.youtube_video_id_2) return match.youtube_video_id_2;
        if (currentSet === 3 && match.youtube_video_id_3) return match.youtube_video_id_3;
        return match.youtube_video_id;
    })();

    // ── Analytics Calculation Logic ──
    const processRanking = (data: BDPointLog[]) => {
        const total = data.length;
        const counts = data.reduce((acc: any, curr) => {
            acc[curr.point_type] = (acc[curr.point_type] || 0) + 1;
            return acc;
        }, {});
        return Object.keys(counts)
            .map(name => ({
                name,
                value: counts[name],
                percent: total > 0 ? Math.round((counts[name] / total) * 100) : 0
            }))
            .sort((a, b) => b.value - a.value);
    };

    const winners = currentSetLogs.filter(l => l.is_my_point);
    const losses = currentSetLogs.filter(l => !l.is_my_point);
    const winnerData = processRanking(winners);
    const lossData = processRanking(losses);

    const COLORS_WIN = ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'];
    const COLORS_LOSS = ['#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#9F1239'];

    const handleSeekToLog = (timestamp: number) => {
        if (player && timestamp > 0) {
            player.seekTo(timestamp);
            player.playVideo();
        }
    };

    const recentLogs = [...currentSetLogs].reverse();

    return (
        <div className="flex flex-col h-dvh bg-slate-950 text-white overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center gap-2 px-4 pt-safe pt-3 pb-2 shrink-0 bg-slate-900/80 backdrop-blur border-b border-white/5">
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

            <div className="flex-1 overflow-y-auto pb-24">
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

                {/* ── Score & Analysis Toggle ── */}
                <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-slate-900 to-slate-950 border-b border-white/5">
                    <div className="flex items-center gap-6 flex-1 justify-center">
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">나</p>
                            <p className={`text-5xl font-black tabular-nums ${scoreMe > scoreOpp ? 'text-blue-400' : 'text-white'}`}>
                                {scoreMe}
                            </p>
                        </div>
                        <div className="text-slate-700 text-2xl font-black pt-4">:</div>
                        <div className="text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">상대</p>
                            <p className={`text-5xl font-black tabular-nums ${scoreOpp > scoreMe ? 'text-rose-400' : 'text-white'}`}>
                                {scoreOpp}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onShowStats}
                        className="ml-4 p-3 rounded-2xl bg-blue-600 shadow-xl shadow-blue-500/20 active:scale-95 transition flex flex-col items-center gap-1"
                    >
                        <BarChart3 className="w-6 h-6 text-white" />
                        <span className="text-[8px] font-black">심층분석</span>
                    </button>
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
                                    <div key={item.name} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-blue-100">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.percent}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-blue-400 tabular-nums">{item.percent}%</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-white">{item.value}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Hits</p>
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
                                    <div key={item.name} className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-white/10 text-slate-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-rose-100">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.percent}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-rose-400 tabular-nums">{item.percent}%</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-white">{item.value}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase">Hits</p>
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
            </div>

            {/* ── Recent History (Floating Bottom) ── */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 pb-safe">
                <button
                    onClick={() => setShowHistory(v => !v)}
                    className="w-full flex items-center justify-between py-4 text-xs font-black text-slate-300"
                >
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>전체 경기 히스토리 ({currentSetLogs.length})</span>
                    </div>
                    {showHistory ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {showHistory && (
                    <div className="pb-4 space-y-2 max-h-[40vh] overflow-y-auto">
                        {recentLogs.map((log) => (
                            <div
                                key={log.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs
                                    ${log.is_my_point ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-rose-500/5 border border-rose-500/10'}
                                `}
                            >
                                <div
                                    className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer active:opacity-60 transition-opacity"
                                    onClick={() => handleSeekToLog(log.video_timestamp ?? 0)}
                                >
                                    <span className={`text-base font-black tabular-nums ${log.is_my_point ? 'text-blue-400' : 'text-rose-400'}`}>
                                        {log.current_score}
                                    </span>
                                    <span className={`font-bold flex-1 truncate ${log.is_my_point ? 'text-blue-200' : 'text-rose-200'}`}>
                                        {log.is_my_point ? '✅' : '❌'} {log.point_type}
                                    </span>
                                    {((log.video_timestamp ?? 0) > 0) && (
                                        <span className="text-slate-500 font-mono tabular-nums shrink-0">
                                            {Math.floor((log.video_timestamp ?? 0) / 60)}:{String((log.video_timestamp ?? 0) % 60).padStart(2, '0')}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteLog(log.id);
                                    }}
                                    className="p-2 rounded-xl text-slate-600 active:text-rose-400 active:bg-rose-500/10 transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
