'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Calendar, MapPin, Trophy, X, MessageSquare, Clock, Zap, Target,
    RotateCcw, Play, Pause, Save, Scissors, ChevronRight, Loader2, Edit2, Edit3, Trash2, Layers, StopCircle, PlayCircle, Check, Star, Maximize2,
    RefreshCw, ChevronLeft, Eye
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
    const hasTrackedViewRef = useRef(false);

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
    const [isAutoNext, setIsAutoNext] = useState(true);
    const [editingNote, setEditingNote] = useState<any>(null);
    const playerRef = useRef<any>(null);
    const [customTags, setCustomTags] = useState<string[]>(['득점', '실점', '특이점', '전술루프']);
    const [isEditingTags, setIsEditingTags] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedLoopIds, setSelectedLoopIds] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Persist category names
    useEffect(() => {
        const saved = localStorage.getItem('pro_archive_custom_tags');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length === 4) {
                    setCustomTags(parsed);
                }
            } catch (e) {
                console.error('Failed to load local tags', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('pro_archive_custom_tags', JSON.stringify(customTags));
    }, [customTags]);

    const [selectedTag, setSelectedTag] = useState<string>('강점');
    const [activeFilter, setActiveFilter] = useState<string>('전체');
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

    const parseStats = (raw: string) => {
        if (!raw) return { view_count: 0, view_duration: 0 };
        try {
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) {
                const meta = JSON.parse(jsonMatch[0]);
                return meta.stats || { view_count: 0, view_duration: 0 };
            }
            if (raw.trim().startsWith('{')) return JSON.parse(raw).stats || { view_count: 0, view_duration: 0 };
        } catch (e) {}
        return { view_count: 0, view_duration: 0 };
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}분 ${s}초`;
    };

    const incrementProMatchView = async (matchId: string, currentSummary: string) => {
        try {
            let fullMeta: any = {};
            try {
                const jsonMatch = currentSummary.match(/\{.*\}/s);
                if (jsonMatch) fullMeta = JSON.parse(jsonMatch[0]);
                else if (currentSummary.trim().startsWith('{')) fullMeta = JSON.parse(currentSummary);
            } catch (e) {}

            if (!fullMeta.stats) fullMeta.stats = { view_count: 0, view_duration: 0 };
            fullMeta.stats.view_count += 1;

            const updatedSummary = currentSummary.includes('{') 
                ? currentSummary.replace(/\{.*\}/s, JSON.stringify(fullMeta))
                : JSON.stringify(fullMeta);

            await supabase.from('pro_matches').update({ summary: updatedSummary }).eq('id', matchId);
        } catch (e) {
            console.error("Pro view increment failed", e);
        }
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
                    events: { onReady: (event: any) => {
                        playerRef.current = event.target;
                        setPlayer(event.target);
                    }}
                });
            };
            
            // 모바일에서 DOM 렌더링 후 요소를 확실히 찾기 위해 약간의 지연 시간을 둡니다.
            // 중복 초기화 방지를 위해 ref 사용
            const timer = setTimeout(() => {
                if (window.YT && window.YT.Player) {
                    const container = document.getElementById('pro-video-player');
                    if (container) {
                        container.innerHTML = '';
                        initPlayer();
                    }
                } else {
                    window.onYouTubeIframeAPIReady = initPlayer;
                }
            }, 500);

            return () => {
                clearTimeout(timer);
                if (playerRef.current) {
                    try { playerRef.current.destroy(); } catch(e) {}
                    playerRef.current = null;
                }
                setPlayer(null); setLoopA(null); setLoopB(null); setActiveLoop(null); setIsSequential(false); setEditingNote(null); 
            };
        }
    }, [studyMatch?.id, isMobile]);

    // VIEW STATS TRACKING (PRO)
    useEffect(() => {
        if (!studyMatch || hasTrackedViewRef.current) return;
        
        hasTrackedViewRef.current = true;
        
        const updateViewCount = async () => {
            const { data: fresh } = await supabase.from('pro_matches').select('summary').eq('id', studyMatch.id).single();
            if (!fresh) return;

            const meta = parseHybridNotesPro(fresh.summary);
            const stats = meta.stats || { view_count: 0, view_duration: 0 };
            stats.view_count += 1;
            
            let newRaw = fresh.summary || "";
            const jsonMatch = newRaw.match(/\{.*\}/s);
            if (jsonMatch) newRaw = newRaw.replace(jsonMatch[0], JSON.stringify({ ...meta, stats }));
            else newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify({ ...meta, stats });
            
            await supabase.from('pro_matches').update({ summary: newRaw }).eq('id', studyMatch.id);
        };
        updateViewCount();

        const durationTimer = setInterval(async () => {
            const { data: fresh } = await supabase.from('pro_matches').select('summary').eq('id', studyMatch.id).single();
            if (fresh) {
                const meta = parseHybridNotesPro(fresh.summary);
                const stats = meta.stats || { view_count: 0, view_duration: 0 };
                stats.view_duration += 10;
                
                let newRaw = fresh.summary || "";
                const jsonMatch = newRaw.match(/\{.*\}/s);
                if (jsonMatch) newRaw = newRaw.replace(jsonMatch[0], JSON.stringify({ ...meta, stats }));
                else newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify({ ...meta, stats });
                
                await supabase.from('pro_matches').update({ summary: newRaw }).eq('id', studyMatch.id);
            }
        }, 10000);

        return () => clearInterval(durationTimer);
    }, [studyMatch?.id]);

    useEffect(() => {
        if (!player) return;
        const interval = setInterval(() => {
            const curr = player.getCurrentTime();
            setCurrentTime(curr);

            if (player.getPlayerState() !== 1) return;
            if (!activeLoop) return;

            if (curr >= activeLoop.end) {
                if (isSequential) {
                    if (isAutoNext) {
                        const baseFiltered = notes.filter(n => activeFilter === '전체' || n.tag === activeFilter);
                        const starred = baseFiltered.filter(n => selectedLoopIds.has(n.id));
                        const filtered = starred.length > 0 ? starred : baseFiltered;

                        if (filtered.length > 0) {
                            const nextIdx = (sequentialIndex + 1) % filtered.length;
                            setSequentialIndex(nextIdx);
                            startNoteLoop(filtered[nextIdx], true);
                        } else {
                            setIsSequential(false);
                        }
                    } else {
                        player.seekTo(activeLoop.start);
                    }
                } else {
                    player.seekTo(activeLoop.start);
                }
            }
        }, 200);
        return () => clearInterval(interval);
    }, [player, activeLoop, isSequential, sequentialIndex, notes, activeFilter, selectedLoopIds, isAutoNext]);

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

    const parseHybridNotesPro = (raw: string) => {
        if (!raw) return {};
        try {
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            return {};
        } catch (e) { return {}; }
    };

    const saveHybridMetaPro = async (matchId: string, updates: any) => {
        const { data: fresh } = await supabase.from('pro_matches').select('summary').eq('id', matchId).single();
        if (!fresh) return;
        
        const currentMeta = parseHybridNotesPro(fresh.summary);
        const newMeta = { ...currentMeta, ...updates };
        
        let newRaw = fresh.summary || "";
        const jsonMatch = newRaw.match(/\{.*\}/s);
        if (jsonMatch) {
            newRaw = newRaw.replace(jsonMatch[0], JSON.stringify(newMeta));
        } else {
            newRaw = (newRaw ? newRaw + "\n\n" : "") + JSON.stringify(newMeta);
        }
        
        await supabase.from('pro_matches').update({ summary: newRaw }).eq('id', matchId);
    };

    const performSaveNote = async (tag: string, content: string) => {
        if (loopA === null || loopB === null || !studyMatch) return;
        const timeRange = `${formatTime(loopA)}~${formatTime(loopB)}`;
        const noteData = {
            match_id: studyMatch.id,
            content: content.trim() || tag,
            timestamp: timeRange, 
            tag: tag
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
            if (contentInputRef.current) contentInputRef.current.value = "";
            if (player && loopB !== null) {
                player.seekTo(loopB + 5);
                player.playVideo();
            }
        }
    };

    const handleSaveLoop = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = contentInputRef.current?.value || "";
        await performSaveNote(selectedTag, content);
    };

    const startNoteLoop = (note: any, sequential: boolean = false) => {
        if (!note) {
            setActiveLoop(null);
            setIsSequential(false);
            return;
        }
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
        const baseFiltered = notes.filter(n => activeFilter === '전체' || n.tag === activeFilter);
        const starred = baseFiltered.filter(n => selectedLoopIds.has(n.id));
        const filtered = starred.length > 0 ? starred : baseFiltered;

        if (filtered.length === 0) return;
        setIsSequential(true);
        setSequentialIndex(0);
        startNoteLoop(filtered[0], true);
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
        setSelectedTag(note.tag);
        const [s, eTime] = note.timestamp.split('~');
        setLoopA(parseTimeToSeconds(s));
        setLoopB(parseTimeToSeconds(eTime));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (contentInputRef.current) {
            contentInputRef.current.value = note.content;
            contentInputRef.current.focus();
        }
        player?.seekTo(parseTimeToSeconds(s));
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
                <div className="max-w-[1580px] mx-auto p-4 md:p-12 space-y-6 md:space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#111827]/40 p-4 md:p-8 rounded-3xl md:rounded-[3.5rem] border border-white/5 shadow-2xl gap-4">
                        <div className="flex w-full md:w-auto items-center gap-1 p-1 bg-black/40 rounded-2xl md:rounded-3xl border border-white/5">
                            {['고등부', '프로'].map((cat: any) => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("flex-1 md:flex-none px-6 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-xl transition-all duration-500", selectedCategory === cat ? "bg-blue-600 text-white shadow-[0_0_40px_rgba(37,99,235,0.3)]" : "text-white/60 hover:text-white")}>{cat} 분석</button>
                            ))}
                        </div>
                        <button onClick={() => { setEditingMatch(null); setIsMatchModalOpen(true); }} className="w-full md:w-auto px-6 py-4 bg-blue-600 text-white rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all border border-blue-500 text-sm md:text-base"><Plus className="w-4 h-4 md:w-5 md:h-5" /> 데이터 분석 추가</button>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                        {filteredMatches.map((m: any) => (
                            <div key={m.id} onClick={() => { 
                                setStudyMatch(m); 
                                fetchNotes(m.id); 
                                hasTrackedViewRef.current = false;
                                incrementProMatchView(m.id, m.summary || '');
                            }} className="group relative bg-[#111827] rounded-2xl md:rounded-[3.2rem] p-4 md:px-10 md:py-7 transition-all duration-500 flex flex-col md:flex-row items-center border border-white/10 hover:border-blue-500 shadow-inner hover:scale-[1.012] cursor-pointer gap-4 md:gap-0">
                                {/* Desktop Layout */}
                                <div className="hidden md:flex w-[410px] shrink-0 border-r border-white/10 pr-8 items-center gap-5">
                                    <span className="flex items-center gap-2 text-sky-400 font-black text-xl"><Calendar className="w-4 h-4" /> {m.date}</span>
                                    <span className="flex items-center gap-2 text-yellow-500 font-black text-xl"><MapPin className="w-4 h-4" /> {m.location}</span>
                                    <span className="flex items-center gap-2 text-white font-black text-lg">{m.tournament}</span>
                                </div>
                                <div className="hidden md:flex flex-1 px-4 items-center justify-center min-w-0">
                                    <div className="flex items-center justify-center gap-6 w-full max-w-2xl">
                                        <span className="flex-1 text-right font-black text-[24px] text-sky-400 truncate max-w-[300px]">{m.player_name}{m.partner_name && `/ ${m.partner_name}`}</span>
                                        <div className="px-5 py-2 bg-emerald-500/20 rounded-full border border-emerald-500 shrink-0"><span className="text-[11px] font-black italic text-emerald-300 tracking-widest uppercase">VS</span></div>
                                        <span className="flex-1 text-left font-black text-[24px] text-yellow-400 truncate max-w-[300px]">{m.opponent}{m.opponent_2_name && `/ ${m.opponent_2_name}`}</span>
                                    </div>
                                </div>
                                <div className="hidden md:flex flex-col items-center justify-center min-w-[180px] px-8 border-l border-white/10 group-hover:scale-105 transition-transform shrink-0">
                                    <div className="flex items-center gap-2 text-sm font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap bg-cyan-400/10 px-4 py-1.5 rounded-full border border-cyan-400/20">
                                        <Eye className="w-4 h-4" /> {parseStats(m.summary || '').view_count}회
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-black text-yellow-400 uppercase tracking-widest whitespace-nowrap mt-2 bg-yellow-400/10 px-4 py-1.5 rounded-full border border-yellow-400/20">
                                        <Clock className="w-4 h-4" /> {formatDuration(parseStats(m.summary || '').view_duration)}
                                    </div>
                                </div>
                                    <div className="hidden md:flex w-[410px] shrink-0 items-center justify-end border-l border-white/10 pl-8 gap-6">
                                    <span className="text-5xl font-black text-yellow-400 tabular-nums">{m.score || '0:0'}</span>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setIsMatchModalOpen(true); }} className="p-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-2xl border border-blue-500/30"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제?')) supabase.from('pro_matches').delete().eq('id', m.id).then(()=>fetchData()); }} className="p-3 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-2xl border border-rose-500/30"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Mobile Layout */}
                                <div className="md:hidden w-full flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-sky-400" />
                                            <span className="text-xs font-black text-sky-400">{m.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-yellow-400 tabular-nums">{m.score || '0:0'}</span>
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setIsMatchModalOpen(true); }} className="p-1.5 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제?')) supabase.from('pro_matches').delete().eq('id', m.id).then(()=>fetchData()); }} className="p-1.5 bg-rose-600/20 text-rose-300 rounded-lg border border-rose-500/30"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                        <div className="flex flex-col gap-1.5">
                                            <h3 className="text-[13px] font-black text-white leading-tight">
                                                {m.tournament}
                                                <span className="text-[10px] text-yellow-500 font-bold ml-2">@{m.location}</span>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-black ml-3 border-l border-white/10 pl-3">
                                                    <Eye className="w-3 h-3" /> {parseStats(m.summary || '').view_count}회
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400 font-black ml-2">
                                                    <Clock className="w-3 h-3" /> {formatDuration(parseStats(m.summary || '').view_duration)}
                                                </span>
                                            </h3>
                                            <div className="flex items-center gap-2 text-[15px] font-black tracking-tight">
                                                <span className="text-sky-400">{m.player_name}{m.partner_name && `/ ${m.partner_name}`}</span>
                                                <span className="text-white/20 text-[10px] italic">VS</span>
                                                <span className="text-yellow-400">{m.opponent}{m.opponent_2_name && `/ ${m.opponent_2_name}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        ))}
                    </div>
                </div>
            )}

            {studyMatch && isMobile ? (
                <ProArchiveMobileView 
                    studyMatch={studyMatch} 
                    onClose={() => setStudyMatch(null)}
                    notes={notes}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                    selectedLoopIds={selectedLoopIds}
                    activeLoop={activeLoop}
                    isSequential={isSequential}
                    setIsSequential={setIsSequential}
                    isAutoNext={isAutoNext}
                    setIsAutoNext={setIsAutoNext}
                    setSequentialIndex={setSequentialIndex}
                    startNoteLoop={startNoteLoop}
                    sequentialIndex={sequentialIndex}
                    formatTime={formatTime}
                    setPlayer={setPlayer}
                />
            ) : studyMatch && (
                <div className="fixed inset-0 z-[1000] bg-[#020617] animate-in fade-in duration-500 flex flex-col text-white">
                    <div className="h-20 shrink-0 bg-[#0f172a] border-b border-white/20 px-10 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-6">
                            <button onClick={() => setStudyMatch(null)} className="p-3.5 bg-rose-600 text-white rounded-2xl border border-rose-400 group hover:bg-rose-700 transition-all"><X className="w-6 h-6" /></button>
                            <div className="flex flex-col">
                                <h1 className="text-xl font-black text-white tracking-widest uppercase">{studyMatch.player_name} VS {studyMatch.opponent}</h1>
                                <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em]">PRO Tactical Training Center</p>
                            </div>
                        </div>
                        
                        {(activeLoop || isSequential) && (
                            <div className="flex items-center gap-6">
                                <div className={cn("flex items-center gap-5 px-7 py-3 border-2 rounded-full animate-pulse shadow-lg bg-black/60", isSequential ? "border-emerald-500" : "border-blue-500")}>
                                    {isSequential ? <PlayCircle className="w-5 h-5 text-emerald-400" /> : <RotateCcw className="w-5 h-5 text-blue-400" />}
                                    <span className={cn("text-lg font-black uppercase tracking-widest text-white")}>
                                        {isSequential 
                                          ? `패턴 트레이닝 모드 (${sequentialIndex + 1}/${notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).length})` 
                                          : `무한 루프 분석 중: ${formatTime(activeLoop.start)} ~ ${formatTime(activeLoop.end)}`}
                                    </span>
                                </div>
                                <button onClick={() => { setActiveLoop(null); setIsSequential(false); }} className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 border-2 border-rose-400 rounded-full text-white font-black text-sm transition-all shadow-xl">
                                    <StopCircle className="w-5 h-5" /> 재생 중지
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-3 bg-black/80 px-6 py-3 rounded-2xl border-2 border-slate-700">
                             <div className="flex items-center gap-2 text-yellow-500">
                                 <Trophy className="w-5 h-5" />
                                 <span className="text-xs font-black uppercase tracking-widest">{studyMatch.tournament}</span>
                             </div>
                             <div className="w-px h-4 bg-white/20 mx-2" />
                             <span className="text-2xl font-black text-white tabular-nums tracking-tighter">{studyMatch.score}</span>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden lg:flex-row flex-col border-b border-white/10">
                        <div className="flex-1 bg-black relative flex flex-col group">
                             <div id="pro-video-player" className="w-full h-full" />
                        </div>

                        <div className="w-full lg:w-[420px] shrink-0 bg-[#020617] border-l border-white/20 flex flex-col shadow-2xl h-full overflow-hidden">
                             <div className="p-5 border-b border-white/20 bg-[#0f172a] space-y-4">
                                  <div className="flex items-center justify-between">
                                       <div className="flex flex-col">
                                           <h3 className="text-lg font-black text-white flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-400" /> 전술 루프 목록</h3>
                                           <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">총 사이클: {Math.floor(notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).reduce((acc, note) => {
                                                const [sPart, ePart] = note.timestamp.split('~');
                                                return acc + (parseTimeToSeconds(ePart) - parseTimeToSeconds(sPart));
                                            }, 0)/60)}분 {notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).reduce((acc, note) => {
                                                const [sPart, ePart] = note.timestamp.split('~');
                                                return acc + (parseTimeToSeconds(ePart) - parseTimeToSeconds(sPart));
                                            }, 0)%60}초</p>
                                       </div>
                                       <button 
                                         onClick={() => {
                                             const filtered = notes.filter(n => activeFilter === '전체' || n.tag === activeFilter);
                                             if (filtered.length === 0) return;
                                             setIsSequential(true);
                                             setSequentialIndex(0);
                                             startNoteLoop(filtered[0], true);
                                         }}
                                         disabled={notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).length === 0}
                                         className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-400 rounded-lg font-black text-[10px] transition-all flex items-center gap-1.5 shadow-xl disabled:opacity-30"
                                       >
                                         <PlayCircle className="w-3.5 h-3.5 text-cyan-300" /> {selectedLoopIds.size > 0 ? "선택 구간 훈련" : "전체 무한 훈련"}
                                       </button>
                                  </div>
                                  <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/10">
                                      {['전체', ...customTags].map(f => (
                                          <button 
                                            key={f}
                                            onClick={() => setActiveFilter(f)}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all",
                                                activeFilter === f ? "bg-white/15 text-white border border-white/30 shadow-md" : "text-white/70 hover:text-white hover:bg-white/5"
                                            )}
                                          >
                                              {f}
                                          </button>
                                      ))}
                                  </div>
                             </div>
                             <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#020617] custom-scrollbar">
                                  {notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).length === 0 ? (
                                      <div className="flex flex-col items-center justify-center h-48 text-center opacity-10"><RotateCcw className="w-8 h-8 text-white" /><p className="font-black text-[10px] uppercase mt-4 text-white tracking-widest">데이터 없음</p></div>
                                  ) : (
                                       notes.filter(n => activeFilter === '전체' || n.tag === activeFilter).map((note, idx) => {
                                           const timingNum = parseTimeToSeconds(note.timestamp.includes('~') ? note.timestamp.split('~')[0] : note.timestamp);
                                           const [s, e] = note.timestamp.split('~');
                                           const startTime = parseTimeToSeconds(s);
                                           const endTime = parseTimeToSeconds(e);
                                           
                                           const isActive = (isSequential && sequentialIndex === idx) || (!isSequential && activeLoop?.start === timingNum);
                                           const isCurrentlyPlaying = currentTime >= startTime && currentTime <= endTime;
                                           const isSelected = selectedLoopIds.has(note.id);
                                           const duration = endTime - startTime;

                                           return (
                                               <div key={note.id} 
                                                   onClick={() => { setIsSequential(false); startNoteLoop(note); }} 
                                                   className={cn(
                                                       "px-4 py-2 rounded-xl border transition-all cursor-pointer group/item flex items-center justify-between gap-4 relative overflow-hidden",
                                                       isActive ? (isSequential ? "bg-emerald-600/40 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]" : "bg-blue-600/40 border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.3)]") : 
                                                       isCurrentlyPlaying ? "bg-white/10 border-white/40 shadow-inner" : "bg-white/[0.02] border-white/5 hover:border-white/20"
                                                   )}
                                               >
                                                    {isCurrentlyPlaying && (
                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent animate-pulse pointer-events-none" />
                                                    )}
                                                    <div className="flex items-center gap-3 flex-1 min-w-0 z-10">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newSet = new Set(selectedLoopIds);
                                                                if (newSet.has(note.id)) newSet.delete(note.id);
                                                                else newSet.add(note.id);
                                                                setSelectedLoopIds(newSet);
                                                            }}
                                                            className={cn("transition-all hover:scale-125", isSelected ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "text-white/70 hover:text-white")}
                                                        >
                                                            <Star className="w-4 h-4" fill={isSelected ? "currentColor" : "none"} />
                                                        </button>
                                                        <div className={cn("w-1.5 h-6 rounded-full shrink-0",
                                                            note.tag === '득점' ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' :
                                                            note.tag === '실점' ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]' :
                                                            note.tag === customTags[2] ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' : 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]'
                                                        )} />
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <p className={cn("font-black text-base tracking-tight truncate", isCurrentlyPlaying ? "text-white" : "text-white/90")}>{note.content}</p>
                                                            <span className={cn("font-black text-xs tracking-widest px-2 py-0.5 rounded shrink-0", 
                                                                note.tag === '득점' ? 'bg-rose-500/20 text-rose-300' : 
                                                                note.tag === '실점' ? 'bg-blue-500/20 text-blue-300' : 
                                                                'bg-slate-500/20 text-slate-300'
                                                            )}>
                                                                {duration}초
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0 z-10">
                                                        <span className={cn("font-black text-sm tracking-tighter tabular-nums text-yellow-400", isCurrentlyPlaying || isActive ? "opacity-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" : "opacity-80")}>{note.timestamp.replace('~', ' — ')}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                            <button onClick={(e) => startEditNote(e, note)} className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white rounded transition-all border border-emerald-500/30"><Edit2 className="w-3 h-3" /></button>
                                                            <button onClick={(e) => deleteNote(e, note.id)} className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded transition-all border border-rose-500/30"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    </div>
                                               </div>
                                           );
                                       })
                                  )}
                             </div>
                        </div>
                    </div>

                    <div className="h-40 shrink-0 bg-[#0f172a] border-t border-white/20 px-10 flex items-center gap-10">
                           <div className="flex-1 flex flex-col justify-center">
                               <div className="flex items-center justify-center gap-3">
                                   <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 shadow-inner">
                                       <Zap className={cn("w-6 h-6", 
                                           selectedTag === customTags[0] ? 'text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 
                                           selectedTag === customTags[1] ? 'text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-purple-400'
                                       )} />
                                   </div>
                                   <div className="h-10 w-px bg-white/10 mx-2" />
                                   <div className="flex items-center gap-2">
                                       {customTags.map((t, idx) => (
                                           <div key={idx} className="relative">
                                               {isEditingTags ? (
                                                   <input 
                                                       className="w-24 px-3 py-3 bg-blue-600/20 border-2 border-blue-500 rounded-xl text-[11px] font-black text-white outline-none shadow-[0_0_15px_rgba(59,130,246,0.2)] text-center focus:bg-blue-600 focus:border-blue-300 transition-all"
                                                       value={t}
                                                       onChange={(e) => {
                                                           const newTags = [...customTags];
                                                           newTags[idx] = e.target.value;
                                                           setCustomTags(newTags);
                                                       }}
                                                       onFocus={(e) => e.target.select()}
                                                       autoFocus={idx === 0}
                                                   />
                                               ) : (
                                                   <button 
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTag(t);
                                                            if (loopA !== null && loopB !== null) {
                                                                performSaveNote(t, t);
                                                            }
                                                        }}
                                                        onDoubleClick={() => setIsEditingTags(true)}
                                                        className={cn(
                                                            "px-6 py-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border-2 min-w-[90px]",
                                                            selectedTag === t 
                                                                ? (idx === 0 ? "bg-rose-600 border-rose-300 text-white shadow-[0_0_30px_rgba(225,29,72,0.4)]" :
                                                                   idx === 1 ? "bg-blue-600 border-blue-300 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]" :
                                                                   idx === 2 ? "bg-purple-600 border-purple-300 text-white shadow-[0_0_30px_rgba(147,51,234,0.4)]" :
                                                                   "bg-slate-600 border-slate-300 text-white")
                                                                : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30 hover:bg-white/10"
                                                        )}
                                                    >
                                                        {t}
                                                    </button>
                                               )}
                                           </div>
                                       ))}
                                   </div>
                                   <div className="h-10 w-px bg-white/10 mx-1" />
                                   <button 
                                        onClick={() => setIsEditingTags(!isEditingTags)} 
                                        className={cn(
                                            "flex items-center gap-2 px-6 py-3.5 rounded-xl transition-all border font-black text-[11px] uppercase whitespace-nowrap",
                                            isEditingTags ? "bg-emerald-500 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                                        )}
                                   >
                                        {isEditingTags ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                        <span>{isEditingTags ? "완료" : "이름 변경"}</span>
                                   </button>
                                   {editingNote && (
                                        <button type="button" onClick={() => { setEditingNote(null); setLoopA(null); setLoopB(null); }} className="ml-4 h-14 px-8 bg-rose-600/20 text-rose-400 rounded-2xl font-black text-xs border-2 border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all shadow-xl">편집취소</button>
                                   )}
                               </div>
                               <p className="text-[10px] text-center mt-3 text-white/20 uppercase font-black tracking-[0.3em] animate-pulse">Double click to rename categories</p>
                           </div>

                           <div className="flex items-center gap-4 shrink-0 border-l border-white/10 pl-10">
                               <div className="flex flex-col items-center gap-1">
                                   <button onClick={handleSetA} className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 shadow-lg", loopA !== null ? "bg-blue-600 border-blue-300" : "bg-white/10 border-white/20 hover:border-blue-400 shadow-inner")}>
                                       <Scissors className="w-6 h-6 text-white" /><span className="text-[10px] font-black uppercase text-white">Start (A)</span>
                                   </button>
                                   {loopA !== null && <span className="text-sm font-black text-blue-400 tabular-nums">{formatTime(loopA)}</span>}
                               </div>
                               <div className="w-8 h-1 bg-white/20 rounded-full" />
                               <div className="flex flex-col items-center gap-1">
                                   <button onClick={handleSetB} className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 shadow-lg", loopB !== null ? "bg-rose-600 border-rose-300" : "bg-white/10 border-white/20 hover:border-rose-400 shadow-inner")}>
                                       <Target className="w-6 h-6 text-white" /><span className="text-[10px] font-black uppercase text-white">End (B)</span>
                                   </button>
                                   {loopB !== null && <span className="text-sm font-black text-rose-400 tabular-nums">{formatTime(loopB)}</span>}
                               </div>
                           </div>
                    </div>

                </div>
            )}
            <ProMatchModal 
                isOpen={isMatchModalOpen} 
                onClose={() => setIsMatchModalOpen(false)} 
                match={editingMatch} 
                players={bdPlayers} 
                onSave={handleSaveMatch} 
                matches={matches}
            />
        </div>
    );
}

