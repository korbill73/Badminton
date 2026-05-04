import React, { useMemo } from 'react';
import { BDPointLog } from '@/types';
import { generateHierarchyStats } from '@/lib/statistics';
import { Target, Activity, TrendingDown, Crosshair, ChevronRight, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HierarchyInsightsProps {
    logs: BDPointLog[];
    selectedSetText: string;
}

export default function HierarchyInsights({ logs, selectedSetText }: HierarchyInsightsProps) {
    const stats = useMemo(() => generateHierarchyStats(logs), [logs]);

    if (logs.length < 3) return null;

    const { level1, level2, level3 } = stats;
    const totalLosses = level1.oppPoints;

    // AI 코치 조언 생성
    const getActionableAdvice = () => {
        if (totalLosses === 0) return "실점이 없는 완벽한 경기 운영을 보여주고 있습니다!";
        
        const topCause = level3.topLossCauses[0];
        const ufeRate = (level2.lossQuality.unforcedErrors / totalLosses) * 100;
        const feRate = (level2.lossQuality.forcedErrors / totalLosses) * 100;
        
        if (ufeRate >= 50) {
            return (
                <div className="space-y-2 text-slate-100">
                    <p className="text-lg leading-relaxed font-bold">
                        전체 실점의 <span className="text-rose-400 font-black">{Math.round(ufeRate)}%</span>가 내 범실(UFE)에서 나오고 있습니다.
                    </p>
                    <p className="text-base text-slate-300">
                        상대가 잘했다기보다 스스를 무너뜨리고 있습니다. 특히 <strong className="text-white bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">'{topCause?.cause || '기본 범실'}'</strong> 빈도가 가장 높습니다. 성급함을 버리고 안전한 타도를 확보하는 것이 시급합니다.
                    </p>
                </div>
            );
        } else if (feRate >= 40) {
            return (
                <div className="space-y-2 text-slate-100">
                    <p className="text-lg leading-relaxed font-bold">
                        수비에서 버티지 못하고 상대 강요에 의한 범실(FE) 비중이 <span className="text-orange-400 font-black">{Math.round(feRate)}%</span>에 달합니다.
                    </p>
                    <p className="text-base text-slate-300">
                        상대의 압박 패턴에 심하게 고전 중입니다. 핵심 취약 지점은 <strong className="text-white bg-orange-500/20 px-2 py-0.5 rounded-md border border-orange-500/30">'{topCause?.cause || '수비 불안'}'</strong>입니다. 셔틀콕을 무작정 띄우지 말고 네트 앞 전진 방어 또는 깊숙한 드라이브로 반격해야 합니다.
                    </p>
                </div>
            );
        } else {
            return (
                <div className="space-y-2 text-slate-100">
                    <p className="text-lg leading-relaxed font-bold">
                        상대방 공격(Winner)에 의한 실점이 다소 높은 편입니다.
                    </p>
                    <p className="text-base text-slate-300">
                        아군 진영으로 넘어오는 셔틀의 체공 시간을 벌어주는 수비 스텝 정비가 필요합니다. 주요 뚫리는 구간은 <strong className="text-white bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">'{topCause?.cause || '코스 수비'}'</strong>입니다.
                    </p>
                </div>
            );
        }
    };

    return (
        <div className="space-y-6 mb-16 relative w-full">
            {/* Header */}
            <div className="flex items-center gap-3 ml-2">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        핵심 약점 진단 <span className="text-slate-500 text-lg font-bold">({selectedSetText})</span>
                    </h2>
                    <p className="text-xs text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">Priority Weakness Analysis</p>
                </div>
            </div>

            {/* AI Actionable Summary */}
            <div className="bg-slate-950 border border-white/10 p-8 rounded-[32px] overflow-hidden relative shadow-2xl group transition-all duration-300 hover:border-white/20">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-600/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4 text-rose-400 font-black text-sm uppercase tracking-widest pl-1">
                            <Activity className="w-4 h-4" /> AI 진단 결과
                        </div>
                        {getActionableAdvice()}
                    </div>
                </div>
            </div>

            {/* 3-Level Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Level 1: 주도권 */}
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Level 1</p>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">득점 지배율</h3>
                    </div>
                    
                    <div className="flex items-end justify-center gap-6 mb-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-3xl font-black text-blue-600 tabular-nums">{level1.myPoints}</span>
                            <span className="text-xs font-bold text-slate-500">My Point</span>
                        </div>
                        <div className="text-2xl font-black text-slate-300 pb-1">:</div>
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-3xl font-black text-slate-400 tabular-nums">{level1.oppPoints}</span>
                            <span className="text-xs font-bold text-slate-500">Lost</span>
                        </div>
                    </div>

                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${level1.myPointRate}%` }} />
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - level1.myPointRate}%` }} />
                    </div>
                </div>

                {/* Level 2: 실점 품질 */}
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Level 2</p>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">실점 퀄리티 분석</h3>
                    </div>

                    <div className="space-y-4 w-full px-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">내 책임 (범실)</span>
                            <span className="font-black text-rose-500">{level2.lossQuality.unforcedErrors}점</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">상대 압박 (강제 범실)</span>
                            <span className="font-black text-orange-500">{level2.lossQuality.forcedErrors}점</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-slate-600 dark:text-slate-300">상대 완벽 (Winner 내줌)</span>
                            <span className="font-black text-slate-400">{level2.lossQuality.opponentWinners}점</span>
                        </div>
                    </div>
                </div>

                {/* Level 3: 치명적 실점 요인 */}
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-center mb-6">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Level 3</p>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            <Target className="w-4 h-4 text-rose-500" />
                            실점 원인 현미경
                        </h3>
                    </div>

                    <div className="space-y-3 px-2">
                        {level3.topLossCauses.length > 0 ? (
                            level3.topLossCauses.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate flex-1">{item.cause}</p>
                                    <span className="text-sm font-black text-rose-500">{item.count}회</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 text-sm font-bold pt-4">실점 데이터가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
