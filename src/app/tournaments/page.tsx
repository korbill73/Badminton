'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Trophy,
    Calendar,
    ChevronRight,
    Plus,
    Search,
    X,
    CheckCircle2,
    Loader2,
    Edit2,
    Trash2,
    MapPin,
    ArrowRight,
    Play,
    Info
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDTournament, BDMatch } from '@/types';
import { cn } from '@/lib/utils';
import YearlyStatsWidget from '@/components/analytics/YearlyStatsWidget';

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<BDTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [allMatches, setAllMatches] = useState<BDMatch[]>([]);
    const [groupBy, setGroupBy] = useState<'tournament' | 'player' | 'date'>('tournament');
    const [matchLoading, setMatchLoading] = useState(false);

    // Form states
    const [editingTournament, setEditingTournament] = useState<BDTournament | null>(null);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [result, setResult] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Fetch tournaments and all matches from Supabase
    const fetchTournaments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bd_tournaments')
                .select('*')
                .order('start_date', { ascending: false });

            if (error) throw error;
            if (data) setTournaments(data);
        } catch (error: any) {
            console.error('Error fetching tournaments:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllMatches = async () => {
        setMatchLoading(true);
        try {
            const { data, error } = await supabase
                .from('bd_matches')
                .select(`
                    *,
                    tournament:bd_tournaments(*),
                    partner:bd_players!partner_id(*),
                    opponent_1:bd_players!opponent_1_id(*),
                    opponent_2:bd_players!opponent_2_id(*)
                `)
                .order('match_date', { ascending: false });

            if (error) throw error;

            // Fetch set scores
            const matchData = data || [];
            const matchIds = matchData.map(m => m.id);
            const matchSetScores: Record<string, string[]> = {};

            if (matchIds.length > 0) {
                const { data: setLogs } = await supabase
                    .from('bd_point_logs')
                    .select('match_id, set_number, current_score')
                    .in('match_id', matchIds)
                    .order('set_number', { ascending: true })
                    .order('created_at', { ascending: true });

                if (setLogs) {
                    setLogs.forEach(log => {
                        if (!matchSetScores[log.match_id]) matchSetScores[log.match_id] = [];
                        matchSetScores[log.match_id][log.set_number - 1] = log.current_score;
                    });
                }
            }

            // Handle potential array wrapping from Supabase
            const formattedData = matchData.map(m => ({
                ...m,
                tournament: Array.isArray(m.tournament) ? m.tournament[0] : m.tournament,
                partner: Array.isArray(m.partner) ? m.partner[0] : m.partner,
                opponent_1: Array.isArray(m.opponent_1) ? m.opponent_1[0] : m.opponent_1,
                opponent_2: Array.isArray(m.opponent_2) ? m.opponent_2[0] : m.opponent_2,
                set_scores: matchSetScores[m.id] || []
            }));

            setAllMatches(formattedData as any[]);
        } catch (error: any) {
            console.error('Error fetching all matches:', error.message);
        } finally {
            setMatchLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
        fetchAllMatches();
    }, []);

    // Grouping Logic
    const groups = React.useMemo(() => {
        const filtered = allMatches.filter(m =>
            m.tournament?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.opponent_1?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.match_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.match_date?.includes(searchTerm)
        );

        if (groupBy === 'tournament') {
            const map = new Map<string, { id: string, name: string, matches: BDMatch[], date?: string, location?: string, result?: string }>();

            // Add all tournaments from the tournaments state to ensure they appear even if they have no matches
            tournaments.forEach(t => {
                const matches = filtered.filter(m => m.tournament_id === t.id);
                if (t.name.toLowerCase().includes(searchTerm.toLowerCase()) || matches.length > 0) {
                    map.set(t.id, {
                        id: t.id,
                        name: t.name,
                        matches,
                        date: t.start_date,
                        location: t.location,
                        result: t.result
                    });
                }
            });
            return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        }

        if (groupBy === 'player') {
            const map = new Map<string, { id: string, name: string, matches: BDMatch[] }>();
            filtered.forEach(m => {
                const opponents = [m.opponent_1, m.opponent_2].filter(Boolean) as any[];
                if (m.category === 'doubles' && opponents.length === 2) {
                    const sorted = [...opponents].sort((a, b) => a.name.localeCompare(b.name));
                    const teamId = sorted.map(p => p.id).join('_');
                    const teamName = sorted.map(p => p.name).join(' & ');
                    if (!map.has(teamId)) map.set(teamId, { id: teamId, name: teamName, matches: [] });
                    if (!map.get(teamId)!.matches.find(existM => existM.id === m.id)) {
                        map.get(teamId)!.matches.push(m);
                    }
                } else {
                    opponents.forEach(p => {
                        if (!map.has(p.id)) {
                            map.set(p.id, { id: p.id, name: p.name, matches: [] });
                        }
                        if (!map.get(p.id)!.matches.find(existM => existM.id === m.id)) {
                            map.get(p.id)!.matches.push(m);
                        }
                    });
                }
            });
            return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        }

        if (groupBy === 'date') {
            const map = new Map<string, { id: string, name: string, matches: BDMatch[] }>();
            filtered.forEach(m => {
                const date = m.match_date || 'Unknown';
                if (!map.has(date)) {
                    map.set(date, { id: date, name: date, matches: [] });
                }
                map.get(date)!.matches.push(m);
            });
            return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
        }

        return [];
    }, [allMatches, groupBy, searchTerm, tournaments]);

    // Update selectedId when groups change or mode switches
    useEffect(() => {
        if (groups.length > 0 && (!selectedId || !groups.find(g => g.id === selectedId))) {
            setSelectedId(groups[0].id);
        }
    }, [groups, selectedId, groupBy]);

    const activeGroup = groups.find(g => g.id === selectedId) || (groups.length > 0 ? groups[0] : null);

    const handleAddTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const tournamentData = {
                name,
                location: location || null,
                result: result || null,
                start_date: startDate || null,
                end_date: endDate || null
            };

            let error;
            if (editingTournament) {
                const { error: updateError } = await supabase
                    .from('bd_tournaments')
                    .update(tournamentData)
                    .eq('id', editingTournament.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('bd_tournaments')
                    .insert([tournamentData]);
                error = insertError;
            }

            if (error) throw error;

            setIsSuccess(true);
            fetchTournaments(); // Refresh lists
            fetchAllMatches();

            setTimeout(() => {
                setIsSuccess(false);
                handleCloseModal();
            }, 1000);
        } catch (error: any) {
            alert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (e: React.MouseEvent, tournament: BDTournament) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingTournament(tournament);
        setName(tournament.name);
        setLocation(tournament.location || '');
        setResult(tournament.result || '');
        setStartDate(tournament.start_date || '');
        setEndDate(tournament.end_date || '');
        setShowAddModal(true);
    };

    const handleDeleteTournament = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('정말로 이 대회 기록을 삭제하시겠습니까? 관련 모든 경기 기록이 소실될 수 있습니다.')) return;

        try {
            const { error } = await supabase
                .from('bd_tournaments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTournaments();
            fetchAllMatches();
            if (selectedId === id) {
                setSelectedId(null);
            }
        } catch (error: any) {
            alert('삭제 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingTournament(null);
        setName('');
        setLocation('');
        setResult('');
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="space-y-12 relative pb-20 max-w-6xl mx-auto">
            {/* Premium Header Section */}
            <div className="relative mb-12 px-4 md:px-0">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px]" />

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-[1px] w-12 bg-blue-600/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400">Tactical Performance Analytics</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-4">
                            경기 기록 <span className="text-blue-600">.</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
                            참가 대회 현황 및 모든 경기 데이터를 집계하고 분석합니다. <br />
                            <span className="text-[10px] md:text-sm opacity-70 italic text-blue-600/60">전략적 우위와 성과를 한눈에 파악하세요.</span>
                        </p>
                    </div>

                    {/* Global Stats Summary (Integrated from Analysis Page) */}
                    <div className="flex gap-4 md:gap-8 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
                        <div className="text-center px-2 md:px-4 border-r border-slate-50 dark:border-slate-800">
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Total</p>
                            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{allMatches.length}</p>
                        </div>
                        <div className="text-center px-2 md:px-4 border-r border-slate-50 dark:border-slate-800">
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Win Rate</p>
                            <p className="text-xl md:text-2xl font-black text-blue-600">
                                {allMatches.length > 0 
                                    ? Math.round((allMatches.filter(m => m.match_result === 'win').length / allMatches.length) * 100) 
                                    : 0}%
                            </p>
                        </div>
                        <div className="text-center px-2 md:px-4">
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Videos</p>
                            <p className="text-xl md:text-2xl font-black text-emerald-500">{allMatches.filter(m => m.youtube_video_id).length}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="group relative px-6 py-3.5 md:px-8 md:py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-sm md:text-base font-black flex items-center gap-3 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 overflow-hidden w-full md:w-auto justify-center"
                    >
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                        <Plus className="w-5 h-5 transition-transform duration-500 group-hover:rotate-180" />
                        <span>대회 추가</span>
                    </button>
                </div>
            </div>

            {/* Sticky Navigation & Search Bar */}
            <div className="sticky top-4 z-50 px-4 md:px-0">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl p-2 flex flex-col md:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="대회명, 선수, 경기 검색..."
                            className="w-full pl-10 md:pl-16 pr-4 md:pr-6 py-3 md:py-4 bg-transparent border-none rounded-2xl text-base md:text-lg font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none text-slate-800 dark:text-white"
                        />
                    </div>
                    <div className="p-1 bg-slate-100/50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex gap-1 w-full md:w-auto">
                        <button
                            onClick={() => setGroupBy('tournament')}
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all",
                                groupBy === 'tournament' ? "bg-white dark:bg-slate-800 text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            )}
                        >
                            대회별
                        </button>
                        <button
                            onClick={() => setGroupBy('player')}
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all",
                                groupBy === 'player' ? "bg-white dark:bg-slate-800 text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            )}
                        >
                            선수별
                        </button>
                        <button
                            onClick={() => setGroupBy('date')}
                            className={cn(
                                "flex-1 md:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-black transition-all",
                                groupBy === 'date' ? "bg-white dark:bg-slate-800 text-blue-600 shadow-lg" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            )}
                        >
                            전체 목록
                        </button>
                    </div>
                </div>
            </div>

            {/* Yearly Stats Widget */}
            {allMatches && allMatches.length > 0 && (
                <div className="px-4 md:px-0">
                    <YearlyStatsWidget matches={allMatches} />
                </div>
            )}

            {/* Unified Grouped List */}
            <div className="px-4 md:px-0 space-y-16">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-500 opacity-50" />
                        <p className="text-sm font-black text-slate-400 animate-pulse uppercase tracking-widest">Loading Analytics Data...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="py-40 text-center bg-white/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/10">
                        <Info className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">기록이 없습니다</h3>
                        <p className="text-slate-500 font-medium">검색 결과가 없거나 등록된 데이터가 없습니다.</p>
                    </div>
                ) : (
                    groups.map((group) => (
                        <section key={group.id} className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 mb-6 md:mb-10 border border-slate-200 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {/* Unified Card Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <div className="px-2.5 py-1 bg-blue-600/10 text-[10px] font-black text-blue-600 rounded-lg uppercase tracking-wider border border-blue-600/20 shrink-0">
                                            {groupBy === 'tournament' ? 'Tournament' : groupBy === 'player' ? 'Player' : 'Timeline'}
                                        </div>
                                        {groupBy === 'tournament' && (group as any).result && (
                                            <div className="px-2.5 py-1 bg-amber-500 text-[10px] font-black text-white rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-sm shadow-amber-500/20 shrink-0">
                                                <Trophy className="w-3 h-3" /> {(group as any).result}
                                            </div>
                                        )}
                                        {groupBy === 'tournament' && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                {(group as any).location && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-xs font-black text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-500/20">
                                                        <MapPin className="w-3.5 h-3.5" /> {(group as any).location}
                                                    </span>
                                                )}
                                                {(group as any).date && (
                                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-xs font-black text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                                        <Calendar className="w-3.5 h-3.5" /> {(group as any).date}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-lg md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2 md:mb-3 truncate" title={group.name}>
                                        {group.name}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] md:text-[13px] font-bold text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                            <Trophy className="w-3 h-3 md:w-4 md:h-4 text-amber-500" /> {group.matches.length} Matches
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                    {/* Action Buttons */}
                                    {groupBy === 'tournament' && (
                                        <div className="flex items-center gap-2 mr-2 pr-5 border-r border-slate-200 dark:border-slate-800">
                                            <button
                                                onClick={(e) => handleOpenEdit(e, tournaments.find(t => t.id === group.id)!)}
                                                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-white border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-500 transition-all active:scale-95 shadow-sm"
                                                title="대회 정보 수정"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteTournament(e, group.id)}
                                                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-white border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-500 transition-all active:scale-95 shadow-sm"
                                                title="대회 삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {groupBy === 'tournament' ? (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <Link href={`/tournaments/detail?id=${group.id}&add=true`} className="flex-1 md:flex-none">
                                                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]">
                                                    <Plus className="w-4 h-4" />
                                                    경기 추가
                                                </button>
                                            </Link>
                                            <Link href={`/tournaments/detail?id=${group.id}`} className="flex-1 md:flex-none">
                                                <button className="w-full px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                                    전체 보기
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                                                <span className="text-xl leading-none">{group.matches.filter(m => m.match_result === 'win').length}</span>
                                                <span className="text-[10px] uppercase tracking-widest text-emerald-600/70">Win</span>
                                            </div>
                                            <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-600" />
                                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                                                <span className="text-xl leading-none">{group.matches.filter(m => m.match_result === 'loss').length}</span>
                                                <span className="text-[10px] uppercase tracking-widest text-rose-600/70">Loss</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr className="my-6 border-slate-200 dark:border-slate-800" />

                            {/* Inner Match List */}
                            <div className="flex flex-col">
                                {group.matches.map((match, index) => (
                                    <div key={match.id} className={cn(
                                        "group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 overflow-hidden transition-colors p-4 md:px-6 md:py-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-2xl",
                                        index !== group.matches.length - 1 ? "border-b border-slate-100 dark:border-slate-800/50" : ""
                                    )}>
                                        <div className="flex items-start md:items-center gap-4 md:gap-5 relative z-10 flex-1 min-w-0 w-full">
                                            <div className={cn(
                                                "w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center text-lg md:text-xl font-black italic transition-transform group-hover:scale-110",
                                                match.match_result === 'win' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"
                                            )}>
                                                {match.match_result === 'win' ? 'W' : 'L'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    <p className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-[0.2em]">{match.category}</p>
                                                    <div className="h-1 w-1 bg-slate-200 dark:bg-white/20 rounded-full" />
                                                    <p className="text-[10px] font-bold text-slate-400 tabular-nums">{match.match_date}</p>
                                                    {match.match_name && (
                                                        <>
                                                            <div className="h-1 w-1 bg-slate-200 dark:bg-white/20 rounded-full" />
                                                            <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase px-1.5 bg-slate-100 dark:bg-white/10 rounded tracking-tighter">{match.match_name}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <h4 className="text-sm md:text-xl font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight line-clamp-2 md:truncate flex flex-wrap items-center gap-1 sm:gap-1.5">
                                                    <span className="shrink-0">박준서 {match.partner && `& ${match.partner.name}`}</span>
                                                    <span className="text-slate-300 dark:text-slate-700 mx-0.5 shrink-0">vs</span>
                                                    <span className="flex items-center flex-wrap gap-1 min-w-0 flex-1">
                                                        <span className="shrink-0">{match.opponent_1?.name}</span>
                                                        {(match.opponent_1 as any)?.school_or_team && (
                                                            <span className="text-[8px] md:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-[0.5px] rounded shrink-0">
                                                                {(match.opponent_1 as any).school_or_team}
                                                            </span>
                                                        )}
                                                        {match.opponent_2 && <span className="text-slate-300 dark:text-slate-700 mx-0.5 shrink-0">&</span>}
                                                        {match.opponent_2 && <span className="shrink-0">{match.opponent_2.name}</span>}
                                                        {match.opponent_2 && (match.opponent_2 as any)?.school_or_team && (match.opponent_2 as any).school_or_team !== (match.opponent_1 as any)?.school_or_team && (
                                                            <span className="text-[8px] md:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-[0.5px] rounded shrink-0">
                                                                {(match.opponent_2 as any).school_or_team}
                                                            </span>
                                                        )}
                                                    </span>
                                                </h4>
                                                {groupBy !== 'tournament' && (match as any).tournament && (
                                                    <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis">
                                                        <Trophy className="w-3 h-3 text-amber-500 shrink-0" /> <span className="truncate">{(match as any).tournament.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-end md:items-center justify-between md:justify-end gap-4 md:gap-8 relative z-10 w-full md:w-auto md:border-l border-slate-100 dark:border-slate-800/50 pt-4 md:pt-0 border-t md:border-t-0 md:pl-10">
                                            <div className="text-right shrink-0 w-full md:w-auto flex flex-row md:flex-col items-center md:items-end justify-between md:justify-end">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest md:mb-1">Set Score</p>
                                                <div className="flex items-center justify-end gap-3 md:gap-4">
                                                    <p className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter flex items-center md:justify-end leading-none">
                                                        {match.my_set_score} <span className="text-slate-400 dark:text-slate-500 px-1 font-black">:</span> {match.opponent_set_score}
                                                    </p>
                                                    {/* Actual Set Scores */}
                                                    {(match as any).set_scores && (match as any).set_scores.length > 0 && (
                                                        <div className="flex gap-1.5 border-l border-slate-100 dark:border-slate-800/50 pl-4 py-0.5">
                                                            {(match as any).set_scores.map((score: string, i: number) => (
                                                                <div key={i} className="flex flex-col items-center">
                                                                    <span className="text-[8px] font-black text-slate-400 mb-0.5 tracking-wider">S{i + 1}</span>
                                                                    <span className="text-xs font-black px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 rounded-lg min-w-[2.5rem] text-center border border-slate-100 dark:border-slate-700/50 shadow-sm leading-none">
                                                                        {score.replace('-', ':')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 md:mt-0 w-full justify-end md:w-auto">
                                            <Link href={`/tournaments/detail?id=${match.tournament_id}&edit=${match.id}`}>
                                                <button className="p-2.5 md:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-95 flex-1 md:flex-none flex justify-center" title="경기 정보 수정">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </Link>
                                            {match.youtube_video_id && (
                                                <Link href={`/analysis/detail?id=${match.id}`}>
                                                    <button className="flex items-center justify-center flex-1 md:flex-none gap-2 px-5 py-2.5 md:py-3 bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-black rounded-xl hover:bg-blue-600 hover:text-white transition-colors active:scale-95 group">
                                                        <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current transition-transform group-hover:scale-110" />
                                                        <span>WATCH</span>
                                                    </button>
                                                </Link>
                                            )}
                                            <Link href={`/analysis/detail?id=${match.id}`}>
                                                <button className="p-2.5 md:p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white dark:hover:text-slate-200 transition-all active:scale-95 flex-1 md:flex-none flex justify-center group">
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </div>

            {/* Premium Add/Edit Tournament Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-500">
                        {isSuccess ? (
                            <div className="p-20 text-center space-y-6">
                                <div className="w-24 h-24 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/40 animate-pulse">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">저장 완료!</h2>
                                    <p className="text-slate-500 font-medium">분석 데이터베이스가 최신화되었습니다.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-10 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                        <Trophy className="w-6 h-6 text-blue-600" />
                                        {editingTournament ? '대회 정보 수정' : '새 대회 등록'}
                                    </h2>
                                    <button onClick={handleCloseModal} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all">
                                        <X className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                                <form onSubmit={handleAddTournament} className="p-10 space-y-8">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">대회 정식 명칭</label>
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="대회명을 입력하세요"
                                                className="w-full px-8 py-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-black text-lg text-slate-900 dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">개최 장소</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500/50" />
                                                    <input
                                                        type="text"
                                                        value={location}
                                                        onChange={(e) => setLocation(e.target.value)}
                                                        placeholder="도시/지역"
                                                        className="w-full pl-16 pr-8 py-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">최종 성적</label>
                                                <div className="relative">
                                                    <Trophy className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/50" />
                                                    <input
                                                        type="text"
                                                        value={result}
                                                        onChange={(e) => setResult(e.target.value)}
                                                        placeholder="우승, 준우승 등"
                                                        className="w-full pl-16 pr-8 py-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">대회 시작일</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => {
                                                        const newStart = e.target.value;
                                                        setStartDate(newStart);
                                                        if (newStart && (!endDate || newStart > endDate)) {
                                                            setEndDate(newStart);
                                                        }
                                                    }}
                                                    className="w-full px-6 py-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-black text-slate-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">대회 종료일</label>
                                                <input
                                                    type="date"
                                                    min={startDate || undefined}
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full px-6 py-5 rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-black text-slate-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-4">
                                        <button type="button" onClick={handleCloseModal} className="flex-1 py-5 px-8 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-[2rem] text-slate-600 dark:text-slate-300 font-black transition-all active:scale-95">
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-[2] py-5 px-8 bg-blue-600 text-white font-black rounded-[2rem] transition-all shadow-2xl shadow-blue-500/40 hover:bg-blue-500 active:scale-95 flex items-center justify-center disabled:opacity-50"
                                        >
                                            {submitting ? <Loader2 className="w-8 h-8 animate-spin" /> : (editingTournament ? '정보 업데이트' : '새 기록 생성')}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
