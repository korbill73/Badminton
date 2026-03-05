'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import YoutubePlayer from '@/components/match/YoutubePlayer';
import RallyTimeline from '@/components/match/RallyTimeline';
import MomentumChart from '@/components/analytics/MomentumChart';
import ClutchAnalysis from '@/components/analytics/ClutchAnalysis';
import DataEntryLogger from '@/components/match/DataEntryLogger';
import TacticalDashboard from '@/components/analytics/TacticalDashboard';
import { BDMatch, BDPointLog, MomentumData } from '@/types';
import { ChevronLeft, Share2, Download, Loader2, Trophy, Layout, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function MatchDetailContent() {
    const searchParams = useSearchParams();
    const matchId = searchParams.get('id');
    const [match, setMatch] = useState<BDMatch | null>(null);
    const [logs, setLogs] = useState<BDPointLog[]>([]);
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    // Unified Set State
    const [currentSet, setCurrentSet] = useState<number>(1);

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
                .order('video_timestamp', { ascending: true })
                .order('created_at', { ascending: true });

            if (lErr) throw lErr;
            setLogs(lData || []);
        } catch (err: any) {
            console.error('Error fetching match data:', err.message);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        if (matchId) {
            fetchMatchData();
        }
    }, [matchId]);

    const syncAndRecalculateAll = async () => {
        if (!matchId) return;
        setIsSyncing(true);
        try {
            const { data: fresh, error } = await supabase
                .from('bd_point_logs')
                .select('*')
                .eq('match_id', matchId);

            if (error) throw error;
            if (!fresh || fresh.length === 0) {
                setLogs([]);
                return;
            }

            const sorted = [...fresh].sort((a, b) => {
                const timeA = a.video_timestamp ?? 0;
                const timeB = b.video_timestamp ?? 0;
                if (timeA !== timeB) return timeA - timeB;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            const running = {
                1: { me: 0, opp: 0 },
                2: { me: 0, opp: 0 },
                3: { me: 0, opp: 0 }
            };

            const updates = sorted.map(log => {
                const s = (log.set_number || 1) as 1 | 2 | 3;
                if (log.is_my_point) running[s].me++;
                else running[s].opp++;

                const newScore = `${running[s].me}-${running[s].opp}`;

                return {
                    id: log.id,
                    match_id: matchId,
                    set_number: s,
                    current_score: newScore,
                    is_my_point: log.is_my_point,
                    point_type: log.point_type,
                    video_timestamp: log.video_timestamp
                };
            });

            if (updates.length > 0) {
                const { error: upErr } = await supabase
                    .from('bd_point_logs')
                    .upsert(updates, { onConflict: 'id' });
                if (upErr) throw upErr;
            }

            await fetchMatchData(false);
        } catch (err: any) {
            console.error('Ironclad Recalculation failed:', err);
            alert(`점수 정산 중 오류 발생: ${err.message}`);
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

    const handleAddLog = async () => {
        await syncAndRecalculateAll();
    };

    const handleInsertLog = async (targetSet: number, insertTime: number) => {
        if (!matchId) return;
        try {
            const { error: insErr } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: targetSet,
                    current_score: '0-0',
                    is_my_point: true,
                    point_type: 'smash_winner',
                    video_timestamp: insertTime
                }]);

            if (insErr) throw insErr;
            await syncAndRecalculateAll();
        } catch (err: any) {
            alert('중간 삽입 중 오류 발생: ' + err.message);
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('이 랠리 기록을 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('bd_point_logs').delete().eq('id', logId);
            if (error) throw error;
            await syncAndRecalculateAll();
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
            await syncAndRecalculateAll();
        } catch (err: any) {
            alert('일괄 삭제 중 오류 발생: ' + err.message);
        }
    };

    const handleUpdateLogType = async (logId: string, newType: string, isMyPoint: boolean) => {
        try {
            const { error } = await supabase
                .from('bd_point_logs')
                .update({ point_type: newType, is_my_point: isMyPoint })
                .eq('id', logId);
            if (error) throw error;
            await syncAndRecalculateAll();
        } catch (err: any) {
            alert('기록 수정 중 오류 발생: ' + err.message);
        }
    };

    const handleSyncLog = async (logId: string) => {
        if (!player) return;
        const timestamp = Math.floor(player.getCurrentTime());
        try {
            const { error } = await supabase.from('bd_point_logs').update({ video_timestamp: timestamp }).eq('id', logId);
            if (error) throw error;
            await syncAndRecalculateAll();
        } catch (err: any) {
            alert('시간 동기화 중 오류 발생: ' + err.message);
        }
    };

    const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);

    const momentumData: MomentumData[] = currentSetLogs.map((log, index) => {
        const [me, opp] = log.current_score.split('-').map(Number);
        return {
            rallyIndex: index + 1,
            scoreGap: me - opp,
            score: log.current_score,
            isMyPoint: log.is_my_point
        };
    });

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-bold text-sm text-slate-900">최적화된 점수 데이터를 불러오는 중...</p>
            </div>
        );
    }

    if (!match) return null;

    return (
        <div className="space-y-6 max-w-[1920px] mx-auto px-4 bg-slate-50/30">
            <div className="flex items-center justify-between">
                <Link
                    href={`/tournaments/detail?id=${match.tournament_id}`}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-sm font-black tracking-tight">대회 목록으로 돌아가기</span>
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={() => syncAndRecalculateAll()}
                        disabled={isSyncing}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">점수 재정산</span>
                    </button>
                    <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-50">
                        <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-50">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                {match.category} Match
                            </span>
                            <span className="text-xs font-black text-slate-400 tracking-tight">
                                {match.match_date} · {match.tournament?.name}
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-5">
                            나{match.category === 'doubles' && <span className="text-xl text-slate-400 font-bold">({match.partner?.name})</span>}
                            <span className="text-slate-200 font-normal italic text-2xl px-2">vs</span>
                            {match.opponent_1?.name} {match.opponent_2 && <span className="text-xl text-slate-400 font-bold">({match.opponent_2?.name})</span>}
                        </h1>
                    </div>
                    <div className="flex items-center gap-12 bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-inner">
                        <div className="text-center px-4">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Final Sets</p>
                            <div className="text-5xl font-black text-blue-600 tabular-nums tracking-tighter">
                                {match.my_set_score} : {match.opponent_set_score}
                            </div>
                        </div>
                        <div className={cn(
                            "px-8 py-4 rounded-2xl font-black text-sm italic shadow-xl tracking-widest",
                            match.match_result === 'win'
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-500 text-white"
                        )}>
                            {match.match_result === 'win' ? 'WINNER' : 'DEFEAT'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-9 space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-2 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden">
                        {match.youtube_video_id ? (
                            <YoutubePlayer videoId={match.youtube_video_id} onPlayerReady={setPlayer} />
                        ) : (
                            <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center gap-6 text-slate-300">
                                <Trophy className="w-16 h-16 opacity-10" />
                                <p className="font-black text-lg">등록된 영상이 없습니다.</p>
                            </div>
                        )}
                    </div>

                    <DataEntryLogger
                        player={player}
                        matchId={match.id}
                        onLogAdded={handleAddLog}
                        currentSet={currentSet}
                        onSetChange={setCurrentSet}
                        initialScoreMe={(() => {
                            const lastLog = currentSetLogs[currentSetLogs.length - 1];
                            if (!lastLog) return 0;
                            const [me] = lastLog.current_score.split('-').map(Number);
                            return isNaN(me) ? 0 : me;
                        })()}
                        initialScoreOpp={(() => {
                            const lastLog = currentSetLogs[currentSetLogs.length - 1];
                            if (!lastLog) return 0;
                            const [, opp] = lastLog.current_score.split('-').map(Number);
                            return isNaN(opp) ? 0 : opp;
                        })()}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <MomentumChart data={momentumData} />
                        <ClutchAnalysis logs={currentSetLogs} />
                    </div>
                </div>

                <div className="xl:col-span-3 h-full">
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-100px)] sticky top-6">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-xs font-black italic text-slate-800 dark:text-slate-200 uppercase tracking-[0.2em] px-1">점수표 (SCOREBOARD)</h3>
                                <Layout className="w-5 h-5 text-slate-400" />
                            </div>

                            <div className="grid grid-cols-3 gap-2 pb-2">
                                {[1, 2, 3].map(s => {
                                    const filtered = logs.filter(l => (l.set_number || 1) === s);
                                    const setScore = filtered.length > 0 ? filtered[filtered.length - 1].current_score : '0-0';
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => setCurrentSet(s)}
                                            className={cn(
                                                "flex-1 flex flex-col items-center min-w-[80px] py-3 px-2 rounded-2xl transition-all border-2",
                                                currentSet === s
                                                    ? "bg-blue-600 border-blue-600 text-white shadow-xl scale-105"
                                                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black"
                                            )}
                                        >
                                            <span className="text-[10px] font-black uppercase mb-0.5">{s}SET</span>
                                            <span className="text-[13px] font-black tabular-nums">{setScore}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <RallyTimeline
                                logs={currentSetLogs}
                                currentSet={currentSet}
                                onSetChange={setCurrentSet}
                                onRallyClick={handleRallyClick}
                                onDelete={handleDeleteLog}
                                onDeleteBulk={handleDeleteBulk}
                                onUpdateType={handleUpdateLogType}
                                onSync={handleSyncLog}
                                onInsert={handleInsertLog}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-12 border-t border-slate-100 dark:border-slate-800">
                <TacticalDashboard logs={currentSetLogs} />
            </div>
        </div>
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
