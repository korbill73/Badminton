'use client';

import React, { useState } from 'react';
import { 
    Target, 
    Sparkles, 
    Calendar, 
    ChevronRight, 
    Zap, 
    Shield, 
    AlertCircle,
    TrendingUp,
    Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingEvaluationProps {
    metrics: any;
    lastAnalysizedAt: number;
}

export default function TrainingEvaluation({ metrics, lastAnalysizedAt }: TrainingEvaluationProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!metrics) return null;

    const { swot, strategy, bestShot, mostError, winStreak, stabilityPI, powerPI, clutchData } = metrics;

    const evaluationDate = new Date(lastAnalysizedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 지표 기반 추가 분석
    const getPriorityTraining = () => {
        const priorities = [];
        if (stabilityPI < 70) priorities.push({ title: '수비 안정성 강화', description: '언더 클리어 및 리시브 정확도 훈련이 시급합니다.' });
        if (powerPI < 50) priorities.push({ title: '공격 결정력 보완', description: '찬스볼에서의 스매시 각도와 파워 조절 훈련이 필요합니다.' });
        if (clutchData.rate < 40) priorities.push({ title: '심리 및 체력 훈련', description: '경기 후반 집중력 유지를 위한 간격 훈련을 권장합니다.' });
        
        if (priorities.length === 0) {
            priorities.push({ title: '전술 다양성 확대', description: '현재의 안정감을 바탕으로 변칙적인 드롭과 헤어핀 사용 빈도를 높여보세요.' });
        }
        return priorities;
    };

    const trainingPriorities = getPriorityTraining();

    return (
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 rounded-[32px] p-6 text-white shadow-2xl shadow-blue-500/20 overflow-hidden relative group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl opacity-30" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                            <Sparkles className="w-6 h-6 text-white animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight">나의 맞춤형 훈련 진단기</h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-blue-100/70">
                                <Calendar className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">평가 일시: {evaluationDate}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-90 border border-white/10"
                    >
                        <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isExpanded && "rotate-90")} />
                    </button>
                </div>

                {/* Primary Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">최대 강점 분석</span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-blue-50" dangerouslySetInnerHTML={{ __html: swot.strength }} />
                    </div>
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span className="text-xs font-black text-rose-300 uppercase tracking-wider">집중 보완 과제</span>
                        </div>
                        <p className="text-sm font-bold leading-relaxed text-blue-50" dangerouslySetInnerHTML={{ __html: swot.weakness }} />
                    </div>
                </div>

                {isExpanded && (
                    <div className="space-y-6 mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
                        {/* Training Priorities */}
                        <div>
                            <h4 className="text-xs font-black text-blue-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4" /> 훈련 우선순위 가이드
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                                {trainingPriorities.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group/item hover:bg-white/10 transition-all">
                                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black shrink-0 border border-white/10 group-hover/item:bg-blue-500 group-hover/item:border-blue-400 transition-all">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-white mb-1">{item.title}</p>
                                            <p className="text-sm text-blue-100/60 font-medium leading-tight">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Strategy Summary */}
                        <div className="bg-slate-900/40 rounded-3xl p-5 border border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                                <Award className="w-4 h-4 text-amber-400" />
                                <h4 className="text-xs font-black text-amber-300 uppercase tracking-widest">실전 전술 가이드</h4>
                            </div>
                            <ul className="space-y-3">
                                {strategy.map((item: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <TrendingUp className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                        <p className="text-sm font-bold text-blue-50 leading-snug">{item}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                
                {!isExpanded && (
                    <div className="flex justify-center mt-2">
                        <button 
                            onClick={() => setIsExpanded(true)}
                            className="text-[10px] font-black text-white/50 hover:text-white uppercase tracking-[0.2em] transition-colors"
                        >
                            Click to Expand Detailed Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
