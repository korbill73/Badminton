'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Plus, Search, Calendar, MapPin, Trophy, ChevronRight, ChevronDown,
    Video, Loader2, Award, Zap, BarChart3, Filter, X, Trash2, Edit2, Play
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import MatchModal from '@/components/match/MatchModal';
import TournamentModal from '@/components/match/TournamentModal';

export default function TournamentListPage() {
    const router = useRouter();
    const [groupedMatches, setGroupedMatches] = useState<Record<string, any[]>>({});
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [tModalOpen, setTModalOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<any>(null);
    const [editingTournament, setEditingTournament] = useState<any>(null);
    const [targetTId, setTargetTId] = useState<string | undefined>(undefined);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Step 1: Base Fetch - Using verified correct column names and joins
            const { data: mData, error: mError } = await supabase.from('bd_matches').select(`
                id, match_name, match_type, match_result, match_date, created_at, tournament_id,
                player_id, partner_id, opponent_1_id, opponent_2_id, youtube_video_id,
                set_1_score_player, set_1_score_opponent, 
                set_2_score_player, set_2_score_opponent, 
                set_3_score_player, set_3_score_opponent,
                tournament:bd_tournaments(id, name, location, start_date, end_date, result), 
                subject_player:bd_players!player_id(name, high_school, pro_team, univ_school, school_or_team),
                partner:bd_players!partner_id(name, high_school, pro_team, univ_school, school_or_team),
                opponent_1:bd_players!opponent_1_id(name, high_school, pro_team, univ_school, school_or_team), 
                opponent_2:bd_players!opponent_2_id(name, high_school, pro_team, univ_school, school_or_team),
                logs:bd_point_logs(set_number, current_score, video_timestamp)
            `).order('created_at', { ascending: false });

            const { data: pData } = await supabase.from('bd_players').select('*').order('name');

            if (mError) {
                console.warn("Match Fetch Warning:", mError.message);
                // Even simpler fallback if even the above fails
                const { data: simpleData } = await supabase.from('bd_matches').select('id, match_name, tournament_id').limit(20);
                if (simpleData) processMatches(simpleData);
            } else if (mData) {
                processMatches(mData);
            }
            if (pData) setPlayers(pData);
        } catch (e) {
            // Log as warning to stay out of the overlay
            console.warn("Schema Notice:", e);
        } finally {
            setLoading(false);
        }
    };

    const processMatches = (mData: any[]) => {
        const grouped: Record<string, any[]> = {};
        mData.forEach((match: any) => {
            const tName = match.tournament?.name || '기타 대회';
            if (!grouped[tName]) grouped[tName] = [];
            grouped[tName].push(match);
        });
        setGroupedMatches(grouped);
    };

    const handleSaveMatch = async (data: any) => {
        setLoading(true);
        const { id, ...payload } = data;
        
        // --- EMERGENCY SCHEMA PROTECTION ---
        const cleanedPayload: any = { ...payload };
        
        // Remove objects/joined data from payload before saving to flat table
        delete cleanedPayload.subject_player;
        delete cleanedPayload.partner;
        delete cleanedPayload.opponent_1;
        delete cleanedPayload.opponent_2;
        delete cleanedPayload.tournament;

        // Ensure UUIDs are null if empty
        ['player_id', 'partner_id', 'opponent_1_id', 'opponent_2_id'].forEach(key => {
            if (cleanedPayload[key] === '') cleanedPayload[key] = null;
        });

        try {
            let res;
            if (id) res = await supabase.from('bd_matches').update(cleanedPayload).eq('id', id);
            else res = await supabase.from('bd_matches').insert([cleanedPayload]);

            if (res.error) {
                console.warn("Save Error Details (Attempting Safe Recovery):", res.error);
                // 만약 컬럼 부재 에러(42703)라면 새 컬럼들을 자동으로 제외하고 조용히 재시도
                if (res.error.message.includes('column') || res.error.code === '42703' || res.error.message.includes('set_1_start')) {
                    console.log("Schema mismatch on save. Retrying with CORE fields only to prevent data loss...");
                    const safePayload = { ...cleanedPayload };
                    delete safePayload.set_1_start;
                    delete safePayload.set_2_start;
                    delete safePayload.set_3_start;
                    
                    let retryRes;
                    if (id) retryRes = await supabase.from('bd_matches').update(safePayload).eq('id', id);
                    else retryRes = await supabase.from('bd_matches').insert([safePayload]);

                    if (retryRes.error) {
                        alert(`최종 저장 실패: ${retryRes.error.message}\n(DB 스키마가 일치하지 않습니다)`);
                    } else {
                        console.log("Safe save successful (timestamps omitted).");
                        setModalOpen(false);
                        await fetchData();
                    }
                } else {
                    alert(`오류 발생: ${res.error.message}`);
                }
            } else {
                setModalOpen(false);
                await fetchData();
            }
        } catch (e) {
            console.error("Critical Save Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const deleteMatch = async (id: string) => {
        if (!confirm('해당 경기를 영구 삭제하시겠습니까? 복구할 수 없습니다.')) return;
        setLoading(true);
        const { error } = await supabase.from('bd_matches').delete().eq('id', id);
        if (error) alert(`삭제 실패: ${error.message}`);
        else await fetchData();
        setLoading(false);
    };

    const handleSaveTournament = async (data: any) => {
        setLoading(true);
        try {
            let res;
            if (editingTournament) {
                res = await supabase.from('bd_tournaments').update(data).eq('id', editingTournament.id);
            } else {
                res = await supabase.from('bd_tournaments').insert([data]);
            }
            
            if (res.error) {
                alert(`대회 저장 실패: ${res.error.message}`);
            } else {
                setTModalOpen(false);
                setEditingTournament(null);
                await fetchData();
            }
        } catch (e: any) {
            alert(`예상치 못한 오류: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNewTournament = () => {
        setEditingTournament(null);
        setTModalOpen(true);
    };

    const getSchool = (p: any) => p?.high_school || p?.pro_team || p?.univ_school || p?.school_or_team || "";

    const renderTeamPlayers = (p1: any, p2: any, isOpponent: boolean) => {
        if (!p1) return "미지정";
        const name1 = p1.name;
        const school1 = getSchool(p1);
        if (!p2) return isOpponent && school1 ? `${name1} (${school1})` : name1;
        const name2 = p2.name;
        const school2 = getSchool(p2);
        if (!isOpponent) return `${name1} / ${name2}`;
        if (school1 === school2 && school1 !== "") return `${name1} / ${name2} (${school1})`;
        const s1 = school1 ? ` (${school1})` : "";
        const s2 = school2 ? ` (${school2})` : "";
        return `${name1}${s1} / ${name2}${s2}`;
    };

    useEffect(() => { fetchData(); }, []);

    if (loading) return (
        <div className="h-screen bg-[#080d1a] flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080d1a] text-white p-8 lg:p-12 font-sans">
            <div className="max-w-[1400px] mx-auto space-y-12">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/5 pb-10">
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] opacity-80">Battle Log & Tactical Archive</p>
                        <h1 className="text-6xl font-black tracking-tighter leading-none text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.2)]">전문 경기 기록<span className="text-white">.</span></h1>
                        <p className="text-white/70 font-bold text-lg max-w-2xl">대회별로 축적된 모든 경기 데이터를 정밀 분석하고 전술 패턴을 관리합니다.</p>
                    </div>
                    
                    <button onClick={handleNewTournament} className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black flex items-center gap-3 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
                        <Plus className="w-6 h-6" /> 새 대회 등록
                    </button>
                </div>

                {/* Match Listing Groups */}
                <div className="space-y-16">
                    {Object.entries(groupedMatches).length === 0 ? (
                        <div className="h-[400px] bg-white/5 rounded-[4rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-6">
                            <Trophy className="w-16 h-16 text-slate-800" />
                            <p className="text-slate-500 font-black text-xl">기록된 경기가 없습니다. 새로운 경기를 등록해 주세요.</p>
                        </div>
                    ) : (
                        Object.entries(groupedMatches)
                        .sort(([, aMatches], [, bMatches]) => {
                            const dateA = aMatches[0]?.tournament?.start_date || '';
                            const dateB = bMatches[0]?.tournament?.start_date || '';
                            return dateB.localeCompare(dateA);
                        })
                        .map(([tName, matches]) => {
                            const filtered = matches.filter(m => 
                                !searchQuery || 
                                m.match_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.subject_player?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.opponent_1?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                            if (filtered.length === 0) return null;

                            return (
                                <div key={tName} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Tournament Header */}
                                    <div className="flex items-center justify-between px-4 pb-4 border-b border-white/5">
                                            <div className="flex items-center gap-8">
                                                <div className="h-12 w-2 bg-blue-600 rounded-full" />
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-baseline gap-8">
                                                        <h3 className="text-4xl font-black tracking-tighter cursor-pointer hover:text-blue-500 transition-colors" onClick={() => { setEditingTournament(matches[0].tournament); setTModalOpen(true); }}>{tName}</h3>
                                                        <div className="flex items-center gap-6 text-4xl font-black tracking-tighter">
                                                            <span className="flex items-center gap-3 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] transition-all cursor-default">
                                                                <MapPin className="w-10 h-10" /> {matches[0].tournament?.location || '미지정'}
                                                            </span>
                                                            <div className="w-px h-8 bg-white/20 mx-2" />
                                                            <span className="flex items-center gap-3 text-white text-2xl font-black">
                                                                <Calendar className="w-7 h-7 text-emerald-400" /> {matches[0].tournament?.start_date || '-'} ~ {matches[0].tournament?.end_date || '-'}
                                                            </span>
                                                            {matches[0].tournament?.result && (
                                                                <>
                                                                    <div className="w-px h-8 bg-white/20 mx-2" />
                                                                    <span className="flex items-center gap-3 text-amber-500 text-2xl font-black">
                                                                        <Trophy className="w-7 h-7" /> {matches[0].tournament.result}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        <button 
                                            onClick={() => { setTargetTId(matches[0].tournament_id); setEditingMatch(null); setModalOpen(true); }}
                                            className="px-8 py-4 bg-white/5 hover:bg-blue-600 text-white rounded-[1.5rem] font-black text-sm flex items-center gap-2 transition-all border border-white/10 hover:border-blue-600 active:scale-95"
                                        >
                                            <Plus className="w-5 h-5" /> 경기 추가
                                        </button>
                                    </div>

                                    <div className="grid gap-4">
                                        {filtered.map((m: any) => {
                                            const parseScore = (score: any) => {
                                                if (!score || typeof score !== 'string') return [0, 0];
                                                const parts = score.split('-');
                                                return parts.length === 2 ? parts.map(Number) : [0, 0];
                                            };
                                            const s1 = parseScore(m.set_1_score_player + '-' + m.set_1_score_opponent);
                                            const s2 = parseScore(m.set_2_score_player + '-' + m.set_2_score_opponent);
                                            const s3 = parseScore(m.set_3_score_player + '-' + m.set_3_score_opponent);
                                            
                                            const setsArr = [
                                                { p: s1[0], o: s1[1] },
                                                { p: s2[0], o: s2[1] },
                                                { p: s3[0], o: s3[1] }
                                            ].filter(s => s.p > 0 || s.o > 0);

                                            let pWins = 0, oWins = 0;
                                            setsArr.forEach(s => {
                                                if (s.p > s.o) pWins++;
                                                else if (s.o > s.p) oWins++;
                                            });

                                            return (
                                                <div 
                                                    key={m.id} 
                                                    onClick={() => router.push(`/analysis/detail?id=${m.id}`)}
                                                    className="group relative bg-[#111827]/40 rounded-[2.5rem] p-6 pr-12 transition-all duration-700 flex items-center justify-between hover:bg-blue-600/[0.15] border border-white/5 hover:border-blue-400 hover:shadow-[0_0_40px_-5px_rgba(59,130,246,0.6)] hover:-translate-y-1.5 cursor-pointer overflow-hidden"
                                                >
                                                    {/* Hover Accent Glow */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-center shadow-[0_0_20px_rgba(37,99,235,0.8)]" />
                                                    
                                                    <div className="flex items-center gap-10 flex-1 relative z-10">
                                                        <div className={cn(
                                                            "w-16 h-16 shrink-0 rounded-[1.8rem] flex items-center justify-center font-black text-2xl italic shadow-2xl transition-all duration-500 group-hover:scale-110", 
                                                            pWins > oWins 
                                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500/20" 
                                                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20 group-hover:bg-rose-500/20"
                                                        )}>
                                                            {pWins > oWins ? 'W' : 'L'}
                                                        </div>

                                                        {/* Score & Sets Group (Fixed Width Alignment) */}
                                                        <div className="flex items-center gap-8 shrink-0">
                                                            {/* Main Score (Yellow) */}
                                                            <div className="w-28 flex justify-center">
                                                                <span className="text-5xl font-black text-yellow-400 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-500">
                                                                    {pWins}:{oWins}
                                                                </span>
                                                            </div>

                                                            {/* Set Pills (Aligned Start) */}
                                                            <div className="w-72 flex gap-2.5">
                                                                {setsArr.map((s, idx) => (
                                                                    <div key={idx} className={cn(
                                                                        "px-5 py-2.5 rounded-[1.2rem] text-[14px] font-black tabular-nums shadow-lg border transition-all duration-500 group-hover:scale-105", 
                                                                        s.p > s.o 
                                                                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/40" 
                                                                            : "bg-white/10 text-slate-200 border-white/10 group-hover:bg-white/20 group-hover:border-white/20"
                                                                    )}>
                                                                        {s.p}:{s.o}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <span className="text-2xl font-black text-sky-400 drop-shadow-sm group-hover:text-sky-300 transition-colors">
                                                                {renderTeamPlayers(m.subject_player, m.partner, false)}
                                                            </span>
                                                            <div className="flex flex-col items-center">
                                                                <div className="h-px w-8 bg-white/10 group-hover:w-12 group-hover:bg-blue-500/30 transition-all duration-500" />
                                                                <span className="text-slate-700 font-black italic text-[10px] uppercase opacity-40 py-1">vs</span>
                                                                <div className="h-px w-8 bg-white/10 group-hover:w-12 group-hover:bg-rose-500/30 transition-all duration-500" />
                                                            </div>
                                                            <span className="text-2xl font-black text-yellow-400 drop-shadow-sm group-hover:text-yellow-300 transition-colors">
                                                                {renderTeamPlayers(m.opponent_1, m.opponent_2, true)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-14 relative z-10">
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setModalOpen(true); }}
                                                                className="p-3.5 bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-2xl transition-all"
                                                            >
                                                                <Edit2 className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); deleteMatch(m.id); }} 
                                                                className="p-3.5 bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-2xl transition-all"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* INTEGRATED MATCH MODAL */}
            <MatchModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                tournamentId={targetTId} 
                match={editingMatch} 
                players={players} 
                onSave={handleSaveMatch} 
            />

            <TournamentModal 
                isOpen={tModalOpen}
                onClose={() => setTModalOpen(false)}
                onSave={handleSaveTournament}
                tournament={editingTournament}
            />
        </div>
    );
}

