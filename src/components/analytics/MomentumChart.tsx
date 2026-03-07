'use client';

import React, { useMemo } from 'react';
import {
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Line,
    LabelList,
    Bar,
    ReferenceLine,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { MomentumData } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    Activity,
    Zap,
    Waves,
    TrendingUp,
    ShieldAlert,
    BarChart3,
    Clock,
    Target as TargetIcon,
    Swords, Bomb, UserX
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MomentumChartProps {
    data: MomentumData[];
}

const COLORS = [
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#06b6d4', // Cyan 500
    '#0ea5e9', // Sky 500
    '#8b5cf6', // Violet 500
    '#d946ef', // Fuchsia 500
    '#ec4899'  // Pink 500
];
const ERROR_COLORS = [
    '#f43f5e', // Rose 500
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#e11d48', // Rose 600
    '#be123c', // Rose 700
    '#fb7185'  // Rose 400
];

const FuturisticTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isLeading = data.scoreGap > 0;
        const statusColor = isLeading ? "#00f2ff" : (data.scoreGap < 0 ? "#ff007f" : "#cbd5e1");

        return (
            <div className="relative">
                <div className="relative bg-slate-900 border border-white/20 p-3 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">데이터 링크</span>
                            <span className="text-sm font-bold text-white tracking-wider">RALLY_{data.rallyIndex.toString().padStart(3, '0')}</span>
                        </div>
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border border-white/10",
                            data.isMyPoint ? "bg-cyan-500/20 text-cyan-400" : "bg-fuchsia-500/20 text-fuchsia-400"
                        )}>
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">점수 매트릭스</span>
                            <span className="text-sm font-bold text-cyan-400 tabular-nums">{data.score}</span>
                        </div>

                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">격차 강도</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: statusColor }}>
                                {data.scoreGap > 0 ? `+${data.scoreGap}` : data.scoreGap}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, index }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels further out to avoid overlapping with the donut
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const isTop3 = index < 3;
    const nameColor = isTop3 ? "#fff" : "#94a3b8";
    const detailColor = isTop3 ? "#22d3ee" : "#64748b";

    // Explicit font sizes in pixels to avoid Tailwind inheritance issues in SVG
    const nameSize = isTop3 ? 14 : 12;
    const detailSize = isTop3 ? 12 : 10;

    return (
        <g>
            <text
                x={x}
                y={y}
                fill={nameColor}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                style={{
                    fontWeight: 900,
                    filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))',
                    fontFamily: 'inherit'
                }}
            >
                <tspan x={x} dy="-0.6em" style={{ fontSize: `${nameSize}px`, fill: nameColor }}>
                    {isTop3 ? `🔥 ${name}` : name}
                </tspan>
                <tspan x={x} dy="1.4em" style={{ fontSize: `${detailSize}px`, fill: detailColor, fontWeight: 700 }}>
                    {`${value}점 (${(percent * 100).toFixed(0)}%)`}
                </tspan>
            </text>
        </g>
    );
};

export default function MomentumChart({ data }: MomentumChartProps) {
    const { chartData, domainY, kpis } = useMemo(() => {
        if (!data || data.length === 0) return { chartData: [], domainY: [-10, 10], kpis: null };

        const gaps = data.map(d => Math.abs(d.scoreGap));
        const max = Math.max(...gaps, 6);

        // Calculate KPIs
        let maxStreak = 0;
        let currentStreak = 0;
        let leadRallies = 0;
        const winners: Record<string, number> = {};
        const losses: Record<string, number> = {};

        data.forEach(d => {
            if (d.isMyPoint) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
                if (d.pointType) winners[d.pointType] = (winners[d.pointType] || 0) + 1;
            } else {
                currentStreak = 0;
                if (d.pointType) losses[d.pointType] = (losses[d.pointType] || 0) + 1;
            }
            if (d.scoreGap > 0) leadRallies++;
        });

        const sArray = Object.entries(winners).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
        const rArray = Object.entries(losses).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

        return {
            chartData: data,
            domainY: [-max - 2, max + 2],
            kpis: {
                maxStreak,
                leadRatio: Math.round((leadRallies / data.length) * 100) || 0,
                topSkill: sArray[0]?.name || '-',
                riskFactor: rArray[0]?.name || '-'
            }
        };
    }, [data]);

    const distributionData = useMemo(() => {
        if (!chartData || chartData.length === 0) return { winners: [], losses: [] };

        const winnersMap: Record<string, number> = {};
        const lossesMap: Record<string, number> = {};

        chartData.forEach(d => {
            if (!d.pointType) return;
            if (d.isMyPoint) {
                winnersMap[d.pointType] = (winnersMap[d.pointType] || 0) + 1;
            } else {
                lossesMap[d.pointType] = (lossesMap[d.pointType] || 0) + 1;
            }
        });

        const winners = Object.entries(winnersMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const losses = Object.entries(lossesMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { winners, losses };
    }, [chartData]);

    if (!chartData || chartData.length === 0) return (
        <div className="h-full flex items-center justify-center bg-slate-950 rounded-[32px] border border-white/5 min-h-[400px]">
            <span className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-[0.3em] animate-pulse">경기 데이터를 기다리는 중...</span>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-slate-950 rounded-[32px] border border-white/10 p-4 shadow-2xl overflow-hidden relative group/logger">
            {/* Grid Pattern Background - Identical to DataEntryLogger */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#00f2ff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />


            {/* Distribution Charts: Premium Donut Analytics */}
            <div className="flex-1 grid grid-cols-2 gap-4 relative z-10 min-h-0">
                {/* Score Distribution */}
                <div className="flex flex-col h-full bg-cyan-500/5 border border-cyan-500/10 rounded-[28px] p-4 transition-all hover:bg-cyan-500/[0.08] hover:border-cyan-500/20 group/attack relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-1.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20">
                            <Swords className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-[12px] font-black text-white uppercase tracking-wider">득점 분포 비중 (%)</span>
                    </div>

                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 60, left: 60, bottom: 20 }}>
                                <Pie
                                    data={distributionData.winners}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                                    label={renderCustomizedLabel}
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    minAngle={15}
                                    isAnimationActive={false}
                                    dataKey="value"

                                >
                                    {distributionData.winners.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            stroke={index < 3 ? "#fff" : "none"}
                                            strokeWidth={index < 3 ? 2 : 0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                    formatter={(value: any, name: any) => [`${value}점`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Loss Distribution */}
                <div className="flex flex-col h-full bg-rose-500/5 border border-rose-500/10 rounded-[28px] p-4 transition-all hover:bg-rose-500/[0.08] hover:border-rose-500/20 group/risk relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            <Bomb className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-[12px] font-black text-white uppercase tracking-wider">실점 분포 비중 (%)</span>
                    </div>

                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 60, left: 60, bottom: 20 }}>
                                <Pie
                                    data={distributionData.losses}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1 }}
                                    label={renderCustomizedLabel}
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    minAngle={15}
                                    isAnimationActive={false}
                                    dataKey="value"

                                >
                                    {distributionData.losses.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={ERROR_COLORS[index % ERROR_COLORS.length]}
                                            stroke={index < 3 ? "#fff" : "none"}
                                            strokeWidth={index < 3 ? 2 : 0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                    formatter={(value: any, name: any) => [`${value}점`, name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>
    );
}
