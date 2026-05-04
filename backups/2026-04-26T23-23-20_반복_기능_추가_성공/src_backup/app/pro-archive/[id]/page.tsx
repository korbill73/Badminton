'use client';

import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Calendar, MapPin, Trophy, ChevronLeft,
    Video, Loader2, Play, Edit2, Trash2, X, MessageSquare, Clock, Zap, Shield, Save, ExternalLink, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ProTournamentModal from '@/components/pro/ProTournamentModal';
import ProMatchModal from '@/components/pro/ProMatchModal';

export default function ProPlayerDetailPage({ params }: { params: { id: string } }) {
    const [player, setPlayer] = useState<any>(null);
    const [groupedMatches, setGroupedMatches] = useState<Record<string, any[]>>({});
    const [proPlayers, setProPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
    const [studyMatch, setStudyMatch] = useState<any>(null);
    const [notes, setNotes] = useState<any[]>([]);

    // Form States
    const [editingMatch, setEditingMatch] = useState<any>(null);
    const [editingTournament, setEditingTournament] = useState<any>(null);
    const [targetTName, setTargetTName] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        fetchProPlayers();
    }, [params.id]);

    const fetchData = async () => {
        setLoading(true);
        const { data: pData } = await supabase.from('pro_players').select('*').eq('id', params.id).single();
        if (pData) setPlayer(pData);

        const { data: mData } = await supabase.from('pro_matches').select('*').eq('player_id', params.id).order('created_at', { ascending: false });
        if (mData) {
            const grouped: Record<string, any[]> = {};
            mData.forEach(m => {
                const tName = m.tournament || '기타 대회';
                if (!grouped[tName]) grouped[tName] = [];
                grouped[tName].push(m);
            });
            setGroupedMatches(grouped);
        }
        setLoading(false);
    };

    const fetchProPlayers = async () => {
        const { data } = await supabase.from('pro_players').select('*').order('name');
        if (data) setProPlayers(data);
    };

    const fetchNotes = async (matchId: string) => {
        const { data } = await supabase.from('pro_notes').select('*').eq('match_id', matchId).order('timestamp');
        if (data) setNotes(data);
    };

    const handleSaveTournament = async (data: any) => {
        // Since we don't have a pro_tournaments table, we'll store info in first match of this group 
        // Or we could create the table. For now, let's just refresh. Better to just store in matches.
        setEditingTournament(null);
        setIsTournamentModalOpen(false);
    };

    const handleSaveMatch = async (data: any) => {
        setLoading(true);
        const payload = { ...data, player_id: params.id, tournament: targetTName || data.tournament };
        let res;
        if (payload.id) res = await supabase.from('pro_matches').update(payload).eq('id', payload.id);
        else res = await supabase.from('pro_matches').insert([payload]);
        
        if (!res.error) {
            setIsMatchModalOpen(false);
            fetchData();
        }
        setLoading(false);
    };

    const deleteMatch = async (id: string) => {
        if (!confirm('경기를 삭제하시겠습니까?')) return;
        setLoading(true);
        await supabase.from('pro_matches').delete().eq('id', id);
        fetchData();
        setLoading(false);
    };

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as any;
        const content = form.content.value;
        const time = form.time.value;
        const tag = form.tag.value;
        const { error } = await supabase.from('pro_notes').insert([{ match_id: studyMatch.id, content, timestamp: time, tag }]);
        if (!error) {
            fetchNotes(studyMatch.id);
            form.reset();
        }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#080d1a]">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080d1a] text-white p-4 md:p-8 lg:p-12 font-sans overflow-x-hidden">
            <div className="max-w-[1400px] mx-auto space-y-12">
                
                {/* Header (Exact Screenshot Style) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-10 border-b border-white/5">
                    <div className="space-y-4">
                        <Link href="/pro-archive" className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em] opacity-80 flex items-center gap-2 hover:translate-x-1 transition-transform">
                             <ChevronLeft className="w-4 h-4" /> BATTLE LOG & TACTICAL ARCHIVE
                        </Link>
                        <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-none text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                            {player?.name} <span className="text-white">학습 기록.</span>
                        </h1>
                        <p className="text-white/70 font-bold text-sm md:text-xl max-w-2xl leading-relaxed">선배 선수들의 모든 경기 데이터를 정밀 분석하고 전술 패턴을 학습합니다.</p>
                    </div>
                    
                    <button 
                        onClick={() => { setEditingTournament(null); setIsTournamentModalOpen(true); }}
                        className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 active:scale-95"
                    >
                        <Plus className="w-6 h-6" /> 새 대회 등록
                    </button>
                </div>

                {/* Tournament Groups (Exact Screenshot Style) */}
                <div className="space-y-16">
                    {Object.entries(groupedMatches).length === 0 ? (
                        <div className="h-[400px] bg-white/5 rounded-[4rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-6">
                            <Trophy className="w-16 h-16 text-slate-800" />
                            <p className="text-slate-500 font-black text-xl">등록된 경기가 없습니다. 새로운 경기를 추가해 주세요.</p>
                        </div>
                    ) : (
                        Object.entries(groupedMatches).map(([tName, matches]) => (
                            <div key={tName} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20 md:mb-32">
                                
                                {/* Tournament Card (Exact Screenshot Style) */}
                                <div className="relative group/tcard">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2.5rem] blur opacity-25 group-hover/tcard:opacity-50 transition duration-1000" />
                                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 px-10 py-8 bg-[#0f172a]/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-2xl">
                                        <div className="flex items-center gap-10">
                                            <div className="h-16 w-2.5 bg-gradient-to-b from-blue-500 to-cyan-400 rounded-full shrink-0 shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                                            <div className="space-y-3">
                                                <h3 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{tName}</h3>
                                                <div className="flex flex-wrap items-center gap-6 text-sm md:text-2xl font-black tracking-tighter">
                                                    <span className="flex items-center gap-2 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                                                        <MapPin className="w-8 h-8" /> {matches[0].location || 'International'}
                                                    </span>
                                                    <span className="w-px h-8 bg-white/10 hidden md:block" />
                                                    <span className="flex items-center gap-2 text-white/70">
                                                        <Calendar className="w-7 h-7 text-emerald-400" /> {matches[0].date || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => { setTargetTName(tName); setEditingMatch(null); setIsMatchModalOpen(true); }}
                                            className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)] active:scale-95"
                                        >
                                            <Plus className="w-6 h-6" /> 경기 추가
                                        </button>
                                    </div>
                                </div>

                                {/* Match Rows (Matching Screenshot Columns: Winner / Names / Score / Set Scores) */}
                                <div className="grid gap-4">
                                    {matches.map((m: any) => {
                                        const scoreArr = m.score ? m.score.split(':') : [0, 0];
                                        const sets = [m.set_1, m.set_2, m.set_3].filter(Boolean);

                                        return (
                                            <div 
                                                key={m.id} 
                                                onClick={() => { setStudyMatch(m); fetchNotes(m.id); }}
                                                className="group relative bg-[#111827]/40 rounded-[2.5rem] p-6 transition-all duration-700 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 hover:bg-blue-600/[0.25] border border-blue-500/60 shadow-[0_0_20px_rgba(59,130,246,0.25)] hover:border-blue-400 hover:shadow-[0_0_60px_rgba(59,130,246,0.6)] md:hover:-translate-y-2 cursor-pointer overflow-hidden"
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-center shadow-[0_0_30px_rgba(37,99,235,0.9)]" />
                                                
                                                <div className="flex flex-col md:flex-row md:items-center gap-10 flex-1 relative z-10">
                                                    <div className="flex items-center gap-6 md:min-w-[450px]">
                                                        {/* W/L Badge */}
                                                        <div className={cn(
                                                            "w-16 h-16 shrink-0 rounded-[1.8rem] flex items-center justify-center font-black text-2xl italic shadow-2xl transition-all duration-500 group-hover:scale-110",
                                                            scoreArr[0] >= scoreArr[1] 
                                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500/20" 
                                                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20 group-hover:bg-rose-500/20"
                                                        )}>
                                                            {scoreArr[0] >= scoreArr[1] ? 'W' : 'L'}
                                                        </div>
                                                        
                                                        {/* Player Names */}
                                                        <div className="flex items-center gap-6 flex-1 overflow-hidden">
                                                            <span className="font-black text-2xl text-sky-400 group-hover:text-white transition-colors truncate">
                                                                {player?.name} 
                                                            </span>
                                                            <div className="flex flex-col items-center opacity-30">
                                                                <div className="h-px w-8 bg-white group-hover:w-12 transition-all" />
                                                                <span className="text-[10px] font-black italic">VS</span>
                                                                <div className="h-px w-8 bg-white group-hover:w-12 transition-all" />
                                                            </div>
                                                            <span className="font-black text-2xl text-yellow-400 group-hover:text-white transition-colors truncate">
                                                                {m.opponent}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Total Score (Center) */}
                                                    <div className="flex w-24 justify-center shrink-0">
                                                        <span className="text-4xl font-black text-yellow-400 tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] group-hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all">
                                                            {m.score || '2:0'}
                                                        </span>
                                                    </div>

                                                    {/* Set Scores (Right) */}
                                                    <div className="hidden md:flex flex-wrap gap-3 md:w-72 justify-center">
                                                        {sets.map((s, idx) => (
                                                            <div key={idx} className="px-5 py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-2xl text-[13px] font-black tabular-nums shadow-lg group-hover:bg-yellow-500/20 transition-all">
                                                                {s}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-4 relative z-10 transition-all">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setTargetTName(tName); setIsMatchModalOpen(true); }}
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
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Analysis Study Overlay (Keep same logic but matches premium style) */}
            {studyMatch && (
                <div className="fixed inset-0 z-[400] bg-[#080d1a] overflow-y-auto animate-in slide-in-from-bottom-20 duration-700">
                    <div className="max-w-[1600px] mx-auto p-4 md:p-10 space-y-12">
                        <div className="flex items-center justify-between border-b border-white/5 pb-10">
                            <div className="flex items-center gap-8">
                                <button onClick={() => setStudyMatch(null)} className="w-[80px] h-[80px] rounded-[2.5rem] bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all font-black border border-white/10 shadow-xl active:scale-90">
                                    <X className="w-10 h-10" />
                                </button>
                                <div>
                                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">{studyMatch.tournament}</h2>
                                    <p className="text-blue-500 font-black text-xl uppercase tracking-[0.3em] mt-3">Tactical Lab: {player?.name} vs {studyMatch.opponent}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black flex items-center gap-3 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
                                    <Video className="w-6 h-6" /> 분석 완료 및 저장
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2 space-y-12">
                                <div className="aspect-video bg-black rounded-[4rem] border border-white/10 overflow-hidden shadow-[0_0_120px_rgba(59,130,246,0.15)] relative">
                                    <iframe 
                                        src={`https://www.youtube.com/embed/${studyMatch.video_url?.includes('v=') ? studyMatch.video_url.split('v=')[1].split('&')[0] : studyMatch.video_url}`}
                                        className="w-full h-full border-none"
                                        allowFullScreen
                                    />
                                </div>
                                <div className="bg-[#0f172a]/50 p-12 rounded-[4rem] border border-white/5 space-y-6 shadow-2xl relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-2 bg-yellow-400 text-black font-black uppercase tracking-widest text-xs rounded-full">Pro Coach Insight</div>
                                    <h3 className="text-2xl font-black flex items-center gap-4 text-white justify-center">
                                        <Zap className="w-8 h-8 text-yellow-400" /> 전략 요약 가이드
                                    </h3>
                                    <p className="text-xl text-slate-400 font-bold leading-relaxed text-center italic">"{studyMatch.summary || '이 경기를 통해 습득해야 할 핵심 전술 포인트가 아직 작성되지 않았습니다.'}"</p>
                                </div>
                            </div>

                            <div className="lg:col-span-1 bg-[#0f172a]/80 backdrop-blur-xl p-10 rounded-[4rem] border border-white/10 flex flex-col h-[850px] shadow-2xl relative">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter">
                                        <MessageSquare className="w-8 h-8 text-emerald-500" /> 분석 필기장
                                    </h3>
                                    <span className="text-slate-500 font-black text-xs uppercase tracking-widest">{notes.length} Point(s)</span>
                                </div>
                                
                                <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                    {notes.map(note => (
                                        <div key={note.id} className="p-8 bg-white/5 rounded-[3rem] border border-white/5 hover:border-blue-500/40 transition-all group/note relative overflow-hidden">
                                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover/note:opacity-100 transition-opacity" />
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="px-4 py-1.5 bg-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest">{note.tag}</span>
                                                <span className="text-blue-500 font-black text-xl flex items-center gap-2"><Clock className="w-5 h-5 whitespace-nowrap" /> {note.timestamp}</span>
                                            </div>
                                            <p className="text-white/80 font-bold text-lg leading-relaxed">{note.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={handleSaveNote} className="mt-10 pt-10 border-t border-white/10 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input name="time" className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black text-lg text-center" placeholder="영상 시간 (01:23)" />
                                        <select name="tag" className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black text-lg">
                                            <option className="bg-slate-900">전술</option>
                                            <option className="bg-slate-900">공격</option>
                                            <option className="bg-slate-900">수비</option>
                                        </select>
                                    </div>
                                    <textarea name="content" className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-white font-bold text-lg h-32 focus:border-blue-500 outline-none" placeholder="이 시점의 핵심 전술을 적으세요..." />
                                    <button className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-2xl shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all active:scale-95">메모 저장하기</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modals */}
            <ProTournamentModal 
                isOpen={isTournamentModalOpen} 
                onClose={() => setIsTournamentModalOpen(false)} 
                onSave={handleSaveTournament} 
                tournament={editingTournament}
            />

            <ProMatchModal 
                isOpen={isMatchModalOpen} 
                onClose={() => setIsMatchModalOpen(false)} 
                tournamentId={targetTName}
                match={editingMatch}
                players={proPlayers}
                onSave={handleSaveMatch}
            />
        </div>
    );
}
