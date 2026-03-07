'use client';

import React from 'react';
import {
    X,
    Zap,
    AlertCircle,
    Info,
    Target,
    ChevronDownCircle,
    Waves,
    ArrowUpCircle,
    MoveRight,
    CornerRightUp,
    ShieldAlert,
    XCircle
} from 'lucide-react';

import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
}

interface CategorySelectModalProps {
    isOpen: boolean;
    isMyPoint: boolean;
    categories: Category[];
    onSelect: (categoryName: string) => void;
    onClose: () => void;
}

export default function CategorySelectModal({
    isOpen,
    isMyPoint,
    categories,
    onSelect,
    onClose
}: CategorySelectModalProps) {
    if (!isOpen) return null;

    // Helper to get category specific icon
    const getCategoryIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('스매시')) return <Zap className="w-6 h-6" />;
        if (n.includes('드롭')) return <ChevronDownCircle className="w-6 h-6" />;
        if (n.includes('헤어핀')) return <Waves className="w-6 h-6" />;
        if (n.includes('클리어')) return <ArrowUpCircle className="w-6 h-6" />;
        if (n.includes('드라이브')) return <MoveRight className="w-6 h-6" />;
        if (n.includes('푸시')) return <CornerRightUp className="w-6 h-6" />;
        if (n.includes('피습')) return <ShieldAlert className="w-6 h-6" />;
        if (n.includes('실수') || n.includes('범실')) return <XCircle className="w-6 h-6" />;
        return <Target className="w-6 h-6" />;
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/60 animate-in fade-in duration-300 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative w-full max-w-5xl bg-slate-900/95 border border-white/20 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] backdrop-blur-xl transition-all">
                {/* Modal Header */}
                <div className="px-10 py-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-950/40">
                    <div className="flex items-center gap-5">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-transform duration-500",
                            isMyPoint ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        )}>
                            {isMyPoint ? <Zap className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className={cn(
                                "text-2xl font-black tracking-tight uppercase",
                                isMyPoint ? "text-cyan-400" : "text-rose-500"
                            )}>
                                {isMyPoint ? "득점 결과 기록" : "실점 원인 기록"}
                            </h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" />
                                구체적인 기술 카테고리를 선택해 주세요
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90 border border-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-6 bg-slate-900/50 overflow-hidden flex flex-col">
                    {/* Enhanced Guide Box (Condensed) */}
                    {!isMyPoint && (
                        <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 rounded-[24px] p-4 flex gap-4 items-center shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                                <Info className="w-5 h-5 text-rose-400" />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <p className="text-[13px] font-bold text-slate-300 leading-tight">
                                    범실은 <span className="text-rose-400 font-black">'OOO 실수'</span>를, 공격에 당한 경우 <span className="text-slate-100 font-black">'OOO 피습'</span>을 선택하세요.
                                </p>
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">Pro Tip</span>
                            </div>
                        </div>
                    )}

                    {/* Technical Categories Grid */}
                    <div className="flex-1 overflow-hidden">
                        {isMyPoint ? (
                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                                {categories
                                    .filter(c => c.type === 'winner')
                                    .map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => onSelect(cat.name)}
                                            className="h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-3 group active:scale-95 relative overflow-hidden bg-slate-950/40 border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10 shadow-lg"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-9 h-9 rounded-xl mb-2 flex items-center justify-center transition-all duration-700 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:[transform:rotateY(360deg)] group-hover:bg-cyan-500/20">
                                                {getCategoryIcon(cat.name)}
                                            </div>
                                            <span className="text-[12px] font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors text-center line-clamp-1">{cat.name}</span>
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col gap-6">
                                {/* Grouping for Losses (Split into 2 concise rows/grids) */}
                                {[
                                    { group: 'error', label: '나의 범실 (Mistakes)', color: 'rose' },
                                    { group: 'tactical', label: '상대 공격 (Shots)', color: 'slate' }
                                ].map(section => {
                                    const filtered = categories.filter(c =>
                                        c.type === 'loss' &&
                                        (section.group === 'error' ? c.category_group === 'error' : c.category_group !== 'error')
                                    );

                                    if (filtered.length === 0) return null;

                                    return (section.group === 'error' && (
                                        <div key={section.group} className="flex flex-col gap-3 min-h-0 flex-1">
                                            <div className="flex items-center gap-4 px-2">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-0.5 rounded-full border",
                                                    section.color === 'rose' ? "text-rose-400 border-rose-500/20 bg-rose-500/10" : "text-slate-400 border-slate-500/20 bg-slate-500/10"
                                                )}>
                                                    {section.label}
                                                </span>
                                                <div className={cn("h-px flex-1", section.color === 'rose' ? "bg-rose-500/10" : "bg-slate-500/10")} />
                                            </div>

                                            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                {filtered.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => onSelect(cat.name)}
                                                        className={cn(
                                                            "h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group active:scale-95 relative overflow-hidden bg-slate-950/40 shadow-md",
                                                            section.color === 'rose'
                                                                ? "border-white/5 hover:border-rose-500/50 hover:bg-rose-500/10"
                                                                : "border-white/5 hover:border-slate-400 hover:bg-slate-800/40"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg mb-1.5 flex items-center justify-center transition-all duration-700 border",
                                                            section.color === 'rose'
                                                                ? "bg-rose-500/10 text-rose-400 border-rose-500/10 group-hover:bg-rose-500/20 group-hover:[transform:rotateY(360deg)]"
                                                                : "bg-slate-500/10 text-slate-400 border-slate-500/10 group-hover:bg-slate-500/20 group-hover:[transform:rotateY(360deg)]"
                                                        )}>
                                                            {getCategoryIcon(cat.name)}
                                                        </div>
                                                        <span className="text-[11px] font-bold tracking-tight text-white transition-colors text-center line-clamp-1 group-hover:text-inherit">
                                                            {cat.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) || (
                                            <div key={section.group} className="flex flex-col gap-3 min-h-0 flex-1">
                                                <div className="flex items-center gap-4 px-2 text-right">
                                                    <div className={cn("h-px flex-1", section.color === 'rose' ? "bg-rose-500/10" : "bg-slate-500/10")} />
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-0.5 rounded-full border",
                                                        section.color === 'rose' ? "text-rose-400 border-rose-500/20 bg-rose-500/10" : "text-slate-400 border-slate-500/20 bg-slate-500/10"
                                                    )}>
                                                        {section.label}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                    {filtered.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => onSelect(cat.name)}
                                                            className={cn(
                                                                "h-20 rounded-2xl border-2 transition-all flex flex-col items-center justify-center p-2 group active:scale-95 relative overflow-hidden bg-slate-950/40 shadow-md",
                                                                "border-white/5 hover:border-slate-400 hover:bg-slate-800/40"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-8 h-8 rounded-lg mb-1.5 flex items-center justify-center transition-all duration-700 border bg-slate-500/10 text-slate-400 border-slate-500/10 group-hover:bg-slate-500/20 group-hover:[transform:rotateY(360deg)]"
                                                            )}>
                                                                {getCategoryIcon(cat.name)}
                                                            </div>
                                                            <span className="text-[11px] font-bold tracking-tight text-white transition-colors text-center line-clamp-1 group-hover:text-inherit">
                                                                {cat.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer (Slim) */}
                <div className="px-10 py-5 bg-slate-950/60 border-t border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Active Matrix v2.0</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Integrated Performance Analytics</span>
                </div>
            </div>

            <style jsx global>{`
                [transform-style="preserve-3d"] {
                    transform-style: preserve-3d;
                }
            `}</style>
        </div>
    );
}
