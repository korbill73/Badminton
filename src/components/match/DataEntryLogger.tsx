'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Clock,
    Plus,
    Minus,
    Loader2,
    Trophy,
    AlertCircle,
    Info,
    Sparkles,
    ChevronRight,
    MousePointer2,
    CheckCircle2,
    Settings2,
    Trash2,
    X,
    Edit2,
    Save
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
    is_default: boolean;
}

function ScoreCounter({ label, score, setScore, color }: {
    label: string,
    score: number,
    setScore: (s: number) => void,
    color: 'blue' | 'red'
}) {
    const activeColor = color === 'blue' ? 'text-blue-600' : 'text-red-600';
    const bgColor = color === 'blue' ? 'hover:bg-blue-50' : 'hover:bg-red-50';

    return (
        <div className="flex items-center gap-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setScore(Math.max(0, score - 1))}
                    className={cn("p-1.5 rounded-lg transition-colors", bgColor)}
                >
                    <Minus className="w-4 h-4 text-slate-400" />
                </button>
                <span className={cn("text-3xl font-black tabular-nums tracking-tighter", activeColor)}>{score}</span>
                <button
                    onClick={() => setScore(score + 1)}
                    className={cn("p-1.5 rounded-lg transition-colors", bgColor)}
                >
                    <Plus className="w-4 h-4 text-slate-400" />
                </button>
            </div>
        </div>
    );
}

interface DataEntryLoggerProps {
    player: any;
    matchId: string;
    onLogAdded: (log: any) => void;
    initialScoreMe?: number;
    initialScoreOpp?: number;
    currentSet: number;
    onSetChange: (set: number) => void;
}

