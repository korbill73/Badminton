'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Legend,
    PieChart,
    Pie
} from 'recharts';
import { BDPointLog } from '@/types';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Lightbulb, PieChart as PieIcon } from 'lucide-react';

interface TacticalDashboardProps {
    logs: BDPointLog[];
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
}

const COLORS = ['#3b82f6', '#6366f1', '#06b6d4', '#0ea5e9', '#8b5cf6', '#ec4899', '#f43f5e'];
const ERROR_COLORS = ['#fb7185', '#f43f5e', '#ef4444', '#b91c1c', '#f87171', '#fb923c'];

export default function TacticalDashboard({ logs }: TacticalDashboardProps) {
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('bd_point_categories')
                .select('*');
            if (!error && data) {
                setCategories(data);
            }
        };
        fetchCategories();
    }, []);

    const winners = logs.filter(l => l.is_my_point);
    const losses = logs.filter(l => !l.is_my_point);

    // Dynamic label mapping
    const getLabel = (type: string) => {
        const cat = categories.find(c => c.name === type);
        return cat ? cat.name : type;
    };

    // Static groups for the radar/bar comparison (can be refined later if group management is added)
    const TECHNIQUE_GROUPS = [
        { label: '공격 기술', icon: '🚀', groups: ['offensive'] },
        { label: '정교함/기술', icon: '🧶', groups: ['tactical'] },
        { label: '범실/실수', icon: '😅', groups: ['error'] },
        { label: '기타/반응', icon: '🌪️', groups: ['others'] },
    ];

    const comparisonData = TECHNIQUE_GROUPS.map(group => {
        const groupCatNames = categories.filter(c => group.groups.includes(c.category_group)).map(c => c.name);
        const winCount = winners.filter(l => groupCatNames.includes(l.point_type)).length;
        const lossCount = losses.filter(l => groupCatNames.includes(l.point_type)).length;
        return {
            name: `${group.icon} ${group.label}`,
            득점: winCount,
            실점: lossCount,
            total: winCount + lossCount
        };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    // Pie Chart Data for Winners
    const winnerDistribution = winners.reduce((acc: any, curr) => {
        const label = getLabel(curr.point_type);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    const winnerPieData = Object.keys(winnerDistribution).map(name => ({
        name,
        value: winnerDistribution[name]
    })).sort((a, b) => b.value - a.value);

    // Pie Chart Data for Losses
    const lossDistribution = losses.reduce((acc: any, curr) => {
        const label = getLabel(curr.point_type);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    const lossPieData = Object.keys(lossDistribution).map(name => ({
        name,
        value: lossDistribution[name]
    })).sort((a, b) => b.value - a.value);

    // Error breakdown for insights
    const errorStats = losses.filter(l => {
        const cat = categories.find(c => c.name === l.point_type);
        return cat?.category_group === 'error' || cat?.category_group === 'others';
    }).reduce((acc: any, curr) => {
        const label = getLabel(curr.point_type);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
    }, {});

    const errorData = Object.keys(errorStats).map(type => ({
        name: type,
        count: errorStats[type]
    })).sort((a, b) => b.count - a.count);

    // Radar Chart Data (Simplified based on groups)
    const radarData = TECHNIQUE_GROUPS.map(group => {
        const groupCatNames = categories.filter(c => group.groups.includes(c.category_group)).map(c => c.name);
        const count = logs.filter(l => groupCatNames.includes(l.point_type)).length;
        return {
            subject: `${group.icon} ${group.label}`,
            A: Math.min(100, count * 20),
            fullMark: 100
        };
    });

    const bestShot = winnerPieData[0];
    const criticalError = errorData[0];

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = outerRadius * 1.1;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill={x > cx ? "#475569" : "#475569"}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-[9px] sm:text-[11px] font-black"
            >
                {`${name.length > 8 ? name.substring(0, 7) + '..' : name} ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-xl shadow-blue-200 dark:shadow-none relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-start justify-between mb-6 sm:mb-8">
                        <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md">
                            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">Your Best Weapon</span>
                    </div>
                    <h4 className="text-blue-100/70 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">오늘의 필살기!</h4>
                    <p className="text-2xl sm:text-3xl font-black mb-2 leading-tight">
                        {bestShot ? `${bestShot.name} (${bestShot.value}점)` : '데이터 찾는 중...'}
                    </p>
                    <p className="text-xs sm:text-sm text-blue-100 font-medium">
                        {bestShot ? `이 기술 하나로 상대를 압도했어요! 칭찬해~👏` : '경기를 기록하면 너의 필살기를 알려줄게!'}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-xl shadow-rose-200 dark:shadow-none relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex items-start justify-between mb-6 sm:mb-8">
                        <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md">
                            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full backdrop-blur-md">Critical Gap</span>
                    </div>
                    <h4 className="text-rose-100/70 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">여기가 아쉬워요!</h4>
                    <p className="text-2xl sm:text-3xl font-black mb-2 leading-tight">
                        {criticalError ? `${criticalError.name} (${criticalError.count}회)` : '데이터 찾는 중...'}
                    </p>
                    <p className="text-xs sm:text-sm text-rose-100 font-medium">
                        {criticalError ? `요것만 조금 줄여도 훨씬 더 무시무시한 선수가 될 거야! 💪` : '아직까진 완벽한 모습이야! 구멍이 없어!'}
                    </p>
                </div>

                <div className="bg-slate-900 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden group md:col-span-2 lg:col-span-1 border border-slate-800">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-24 -mt-24 transition-transform group-hover:scale-110" />
                    <div className="flex items-start justify-between mb-6 sm:mb-8">
                        <div className="p-2 sm:p-3 bg-blue-500/20 text-blue-400 rounded-xl sm:rounded-2xl border border-blue-500/30">
                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">Level Up Tip</span>
                    </div>
                    <h4 className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest mb-1">코치님의 한마디</h4>
                    <p className="text-lg sm:text-xl font-bold leading-snug">
                        {bestShot && winners.length > 3
                            ? `오늘처럼만 하면 국가대표도 꿈은 아냐! '${bestShot.name}' 연습량 늘려보자!`
                            : '랠리를 더 기록해서 너만의 멋진 AI 레슨 리포트를 완성해봐!'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="mb-4 sm:mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                                <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                득점 분포 비중 (%)
                            </h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">어떤 포인트가 점수의 핵심인가요?</p>
                        </div>
                    </div>
                    <div className="h-[280px] sm:h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={winnerPieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                                    label={renderCustomizedLabel}
                                    outerRadius={window?.innerWidth < 640 ? 70 : 100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {winnerPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.15)' }}
                                    formatter={(value: any, name: any) => [`${value}회 (${((value / (winners.length || 1)) * 100).toFixed(1)}%)`, name || '기술']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="mb-4 sm:mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                                <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                                실점 분포 비중 (%)
                            </h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">어떤 실점 유형을 보강해야 할까요?</p>
                        </div>
                    </div>
                    <div className="h-[280px] sm:h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={lossPieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                                    label={renderCustomizedLabel}
                                    outerRadius={window?.innerWidth < 640 ? 70 : 100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {lossPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={ERROR_COLORS[index % ERROR_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.15)' }}
                                    formatter={(value: any, name: any) => [`${value}회 (${((value / (losses.length || 1)) * 100).toFixed(1)}%)`, name || '기술']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="mb-6 sm:mb-8">
                        <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            전술 밸런스 분석
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">나의 플레이 성향 및 능력치 육각형</p>
                    </div>
                    <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="나"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.4}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="mb-6 sm:mb-8 flex items-center justify-between">
                        <div>
                            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                기술별 득점 vs 실점
                            </h3>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic">어떤 기술이 승리의 열쇠가 되었나요?</p>
                        </div>
                    </div>

                    <div className="h-[300px] sm:h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={comparisonData}
                                layout="vertical"
                                barGap={4}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }}
                                    width={window?.innerWidth < 640 ? 80 : 120}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{
                                        borderRadius: '20px',
                                        border: 'none',
                                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                                        padding: '12px sm:padding:16px'
                                    }}
                                    itemStyle={{ fontWeight: 800, fontSize: '11px' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ paddingBottom: '10px sm:paddingBottom:20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                />
                                <Bar dataKey="득점" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={window?.innerWidth < 640 ? 10 : 16} />
                                <Bar dataKey="실점" fill="#fb7185" radius={[0, 10, 10, 0]} barSize={window?.innerWidth < 640 ? 10 : 16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 sm:mb-8">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-slate-800 shadow-sm rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-black">집집 개선 과제 (Key Focus Areas)</h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">데이터가 알려주는 오늘의 교훈</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                    <div className="space-y-4">
                        <h5 className="text-[9px] sm:text-[11px] font-black text-blue-600 uppercase tracking-widest pl-3 sm:pl-4 border-l-4 border-blue-500">Positive Feedback</h5>
                        <ul className="space-y-3">
                            {winners.length > 3 ? (
                                <>
                                    <li className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm">
                                        <span className="text-blue-500 mt-1 text-xs">✓</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">핵심 득점 경로인 **{bestShot?.name}**의 파워와 정교함이 매우 인상적입니다.</p>
                                    </li>
                                    <li className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm">
                                        <span className="text-blue-500 mt-1 text-xs">✓</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">세트 후반부에도 공격적인 전술 기조를 유지하며 경기 주도권을 놓지 않았습니다.</p>
                                    </li>
                                </>
                            ) : (
                                <li className="text-xs text-slate-400 font-medium italic">충분한 득점이 기록되면 긍정적 피드백이 생성됩니다.</li>
                            )}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[9px] sm:text-[11px] font-black text-red-600 uppercase tracking-widest pl-3 sm:pl-4 border-l-4 border-red-500">Areas for Improvement</h5>
                        <ul className="space-y-3">
                            {losses.length > 2 ? (
                                <>
                                    <li className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm">
                                        <span className="text-red-500 mt-1 text-xs">!</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">**{criticalError?.name}** 상황에서의 실점이 전체 실점의 상당 부분을 차지합니다. 안정성 확보가 필요합니다.</p>
                                    </li>
                                    <li className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm">
                                        <span className="text-red-500 mt-1 text-xs">!</span>
                                        <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">리시브 집중력이 흐트러지는 순간 상대에게 주도권을 허용하는 경향이 있습니다.</p>
                                    </li>
                                </>
                            ) : (
                                <li className="text-xs text-slate-400 font-medium italic">아직 눈에 띄는 기술적 결함이 발견되지 않았습니다.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
