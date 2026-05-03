'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Shield, HeartPulse, Target, Flame, Loader2, Info, Star, Activity, Brain, Award, Zap, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function PerformancePage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchAndCalculate = async () => {
            try {
                const { data: logs } = await supabase
                    .from('bd_point_logs')
                    .select('match_id, created_at, point_type, is_my_point, current_score')
                    .order('created_at', { ascending: false });

                if (!logs || logs.length === 0) {
                    setLoading(false);
                    return;
                }

                // 1. Core Score Calculation Logic
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const recentLogs = logs.filter(l => new Date(l.created_at) >= thirtyDaysAgo);

                const calcMetrics = (dataSet: any[]) => {
                    const total = dataSet.length || 1;
                    const winners = dataSet.filter(l => l.is_my_point);
                    const losers = dataSet.filter(l => !l.is_my_point);

                    // Attack: Smash/Push/Drive Win Ratio
                    const offensiveWins = winners.filter(l => l.point_type?.match(/스매시|푸시|드라이브|킬/));
                    const attack = Math.min(100, Math.round((offensiveWins.length / (winners.length || 1)) * 100 * 1.4));

                    // Defense: Stability (Low error rate)
                    const errors = losers.filter(l => l.point_type?.includes('실수'));
                    const defense = Math.max(0, 100 - Math.round((errors.length / total) * 100 * 2.5));

                    // Skill: Tactical variety
                    const uniqueSkills = new Set(winners.map(l => l.point_type)).size;
                    const skill = Math.min(100, Math.round((uniqueSkills / 8) * 100));

                    // Mental: Clutch performance (Points >= 18 or Tie-breaks)
                    const clutchLogs = dataSet.filter(l => {
                        const [m, o] = (l.current_score || '0-0').split('-').map(Number);
                        return m >= 18 || o >= 18;
                    });
                    const mental = clutchLogs.length > 0 ? Math.round((clutchLogs.filter(l => l.is_my_point).length / clutchLogs.length) * 100) : 50;

                    // Stamina: Rally intensity
                    const matchIds = new Set(dataSet.map(l => l.match_id));
                    const stamina = Math.min(100, Math.round((total / (matchIds.size || 1) / 35) * 100));

                    return { attack, defense, skill, mental, stamina, totalCount: total };
                };

                const recent = calcMetrics(recentLogs);
                const allTime = calcMetrics(logs);

                // 2. Player Rank Calculation
                const avgScore = (recent.attack + recent.defense + recent.skill + recent.mental + recent.stamina) / 5;
                let rank = 'C';
                let rankColor = 'text-slate-400';
                let rankGlow = 'rgba(148, 163, 184, 0.5)';
                if (avgScore >= 85) { rank = 'S'; rankColor = 'text-yellow-400'; rankGlow = 'rgba(234, 179, 8, 0.5)'; }
                else if (avgScore >= 70) { rank = 'A'; rankColor = 'text-blue-400'; rankGlow = 'rgba(59, 130, 246, 0.5)'; }
                else if (avgScore >= 55) { rank = 'B'; rankColor = 'text-emerald-400'; rankGlow = 'rgba(16, 185, 129, 0.5)'; }

                // 3. AI Prescription
                let prescription = { title: '안정적인 훈련기', msg: '현재 밸런스가 좋습니다. 기본기 위주의 루틴을 유지하세요.', icon: <Zap className="w-6 h-6" /> };
                if (recent.defense < 45) prescription = { title: '실책 완화 집중 훈련', msg: '공격보다 수비 안정성이 시급합니다. 하단 리시브 및 클리어 정확도 훈련이 필요합니다.', icon: <Shield className="w-6 h-6 text-rose-500" /> };
                else if (recent.attack < 45) prescription = { title: '공격 패턴 다양화', msg: '득점 결정력이 부족합니다. 스매시 각도 조절 및 푸시 타이밍 훈련을 권장합니다.', icon: <Flame className="w-6 h-6 text-orange-500" /> };
                else if (recent.stamina < 45) prescription = { title: '체력 보강 단계', msg: '경기 후반 집중력이 크게 저하됩니다. 인터벌 풋워크 및 하체 강화 훈련을 병행하세요.', icon: <Activity className="w-6 h-6 text-emerald-500" /> };

                // 4. Fatigue (7 days)
                const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const last7DaysCount = logs.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
                const fatigue = Math.min(100, Math.round((last7DaysCount / 120) * 100));

                setStats({ recent, allTime, rank, rankColor, rankGlow, avgScore, prescription, fatigue, logsCount: logs.length });
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };
        fetchAndCalculate();
    }, []);

    const radarData = useMemo(() => {
        if (!stats) return [];
        return [
            { subject: 'Stamina', A: stats.recent.stamina, B: stats.allTime.stamina },
            { subject: 'Attack', A: stats.recent.attack, B: stats.allTime.attack },
            { subject: 'Defense', A: stats.recent.defense, B: stats.allTime.defense },
            { subject: 'Skill', A: stats.recent.skill, B: stats.allTime.skill },
            { subject: 'Mental', A: stats.recent.mental, B: stats.allTime.mental },
        ];
    }, [stats]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
            <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <Activity className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <p className="text-xl font-black text-slate-400 italic animate-pulse">AI 코칭 엔진이 데이터를 분석 중입니다...</p>
        </div>
    );

    if (!stats) return <div className="p-20 text-center font-bold text-slate-500 flex flex-col items-center gap-4">
        <Info className="w-12 h-12" />
        분석할 데이터가 부족합니다. 경기를 기록해 주세요!
    </div>;

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            {/* AI Top Rank & Message Section */}
            <div className="relative p-1 rounded-[3rem] bg-gradient-to-br from-blue-600/30 via-slate-800 to-indigo-600/30">
                <div className="bg-[#0f172a] rounded-[2.9rem] p-8 md:p-12 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] -mr-40 -mt-40 rounded-full" />
                    
                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="space-y-6 text-center md:text-left flex-1">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 font-black text-sm tracking-widest uppercase mb-2">
                                <Award className="w-4 h-4" /> AI Performance Report
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                                현재 <span className={cn("inline-block", stats.rankColor)}>{stats.rank} 랭크</span> 등급입니다.
                            </h1>
                            <p className="text-xl md:text-2xl font-bold text-slate-400 leading-relaxed max-w-2xl">
                                {stats.logsCount}개의 랠리 분석 결과, <br className="hidden md:block" />
                                <span className="text-white">{stats.prescription.title}</span>이 가장 필요한 시점입니다.
                            </p>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-bold text-slate-300">최근 30일 데이터 분석 완료</span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 relative group">
                            <div className="absolute inset-0 bg-white/5 rounded-[4rem] rotate-6 scale-95 group-hover:rotate-3 group-hover:scale-100 transition-all duration-500" />
                            <div className="relative w-48 h-48 md:w-64 md:h-64 bg-slate-900 border-2 border-white/10 rounded-[3.5rem] flex flex-col items-center justify-center shadow-2xl overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
                                <div className={cn("text-[100px] md:text-[140px] font-black italic tracking-tighter mt-4", stats.rankColor)} style={{ textShadow: `0 0 40px ${stats.rankGlow}` }}>
                                    {stats.rank}
                                </div>
                                <div className="bg-white/5 w-full py-3 text-center border-t border-white/5">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Player Capacity</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Coaching Prescription Card */}
            <div className="relative group overflow-hidden rounded-[2.5rem] border border-blue-500/30 bg-[#0f172a] shadow-[0_0_50px_rgba(37,99,235,0.1)]">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-cyan-600/5 to-transparent" />
                <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="w-24 h-24 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.6)] shrink-0">
                        {stats.prescription.icon}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <Brain className="w-8 h-8 text-cyan-400" />
                            <span className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">AI Coaching Prescription</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white">
                            오늘의 추천 훈련: <span className="text-cyan-400">{stats.prescription.title}</span>
                        </h2>
                        <p className="text-lg md:text-xl font-bold text-slate-300 leading-snug">
                            {stats.prescription.msg}
                        </p>
                    </div>
                    <button className="whitespace-nowrap px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black text-lg transition-all flex items-center gap-3 border border-white/10 active:scale-95">
                        상세 훈련법 <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Advanced Radar Analysis */}
                <div className="lg:col-span-1 bg-[#1e293b]/20 p-8 md:p-10 rounded-[3rem] border border-white/5 flex flex-col items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6">
                        <Star className="w-10 h-10 text-yellow-500/20" />
                    </div>
                    <h3 className="text-2xl font-black mb-10 flex items-center gap-3 text-white self-start">
                        <Zap className="w-6 h-6 text-yellow-400" />
                        종합 성능 지표
                    </h3>
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#334155" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: '900' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar 
                                    name="Recent" 
                                    dataKey="A" 
                                    stroke="#3b82f6" 
                                    fill="#3b82f6" 
                                    fillOpacity={0.6} 
                                    strokeWidth={4} 
                                    animationDuration={1500}
                                />
                                <Radar 
                                    name="Avg" 
                                    dataKey="B" 
                                    stroke="#475569" 
                                    fill="#475569" 
                                    fillOpacity={0.1} 
                                    strokeWidth={2} 
                                    animationDuration={1500}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontWeight: '900' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Biological & Risk Dashboard */}
                <div className="lg:col-span-2 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Fatigue Biological Monitor */}
                        <div className="bg-[#1e293b]/20 p-8 md:p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                           <div className="flex justify-between items-start">
                                <h3 className="text-xl font-black flex items-center gap-3 text-white">
                                    <Activity className="w-6 h-6 text-rose-500" />
                                    단기 신체 부하
                                </h3>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border",
                                    stats.fatigue > 75 
                                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]" 
                                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                )}>
                                    {stats.fatigue > 75 ? "OVERLOAD DETECTED" : "RECOVERED STATUS"}
                                </div>
                           </div>
                           
                           <div className="py-12 flex items-center justify-center relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={cn(
                                        "w-32 h-32 rounded-full opacity-20 blur-3xl animate-pulse transition-colors",
                                        stats.fatigue > 75 ? "bg-rose-500" : "bg-blue-500"
                                    )} />
                                </div>
                                <div className="text-8xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                    {stats.fatigue}%
                                </div>
                           </div>

                           <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/5">
                                <p className="text-sm font-bold text-slate-400 italic leading-relaxed">
                                    <Info className="w-4 h-4 inline-block mr-2 text-blue-400" />
                                    {stats.fatigue > 75 
                                        ? "부상 위험이 높은 상태입니다. 오늘은 고강도 스매시 훈련을 삼가세요."
                                        : "신체 컨디션이 매우 양호합니다. 주력 기술의 강도를 높여 훈련하기 좋습니다."}
                                </p>
                           </div>
                        </div>

                        {/* AI Injury Risk Panel */}
                        <div className="bg-[#1e293b]/20 p-8 md:p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
                            <h3 className="text-xl font-black flex items-center gap-3 text-white mb-10">
                                <Shield className="w-6 h-6 text-indigo-500" />
                                부위별 부상 경고 (AI 추정)
                            </h3>
                            
                            <div className="space-y-8">
                                <RiskItem 
                                    label="어깨/팔꿈치 부하 (Shoulder)" 
                                    value={stats.recent.attack > 70 ? 85 : 42} 
                                    color={stats.recent.attack > 70 ? "rose" : "blue"} 
                                />
                                <RiskItem 
                                    label="하체/무릎 피로 (Lower Body)" 
                                    value={stats.recent.stamina > 70 ? 76 : 28} 
                                    color={stats.recent.stamina > 70 ? "orange" : "blue"} 
                                />
                                <RiskItem 
                                    label="코어/집중력 안정성 (Core)" 
                                    value={stats.recent.defense} 
                                    color="blue" 
                                    inverse
                                />
                            </div>

                            <div className="mt-10 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                    <Brain className="w-4 h-4 text-blue-500/50" />
                                    사용자의 플레이 스타일 패턴 분석에 기반한 결과입니다.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RiskItem({ label, value, color, inverse = false }: { label: string, value: number, color: 'blue' | 'orange' | 'rose', inverse?: boolean }) {
    const isWarning = inverse ? value < 40 : value > 75;
    const barColor = isWarning ? (color === "blue" ? "bg-rose-500" : `bg-${color}-500`) : "bg-blue-500";
    
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <span className={cn("text-sm font-black tabular-nums", isWarning ? "text-rose-400" : "text-white")}>
                    {value}% {isWarning && "(위험)"}
                </span>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                <div 
                    className={cn("h-full transition-all duration-1000 ease-out", barColor)} 
                    style={{ width: `${value}%` }} 
                />
            </div>
        </div>
    );
}
