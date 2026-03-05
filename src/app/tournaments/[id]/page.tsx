'use client';

import React, { useState, useEffect, use } from 'react';
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

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Utility to extract YouTube ID from dynamic inputs
const extractYoutubeId = (input: string) => {
    if (!input) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[2].length === 11) ? match[2] : input;
};

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: tournamentId } = use(params);
    const [tournament, setTournament] = useState<BDTournament | null>(null);
    const [matches, setMatches] = useState<BDMatch[]>([]);
    const [players, setPlayers] = useState<BDPlayer[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTournamentEditModal, setShowTournamentEditModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState<BDMatch | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Tournament Edit states
    const [editTName, setEditTName] = useState('');
    const [editTLocation, setEditTLocation] = useState('');
    const [editTResult, setEditTResult] = useState('');
    const [editTStart, setEditTStart] = useState('');
    const [editTEnd, setEditTEnd] = useState('');

    // Form states
    const [matchName, setMatchName] = useState('');
    const [category, setCategory] = useState<'singles' | 'doubles'>('singles');
    const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [opponent1Id, setOpponent1Id] = useState('');
    const [opponent2Id, setOpponent2Id] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [mySetScore, setMySetScore] = useState(0);
    const [oppSetScore, setOppSetScore] = useState(0);
    const [youtubeId, setYoutubeId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Tournament
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

            // Fetch Matches with Player info
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
                // Map the joined data to our interface
                const formattedMatches = mData.map((m: any) => ({
                    ...m,
                    opponent_1: m.opponent_1,
                    opponent_2: m.opponent_2,
                    partner: m.partner
                }));
                setMatches(formattedMatches);
            }

            // Fetch all players for the dropdown
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
        fetchData();
    }, [tournamentId]);

    const handleUpdateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
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
            alert('대회 정보 수정 중 오류가 발생했습니다: ' + err.message);
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
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingMatch(null);
        // Reset form
        setMatchName('');
        setOpponent1Id('');
        setOpponent2Id('');
        setPartnerId('');
        setMySetScore(0);
        setOppSetScore(0);
        setYoutubeId('');
    };

    const handleAddMatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const matchResult = mySetScore > oppSetScore ? 'win' : 'loss';
            const finalYoutubeId = extractYoutubeId(youtubeId);

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
                youtube_video_id: finalYoutubeId
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
            alert('경기 정보 저장 중 오류가 발생했습니다: ' + err.message);
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
            {/* Header & Back Link */}
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
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-2 group">
                                <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                                    {tournament?.name}
                                </h1>
                                <button
                                    onClick={() => setShowTournamentEditModal(true)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="대회 정보 수정"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {tournament?.start_date} ~ {tournament?.end_date}
                            </span>
                            {tournament?.location && (
                                <span className="flex items-center gap-1 text-rose-500">
                                    <MapPin className="w-4 h-4" />
                                    {tournament.location}
                                </span>
                            )}
                            {tournament?.result && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                    <Trophy className="w-3.5 h-3.5" />
                                    {tournament.result}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        경기 추가
                    </button>
                </div>
            </div>

            {/* Match Stats (Mini) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Matches</p>
                    <p className="text-3xl font-black">{matches.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-green-500 uppercase tracking-wider mb-1">Wins</p>
                    <p className="text-3xl font-black text-green-500">{matches.filter(m => m.match_result === 'win').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Losses</p>
                    <p className="text-3xl font-black text-red-500">{matches.filter(m => m.match_result === 'loss').length}</p>
                </div>
            </div>

            {/* Match List */}
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-800">
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-24">결과</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-36">날짜</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-40">경기명</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-28">종목</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center">경기 대진</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-32">스코어</th>
                                        <th className="px-6 py-5 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-right w-36 pr-10">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {matches.map((m) => (
                                        <tr key={m.id} className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 hover:shadow-inner">
                                            <td className="px-6 py-5 text-center">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center font-black italic text-base mx-auto shadow-sm",
                                                    m.match_result === 'win' ? "bg-green-100 text-green-600 ring-2 ring-green-500/10" : "bg-red-100 text-red-600 ring-2 ring-red-500/10"
                                                )}>
                                                    {m.match_result === 'win' ? 'W' : 'L'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{m.match_date}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {m.match_name ? (
                                                    <span className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg uppercase tracking-tight">
                                                        {m.match_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase tracking-tighter shadow-sm">
                                                    {m.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <Link href={`/analysis/${m.id}`} className="block">
                                                    <span className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                                                        나 {m.category === 'doubles' && <span className="text-xs text-slate-400 font-medium">({m.partner?.name})</span>}
                                                        <span className="text-slate-400 font-normal px-1.5 opacity-50">vs</span>
                                                        {m.opponent_1?.name} {m.opponent_2 && <span className="text-xs text-slate-400 font-medium">({m.opponent_2?.name})</span>}
                                                    </span>
                                                </Link>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-base font-black text-slate-900 dark:text-white tabular-nums drop-shadow-sm">
                                                    {m.my_set_score} : {m.opponent_set_score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right pr-10">
                                                <div className="flex items-center justify-end gap-3">
                                                    {m.youtube_video_id && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-black tracking-tighter shadow-sm ring-1 ring-red-500/10">
                                                            <Youtube className="w-3.5 h-3.5" />
                                                            <span className="hidden xl:inline">VIDEO SYNC</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleOpenEdit(m);
                                                        }}
                                                        className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-90 border border-transparent hover:border-blue-200"
                                                        title="수정"
                                                    >
                                                        <Edit2 className="w-4.5 h-4.5" />
                                                    </button>
                                                    <Link href={`/analysis/${m.id}`} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-300 hover:text-slate-900 transition-all active:scale-95 border border-transparent hover:border-slate-200">
                                                        <ChevronRight className="w-6 h-6" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Match Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
                        {isSuccess ? (
                            <div className="p-16 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 scale-up animate-in zoom-in">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <h2 className="text-2xl font-black">경기 등록 완료!</h2>
                                <p className="text-slate-500 font-medium">새로운 경기가 성공적으로 대회 기록에 추가되었습니다.</p>
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
                                    {/* Left Column */}
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
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">상대 선수 1</label>
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
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">상대 선수 2</label>
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
                                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">파트너</label>
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

                                    {/* Right Column */}
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

                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">YouTube 영상 ID</label>
                                            <div className="relative">
                                                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                                <input
                                                    type="text"
                                                    value={youtubeId}
                                                    onChange={(e) => setYoutubeId(e.target.value)}
                                                    placeholder="예: L0H9-sP7N3A (URL의 v= 뒤의 값)"
                                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm"
                                                />
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-400">영상을 등록하면 랠리별 타임스탬프 동기화 기능을 사용할 수 있습니다.</p>
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

            {/* Tournament Edit Modal */}
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
                                                onChange={(e) => setEditTStart(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-center"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">종료일</label>
                                            <input
                                                type="date"
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
        </div>
    );
}

