'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
    ChevronLeft, Trophy, Calendar, MapPin, Plus, Youtube, 
    Edit2, ChevronRight, Loader2, Zap, X, CheckCircle2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to extract YouTube ID
const extractYoutubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : url;
};

// Helper for time formatting (01:00 -> 60)
const timeToSeconds = (timeStr: string) => {
    if (!timeStr) return 0;
    const [min, sec] = timeStr.split(':').map(Number);
    return (min || 0) * 60 + (sec || 0);
};

// Helper for display formatting (60 -> 01:00)
const secondsToTime = (seconds: number) => {
    if (!seconds) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

function TournamentDetailContent() {
    const searchParams = useSearchParams();
    const tournamentId = searchParams.get('id');
    const [tournament, setTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState<any>(null);

    // Input States
    const [matchName, setMatchName] = useState('');
    const [category, setCategory] = useState<'singles'|'doubles'>('singles');
    const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [opponent1Id, setOpponent1Id] = useState('');
    const [opponent2Id, setOpponent2Id] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [mySetScore, setMySetScore] = useState(2);
    const [oppSetScore, setOppSetScore] = useState(0);
    const [youtubeId, setYoutubeId] = useState('');
    const [set1Start, setSet1Start] = useState('00:00');
    const [set2Start, setSet2Start] = useState('00:00');
    const [set3Start, setSet3Start] = useState('00:00');

    const fetchData = async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const { data: tData } = await supabase.from('bd_tournaments').select('*').eq('id', tournamentId).single();
            setTournament(tData);

            const { data: mData } = await supabase.from('bd_matches').select(`
                *,
                opponent_1:bd_players!opponent_1_id(name),
                opponent_2:bd_players!opponent_2_id(name),
                partner:bd_players!partner_id(name)
            `).eq('tournament_id', tournamentId).order('match_date', { ascending: false });
            
            const matchesWithLogs = mData || [];
            
            // Fetch all logs for these matches for score aggregation
            const matchIds = matchesWithLogs.map(m => m.id);
            if (matchIds.length > 0) {
                const { data: lData } = await supabase
                    .from('bd_point_logs')
                    .select('match_id, set_number, current_score, created_at')
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

            const { data: pData } = await supabase.from('bd_players').select('*').order('name');
            setPlayers(pData || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [tournamentId]);

    const handleOpenEdit = (match: any) => {
        setEditingMatch(match);
        setMatchName(match.match_name || '');
        setCategory(match.category);
        setMatchDate(match.match_date);
        setOpponent1Id(match.opponent_1_id || '');
        setOpponent2Id(match.opponent_2_id || '');
        setPartnerId(match.partner_id || '');
        setMySetScore(match.my_set_score);
        setOppSetScore(match.opponent_set_score);
        setYoutubeId(match.youtube_video_id || '');

        // Read offsets from feedback_notes if available
        if (match.feedback_notes && match.feedback_notes.startsWith('{')) {
            try {
                const meta = JSON.parse(match.feedback_notes);
                setSet1Start(meta.set1Start || '00:00');
                setSet2Start(meta.set2Start || '00:00');
                setSet3Start(meta.set3Start || '00:00');
            } catch (e) {
                setSet1Start('00:00'); setSet2Start('00:00'); setSet3Start('00:00');
            }
        } else {
            setSet1Start('00:00'); setSet2Start('00:00'); setSet3Start('00:00');
        }
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setEditingMatch(null);
        setShowAddModal(false);
        setMatchName('');
        setYoutubeId('');
        setSet1Start('00:00');
        setSet2Start('00:00');
        setSet3Start('00:00');
    };

    const handleAddMatch = async () => {
        if (!tournamentId) return;
        setSubmitting(true);

        const offsets = {
            set1Start,
            set2Start,
            set3Start
        };

        const matchData = {
            tournament_id: tournamentId,
            match_name: matchName,
            category,
            match_date: matchDate,
            opponent_1_id: opponent1Id,
            opponent_2_id: category === 'doubles' ? (opponent2Id || null) : null,
            partner_id: category === 'doubles' ? (partnerId || null) : null,
            my_set_score: mySetScore,
            opponent_set_score: oppSetScore,
            youtube_video_id: extractYoutubeId(youtubeId),
            feedback_notes: JSON.stringify(offsets), // Store as JSON in feedback_notes
            match_result: mySetScore > oppSetScore ? 'win' : 'loss'
        };

        try {
            let error;
            if (editingMatch) {
                const { error: err } = await supabase.from('bd_matches').update(matchData).eq('id', editingMatch.id);
                error = err;
            } else {
                const { error: err } = await supabase.from('bd_matches').insert([matchData]);
                error = err;
            }

            if (error) throw error;
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                handleCloseModal();
                fetchData();
            }, 1000);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="font-bold text-sm text-slate-500">대희 정보를 불러오는 중...</p>
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8 pb-20">
            {/* Header 섹션 - 프리미엄 다크 스타일 */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-white/5 space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-slate-900 dark:text-white">
                    <div className="space-y-4">
                        <Link href="/tournaments" className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-widest mb-2">
                            <ChevronLeft className="w-4 h-4" /> 대회 목록으로 돌아가기
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <Trophy className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-3xl font-black tracking-tight leading-none group flex items-center gap-3">
                                    {tournament?.name}
                                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </h1>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-500 font-bold text-sm pt-1">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        {tournament?.start_date} ~ {tournament?.end_date}
                                    </span>
                                    {tournament?.location && (
                                        <span className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-rose-500" />
                                            {tournament.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setEditingMatch(null);
                            setShowAddModal(true);
                        }}
                        className="px-8 py-4 bg-blue-600 text-white rounded-[24px] font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" /> 경기 추가
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50 dark:border-white/5">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-[28px] border border-slate-100 dark:border-white/5">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">TOTAL MATCHES</p>
                        <p className="text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{matches.length}</p>
                    </div>
                    <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-8 rounded-[28px] border border-emerald-100/50 dark:border-emerald-500/10">
                        <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">WINS</p>
                        <p className="text-5xl font-black text-emerald-600 tabular-nums tracking-tighter">{matches.filter(m => m.match_result === 'win').length}</p>
                    </div>
                    <div className="bg-rose-50/50 dark:bg-rose-900/10 p-8 rounded-[28px] border border-rose-100/50 dark:border-rose-500/10">
                        <p className="text-[11px] font-black text-rose-600/60 uppercase tracking-widest mb-2">LOSSES</p>
                        <p className="text-5xl font-black text-rose-600 tabular-nums tracking-tighter">{matches.filter(m => m.match_result === 'loss').length}</p>
                    </div>
                </div>
            </div>

            {/* 경기 리스트 테이블 */}
            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="p-6 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-widest opacity-50">
                        MATCH LISTING
                    </h3>
                </div>
                <div className="md:hidden space-y-4 p-4">
                    {matches.map((m) => (
                        <div key={m.id} className="bg-[#111827]/40 rounded-[2rem] p-5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-sm",
                                    m.match_result === 'win' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                )}>
                                    {m.match_result === 'win' ? 'W' : 'L'}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleOpenEdit(m)} className="p-2 bg-blue-600/10 text-blue-400 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    <Link href={`/analysis/detail?id=${m.id}`} className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-600/20"><ChevronRight className="w-4 h-4" /></Link>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-black text-yellow-400 tabular-nums">{m.my_set_score}:{m.opponent_set_score}</span>
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(s => {
                                            const p = m[`set_${s}_score_player`];
                                            const o = m[`set_${s}_score_opponent`];
                                            if (p + o === 0) return null;
                                            return (
                                                <span key={s} className="text-[10px] font-bold text-yellow-500/60 bg-yellow-500/5 px-2 py-0.5 rounded-md border border-yellow-500/10 tabular-nums">
                                                    {p}:{o}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-[14px] font-black border-t border-white/5 pt-3">
                                    <span className="text-sky-400 truncate flex-1">
                                        나{m.category === 'doubles' && m.partner && <span className="text-[10px] opacity-60">/{m.partner.name}</span>}
                                    </span>
                                    <span className="text-white/20 text-[10px] italic">vs</span>
                                    <span className="text-yellow-400 truncate flex-1">
                                        {m.opponent_1?.name || 'TBD'}{m.opponent_2 && <span className="text-[10px] opacity-60">/{m.opponent_2.name}</span>}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-tight">{m.category === 'singles' ? '단식' : '복식'}</span>
                                    <span className="text-[10px] font-bold text-slate-500 truncate">{m.match_name}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4 text-center">결과</th>
                                <th className="px-6 py-4 text-center">날짜</th>
                                <th className="px-6 py-4 text-center">경기명</th>
                                <th className="px-6 py-4 text-center">종목</th>
                                <th className="px-6 py-4">경기 대진</th>
                                <th className="px-6 py-4 text-center">스코어</th>
                                <th className="px-6 py-4 text-right pr-10">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {matches.map((m) => (
                                <tr key={m.id} className="group hover:bg-slate-50 dark:hover:white/5 transition-all">
                                    <td className="px-6 py-5 text-center">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-sm mx-auto shadow-sm",
                                            m.match_result === 'win' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {m.match_result === 'win' ? 'W' : 'L'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-xs text-slate-500 tabular-nums">{m.match_date}</td>
                                    <td className="px-6 py-4 text-center">
                                        {m.match_name ? (
                                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg uppercase tracking-tight">
                                                {m.match_name}
                                            </span>
                                        ) : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-[10px] text-slate-400 uppercase tracking-widest opacity-60">{m.category}</td>
                                    <td className="px-6 py-4">
                                        <Link href={`/analysis/detail?id=${m.id}`} className="block">
                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                                                나{m.category === 'doubles' && <span className="text-[10px] text-slate-400">({m.partner?.name})</span>}
                                                <span className="px-2 text-slate-400 opacity-40 italic">vs</span>
                                                {m.opponent_1?.name || 'TBD'} {m.opponent_2 && <span className="text-[10px] text-slate-400">({m.opponent_2?.name})</span>}
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black tabular-nums text-slate-900 dark:text-white">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-lg">{m.my_set_score} : {m.opponent_set_score}</span>
                                            <div className="flex gap-1.5">
                                                {m.set_1_score_player !== undefined && (m.set_1_score_player + m.set_1_score_opponent > 0) && (
                                                    <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                        {m.set_1_score_player}:{m.set_1_score_opponent}
                                                    </span>
                                                )}
                                                {m.set_2_score_player !== undefined && (m.set_2_score_player + m.set_2_score_opponent > 0) && (
                                                    <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                        {m.set_2_score_player}:{m.set_2_score_opponent}
                                                    </span>
                                                )}
                                                {m.set_3_score_player !== undefined && (m.set_3_score_player + m.set_3_score_opponent > 0) && (
                                                    <span className="text-[9px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20 tabular-nums">
                                                        {m.set_3_score_player}:{m.set_3_score_opponent}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {m.youtube_video_id && <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><Youtube className="w-4 h-4" /></div>}
                                            <button 
                                                onClick={() => handleOpenEdit(m)}
                                                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-95 border border-transparent hover:border-slate-200"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <Link href={`/analysis/detail?id=${m.id}`} className="p-2.5 hover:bg-slate-900 hover:text-white rounded-xl text-slate-300">
                                                <ChevronRight className="w-5 h-5" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 경기 정보 수정/추가 모달 (사용자 스크린샷 100% 동기화) */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-[620px] rounded-[40px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 flex justify-between items-center bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">경기 정보 수정</h2>
                            </div>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 custom-scrollbar">
                            {isSuccess ? (
                                <div className="py-20 flex flex-col items-center justify-center space-y-6">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 scale-125 animate-bounce">
                                        <CheckCircle2 className="w-12 h-12" />
                                    </div>
                                    <h2 className="text-2xl font-black">업데이트 완료!</h2>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">경기 명칭</label>
                                            <input
                                                type="text"
                                                placeholder="결승전, 예선 등"
                                                value={matchName}
                                                onChange={(e) => setMatchName(e.target.value)}
                                                className="w-full px-5 py-4 rounded-[20px] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">경기 종목</label>
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-[20px] border border-slate-100 dark:border-white/5">
                                                <button
                                                    onClick={() => setCategory('singles')}
                                                    className={cn(
                                                        "py-3 rounded-[15px] text-sm font-black transition-all",
                                                        category === 'singles' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    단식
                                                </button>
                                                <button
                                                    onClick={() => setCategory('doubles')}
                                                    className={cn(
                                                        "py-3 rounded-[15px] text-sm font-black transition-all",
                                                        category === 'doubles' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                                    )}
                                                >
                                                    복식
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/50 dark:bg-slate-800/10 p-6 rounded-[32px] border border-emerald-500/10 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">PLAYERS</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">상대 선수 1</label>
                                                <select
                                                    value={opponent1Id}
                                                    onChange={(e) => setOpponent1Id(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[20px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 outline-none font-bold"
                                                >
                                                    <option value="">선수 선택...</option>
                                                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">경기 일자</label>
                                                <input
                                                    type="date"
                                                    value={matchDate}
                                                    onChange={(e) => setMatchDate(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[20px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 outline-none font-bold tabular-nums"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 점수 섹션 - 스크린샷 폰트 및 스타일 */}
                                    <div className="bg-slate-950 p-10 rounded-[40px] flex items-center justify-center gap-12 relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="text-7xl font-black text-white tabular-nums">{mySetScore}</div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">YOU</span>
                                        </div>
                                        <div className="text-3xl font-black text-slate-700 italic italic">vs</div>
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="text-7xl font-black text-white tabular-nums">{oppSetScore}</div>
                                            <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-[0.3em]">OPP</span>
                                        </div>
                                    </div>

                                    {/* 비디오 섹션 - SET 1 START 등 영문 라벨 복구 */}
                                    <div className="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-500/10 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-3 bg-blue-600 rounded-full" />
                                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">VIDEO & HIGHLIGHTS</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest pl-1">
                                                    <Youtube className="w-4 h-4" /> YOUTUBE VIDEO ID / LINK
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="URL이나 ID를 입력하세요"
                                                    value={youtubeId}
                                                    onChange={(e) => setYoutubeId(e.target.value)}
                                                    className="w-full px-5 py-4 rounded-[20px] bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/30 outline-none focus:border-blue-500 transition-all font-bold"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[1, 2, 3].map(s => (
                                                    <div key={s} className="space-y-2 text-center">
                                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SET {s} START</label>
                                                        <input
                                                            type="text"
                                                            placeholder="01:00"
                                                            value={s === 1 ? set1Start : s === 2 ? set2Start : set3Start}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                if (s === 1) setSet1Start(v);
                                                                if (s === 2) setSet2Start(v);
                                                                if (s === 3) setSet3Start(v);
                                                            }}
                                                            className="w-full px-4 py-3 rounded-[15px] bg-white dark:bg-slate-800 border border-blue-50 dark:border-blue-900/20 text-center font-bold text-xs tabular-nums outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {!isSuccess && (
                            <div className="p-8 pt-4 flex gap-4 bg-white dark:bg-slate-900">
                                <button onClick={handleCloseModal} className="flex-1 py-5 rounded-[22px] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black hover:bg-slate-200 transition-all active:scale-95">Cancel</button>
                                <button 
                                    onClick={handleAddMatch}
                                    disabled={submitting}
                                    className="flex-[2] py-5 rounded-[22px] bg-blue-600 text-white font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <>업데이트 하기 <ChevronRight className="w-5 h-5" /></>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RevertedTournamentDetailPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
            <TournamentDetailContent />
        </Suspense>
    );
}
