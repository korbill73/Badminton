'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ChevronLeft,
    Plus,
    Video,
    User,
    Users,
    Calendar,
    Trophy,
    Loader2,
    X,
    CheckCircle2,
    Youtube,
    ChevronRight,
    Edit2,
    MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDTournament, BDMatch, BDPlayer } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const extractYoutubeId = (input: string) => {
    if (!input) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[2].length === 11) ? match[2] : input;
};

function TournamentDetailContent() {
    const searchParams = useSearchParams();
    const tournamentId = searchParams.get('id');
    const [tournament, setTournament] = useState<BDTournament | null>(null);
    const [matches, setMatches] = useState<BDMatch[]>([]);
    const [players, setPlayers] = useState<BDPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showTournamentEditModal, setShowTournamentEditModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState<BDMatch | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editTName, setEditTName] = useState('');
    const [editTLocation, setEditTLocation] = useState('');
    const [editTResult, setEditTResult] = useState('');
    const [editTStart, setEditTStart] = useState('');
    const [editTEnd, setEditTEnd] = useState('');

    const [matchName, setMatchName] = useState('');
    const [category, setCategory] = useState<'singles' | 'doubles'>('singles');
    const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [opponent1Id, setOpponent1Id] = useState('');
    const [opponent2Id, setOpponent2Id] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [mySetScore, setMySetScore] = useState(0);
    const [oppSetScore, setOppSetScore] = useState(0);
    const [youtubeId, setYoutubeId] = useState('');
    const [set2StartTime, setSet2StartTime] = useState('');
    const [set3StartTime, setSet3StartTime] = useState('');

    // Quick Player Registration states
    const [showQuickPlayerModal, setShowQuickPlayerModal] = useState(false);
    const [quickPlayerName, setQuickPlayerName] = useState('');
    const [quickPlayerTeam, setQuickPlayerTeam] = useState('');
    const [quickPlayerTarget, setQuickPlayerTarget] = useState<'opponent1' | 'opponent2' | 'partner' | null>(null);
    const [quickPlayerSubmitting, setQuickPlayerSubmitting] = useState(false);

    const fetchData = async () => {
        if (!tournamentId) return;
        setLoading(true);
        try {
            const { data: tData } = await supabase
                .from('bd_tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();
            if (tData) {
                setTournament(tData);
                setEditTName(tData.name);
                setEditTLocation(tData.location || '');
                setEditTResult(tData.result || '');
                setEditTStart(tData.start_date);
                setEditTEnd(tData.end_date);
            }

            const { data: mData } = await supabase
                .from('bd_matches')
                .select(`
                  *,
                  opponent_1:bd_players!opponent_1_id(name),
                  opponent_2:bd_players!opponent_2_id(name),
                  partner:bd_players!partner_id(name)
                `)
                .eq('tournament_id', tournamentId)
                .order('match_date', { ascending: false });

            if (mData) {
                setMatches(mData);
            }

            const { data: pData } = await supabase
                .from('bd_players')
                .select('*')
                .order('name', { ascending: true });
            if (pData) setPlayers(pData);

        } catch (err: any) {
            console.error('Error fetching tournament details:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tournamentId) fetchData();
    }, [tournamentId]);

    useEffect(() => {
        const add = searchParams.get('add');
        if (add === 'true' && !loading && tournament) {
            setShowAddModal(true);
        }

        const editId = searchParams.get('edit');
        if (editId && !loading && matches.length > 0) {
            const matchToEdit = matches.find(m => m.id === editId);
            if (matchToEdit) {
                handleOpenEdit(matchToEdit);
            }
        }
    }, [searchParams, loading, tournament, matches]);

    const handleUpdateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentId) return;
        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('bd_tournaments')
                .update({
                    name: editTName,
                    location: editTLocation,
                    result: editTResult,
                    start_date: editTStart,
                    end_date: editTEnd
                })
                .eq('id', tournamentId);

            if (error) throw error;
            setIsSuccess(true);
            fetchData();
            setTimeout(() => {
                setIsSuccess(false);
                setShowTournamentEditModal(false);
            }, 1500);
        } catch (err: any) {
            alert('대회 정보 수정 중 오류 발생: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (match: BDMatch) => {
        setEditingMatch(match);
        setMatchName(match.match_name || '');
        setCategory(match.category);
        setMatchDate(match.match_date);
        setOpponent1Id(match.opponent_1_id);
        setOpponent2Id(match.opponent_2_id || '');
        setPartnerId(match.partner_id || '');
        setMySetScore(match.my_set_score);
        setOppSetScore(match.opponent_set_score);
        setYoutubeId(match.youtube_video_id || '');

        // Parse set start times from feedback_notes if it looks like JSON
        try {
            if (match.feedback_notes && match.feedback_notes.startsWith('{')) {
                const meta = JSON.parse(match.feedback_notes);
                setSet2StartTime(meta.set2StartTime || '');
                setSet3StartTime(meta.set3StartTime || '');
            } else {
                setSet2StartTime('');
                setSet3StartTime('');
            }
        } catch (e) {
            setSet2StartTime('');
            setSet3StartTime('');
        }

        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingMatch(null);
        setMatchName('');
        setOpponent1Id('');
        setOpponent2Id('');
        setPartnerId('');
        setMySetScore(0);
        setOppSetScore(0);
        setYoutubeId('');
        setSet2StartTime('');
        setSet3StartTime('');
    };

    const handleQuickPlayerAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickPlayerName) return;
        setQuickPlayerSubmitting(true);

        try {
            const { data, error } = await supabase
                .from('bd_players')
                .insert([{ name: quickPlayerName, school_or_team: quickPlayerTeam }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Refresh players list
                const { data: allPlayers } = await supabase
                    .from('bd_players')
                    .select('*')
                    .order('name', { ascending: true });
                if (allPlayers) setPlayers(allPlayers);

                // Set selection target
                if (quickPlayerTarget === 'opponent1') setOpponent1Id(data.id);
                else if (quickPlayerTarget === 'opponent2') setOpponent2Id(data.id);
                else if (quickPlayerTarget === 'partner') setPartnerId(data.id);
            }

            setShowQuickPlayerModal(false);
            setQuickPlayerName('');
            setQuickPlayerTeam('');
            setQuickPlayerTarget(null);
        } catch (err: any) {
            alert('선수 등록 중 오류 발생: ' + err.message);
        } finally {
            setQuickPlayerSubmitting(false);
        }
    };

    const handleAddMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tournamentId) return;
        setSubmitting(true);

        try {
            const matchResult = mySetScore > oppSetScore ? 'win' : 'loss';

            const matchData = {
                tournament_id: tournamentId,
                match_name: matchName || null,
                match_date: matchDate,
                category,
                opponent_1_id: opponent1Id,
                opponent_2_id: category === 'doubles' ? (opponent2Id || null) : null,
                partner_id: category === 'doubles' ? (partnerId || null) : null,
                my_set_score: mySetScore,
                opponent_set_score: oppSetScore,
                match_result: matchResult,
                youtube_video_id: extractYoutubeId(youtubeId),
                feedback_notes: JSON.stringify({
                    set2StartTime: set2StartTime || null,
                    set3StartTime: set3StartTime || null
                })
            };

            let res;
            if (editingMatch) {
                res = await supabase
                    .from('bd_matches')
                    .update(matchData)
                    .eq('id', editingMatch.id);
            } else {
                res = await supabase
                    .from('bd_matches')
                    .insert([matchData]);
            }

            if (res.error) throw res.error;

            setIsSuccess(true);
            fetchData();
            setTimeout(() => {
                setIsSuccess(false);
                handleCloseModal();
            }, 1500);
        } catch (err: any) {
            alert('경기 정보 저장 중 오류 발생: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !tournament) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-medium">대회 정보를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-4">
                <Link
                    href="/tournaments"
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium"
                >
                    <ChevronLeft className="w-4 h-4" />
                    목록으로 돌아가기
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <div className="p-1.5 md:p-2 bg-blue-600 rounded-lg text-white shadow-lg shrink-0">
                                <Trophy className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="flex items-center gap-2 group min-w-0">
                                <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white truncate">
                                    {tournament?.name}
                                </h1>
                                <button
                                    onClick={() => setShowTournamentEditModal(true)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 md:opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                    title="대회 정보 수정"
                                >
                                    <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 font-medium text-[11px] md:text-sm">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                {tournament?.start_date} ~ {tournament?.end_date}
                            </span>
                            {tournament?.location && (
                                <span className="flex items-center gap-1 text-rose-500">
                                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    {tournament.location}
                                </span>
                            )}
                            {tournament?.result && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-tighter">
                                    <Trophy className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                    {tournament.result}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 text-white rounded-xl text-sm md:text-base font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">경기 추가</span>
                        <span className="sm:hidden">추가</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-6">
                <div className="bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total</p>
                    <p className="text-xl md:text-3xl font-black">{matches.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-bold text-green-500 uppercase tracking-wider mb-0.5">Wins</p>
                    <p className="text-xl md:text-3xl font-black text-green-500">{matches.filter(m => m.match_result === 'win').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center md:text-left">
                    <p className="text-[9px] md:text-xs font-bold text-red-500 uppercase tracking-wider mb-0.5">Losses</p>
                    <p className="text-xl md:text-3xl font-black text-red-500">{matches.filter(m => m.match_result === 'loss').length}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    경기 대진표
                    <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Recent {matches.length}
                    </span>
                </h2>

                {matches.length === 0 ? (
                    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                        <Video className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">아직 등록된 경기가 없습니다. 첫 번째 경기를 추가해 보세요!</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {/* ── Desktop Table (md+) ── */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-800">
                                        <th className="px-4 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-16">결과</th>
                                        <th className="px-4 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-28">날짜</th>
                                        <th className="px-4 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-32">경기명</th>
                                        <th className="px-3 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-20">종목</th>
                                        <th className="px-4 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center">경기 대진</th>
                                        <th className="px-3 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-20">스코어</th>
                                        <th className="px-4 py-4 text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-right w-28 pr-8">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {matches.map((m) => (
                                        <tr key={m.id} className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0">
                                            <td className="px-4 py-4 text-center">
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl flex items-center justify-center font-black italic text-sm mx-auto shadow-sm",
                                                    m.match_result === 'win' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                                )}>
                                                    {m.match_result === 'win' ? 'W' : 'L'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-xs font-bold text-slate-500 tabular-nums">{m.match_date}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {m.match_name ? (
                                                    <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">{m.match_name}</span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase">{m.category}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Link href={`/analysis/detail?id=${m.id}`} className="block">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors flex flex-wrap items-center justify-center gap-1">
                                                        <span className="shrink-0">박준서 {m.partner && `& ${m.partner.name}`}</span>
                                                        <span className="text-slate-400 font-normal px-1 opacity-50 shrink-0">vs</span>
                                                        <span className="flex items-center flex-wrap gap-1 justify-center">
                                                            <span className="shrink-0">{m.opponent_1?.name}</span>
                                                            {(m.opponent_1 as any)?.school_or_team && (
                                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-[1px] rounded shrink-0">{(m.opponent_1 as any).school_or_team}</span>
                                                            )}
                                                            {m.opponent_2 && <span className="text-slate-400 opacity-50 font-normal mx-0.5">&</span>}
                                                            {m.opponent_2 && <span>{m.opponent_2.name}</span>}
                                                            {m.opponent_2 && (m.opponent_2 as any)?.school_or_team && (
                                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-[1px] rounded">{(m.opponent_2 as any).school_or_team}</span>
                                                            )}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">{m.my_set_score} : {m.opponent_set_score}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2">
                                                    {m.youtube_video_id && (
                                                        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-lg text-[10px] font-black">
                                                            <Youtube className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEdit(m); }}
                                                        className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <Link href={`/analysis/detail?id=${m.id}`} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-300 hover:text-slate-900 transition-all">
                                                        <ChevronRight className="w-5 h-5" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── Mobile Card List (< md) ── */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {matches.map((m) => (
                                <div key={m.id} className="px-4 py-4">
                                    {/* Row 1: W/L + Names + Score */}
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-base shadow-sm shrink-0",
                                            m.match_result === 'win' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                        )}>
                                            {m.match_result === 'win' ? 'W' : 'L'}
                                        </div>

                                        <Link href={`/analysis/detail?id=${m.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-1.5 flex-wrap">
                                                <span className="text-sm md:text-base font-black text-slate-900 dark:text-white leading-tight break-keep">박준서{m.partner && ` & ${m.partner.name}`}</span>
                                                <span className="text-slate-400 text-[10px] font-bold opacity-60">vs</span>
                                                <span className="text-sm md:text-base font-black text-slate-700 dark:text-slate-200 break-keep">
                                                    {m.opponent_1?.name}
                                                    {m.opponent_2 && ` & ${m.opponent_2.name}`}
                                                </span>
                                            </div>
                                            {/* Row 2: Meta info */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-tight shrink-0">{m.category}</span>
                                                <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0">{m.match_date}</span>
                                                {m.match_name && <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded shrink-0">{m.match_name}</span>}
                                                {(m.opponent_1 as any)?.school_or_team && (
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{(m.opponent_1 as any).school_or_team}</span>
                                                )}
                                            </div>
                                        </Link>

                                        {/* Score + Edit */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{m.my_set_score}:{m.opponent_set_score}</span>
                                            <div className="flex items-center gap-1">
                                                {m.youtube_video_id && <div className="w-2 h-2 rounded-full bg-red-500" title="영상 있음" />}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEdit(m); }}
                                                    className="p-1.5 hover:bg-blue-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all active:scale-90"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <Link href={`/analysis/detail?id=${m.id}`} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        {isSuccess ? (
                            <div className="p-16 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-up animate-in zoom-in">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="text-2xl font-black">경기 등록 완료!</h2>
                                <p className="text-slate-500 font-medium">새로운 경기가 성공적으로 저장 기록에 추가되었습니다.</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Video className="w-5 h-5 text-blue-600" />
                                        {editingMatch ? '경기 정보 수정' : '새 경기 등록'}
                                    </h2>
                                    <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>

                                <form onSubmit={handleAddMatch} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">경기명 (예: 결승, 예선 등)</label>
                                            <input
                                                type="text"
                                                value={matchName}
                                                onChange={(e) => setMatchName(e.target.value)}
                                                placeholder="경기명을 입력하세요 (선택 사항)"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">경기 종목</label>
                                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setCategory('singles')}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                                        category === 'singles' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-500"
                                                    )}
                                                >
                                                    <User className="w-4 h-4" /> 단식
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCategory('doubles')}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                                        category === 'doubles' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600" : "text-slate-500"
                                                    )}
                                                >
                                                    <Users className="w-4 h-4" /> 복식
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">상대 선수 1</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setQuickPlayerTarget('opponent1');
                                                        setShowQuickPlayerModal(true);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-blue-600 transition-colors"
                                                    title="새 선수 등록"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <select
                                                value={opponent1Id}
                                                onChange={(e) => setOpponent1Id(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                                required
                                            >
                                                <option value="">선수 선택...</option>
                                                {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>

                                        {category === 'doubles' && (
                                            <>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">상대 선수 2</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setQuickPlayerTarget('opponent2');
                                                                setShowQuickPlayerModal(true);
                                                            }}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-blue-600 transition-colors"
                                                            title="새 선수 등록"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <select
                                                        value={opponent2Id}
                                                        onChange={(e) => setOpponent2Id(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                                    >
                                                        <option value="">선수 선택 (선택 사항)...</option>
                                                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">파트너</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setQuickPlayerTarget('partner');
                                                                setShowQuickPlayerModal(true);
                                                            }}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-blue-600 transition-colors"
                                                            title="새 선수 등록"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <select
                                                        value={partnerId}
                                                        onChange={(e) => setPartnerId(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                                    >
                                                        <option value="">선수 선택 (선택 사항)...</option>
                                                        {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">경기 일자</label>
                                            <input
                                                type="date"
                                                value={matchDate}
                                                onChange={(e) => setMatchDate(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">최종 세트 스코어</label>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-center font-bold text-slate-400 mb-1">나</p>
                                                    <input
                                                        type="number"
                                                        value={mySetScore}
                                                        onChange={(e) => setMySetScore(Number(e.target.value))}
                                                        className="w-full px-4 py-3 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-600 font-black text-xl"
                                                        min="0"
                                                        max="3"
                                                    />
                                                </div>
                                                <span className="mt-5 font-black text-slate-300">:</span>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-center font-bold text-slate-400 mb-1">상대</p>
                                                    <input
                                                        type="number"
                                                        value={oppSetScore}
                                                        onChange={(e) => setOppSetScore(Number(e.target.value))}
                                                        className="w-full px-4 py-3 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-red-500 font-black text-xl"
                                                        min="0"
                                                        max="3"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">YOUTUBE 영상 & 세트 타임스탬프</label>
                                                <Youtube className="w-5 h-5 text-red-500" />
                                            </div>

                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">URL</span>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={youtubeId}
                                                    onChange={(e) => setYoutubeId(e.target.value)}
                                                    placeholder="YouTube URL 또는 영상 ID"
                                                    className="w-full pl-14 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 ml-1">2세트 시작 시점</label>
                                                    <input
                                                        type="text"
                                                        value={set2StartTime}
                                                        onChange={(e) => setSet2StartTime(e.target.value)}
                                                        placeholder="예: 12:45 또는 초(s)"
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 ml-1">3세트 시작 시점</label>
                                                    <input
                                                        type="text"
                                                        value={set3StartTime}
                                                        onChange={(e) => setSet3StartTime(e.target.value)}
                                                        placeholder="예: 25:30"
                                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-xs"
                                                    />
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                                                영상 하나에 모든 세트가 포함된 경우 상단 한 곳에만 주소를 넣고, 하단에 각 세트의 시작 지점을 분:초 형식으로 입력하세요. 분석 페이지에서 세트 이동 시 해당 시점으로 즉시 이동합니다.
                                            </p>
                                        </div>

                                        <div className="pt-6">
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black text-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:bg-slate-400 flex items-center justify-center gap-2"
                                            >
                                                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : '경기 기록 저장'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showTournamentEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        {isSuccess ? (
                            <div className="p-16 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="text-2xl font-black">수정 완료!</h2>
                                <p className="text-slate-500 font-medium">대회 정보가 성공적으로 업데이트되었습니다.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateTournament} className="p-8 space-y-6">
                                <div className="flex justify-between items-center -mx-8 -mt-8 px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 mb-2">
                                    <h2 className="text-xl font-bold">대회 정보 수정</h2>
                                    <button type="button" onClick={() => setShowTournamentEditModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">대회명</label>
                                        <input
                                            type="text"
                                            value={editTName}
                                            onChange={(e) => setEditTName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">대회 장소</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                            <input
                                                type="text"
                                                value={editTLocation}
                                                onChange={(e) => setEditTLocation(e.target.value)}
                                                placeholder="체육시설 등 장소를 입력하세요"
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">주요 성적</label>
                                        <div className="relative">
                                            <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                            <input
                                                type="text"
                                                value={editTResult}
                                                onChange={(e) => setEditTResult(e.target.value)}
                                                placeholder="예: 우승, 준우승, 8강 등"
                                                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">시작일</label>
                                            <input
                                                type="date"
                                                value={editTStart}
                                                onChange={(e) => {
                                                    const newStart = e.target.value;
                                                    setEditTStart(newStart);
                                                    if (newStart && (!editTEnd || newStart > editTEnd)) {
                                                        setEditTEnd(newStart);
                                                    }
                                                }}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-center"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">종료일</label>
                                            <input
                                                type="date"
                                                min={editTStart || undefined}
                                                value={editTEnd}
                                                onChange={(e) => setEditTEnd(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-center"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-2">
                                    <button type="button" onClick={() => setShowTournamentEditModal(false)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">취소</button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center">
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '수정하기'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
            {showQuickPlayerModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold">퀵 선수 등록</h2>
                            <button onClick={() => setShowQuickPlayerModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleQuickPlayerAdd} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widests mb-1">이름</label>
                                <input
                                    type="text"
                                    value={quickPlayerName}
                                    onChange={(e) => setQuickPlayerName(e.target.value)}
                                    placeholder="이름 입력"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">소속</label>
                                <input
                                    type="text"
                                    value={quickPlayerTeam}
                                    onChange={(e) => setQuickPlayerTeam(e.target.value)}
                                    placeholder="학교/팀 입력"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                />
                            </div>
                            <div className="pt-2 flex gap-2">
                                <button type="button" onClick={() => setShowQuickPlayerModal(false)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">취소</button>
                                <button
                                    type="submit"
                                    disabled={quickPlayerSubmitting}
                                    className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                >
                                    {quickPlayerSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '추가'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TournamentDetailPage() {
    return (
        <Suspense fallback={
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-medium">대회 정보를 준비하고 있습니다...</p>
            </div>
        }>
            <TournamentDetailContent />
        </Suspense>
    );
}
