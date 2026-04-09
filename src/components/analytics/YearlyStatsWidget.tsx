'use client';

import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { BDMatch } from '@/types';

interface YearlyStat {
    year: string;
    total: number;
    win: number;
    loss: number;
    winRate: number;
}

export default function YearlyStatsWidget({ matches }: { matches: Partial<BDMatch>[] }) {
    const yearlyStats = useMemo(() => {
        if (!matches || matches.length === 0) return [];

        const statsMap: Record<string, YearlyStat> = {};

        matches.forEach(m => {
            if (!m.match_date) return;

            const year = m.match_date.substring(0, 4);
            if (!statsMap[year]) {
                statsMap[year] = { year, total: 0, win: 0, loss: 0, winRate: 0 };
            }

            statsMap[year].total++;
            if (m.match_result === 'win') {
                statsMap[year].win++;
            } else {
                statsMap[year].loss++;
            }
        });

        return Object.values(statsMap)
            .sort((a, b) => b.year.localeCompare(a.year))
            .map(stat => ({
                ...stat,
                winRate: Math.round((stat.win / stat.total) * 100)
            }));
    }, [matches]);

    if (yearlyStats.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm mb-12">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">연도별 전적 및 승률</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Yearly Performance Overview</p>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {yearlyStats.map((stat) => (
                    <div key={stat.year} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{stat.year}</span>
                            <div className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Win Rate</span>
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Record</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[15px] font-black text-emerald-500">{stat.win}W</span>
                                    <span className="text-sm font-black text-slate-300">-</span>
                                    <span className="text-[15px] font-black text-rose-500">{stat.loss}L</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <span className="text-3xl lg:text-4xl font-black tracking-tighter text-blue-600 dark:text-blue-400 leading-none">
                                    {stat.winRate}<span className="text-lg lg:text-xl">%</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
