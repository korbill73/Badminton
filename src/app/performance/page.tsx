'use client';

import React from 'react';
import { Activity, Zap, Shield, HeartPulse, LineChart, Target, Flame } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function PerformancePage() {
    const radarData = [
        { subject: '체력 (Stamina)', A: 120, B: 110, fullMark: 150 },
        { subject: '공격 (Attack)', A: 150, B: 130, fullMark: 150 },
        { subject: '수비 (Defense)', A: 86, B: 130, fullMark: 150 },
        { subject: '기술 (Skill)', A: 130, B: 100, fullMark: 150 },
        { subject: '멘탈 (Mental)', A: 110, B: 90, fullMark: 150 },
    ];

    const staminaData = [
        { name: 'Week 1', value: 85 },
        { name: 'Week 2', value: 78 },
        { name: 'Week 3', value: 92 },
        { name: 'Week 4', value: 88 },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">트레이닝 지표</h1>
                <p className="text-slate-500 mt-2">선수의 신체적, 기술적 퍼포먼스 성장세를 분석합니다.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        종합 퍼포먼스 레이더
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar
                                    name="현재 상태"
                                    dataKey="A"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.4}
                                />
                                <Radar
                                    name="목표 수치"
                                    dataKey="B"
                                    stroke="#94a3b8"
                                    fill="#94a3b8"
                                    fillOpacity={0.1}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <Flame className="w-4 h-4 text-orange-500" />
                                최근 훈련 강도
                            </h3>
                            <div className="h-[120px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={staminaData}>
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <XAxis dataKey="name" hide />
                                        <Tooltip />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">88%</p>
                                    <p className="text-xs text-slate-400">전주 대비 12% 상승</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-600 rounded-full">HIGH INTENSITY</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                <HeartPulse className="w-4 h-4 text-red-500" />
                                피로도 / 회복 지수
                            </h3>
                            <div className="h-[120px] flex items-center justify-center">
                                <div className="relative w-24 h-24">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path className="text-slate-100 dark:text-slate-800" strokeDasharray="100, 100" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        <path className="text-emerald-500" strokeDasharray="72, 100" strokeWidth="3" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xl font-black text-slate-900 dark:text-white">72</span>
                                        <span className="text-[8px] text-slate-400">NORMAL</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <p className="text-xs text-slate-500 italic">"오늘은 기술 훈련 위주의 세션을 권장합니다."</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-500" />
                            부상 위험도 및 신체 밸런스
                        </h3>
                        <div className="space-y-4">
                            <BalanceItem label="왼쪽 무릎 가동성" value={95} />
                            <BalanceItem label="오른쪽 발목 안정성" value={82} color="orange" />
                            <BalanceItem label="코어 근지구력" value={88} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BalanceItem({ label, value, color = "blue" }: any) {
    const colorMap: any = {
        blue: "bg-blue-500",
        orange: "bg-orange-500",
    };
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-400">{label}</span>
                <span className="font-bold text-slate-900 dark:text-white">{value}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${colorMap[color]}`} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}
