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
    Calendar
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
            const { data, error } = await supabase
                .from('bd_matches')
                .select(`
                    *,
                    tournament:bd_tournaments(name),
                    opponent_1:bd_players!opponent_1_id(name),
                    opponent_2:bd_players!opponent_2_id(name)
                `)
                .order('match_date', { ascending: false });

            if (error) throw error;
            setMatches(data || []);
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredMatches.map(match => (
                        <Link
                            key={match.id}
                            href={`/analysis/detail?id=${match.id}`}
                            className="group bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-100 dark:hover:shadow-blue-900/10 transition-all duration-500 flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        {match.category}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                                        vs {match.opponent_1?.name} {match.opponent_2 && `(${match.opponent_2.name})`}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter">
                                        <Trophy className="w-3 h-3 text-amber-500" /> {match.tournament?.name || '기타 경기'}
                                    </p>
                                </div>
                                <div className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                                    match.match_result === 'win' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    {match.match_result === 'win' ? 'WIN' : 'LOSS'}
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[28px] p-6 flex items-center justify-between border border-slate-50 dark:border-slate-800">
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Set Score</p>
                                    <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{match.my_set_score} : {match.opponent_set_score}</p>
                                </div>
                                {match.youtube_video_id ? (
                                    <div className="flex flex-col items-center gap-1 text-emerald-500">
                                        <PlayCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                        <span className="text-[8px] font-black uppercase">Video Play</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-slate-300 dark:text-slate-700">
                                        <Video className="w-8 h-8 opacity-20" />
                                        <span className="text-[8px] font-black uppercase">No Video</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span className="text-[11px] font-bold">{match.match_date}</span>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600 font-black text-[11px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                    정밀 분석 <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

