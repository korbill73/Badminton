'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Plus, Search, Calendar, MapPin, Trophy, ChevronRight, ChevronDown,
    Video, Loader2, Award, Zap, BarChart3, Filter, X, Trash2, Edit2, Play, Eye, Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import MatchModal from '@/components/match/MatchModal';
import TournamentModal from '@/components/match/TournamentModal';

export default function TournamentListPage() {
    const router = useRouter();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
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
            // 1. Fetch All Tournaments
            const { data: tData, error: tError } = await supabase
                .from('bd_tournaments')
                .select('*')
                .order('start_date', { ascending: false });

            // 2. Fetch All Matches with joins
            const { data: mData, error: mError } = await supabase.from('bd_matches').select(`
                id, match_name, match_type, match_result, match_date, created_at, tournament_id,
                player_id, partner_id, opponent_1_id, opponent_2_id, youtube_video_id,
                set_1_score_player, set_1_score_opponent, 
                set_2_score_player, set_2_score_opponent, 
                set_3_score_player, set_3_score_opponent,
                subject_player:bd_players!player_id(name, high_school, pro_team, univ_school, school_or_team),
                partner:bd_players!partner_id(name, high_school, pro_team, univ_school, school_or_team),
                opponent_1:bd_players!opponent_1_id(name, high_school, pro_team, univ_school, school_or_team), 
                opponent_2:bd_players!opponent_2_id(name, high_school, pro_team, univ_school, school_or_team)
            `).order('created_at', { ascending: false });

            const { data: pData } = await supabase.from('bd_players').select('*').order('name');

            if (tData) setTournaments(tData);
            if (mData) setMatches(mData);
            if (pData) setPlayers(pData);

            if (tError) console.warn("Tournament Fetch Error:", tError.message);
            if (mError) console.warn("Match Fetch Error:", mError.message);

        } catch (e) {
            console.warn("Schema Notice:", e);
        } finally {
            setLoading(false);
        }
    };

    const parseStats = (raw: string) => {
        if (!raw) return { view_count: 0, view_duration: 0 };
        try {
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) {
                const meta = JSON.parse(jsonMatch[0]);
                return meta.stats || { view_count: 0, view_duration: 0 };
            }
        } catch (e) {}
        return { view_count: 0, view_duration: 0 };
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

        // --- DB SCHEMA FIX: Set mandatory category column ---
        if (!cleanedPayload.category) {
            cleanedPayload.category = cleanedPayload.match_type === '복식' ? 'doubles' : 'singles';
        }

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

    const deleteTournament = async (id: string) => {
        if (!confirm('해당 대회를 영구 삭제하시겠습니까? 대회에 포함된 모든 경기 기록도 함께 삭제될 수 있습니다.')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('bd_tournaments').delete().eq('id', id);
            if (error) alert(`삭제 실패: ${error.message}`);
            else await fetchData();
        } catch (e: any) {
            alert(`오류 발생: ${e.message}`);
        } finally {
            setLoading(false);
        }
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
        
        if (!p2) {
            return school1 ? `${name1} (${school1})` : name1;
        }

        const name2 = p2.name;
        const school2 = getSchool(p2);

        if (school1 && school2 && school1 === school2) {
            return `${name1} / ${name2} (${school1})`;
        }

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
        <div className="min-h-screen bg-[#080d1a] text-white p-4 md:p-8 lg:p-12 font-sans overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 border-b border-white/5 pb-6 md:pb-10">
                    <div className="space-y-3 md:space-y-4">
                        <p className="text-[10px] md:text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] opacity-80">Battle Log & Tactical Archive</p>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.2)]">전문 경기 기록<span className="text-white">.</span></h1>
                        <p className="text-white/70 font-bold text-sm md:text-lg max-w-2xl leading-relaxed">대회별로 축적된 모든 경기 데이터를 정밀 분석하고 전술 패턴을 관리합니다.</p>
                    </div>
                    
                    <button onClick={handleNewTournament} className="w-full md:w-auto px-8 md:px-10 py-4 md:py-5 bg-blue-600 text-white rounded-2xl md:rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
                        <Plus className="w-5 h-5 md:w-6 md:h-6" /> 새 대회 등록
                    </button>
                </div>

                <div className="space-y-12 md:space-y-16">
                    {tournaments.length === 0 ? (
                        <div className="h-[300px] md:h-[400px] bg-white/5 rounded-[2rem] md:rounded-[4rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 md:gap-6 px-4 text-center">
                            <Trophy className="w-12 h-12 md:w-16 md:h-16 text-slate-800" />
                            <p className="text-slate-500 font-black text-base md:text-xl">기록된 대회가 없습니다. 새로운 대회를 등록해 주세요.</p>
                        </div>
                    ) : (
                        tournaments
                        .filter(t => 
                            !searchQuery || 
                            t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.location?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((t) => {
                            const tMatches = matches.filter(m => m.tournament_id === t.id);
                            const filteredMatches = tMatches.filter(m => 
                                !searchQuery || 
                                m.match_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.subject_player?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                m.opponent_1?.name?.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            return (
                                <div key={t.id} className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20 md:mb-32">
                                    {/* Tournament Header Card */}
                                    <div className="relative group/tcard">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2.5rem] blur opacity-25 group-hover/tcard:opacity-50 transition duration-1000 group-hover/tcard:duration-200"></div>
                                        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 md:px-10 py-6 md:py-8 bg-[#0f172a]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl">
                                            <div className="flex items-start md:items-center gap-5 md:gap-10">
                                                <div className="h-12 md:h-16 w-2 md:w-2.5 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                                                <div className="flex flex-col gap-2 md:gap-3">
                                                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-10">
                                                        <h3 
                                                            className="text-3xl md:text-5xl font-black tracking-tighter text-white hover:text-blue-400 transition-all duration-300 cursor-pointer drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                                            onClick={() => { setEditingTournament(t); setTModalOpen(true); }}
                                                        >
                                                            {t.name}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:text-2xl font-black tracking-tighter">
                                                            <span className="flex items-center gap-2 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                                                                <MapPin className="w-5 h-5 md:w-8 md:h-8" /> {t.location || '미지정'}
                                                            </span>
                                                            <span className="hidden md:block w-px h-8 bg-white/10" />
                                                            <span className="flex items-center gap-2 text-white/70">
                                                                <Calendar className="w-5 h-5 md:w-7 md:h-7 text-emerald-400" /> {t.start_date || '-'} ~ {t.end_date || '-'}
                                                            </span>
                                                            {t.result && (
                                                                <>
                                                                    <span className="hidden md:block w-px h-8 bg-white/10" />
                                                                    <span className="flex items-center gap-2 text-amber-500 bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/20">
                                                                        <Trophy className="w-5 h-5 md:w-7 md:h-7" /> {t.result}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col md:flex-row items-center gap-3">
                                                <button 
                                                    onClick={() => { setTargetTId(t.id); setEditingMatch(null); setModalOpen(true); }}
                                                    className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center gap-3 transition-all border border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-95"
                                                >
                                                    <Plus className="w-6 h-6" /> 경기 추가
                                                </button>
                                                <button 
                                                    onClick={() => deleteTournament(t.id)}
                                                    className="w-full md:w-auto p-5 bg-white/5 hover:bg-rose-600/20 text-slate-500 hover:text-rose-500 rounded-[1.5rem] md:rounded-[2rem] transition-all border border-white/5 hover:border-rose-500/30 active:scale-95"
                                                    title="대회 삭제"
                                                >
                                                    <Trash2 className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        {filteredMatches.length === 0 ? (
                                            <div className="py-10 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                                <p className="text-white/30 font-bold">아직 등록된 경기가 없습니다.</p>
                                            </div>
                                        ) : (
                                            filteredMatches.map((m: any) => {
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

                                            const isSingles = !m.partner && !m.opponent_2;

                                            let pWins = 0, oWins = 0;
                                            setsArr.forEach(s => {
                                                if (s.p > s.o) pWins++;
                                                else if (s.o > s.p) oWins++;
                                            });

                                            return (
                                                <div 
                                                    key={m.id} 
                                                    onClick={() => router.push(`/analysis/detail?id=${m.id}`)}
                                                    className="group relative bg-[#111827]/40 rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 transition-all duration-700 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 hover:bg-blue-600/[0.25] border border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:border-blue-400 hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] md:hover:-translate-y-2 cursor-pointer overflow-hidden"
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-center shadow-[0_0_30px_rgba(37,99,235,0.9)]" />
                                                    
                                                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-10 flex-1 relative z-10">
                                                        <div className="flex items-center gap-4 md:min-w-[400px] flex-1">
                                                            <div className={cn(
                                                                "w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-xl md:rounded-[1.8rem] flex items-center justify-center font-black text-xl md:text-2xl italic shadow-2xl transition-all duration-500 group-hover:scale-110", 
                                                                pWins > oWins 
                                                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500/20" 
                                                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20 group-hover:bg-rose-500/20"
                                                            )}>
                                                                {pWins > oWins ? 'W' : 'L'}
                                                            </div>
                                                            
                                                            <div className="md:hidden flex-1 flex flex-col gap-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-2xl font-black text-yellow-400 tabular-nums tracking-tighter">
                                                                            {pWins}:{oWins}
                                                                        </span>
                                                                        <div className="flex gap-1">
                                                                            {setsArr.map((s, idx) => (
                                                                                <div key={idx} className={cn(
                                                                                    "px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums border", 
                                                                                    s.p > s.o ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-white/5 text-slate-400 border-white/5"
                                                                                )}>
                                                                                    {s.p}:{s.o}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg active:scale-90 transition-transform">
                                                                        <Play className="w-4 h-4" />
                                                                    </div>
                                                                </div>
                                                                {/* Mobile Player Names Section */}
                                                                <div className="flex items-center gap-2 text-[13px] font-black border-t border-white/5 pt-2">
                                                                    <span className="text-sky-400 truncate max-w-[120px]">{renderTeamPlayers(m.subject_player, m.partner, false)}</span>
                                                                    <span className="text-white/20 text-[10px] italic">vs</span>
                                                                    <span className="text-yellow-400 truncate max-w-[120px]">{renderTeamPlayers(m.opponent_1, m.opponent_2, true)}</span>
                                                                </div>
                                                                <div className="text-[10px] font-bold text-slate-500 whitespace-normal break-words opacity-80 flex items-center gap-3">
                                                                    <span>{m.match_name || '매치 기록'}</span>
                                                                    <div className="flex items-center gap-2 text-sky-400/80 bg-sky-400/5 px-2 py-0.5 rounded-full border border-sky-400/10">
                                                                        <Eye className="w-2.5 h-2.5" /> {parseStats(m.feedback_notes).view_count}회
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-amber-400/80 bg-amber-400/5 px-2 py-0.5 rounded-full border border-amber-400/10">
                                                                        <Clock className="w-2.5 h-2.5" /> {Math.floor(parseStats(m.feedback_notes).view_duration / 60)}분
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Names Section (PC First) */}
                                                            <div className={cn(
                                                                "hidden md:flex md:flex-row md:items-center gap-2 md:gap-6 flex-1 overflow-hidden",
                                                                isSingles ? "flex-row items-center flex-nowrap" : "flex-col"
                                                            )}>
                                                                <span className={cn(
                                                                    "font-black text-sky-400 group-hover:text-sky-300 transition-colors shrink-0",
                                                                    isSingles ? "text-lg md:text-2xl" : "text-xl md:text-2xl truncate"
                                                                )}>
                                                                    {renderTeamPlayers(m.subject_player, m.partner, false)}
                                                                </span>
                                                                <div className={cn(
                                                                    "flex items-center gap-1.5 md:gap-0 md:flex-col shrink-0",
                                                                    isSingles ? "flex-row mx-1" : ""
                                                                )}>
                                                                    <div className="hidden md:block h-px w-8 bg-white/10 group-hover:w-12 group-hover:bg-blue-500/30 transition-all duration-500" />
                                                                    <span className="text-slate-700 font-black italic text-[9px] md:text-[10px] uppercase opacity-40">vs</span>
                                                                    <div className="hidden md:block h-px w-8 bg-white/10 group-hover:w-12 group-hover:bg-rose-500/30 transition-all duration-500" />
                                                                </div>
                                                                <span className={cn(
                                                                    "font-black text-yellow-400 group-hover:text-yellow-300 transition-colors shrink-0",
                                                                    isSingles ? "text-lg md:text-2xl" : "text-xl md:text-2xl truncate"
                                                                )}>
                                                                    {renderTeamPlayers(m.opponent_1, m.opponent_2, true)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* PC Total Set Score (Large 2:0) */}
                                                        <div className="hidden md:flex w-24 justify-center shrink-0">
                                                            <span className="text-3xl md:text-4xl font-black text-yellow-400 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-500">
                                                                {pWins}:{oWins}
                                                            </span>
                                                        </div>

                                                        {/* PC Set-by-set Scores */}
                                                        <div className="hidden md:flex flex-wrap gap-2 md:w-64 justify-center">
                                                            {setsArr.map((s, idx) => (
                                                                <div key={idx} className={cn(
                                                                    "px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-[1.2rem] text-[11px] md:text-[13px] font-black tabular-nums shadow-lg border transition-all duration-500 group-hover:scale-105", 
                                                                    s.p > s.o 
                                                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:bg-yellow-500/20 group-hover:border-yellow-500/40" 
                                                                        : "bg-white/10 text-slate-200 border-white/10 group-hover:bg-white/20 group-hover:border-white/20"
                                                                )}>
                                                                    {s.p}:{s.o}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="hidden md:flex items-center justify-end gap-3 md:gap-6 relative z-10 transition-all">
                                                        <div className="flex flex-col items-center justify-center min-w-[80px] px-4 opacity-40 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-sky-400 uppercase tracking-widest whitespace-nowrap">
                                                                <Eye className="w-3 h-3" /> {parseStats(m.feedback_notes).view_count}회
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap mt-1">
                                                                <Clock className="w-3 h-3" /> {Math.floor(parseStats(m.feedback_notes).view_duration / 60)}분
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setModalOpen(true); }}
                                                            className="p-3 md:p-3.5 bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl md:rounded-2xl transition-all"
                                                        >
                                                            <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteMatch(m.id); }} 
                                                            className="p-3 md:p-3.5 bg-white/5 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400 rounded-xl md:rounded-2xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

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