function ProArchiveMobileView({ 
    studyMatch, onClose, notes, activeFilter, setActiveFilter, 
    selectedLoopIds, activeLoop, isSequential, setIsSequential, 
    isAutoNext, setIsAutoNext,
    setSequentialIndex, startNoteLoop, sequentialIndex, formatTime,
    setPlayer
}: any) {
    const [showControls, setShowControls] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const playerRef = useRef<any>(null);
    const filters = ['전체', '득점', '실점', '⭐ 중요'];

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // Load YouTube API if not already loaded
    useEffect(() => {
        if (typeof window !== 'undefined' && !window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            if (playerRef.current) playerRef.current.destroy();
            
            const videoId = studyMatch.video_url.includes('v=') 
                ? studyMatch.video_url.split('v=')[1].split('&')[0]
                : studyMatch.video_url.split('/').pop();

            playerRef.current = new window.YT.Player('youtube-player-mobile', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    playsinline: 1,
                    iv_load_policy: 3
                },
                events: {
                    onReady: (event: any) => {
                        setIsPlayerReady(true);
                        setPlayer(event.target);
                    }
                }
            });
        };

        const checkYT = setInterval(() => {
            if (window.YT && window.YT.Player) {
                initPlayer();
                clearInterval(checkYT);
            }
        }, 300);

        return () => {
            clearInterval(checkYT);
            if (playerRef.current) playerRef.current.destroy();
        };
    }, [studyMatch]);

    const getFilteredNotes = (filter: string) => {
        if (filter === '⭐ 중요') {
            return notes.filter((n: any) => selectedLoopIds.has(n.id));
        }
        return notes.filter((n: any) => filter === '전체' || n.tag === filter);
    };

    const currentFilteredNotes = getFilteredNotes(activeFilter);

    return (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col landscape:flex-row overflow-hidden text-white">
            {/* Video Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center" onClick={() => setShowControls(!showControls)}>
                <div className="w-full aspect-video">
                    <div id="youtube-player-mobile" className="w-full h-full" />
                </div>
                
                {/* Close Button - Removed as requested */}

                {!isPlayerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </div>
                )}
            </div>

            {/* Portrait Title Overlay */}
            <div className={cn(
                "hidden portrait:flex absolute top-0 left-0 right-0 p-5 pt-10 items-center justify-between z-40 transition-all duration-500 bg-gradient-to-b from-black/80 to-transparent",
                !showControls && "opacity-0 -translate-y-4"
            )}>
                <div className="flex flex-col">
                    <h2 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-0.5">{activeFilter === '전체' ? studyMatch.player_name : `${activeFilter} 집중 분석`}</h2>
                    <p className="text-[10px] font-black text-white/40 tracking-[0.2em]">MOBILE CINEMA MODE</p>
                </div>
                <button onClick={toggleFullScreen} className="p-2.5 bg-white/10 backdrop-blur-md text-white rounded-full border border-white/20">
                    <Maximize2 className="w-5 h-5" />
                </button>
            </div>

            {/* Main Controls Panel */}
            <div className={cn(
                "z-50 bg-gradient-to-t from-black to-black/80 backdrop-blur-xl border-white/10 transition-all duration-500 transform",
                "portrait:absolute portrait:bottom-0 portrait:left-0 portrait:right-0 portrait:p-4 portrait:pb-6 portrait:rounded-t-[2.5rem] portrait:border-t",
                !showControls && "portrait:translate-y-full",
                "landscape:relative landscape:w-[160px] landscape:h-full landscape:border-l landscape:p-2 landscape:flex landscape:flex-col landscape:gap-2",
                !showControls && "landscape:translate-x-full"
            )}>
                {/* Landscape Sidebar Header */}
                <div className="hidden landscape:flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1">
                        <button onClick={onClose} className="p-1.5 bg-rose-600 text-white rounded-lg flex-1 flex justify-center"><X className="w-4 h-4" /></button>
                        <button onClick={toggleFullScreen} className="p-1.5 bg-white/10 rounded-lg border border-white/10 flex-1 flex justify-center"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 overflow-hidden">
                        <span className="text-[8px] font-black text-blue-400">CINEMA</span>
                        <span className="text-[9px] font-black truncate text-white/90">{studyMatch.player_name}</span>
                    </div>
                    <div className="h-px bg-white/10 w-full" />
                </div>

                <div className="portrait:absolute portrait:top-2 portrait:left-1/2 portrait:-translate-x-1/2 portrait:w-12 portrait:h-1 portrait:bg-white/10 portrait:rounded-full" />
                
                {/* Filters Grid - 2 Columns */}
                <div className="flex-1 flex flex-col gap-2.5 landscape:gap-1.5 portrait:mt-2">
                    <div className="grid grid-cols-2 gap-2 landscape:gap-1 w-full">
                        {filters.map((f: string) => {
                            const count = getFilteredNotes(f).length;
                            const isActive = activeFilter === f;
                            return (
                                <button 
                                    key={f} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFilter(f);
                                        setIsAutoNext(f === '전체');
                                        const filtered = getFilteredNotes(f);
                                        if (filtered.length > 0) {
                                            setIsSequential(true);
                                            setSequentialIndex(0);
                                            startNoteLoop(filtered[0], true);
                                        }
                                    }}
                                    className={cn(
                                        "py-2 landscape:py-1.5 rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95",
                                        isActive 
                                            ? "bg-blue-600 border-blue-400 text-white shadow-lg" 
                                            : "bg-white/5 border-white/10 text-white/40"
                                    )}
                                >
                                    <span className="text-[11px] landscape:text-[10px] font-black">{f === '전체' ? '전체' : f}</span>
                                    <span className={cn("text-[10px] landscape:text-[8px] font-black", isActive ? "text-blue-200" : "text-white/20")}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Navigation and Mode Controls */}
                    <div className="flex items-center gap-2.5 landscape:gap-1">
                        <button 
                            onClick={() => {
                                if (currentFilteredNotes.length === 0) return;
                                const prevIdx = (sequentialIndex - 1 + currentFilteredNotes.length) % currentFilteredNotes.length;
                                setSequentialIndex(prevIdx);
                                startNoteLoop(currentFilteredNotes[prevIdx], true);
                            }}
                            className="p-3 landscape:p-1.5 bg-white/5 rounded-xl border border-white/10 flex-1 flex justify-center active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5 landscape:w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsAutoNext(!isAutoNext)}
                            className={cn(
                                "px-4 py-3 landscape:py-1.5 rounded-xl font-black text-xs landscape:text-[8px] border transition-all flex-[2] flex items-center justify-center gap-2 landscape:gap-1 active:scale-95",
                                isAutoNext ? "bg-emerald-600 border-emerald-400 text-white" : "bg-amber-600 border-amber-400 text-white"
                            )}
                        >
                            {isAutoNext ? <RefreshCw className="w-4 h-4 landscape:w-3 h-3" /> : <RotateCcw className="w-4 h-4 landscape:w-3 h-3" />}
                            {isAutoNext ? '자동' : '반복'}
                        </button>
                        <button 
                            onClick={() => {
                                if (currentFilteredNotes.length === 0) return;
                                const nextIdx = (sequentialIndex + 1) % currentFilteredNotes.length;
                                setSequentialIndex(nextIdx);
                                startNoteLoop(currentFilteredNotes[nextIdx], true);
                            }}
                            className="p-3 landscape:p-1.5 bg-blue-600/30 rounded-xl border border-blue-400/20 flex-1 flex justify-center active:scale-95"
                        >
                            <ChevronRight className="w-5 h-5 landscape:w-4 h-4" />
                        </button>
                    </div>
                </div>

            </div>

            {/* Toggle Overlay Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); setShowControls(true); }}
                className={cn(
                    "absolute z-[60] p-4 bg-blue-600/80 backdrop-blur-md text-white rounded-full shadow-2xl border border-white/20 transition-all duration-500",
                    "portrait:bottom-6 portrait:left-1/2 portrait:-translate-x-1/2",
                    "landscape:right-6 landscape:top-1/2 landscape:-translate-y-1/2",
                    showControls ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
                )}
            >
                <Layers className="w-6 h-6" />
            </button>
        </div>
    );
}

