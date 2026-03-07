'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'recharts';
import { BDPointLog } from '@/types';
import {
    Zap,
    Shield,
    Target,
    Clock,
    Layers,
    ArrowRightCircle,
    CheckCircle2,
    AlertCircle,
    Compass,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TacticalDashboardProps {
    logs: BDPointLog[];
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
}

export default function TacticalDashboard({ logs }: TacticalDashboardProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedSet, setSelectedSet] = useState<'total' | number | 'compare'>('total');

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('bd_point_categories').select('*');
            if (!error && data) setCategories(data);
        };
        fetchCategories();
    }, []);

    const calculateMetrics = (data: BDPointLog[]) => {
        const winners = data.filter(l => l.is_my_point);
        const losses = data.filter(l => !l.is_my_point);
        const total = data.length;
        if (total === 0) return null;

        const getCatGroup = (name: string) => categories.find(c => c.name === name)?.category_group || 'others';

        // PI Calculation
        const offensiveWinners = winners.filter(l => getCatGroup(l.point_type) === 'offensive');
        const powerPI = (offensiveWinners.length / (winners.length || 1)) * 100;

        const unforcedErrors = losses.filter(l => getCatGroup(l.point_type) === 'error');
        const stabilityPI = ((total - unforcedErrors.length) / total) * 100;

        const tacticalWinners = winners.filter(l => getCatGroup(l.point_type) === 'tactical');
        const tacticalLosses = losses.filter(l => getCatGroup(l.point_type) === 'tactical');
        const controlPI = (tacticalWinners.length / (tacticalWinners.length + tacticalLosses.length || 1)) * 100;

        const clutchLogs = data.filter(l => {
            const [me, opp] = (l.current_score || '0-0').split('-').map(Number);
            return (me >= 15 || opp >= 15);
        });
        const clutchWinners = clutchLogs.filter(l => l.is_my_point);
        const clutchPI = (clutchWinners.length / (clutchLogs.length || 1)) * 100;

        const uniqueWinningTypes = new Set(winners.map(l => l.point_type)).size;
        const varietyPI = Math.min(100, (uniqueWinningTypes / 6) * 100);

        // Shot Efficiency
        const shotTypes = ['스매시', '드롭', '헤어핀', '드라이브', '네트킬'];
        const efficiencyData = shotTypes.map(type => {
            const typeWinners = winners.filter(l => l.point_type.includes(type)).length;
            // 유저의 직접적인 실수만 필터링 (명칭에 실수가 포함되거나, 걸림/아웃 등 범실성 키워드 매칭)
            // '피습' (상대 공격에 당함)은 나의 시도 횟수에서 제외
            const typeErrors = losses.filter(l =>
                l.point_type.includes(type) &&
                (l.point_type.includes('실수') || l.point_type.includes('아웃') || l.point_type.includes('걸림') || l.point_type.includes('실패')) &&
                !l.point_type.includes('피습')
            ).length;

            const totalAttempts = typeWinners + typeErrors;
            const successRate = (typeWinners / (totalAttempts || 1)) * 100;
            return {
                name: type,
                rate: Math.round(successRate),
                winners: typeWinners,
                errors: typeErrors,
                attempts: totalAttempts
            };
        }).filter(d => d.attempts > 0).sort((a, b) => b.attempts - a.attempts);


        // Phase Performance
        const getPhase = (score: string) => {
            const [me, opp] = (score || '0-0').split('-').map(Number);
            const max = Math.max(me, opp);
            if (max <= 10) return '경기 초반 (0-10점)';
            if (max <= 15) return '경기 중반 (11-15점)';
            return '경기 후반 (16점~)';
        };
        const phases = ['경기 초반 (0-10점)', '경기 중반 (11-15점)', '경기 후반 (16점~)'];
        const phaseData = phases.map(p => {
            const phaseLogs = data.filter(l => getPhase(l.current_score) === p);
            const pWinners = phaseLogs.filter(l => l.is_my_point).length;
            const pTotal = phaseLogs.length;
            return { name: p, winRate: pTotal > 0 ? Math.round((pWinners / pTotal) * 100) : 0, total: pTotal };
        });

        // Momentum Streak
        let maxWinStreak = 0;
        let currentStreak = 0;
        data.forEach(l => {
            if (l.is_my_point) {
                currentStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });

        const bestShot = [...efficiencyData].sort((a, b) => b.rate - a.rate)[0];
        const mostError = [...efficiencyData].sort((a, b) => b.errors - a.errors)[0];

        return {
            radar: [
                { subject: '공격력', value: Math.round(powerPI), fullMark: 100, icon: <Zap className="w-3 h-3" /> },
                { subject: '정교함', value: Math.round(controlPI), fullMark: 100, icon: <Compass className="w-3 h-3" /> },
                { subject: '안정성', value: Math.round(stabilityPI), fullMark: 100, icon: <Shield className="w-3 h-3" /> },
                { subject: '위기관리', value: Math.round(clutchPI), fullMark: 100, icon: <Clock className="w-3 h-3" /> },
                { subject: '기술 다양성', value: Math.round(varietyPI), fullMark: 100, icon: <Layers className="w-3 h-3" /> },
            ],
            efficiency: efficiencyData,
            phase: phaseData,
            winStreak: maxWinStreak,
            totalPoints: total,
            winPoints: winners.length,
            lossPoints: losses.length,
            swot: {
                strength: bestShot ? `압도적인 성과를 내는 <strong>'${bestShot.name}'</strong>이(가) 당신의 핵심 엔진입니다. 이 기술을 활용한 랠리 주도권 확보가 주효했습니다.` : '충분한 경기 데이터가 필요합니다.',
                weakness: mostError && mostError.errors > 2 ? `<strong>'${mostError.name}'</strong> 시도 중 발생하는 범실이 전체 실점의 주요 원인입니다. 타점 위치와 스윙 궤적 재점검을 권장합니다.` : '현재 큰 기술적 약점은 보이지 않습니다.',
                opportunity: clutchPI < 40 ? '경기 후반(15점 이후) 집중력이 다소 떨어집니다. 인터벌 이후의 체력 및 멘탈 관리가 요구됩니다.' : '후반 집중력이 매우 탁월합니다. 경기 초반 안정적인 운영으로 기세만 유지한다면 승률이 대폭 상승할 것입니다.',
                threat: stabilityPI < 60 ? '비강제 범실(UE) 비중이 위험 수준입니다. 무리한 공격 시도보다는 정확한 코스로의 연결구가 우선되어야 합니다.' : '현재 매우 안정적인 경기력을 유지하고 있습니다. 큰 전술적 위협 요소가 없습니다.'
            }
        };
    };

    const currentData = useMemo(() => {
        if (selectedSet === 'total') return calculateMetrics(logs);
        if (typeof selectedSet === 'number') return calculateMetrics(logs.filter(l => l.set_number === selectedSet));
        return null;
    }, [logs, selectedSet, categories]);

    const compareMetrics = useMemo(() => {
        if (selectedSet !== 'compare') return null;
        const availableSets = Array.from(new Set(logs.map(l => l.set_number))).sort((a, b) => a - b);
        return availableSets.map(s => ({
            setNumber: s,
            metrics: calculateMetrics(logs.filter(l => l.set_number === s))
        })).filter(s => s.metrics !== null);
    }, [logs, selectedSet, categories]);

    if (logs.length < 3) {
        return (
            <div className="h-[400px] w-full bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center" id="tactical-empty-state">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">전술 분석 대기 중</h3>
                <p className="text-sm text-slate-500 max-w-[280px]">의미 있는 분석을 위해 최소 3개 이상의 랠리를 기록해 주세요. 세트별 비교 분석이 활성화됩니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Control Panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-2 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-1">
                    {(['total', 1, 2, 3, 'compare'] as const).map(tab => {
                        const isAvailable = tab === 'total' || tab === 'compare' || logs.some(l => l.set_number === tab);
                        if (!isAvailable) return null;

                        return (
                            <button
                                key={tab}
                                onClick={() => setSelectedSet(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black transition-all",
                                    selectedSet === tab
                                        ? "bg-slate-900 text-white shadow-lg"
                                        : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                            >
                                {tab === 'total' ? '전체 분석' : tab === 'compare' ? '세트 비교' : `${tab}세트`}
                            </button>
                        );
                    })}
                </div>
                {selectedSet !== 'compare' && currentData && (
                    <div className="flex items-center gap-4 px-4 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                        <span>득점: <span className="text-blue-500">{currentData.winPoints}</span></span>
                        <span>실점: <span className="text-rose-500">{currentData.lossPoints}</span></span>
                        <div className="h-3 w-px bg-slate-200" />
                        <span>승률: <span className="text-slate-900 dark:text-white">{Math.round((currentData.winPoints / currentData.totalPoints) * 100)}%</span></span>
                    </div>
                )}
            </div>

            {selectedSet === 'compare' && compareMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {compareMetrics.map((item) => (
                        <div key={item.setNumber} className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-black text-slate-900 dark:text-white">{item.setNumber}세트 전술 분석</h3>
                                <span className="text-[10px] font-bold text-blue-500">{Math.round((item.metrics!.winPoints / item.metrics!.totalPoints) * 100)}% 승률</span>
                            </div>
                            <div className="h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={item.metrics!.radar}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 800 }} />
                                        <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            ) : currentData && (
                <>
                    {/* AI Coaching Card */}
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                    <Sparkles className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black tracking-tight">AI 전략 코칭 리포트 ({selectedSet === 'total' ? '전체' : `${selectedSet}세트`})</h2>
                                    <p className="text-xs text-slate-400 font-medium">데이터가 분석한 당신의 전문 전술 프로필</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">장점 (Strength)</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentData.swot.strength }} />
                                    </div>
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-4 h-4 text-rose-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">약점 (Weakness)</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentData.swot.weakness }} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="w-4 h-4 text-blue-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">기회 (Opportunity)</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 leading-relaxed">{currentData.swot.opportunity}</p>
                                    </div>
                                    <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <ArrowRightCircle className="w-4 h-4 text-orange-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">위험 (Threat)</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 leading-relaxed">{currentData.swot.threat}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Radar PI */}
                        <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                            <div className="mb-8">
                                <h3 className="text-lg font-black flex items-center gap-2 text-slate-950 dark:text-white">
                                    <Compass className="w-5 h-5 text-blue-600" />
                                    전술 밸런스 분석
                                </h3>
                                <p className="text-xs text-slate-500 font-medium italic">5대 핵심 성과 지표 분석</p>
                            </div>
                            <div className="h-[280px] w-full flex items-center justify-center flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={currentData.radar}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="지표" dataKey="value" stroke="#3b82f6" fill="#3b82f6" strokeWidth={3} fillOpacity={0.2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Shot Efficiency */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="mb-8 flex items-center justify-between">
                                <h3 className="text-lg font-black flex items-center gap-2 text-slate-950 dark:text-white">
                                    <Zap className="w-5 h-5 text-blue-600" />
                                    기술별 득점 성공률 및 시도 횟수
                                </h3>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-400 block mb-1">최다 연속 득점</span>
                                    <span className="text-xl font-black text-emerald-500 underline decoration-emerald-500/20 underline-offset-4">{currentData.winStreak} 점</span>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={currentData.efficiency} layout="vertical" margin={{ left: -20, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 900 }} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 shadow-2xl text-white">
                                                            <p className="text-xs font-black mb-1">{d.name}</p>
                                                            <p className="text-[10px] text-blue-300">득점 성공: {d.winners}회 / 전체 시도: {d.attempts}회</p>
                                                            <div className="mt-2 pt-2 border-t border-white/10">
                                                                <p className="text-sm font-black text-white">성공 확률: {d.rate}%</p>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar
                                            dataKey="rate"
                                            radius={[0, 20, 20, 0]}
                                            barSize={24}
                                            label={(labelProps: any) => {
                                                const { x, y, width, value, payload } = labelProps;
                                                if (!payload) return null;
                                                return (
                                                    <text x={x + width + 5} y={y + 16} fill="#64748b" fontSize={10} fontWeight={800}>
                                                        {payload.winners}/{payload.attempts}회 ({value}%)
                                                    </text>
                                                );
                                            }}
                                        >
                                            {currentData.efficiency.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.rate > 60 ? '#3b82f6' : entry.rate > 40 ? '#6366f1' : '#94a3b8'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Phase Performance & Momentum */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800">
                            <h3 className="text-[10px] font-black mb-6 uppercase tracking-widest text-slate-400">경기 구간별 성공률</h3>
                            <div className="space-y-6">
                                {currentData.phase.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-32 text-[10px] font-black text-slate-500 uppercase">{p.name}</div>
                                        <div className="flex-1 h-3 bg-white dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <div className={cn("h-full transition-all duration-1000", p.winRate > 50 ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-slate-400")} style={{ width: `${p.winRate}%` }} />
                                        </div>
                                        <div className="w-12 text-right text-xs font-black text-slate-700 dark:text-slate-200">{p.winRate}%</div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6 text-[11px] text-slate-400 font-medium italic">*각 구간별 점수 획득률을 통해 경기 운영 능력을 평가합니다.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                            <div className="flex items-start gap-4 mb-8">
                                <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20">
                                    <Zap className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white">경기 흐름 지배력</h4>
                                    <p className="text-xs text-slate-500 font-medium">경기를 지배하는 연속 득점의 파괴력</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">최다 연속 득점</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{currentData.winStreak}<span className="text-sm ml-1 text-slate-400">점</span></p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">경기 영향 지수</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{(currentData.winPoints / (currentData.winPoints + (currentData.winStreak || 1))).toFixed(1)}<span className="text-sm ml-1 text-slate-400">x</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
