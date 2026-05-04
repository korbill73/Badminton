'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Calendar, MapPin, Trophy, X, MessageSquare, Clock, Zap, Target,
    RotateCcw, Play, Pause, Save, Scissors, ChevronRight, Loader2, Edit2, Trash2, Layers, StopCircle, PlayCircle, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ProMatchModal from '@/components/pro/ProMatchModal';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function ProArchiveMainPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [bdPlayers, setBdPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<'고등부' | '프로'>('고등부');

    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<any>(null);
    const [studyMatch, setStudyMatch] = useState<any>(null);
    
    // LOOP STATE
    const [notes, setNotes] = useState<any[]>([]);
    const [player, setPlayer] = useState<any>(null);
    const [loopA, setLoopA] = useState<number | null>(null);
    const [loopB, setLoopB] = useState<number | null>(null);
    const [activeLoop, setActiveLoop] = useState<any>(null);
    const [isSequential, setIsSequential] = useState(false);
    const [sequentialIndex, setSequentialIndex] = useState(0);
    const [editingNote, setEditingNote] = useState<any>(null);
    const contentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
        fetchBdPlayers();
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: mData, error } = await supabase.from('pro_matches').select('*').order('date', { ascending: false });
            if (mData) setMatches(mData);
        } finally {
            setLoading(false);
        }
    };

    const fetchBdPlayers = async () => {
        const { data } = await supabase.from('bd_players').select('*').order('name');
        if (data) setBdPlayers(data);
    };

    const fetchNotes = async (matchId: string) => {
        const { data } = await supabase.from('pro_notes').select('*').eq('match_id', matchId).order('timestamp');
        if (data) setNotes(data);
    };

    useEffect(() => {
        if (studyMatch && window.YT) {
            const vidId = studyMatch.video_url?.includes('v=') ? studyMatch.video_url.split('v=')[1].split('&')[0] : studyMatch.video_url;
            const initPlayer = () => {
                new window.YT.Player('pro-video-player', {
                    videoId: vidId,
                    playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, origin: window.location.origin },
                    events: { onReady: (event: any) => setPlayer(event.target) }
                });
            };
            if (window.YT.Player) initPlayer();
            else window.onYouTubeIframeAPIReady = initPlayer;
        }
        return () => { setPlayer(null); setLoopA(null); setLoopB(null); setActiveLoop(null); setIsSequential(false); setEditingNote(null); };
    }, [studyMatch]);

    useEffect(() => {
        if (!player || !activeLoop) return;
        const interval = setInterval(() => {
            if (player.getPlayerState() !== 1) return;
            const curr = player.getCurrentTime();
            if (curr >= activeLoop.end) {
                if (isSequential) {
                    const nextIdx = (sequentialIndex + 1) % notes.length;
                    setSequentialIndex(nextIdx);
                    startNoteLoop(notes[nextIdx], true);
                } else {
                    player.seekTo(activeLoop.start);
                }
            }
        }, 300);
        return () => clearInterval(interval);
    }, [player, activeLoop, isSequential, sequentialIndex, notes]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const parseTimeToSeconds = (t: string) => {
        if (!t) return 0;
        const [m, s] = t.split(':').map(Number);
        return (m || 0) * 60 + (s || 0);
    };

    const totalCycleSeconds = notes.reduce((acc, note) => {
        const [sPart, ePart] = note.timestamp.split('~');
        const start = parseTimeToSeconds(sPart);
        const end = parseTimeToSeconds(ePart);
        return acc + (end - start);
    }, 0);

    const handleSetA = () => { if (player) setLoopA(player.getCurrentTime()); };
    const handleSetB = () => { 
        if (player) {
            if (player.getPlayerState() === 1) {
                setLoopB(player.getCurrentTime()); 
                player.pauseVideo(); 
            } else {
                player.playVideo();
            }
        }
    };

    const handleSaveLoop = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loopA === null || loopB === null || !studyMatch) return;
        const form = e.target as any;
        const timeRange = `${formatTime(loopA)}~${formatTime(loopB)}`;
        const noteData = {
            match_id: studyMatch.id,
            content: form.content.value || '분석 구간',
            timestamp: timeRange, 
            tag: '전술루프'
        };

        let err;
        if (editingNote) {
            const { error } = await supabase.from('pro_notes').update(noteData).eq('id', editingNote.id);
            err = error;
        } else {
            const { error } = await supabase.from('pro_notes').insert([noteData]);
            err = error;
        }

        if (!err) {
            fetchNotes(studyMatch.id);
            setLoopA(null); setLoopB(null); setEditingNote(null);
            form.reset();
            player?.playVideo();
        }
    };

    const startNoteLoop = (note: any, sequential: boolean = false) => {
        let start = 0;
        let end = 0;
        if (note.timestamp.includes('~')) {
            const [sPart, ePart] = note.timestamp.split('~');
            start = parseTimeToSeconds(sPart);
            end = parseTimeToSeconds(ePart);
        } else {
            start = parseTimeToSeconds(note.timestamp);
            end = start + 5;
        }

        if (!sequential && activeLoop && activeLoop.start === start) {
            setActiveLoop(null);
            setIsSequential(false);
            return;
        }
        
        setActiveLoop({ start, end });
        player?.seekTo(start);
        player?.playVideo();
    };

    const startSequentialPlay = () => {
        if (notes.length === 0) return;
        setIsSequential(true);
        setSequentialIndex(0);
        startNoteLoop(notes[0], true);
    };

    const deleteNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('이 전술 루프를 삭제할까요?')) return;
        const { error } = await supabase.from('pro_notes').delete().eq('id', id);
        if (!error) fetchNotes(studyMatch.id);
    };

    const startEditNote = (e: React.MouseEvent, note: any) => {
        e.stopPropagation();
        setEditingNote(note);
        const [sPart, ePart] = note.timestamp.split('~');
        setLoopA(parseTimeToSeconds(sPart));
        setLoopB(parseTimeToSeconds(ePart));
        if (contentInputRef.current) {
            contentInputRef.current.value = note.content;
            contentInputRef.current.focus();
        }
        player?.seekTo(parseTimeToSeconds(sPart));
        player?.pauseVideo();
    };

    const handleSaveMatch = async (data: any) => {
        setLoading(true);
        if (data.id) await supabase.from('pro_matches').update(data).eq('id', data.id);
        else await supabase.from('pro_matches').insert([data]);
        setIsMatchModalOpen(false);
        fetchData();
        setLoading(false);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#080d1a]"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
    );

    const filteredMatches = matches.filter(m => (m.category || '고등부') === selectedCategory);

    return (
        <div className="min-h-screen bg-[#080d1a] text-white font-sans overflow-x-hidden">
            {!studyMatch && (
                <div className="max-w-[1580px] mx-auto p-12 space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#111827]/40 p-8 rounded-[3.5rem] border border-white/5 shadow-2xl">
                        <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-3xl border border-white/5">
                            {['고등부', '프로'].map((cat: any) => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-12 py-4 rounded-2xl font-black text-xl transition-all duration-500", selectedCategory === cat ? "bg-blue-600 text-white shadow-[0_0_40px_rgba(37,99,235,0.3)]" : "text-white/60 hover:text-white")}>{cat} 분석</button>
                            ))}
                        </div>
                        <button onClick={() => { setEditingMatch(null); setIsMatchModalOpen(true); }} className="px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black flex items-center gap-4 hover:bg-blue-700 transition-all border border-blue-500"><Plus /> 데이터 분석 추가</button>
                    </div>
                    <div className="space-y-4">
                        {filteredMatches.map((m: any) => (
                            <div key={m.id} onClick={() => { setStudyMatch(m); fetchNotes(m.id); }} className="group relative bg-[#111827] rounded-[3.2rem] px-10 py-7 transition-all duration-500 flex items-center border border-white/20 hover:border-blue-500 shadow-inner hover:scale-[1.012] cursor-pointer">
                                <div className="w-[410px] shrink-0 border-r border-white/10 pr-8 flex items-center gap-5">
                                    <span className="flex items-center gap-2 text-sky-400 font-black text-xl"><Calendar className="w-4 h-4" /> {m.date}</span>
                                    <span className="flex items-center gap-2 text-yellow-500 font-black text-xl"><MapPin className="w-4 h-4" /> {m.location}</span>
                                    <span className="flex items-center gap-2 text-white font-black text-lg">{m.tournament}</span>
                                </div>
                                <div className="flex-1 px-4 flex items-center justify-center">
                                    <div className="flex items-center justify-center gap-6 w-full max-w-xl">
                                        <span className="flex-1 text-right font-black text-[26px] text-sky-400">{m.player_name}{m.partner_name && `/`}{m.partner_name}</span>
                                        <div className="px-5 py-2 bg-emerald-500/20 rounded-full border border-emerald-500 shrink-0"><span className="text-[11px] font-black italic text-emerald-300 tracking-widest uppercase">VS</span></div>
                                        <span className="flex-1 text-left font-black text-[26px] text-yellow-400">{m.opponent}{m.opponent_2_name && `/`}{m.opponent_2_name}</span>
                                    </div>
                                </div>
                                <div className="w-[410px] shrink-0 flex items-center justify-end border-l border-white/10 pl-8 gap-6">
                                    <span className="text-5xl font-black text-yellow-400 tabular-nums">{m.score || '0:0'}</span>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setIsMatchModalOpen(true); }} className="p-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-2xl border border-blue-500/30"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제?')) supabase.from('pro_matches').delete().eq('id', m.id).then(()=>fetchData()); }} className="p-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-2xl border border-rose-500/30"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {studyMatch && (
                <div className="fixed inset-0 z-[1000] bg-[#020617] animate-in fade-in duration-500 flex flex-col text-white">
                    <div className="h-20 shrink-0 bg-[#0f172a] border-b border-white/20 px-10 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setStudyMatch(null)} className="p-3.5 bg-rose-600 text-white rounded-2xl border border-rose-400 group hover:bg-rose-700 transition-all"><X className="w-6 h-6" /></button>
                            <div className="flex flex-col">
                                <h2 className="text-xl font-black text-white tracking-widest uppercase">{studyMatch.location} {studyMatch.tournament}</h2>
                                <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">PRO Tactical Training Center</p>
                            </div>
                        </div>
                        
                        {(activeLoop || isSequential) && (
                            <div className="flex items-center gap-6">
                                <div className={cn("flex items-center gap-5 px-7 py-3 border-2 rounded-full animate-pulse shadow-lg bg-black/60", isSequential ? "border-emerald-500" : "border-blue-500")}>
                                    {isSequential ? <PlayCircle className="w-5 h-5 text-emerald-400" /> : <RotateCcw className="w-5 h-5 text-blue-400" />}
                                    <span className={cn("text-lg font-black uppercase tracking-widest text-white")}>
                                        {isSequential 
                                          ? `전술 루프 정주행 (${sequentialIndex + 1}/${notes.length}) — 시간: ${Math.floor(totalCycleSeconds/60)}분 ${totalCycleSeconds%60}초` 
                                          : `무한 루프 분석 중: ${formatTime(activeLoop.start)} ~ ${formatTime(activeLoop.end)}`}
                                    </span>
                                </div>
                                <button onClick={() => { setActiveLoop(null); setIsSequential(false); }} className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 border-2 border-rose-400 rounded-full text-white font-black text-sm transition-all shadow-xl">
                                    <StopCircle className="w-5 h-5" /> 재생 중지
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3 bg-black/80 px-6 py-3 rounded-2xl border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                            <span className="text-sm font-black text-yellow-500 uppercase tracking-widest">Score</span>
                            <span className="text-3xl font-black text-white">{studyMatch.score}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
                        <div className="flex-1 bg-black flex flex-col relative overflow-hidden">
                             <div className="flex-1 relative group"><div id="pro-video-player" className="w-full h-full" /></div>
                             <div className="h-32 shrink-0 bg-[#0f172a] border-t-2 border-white/20 px-10 flex items-center gap-10">
                                  <div className="flex items-center gap-4">
                                      <div className="flex flex-col items-center gap-2">
                                          <button onClick={handleSetA} className={cn("w-24 h-24 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all border-4 shadow-xl", loopA !== null ? "bg-blue-600 border-blue-300" : "bg-white/10 border-white/20 hover:border-blue-400")}>
                                              <Scissors className="w-8 h-8 text-white" /><span className="text-sm font-black uppercase text-white">Start (A)</span>
                                          </button>
                                          {loopA !== null && <span className="text-lg font-black text-blue-400">{formatTime(loopA)}</span>}
                                      </div>
                                      <div className="w-10 h-1.5 bg-white/20 rounded-full" />
                                      <div className="flex flex-col items-center gap-2">
                                          <button onClick={handleSetB} className={cn("w-24 h-24 rounded-3xl flex flex-col items-center justify-center gap-1 transition-all border-4 shadow-xl", loopB !== null ? "bg-rose-600 border-rose-300" : "bg-white/10 border-white/20 hover:border-rose-400")}>
                                              <Target className="w-8 h-8 text-white" /><span className="text-sm font-black uppercase text-white">End (B)</span>
                                          </button>
                                          {loopB !== null && <span className="text-lg font-black text-rose-400">{formatTime(loopB)}</span>}
                                      </div>
                                  </div>
                                  <form onSubmit={handleSaveLoop} className="flex-1 flex items-center gap-4 bg-black/60 p-6 rounded-[2.5rem] border-2 border-white/20">
                                      <div className="bg-white/10 p-4 rounded-2xl"><Zap className={cn("w-8 h-8", editingNote ? "text-emerald-400" : "text-yellow-400")} /></div>
                                      <input ref={contentInputRef} name="content" className="flex-1 bg-transparent border-none outline-none text-2xl font-black placeholder:text-white/30 text-white" placeholder={editingNote ? "전술 구간 보정 중..." : "전술 포인트 저장..."} required />
                                      {editingNote && (
                                          <button type="button" onClick={() => { setEditingNote(null); setLoopA(null); setLoopB(null); if(contentInputRef.current) contentInputRef.current.value = ""; }} className="h-16 px-8 bg-white/20 text-white rounded-2xl font-black text-lg border border-white/30">취소</button>
                                      )}
                                      <button disabled={loopA === null || loopB === null} className={cn("h-16 px-10 rounded-2xl font-black text-xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl text-white", editingNote ? "bg-emerald-600 border-2 border-emerald-400" : "bg-blue-600 border-2 border-blue-400 disabled:bg-white/10 disabled:border-transparent")}>
                                          {editingNote ? <Check className="w-6 h-6" /> : <Save className="w-6 h-6" />}
                                          {editingNote ? "보정 완료" : "저장 & 재생"}
                                      </button>
                                  </form>
                             </div>
                        </div>

                        <div className="w-full lg:w-[560px] shrink-0 bg-[#020617] border-l-2 border-white/20 flex flex-col shadow-2xl">
                             <div className="p-8 border-b-2 border-white/20 flex items-center justify-between bg-[#0f172a]">
                                  <div className="flex flex-col">
                                      <h3 className="text-2xl font-black text-white flex items-center gap-3"><Layers className="w-6 h-6 text-emerald-400" /> 전술 루프 목록</h3>
                                      <p className="text-xs font-black text-slate-400 uppercase mt-1">총 사이클: {Math.floor(totalCycleSeconds/60)}분 {totalCycleSeconds%60}초</p>
                                  </div>
                                  <button 
                                    onClick={startSequentialPlay}
                                    disabled={notes.length === 0}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-400 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-xl disabled:opacity-30"
                                  >
                                    <PlayCircle className="w-5 h-5" /> 무한 정주행
                                  </button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#020617] custom-scrollbar">
                                  {notes.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center h-48 text-center opacity-30"><RotateCcw className="w-12 h-12 text-white" /><p className="font-black text-sm uppercase mt-4 text-white">데이터가 없습니다</p></div>
                                  ) : (
                                      notes.map((note, idx) => {
                                          const timingNum = parseTimeToSeconds(note.timestamp.includes('~') ? note.timestamp.split('~')[0] : note.timestamp);
                                          const isActive = (isSequential && sequentialIndex === idx) || (!isSequential && activeLoop?.start === timingNum);
                                          const [s, e] = note.timestamp.split('~');
                                          const duration = parseTimeToSeconds(e) - parseTimeToSeconds(s);
                                          return (
                                              <div key={note.id} onClick={() => { setIsSequential(false); startNoteLoop(note); }} className={cn("px-6 py-5 rounded-[2rem] border-2 transition-all cursor-pointer group/item flex items-center justify-between gap-5", isActive ? (isSequential ? "bg-emerald-600 border-emerald-400 shadow-2xl" : "bg-blue-600 border-blue-400 shadow-2xl") : "bg-[#111827] border-white/10 hover:border-white/30")}>
                                                   <div className="flex items-center gap-4 flex-1 min-w-0">
                                                       <p className={cn("font-black text-xl truncate flex-1 text-white")}>{note.content}</p>
                                                       <div className="flex items-center gap-3 shrink-0">
                                                            <span className={cn("font-black text-2xl tracking-tighter whitespace-nowrap", isActive ? "text-white" : "text-yellow-400")}>{note.timestamp.replace('~', ' ~ ')}</span>
                                                            <span className="text-white font-black text-xs bg-black/40 px-3 py-1.5 rounded-lg border border-white/20">({duration || 0}초)</span>
                                                       </div>
                                                   </div>
                                                   <div className="shrink-0 flex items-center gap-3">
                                                        <button onClick={(e) => startEditNote(e, note)} className="p-3 bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-md"><Edit2 className="w-5 h-5" /></button>
                                                        <button onClick={(e) => deleteNote(e, note.id)} className="p-3 bg-rose-500/20 border-2 border-rose-400/50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-md"><Trash2 className="w-5 h-5" /></button>
                                                        {isActive && <div className="ml-2">{isSequential ? <PlayCircle className="w-5 h-5 text-white animate-pulse" /> : <RotateCcw className="w-5 h-5 text-white animate-spin" />}</div>}
                                                   </div>
                                              </div>
                                          );
                                      })
                                  )}
                             </div>
                        </div>
                    </div>
                </div>
            )}
            <ProMatchModal isOpen={isMatchModalOpen} onClose={() => setIsMatchModalOpen(false)} match={editingMatch} players={bdPlayers} onSave={handleSaveMatch} />
        </div>
    );
}