export default function DataEntryLogger({
    player,
    matchId,
    onLogAdded,
    initialScoreMe = 0,
    initialScoreOpp = 0,
    currentSet,
    onSetChange
}: DataEntryLoggerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [scoreMe, setScoreMe] = useState(initialScoreMe);
    const [scoreOpp, setScoreOpp] = useState(initialScoreOpp);
    const [submitting, setSubmitting] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);
    const [customType, setCustomType] = useState<string>('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('bd_point_categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
            return;
        }
        setCategories(data || []);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        setScoreMe(initialScoreMe);
        setScoreOpp(initialScoreOpp);
    }, [initialScoreMe, initialScoreOpp]);

    const handleAddLog = async (isMyPoint: boolean, pointType: string) => {
        if (submitting) return;
        setSubmitting(true);

        const timestamp = player ? Math.floor(player.getCurrentTime()) : 0;
        const newScoreMe = isMyPoint ? scoreMe + 1 : scoreMe;
        const newScoreOpp = !isMyPoint ? scoreOpp + 1 : scoreOpp;
        const currentScore = `${newScoreMe}-${newScoreOpp}`;

        try {
            const { data, error } = await supabase
                .from('bd_point_logs')
                .insert([{
                    match_id: matchId,
                    set_number: currentSet,
                    current_score: currentScore,
                    is_my_point: isMyPoint,
                    point_type: pointType,
                    video_timestamp: timestamp
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                onLogAdded(data);
                setScoreMe(newScoreMe);
                setScoreOpp(newScoreOpp);
            }
        } catch (err: any) {
            alert('기록 저장 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateCategory = async (type: 'winner' | 'loss', group: 'offensive' | 'tactical' | 'error' | 'others') => {
        if (!customType.trim()) return;
        try {
            const { error } = await supabase
                .from('bd_point_categories')
                .insert([{
                    name: customType.trim(),
                    type,
                    category_group: group,
                    is_default: false
                }]);
            if (error) throw error;
            setCustomType('');
            await fetchCategories();
        } catch (err: any) {
            alert('카테고리 생성 중 오류: ' + err.message);
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
            await fetchCategories();
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
            await fetchCategories();
        } catch (err: any) {
            alert('카테고리 삭제 중 오류: ' + err.message);
        }
    };

    const renderCategoryButton = (cat: Category) => {
        const isWinner = cat.type === 'winner';
        const activeHoverColor = isWinner ? 'hover:border-blue-500 hover:bg-blue-50' : 'hover:border-red-500 hover:bg-red-50';
        const defaultBorder = isWinner ? 'border-slate-100' : 'border-slate-100';

        return (
            <div key={cat.id} className="relative group w-full sm:w-auto">
                {editingId === cat.id ? (
                    <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border-2 border-blue-500 shadow-lg animate-in zoom-in-95 w-full">
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm font-bold border-none focus:ring-0"
                            autoFocus
                        />
                        <button onClick={() => handleUpdateCategory(cat.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0">
                            <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg shrink-0">
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => handleAddLog(isWinner, cat.name)}
                            disabled={submitting || isManageMode}
                            className={cn(
                                "w-full min-w-[80px] sm:min-w-[100px] px-3 sm:px-8 py-3 sm:py-4.5 rounded-xl sm:rounded-[24px] border-2 text-[13px] sm:text-[16px] font-black transition-all active:scale-95 shadow-sm truncate",
                                defaultBorder,
                                activeHoverColor,
                                !cat.is_default && (isWinner ? "bg-blue-50/30 border-blue-200 text-blue-700" : "bg-red-50/30 border-red-200 text-red-700")
                            )}
                        >
                            {cat.name}
                        </button>
                        {isManageMode && (
                            <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 flex gap-1 animate-in zoom-in z-20">
                                <button
                                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:scale-110 transition-transform"
                                >
                                    <Edit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:scale-110 transition-transform"
                                >
                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] sm:rounded-[40px] border border-slate-200 dark:border-slate-800 p-4 sm:p-10 shadow-2xl space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-10">
                <div className="flex items-center gap-4 sm:gap-8 w-full lg:w-auto">
                    <div className="space-y-3 w-full lg:w-auto">
                        <h3 className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2 text-slate-400">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> LOG RECORDING
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 sm:p-2 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                            {[1, 2, 3].map(s => (
                                <button
                                    key={s}
                                    onClick={() => onSetChange(s)}
                                    className={cn(
                                        "flex-1 lg:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black transition-all whitespace-nowrap",
                                        currentSet === s
                                            ? "bg-white dark:bg-slate-700 text-slate-900 shadow-xl scale-105 sm:scale-110 z-10"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Set {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 sm:gap-12 py-3 px-6 sm:py-5 sm:px-12 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] sm:rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-inner w-full lg:w-auto justify-center">
                    <ScoreCounter label="ME" score={scoreMe} setScore={setScoreMe} color="blue" />
                    <div className="text-2xl sm:text-4xl font-black text-slate-200 px-1 sm:px-2">:</div>
                    <ScoreCounter label="OPP" score={scoreOpp} setScore={setScoreOpp} color="red" />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 sm:gap-16">
                <div className="space-y-6 sm:space-y-10">
                    <div className="flex items-center justify-between border-b-2 sm:border-b-4 border-blue-50 dark:border-blue-900/30 pb-3 sm:pb-5">
                        <div className="flex items-center gap-3 sm:gap-5 text-lg sm:text-xl font-black text-blue-600 uppercase tracking-widest">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-200">
                                <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
                            </div>
                            내 득점 (Winners)
                        </div>
                        <button
                            onClick={() => { setIsManageMode(!isManageMode); setEditingId(null); }}
                            className={cn(
                                "p-2 sm:p-3 rounded-xl transition-all",
                                isManageMode ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                            )}
                        >
                            <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    <div className="space-y-8 sm:space-y-10">
                        <div className="space-y-3 sm:space-y-5">
                            <span className="text-[11px] sm:text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                공격 (Offensive) <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />
                            </span>
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                                {categories.filter(c => c.type === 'winner' && c.category_group === 'offensive').map((cat) => (
                                    <div key={cat.id} className="w-full sm:w-auto">
                                        {renderCategoryButton(cat)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-5">
                            <span className="text-[11px] sm:text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                기술/나만의 (Tactical) <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />
                            </span>
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                                {categories.filter(c => c.type === 'winner' && (c.category_group === 'tactical' || c.category_group === 'others')).map((cat) => (
                                    <div key={cat.id} className="w-full sm:w-auto">
                                        {renderCategoryButton(cat)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 sm:space-y-10">
                    <div className="flex items-center justify-between border-b-2 sm:border-b-4 border-red-50 dark:border-red-900/30 pb-3 sm:pb-5">
                        <div className="flex items-center gap-3 sm:gap-5 text-lg sm:text-xl font-black text-red-600 uppercase tracking-widest">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-200">
                                <AlertCircle className="w-5 h-5 sm:w-8 sm:h-8" />
                            </div>
                            내 실점 (Losses)
                        </div>
                    </div>

                    <div className="space-y-8 sm:space-y-10">
                        <div className="space-y-3 sm:space-y-5">
                            <span className="text-[11px] sm:text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                범실 (Errors) <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />
                            </span>
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                                {categories.filter(c => c.type === 'loss' && c.category_group === 'error').map((cat) => (
                                    <div key={cat.id} className="w-full sm:w-auto">
                                        {renderCategoryButton(cat)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-5">
                            <span className="text-[11px] sm:text-[13px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                기타 (Others) <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />
                            </span>
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                                {categories.filter(c => c.type === 'loss' && (c.category_group === 'others' || c.category_group === 'tactical')).map((cat) => (
                                    <div key={cat.id} className="w-full sm:w-auto">
                                        {renderCategoryButton(cat)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-8 sm:pt-12 border-t border-slate-100 dark:border-slate-800">
                <div className="relative group p-4 sm:p-8 bg-slate-50/50 dark:bg-slate-800/30 rounded-[32px] sm:rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-700 transition-all focus-within:border-blue-500 focus-within:bg-white text-center sm:text-left">
                    <div className="flex flex-col xl:flex-row gap-4 sm:gap-6 items-center">
                        <div className="flex-1 flex items-center px-2 sm:px-6 gap-3 sm:gap-5 w-full">
                            <MousePointer2 className="w-5 h-5 sm:w-7 sm:h-7 text-slate-300" />
                            <input
                                type="text"
                                placeholder="나만의 새로운 기술명..."
                                value={customType}
                                onChange={(e) => setCustomType(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-lg sm:text-xl font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full xl:w-auto">
                            <button
                                onClick={() => handleCreateCategory('winner', 'tactical')}
                                disabled={!customType.trim()}
                                className="flex-1 px-6 sm:px-10 py-4 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-[28px] text-xs sm:text-sm font-black shadow-2xl disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" /> 득점추가
                            </button>
                            <button
                                onClick={() => handleCreateCategory('loss', 'error')}
                                disabled={!customType.trim()}
                                className="flex-1 px-6 sm:px-10 py-4 sm:py-5 bg-slate-900 text-white rounded-2xl sm:rounded-[28px] text-xs sm:text-sm font-black shadow-2xl disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3"
                            >
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" /> 실점추가
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 sm:mt-5 flex items-start sm:items-center gap-3 px-4 sm:px-8 text-[12px] sm:text-[14px] font-bold text-slate-400">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                    <span>여기서 기술을 추가하면 위의 섹션에 버튼이 생성됩니다. 수정/삭제도 가능합니다.</span>
                </div>
            </div>

            <div className="p-6 sm:p-10 bg-blue-50/30 rounded-[32px] sm:rounded-[48px] border border-blue-100/50">
                <div className="flex items-center gap-3 text-[10px] sm:text-xs font-black text-blue-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-6 sm:mb-8">
                    <Info className="w-5 h-5 sm:w-6 sm:h-6" /> Terminology Guide
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:grid-cols-2 sm:gap-12">
                    <div className="flex gap-4 sm:gap-6 items-start">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-black text-sm sm:text-base">득</div>
                        <div>
                            <p className="text-base sm:text-lg font-black text-slate-800">네트킬 (Net Kill)</p>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2 leading-relaxed">네트 상단에서 셔틀콕을 내리꽂는 공격 기술입니다.</p>
                        </div>
                    </div>
                    <div className="flex gap-4 sm:gap-6 items-start">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-black text-sm sm:text-base">실</div>
                        <div>
                            <p className="text-base sm:text-lg font-black text-slate-800">네트 (Net Error)</p>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2 leading-relaxed">셔틀콕이 네트에 걸려 상대에게 점수를 내주는 범실입니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            {submitting && (
                <div className="fixed bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 sm:px-12 py-4 sm:py-6 rounded-2xl sm:rounded-[32px] shadow-2xl flex items-center gap-3 sm:gap-5 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
                    <Loader2 className="w-4 h-4 sm:w-6 sm:h-6 animate-spin text-blue-400" />
                    <span className="font-black tracking-[0.1em] sm:tracking-[0.2em] text-xs sm:text-sm">기록 중...</span>
                </div>
            )}
        </div>
    );
}
