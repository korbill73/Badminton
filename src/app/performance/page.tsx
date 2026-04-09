'use client';

import React, { useState, useEffect } from 'react';
import { Shield, HeartPulse, Target, Flame, Loader2, Info } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { BDPointLog } from '@/types';

export default function PerformancePage() {
    const [loading, setLoading] = useState(true);
    const [radarData, setRadarData] = useState<any[]>([]);
    const [staminaData, setStaminaData] = useState<any[]>([]);
    const [fatigueInfo, setFatigueInfo] = useState({ score: 0, status: 'NORMAL', message: '' });
    const [injuryRisks, setInjuryRisks] = useState<any[]>([]);
    const [intensityTrend, setIntensityTrend] = useState({ percent: 0, isUp: true });

    useEffect(() => {
        const fetchAndCalculate = async () => {
            try {
                // Fetch recent logs (Last 30 days vs All Time for radar)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: logs } = await supabase
                    .from('bd_point_logs')
                    .select('match_id, created_at, point_type, is_my_point, current_score')
                    .order('created_at', { ascending: false });

                if (!logs) {
                    setLoading(false);
                    return;
                }

                // 1. 피로도 / 회복 지수 (Last 7 Days Rally Count)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const last7DaysLogs = logs.filter(l => new Date(l.created_at) >= sevenDaysAgo);

                // Max standard threshold ~ 150 rallies per week for amateur high intensity
                let fatigueScore = Math.min(100, Math.round((last7DaysLogs.length / 150) * 100));
                let status = 'NORMAL';
                let message = '적절한 훈련량을 유지 중입니다. 기술 훈련 위주의 세션을 권장합니다.';

                if (fatigueScore > 80) {
                    status = 'OVERLOAD';
                    message = '최근 경기 라운드가 매우 많습니다. 근육 회복을 위해 최소 24시간의 완전 휴식을 강력히 권장합니다.';
                } else if (fatigueScore < 30) {
                    status = 'RECOVERED';
                    message = '완전히 회복된 상태입니다. 고강도 스매시 훈련이나 체력 훈련을 실시하기 좋은 타이밍입니다.';
                }

                setFatigueInfo({ score: fatigueScore, status, message });

                // 2. 최근 훈련 강도 (Bar Chart for Last 4 Weeks)
                const weeksData = [
                    { name: '4주 전', value: 0 },
                    { name: '3주 전', value: 0 },
                    { name: '2주 전', value: 0 },
                    { name: '이번 주', value: 0 },
                ];

                const now = new Date();
                logs.forEach(l => {
                    const logDate = new Date(l.created_at);
                    const diffTime = Math.abs(now.getTime() - logDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays <= 7) weeksData[3].value++;
                    else if (diffDays <= 14) weeksData[2].value++;
                    else if (diffDays <= 21) weeksData[1].value++;
                    else if (diffDays <= 28) weeksData[0].value++;
                });

                setStaminaData(weeksData);

                const currentWeek = weeksData[3].value;
                const prevWeek = weeksData[2].value;
                let trendPercent = 0;
                if (prevWeek > 0) trendPercent = Math.round(((currentWeek - prevWeek) / prevWeek) * 100);
                else if (currentWeek > 0) trendPercent = 100;

                setIntensityTrend({ percent: Math.abs(trendPercent), isUp: trendPercent >= 0 });

                // 3. 종합 퍼포먼스 레이더 (Recent 30 Days vs All Time Base)
                const recentLogs = logs.filter(l => new Date(l.created_at) >= thirtyDaysAgo);

                const calcRadar = (dataSet: any[]) => {
                    const total = dataSet.length || 1;
                    const winners = dataSet.filter(l => l.is_my_point);

                    // Attack: 공격 성공률 (Offensive group)
                    const offensiveWins = winners.filter(l => l.point_type?.includes('스매시') || l.point_type?.includes('푸시') || l.point_type?.includes('드라이브'));
                    const attackScore = Math.min(100, Math.round((offensiveWins.length / (winners.length || 1)) * 100 * 1.5)); // x1.5 weight

                    // Defense: 100 - Unforced Error Rate
                    const unforcedErrors = dataSet.filter(l => !l.is_my_point && l.point_type?.includes('실수'));
                    const defenseScore = Math.max(0, 100 - Math.round((unforcedErrors.length / total) * 100 * 2));

                    // Skill: Unique winning types variety
                    const uniqueSkills = new Set(winners.map(l => l.point_type)).size;
                    const skillScore = Math.min(100, Math.round((uniqueSkills / 7) * 100));

                    // Mental: Clutch score (points >= 15)
                    const clutchLogs = dataSet.filter(l => {
                        const [m, o] = (l.current_score || '0-0').split('-').map(Number);
                        return m >= 15 || o >= 15;
                    });
                    const clutchWins = clutchLogs.filter(l => l.is_my_point);
                    const mentalScore = clutchLogs.length > 0 ? Math.round((clutchWins.length / clutchLogs.length) * 100) : 50;

                    // Stamina: based on density of logs per match
                    const matchIds = new Set(dataSet.map(l => l.match_id));
                    const avgRalliesPerMatch = total / (matchIds.size || 1);
                    const staminaScore = Math.min(100, Math.round((avgRalliesPerMatch / 40) * 100)); // 40+ logged rallies is very high stamina

                    return { attackScore, defenseScore, skillScore, mentalScore, staminaScore };
                };

                const recentRadar = calcRadar(recentLogs);
                const allTimeRadar = calcRadar(logs);

                setRadarData([
                    { subject: '체력 (Stamina)', A: recentRadar.staminaScore, B: allTimeRadar.staminaScore, fullMark: 100 },
                    { subject: '공격 (Attack)', A: recentRadar.attackScore, B: allTimeRadar.attackScore, fullMark: 100 },
                    { subject: '수비 (Defense)', A: recentRadar.defenseScore, B: allTimeRadar.defenseScore, fullMark: 100 },
                    { subject: '기술 (Skill)', A: recentRadar.skillScore, B: allTimeRadar.skillScore, fullMark: 100 },
                    { subject: '멘탈 (Mental)', A: recentRadar.mentalScore, B: allTimeRadar.mentalScore, fullMark: 100 },
                ]);

                // 4. 부상 위험도 (Injury Risk based on patterns)
                const risks = [];
                const totalWins = recentLogs.filter(l => l.is_my_point);
                const smashPcnt = (totalWins.filter(l => l.point_type?.includes('스매시')).length / (totalWins.length || 1)) * 100;

                if (smashPcnt > 35) {
                    risks.push({ label: '오른쪽 어깨/팔꿈치 부하 (스매시 빈도 높음)', value: Math.min(98, Math.round(smashPcnt * 2)), color: 'orange' });
                } else {
                    risks.push({ label: '오른쪽 어깨/팔꿈치 안정성 유지중', value: 85, color: 'blue' });
                }

                if (recentRadar.staminaScore > 80) {
                    risks.push({ label: '하체/무릎 피로도 경고 (빈번한 장기 랠리)', value: recentRadar.staminaScore, color: 'orange' });
                } else {
                    risks.push({ label: '하체 관절 안정성 양호', value: 92, color: 'blue' });
                }

                const errorPcnt = (recentLogs.filter(l => !l.is_my_point && l.point_type?.includes('실수')).length / (recentLogs.length || 1)) * 100;
                risks.push({ label: '경기 중 코어 집중력', value: Math.max(0, 100 - Math.round(errorPcnt * 2)), color: 'blue' });

                setInjuryRisks(risks);
                setLoading(false);

            } catch (error) {
                console.error('Failed to calculate training metrics:', error);
                setLoading(false);
            }
        };

        fetchAndCalculate();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-bold animate-pulse">경기 데이터를 바탕으로 신체 부하를 계산 중입니다...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI 신체 부하 및 모니터링 지표</h1>
                <p className="text-slate-500 mt-2 font-medium">기록하신 매치와 랠리 빈도, 점수 데이터 패턴을 기반으로 훈련 강도 및 피로도를 추정 분석합니다.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center">
                    <h3 className="text-lg font-bold mb-2 flex items-center justify-center gap-2 w-full text-slate-800 dark:text-slate-100">
                        <Target className="w-5 h-5 text-blue-500" />
                        종합 퍼포먼스 레이더 비교
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 mb-6 uppercase tracking-widest text-center">Blue: 최근 30일 데이터 / Gray: 전체 누적 평균</p>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    isAnimationActive={true}
                                    animationDuration={1200}
                                    name="최근 30일"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.4}
                                    strokeWidth={3}
                                />
                                <Radar
                                    isAnimationActive={true}
                                    animationDuration={1200}
                                    name="전체 평균"
                                    dataKey="B"
                                    stroke="#94a3b8"
                                    fill="#94a3b8"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                4주간 경기 소모량 (Intensity)
                            </h3>
                            <div className="h-[140px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={staminaData} margin={{ top: 10, left: -20, right: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            formatter={(value) => [`${value} 랠리`, '소화량']}
                                            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', fontWeight: 'bold' }}
                                        />
                                        <Bar isAnimationActive={true} animationDuration={1000} dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex justify-between items-end bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{staminaData[3]?.value}<span className="text-sm text-slate-500 font-bold ml-1">rallies</span></p>
                                    <p className={`text-xs font-bold mt-1 tracking-wide ${intensityTrend.isUp ? 'text-orange-500' : 'text-emerald-500'}`}>
                                        전주 대비 {intensityTrend.percent}% {intensityTrend.isUp ? '증가 (부하 상승)' : '감소 (휴식기)'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${staminaData[3]?.value > 50 ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                                        {staminaData[3]?.value > 50 ? 'HIGH VOLUME' : 'NORMAL VOLUME'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                            <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                                <HeartPulse className="w-5 h-5 text-rose-500" />
                                단기 피로도 평가 (최근 7일)
                            </h3>
                            <div className="flex-1 flex flex-col items-center justify-center py-4">
                                <div className="relative w-32 h-32 hover:scale-105 transition-transform">
                                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
                                        <path className="text-slate-100 dark:text-slate-800" strokeDasharray="100, 100" strokeWidth="2.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path
                                            className={`transition-all duration-1000 ease-out ${fatigueInfo.status === 'OVERLOAD' ? 'text-rose-500' : fatigueInfo.status === 'RECOVERED' ? 'text-emerald-500' : 'text-blue-500'}`}
                                            strokeDasharray={`${fatigueInfo.score}, 100`}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">{fatigueInfo.score}</span>
                                        <span className={`text-[9px] font-bold tracking-widest mt-0.5 ${fatigueInfo.status === 'OVERLOAD' ? 'text-rose-500' : fatigueInfo.status === 'RECOVERED' ? 'text-emerald-500' : 'text-blue-500'}`}>{fatigueInfo.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug">
                                    <Info className="w-4 h-4 inline-block mr-1.5 text-blue-500 -mt-0.5" />
                                    {fatigueInfo.message}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Shield className="w-5 h-5 text-indigo-500" />
                                AI 추정 부상 경고 (Playstyle Based)
                            </h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">최근 30일 타구 패턴 기반</span>
                        </div>
                        <div className="space-y-5">
                            {injuryRisks.map((risk, idx) => (
                                <BalanceItem key={idx} label={risk.label} value={risk.value} color={risk.color} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BalanceItem({ label, value, color = "blue" }: { label: string, value: number, color?: string }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-500",
        orange: "bg-orange-500",
        emerald: "bg-emerald-500",
        rose: "bg-rose-500",
    };
    const isWarning = value > 85 && color === 'orange';

    return (
        <div className="space-y-2 group">
            <div className="flex justify-between text-sm items-end">
                <span className={`font-bold transition-colors ${isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'}`}>{label}</span>
                <span className={`font-black tracking-tight ${isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>{value}% {isWarning && '(경계)'}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div
                    className={`h-full ${colorMap[color]} transition-all duration-1000 ease-out`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}
