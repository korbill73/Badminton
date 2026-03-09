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
    onUpdateType?: (logId: string, newType: string, isMyPoint: boolean) => void;
    onInsert?: (setNumber: number, timestamp: number, isMyPoint: boolean, pivotCreatedAt?: string) => void;
    onResetSet?: () => void;
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
    onUpdateType,
    onSync,
    onInsert,
    onResetSet,
    categories,
    activeTime = 0,
    lastAddedId = null
}: RallyTimelineProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const editingLog = useMemo(() => logs.find(l => l.id === editingId), [logs, editingId]);


    const winTypes = categories.filter(c => c.type === 'winner');
    const lossTypes = categories.filter(c => c.type === 'loss');

    function formatTimestamp(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const getLabel = (type: string) => {
        const cat = categories.find(c => c.name === type);
        return cat ? cat.name : type;
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

    // Auto-scroll to active index (Internal only, preventing window jump)
    useEffect(() => {
        if (activeIndex >= 0) {
            const container = document.getElementById('rally-timeline-scroll-container');
            const el = document.getElementById(`rally-log-${logs[activeIndex].id}`);
            if (container && el) {
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();

                // Only scroll if outside the visible area of the container
                if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
                    container.scrollTo({
                        top: el.offsetTop - container.offsetTop - 10,
                        behavior: 'smooth'
                    });
                }
            }
        }
    }, [activeIndex, logs]);

    // Auto-scroll to newly added log
    useEffect(() => {
        if (lastAddedId) {
            const container = document.getElementById('rally-timeline-scroll-container');
            const el = document.getElementById(`rally-log-${lastAddedId}`);
            if (container && el) {
                // Scroll the newly added log into the center of the container
                container.scrollTo({
                    top: el.offsetTop - container.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [lastAddedId]);


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

                                {/* Type Label - Optimized for Korean */}
                                <div className="flex-1 min-w-0 flex items-center gap-1">
                                    <span className={cn(
                                        "truncate flex-1 text-[14px] font-black leading-tight tracking-tight",
                                        log.is_my_point ? "text-white" : "text-slate-400"
                                    )}>
                                        {getLabel(log.point_type as string)}
                                    </span>
                                    <button
                                        id={`edit-trigger-${log.id}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setEditingId(editingId === log.id ? null : log.id);
                                            (window as any).lastEditRect = rect;
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

            {/* Modal System for Editing - Placed outside the loop to avoid row hover effects */}
            {editingLog && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/80 animate-in fade-in duration-300 backdrop-blur-sm"
                        onClick={() => setEditingId(null)}
                    />

                    {/* Modal Container */}
                    <div className="relative w-full max-w-2xl bg-slate-900 border border-white/20 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh] z-[3001]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/30">
                            <div>
                                <h2 className={cn(
                                    "text-2xl font-black tracking-tight uppercase",
                                    editingLog.is_my_point ? "text-cyan-400" : "text-rose-500"
                                )}>
                                    기술 기록 수정 ({editingLog.current_score})
                                </h2>
                                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">변경할 상세 기술 카테고리를 선택해 주세요</p>
                            </div>
                            <button
                                onClick={() => setEditingId(null)}
                                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                            {/* Winning Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-cyan-500/10" />
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                        <Zap className="w-3 h-3" /> Winning Point (득점 유형)
                                    </span>
                                    <div className="h-px flex-1 bg-cyan-500/10" />
                                </div>
                                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {winTypes.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => {
                                                onUpdateType?.(editingLog.id, type.name, true);
                                                setEditingId(null);
                                            }}
                                            className={cn(
                                                "h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group active:scale-90 relative overflow-hidden",
                                                editingLog.point_type === type.name
                                                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                                                    : "bg-cyan-500/5 border-cyan-500/20 text-slate-400 hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-400"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-xl mb-1.5 flex items-center justify-center transition-transform group-hover:scale-110",
                                                editingLog.point_type === type.name ? "bg-cyan-500/30" : "bg-cyan-500/10"
                                            )}>
                                                <Zap className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <span className="text-[11px] font-black tracking-tight text-center leading-tight line-clamp-2">{type.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Losing Section Area */}
                            <div className="space-y-6">
                                {/* Subgroup 1: My Technical Error */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-px flex-1 bg-rose-500/20" />
                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                            <AlertCircle className="w-3 h-3" /> 나의 기술적 범실 (나의 실수)
                                        </span>
                                        <div className="h-px flex-1 bg-rose-500/20" />
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {lossTypes
                                            .filter(t => t.category_group === 'error')
                                            .map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => {
                                                        onUpdateType?.(editingLog.id, type.name, false);
                                                        setEditingId(null);
                                                    }}
                                                    className={cn(
                                                        "h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group active:scale-90 relative overflow-hidden",
                                                        editingLog.point_type === type.name
                                                            ? "bg-rose-500/20 border-rose-400 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                                                            : "bg-rose-500/5 border-rose-500/20 text-slate-400 hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-400"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-xl mb-1.5 flex items-center justify-center transition-transform group-hover:scale-110",
                                                        editingLog.point_type === type.name ? "bg-rose-500/30" : "bg-rose-500/10"
                                                    )}>
                                                        <AlertCircle className="w-4 h-4 text-rose-400" />
                                                    </div>
                                                    <span className="text-[11px] font-black tracking-tight text-center leading-tight line-clamp-2">{type.name}</span>
                                                </button>
                                            ))}
                                    </div>
                                </div>

                                {/* Subgroup 2: Opponent Skill */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="h-px flex-1 bg-slate-500/20" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                                            <AlertCircle className="w-3 h-3" /> 수비/전술적 실점 (상대 공격)
                                        </span>
                                        <div className="h-px flex-1 bg-slate-500/20" />
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {lossTypes
                                            .filter(t => t.category_group !== 'error')
                                            .map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => {
                                                        onUpdateType?.(editingLog.id, type.name, false);
                                                        setEditingId(null);
                                                    }}
                                                    className={cn(
                                                        "h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group active:scale-90 relative overflow-hidden",
                                                        editingLog.point_type === type.name
                                                            ? "bg-slate-400/20 border-slate-400 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                                            : "bg-slate-800/20 border-slate-700/50 text-slate-500 hover:border-slate-400 hover:bg-slate-700/40 hover:text-slate-300"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-xl mb-1.5 flex items-center justify-center transition-transform group-hover:scale-110",
                                                        editingLog.point_type === type.name ? "bg-slate-400/30" : "bg-slate-500/10"
                                                    )}>
                                                        <AlertCircle className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    <span className="text-[11px] font-black tracking-tight text-center leading-tight line-clamp-2">{type.name}</span>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-4 bg-slate-950/50 border-t border-white/5 text-center shrink-0">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em]">Integrated Performance Analytics System</span>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

