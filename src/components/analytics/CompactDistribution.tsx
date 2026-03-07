'use client';

import React from 'react';
import { BDPointLog } from '@/types';
import { Trophy, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind Class Merger
 */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CompactDistributionProps {
    logs: BDPointLog[];
}

/**
 * CompactDistribution Redesign
 * Replaces PieChart with a Rank-based Technical Dashboard for better clarity.
 */
export default function CompactDistribution({ logs }: CompactDistributionProps) {
    if (logs.length === 0) return (
        <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase tracking-[0.3em] opacity-40">
            Analytics Pending Logs...
        </div>
    );

    const winners = logs.filter(l => l.is_my_point);
    const losses = logs.filter(l => !l.is_my_point);

    const processData = (data: BDPointLog[]) => {
        const total = data.length;
        const distribution = data.reduce((acc: any, curr) => {
            acc[curr.point_type] = (acc[curr.point_type] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(distribution)
            .map(name => ({
                name,
                count: distribution[name],
                percent: total > 0 ? (distribution[name] / total) * 100 : 0
            }))
            .sort((a, b) => b.count - a.count);
    };

    const winnerData = processData(winners);
    const lossData = processData(losses);

    /**
     * Reusable Ranking Card Component
     */
    const StatCard = ({ title, subtitle, data, icon: Icon, colorClass, barColor }: any) => (
        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex flex-col mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <Icon className={cn("w-5 h-5", colorClass)} />
                    <span className="text-lg font-black text-slate-800 dark:text-white leading-tight">{title}</span>
                </div>
                <span className="text-xs font-bold text-slate-400 tracking-tight">{subtitle}</span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {data.length > 0 ? data.slice(0, 5).map((item: any, idx: number) => (
                    <div key={item.name} className="flex flex-col gap-1.5 group">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "w-5 h-5 flex items-center justify-center rounded-lg text-[10px] text-white font-black transition-transform group-hover:scale-110",
                                    idx === 0 ? colorClass.replace('text-', 'bg-') : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                )}>
                                    {idx + 1}
                                </span>
                                <span className="text-slate-700 dark:text-slate-200 font-bold text-[12px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-medium">{item.count}회</span>
                                <span className={cn("font-black min-w-[32px] text-right", colorClass)}>{item.percent.toFixed(0)}%</span>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-slate-50 dark:bg-slate-800/40 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-out", barColor)}
                                style={{ width: `${item.percent}%` }}
                            />
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <Icon className="w-6 h-6 text-slate-300" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">분석 데이터 없음</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-2 gap-4 h-full p-0">
            <StatCard
                title="득점 기술 랭킹"
                subtitle="가장 효과적인 득점 루트는?"
                data={winnerData}
                icon={Trophy}
                colorClass="text-blue-600"
                barColor="bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
            />
            <StatCard
                title="실점 원인 랭킹"
                subtitle="보강이 시급한 실점 유형은?"
                data={lossData}
                icon={AlertCircle}
                colorClass="text-rose-500"
                barColor="bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
            />
        </div>
    );
}
