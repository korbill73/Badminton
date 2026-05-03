'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { BDMatch } from '@/types';
import {
    Video,
    Search,
    ChevronRight,
    Trophy,
    Loader2,
    PlayCircle,
    BarChart3,
    Calendar,
    Edit2,
    MapPin
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function AnalysisArchivePage() {
    const [matches, setMatches] = useState<BDMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'singles' | 'doubles'>('all');

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const { data: mData, error } = await supabase
                .from('bd_matches')
                .select(`
                    *,
                    tournament:bd_tournaments(name, location),
                    partner:bd_players!partner_id(name),
                    opponent_1:bd_players!opponent_1_id(name, school_or_team),
                    opponent_2:bd_players!opponent_2_id(name, school_or_team)
                `)
                .order('match_date', { ascending: false });

            if (error) throw error;
            
            const matchesWithLogs = mData || [];
            
            // Fetch all logs for these matches to calculate scores
            const matchIds = matchesWithLogs.map(m => m.id);
            if (matchIds.length > 0) {
                const { data: lData } = await supabase
                    .from('bd_point_logs')
                    .select('match_id, set_number, current_score, video_timestamp, created_at')
                    .in('match_id', matchIds)
                    .order('created_at', { ascending: false }) // NEWEST FIRST
                    .limit(5000);

                const logsByMatch = (lData || []).reduce((acc: any, log) => {
                    if (!acc[log.match_id]) acc[log.match_id] = {};
                    const scores = (log.current_score || "").match(/\d+/g);
                    if (!scores || scores.length < 2) return acc;
                    const [newMe, newOpp] = scores.map(Number);
                    
                    const currentBest = acc[log.match_id][log.set_number];
                    if (!currentBest) {
                        acc[log.match_id][log.set_number] = log.current_score;
                    } else {
                        const bestScores = currentBest.match(/\d+/g);
                        if (bestScores && bestScores.length >= 2) {
                            const [bestMe, bestOpp] = bestScores.map(Number);
                            if ((newMe + newOpp) > (bestMe + bestOpp)) {
                                acc[log.match_id][log.set_number] = log.current_score;
                            }
                        }
                    }
                    return acc;
                }, {});

                // Sync back to matches and ENSURE 0-0 for empty logs
                matchesWithLogs.forEach(m => {
                    const matchLogs = logsByMatch[m.id] || {};
                    // Correcting to use the actual database column names found in schema
                    const s1 = matchLogs[1] || '0-0';
                    const s2 = matchLogs[2] || '0-0';
                    const s3 = matchLogs[3] || '0-0';
                    
                    const getNums = (s: string) => {
                        const n = (s || "0-0").match(/\d+/g);
                        return n && n.length >= 2 ? n.map(Number) : [0, 0];
                    };
                    
                    const [p1, o1] = getNums(s1);
                    const [p2, o2] = getNums(s2);
                    const [p3, o3] = getNums(s3);

                    m.set_1_score_player = p1; m.set_1_score_opponent = o1;
                    m.set_2_score_player = p2; m.set_2_score_opponent = o2;
                    m.set_3_score_player = p3; m.set_3_score_opponent = o3;
                    
                    let meSets = 0, oppSets = 0;
                    if (p1 > o1) meSets++; else if (o1 > p1 && (p1 + o1 > 0)) oppSets++;
                    if (p2 > o2) meSets++; else if (o2 > p2 && (p2 + o2 > 0)) oppSets++;
                    if (p3 > o3) meSets++; else if (o3 > p3 && (p3 + o3 > 0)) oppSets++;
                    
                    m.my_set_score = meSets;
                    m.opponent_set_score = oppSets;
                });
            }

            setMatches(matchesWithLogs);
        } catch (err: any) {
            console.error('Error fetching matches:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const filteredMatches = matches.filter(m => {
        const matchesSearch =
            (m.opponent_1?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.opponent_2?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (m.tournament?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const stats = {
        total: matches.length,
        wins: matches.filter(m => m.match_result === 'win').length,
        winRate: matches.length > 0 ? Math.round((matches.filter(m => m.match_result === 'win').length / matches.length) * 100) : 0,
        withVideo: matches.filter(m => m.youtube_video_id).length
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">경기 아카이브 로드 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-[1400px] mx-auto pb-20 px-4">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4">
                        분석 & 영상 <Video className="w-8 h-8 text-blue-600" />
                    </h1>
                    <p className="text-slate-500 font-bold">나의 모든 경기 기록을 살피고 영상으로 정밀 분석하세요.</p>
                </div>

                {/* Global Stats Summary */}
                <div className="flex gap-4 md:gap-8 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
                    <div className="text-center px-4 border-r border-slate-50 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Total</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="text-center px-4 border-r border-slate-50 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Win Rate</p>
                        <p className="text-2xl font-black text-blue-600">{stats.winRate}%</p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Videos</p>
                        <p className="text-2xl font-black text-emerald-500">{stats.withVideo}</p>
                    </div>
                </div>
            </div>

            {/* Controls Area */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-[28px]">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="상대 선수 또는 대회명으로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 rounded-2xl border-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                </div>
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                    {(['all', 'singles', 'doubles'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={cn(
                                "px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                categoryFilter === cat
                                    ? "bg-slate-900 text-white shadow-xl scale-105"
                                    : "bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 border border-slate-100 dark:border-slate-800"
                            )}
                        >
                            {cat === 'all' ? '전체' : cat === 'singles' ? '단식' : '복식'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matches Grid */}
            {filteredMatches.length === 0 ? (
                <div className="py-40 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                    <BarChart3 className="w-20 h-20 text-slate-100 dark:text-slate-800 mb-6" />
                    <p className="text-slate-400 font-black text-lg">아직 등록된 경기 기록이 없습니다.</p>
                    <Link href="/tournaments" className="mt-6 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                        대회에서 경기 추가하기
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredMatches.map(match => (
                        <Link
                            key={match.id}
                            href={`/analysis/detail?id=${match.id}`}
                            className="group bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-5 md:p-6 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/10 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6"
                        >
                            <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0 w-full">
                                <div className={cn(
                                    "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-sm shrink-0 transition-transform group-hover:scale-110",
                                    match.match_result === 'win' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                                )}>
                                    {match.match_result === 'win' ? 'W' : 'L'}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 w-fit rounded text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            {match.category}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 min-w-0 break-words flex-1 lg:flex-none">
                                            <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
                                            <span className="break-words font-medium">{match.tournament?.name || '일반 매치'}</span>
                                        </span>
                                        {match.tournament?.location && (
                                            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 min-w-0 break-words hidden sm:flex border-l border-slate-200 dark:border-slate-700 pl-2">
                                                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                                <span className="break-words">{match.tournament.location}</span>
                                            </span>
                                        )}
                                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-2 shrink-0">
                                            <Calendar className="w-3 h-3 opacity-50" /> {match.match_date}
                                        </span>
                                    </div>
                                    <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors flex flex-wrap items-center gap-1 sm:gap-1.5">
                                        <span className="shrink-0">박준서 {match.partner && `& ${match.partner.name}`}</span>
                                        <span className="text-slate-400 mx-0.5 opacity-50 font-medium shrink-0">vs</span>
                                        <span className="flex items-center flex-wrap gap-1 min-w-0 flex-1">
                                            <span className="shrink-0">{match.opponent_1?.name}</span>
                                            {(match.opponent_1 as any)?.school_or_team && (
                                                <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-[1px] rounded shrink-0">
                                                    {(match.opponent_1 as any).school_or_team}
                                                </span>
                                            )}
                                            {match.opponent_2 && <span className="text-slate-400 opacity-50 font-medium mx-0.5 shrink-0">&</span>}
                                            {match.opponent_2 && <span className="shrink-0">{match.opponent_2.name}</span>}
                                            {match.opponent_2 && (match.opponent_2 as any)?.school_or_team && (match.opponent_2 as any).school_or_team !== (match.opponent_1 as any)?.school_or_team && (
                                                <span className="text-[10px] md:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-[1px] rounded shrink-0">
                                                    {(match.opponent_2 as any).school_or_team}
                                                </span>
                                            )}
                                        </span>
                                    </h3>
                                </div>
                            </div>

                            <div className="flex flex-row items-center gap-6 md:gap-8 justify-between md:justify-end border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-5 md:pt-0 w-full md:w-auto mt-2 md:mt-0 relative z-10">
                                <div className="text-right flex flex-col md:items-end w-full md:w-auto">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest md:mb-1 w-full text-left md:text-right">Set Score</p>
                                    <p className="text-2xl md:text-3xl font-black tabular-nums text-slate-900 dark:text-white flex items-center leading-none justify-start md:justify-end">
                                        {match.my_set_score} <span className="text-slate-400 dark:text-slate-500 px-1.5 font-black">:</span> {match.opponent_set_score}
                                    </p>
                                    <div className="flex gap-1.5 mt-2 justify-start md:justify-end">
                                        {(match.set_1_score_player ?? 0) + (match.set_1_score_opponent ?? 0) > 0 && (
                                            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                {match.set_1_score_player}:{match.set_1_score_opponent}
                                            </span>
                                        )}
                                        {(match.set_2_score_player ?? 0) + (match.set_2_score_opponent ?? 0) > 0 && (
                                            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                {match.set_2_score_player}:{match.set_2_score_opponent}
                                            </span>
                                        )}
                                        {(match.set_3_score_player ?? 0) + (match.set_3_score_opponent ?? 0) > 0 && (
                                            <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                {match.set_3_score_player}:{match.set_3_score_opponent}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800 hidden md:block"></div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {match.youtube_video_id ? (
                                        <div className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <PlayCircle className="w-4 h-4 md:w-5 md:h-5" />
                                            <span className="hidden sm:inline">Play</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700/50">
                                            <Video className="w-4 h-4 opacity-50" />
                                            <span className="hidden sm:inline">None</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.location.href = `/tournaments/detail?id=${match.tournament_id}&edit=${match.id}`;
                                        }}
                                        className="w-10 h-10 md:w-[44px] md:h-[44px] relative z-20 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all border border-slate-100 dark:border-slate-700/50 hover:border-blue-200"
                                        title="경기 수정"
                                    >
                                        <Edit2 className="w-4 h-4 md:w-4.5 md:h-4.5" />
                                    </button>

                                    <div className="w-10 h-10 md:w-[44px] md:h-[44px] bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700/50">
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

