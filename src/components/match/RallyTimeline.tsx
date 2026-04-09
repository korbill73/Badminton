'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayCircle, ChevronDown, CheckSquare, Square, Trash, PlusCircle, Check, Clock, SquarePen, X, Zap, AlertCircle, Info } from 'lucide-react';

import { BDPointLog } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface RallyTimelineProps {
    logs: BDPointLog[];
    currentSet: number;
    onSetChange: (set: number) => void;
    onRallyClick?: (timestamp: number) => void;
    onDelete?: (logId: string) => void;
    onDeleteBulk?: (logIds: string[]) => void;
    onSync?: (logId: string) => void;
    onInsert?: (setNumber: number, timestamp: number, isMyPoint: boolean, pivotCreatedAt?: string) => void;
    onResetSet?: () => void;
    onEditClick?: (log: BDPointLog) => void;
    categories: Category[];
    activeTime?: number;
    lastAddedId?: string | null;
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
}

export default function RallyTimeline({
    logs,
    currentSet,
    onSetChange, // Add missing prop
    onRallyClick,
    onDelete,
    onDeleteBulk,
    onSync,
    onInsert,
    onResetSet,
    onEditClick,
    categories,
    activeTime = 0,
    lastAddedId = null
}: RallyTimelineProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    function formatTimestamp(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const getLabel = (log: BDPointLog) => {
        if (log.reason && log.situation) {
            return (
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-1.5 py-0.5 text-[9px] font-black uppercase rounded",
                        log.is_my_point ? "bg-cyan-500/20 text-cyan-400" : "bg-rose-500/20 text-rose-400"
                    )}>
                        {log.reason}
                    </span>
                    <span className="text-slate-400 font-bold text-[11px]">{log.situation}</span>
                    <span className="text-slate-500 text-[10px] mx-0.5">▶</span>
                    <span className={cn("text-[13px] font-black", log.is_my_point ? "text-white" : "text-slate-200")}>{log.point_type as string}</span>
                </div>
            );
        }
        
        // Legacy Support
        let legacyName = log.point_type as string;
        const cat = categories?.find(c => c.name === legacyName);
        if (cat) legacyName = cat.name;

        return (
            <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-slate-500/20 text-slate-400">Legacy</span>
                <span className={cn("text-[13px] font-black", log.is_my_point ? "text-white" : "text-slate-200")}>{legacyName}</span>
            </div>
        );
    };

    // Find Active Rally Index based on video time
    const activeIndex = useMemo(() => {
        if (!activeTime || logs.length === 0) return -1;

        let found = -1;
        for (let i = 0; i < logs.length; i++) {
            if ((logs[i].video_timestamp ?? 0) <= activeTime) {
                found = i;
            } else {
                break;
            }
        }
        return found;
    }, [logs, activeTime]);

    // Combined Auto-scroll logic
    useEffect(() => {
        const container = document.getElementById('rally-timeline-scroll-container');
        if (!container) return;

        // 1. Priority: Scroll to newly added log
        if (lastAddedId) {
            const el = document.getElementById(`rally-log-${lastAddedId}`);
            if (el) {
                // Use a small timeout to ensure DOM is fully painted
                const timeoutId = setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
                return () => clearTimeout(timeoutId);
            }
            return;
        }

        // 2. Secondary: Scroll to active index (video sync)
        if (activeIndex >= 0 && logs[activeIndex]) {
            const el = document.getElementById(`rally-log-${logs[activeIndex].id}`);
            if (el) {
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();

                // Only scroll if outside the visible area of the container
                if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    }, [activeIndex, logs, lastAddedId]);


    return (
        <div className="flex flex-col h-full space-y-2 relative">
            {/* Header Area Removed - Reset button moved to parent page.tsx */}

            <div id="rally-timeline-scroll-container" className="grid grid-cols-1 gap-y-1.5 overflow-y-auto px-1 custom-scrollbar pb-2">

                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <PlayCircle className="w-12 h-12 opacity-20 mb-4" />
                        <p className="font-bold text-xs uppercase tracking-widest text-slate-500">기록된 랠리가 없습니다.</p>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => onInsert?.(currentSet, 0, true)}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100"
                            >
                                <PlusCircle className="w-3.5 h-3.5" /> 득점 삽입
                            </button>
                            <button
                                onClick={() => onInsert?.(currentSet, 0, false)}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100"
                            >
                                <PlusCircle className="w-3.5 h-3.5" /> 실점 삽입
                            </button>
                        </div>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div key={log.id} className="relative">
                            {/* Improved Inline Insert Point - Above each item */}
                            <div className="absolute -top-1.5 inset-x-0 h-3 z-10 group/insert flex items-center justify-center">
                                <div className="flex items-center gap-1 opacity-0 group-hover/insert:opacity-100 transition-all">
                                    <button
                                        onClick={() => {
                                            const currentTime = log.video_timestamp ?? 0;
                                            const prevTime = index > 0 ? (logs[index - 1].video_timestamp ?? 0) : Math.max(0, currentTime - 5);
                                            const midTime = (prevTime + currentTime) / 2;
                                            onInsert?.(currentSet, midTime, true, log.created_at); // Pass pivot
                                        }}
                                        className="bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-lg hover:scale-110 transition-all text-[8px] font-black border border-white"
                                    >
                                        득점+
                                    </button>
                                    <button
                                        onClick={() => {
                                            const currentTime = log.video_timestamp ?? 0;
                                            const prevTime = index > 0 ? (logs[index - 1].video_timestamp ?? 0) : Math.max(0, currentTime - 5);
                                            const midTime = (prevTime + currentTime) / 2;
                                            onInsert?.(currentSet, midTime, false, log.created_at); // Pass pivot
                                        }}
                                        className="bg-red-600 text-white px-2 py-0.5 rounded-full shadow-lg hover:scale-110 transition-all text-[8px] font-black border border-white"
                                    >
                                        실점+
                                    </button>
                                </div>
                            </div>

                            <div
                                id={`rally-log-${log.id}`}
                                className={cn(
                                    "group relative bg-slate-900 shadow-xl rounded-xl border border-white/5 transition-all h-14 flex items-center px-4 gap-4 hover:border-cyan-500/50 hover:bg-slate-800/80 hover:z-10",
                                    activeIndex === index && (
                                        log.is_my_point
                                            ? "ring-2 ring-cyan-500 bg-cyan-500/10 border-cyan-400 z-10 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
                                            : "ring-2 ring-rose-500 bg-rose-500/10 border-rose-400 z-10 shadow-[0_0_20px_rgba(255,0,127,0.3)]"
                                    ),
                                    lastAddedId === log.id && "ring-4 ring-yellow-400/50 bg-yellow-400/5 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] z-[20] animate-pulse"
                                )}
                            >
                                {/* Score Display - Enlarged */}
                                <div
                                    className="shrink-0 w-20 flex items-center justify-center cursor-pointer bg-slate-950/50 dark:bg-slate-950/50 rounded-lg h-10 border border-white/5"
                                    onClick={(e) => { e.stopPropagation(); log.video_timestamp != null && onRallyClick?.(log.video_timestamp); }}
                                >
                                    <span className={cn(
                                        "text-2xl font-black tabular-nums tracking-tighter whitespace-nowrap drop-shadow-sm",
                                        log.is_my_point ? "text-cyan-400" : "text-rose-500"
                                    )}>
                                        {log.current_score}
                                    </span>
                                    {lastAddedId === log.id && (
                                        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-yellow-400 text-slate-950 text-[8px] font-black rounded-full animate-bounce shadow-lg">
                                            NEW
                                        </div>
                                    )}
                                </div>

                                {/* Type Label - Optimized for 3D Format */}
                                <div className="flex-1 min-w-0 flex items-center gap-1">
                                    <div className="flex-1 truncate">
                                        {getLabel(log)}
                                    </div>
                                    <button
                                        id={`edit-trigger-${log.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditClick?.(log);
                                        }}
                                        className={cn(
                                            "flex items-center justify-center w-6 h-6 rounded-full transition-all hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0",
                                            log.is_my_point ? "text-slate-400" : "text-slate-300"
                                        )}
                                        title="유형 수정"
                                    >
                                        <SquarePen className={cn("w-3.5 h-3.5 opacity-40 shrink-0 transition-transform", editingId === log.id && "scale-110 text-blue-500 opacity-100")} />
                                    </button>

                                    {/* Modal System for Editing Placeholder - Moved Outside Loop */}


                                </div>

                                {/* Timestamp & Sync & Action */}
                                <div className="shrink-0 flex items-center gap-1.5 border-l border-slate-100 dark:border-slate-800 pl-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSync?.(log.id); }}
                                        className="px-2.5 py-1.5 hover:bg-cyan-500 hover:text-slate-950 text-slate-400 bg-slate-950/50 rounded-lg transition-all shadow-sm group/sync flex items-center gap-1 border border-white/5"
                                        title="현재 시간으로 동기화"
                                    >
                                        <Clock className="w-3.5 h-3.5 opacity-0 group-hover/sync:opacity-100 transition-opacity" />
                                        <span className="text-[13px] font-black tabular-nums">
                                            {log.video_timestamp != null ? formatTimestamp(log.video_timestamp) : '0:00'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); (onDelete || onDeleteBulk)?.(onDelete ? log.id : [log.id] as any); }}
                                        className="p-1.5 hover:bg-red-600 hover:text-white text-slate-300 transition-all rounded-md"
                                        title="삭제"
                                    >
                                        <Trash className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}

