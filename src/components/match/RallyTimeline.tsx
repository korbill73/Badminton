'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { PlayCircle, ChevronDown, CheckSquare, Square, Trash, PlusCircle, Check } from 'lucide-react';
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
    onInsert?: (setNumber: number, timestamp: number) => void;
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
    onRallyClick,
    onDeleteBulk,
    onUpdateType,
    onInsert
}: RallyTimelineProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('bd_point_categories')
                .select('*')
                .order('display_order', { ascending: true });
            if (!error && data) {
                setCategories(data);
            }
        };
        fetchCategories();
    }, []);

    const winTypes = categories.filter(c => c.type === 'winner');
    const lossTypes = categories.filter(c => c.type === 'loss');

    const allIds = useMemo(() => logs.map(l => l.id), [logs]);
    const isAllSelected = logs.length > 0 && selectedIds.length === logs.length;

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (isAllSelected) setSelectedIds([]);
        else setSelectedIds(allIds);
    };

    const handleBulkDelete = () => {
        if (onDeleteBulk && selectedIds.length > 0) {
            onDeleteBulk(selectedIds);
            setSelectedIds([]);
        }
    };

    function formatTimestamp(seconds: number) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    const getLabel = (type: string) => {
        const cat = categories.find(c => c.name === type);
        return cat ? cat.name : type;
    };

    return (
        <div className="flex flex-col h-full space-y-2">
            {/* Header with Select All & Bulk Delete */}
            <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 group"
                >
                    <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-all",
                        isAllSelected
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 group-hover:border-blue-500"
                    )}>
                        {isAllSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 transition-colors">전체 선택</span>
                </button>

                {selectedIds.length > 0 && (
                    <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-red-100 hover:scale-105 transition-all"
                    >
                        <Trash className="w-3 h-3" /> {selectedIds.length}개 삭제
                    </button>
                )}
            </div>

            <div className="space-y-0.5">
                {logs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <PlayCircle className="w-12 h-12 opacity-20 mb-4" />
                        <p className="font-bold text-xs uppercase tracking-widest text-slate-500">기록된 랠리가 없습니다.</p>
                        <button
                            onClick={() => onInsert?.(currentSet, 0)}
                            className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100"
                        >
                            <PlusCircle className="w-3.5 h-3.5" /> 첫 번째 랠리 삽입
                        </button>
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <React.Fragment key={log.id}>
                            {/* Improved Inline Insert Point */}
                            <div className="relative h-6 group/insert flex items-center justify-center">
                                {/* Dotted line indicator */}
                                <div className="absolute inset-x-8 h-[1.5px] border-b-2 border-dotted border-slate-100 dark:border-slate-800 group-hover/insert:border-blue-200/50 transition-colors" />
                                <button
                                    onClick={() => {
                                        const currentTime = log.video_timestamp ?? 0;
                                        const prevTime = index > 0 ? (logs[index - 1].video_timestamp ?? 0) : Math.max(0, currentTime - 5);
                                        const midTime = Math.floor((prevTime + currentTime) / 2);
                                        onInsert?.(currentSet, midTime);
                                    }}
                                    className="relative z-10 opacity-0 group-hover/insert:opacity-100 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg hover:scale-110 transition-all flex items-center gap-1.5 border border-blue-500 shadow-blue-100"
                                >
                                    <PlusCircle className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-tight">랠리 삽입</span>
                                </button>
                            </div>

                            <div
                                className={cn(
                                    "group relative bg-white dark:bg-slate-800/50 rounded-2xl border transition-all h-14 flex items-center px-3 gap-3",
                                    selectedIds.includes(log.id)
                                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 shadow-md"
                                        : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                )}
                            >
                                {/* Checkbox */}
                                <button
                                    onClick={() => toggleSelect(log.id)}
                                    className="shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                                >
                                    {selectedIds.includes(log.id) ? (
                                        <CheckSquare className="w-5 h-5 text-blue-500" />
                                    ) : (
                                        <Square className="w-5 h-5" />
                                    )}
                                </button>

                                {/* Score Display */}
                                <div
                                    className="shrink-0 w-20 flex items-center justify-center cursor-pointer"
                                    onClick={() => log.video_timestamp != null && onRallyClick?.(log.video_timestamp)}
                                >
                                    <span className={cn(
                                        "text-xl font-black tabular-nums tracking-tighter whitespace-nowrap",
                                        log.is_my_point ? "text-blue-600" : "text-red-500"
                                    )}>
                                        {log.current_score}
                                    </span>
                                </div>

                                {/* Type Label */}
                                <div className="flex-1 min-w-0 relative">
                                    <button
                                        onClick={() => setEditingId(editingId === log.id ? null : log.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-sm font-black transition-all hover:bg-slate-100 dark:hover:bg-slate-700 truncate",
                                            log.is_my_point ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
                                        )}
                                    >
                                        {getLabel(log.point_type as string)}
                                        <ChevronDown className={cn("w-3.5 h-3.5 opacity-40 transition-transform", editingId === log.id && "rotate-180")} />
                                    </button>

                                    {/* Edit Grid - Mobile Bottom Sheet / Desktop Popover */}
                                    {editingId === log.id && (
                                        <>
                                            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[80] animate-in fade-in duration-300" onClick={() => setEditingId(null)} />
                                            <div className={cn(
                                                "fixed sm:absolute z-[100] bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 animate-in pointer-events-auto",
                                                // Mobile: Bottom Sheet
                                                "bottom-0 left-0 right-0 rounded-t-[32px] p-6 max-h-[80vh] slide-in-from-bottom-10",
                                                // Desktop: Popover
                                                "sm:bottom-auto sm:top-full sm:left-0 sm:right-auto sm:mt-2 sm:w-80 sm:rounded-[28px] sm:p-5 sm:slide-in-from-top-2"
                                            )}>
                                                {/* Mobile Handle */}
                                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />

                                                <div className="flex items-center justify-between mb-4 sm:hidden">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">기술 수정 ({log.current_score})</h4>
                                                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                        <Trash className="w-4 h-4 text-slate-400 rotate-45" /> {/* Close icon substitute */}
                                                    </button>
                                                </div>

                                                <div className="space-y-6 sm:space-y-4 overflow-y-auto custom-scrollbar pr-1">
                                                    <div>
                                                        <p className="text-[10px] sm:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 sm:mb-2 px-1">Winning Point</p>
                                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 sm:gap-1.5">
                                                            {winTypes.map(type => (
                                                                <button
                                                                    key={type.id}
                                                                    onClick={() => {
                                                                        onUpdateType?.(log.id, type.name, true);
                                                                        setEditingId(null);
                                                                    }}
                                                                    className="px-3 py-3 sm:px-2 sm:py-2 text-[12px] sm:text-[11px] font-black rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:text-blue-600 transition-all truncate bg-slate-50 dark:bg-slate-800/50 sm:bg-white sm:dark:bg-slate-800"
                                                                >
                                                                    {type.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="pt-4 sm:pt-2 border-t border-slate-100 dark:border-slate-800">
                                                        <p className="text-[10px] sm:text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 sm:mb-2 px-1">Losing Point</p>
                                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 sm:gap-1.5">
                                                            {lossTypes.map(type => (
                                                                <button
                                                                    key={type.id}
                                                                    onClick={() => {
                                                                        onUpdateType?.(log.id, type.name, false);
                                                                        setEditingId(null);
                                                                    }}
                                                                    className="px-3 py-3 sm:px-2 sm:py-2 text-[12px] sm:text-[11px] font-black rounded-xl border border-slate-100 dark:border-slate-800 hover:border-red-500 hover:text-red-500 transition-all truncate bg-slate-50 dark:bg-slate-800/50 sm:bg-white sm:dark:bg-slate-800"
                                                                >
                                                                    {type.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mobile Spacer */}
                                                <div className="h-6 sm:hidden" />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Timestamp */}
                                <div className="shrink-0 px-2">
                                    <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 tabular-nums">
                                        {log.video_timestamp != null ? formatTimestamp(log.video_timestamp) : '0:00'}
                                    </span>
                                </div>
                            </div>

                            {/* Final Insert Point */}
                            {index === logs.length - 1 && (
                                <div className="relative h-6 group/insert flex items-center justify-center">
                                    <div className="absolute inset-x-8 h-[1.5px] border-b-2 border-dotted border-slate-100 dark:border-slate-800 group-hover/insert:border-blue-200/50 transition-colors" />
                                    <button
                                        onClick={() => {
                                            const currentTime = log.video_timestamp ?? 0;
                                            onInsert?.(currentSet, currentTime + 5);
                                        }}
                                        className="relative z-10 opacity-0 group-hover/insert:opacity-100 bg-blue-600 text-white px-3 py-1 rounded-full shadow-lg hover:scale-110 transition-all flex items-center gap-1.5 border border-blue-500 shadow-blue-100"
                                    >
                                        <PlusCircle className="w-3 h-3" />
                                        <span className="text-[10px] font-black uppercase tracking-tight">랠리 추가</span>
                                    </button>
                                </div>
                            )}
                        </React.Fragment>
                    ))
                )}
            </div>
        </div>
    );
}
