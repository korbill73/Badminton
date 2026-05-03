'use client';

import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
    PieChart, Pie, Cell, Legend, LabelList,
    BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis
} from 'recharts';
import { BDPointLog } from '@/types';
import { Target, AlertTriangle, Trophy, Target as TargetIcon, TrendingUp, Zap, Server } from 'lucide-react';

interface CategoryGroup {
    group: string;
    items: string[];
}

interface SetDashboardProps {
    logs: BDPointLog[];
    setNumber: number;
    winCats: CategoryGroup[];
    lossCats: CategoryGroup[];
}

const COLORS_WIN = ['#00d2ff', '#3a7bd5', '#7f00ff', '#e100ff', '#ff00cc', '#ff0066', '#ff4b2b', '#ff416c'];
const COLORS_LOSS = ['#ff4b2b', '#ff416c', '#f7971e', '#ffd200', '#91ff00', '#00ff88', '#00dbde', '#fc00ff'];
const COLORS_PRIMARY = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#38bdf8'];

export default function SetDashboard({ logs, setNumber, winCats, lossCats }: SetDashboardProps) {

    const flowData = useMemo(() => {
        let meTotal = 0;
        let oppTotal = 0;
        const data = [{ name: 'Start', gap: 0, score: '0-0', type: '' }];
        logs.forEach((l, idx) => {
            if (l.is_my_point) meTotal++;
            else oppTotal++;
            data.push({ name: `Rally ${idx + 1}`, gap: meTotal - oppTotal, score: `${meTotal}-${oppTotal}`, type: l.point_type });
        });
        return data;
    }, [logs]);

    // 1차 카테고리 데이터
    const winPrimaryData = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.filter(l => l.is_my_point).forEach(l => {
            const pCat = winCats.find(c => c.items.includes(l.point_type))?.group || '기타';
            counts[pCat] = (counts[pCat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [logs, winCats]);

    const lossPrimaryData = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.filter(l => !l.is_my_point).forEach(l => {
            const pCat = lossCats.find(c => c.items.includes(l.point_type))?.group || '기타';
            counts[pCat] = (counts[pCat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [logs, lossCats]);

    // 2차 카테고리 데이터
    const winData = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.filter(l => l.is_my_point).forEach(l => { counts[l.point_type] = (counts[l.point_type] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [logs]);

    const lossData = useMemo(() => {
        const counts: Record<string, number> = {};
        logs.filter(l => !l.is_my_point).forEach(l => { counts[l.point_type] = (counts[l.point_type] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [logs]);

    const totalWin = winData.reduce((acc, d) => acc + d.value, 0);
    const totalLoss = lossData.reduce((acc, d) => acc + d.value, 0);
    const winRate = logs.length > 0 ? totalWin / logs.length : 0;

    const topWinTechniques = winData.slice(0, 7);
    const topLossReasons = lossData.slice(0, 7);

    const analysisText = useMemo(() => {
        if (logs.length < 5) return { strength: '데이터 수집 중', weakness: '데이터 수집 중' };
        const bestTech = winData[0];
        const worstError = lossData[0];
        let strength = bestTech ? `[${bestTech.name}] 득점이 가장 많아 확실한 무기로 작용 중입니다. (${bestTech.value}회) ` : '강력한 득점 루트를 만들고 있는 중입니다.';
        let weakness = worstError ? `[${worstError.name}] 상황에서의 실점이 뼈아픕니다. (${worstError.value}회) ` : '눈에 띄는 치명적 방어 약점은 없습니다.';
        if (worstError && worstError.name.includes('에러')) weakness += `집중력 부족에 의한 스스로의 범실을 집중적으로 통제해야 합니다.`;
        return { strength, weakness };
    }, [logs, winData, lossData]);

    if (logs.length === 0) {
        return (
            <div className="flex-1 min-h-[500px] flex items-center justify-center border-2 border-dashed border-white/10 rounded-3xl animate-in fade-in">
                <div className="text-center text-slate-500">
                    <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-black text-white/70 mb-1">{setNumber === 0 ? '전체결과' : `${setNumber}세트`} 기록 대기 중</h3>
                    <p className="text-sm">기록된 점수 데이터가 없습니다.</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="font-black text-white text-[11px] mb-1">{payload[0].payload.name}</p>
                    <p className="text-lg font-black text-blue-400">
                        {payload[0].dataKey === 'gap' ? '점수 차 : ' : ''}
                        {payload[0].value > 0 ? `+${payload[0].value}` : payload[0].value}
                    </p>
                    {payload[0].payload.score && <p className="text-[10px] text-slate-400">Score: {payload[0].payload.score}</p>}
                    {payload[0].payload.type && <p className="text-[10px] text-cyan-400">Type: {payload[0].payload.type}</p>}
                </div>
            );
        }
        return null;
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }: any) => {
        const RADIAN = Math.PI / 180;
        // Adjusted radius to stay within bounds better
        const radius = outerRadius * 1.15; 
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        if (percent < 0.05) return null; // Hide smaller slice labels for cleaner look

        return (
            <text 
                x={x} y={y} fill="white" 
                textAnchor={x > cx ? 'start' : 'end'} 
                dominantBaseline="central" 
                className="text-[9px] md:text-[11px] font-black"
            >
                {`${name} ${value}회`}
            </text>
        );
    };

    return (
        <div id="dashboard-capture-zone" className="space-y-6 md:space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto w-full bg-[#080d1a] px-3 md:px-8 py-6 md:pt-8 rounded-[1.5rem] md:rounded-[3rem]">
            {/* Header Title */}
            <div className="flex items-center gap-2 md:gap-3 border-b border-white/10 pb-4 md:pb-6 px-1">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                <h2 className="text-xl md:text-3xl font-black text-white tracking-widest drop-shadow-sm">{setNumber === 0 ? '전체 세트' : `${setNumber}세트`} 정밀 리포트</h2>
                <span className="hidden md:inline-block text-[12px] font-black text-blue-300 ml-4 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full">Automated Insight</span>
            </div>

            {/* Smart Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="bg-[#0f172a] border border-blue-500/20 p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col gap-2 md:gap-3 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-4 right-4 p-4 opacity-10"><TargetIcon className="w-16 h-16 md:w-24 md:h-24 text-blue-400" /></div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-300" />
                        <span className="text-[11px] md:text-[13px] font-black tracking-widest text-blue-300 uppercase underline decoration-blue-500/50 decoration-2 md:decoration-4 underline-offset-4">최강 득점 무기 (STRENGTH)</span>
                    </div>
                    <p className="text-white text-sm md:text-lg font-bold leading-relaxed pr-8 relative z-10">{analysisText.strength}</p>
                </div>
                <div className="bg-[#0f172a] border border-rose-500/20 p-5 md:p-8 rounded-2xl md:rounded-3xl flex flex-col gap-2 md:gap-3 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-4 right-4 p-4 opacity-10"><AlertTriangle className="w-16 h-16 md:w-24 md:h-24 text-rose-400" /></div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-rose-300" />
                        <span className="text-[11px] md:text-[13px] font-black tracking-widest text-rose-300 uppercase underline decoration-rose-500/50 decoration-2 md:decoration-4 underline-offset-4">치명적 실점 루트 (WEAKNESS)</span>
                    </div>
                    <p className="text-white text-sm md:text-lg font-bold leading-relaxed pr-8 relative z-10">{analysisText.weakness}</p>
                </div>
            </div>

            {/* 1차 카테고리 DONUTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-[#0b1221]/80 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <Server className="w-5 h-5 md:w-6 md:h-6 text-blue-300" />
                        <h3 className="text-lg md:text-xl font-black text-blue-100 italic tracking-tighter">1차 카테고리 분석 (WIN)</h3>
                    </div>
                    <div className="flex-1 w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center relative">
                        {winPrimaryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                                    <Pie data={winPrimaryData} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={true}>
                                        {winPrimaryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[index % COLORS_PRIMARY.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-slate-500 text-sm">데이터가 없습니다.</p>}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                            <span className="text-3xl md:text-5xl font-black text-white">{totalWin}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0b1221]/80 border border-white/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <Server className="w-5 h-5 md:w-6 md:h-6 text-rose-300" />
                        <h3 className="text-lg md:text-xl font-black text-rose-100 italic tracking-tighter">1차 카테고리 분석 (LOSS)</h3>
                    </div>
                    <div className="flex-1 w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center relative">
                        {lossPrimaryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                                    <Pie data={lossPrimaryData} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={true}>
                                        {lossPrimaryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_PRIMARY[(index + 4) % COLORS_PRIMARY.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-slate-500 text-sm">데이터가 없습니다.</p>}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                            <span className="text-3xl md:text-5xl font-black text-white">{totalLoss}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2차 카테고리 DONUTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                {/* Win Donut */}
                <div className="bg-[#0b1221] border border-blue-500/20 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-5 h-5 md:w-6 md:h-6 text-cyan-300" />
                        <h3 className="text-lg md:text-xl font-black text-cyan-50 italic tracking-tighter">2차 카테고리 정밀 기술 (WIN)</h3>
                    </div>
                    <div className="flex-1 w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center relative">
                        {winData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                                    <Pie data={winData} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={true}>
                                        {winData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_WIN[index % COLORS_WIN.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-slate-500 text-sm">득점 데이터가 없습니다.</p>}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                            <span className="text-3xl md:text-5xl font-black text-white">{totalWin}</span>
                        </div>
                    </div>
                </div>

                {/* Loss Donut */}
                <div className="bg-[#0b1221] border border-rose-500/20 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 w-full">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-rose-300" />
                        <h3 className="text-lg md:text-xl font-black text-rose-50 italic tracking-tighter">2차 카테고리 정밀 에러 (LOSS)</h3>
                    </div>
                    <div className="flex-1 w-full min-h-[300px] md:min-h-[400px] flex items-center justify-center relative">
                        {lossData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                                    <Pie data={lossData} innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={true}>
                                        {lossData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_LOSS[index % COLORS_LOSS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-slate-500 text-sm">실점 데이터가 없습니다.</p>}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-1">
                            <span className="text-3xl md:text-5xl font-black text-white">{totalLoss}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BAR CHARTS WITH PERCENTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-[#0b1221] border border-blue-500/20 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 min-h-[350px] md:min-h-[400px]">
                    <h3 className="text-lg md:text-2xl font-black text-blue-300 tracking-widest uppercase text-center drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">최상위 득점 무기 랭킹</h3>
                    <div className="flex-1 min-h-[250px] md:min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topWinTechniques} layout="vertical" margin={{ top: 10, right: 70, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                <BarXAxis type="number" hide />
                                <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#ffffff90', fontSize: 11, fontWeight: 800 }} width={80} />
                                <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={22}>
                                    <LabelList 
                                        dataKey="value" 
                                        position="right" 
                                        formatter={(val: any) => `${val}회 (${totalWin > 0 ? ((Number(val) / totalWin) * 100).toFixed(0) : '0'}%)`}
                                        fill="#94a3b8" fontSize={11} fontWeight={900} 
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#0b1221] border border-rose-500/20 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 min-h-[350px] md:min-h-[400px]">
                    <h3 className="text-lg md:text-2xl font-black text-rose-300 tracking-widest uppercase text-center drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">주요 실점 에러 랭킹</h3>
                    <div className="flex-1 min-h-[250px] md:min-h-[300px]">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={topLossReasons} layout="vertical" margin={{ top: 10, right: 70, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                <BarXAxis type="number" hide />
                                <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#ffffff90', fontSize: 11, fontWeight: 800 }} width={80} />
                                <RechartsTooltip cursor={{fill: '#ffffff05'}} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                                <Bar dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={22}>
                                    <LabelList 
                                        dataKey="value" 
                                        position="right" 
                                        formatter={(val: any) => `${val}회 (${totalLoss > 0 ? ((Number(val) / totalLoss) * 100).toFixed(0) : '0'}%)`}
                                        fill="#94a3b8" fontSize={11} fontWeight={900} 
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* FLOW GRAPH FULL WIDTH */}
            <div className="bg-[#0b1221] border border-white/5 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl flex flex-col gap-4 md:gap-6 min-h-[350px] md:min-h-[400px]">
                <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-black text-white tracking-widest">MATCH MOMENTUM (점수차 흐름)</h3>
                </div>
                <div className="flex-1 w-full min-h-[300px] md:min-h-[350px]">
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={flowData} margin={{ top: 30, right: 30, left: 0, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff30" fontSize={11} tickCount={10} minTickGap={30} />
                            <BarYAxis stroke="#ffffff60" fontSize={11} tickFormatter={(val) => val > 0 ? `+${val}` : val} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <ReferenceLine y={0} stroke="#ffffff30" strokeWidth={2} />
                            <Line 
                                type="stepAfter" 
                                dataKey="gap" 
                                stroke="#22d3ee" 
                                strokeWidth={3} 
                                dot={(props: any) => {
                                    const { cx, cy, value } = props;
                                    if (value === undefined) return null;
                                    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={value >= 0 ? '#3b82f6' : '#f43f5e'} stroke="none" />;
                                }}
                            >
                                <LabelList 
                                    dataKey="gap" 
                                    position="top" 
                                    offset={10}
                                    formatter={(val: any) => val > 0 ? `+${val}` : val}
                                    fill="#e2e8f0" 
                                    fontSize={10} 
                                    fontWeight={800} 
                                />
                            </Line>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
