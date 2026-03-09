'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import YoutubePlayer from './YoutubePlayer';
import {
    ChevronLeft,
    Trophy,
    AlertCircle,
    Check,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { BDPointLog } from '@/types';

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
    is_default: boolean;
}

interface MobileScorePanelProps {
    match: any;
    logs: BDPointLog[];
    categories: Category[];
    matchId: string;
    currentSet: number;
    onSetChange: (set: number) => void;
    onLogAdded: (log: BDPointLog) => void;
    player: any;
    onPlayerReady: (p: any) => void;
}

export default function MobileScorePanel({
    match,
    logs,
    categories,
    matchId,
    currentSet,
    onSetChange,
    onLogAdded,
    player,
    onPlayerReady,
}: MobileScorePanelProps) {
    const [activeTab, setActiveTab] = useState<'winner' | 'loss'>('winner');
    const [submitting, setSubmitting] = useState(false);
    const [lastFeedback, setLastFeedback] = useState<{ type: 'winner' | 'loss'; name: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);
    const lastLog = currentSetLogs[currentSetLogs.length - 1];
    const [scoreMe, scoreOpp] = lastLog
        ? lastLog.current_score.split('-').map(Number)
        : [0, 0];

    const winnerCats = categories.filter(c => c.type === 'winner');
    const lossCats = categories.filter(c => c.type === 'loss');

    const handleTap = useCallback(async (cat: Category) => {
        if (submitting) return;
        setSubmitting(true);

        const isWinner = cat.type === 'winner';
        const nextMe = isWinner ? scoreMe + 1 : scoreMe;
        const nextOpp = isWinner ? scoreOpp : scoreOpp + 1;
        const nextScore = `${nextMe}-${nextOpp}`;
        const timestamp = player ? Math.floor(player.getCurrentTime()) : 0;

        try {
            const { data, error } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: currentSet,
                    current_score: nextScore,
                    is_my_point: isWinner,
                    point_type: cat.name,
                    video_timestamp: timestamp,
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onLogAdded(data);
                setLastFeedback({ type: cat.type, name: cat.name });
                setTimeout(() => setLastFeedback(null), 1800);
            }
        } catch (err: any) {
            alert('저장 오류: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    }, [submitting, scoreMe, scoreOpp, player, matchId, currentSet, onLogAdded]);

    const currentVideoId = (() => {
        if (currentSet === 2 && match.youtube_video_id_2) return match.youtube_video_id_2;
        if (currentSet === 3 && match.youtube_video_id_3) return match.youtube_video_id_3;
        return match.youtube_video_id;
    })();

    const recentLogs = [...currentSetLogs].reverse().slice(0, 5);

    const activeCats = activeTab === 'winner' ? winnerCats : lossCats;

    return (
        <div className="flex flex-col h-dvh bg-slate-950 text-white overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 pt-safe pt-3 pb-2 shrink-0 bg-slate-900/80 backdrop-blur border-b border-white/5">
                <Link
                    href={`/tournaments/detail?id=${match.tournament_id}`}
                    className="p-2 rounded-xl bg-white/10 text-white active:bg-white/20 transition"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 truncate">{match.tournament?.name}</p>
                    <p className="text-sm font-black truncate">나 vs {match.opponent_1?.name}</p>
                </div>
                {/* Set selector */}
                <div className="flex gap-1">
                    {[1, 2, 3].map(s => (
                        <button
                            key={s}
                            onClick={() => onSetChange(s)}
                            className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${currentSet === s
                                ? 'bg-blue-500 text-white'
                                : 'bg-white/10 text-slate-400 active:bg-white/20'
                                }`}
                        >
                            {s}세트
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Video ── */}
            <div className="shrink-0 bg-black">
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

            {/* ── Scoreboard ── */}
            <div className="shrink-0 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/5">
                <div className="text-center flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">나</p>
                    <p className={`text-4xl font-black tabular-nums transition-all ${scoreMe > scoreOpp ? 'text-blue-400' : 'text-white'}`}>
                        {scoreMe}
                    </p>
                </div>
                <div className="px-4 text-slate-600 text-xl font-black">:</div>
                <div className="text-center flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">상대</p>
                    <p className={`text-4xl font-black tabular-nums transition-all ${scoreOpp > scoreMe ? 'text-rose-400' : 'text-white'}`}>
                        {scoreOpp}
                    </p>
                </div>
                <div className="ml-3 text-right shrink-0">
                    <p className="text-[10px] text-slate-500 font-bold">{currentSet}세트</p>
                    <p className="text-xs text-slate-400">{currentSetLogs.length}랠리</p>
                </div>
            </div>

            {/* ── Feedback Toast ── */}
            {lastFeedback && (
                <div className={`shrink-0 mx-4 mt-2 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold
                    ${lastFeedback.type === 'winner' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}
                `}>
                    {lastFeedback.type === 'winner'
                        ? <Zap className="w-4 h-4 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    }
                    <span>{lastFeedback.name} 기록됨</span>
                    <Check className="w-4 h-4 ml-auto" />
                </div>
            )}

            {/* ── Tab ── */}
            <div className="shrink-0 px-4 pt-3 pb-2 flex gap-2">
                <button
                    onClick={() => setActiveTab('winner')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition active:scale-95 ${activeTab === 'winner'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/8 text-slate-400'
                        }`}
                >
                    🏸 득점 기록
                </button>
                <button
                    onClick={() => setActiveTab('loss')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-black transition active:scale-95 ${activeTab === 'loss'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-white/8 text-slate-400'
                        }`}
                >
                    ⚠️ 실점 기록
                </button>
            </div>

            {/* ── Category Buttons ── */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
                <div className="grid grid-cols-2 gap-2.5">
                    {activeCats.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => handleTap(cat)}
                            disabled={submitting}
                            className={`
                                min-h-[64px] rounded-2xl px-3 py-3 text-left
                                flex flex-col justify-center
                                font-black text-sm active:scale-95
                                transition-all duration-100
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${activeTab === 'winner'
                                    ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300 active:bg-blue-500/30'
                                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 active:bg-rose-500/30'
                                }
                            `}
                        >
                            <span className="text-base leading-tight">{cat.name}</span>
                            <span className="text-[10px] font-medium text-slate-500 mt-0.5 capitalize">
                                {cat.category_group}
                            </span>
                        </button>
                    ))}
                </div>

                {activeCats.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                        <p className="text-sm font-bold">카테고리 없음</p>
                        <p className="text-xs mt-1">PC에서 카테고리를 추가해 주세요</p>
                    </div>
                )}
            </div>

            {/* ── Recent History ── */}
            <div className="shrink-0 border-t border-white/5 bg-slate-900/60">
                <button
                    onClick={() => setShowHistory(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-black text-slate-400 active:bg-white/5"
                >
                    <span>최근 기록 ({currentSetLogs.length})</span>
                    {showHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {showHistory && (
                    <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
                        {recentLogs.length === 0 && (
                            <p className="text-xs text-slate-600 py-2 text-center">기록 없음</p>
                        )}
                        {recentLogs.map((log, i) => (
                            <div
                                key={log.id}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs
                                    ${log.is_my_point ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-rose-500/10 border border-rose-500/20'}
                                `}
                            >
                                <span className={`font-black tabular-nums text-sm ${log.is_my_point ? 'text-blue-400' : 'text-rose-400'}`}>
                                    {log.current_score}
                                </span>
                                <span className={`font-bold flex-1 truncate ${log.is_my_point ? 'text-blue-300' : 'text-rose-300'}`}>
                                    {log.is_my_point ? '✅' : '❌'} {log.point_type}
                                </span>
                                {((log.video_timestamp ?? 0) > 0) && (
                                    <span className="text-slate-600 font-mono tabular-nums shrink-0">
                                        {Math.floor((log.video_timestamp ?? 0) / 60)}:{String((log.video_timestamp ?? 0) % 60).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
