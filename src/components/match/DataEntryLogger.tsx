'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Plus,
    Loader2,
    Settings2,
    Trash2,
    Save,
    SquarePen,
    Target,
    Zap,
    AlertCircle,
    X,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BDPointLog } from '@/types';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

type CategoryType = 'winner' | 'loss';
type CategoryGroup = 'offensive' | 'tactical' | 'error' | 'others';

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
    is_default: boolean;
    display_order?: number;
}

interface DataEntryLoggerProps {
    player: any;
    matchId: string;
    onLogAdded: (log: any) => void;
    onLogsAdded?: (logs: any[]) => Promise<void>;
    currentSet: number;
    onSetChange: (set: number) => void;
    categories: Category[];
    logs: BDPointLog[];
    onCategoryChange?: () => void;
    match?: any;
}

export default function DataEntryLogger({
    player,
    matchId,
    onLogAdded,
    currentSet,
    categories,
    logs,
    onCategoryChange,
}: DataEntryLoggerProps) {
    const [submitting, setSubmitting] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);
    const [customType, setCustomType] = useState<string>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [customTarget, setCustomTarget] = useState<{ type: CategoryType; group: CategoryGroup } | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [localOrder, setLocalOrder] = useState<string[]>([]);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    // Initialize/Update local order when categories change
    useEffect(() => {
        if (categories.length > 0) {
            setLocalOrder(categories.map(c => c.id));
        }
    }, [categories]);

    // Keyboard Shortcuts (Stay active even if buttons are hidden)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'w':
                    handleQuickRecord(true);
                    break;
                case 's':
                    handleQuickRecord(false);
                    break;
                case ' ':
                    e.preventDefault();
                    if (player) {
                        const state = player.getPlayerState();
                        if (state === 1) player.pauseVideo();
                        else player.playVideo();
                    }
                    break;
                case 'a':
                    if (player) player.seekTo(player.getCurrentTime() - 5);
                    break;
                case 'd':
                    if (player) player.seekTo(player.getCurrentTime() + 5);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player, logs, currentSet]);

    const handleQuickRecord = (isMyPoint: boolean) => {
        if (!player) return;
        handleAddLog(isMyPoint, isMyPoint ? '득점' : '실점');
    };

    const handleAddLog = async (isWinner: boolean, pointType: string) => {
        if (submitting) return;
        setSubmitting(true);

        // 기록 시작 시 영상 일시정지
        if (player) {
            player.pauseVideo();
        }

        try {
            const currentSetLogs = logs.filter(l => (l.set_number || 1) === currentSet);
            const currentMe = currentSetLogs.filter(l => l.is_my_point).length;
            const currentOpp = currentSetLogs.filter(l => !l.is_my_point).length;
            const nextScore = isWinner ? `${currentMe + 1}-${currentOpp}` : `${currentMe}-${currentOpp + 1}`;

            const timestamp = player ? Math.floor(player.getCurrentTime()) : 0;
            const { data, error } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: currentSet,
                    current_score: nextScore,
                    is_my_point: isWinner,
                    point_type: pointType,
                    video_timestamp: timestamp
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onLogAdded(data);
                // 점수 기록 후 영상 자동 재생
                if (player) {
                    player.playVideo();
                }
            }
        } catch (err: any) {
            alert('기록 저장 중 오류: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!customType.trim() || !customTarget) return;
        const { type, group } = customTarget;
        try {
            // Get the max display_order to append at the end
            const maxOrder = categories.length > 0
                ? Math.max(...categories.map(c => (c as any).display_order || 0))
                : 0;

            const { error } = await supabase
                .from('bd_point_categories')
                .insert([{
                    name: customType.trim(),
                    type,
                    category_group: group,
                    is_default: false,
                    display_order: maxOrder + 1
                }]);
            if (error) throw error;
            setCustomType('');
            setShowCustom(false);
            setCustomTarget(null);
            onCategoryChange?.();
        } catch (err: any) {
            alert('카테고리 생성 중 오류: ' + err.message);
        }
    };

    const handleSaveOrder = async () => {
        if (localOrder.length === 0) return;
        setSubmitting(true);
        try {
            // Update display_order for all categories in the current local order
            // Fix: Send full objects to avoid NOT NULL constraint violations on upsert
            const updates = localOrder.map((id, index) => {
                const original = categories.find(c => c.id === id);
                if (!original) return null;
                return {
                    ...original,
                    display_order: index
                };
            }).filter((u): u is any => u !== null);

            if (updates.length === 0) return;

            const { error } = await supabase
                .from('bd_point_categories')
                .upsert(updates, { onConflict: 'id' });

            if (error) throw error;
            onCategoryChange?.();
        } catch (err: any) {
            console.error('순서 저장 실패:', err);
            const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : '알 수 없는 오류');
            alert(`순서 저장 중 오류가 발생했습니다: ${errorMessage}\n\n상세 내용: ${err.details || '없음'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        if (!editName.trim()) return;
        try {
            const { error } = await supabase
                .from('bd_point_categories')
                .update({ name: editName.trim() })
                .eq('id', id);
            if (error) throw error;
            setEditingId(null);
            onCategoryChange?.();
        } catch (err: any) {
            alert('카테고리 수정 중 오류: ' + err.message);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('이 카테고리를 삭제하시겠습니까? 관련 데이터가 영향을 받을 수 있습니다.')) return;
        try {
            const { error } = await supabase
                .from('bd_point_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            onCategoryChange?.();
        } catch (err: any) {
            alert('카테고리 삭제 중 오류: ' + err.message);
        }
    };

    const renderCategoryHeader = (title: string, icon: React.ReactNode, type: CategoryType, group: CategoryGroup, subTitle?: string) => {
        // Fix: for 'loss' type, show add input if ANY loss group is being added
        const isAddingThis = showCustom && customTarget?.type === type && (type === 'winner' ? customTarget?.group === group : true);

        return (
            <div className="flex items-center justify-between px-1 mb-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                    {icon}
                    <span className={cn(
                        "text-[11px] font-black tracking-tighter uppercase",
                        type === 'winner' ? "text-cyan-400" : "text-rose-400"
                    )}>{title}</span>
                    {subTitle && (
                        <span className="text-[8px] font-bold text-slate-500/60 uppercase tracking-widest ml-1">{subTitle}</span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {isAddingThis ? (
                        <div className="flex items-center gap-1 bg-slate-800 px-1 py-0.5 rounded border border-cyan-500/50 animate-in slide-in-from-right-2 duration-200">
                            <input
                                type="text"
                                placeholder={`${title} 추가...`}
                                value={customType}
                                onChange={(e) => setCustomType(e.target.value)}
                                className="w-[80px] px-1 py-0 text-[10px] font-bold border-none focus:ring-0 bg-transparent text-white placeholder:text-slate-600"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateCategory();
                                    if (e.key === 'Escape') { setShowCustom(false); setCustomTarget(null); }
                                }}
                            />
                            <button onClick={() => handleCreateCategory()} className="p-0.5 text-cyan-400 hover:text-cyan-300">
                                <Save className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setShowCustom(false); setCustomTarget(null); }} className="p-0.5 text-slate-500">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : type === 'loss' ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setShowCustom(true); setCustomTarget({ type: 'loss', group: 'error' }); setCustomType(''); }}
                                className="px-1.5 py-1 rounded bg-rose-500/10 text-rose-500/60 hover:text-rose-400 text-[9px] font-black border border-rose-500/20 flex items-center gap-1 group/add underline-offset-2 hover:underline"
                            >
                                <Plus className="w-2.5 h-2.5" /> 범실
                            </button>
                            <button
                                onClick={() => { setShowCustom(true); setCustomTarget({ type: 'loss', group: 'others' }); setCustomType(''); }}
                                className="px-1.5 py-1 rounded bg-amber-500/10 text-amber-500/60 hover:text-amber-400 text-[9px] font-black border border-amber-500/20 flex items-center gap-1 group/add underline-offset-2 hover:underline"
                            >
                                <Plus className="w-2.5 h-2.5" /> 공격
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setShowCustom(true); setCustomTarget({ type, group }); setCustomType(''); }}
                            className={cn(
                                "p-1 rounded hover:bg-white/5 transition-colors group/add",
                                type === 'winner' ? "text-cyan-500/50 hover:text-cyan-400" : "text-rose-500/50 hover:text-rose-400"
                            )}
                        >
                            <Plus className="w-3.5 h-3.5 group-hover/add:rotate-90 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const handleDragStart = (id: string, e: React.DragEvent) => {
        if (!isManageMode && !isManageModalOpen) return;
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';

        // Slight delay to allow ghost image creation
        setTimeout(() => {
            const el = e.target as HTMLElement;
            if (el) el.style.opacity = '0.4';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedId(null);
        const el = e.target as HTMLElement;
        if (el) el.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        if ((!isManageMode && !isManageModalOpen) || draggedId === id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (id: string, e: React.DragEvent) => {
        e.preventDefault();
        if ((!isManageMode && !isManageModalOpen) || !draggedId || draggedId === id) return;

        const newOrder = [...localOrder];
        const draggedIdx = newOrder.indexOf(draggedId);
        const targetIdx = newOrder.indexOf(id);

        if (draggedIdx === -1 || targetIdx === -1) return;

        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);

        setLocalOrder(newOrder);
        setDraggedId(null);
    };

    const renderCategoryButton = (cat: Category, isInsideModal: boolean = false) => {
        const isWinner = cat.type === 'winner';
        const isDragging = draggedId === cat.id;

        return (
            <div
                key={cat.id}
                className={cn(
                    "relative group shrink-0",
                    isDragging && "opacity-20 scale-95"
                )}
                draggable={isManageMode || isInsideModal || isManageModalOpen}
                onDragStart={(e) => handleDragStart(cat.id, e)}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(cat.id, e)}
            >
                {editingId === cat.id ? (
                    <div className={cn(
                        "flex flex-col gap-1 bg-slate-900 p-1 rounded-lg border h-8 justify-center animate-in zoom-in-95 min-w-[80px]",
                        isWinner ? "border-cyan-500" : (cat.category_group === 'error' ? "border-rose-500" : "border-amber-500")
                    )}>
                        <div className="flex items-center gap-1 bg-slate-800/50 px-1 py-0.5 rounded border border-slate-700">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-1 py-0 text-[10px] font-bold border-none focus:ring-0 bg-transparent text-white"
                                autoFocus
                            />
                            <button onClick={() => handleUpdateCategory(cat.id)} className="p-0.5 bg-cyan-500 text-slate-950 rounded transition-all active:scale-95">
                                <Save className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative group hover:scale-[1.02] transition-all duration-200 h-8">
                        <button
                            onClick={() => !isInsideModal && !isManageModalOpen && handleAddLog(isWinner, cat.name)}
                            disabled={submitting || ((isManageMode || isManageModalOpen) && !isInsideModal)}
                            className={cn(
                                "h-full px-3 py-1 rounded-lg border transition-all flex items-center justify-center group active:scale-95 shadow-sm font-black text-center w-auto min-w-[50px]",
                                isWinner
                                    ? "bg-slate-900/40 border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400"
                                    : cat.category_group === 'error'
                                        ? "bg-slate-900/40 border-rose-500/20 hover:border-rose-400 hover:bg-rose-500/10 text-rose-400"
                                        : "bg-slate-900/40 border-amber-500/20 hover:border-amber-400 hover:bg-amber-500/10 text-amber-500",
                                (isManageMode || isManageModalOpen) && "cursor-move border-slate-700/80 bg-slate-800/50",
                                isInsideModal && "cursor-move opacity-100"
                            )}
                        >
                            <span className="text-[11px] leading-tight whitespace-nowrap">{cat.name}</span>
                        </button>
                        {(isManageMode || isInsideModal || isManageModalOpen) && (
                            <div className="absolute -top-1 -right-1 flex gap-0.5 animate-in zoom-in duration-200 z-20">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingId(cat.id); setEditName(cat.name); }}
                                    className="w-5 h-5 bg-slate-800 text-cyan-400 rounded flex items-center justify-center border border-slate-700 shadow-xl hover:bg-cyan-500 hover:text-slate-950"
                                >
                                    <SquarePen className="w-2.5 h-2.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                                    className="w-5 h-5 bg-slate-800 text-rose-500 rounded flex items-center justify-center border border-slate-700 shadow-xl hover:bg-rose-500 hover:text-white"
                                >
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 rounded-[24px] border border-white/10 p-2 shadow-2xl overflow-hidden relative group/logger">
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />

            <div className="flex-1 flex flex-col min-h-0 relative z-10 bg-slate-900/30 rounded-xl border border-white/5 p-2.5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <Target className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <span className="text-[13px] font-black text-white tracking-tight">수동 고속 분석</span>
                    </div>
                    <button
                        onClick={() => { setIsManageModalOpen(true); setEditingId(null); }}
                        className={cn(
                            "w-7 h-7 rounded flex items-center justify-center transition-all bg-slate-900 border border-white/10 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400",
                            isManageModalOpen && "bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(0,242,255,0.4)]"
                        )}
                        title="카테고리 설정"
                    >
                        <Settings2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Detailed Categories */}
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                    {/* Winner Section */}
                    <div className="flex flex-col">
                        {renderCategoryHeader('득점 사유', <Zap className="w-3 h-3 text-cyan-400" />, 'winner', 'others')}
                        <div className="flex flex-wrap gap-1.5 p-1">
                            {categories.filter(c => c.type === 'winner')
                                .sort((a, b) => localOrder.indexOf(a.id) - localOrder.indexOf(b.id))
                                .map(c => renderCategoryButton(c, false))}
                        </div>
                    </div>

                    <div className="h-px bg-white/5 mx-1" />

                    {/* Loss Section - Integrated */}
                    <div className="flex flex-col">
                        {renderCategoryHeader('실점 사유', <AlertCircle className="w-3 h-3 text-rose-500" />, 'loss', 'error')}
                        <div className="flex flex-wrap gap-1.5 p-1">
                            {categories.filter(c => c.type === 'loss')
                                .sort((a, b) => {
                                    const idxA = localOrder.indexOf(a.id);
                                    const idxB = localOrder.indexOf(b.id);
                                    if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;

                                    if (a.category_group !== 'error' && b.category_group === 'error') return -1;
                                    if (a.category_group === 'error' && b.category_group !== 'error') return 1;
                                    return 0;
                                })
                                .map(c => renderCategoryButton(c, false))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Management Modal */}
            {isManageModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                                    <Settings2 className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">카테고리 관리 설정</h2>
                                    <p className="text-xs text-slate-400 font-medium">버튼을 드래그하여 순서를 바꾸거나 명칭을 수정할 수 있습니다.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsManageModalOpen(false); setEditingId(null); }}
                                className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {/* Winner Section */}
                            <section>
                                {renderCategoryHeader('득점 사유', <Zap className="w-4 h-4 text-cyan-400" />, 'winner', 'others')}
                                <div className="flex flex-wrap gap-2 p-4 min-h-[80px] bg-slate-800/20 rounded-2xl border border-white/5 shadow-inner">
                                    {categories.filter(c => c.type === 'winner')
                                        .sort((a, b) => localOrder.indexOf(a.id) - localOrder.indexOf(b.id))
                                        .map(c => renderCategoryButton(c, true))}
                                </div>
                            </section>

                            <div className="h-px bg-white/5" />

                            {/* Loss Section */}
                            <section>
                                {renderCategoryHeader('실점 사유 (공격 & 범실)', <AlertCircle className="w-4 h-4 text-rose-400" />, 'loss', 'error')}
                                <div className="flex flex-wrap gap-2 p-4 min-h-[80px] bg-slate-800/20 rounded-2xl border border-white/5 shadow-inner">
                                    {categories.filter(c => c.type === 'loss')
                                        .sort((a, b) => {
                                            const idxA = localOrder.indexOf(a.id);
                                            const idxB = localOrder.indexOf(b.id);
                                            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) return idxA - idxB;

                                            if (a.category_group !== 'error' && b.category_group === 'error') return -1;
                                            if (a.category_group === 'error' && b.category_group !== 'error') return 1;
                                            return 0;
                                        })
                                        .map(c => renderCategoryButton(c, true))}
                                </div>
                                <p className="mt-3 text-[10px] text-slate-500 font-bold px-2 italic">
                                    * 실점 사유는 기본적으로 상대 공격(오렌지)이 범실(레드)보다 먼저 나오도록 설정되어 있습니다.
                                </p>
                            </section>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-800/20 flex justify-end">
                            <button
                                onClick={async () => {
                                    await handleSaveOrder();
                                    setIsManageModalOpen(false);
                                }}
                                className="px-8 py-3 bg-cyan-500 text-slate-950 font-black rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 flex items-center gap-2"
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                세팅 완료 및 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {submitting && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[110]">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                </div>
            )}
        </div>
    );
}
