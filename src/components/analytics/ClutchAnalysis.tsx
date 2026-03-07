'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BDPointLog } from '@/types';

interface ClutchAnalysisProps {
    logs: BDPointLog[];
}

export default function ClutchAnalysis({ logs }: ClutchAnalysisProps) {
    // 15점 이후의 랠리 필터링
    const clutchLogs = logs.filter(log => {
        const [me, opp] = log.current_score.split('-').map(Number);
        return me >= 15 || opp >= 15;
    });

    const stats = clutchLogs.reduce((acc: any, log) => {
        const key = log.is_my_point ? '득점' : '실점';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const data = Object.keys(stats).map(name => ({
        name,
        value: stats[name]
    }));

    const COLORS = ['#3b82f6', '#ef4444'];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="mb-4">
                <h3 className="font-bold text-lg">클러치 타임 분석 (15점 이후)</h3>
                <p className="text-xs text-slate-500">세트 후반 집중력 및 득점 확률</p>
            </div>

            <div className="h-[200px] w-full">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                isAnimationActive={false}
                                dataKey="value"

                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                        데이터 부족 (15점 도달 전)
                    </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">득점 확률</p>
                    <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                        {stats['득점'] ? Math.round((stats['득점'] / clutchLogs.length) * 100) : 0}%
                    </p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase">범실 비율</p>
                    <p className="text-xl font-black text-red-700 dark:text-red-300">
                        {stats['실점'] ? Math.round((stats['실점'] / clutchLogs.length) * 100) : 0}%
                    </p>
                </div>
            </div>
        </div>
    );
}
