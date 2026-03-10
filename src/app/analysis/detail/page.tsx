'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import YoutubePlayer from '@/components/match/YoutubePlayer';
import RallyTimeline from '@/components/match/RallyTimeline';
import MomentumChart from '@/components/analytics/MomentumChart';
import DataEntryLogger from '@/components/match/DataEntryLogger';
import TacticalDashboard from '@/components/analytics/TacticalDashboard';
import CategorySelectModal from '@/components/match/CategorySelectModal';
import MobileScorePanel from '@/components/match/MobileScorePanel';
import { BDMatch, BDPointLog, MomentumData } from '@/types';
import { ChevronLeft, ChevronDown, Share2, Download, Loader2, Trophy, Layout, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
    is_default: boolean;
    display_order?: number;
}

function MatchDetailContent() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('id');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const [showCustom, setShowCustom] = useState(false);
    const [match, setMatch] = useState<BDMatch | null>(null);
    const [logs, setLogs] = useState<BDPointLog[]>([]);
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    // Unified Set State
    const [currentSet, setCurrentSet] = useState<number>(1);
    const [selectedAnalysisSet, setSelectedAnalysisSet] = useState<'total' | number | 'compare'>('compare');
    const [isMobileStatsOpen, setIsMobileStatsOpen] = useState(false);

    // Helper to change set globally
    const handleSetChange = (set: number) => {
        setCurrentSet(set);
        setSelectedAnalysisSet(set);
    };

    const [categories, setCategories] = useState<Category[]>([]);
    const [activeTime, setActiveTime] = useState<number>(0);
    const [pendingInsert, setPendingInsert] = useState<{ setNumber: number; timestamp: number; isMyPoint: boolean; pivotCreatedAt?: string } | null>(null);
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);

    // Reset lastAddedId after 3 seconds for highlighting
    useEffect(() => {
        if (lastAddedId) {
            const timer = setTimeout(() => setLastAddedId(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [lastAddedId]);

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('bd_point_categories')
            .select('*')
            .order('display_order', { ascending: true });
        if (!error && data) setCategories(data);
    };

    const fetchMatchData = async (showLoading = true) => {
        if (!matchId) return;
        if (showLoading) setLoading(true);
        try {
            const { data: mData, error: mErr } = await supabase
                .from('bd_matches')
                .select(`
                    *,
                    tournament:bd_tournaments(name),
                    partner:bd_players!partner_id(name),
                    opponent_1:bd_players!opponent_1_id(name),
                    opponent_2:bd_players!opponent_2_id(name)
                `)
                .eq('id', matchId)
                .single();

            if (mErr) throw mErr;
            if (mData) setMatch(mData);

            const { data: lData, error: lErr } = await supabase
                .from('bd_point_logs')
                .select('*')
                .eq('match_id', matchId)
                .order('set_number', { ascending: true })
                .order('video_timestamp', { ascending: true })
                .order('created_at', { ascending: true });

            if (lErr) throw lErr;
            const fetchedLogs = lData || [];
            setLogs(fetchedLogs);

            // 3. Auto-fix check: If any log has '0-0' or count is inconsistent, trigger sync
            if (fetchedLogs.length > 0) {
                const needsFix = fetchedLogs.some(l => l.current_score === '0-0');
                if (needsFix) {
                    console.log('Detected uninitialized scores, triggering auto-fix...');
                    syncAndRecalculateAll(fetchedLogs);
                }
            }
        } catch (err: any) {
            console.error('Error fetching match data:', err.message);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        if (matchId) {
            fetchMatchData();
            fetchCategories();
        }
    }, [matchId]);

    // Track Real-time Video Time
    useEffect(() => {
        if (!player) return;

        const interval = setInterval(() => {
            try {
                // Only update if player is ready and potentially playing
                const time = Math.floor(player.getCurrentTime());
                if (time !== activeTime) setActiveTime(time);
            } catch (e) {
                // Ignore player ready errors
            }
        }, 500); // Check every 500ms for responsiveness

        return () => clearInterval(interval);
    }, [player, activeTime]);

    const syncAndRecalculateAll = async (initialLogs?: BDPointLog[], removedIds?: string[]) => {
        if (!matchId) return;
        setIsSyncing(true);
        try {
            // Use provided logs or current state
            let baseLogs = initialLogs || [...logs];

            // Apply removals
            if (removedIds && removedIds.length > 0) {
                const removeSet = new Set(removedIds);
                baseLogs = baseLogs.filter(l => !removeSet.has(l.id));
            }

            if (baseLogs.length === 0) {
                setLogs([]);
                setIsSyncing(false);
                return [];
            }

            // Sort logs by set, time, and creation
            const sorted = [...baseLogs].sort((a, b) => {
                if (a.set_number !== b.set_number) return (a.set_number ?? 1) - (b.set_number ?? 1);
                if (a.video_timestamp !== b.video_timestamp) return (a.video_timestamp ?? 0) - (b.video_timestamp ?? 0);
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateA - dateB;
            });

            // Recalculate scores
            const running = { 1: { me: 0, opp: 0 }, 2: { me: 0, opp: 0 }, 3: { me: 0, opp: 0 } };
            const recalculated = sorted.map(log => {
                const s = (log.set_number || 1) as 1 | 2 | 3;
                if (log.is_my_point) running[s].me++;
                else running[s].opp++;
                const newScore = `${running[s].me}-${running[s].opp}`;
                return { ...log, current_score: newScore };
            });

            // Update State
            setLogs(recalculated);

            // Persist to DB
            const { error } = await supabase.from('bd_point_logs').upsert(
                recalculated.map(u => ({
                    id: u.id,
                    match_id: u.match_id,
                    set_number: u.set_number,
                    current_score: u.current_score,
                    is_my_point: u.is_my_point,
                    point_type: u.point_type,
                    video_timestamp: u.video_timestamp,
                    created_at: u.created_at
                })),
                { onConflict: 'id' }
            );

            if (error) console.error('Persistence failed:', error);

            return recalculated; // Return the final state
        } catch (err: any) {
            console.error('Recalculation failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleRallyClick = (timestamp: number) => {
        if (player) {
            player.seekTo(timestamp);
            player.playVideo();
        }
    };

    const handleAddLog = async (newLog?: BDPointLog) => {
        if (newLog) {
            const finalLogs = await syncAndRecalculateAll([...logs, newLog]);
            if (finalLogs) setLastAddedId(newLog.id);
        } else {
            await syncAndRecalculateAll();
        }
    };

    const handleBulkAddLogs = async (newLogs: any[]) => {
        if (!newLogs || newLogs.length === 0) return;
        setIsSyncing(true);
        try {
            // First, insert all new logs to DB
            const { data, error } = await supabase
                .from('bd_point_logs')
                .insert(newLogs.map(l => ({
                    match_id: matchId,
                    set_number: l.set_number || currentSet,
                    is_my_point: l.is_my_point,
                    point_type: l.point_type,
                    current_score: '0-0', // Temporary, will be recalculated
                    video_timestamp: l.video_timestamp || l.timestamp,
                })))
                .select();

            if (error) throw error;
            if (data) {
                // Now recalculate everything including new ones
                await syncAndRecalculateAll([...logs, ...data]);
            }
        } catch (err: any) {
            console.error('Bulk save failed:', err);
            alert('일괄 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleInsertLog = (targetSet: number, insertTime: number, isMyPoint: boolean = true, pivotCreatedAt?: string) => {
        // 중간 삽입 모달 오픈 시 영상 일시정지
        if (player) {
            player.pauseVideo();
        }
        setPendingInsert({ setNumber: targetSet, timestamp: Math.floor(insertTime), isMyPoint, pivotCreatedAt });
    };

    const handleFinalizeInsert = async (categoryName: string) => {
        if (!pendingInsert || !matchId) return;
        const { setNumber, timestamp, isMyPoint, pivotCreatedAt } = pendingInsert;

        try {
            // Calculate a nudged createdAt to ensure it sorts correctly even at the same video_timestamp
            let finalCreatedAt = new Date().toISOString();
            if (pivotCreatedAt) {
                const pivotDate = new Date(pivotCreatedAt);
                pivotDate.setMilliseconds(pivotDate.getMilliseconds() - 50); // Nudge 50ms earlier
                finalCreatedAt = pivotDate.toISOString();
            }

            const { data, error: insErr } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: setNumber,
                    current_score: (() => {
                        const setLogs = logs.filter(l => (l.set_number || 1) === setNumber);
                        const currentMe = setLogs.filter(l => l.is_my_point).length;
                        const currentOpp = setLogs.filter(l => !l.is_my_point).length;
                        return isMyPoint ? `${currentMe + 1}-${currentOpp}` : `${currentMe}-${currentOpp + 1}`;
                    })(),
                    is_my_point: isMyPoint,
                    point_type: categoryName,
                    video_timestamp: timestamp,
                    created_at: finalCreatedAt
                }])
                .select()
                .single();

            if (insErr) throw insErr;
            if (data) {
                const finalLogs = await syncAndRecalculateAll([...logs, data]);
                if (finalLogs) setLastAddedId(data.id);
                // 점수 기록 후 영상 자동 재생
                if (player) {
                    player.playVideo();
                }
            }
            setPendingInsert(null);
        } catch (err: any) {
            alert('중간 삽입 중 오류 발생: ' + err.message);
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('이 랠리 기록을 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('bd_point_logs').delete().eq('id', logId);
            if (error) throw error;
            await syncAndRecalculateAll(undefined, [logId]);
        } catch (err: any) {
            alert('삭제 중 오류 발생: ' + err.message);
        }
    };

    const handleDeleteBulk = async (logIds: string[]) => {
        if (logIds.length === 0) return;
        if (!confirm(`${logIds.length}개의 항목을 삭제하시겠습니까?`)) return;
        try {
            const { error } = await supabase.from('bd_point_logs').delete().in('id', logIds);
            if (error) throw error;
            await syncAndRecalculateAll(undefined, logIds);
        } catch (err: any) {
            alert('일괄 삭제 중 오류 발생: ' + err.message);
        }
    };
    const handleUpdateLogType = async (logId: string, newType: string, isMyPoint: boolean) => {
        try {
            const { data, error } = await supabase
                .from('bd_point_logs')
                .update({ point_type: newType, is_my_point: isMyPoint })
                .eq('id', logId)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                const updatedLogs = logs.map(l => l.id === logId ? data : l);
                await syncAndRecalculateAll(updatedLogs);
            }
        } catch (err: any) {
            alert('기록 수정 중 오류 발생: ' + err.message);
        }
    };

    const handleSyncLog = async (logId: string) => {
        if (!player) return;
        const timestamp = Math.floor(player.getCurrentTime());
        try {
            const { data, error } = await supabase
                .from('bd_point_logs')
                .update({ video_timestamp: timestamp })
                .eq('id', logId)
                .select()
                .single();
            if (error) throw error;
            if (data) {
                const updatedLogs = logs.map(l => l.id === logId ? data : l);
                await syncAndRecalculateAll(updatedLogs);
            }
        } catch (err: any) {
            alert('시간 동기화 중 오류 발생: ' + err.message);
        }
    };

    const handleResetSet = async () => {
        if (!confirm(`현재 ${currentSet}세트의 모든 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
        try {
            setIsSyncing(true);
            const idsToRemove = currentSetLogs.map(l => l.id);
            const { error } = await supabase
                .from('bd_point_logs')
                .delete()
                .eq('match_id', matchId)
                .eq('set_number', currentSet);

            if (error) throw error;
            await syncAndRecalculateAll(undefined, idsToRemove);
            alert(`${currentSet}세트 기록이 초기화되었습니다.`);
        } catch (err: any) {
            alert('초기화 중 오류 발생: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);

    // Calculate current set score for QuickRecorder
    const lastLogForSet = currentSetLogs[currentSetLogs.length - 1];
    const [scoreMe, scoreOpp] = lastLogForSet
        ? lastLogForSet.current_score.split('-').map(Number)
        : [0, 0];

    const momentumData: MomentumData[] = currentSetLogs.map((log, index) => {
        const [me, opp] = log.current_score.split('-').map(Number);
        return {
            rallyIndex: index + 1,
            scoreGap: me - opp,
            score: log.current_score,
            isMyPoint: log.is_my_point,
            pointType: log.point_type
        };
    });

    // Only show full-page loading for the VERY FIRST load
    if (loading && logs.length === 0) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-bold text-sm text-slate-900">최적화된 점수 데이터를 불러오는 중...</p>
            </div>
        );
    }


    if (!match) return null;

    return (
        <>
            {/* ── MOBILE LAYOUT (hidden on md+) ── */}
            <div className="md:hidden">
                <MobileScorePanel
                    match={match}
                    logs={logs}
                    categories={categories}
                    matchId={matchId!}
                    currentSet={currentSet}
                    onSetChange={handleSetChange}
                    onLogAdded={handleAddLog as any}
                    onLogsAdded={handleBulkAddLogs}
                    player={player}
                    onPlayerReady={setPlayer}
                    onShowStats={() => setIsMobileStatsOpen(true)}
                />

                {/* Mobile Statistics Overlay */}
                {isMobileStatsOpen && (
                    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-safe">
                        <div className="max-w-md mx-auto min-h-full bg-white dark:bg-slate-900 shadow-2xl p-4">
                            <TacticalDashboard
                                logs={logs}
                                categories={categories}
                                selectedSet={selectedAnalysisSet}
                                onSetChange={setSelectedAnalysisSet}
                                onClose={() => setIsMobileStatsOpen(false)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ── DESKTOP LAYOUT (hidden on mobile) ── */}
            <div className="hidden md:block">
                <div className="space-y-8 max-w-[1920px] mx-auto px-4 bg-slate-50/30 pb-20">
                    {/* 1. Recording Section (Flexible Height) */}
                    <div className="min-h-[calc(100vh-2.5rem)] flex flex-col gap-4 py-4 shrink-0">
                        {/* Minimal Header - Restructured to include Match Info */}
                        <div className="flex items-center justify-between shrink-0 h-10 px-2">
                            <div className="flex items-center gap-4 flex-1">
                                <Link
                                    href={`/tournaments/detail?id=${match.tournament_id}`}
                                    className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Link>
                                <div className="flex items-center gap-4">
                                    <h1 className="text-base font-black text-slate-900 truncate max-w-[200px] lg:max-w-none">
                                        {match.tournament?.name}
                                        <span className="text-[10px] font-bold text-slate-400 ml-2 whitespace-nowrap">· {match.match_date}</span>
                                    </h1>
                                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
                                    {/* Match Info Moved Here */}
                                    <div className="flex items-center gap-4">
                                        <p className="text-xl font-black text-slate-900 whitespace-nowrap">
                                            나 vs {match.opponent_1?.name}
                                        </p>
                                        <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-sm font-black tracking-tighter shadow-lg">
                                            {match.my_set_score} : {match.opponent_set_score}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 invisible lg:visible">
                                {/* Hidden button space to maintain layout if needed, or just remove */}
                            </div>
                        </div>

                        {/* Main Content Grid - Restructured for vertical alignment */}
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-12">
                            {/* TOP ROW: Video & Scoreboard (Fixed ratio + maximized height) */}
                            <div className="xl:col-span-8 flex flex-col bg-black rounded-3xl overflow-hidden shadow-2xl shrink-0 h-[58vh] min-h-[450px] max-h-[650px]">
                                {(() => {
                                    let currentVideoId = match.youtube_video_id;
                                    if (currentSet === 2 && match.youtube_video_id_2) currentVideoId = match.youtube_video_id_2;
                                    if (currentSet === 3 && match.youtube_video_id_3) currentVideoId = match.youtube_video_id_3;

                                    if (currentVideoId) {
                                        return <YoutubePlayer key={currentVideoId} videoId={currentVideoId} onPlayerReady={setPlayer} />;
                                    }
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                                            <Trophy className="w-12 h-12 opacity-20" />
                                            <p className="font-black text-sm uppercase tracking-widest">No Video Registered</p>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="xl:col-span-4 flex flex-col min-h-0 shrink-0 h-[58vh] min-h-[450px] max-h-[650px]">
                                <div className="bg-slate-950 rounded-[32px] border border-white/10 shadow-2xl flex flex-col h-full overflow-hidden relative">
                                    {/* Grid Pattern Background */}
                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                        style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                                    <div className="px-4 py-2 border-b border-white/5 bg-slate-900/50 shrink-0 relative z-10 flex items-center justify-between">
                                        <div className="flex gap-2 flex-1">
                                            {[1, 2, 3].map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => handleSetChange(s)}
                                                    className={cn(
                                                        "flex-1 flex flex-col items-center justify-center py-1 transition-all gap-0 rounded-xl border",
                                                        currentSet === s
                                                            ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] z-10"
                                                            : "text-slate-500 border-white/5 bg-slate-950 hover:bg-slate-900 hover:text-slate-300"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase tracking-widest leading-none mb-0.5",
                                                        currentSet === s ? "text-slate-900/60" : "text-slate-600"
                                                    )}>
                                                        {s}SET
                                                    </span>
                                                    <span className="text-xl font-black tabular-nums tracking-tighter leading-none">
                                                        {(() => {
                                                            const setLogs = logs.filter(l => (l.set_number || 1) === s);
                                                            const lastLog = setLogs[setLogs.length - 1];
                                                            return lastLog ? lastLog.current_score : '0-0';
                                                        })()}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Relocated Reset Button */}
                                        <button
                                            onClick={handleResetSet}
                                            className="ml-3 p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20 active:scale-95 group shadow-lg"
                                            title="현재 세트 초기화"
                                        >
                                            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden p-2">
                                        <RallyTimeline
                                            logs={currentSetLogs}
                                            currentSet={currentSet}
                                            categories={categories}
                                            onSetChange={handleSetChange}
                                            onRallyClick={handleRallyClick}
                                            onDelete={handleDeleteLog}
                                            onDeleteBulk={handleDeleteBulk}
                                            onUpdateType={handleUpdateLogType}
                                            onSync={handleSyncLog}
                                            onInsert={handleInsertLog}
                                            onResetSet={handleResetSet}
                                            activeTime={activeTime}
                                            lastAddedId={lastAddedId}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM ROW: Logger & Quick Analytics (5:5 Split) */}
                            <div className="xl:col-span-6 flex flex-col mt-1">
                                <DataEntryLogger
                                    player={player}
                                    matchId={match.id}
                                    match={match}
                                    categories={categories}
                                    onCategoryChange={fetchCategories}
                                    onLogAdded={handleAddLog}
                                    currentSet={currentSet}
                                    onSetChange={handleSetChange}
                                    onLogsAdded={handleBulkAddLogs}
                                    logs={currentSetLogs}
                                />
                            </div>

                            <div className="xl:col-span-6 flex flex-col mt-1">
                                <MomentumChart data={momentumData} />
                            </div>
                        </div>

                        {/* Bottom Anchor Button */}
                        <div className="shrink-0 pt-2">
                            <button
                                onClick={() => {
                                    const el = document.getElementById('analytics-section');
                                    el?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-500 transition-colors uppercase tracking-[0.3em]"
                            >
                                View Analytics Dashboard <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* 2. Analytics Dashboard Section */}
                    <div id="analytics-section" className="pt-12 border-t-2 border-slate-200 dark:border-slate-800 space-y-12">
                        <TacticalDashboard
                            logs={logs}
                            categories={categories}
                            selectedSet={selectedAnalysisSet}
                            onSetChange={setSelectedAnalysisSet}
                        />
                    </div>

                    <CategorySelectModal
                        isOpen={!!pendingInsert}
                        isMyPoint={pendingInsert?.isMyPoint ?? true}
                        categories={categories}
                        onSelect={handleFinalizeInsert}
                        onClose={() => setPendingInsert(null)}
                    />
                </div>{/* end space-y-8 */}
            </div > {/* end hidden md:block */}
        </>
    );
}

export default function DynamicMatchDetailPage() {
    return (
        <Suspense fallback={
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-bold text-sm text-slate-900">페이지를 준비하고 있습니다...</p>
            </div>
        }>
            <MatchDetailContent />
        </Suspense>
    );
}
