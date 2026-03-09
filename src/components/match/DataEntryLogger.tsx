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
    Edit2,
    Save,
    X,
    ListPlus,
    SquarePen,
    Zap,
    Cpu,
    Target,
} from 'lucide-react';
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    XAxis,
    YAxis,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import CategorySelectModal from './CategorySelectModal';
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
}

interface DataEntryLoggerProps {
    player: any;
    matchId: string;
    onLogAdded: (log: any) => void;
    initialScoreMe?: number;
    initialScoreOpp?: number;
    currentSet: number;
    onSetChange: (set: number) => void;
    categories: Category[];
    logs: BDPointLog[];
    onCategoryChange?: () => void;
    lastTimestamp?: number;
}

export default function DataEntryLogger({
    player,
    matchId,
    onLogAdded,
    currentSet,
    onSetChange,
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

    const radarMetrics = React.useMemo(() => {
        const winners = logs.filter(l => l.is_my_point);
        const losses = logs.filter(l => !l.is_my_point);
        const total = logs.length;
        if (total === 0) return [
            { subject: '공격력', A: 0, fullMark: 100 },
            { subject: '정교함', A: 0, fullMark: 100 },
            { subject: '안정성', A: 0, fullMark: 100 },
            { subject: '위기관리', A: 0, fullMark: 100 },
            { subject: '기술 다양성', A: 0, fullMark: 100 },
        ];

        const getCatGroup = (name: string) => categories.find(c => c.name === name)?.category_group || 'others';

        // 1. 공격력 (Power)
        const offensiveWinners = winners.filter(l => getCatGroup(l.point_type) === 'offensive');
        const powerPI = (offensiveWinners.length / (winners.length || 1)) * 100;

        // 2. 정교함 (Control)
        const tacticalWinners = winners.filter(l => getCatGroup(l.point_type) === 'tactical');
        const tacticalLosses = losses.filter(l => getCatGroup(l.point_type) === 'tactical');
        const controlPI = (tacticalWinners.length / (tacticalWinners.length + tacticalLosses.length || 1)) * 100;

        // 3. 안정성 (Stability)
        const unforcedErrors = losses.filter(l => getCatGroup(l.point_type) === 'error');
        const stabilityPI = ((total - unforcedErrors.length) / total) * 100;

        // 4. 위기관리 (Clutch) - 15점 이후
        const clutchLogs = logs.filter(l => {
            const [me, opp] = (l.current_score || '0-0').split('-').map(Number);
            return (me >= 15 || opp >= 15);
        });
        const clutchWinners = clutchLogs.filter(l => l.is_my_point);
        const clutchPI = (clutchWinners.length / (clutchLogs.length || 1)) * 100;

        // 5. 기술 다양성 (Variety)
        const uniqueWinningTypes = new Set(winners.map(l => l.point_type)).size;
        const varietyPI = Math.min(100, (uniqueWinningTypes / 6) * 100);

        return [
            { subject: '공격력', A: Math.round(powerPI), fullMark: 100 },
            { subject: '정교함', A: Math.round(controlPI), fullMark: 100 },
            { subject: '안정성', A: Math.round(stabilityPI), fullMark: 100 },
            { subject: '위기관리', A: Math.round(clutchPI), fullMark: 100 },
            { subject: '기술 다양성', A: Math.round(varietyPI), fullMark: 100 },
        ];
    }, [logs, categories]);

    // Calculate Technique Metrics
    const techniqueMetrics = React.useMemo(() => {
        const winnerCats = categories.filter(c => c.type === 'winner');
        return winnerCats.map(cat => {
            const successes = logs.filter(l => l.is_my_point && l.point_type === cat.name).length;
            const failures = logs.filter(l => !l.is_my_point && l.point_type.includes(cat.name) && l.point_type.includes('실수')).length;
            const attempts = successes + failures;
            const rate = attempts > 0 ? Math.round((successes / attempts) * 100) : 0;
            return {
                name: cat.name,
                successes,
                failures,
                attempts,
                rate
            };
        }).filter(m => m.attempts > 0)
            .sort((a, b) => b.attempts - a.attempts);
    }, [logs, categories]);

    const maxAttempts = React.useMemo(() => {
        return Math.max(...techniqueMetrics.map(m => m.attempts), 1);
    }, [techniqueMetrics]);

    const handleAddLog = async (isWinner: boolean, pointType: string) => {
        if (submitting) return;
        setSubmitting(true);

        try {
            // Calculate approximate next score locally to avoid '0-0' flash/reset
            const currentMe = logs.filter(l => l.is_my_point).length;
            const currentOpp = logs.filter(l => !l.is_my_point).length;
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
            if (data) onLogAdded(data);
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
            setShowCustom(false);
            setCustomTarget(null);
            onCategoryChange?.();
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
            await onCategoryChange?.();
        } catch (err: any) {
            alert('카테고리 삭제 중 오류: ' + err.message);
        }
    };

    const renderAddButton = (type: 'winner' | 'loss', group: 'offensive' | 'tactical' | 'error' | 'others') => {
        const isAddingThis = showCustom && (
            (type === 'winner' && (group === 'offensive' || group === 'others')) ||
            (type === 'loss' && (group === 'error' || group === 'others'))
        );

        if (isAddingThis) {
            return (
                <div key="adding" className="col-span-2 md:col-span-2 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-2 rounded-xl border-2 border-cyan-500 shadow-[0_0_15px_rgba(0,242,255,0.4)] animate-in zoom-in-95 h-11 justify-center">
                    <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700">
                        <input
                            type="text"
                            placeholder="명칭 입력..."
                            value={customType}
                            onChange={(e) => setCustomType(e.target.value)}
                            className="w-full px-1 py-0.5 text-[12px] font-bold border-none focus:ring-0 bg-transparent text-white placeholder:text-slate-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateCategory();
                                if (e.key === 'Escape') { setShowCustom(false); setCustomTarget(null); }
                            }}
                        />
                        <button
                            onClick={() => handleCreateCategory()}
                            className="p-1 bgColor-blue-600 text-white hover:bg-blue-700 rounded-md shrink-0 transition-all active:scale-95"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <button
                key="add-trigger"
                onClick={() => { setShowCustom(true); setCustomTarget({ type, group }); setCustomType(''); }}
                className={cn(
                    "w-full h-12 px-4 rounded-xl border text-[11px] font-bold transition-all flex items-center justify-center gap-2 group active:scale-95 shadow-sm uppercase tracking-widest leading-none",
                    type === 'winner'
                        ? "text-cyan-400 border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-500/60"
                        : "text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/60"
                )}
            >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                <span className="whitespace-nowrap">기술 등록</span>
            </button>
        );
    };

    const renderCategoryButton = (cat: Category) => {
        const isWinner = cat.type === 'winner';

        return (
            <div key={cat.id} className="relative group shrink-0 w-full">
                {editingId === cat.id ? (
                    <div className={cn(
                        "flex flex-col gap-2 bg-slate-900 p-1.5 rounded-xl border-2 h-11 justify-center animate-in zoom-in-95",
                        isWinner ? "border-cyan-500 shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "border-rose-500 shadow-[0_0_15px_rgba(255,0,127,0.3)]"
                    )}>
                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-1.5 py-1 rounded-lg border border-slate-700">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-1 py-0.5 text-[11px] font-bold border-none focus:ring-0 bg-transparent text-white"
                                autoFocus
                            />
                            <button
                                onClick={() => handleUpdateCategory(cat.id)}
                                className="p-1 bg-cyan-500 text-slate-950 rounded-md shrink-0 transition-all active:scale-95"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative group hover:scale-[1.03] transition-all duration-300">
                        <button
                            onClick={() => handleAddLog(isWinner, cat.name)}
                            disabled={submitting || isManageMode}
                            className={cn(
                                "w-full h-11 px-4 py-1.5 rounded-xl border transition-all flex items-center justify-center group active:scale-95 gap-2 shadow-sm font-bold tracking-tight uppercase",
                                isWinner
                                    ? "bg-slate-900 border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400"
                                    : "bg-slate-900 border-rose-500/20 hover:border-rose-400 hover:bg-rose-500/10 text-rose-400",
                                isManageMode && "cursor-default border-slate-700/80 bg-slate-800/50"
                            )}

                        >
                            <span className="text-[12px] leading-snug whitespace-nowrap overflow-hidden text-ellipsis w-full">{cat.name}</span>
                        </button>
                        {isManageMode && (
                            <div className="absolute -top-1.5 -right-1.5 flex gap-1 animate-in zoom-in duration-200 z-20">
                                <button
                                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                                    className="w-6 h-6 bg-slate-800 text-cyan-400 rounded-lg flex items-center justify-center border border-slate-700 shadow-xl hover:scale-110 transition-all hover:bg-cyan-500 hover:text-slate-950"
                                >
                                    <SquarePen className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="w-6 h-6 bg-slate-800 text-rose-500 rounded-lg flex items-center justify-center border border-slate-700 shadow-xl hover:scale-110 transition-all hover:bg-rose-500 hover:text-white"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Helper to get technique color
    const getTechColor = (name: string): { color: string; bg: string; border: string; light: string } => {
        const n = name.toLowerCase();
        if (n.includes('스매시')) return { color: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500/20', light: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]' };
        if (n.includes('드롭')) return { color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/20', light: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
        if (n.includes('헤어핀')) return { color: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/20', light: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
        if (n.includes('푸시')) return { color: 'text-violet-400', bg: 'bg-violet-500', border: 'border-violet-500/20', light: 'shadow-[0_0_15px_rgba(139,92,246,0.3)]' };
        if (n.includes('드라이브')) return { color: 'text-blue-400', bg: 'bg-blue-500', border: 'border-blue-500/20', light: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' };
        if (n.includes('클리어')) return { color: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/20', light: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' };
        return { color: 'text-slate-400', bg: 'bg-slate-500', border: 'border-slate-500/20', light: 'shadow-[0_0_15px_rgba(148,163,184,0.3)]' };
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 rounded-[32px] border border-white/10 p-5 shadow-2xl overflow-hidden relative group/logger">
            {/* Grid Pattern Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Performance Metrics HUD Area */}
            <div className="flex-1 flex flex-col min-h-0 relative z-10 bg-slate-900/30 rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <Target className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-black text-white uppercase tracking-tight">전술 밸런스 심층 분석</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-60">Tactical Balance Deep Analysis</span>
                        </div>
                    </div>

                    <button
                        onClick={() => { setIsManageMode(!isManageMode); setEditingId(null); }}
                        className={cn(
                            "w-10 h-10 rounded-xl transition-all flex items-center justify-center active:scale-90 relative overflow-hidden",
                            isManageMode
                                ? "bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                                : "bg-slate-900 border border-white/10 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 shadow-xl"
                        )}
                    >
                        <Settings2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center min-h-0 py-2">
                    <div className="w-full h-full max-h-[220px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarMetrics}>
                                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={(props: any) => {
                                        const { x, y, payload, textAnchor } = props;
                                        const metric = radarMetrics.find(m => m.subject === payload.value);
                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <text
                                                    textAnchor={textAnchor}
                                                    fill="#f8fafc"
                                                    fontSize={13}
                                                    fontWeight="900"
                                                    className="tracking-tighter"
                                                >
                                                    {payload.value}
                                                    <tspan fill="#3b82f6" dx={4}>({metric?.A || 0})</tspan>
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={false}
                                    axisLine={false}
                                />
                                <Radar
                                    name="Performance"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fill="#3b82f6"
                                    fillOpacity={0.3}
                                    animationDuration={1500}
                                />
                            </RadarChart>
                        </ResponsiveContainer>

                        {/* Real-time Status Overlay */}
                        <div className="absolute top-0 right-0 flex flex-col gap-2 p-2 pointer-events-none">
                            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Live Tracking</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Management HUB (Modal for full management) */}
            {isManageMode && (
                <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" onClick={() => setIsManageMode(false)} />

                    <div className="relative w-full max-w-5xl h-[80vh] bg-slate-900 rounded-[50px] border border-white/10 shadow-2xl flex flex-col overflow-hidden z-[205] animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex justify-between items-center px-12 py-8 border-b border-white/5 shrink-0 bg-slate-950/30">
                            <div>
                                <h2 className="text-3xl font-bold text-white tracking-widest uppercase flex items-center gap-4">
                                    <Cpu className="w-8 h-8 text-cyan-400" />
                                    Tactical Matrix
                                </h2>
                            </div>
                            <button onClick={() => setIsManageMode(false)} className="p-4 rounded-3xl bg-white/5 text-white/40 hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-white/10">
                                <X className="w-7 h-7" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[2px] w-12 bg-cyan-500" />
                                    <span className="text-[12px] font-bold text-cyan-400 uppercase tracking-[0.3em]">Positive Engines</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {renderAddButton('winner', 'others')}
                                    {categories.filter(c => c.type === 'winner').map(renderCategoryButton)}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-[2px] w-12 bg-rose-500" />
                                    <span className="text-[12px] font-bold text-rose-500 uppercase tracking-[0.3em]">Deficiency Logs</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {renderAddButton('loss', 'others')}
                                    {categories.filter(c => c.type === 'loss').map(renderCategoryButton)}
                                </div>
                            </section>
                        </div>

                        <div className="p-8 shrink-0 flex justify-center bg-slate-950/30 border-t border-white/5">
                            <button onClick={() => setIsManageMode(false)} className="px-12 py-3 bg-cyan-500 rounded-2xl font-black text-lg text-slate-950 tracking-tight active:scale-95 transition-all shadow-xl">
                                확인
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {submitting && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[110]">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: rgba(34, 211, 238, 0.3);
                }
            `}</style>
        </div>
    );
}
