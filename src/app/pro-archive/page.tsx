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

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const parseTimeToSeconds = (t: any) => {
    if (t === null || t === undefined) return 0;
    if (typeof t === 'number') return t;
    const s = String(t);
    if (!s.includes(':')) return Number(s) || 0;
    const [m, sec] = s.split(':').map(Number);
    return (m || 0) * 60 + (sec || 0);
};

const extractProYoutubeId = (url: string) => {
    if (!url) return '';
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) return url;
    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : (url.includes('v=') ? url.split('v=')[1].split('&')[0] : url);
};

export default function ProArchiveMainPage() {
    const [matches, setMatches] = useState<any[]>([]);
    const [bdPlayers, setBdPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<'고등부' | '프로' | '영어 반복'>('고등부');
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
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedLoopIds, setSelectedLoopIds] = useState<Set<string>>(new Set());
    const [isMobile, setIsMobile] = useState(false);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Fullscreen request failed: ${err.message}`);
            });
        }
    };

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        const handleResize = () => {
            checkMobile();
            // 가로 모드 자동 전체 화면 시도 (사용자 상호작용이 있었던 경우에만 작동)
            if (window.innerWidth > window.innerHeight && window.innerWidth < 1024 && studyMatch && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [studyMatch]);

    const [selectedTag, setSelectedTag] = useState<string>('하이라이트');
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
            const safeSummary = currentSummary || "";
            let fullMeta: any = {};
            try {
                const jsonMatch = safeSummary.match(/\{.*\}/s);
                if (jsonMatch) fullMeta = JSON.parse(jsonMatch[0]);
                else if (safeSummary.trim().startsWith('{')) fullMeta = JSON.parse(safeSummary);
            } catch (e) {}

            if (!fullMeta.stats) fullMeta.stats = { view_count: 0, view_duration: 0 };
            fullMeta.stats.view_count += 1;

            const updatedSummary = safeSummary.includes('{') 
                ? safeSummary.replace(/\{.*\}/s, JSON.stringify(fullMeta))
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
            const vidId = extractProYoutubeId(studyMatch.video_url);
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
        if (loopA !== null && loopB !== null && studyMatch && (studyMatch.category === '영어 반복' || selectedCategory === '영어 반복') && !editingNote) {
            const fetchAndSetSubtitle = async () => {
                const vidId = extractProYoutubeId(studyMatch.video_url);
                if (!vidId) return;
                try {
                    const res = await fetch(`/api/transcript?videoId=${vidId}`);
                    const data = await res.json();
                    if (data.transcript) {
                        const texts = data.transcript
                            .filter((t: any) => {
                                const start = t.offset / 1000;
                                const end = (t.offset + t.duration) / 1000;
                                return start < loopB && end > loopA;
                            })
                            .map((t: any) => t.text);
                        
                        if (texts.length > 0 && contentInputRef.current) {
                            const decodeHTML = (html: string) => {
                                const txt = document.createElement("textarea");
                                txt.innerHTML = html;
                                return txt.value;
                            };
                            contentInputRef.current.value = decodeHTML(texts[0]);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch transcript", e);
                }
            };
            fetchAndSetSubtitle();
        }
    }, [loopB]);

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
                        // 선택된 항목이 있으면 선택된 항목들만, 없으면 전체 항목을 대상으로 함
                        const filtered = notes.filter(n => selectedLoopIds.has(n.id));
                        const targetList = filtered.length > 0 ? filtered : notes;

                        if (targetList.length > 0) {
                            const nextIdx = (sequentialIndex + 1) % targetList.length;
                            setSequentialIndex(nextIdx);
                            startNoteLoop(targetList[nextIdx], true);
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
    }, [player, activeLoop, isSequential, sequentialIndex, notes, isAutoNext, selectedLoopIds]);

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
            if (studyMatch.category === '영어 반복' || selectedCategory === '영어 반복') {
                setLoopA(loopB);
                setLoopB(null);
                if (player && loopB !== null) {
                    player.seekTo(loopB);
                    player.playVideo();
                }
            } else {
                setLoopA(null); setLoopB(null);
                if (player && loopB !== null) {
                    player.seekTo(loopB + 5);
                    player.playVideo();
                }
            }
            setEditingNote(null);
            if (contentInputRef.current) contentInputRef.current.value = "";
        }
    };

    const handleSaveLoop = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const content = contentInputRef.current?.value || "";
        await performSaveNote('하이라이트', content);
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

    const deleteNote = async (e: React.MouseEvent, id: string) => {
        if (e) e.stopPropagation();
        if (!confirm('이 하이라이트 구간을 삭제할까요?')) return;
        const { error } = await supabase.from('pro_notes').delete().eq('id', id);
        if (!error) fetchNotes(studyMatch.id);
    };

    const startEditNote = (e: React.MouseEvent | null, note: any) => {
        if (e) e.stopPropagation();
        if (!note) {
            setEditingNote(null);
            setLoopA(null);
            setLoopB(null);
            return;
        }
        setEditingNote(note);
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

    const handleSaveMatch = async (data: any) => {
        setLoading(true);
        if (data.id) await supabase.from('pro_matches').update(data).eq('id', data.id);
        else await supabase.from('pro_matches').insert([data]);
        setIsMatchModalOpen(false);
        fetchData();
        setLoading(false);
    };

    const parseHybridNotesPro = (raw: string) => {
        if (!raw) return {};
        try {
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            return {};
        } catch (e) { return {}; }
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
                            {['고등부', '프로', '영어 반복'].map((cat: any) => (
                                <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("flex-1 md:flex-none px-6 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-xl transition-all duration-500", selectedCategory === cat ? "bg-blue-600 text-white shadow-[0_0_40px_rgba(37,99,235,0.3)]" : "text-white/60 hover:text-white")}>{cat === '영어 반복' ? '영어 반복' : `${cat} 분석`}</button>
                            ))}
                        </div>
                        <button onClick={() => { setEditingMatch({ category: selectedCategory }); setIsMatchModalOpen(true); }} className="w-full md:w-auto px-6 py-4 bg-blue-600 text-white rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all border border-blue-500 text-sm md:text-base"><Plus className="w-4 h-4 md:w-5 md:h-5" /> {selectedCategory === '영어 반복' ? '반복 학습 영상 추가' : '데이터 분석 추가'}</button>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                        {filteredMatches.map((m: any) => {
                            const isEnglish = selectedCategory === '영어 반복';
                            return (
                            <div key={m.id} onClick={() => { 
                                if (isMobile) toggleFullScreen();
                                setStudyMatch(m); 
                                fetchNotes(m.id); 
                                hasTrackedViewRef.current = false;
                                incrementProMatchView(m.id, m.summary || '');
                            }} className="group relative bg-[#111827] rounded-2xl md:rounded-[3.2rem] p-4 md:px-10 md:py-7 transition-all duration-500 flex flex-col md:flex-row items-center border border-white/10 hover:border-blue-500 shadow-inner hover:scale-[1.012] cursor-pointer gap-4 md:gap-0">
                                
                                {isEnglish ? (
                                    /* English Repeat Custom Layout */
                                    <>
                                        <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 min-w-0 pr-8">
                                            <div className="flex flex-col shrink-0 gap-2 w-auto md:w-[160px]">
                                                <span className="flex items-center gap-3 text-sky-400 font-black text-2xl whitespace-nowrap"><Calendar className="w-6 h-6" /> {m.date?.replace(/^20/, '')}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-white font-black text-2xl truncate tracking-tight w-full">{m.tournament}</span>
                                                {m.match_name && (
                                                    <span className="text-yellow-500 font-black text-xl uppercase tracking-tighter truncate w-full">{m.match_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Pro/High School Layout */
                                    <>
                                        <div className="hidden md:flex w-[480px] shrink-0 border-r border-white/10 pr-8 items-center gap-8 min-w-0">
                                            <div className="flex flex-col shrink-0 gap-2 w-[160px]">
                                                <span className="flex items-center gap-3 text-sky-400 font-black text-2xl whitespace-nowrap"><Calendar className="w-6 h-6" /> {m.date?.replace(/^20/, '')}</span>
                                                <span className="flex items-center gap-3 text-yellow-500 font-black text-2xl whitespace-nowrap"><MapPin className="w-6 h-6" /> {m.location}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0 gap-1.5 flex-1">
                                                <span className="text-white font-black text-2xl truncate tracking-tight w-full">{m.tournament}</span>
                                                {m.match_name && (
                                                    <span className="text-yellow-500 font-black text-xl uppercase tracking-tighter truncate w-full">{m.match_name}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="hidden md:flex flex-1 px-4 items-center justify-center min-w-0">
                                            <div className="flex items-center justify-center gap-6 w-full max-w-2xl">
                                                <div className="flex-1 flex flex-col items-end justify-center min-w-0 w-full overflow-hidden">
                                                    <span className={cn("font-black text-sky-400 text-right leading-tight truncate w-full", m.partner_name ? "text-xl" : "text-2xl")}>{m.player_name}</span>
                                                    {m.partner_name && <span className="text-sky-400/80 font-bold text-sm text-right mt-1 truncate w-full">/ {m.partner_name}</span>}
                                                </div>
                                                <div className="px-5 py-2 bg-emerald-500/20 rounded-full border border-emerald-500 shrink-0"><span className="text-[11px] font-black italic text-emerald-300 tracking-widest uppercase">VS</span></div>
                                                <div className="flex-1 flex flex-col items-start justify-center min-w-0 w-full overflow-hidden">
                                                    <span className={cn("font-black text-yellow-400 text-left leading-tight truncate w-full", m.opponent_2_name ? "text-xl" : "text-2xl")}>{m.opponent}</span>
                                                    {m.opponent_2_name && <span className="text-yellow-400/80 font-bold text-sm text-left mt-1 truncate w-full">/ {m.opponent_2_name}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className={cn("hidden md:flex flex-col items-center justify-center px-8 border-white/10 group-hover:scale-105 transition-transform shrink-0", isEnglish ? "border-l-0" : "border-l min-w-[180px]")}>
                                    <div className="flex items-center gap-2 text-sm font-black text-cyan-400 uppercase tracking-widest whitespace-nowrap bg-cyan-400/10 px-4 py-1.5 rounded-full border border-cyan-400/20">
                                        <Eye className="w-4 h-4" /> {parseStats(m.summary || '').view_count}회
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-black text-yellow-400 uppercase tracking-widest whitespace-nowrap mt-2 bg-yellow-400/10 px-4 py-1.5 rounded-full border border-yellow-400/20">
                                        <Clock className="w-4 h-4" /> {formatDuration(parseStats(m.summary || '').view_duration)}
                                    </div>
                                </div>

                                <div className="hidden md:flex shrink-0 items-center justify-end border-l border-white/10 pl-8 gap-6 min-w-[200px]">
                                    {!isEnglish && <span className="text-5xl font-black text-yellow-400 tabular-nums">{m.score || '0:0'}</span>}
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
                                            <span className="text-xs font-black text-sky-400">{m.date?.replace(/^20/, '')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isEnglish && <span className="text-lg font-black text-yellow-400 tabular-nums">{m.score || '0:0'}</span>}
                                            <div className="flex gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingMatch(m); setIsMatchModalOpen(true); }} className="p-1.5 bg-blue-600/20 text-blue-300 rounded-lg border border-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('삭제?')) supabase.from('pro_matches').delete().eq('id', m.id).then(()=>fetchData()); }} className="p-1.5 bg-rose-600/20 text-rose-300 rounded-lg border border-rose-500/30"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <h3 className="text-lg font-black text-white leading-tight flex items-center flex-wrap gap-y-1.5">
                                            <span className="truncate max-w-[200px]">{m.tournament}</span>
                                            {m.match_name && (
                                                <span className="bg-yellow-500/10 text-yellow-500 text-[11px] px-2 py-0.5 rounded ml-2 border border-yellow-500/20 shrink-0 uppercase">{m.match_name}</span>
                                            )}
                                            {!isEnglish && <span className="text-sm text-yellow-500 font-bold ml-3 flex items-center gap-1 shrink-0"><MapPin className="w-3 h-3" /> {m.location}</span>}
                                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400 font-black ml-3 border-l border-white/10 pl-3 shrink-0">
                                                <Eye className="w-3 h-3" /> {parseStats(m.summary || '').view_count}회
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] text-yellow-400 font-black ml-2 shrink-0">
                                                <Clock className="w-3 h-3" /> {formatDuration(parseStats(m.summary || '').view_duration)}
                                            </span>
                                        </h3>
                                        {!isEnglish && (
                                            <div className="flex items-center gap-2 text-[15px] font-black tracking-tight w-full">
                                                <span className="text-sky-400 truncate flex-1 text-right">{m.player_name}{m.partner_name && `/ ${m.partner_name}`}</span>
                                                <span className="text-white/20 text-[10px] italic shrink-0">VS</span>
                                                <span className="text-yellow-400 truncate flex-1 text-left">{m.opponent}{m.opponent_2_name && `/ ${m.opponent_2_name}`}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {studyMatch && isMobile ? (
                <ProArchiveMobileView 
                    studyMatch={studyMatch} 
                    onClose={() => {
                        if (document.fullscreenElement) document.exitFullscreen();
                        setStudyMatch(null);
                    }}
                    notes={notes}
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
                    handleSetA={handleSetA}
                    handleSetB={handleSetB}
                    handleSaveLoop={handleSaveLoop}
                    loopA={loopA}
                    loopB={loopB}
                    selectedLoopIds={selectedLoopIds}
                    setSelectedLoopIds={setSelectedLoopIds}
                    startEditNote={startEditNote}
                    deleteNote={deleteNote}
                    editingNote={editingNote}
                    contentInputRef={contentInputRef}
                    toggleFullScreen={toggleFullScreen}
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
                                          ? `패턴 트레이닝 모드 (${sequentialIndex + 1}/${notes.filter(n => selectedLoopIds.has(n.id)).length > 0 ? notes.filter(n => selectedLoopIds.has(n.id)).length : notes.length})` 
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
                                           <h3 className="text-lg font-black text-white flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-400" /> 하이라이트 목록</h3>
                                           <p className="text-[10px] font-black text-slate-400 uppercase mt-0.5">총 {notes.length}개 구간</p>
                                       </div>
                                       <div className="flex gap-2">
                                            <button 
                                              onClick={() => {
                                                  const selected = notes.filter(n => selectedLoopIds.has(n.id));
                                                  if (selected.length > 0) {
                                                      setIsSequential(true);
                                                      setSequentialIndex(0);
                                                      startNoteLoop(selected[0], true);
                                                  } else {
                                                      alert('반복할 항목을 먼저 선택해 주세요.');
                                                  }
                                              }}
                                              className={cn(
                                                  "px-3 py-1.5 border rounded-lg font-black text-[10px] transition-all flex items-center gap-1.5 shadow-lg",
                                                  isSequential && notes.some(n => selectedLoopIds.has(n.id)) 
                                                    ? "bg-amber-600 border-amber-400 text-white" 
                                                    : "bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white border-amber-500/30"
                                              )}
                                            >
                                              <Check className="w-3.5 h-3.5" /> 선택 반복 ({notes.filter(n => selectedLoopIds.has(n.id)).length})
                                            </button>
                                            <button 
                                              onClick={() => {
                                                  if (notes.length === 0) return;
                                                  setIsSequential(true);
                                                  setSequentialIndex(0);
                                                  startNoteLoop(notes[0], true);
                                              }}
                                              className={cn(
                                                  "px-3 py-1.5 border rounded-lg font-black text-[10px] transition-all flex items-center gap-1.5 shadow-xl",
                                                  isSequential && !notes.some(n => selectedLoopIds.has(n.id))
                                                    ? "bg-emerald-600 border-emerald-400 text-white"
                                                    : "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border-emerald-500/30"
                                              )}
                                            >
                                              <PlayCircle className="w-3.5 h-3.5" /> 전체 반복
                                            </button>
                                       </div>
                                  </div>
                             </div>
                             <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#020617] custom-scrollbar">
                                  {notes.length === 0 ? (
                                      <div className="flex flex-col items-center justify-center h-48 text-center opacity-10">
                                          <RotateCcw className="w-8 h-8 text-white" />
                                          <p className="font-black text-[10px] uppercase mt-4 text-white tracking-widest">분석 구간 없음</p>
                                      </div>
                                  ) : (
                                       notes.map((note, idx) => {
                                           const targetList = notes.filter(n => selectedLoopIds.has(n.id)).length > 0 
                                               ? notes.filter(n => selectedLoopIds.has(n.id)) 
                                               : notes;
                                           
                                           const [s, e] = note.timestamp.split('~');
                                           const startTime = parseTimeToSeconds(s);
                                           const endTime = parseTimeToSeconds(e);
                                           
                                           const isActive = (isSequential && targetList[sequentialIndex]?.id === note.id) || (!isSequential && activeLoop?.start === startTime);
                                           const isCurrentlyPlaying = currentTime >= startTime && currentTime <= endTime;
                                           const duration = endTime - startTime;

                                           return (
                                               <div key={note.id} 
                                                   onClick={() => { setIsSequential(false); startNoteLoop(note); }} 
                                                   className={cn(
                                                       "px-4 py-3 rounded-xl border transition-all cursor-pointer group/item flex items-center justify-between gap-4 relative overflow-hidden",
                                                       isActive ? (isSequential ? "bg-emerald-600/30 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.3)] ring-2 ring-emerald-500/20" : "bg-blue-600/30 border-blue-400 shadow-[0_0_25px_rgba(96,165,250,0.3)] ring-2 ring-blue-500/20") : 
                                                       isCurrentlyPlaying ? "bg-white/10 border-white/30" : "bg-white/[0.02] border-white/5 hover:border-white/20"
                                                   )}
                                               >
                                                    {isActive && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-transparent via-current to-transparent animate-pulse" />
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
                                                            className={cn(
                                                                "w-6 h-6 rounded-md border flex items-center justify-center transition-all",
                                                                selectedLoopIds.has(note.id) ? "bg-amber-500 border-amber-400 text-black shadow-lg" : "bg-white/5 border-white/20 text-transparent"
                                                            )}
                                                        >
                                                            <Check className="w-4 h-4" strokeWidth={4} />
                                                        </button>
                                                        
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className={cn("font-black text-base tracking-tight truncate", isActive ? "text-white" : "text-white/80")}>{note.content || '하이라이트'}</p>
                                                                {isActive && (
                                                                    <div className="flex gap-0.5 items-end h-3 mb-1">
                                                                        <div className="w-1 bg-current animate-[music_0.8s_ease-in-out_infinite]" />
                                                                        <div className="w-1 bg-current animate-[music_0.5s_ease-in-out_infinite]" />
                                                                        <div className="w-1 bg-current animate-[music_1.2s_ease-in-out_infinite]" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-[10px] tracking-widest text-slate-500 uppercase">{duration}초 구간</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0 z-10">
                                                        <span className={cn("font-black text-sm tracking-tighter tabular-nums text-yellow-400", isActive ? "opacity-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" : "opacity-60")}>{note.timestamp}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                                            <button onClick={(e) => startEditNote(e, note)} className="p-2 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg transition-all border border-blue-500/30"><Edit2 className="w-3.5 h-3.5" /></button>
                                                            <button onClick={(e) => deleteNote(e, note.id)} className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all border border-rose-500/30"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                               </div>
                                           );
                                       })
                                  )}
                             </div>
                        </div>
                    </div>

                    <div className="h-40 shrink-0 bg-[#0f172a] border-t border-white/20 px-10 flex items-center justify-center gap-10">
                        <div className="flex items-center gap-10 bg-black/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={handleSetA} className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 shadow-lg", loopA !== null ? "bg-blue-600 border-blue-300" : "bg-white/10 border-white/20 hover:border-blue-400 shadow-inner")}>
                                    <Scissors className="w-6 h-6 text-white" /><span className="text-[10px] font-black uppercase text-white">시작 (A)</span>
                                </button>
                                {loopA !== null && <span className="text-sm font-black text-blue-400 tabular-nums">{formatTime(loopA)}</span>}
                            </div>
                            <div className="w-12 h-1 bg-white/10 rounded-full" />
                            <div className="flex flex-col items-center gap-2">
                                <button onClick={handleSetB} className={cn("w-20 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 shadow-lg", loopB !== null ? "bg-rose-600 border-rose-300" : "bg-white/10 border-white/20 hover:border-rose-400 shadow-inner")}>
                                    <Target className="w-6 h-6 text-white" /><span className="text-[10px] font-black uppercase text-white">종료 (B)</span>
                                </button>
                                {loopB !== null && <span className="text-sm font-black text-rose-400 tabular-nums">{formatTime(loopB)}</span>}
                            </div>
                            <div className="w-px h-16 bg-white/10 mx-2" />
                            <div className="flex flex-col gap-2">
                                <input 
                                  ref={contentInputRef}
                                  placeholder="배울 점 메모 (선택)"
                                  className="w-80 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-black text-white focus:border-blue-500 outline-none transition-all"
                                />
                                <button 
                                  onClick={handleSaveLoop}
                                  disabled={loopA === null || loopB === null}
                                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl font-black text-lg shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all flex items-center justify-center gap-3"
                                >
                                  <Plus className="w-6 h-6" /> 하이라이트 구간 저장
                                </button>
                            </div>
                            {editingNote && (
                                <button type="button" onClick={() => { startEditNote(null, null); if(contentInputRef.current) contentInputRef.current.value=""; }} className="h-20 px-8 bg-rose-600/20 text-rose-400 rounded-2xl font-black text-xs border-2 border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all">편집취소</button>
                            )}
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
    studyMatch, onClose, notes, activeLoop, isSequential, setIsSequential, 
    isAutoNext, setIsAutoNext, setSequentialIndex, startNoteLoop, 
    sequentialIndex, formatTime, setPlayer, handleSetA, handleSetB, 
    handleSaveLoop, loopA, loopB, selectedLoopIds, setSelectedLoopIds,
    startEditNote, deleteNote, editingNote, contentInputRef, toggleFullScreen
}: any) {
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const playerRef = useRef<any>(null);
    const activeItemRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (activeItemRef.current) {
            activeItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [activeLoop?.start, sequentialIndex]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            if (playerRef.current) playerRef.current.destroy();
            
            const videoId = extractProYoutubeId(studyMatch.video_url);

            playerRef.current = new window.YT.Player('youtube-player-mobile', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3
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

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedLoopIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedLoopIds(newSet);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col landscape:flex-row overflow-hidden text-white">
            {/* Video Area */}
            <div className="relative flex-shrink-0 bg-black flex items-center justify-center h-[210px] landscape:h-full landscape:flex-1 border-b landscape:border-b-0 landscape:border-r border-white/10 group">
                <div className="w-full h-full" onClick={toggleFullScreen}>
                    <div id="youtube-player-mobile" className="w-full h-full" />
                </div>
                {!isPlayerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                )}
                
                {/* Mobile Landscape UI Overlay - Moved to Top Right */}
                <div className="absolute top-4 right-4 flex gap-2 z-50">
                    <button onClick={onClose} className="p-2.5 bg-black/60 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md"><X className="w-5 h-5" /></button>
                    <button onClick={toggleFullScreen} className="p-2.5 bg-black/60 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md landscape:flex hidden"><Maximize2 className="w-5 h-5" /></button>
                </div>
            </div>

            {/* Controls & List Area - Width minimized in landscape */}
            <div className="flex-1 flex flex-col bg-[#020617] overflow-hidden landscape:w-[220px] landscape:flex-none">
                {/* Header/Actions - Portrait: Full, Landscape: Minimized */}
                <div className="p-3 bg-[#0f172a] border-b border-white/10 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="p-2 bg-rose-600/20 text-rose-500 rounded-lg border border-rose-500/20 active:scale-90 transition-all"><X className="w-4 h-4" /></button>
                    <div className="flex flex-col items-center">
                        <h3 className="font-black text-[10px] flex items-center gap-1.5 uppercase tracking-tighter text-white/80"><Layers className="w-3 h-3 text-emerald-400" /> 분석 도구</h3>
                        {isSequential && <span className="text-[8px] font-black text-amber-400 animate-pulse">자동 재생 중</span>}
                    </div>
                    <button onClick={toggleFullScreen} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/20 active:scale-90 transition-all"><Maximize2 className="w-4 h-4" /></button>
                </div>

                {/* Clipping Controls - Premium UI */}
                <div className="p-2 bg-black/40 border-b border-white/10 flex flex-col gap-2 shrink-0">
                    <div className="flex gap-1.5">
                        <button onClick={handleSetA} className={cn("flex-1 py-2 rounded-xl border-2 font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 shadow-lg", loopA !== null ? "bg-blue-600 border-blue-300 text-white" : "bg-white/5 border-white/10 text-white/40")}>
                            <Scissors className="w-3 h-3" /> 시작 A {loopA !== null && `(${formatTime(loopA)})`}
                        </button>
                        <button onClick={handleSetB} className={cn("flex-1 py-2 rounded-xl border-2 font-black text-[9px] transition-all flex flex-col items-center justify-center gap-1 shadow-lg", loopB !== null ? "bg-rose-600 border-rose-300 text-white" : "bg-white/5 border-white/10 text-white/40")}>
                            <Target className="w-3 h-3" /> 종료 B {loopB !== null && `(${formatTime(loopB)})`}
                        </button>
                    </div>
                    
                    {/* Memo Input & Save when A/B are set */}
                    {(loopA !== null && loopB !== null) && (
                        <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/20">
                            <input 
                                ref={contentInputRef}
                                placeholder="분석 메모 (선택)"
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-md text-[10px] font-black text-white focus:border-blue-400 outline-none"
                            />
                            <div className="flex gap-1">
                                <button onClick={handleSaveLoop} className="flex-[2] py-2 bg-emerald-600 text-white rounded-md border border-emerald-400 font-black text-[10px] flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all">
                                    <Save className="w-3 h-3" /> {editingNote ? '수정 완료' : '하이라이트 등록'}
                                </button>
                                {editingNote && (
                                    <button onClick={() => { startEditNote(null, null); if(contentInputRef.current) contentInputRef.current.value=""; }} className="flex-1 py-2 bg-white/10 text-white/40 rounded-md font-black text-[9px]">취소</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Playback Mode Controls */}
                <div className="p-2 bg-[#0f172a] border-b border-white/10 flex items-center justify-between gap-1.5">
                    <button 
                        onClick={() => { 
                            setIsSequential(true); 
                            const selected = notes.filter((n:any) => selectedLoopIds.has(n.id));
                            if (selected.length > 0) {
                                setSequentialIndex(0);
                                startNoteLoop(selected[0], true);
                            } else {
                                alert('항목을 선택해 주세요.');
                            }
                        }} 
                        className={cn(
                            "flex-1 py-2 rounded-lg font-black text-[9px] border transition-all flex items-center justify-center gap-1",
                            isSequential && notes.some((n:any) => selectedLoopIds.has(n.id)) ? "bg-amber-600 border-amber-400 text-white" : "bg-white/5 border-white/10 text-white/40"
                        )}
                    >
                        <Check className="w-3 h-3" /> 선택 ({notes.filter((n:any) => selectedLoopIds.has(n.id)).length})
                    </button>
                    <button 
                        onClick={() => { setIsSequential(true); setSequentialIndex(0); startNoteLoop(notes[0], true); }} 
                        className={cn(
                            "flex-1 py-2 rounded-lg font-black text-[9px] border transition-all flex items-center justify-center gap-1",
                            isSequential && !notes.some((n:any) => selectedLoopIds.has(n.id)) ? "bg-emerald-600 border-emerald-400 text-white" : "bg-white/5 border-white/10 text-white/40"
                        )}
                    >
                        <PlayCircle className="w-3 h-3" /> 전체
                    </button>
                </div>

                {/* List Area */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                    {notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 opacity-10"><RotateCcw className="w-6 h-6" /><p className="text-[9px] font-black mt-2">구간 없음</p></div>
                    ) : (
                        notes.map((note: any, idx: number) => {
                            const targetList = notes.filter((n:any) => selectedLoopIds.has(n.id)).length > 0 
                                ? notes.filter((n:any) => selectedLoopIds.has(n.id)) 
                                : notes;

                            const [s, e] = note.timestamp.split('~');
                            const startTime = parseTimeToSeconds(s);
                            const isActive = (isSequential && targetList[sequentialIndex]?.id === note.id) || (!isSequential && activeLoop?.start === startTime);
                            const isSelected = selectedLoopIds.has(note.id);
                            
                            return (
                                <div 
                                    key={note.id} 
                                    ref={isActive ? (el => { activeItemRef.current = el; }) : null}
                                    className={cn(
                                        "p-2.5 rounded-lg border transition-all flex items-center gap-2 relative overflow-hidden",
                                        isActive ? (isSequential ? "bg-emerald-600/30 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "bg-blue-600/30 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.3)]") : 
                                        "bg-white/[0.02] border-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-current animate-pulse" />
                                    )}
                                    <button 
                                        onClick={() => toggleSelect(note.id)}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 z-10",
                                            isSelected ? "bg-amber-500 border-amber-400 text-black shadow-lg" : "bg-white/5 border-white/20 text-transparent"
                                        )}
                                    >
                                        <Check className="w-3 h-3" strokeWidth={4} />
                                    </button>
                                    
                                    <div className="flex-1 min-w-0 z-10" onClick={() => { setIsSequential(false); startNoteLoop(note); }}>
                                        <div className="flex items-center gap-1.5">
                                            <p className={cn("font-black text-[11px] truncate leading-tight", isActive ? "text-white" : "text-white/70")}>{note.content || '하이라이트'}</p>
                                            {isActive && (
                                                <div className="flex gap-0.5 items-end h-2.5">
                                                    <div className="w-0.5 bg-current animate-[music_0.8s_ease-in-out_infinite]" />
                                                    <div className="w-0.5 bg-current animate-[music_0.5s_ease-in-out_infinite]" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black text-yellow-500 opacity-60">{note.timestamp}</span>
                                    </div>
                                    
                                    {/* Action Buttons - Compact */}
                                    <div className="flex items-center gap-0.5 shrink-0 z-10">
                                        <button onClick={(e:any) => startEditNote(e, note)} className={cn("p-1.5 transition-all", isActive ? "text-white" : "text-white/20")}><Edit2 className="w-3 h-3" /></button>
                                        <button onClick={(e:any) => deleteNote(e, note.id)} className={cn("p-1.5 transition-all", isActive ? "text-white" : "text-rose-500/30")}><Trash2 className="w-3 h-3" /></button>
                                        <button onClick={() => { setIsSequential(false); startNoteLoop(note); }} className={cn("p-1.5 rounded-lg", isActive ? "text-white" : "text-white/10")}>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
