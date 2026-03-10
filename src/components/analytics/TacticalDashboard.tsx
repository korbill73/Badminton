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
    PieChart,
    Pie,
    LineChart,
    Line,
    LabelList,
} from 'recharts';
import { BDPointLog } from '@/types';
import {
    Zap,
    Shield,
    Clock,
    Layers,
    ArrowRightCircle,
    CheckCircle2,
    AlertCircle,
    Compass,
    Sparkles,
    Target,
    Trophy,
    Loader2,
    X,
    BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface TacticalDashboardProps {
    logs: BDPointLog[];
    categories: Category[];
    selectedSet: 'total' | number | 'compare';
    onSetChange: (set: 'total' | number | 'compare') => void;
    onClose?: () => void;
}

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
}

export default function TacticalDashboard({ logs, categories, selectedSet, onSetChange, onClose }: TacticalDashboardProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysizedAt, setLastAnalysizedAt] = useState<number>(Date.now());

    const handleRunAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setLastAnalysizedAt(Date.now());
            setIsAnalyzing(false);
        }, 1500);
    };

    const calculateMetrics = (data: BDPointLog[]) => {
        const winners = data.filter(l => l.is_my_point);
        const losses = data.filter(l => !l.is_my_point);
        const total = data.length;
        if (total === 0) return null;

        const getCatGroup = (name: string) => categories.find(c => c.name === name)?.category_group || 'others';

        // 1. 기초 지표 산출 가공
        const offensiveWinners = winners.filter(l => getCatGroup(l.point_type) === 'offensive');
        const tacticalWinners = winners.filter(l => getCatGroup(l.point_type) === 'tactical');
        const tacticalLosses = losses.filter(l => getCatGroup(l.point_type) === 'tactical');

        // 실점 구분 고도화: 나의 범실 vs 상대 공격
        const unforcedErrors = losses.filter(l => getCatGroup(l.point_type) === 'error');
        const forcedErrors = losses.filter(l => getCatGroup(l.point_type) !== 'error');

        // 서비스 지표 (정교함 및 집중도)
        const serviceWins = winners.filter(l => l.point_type.includes('서비스') || l.point_type.includes('서브'));
        const serviceErrors = losses.filter(l => l.point_type.includes('서비스 실수') || l.point_type.includes('서브 실수'));

        // 데이터가 없을 경우 100점으로 처리하여 불필요한 경고 방지
        const serviceTotal = serviceWins.length + serviceErrors.length;
        const serviceIndex = serviceTotal === 0 ? 100 : (serviceWins.length / serviceTotal) * 100;

        // 클러치 기록 (15점 이후)
        const clutchLogs = data.filter(l => {
            const [me, opp] = (l.current_score || '0-0').split('-').map(Number);
            return (me >= 15 || opp >= 15);
        });
        const clutchWinners = clutchLogs.filter(l => l.is_my_point);
        const clutchPI = (clutchWinners.length / (clutchLogs.length || 1)) * 100;

        // 기술 다양성
        const uniqueWinningTypes = new Set(winners.map(l => l.point_type)).size;

        // 2. PI (Performance Index) 산출
        const powerPI = (offensiveWinners.length / (winners.length || 1)) * 100;
        const stabilityPI = ((total - unforcedErrors.length) / total) * 100;
        const controlPI = (tacticalWinners.length / (tacticalWinners.length + tacticalLosses.length || 1)) * 100;
        const varietyPI = Math.min(100, (uniqueWinningTypes / 6) * 100);

        // 3. 지표별 근거 및 해석 (Radar Detail) - Font size/style focused
        const radarExplanations = [
            {
                subject: '공격력',
                value: Math.round(powerPI),
                reason: `<div class="space-y-1">
                    <span class="text-xl font-bold text-slate-900 dark:text-white">전체 득점 중 공격적인 피니시 비중이 <strong>${Math.round(powerPI)}%</strong>입니다.</span>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest block">산출 근거: (공격 범주 기술 득점 / 전체 득점) × 100</span>
                    <span class="text-base text-slate-500 mt-1 block">${powerPI > 60 ? '네트 앞 점유율이 높고 스매시 종결력이 매우 우수하여 주도적인 경기를 운영하고 있습니다.' : '공격 찬스에서의 결정력이 다소 아쉽습니다. 더 과감한 타점 확보와 하향 타구가 필요합니다.'}</span>
                </div>`
            },
            {
                subject: '정교함',
                value: Math.round(controlPI),
                reason: `<div class="space-y-1">
                    <span class="text-xl font-bold text-slate-900 dark:text-white">전술적 랠리 상황에서의 공방 승률이 <strong>${Math.round(controlPI)}%</strong>를 기록 중입니다.</span>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest block">산출 근거: (전술적 기술 득점 / 전술적 기술 총 발생) × 100</span>
                    <span class="text-base text-slate-500 mt-1 block">${controlPI > 50 ? '셔틀콕의 코스 공략이 정교하며, 상대의 빈 공간을 찾아내는 시야가 매우 넓습니다.' : '단순한 코스 선택으로 인해 상대에게 역습을 허용하는 빈도가 높습니다. 대각선 활용을 늘리세요.'}</span>
                </div>`
            },
            {
                subject: '안정성',
                value: Math.round(stabilityPI),
                reason: `<div class="space-y-1">
                    <span class="text-xl font-bold text-slate-900 dark:text-white">경기 전체 운영 안정도는 <strong>${Math.round(stabilityPI)}%</strong>로 측정되었습니다.</span>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest block">산출 근거: ((전체 포인트 - 비강제 범실) / 전체 포인트) × 100</span>
                    <span class="text-base text-slate-500 mt-1 block">${stabilityPI > 75 ? '불필요한 범실이 적고 침착한 경기 운영을 보여주고 있어 장기전에서 매우 유리합니다.' : '비강제 범실(네트 걸림, 아웃) 비중이 높습니다. 하이클리어의 길이를 조절하여 안정을 찾아야 합니다.'}</span>
                </div>`
            },
            {
                subject: '위기관리',
                value: Math.round(clutchPI),
                reason: `<div class="space-y-1">
                    <span class="text-xl font-bold text-slate-900 dark:text-white">15점 이후 승부처(클러치 타임) 득점 성공률은 <strong>${Math.round(clutchPI)}%</strong>입니다.</span>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest block">산출 근거: (15점 이후 득점 / 15점 이후 전체 포인트) × 100</span>
                    <span class="text-base text-slate-500 mt-1 block">${clutchPI > 50 ? '경기 종반의 심리적 압박을 이겨내고 본인의 플레이를 유지하는 강한 멘탈을 보유하고 있습니다.' : '세트 후반 체력 저하와 함께 급격한 집중력 분산이 보입니다. 짧은 호흡으로 템포를 조절하세요.'}</span>
                </div>`
            },
            {
                subject: '기술 다양성',
                value: Math.round(varietyPI),
                reason: `<div class="space-y-1">
                    <span class="text-xl font-bold text-slate-900 dark:text-white">사용된 득점 기술의 종류는 총 <strong>${uniqueWinningTypes}종</strong>입니다.</span>
                    <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest block">산출 근거: Min(100, (득점 기술 종류 / 6) × 100)</span>
                    <span class="text-base text-slate-500 mt-1 block">${uniqueWinningTypes >= 5 ? '다양한 기술적 옵션을 보유하고 있어 상대가 수비 패턴을 예측하기 매우 어렵습니다.' : '공격 루트가 단조로워 상대가 쉽게 적응하고 있습니다. 헤어핀과 드롭의 섞어 쓰기가 필요합니다.'}</span>
                </div>`
            },
        ];

        // 4. 기술별 효율성 (Ranking Data) - 동적 추출로 변경
        const allUsedWinningTypes = Array.from(new Set(winners.map(l => l.point_type)));
        const allUsedErrorTypes = Array.from(new Set(losses.map(l => l.point_type)));
        const relevantShotKeywords = ['스매시', '드롭', '헤어핀', '드라이브', '네트킬', '클리어', '푸시', '커트', '어택', '킬'];

        // 득점 기술 랭킹 (동적 추출 기반) - 시도 횟수(Attempt) 계산 로직 정교화
        const efficiencyData = allUsedWinningTypes.map(type => {
            const typeWinners = winners.filter(l => l.point_type === type).length;
            // 시도 횟수 = 성공(type) + 해당 기술과 연관된 '범실(Error)'
            // 피습(상대 공격 성공)은 시도 횟수에서 제외하여 실제 본인의 기술 정밀도를 반영
            const typeFailures = losses.filter(l =>
                l.point_type.includes(type) &&
                getCatGroup(l.point_type) === 'error'
            ).length;
            const typeTotalAttempts = typeWinners + typeFailures;

            const successRate = (typeWinners / (typeTotalAttempts || 1)) * 100;
            // 기여율 = 해당 기술 득점 / 전체 득점
            const contributionRate = (typeWinners / (winners.length || 1)) * 100;

            return {
                name: type,
                rate: Math.round(successRate),
                contributionRate: Math.round(contributionRate),
                winners: typeWinners,
                attempts: typeTotalAttempts
            };
        }).filter(d => d.winners > 0).sort((a, b) => b.winners - a.winners);

        // 실점 원인 랭킹 (동적 추출 기반)
        const errorRanking = allUsedErrorTypes.map(type => {
            const typeErrors = losses.filter(l => l.point_type === type).length;
            // 기여율 = 해당 원인 실점 / 전체 실점
            const contributionRate = (typeErrors / (losses.length || 1)) * 100;
            const isUnforced = getCatGroup(type) === 'error';

            return {
                name: type,
                count: typeErrors,
                contributionRate: Math.round(contributionRate),
                isUnforced
            };
        }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

        // 5. 구간별 분석 (Phase Analysis)
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
            const pLosses = phaseLogs.filter(l => !l.is_my_point).length;
            const pTotal = phaseLogs.length;
            const winRate = pTotal > 0 ? Math.round((pWinners / pTotal) * 100) : 0;

            let reason = '';
            if (p === '경기 초반 (0-10점)') {
                reason = winRate > 50 ? '날카로운 선제 공격으로 초반 기선 제압에 성공했습니다.' : '서브 리시브 불안과 상대 템포 적응 지연으로 초반 주도권을 내주었습니다.';
            } else if (p === '경기 중반 (11-15점)') {
                reason = winRate > 50 ? '체력적인 우위를 바탕으로 랠리를 길게 가져가며 상대를 압박했습니다.' : '집중력이 흐트러지는 구간입니다. 단순한 실책이 연달아 발생하며 위기를 겪었습니다.';
            } else {
                reason = winRate > 50 ? '승부처에서의 과감한 결정력과 탄탄한 수비로 승기를 굳혔습니다.' : '후반부 결정력이 크게 하락하며 막판 뒤집기를 허용하는 패턴이 보입니다.';
            }

            return {
                name: p,
                winRate,
                winners: pWinners,
                losses: pLosses,
                total: pTotal,
                reason
            };
        });

        const bestShotCandidate = [...efficiencyData]
            .filter(d => {
                const group = getCatGroup(d.name);
                return group === 'offensive' || group === 'tactical';
            })
            .sort((a, b) => b.rate - a.rate)[0];

        const bestShot = bestShotCandidate || efficiencyData[0];
        const mostError = errorRanking[0];

        // 6. Streak Analysis
        let maxWinStreak = 0;
        let currentWinStreak = 0;
        let maxLossStreak = 0;
        let currentLossStreak = 0;

        data.forEach(l => {
            if (l.is_my_point) {
                currentWinStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                currentLossStreak = 0;
            } else {
                currentLossStreak++;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
                currentWinStreak = 0;
            }
        });

        // 7. 전략 제언 시스템 (Against same opponent)
        const strategyAdvice = [];
        if (serviceErrors.length > 0 && serviceIndex < 40) strategyAdvice.push("서비스 실수를 줄이는 것이 급선무입니다. 숏 서브의 높이를 낮게 유지하세요.");
        if (stabilityPI < 60) strategyAdvice.push("불안정한 연결구가 실점의 빌미를 줍니다. 셔틀콕을 더 높고 깊게 보내 여유를 확보하세요.");

        // 실점 고도화 반영 전략
        const unforcedCount = unforcedErrors.length;
        const forcedCount = forcedErrors.length;
        if (unforcedCount > forcedCount) {
            strategyAdvice.push(`상대 공격보다 본인의 범실(${unforcedCount}회)로 인한 실점이 많습니다. 코스 공략보다는 정확한 임팩트에 집중하세요.`);
        } else if (forcedCount > 0) {
            strategyAdvice.push(`상대의 공격적인 위력(${forcedCount}회 실점 관여)에 고전하고 있습니다. 전진 수비보다는 반 스텝 물러나 수비 범위를 넓히세요.`);
        }

        if (bestShot && bestShot.rate > 70) strategyAdvice.push(`${bestShot.name} 성공률(${bestShot.rate}%)이 경이적입니다. 랠리의 종결 지점으로 적극 설계하세요.`);
        if (mostError && mostError.count >= 3) strategyAdvice.push(`${mostError.name} 실점(${mostError.count}회)이 뼈아픕니다. 코스 선택 시 중앙보다는 코너를 노려 안전하게 처리하세요.`);

        return {
            winPoints: winners.length,
            lossPoints: losses.length,
            totalPoints: total,
            serviceIndex: Math.round(serviceIndex),
            radar: radarExplanations,
            efficiency: efficiencyData,
            errorRanking,
            top3Efficiency: efficiencyData.slice(0, 3),
            top3Error: errorRanking.slice(0, 3),
            winStreak: maxWinStreak,
            lossStreak: maxLossStreak,
            phase: phaseData,
            bestShot,
            mostError,
            clutchData: {
                winners: clutchWinners.length,
                losses: clutchLogs.length - clutchWinners.length,
                rate: Math.round(clutchPI)
            },
            swot: {
                strength: bestShot ? `압도적인 성과를 내는 <strong>'${bestShot.name}'</strong>이(가) 핵심 병기입니다. ${bestShot.rate}%의 성공률로 랠리 종결력이 탁월합니다.` : '충분한 득점 데이터가 필요합니다.',
                weakness: mostError && mostError.count >= 2 ? `<strong>'${mostError.name}'</strong> 상황에서의 ${mostError.isUnforced ? '범실' : '상대 공격 허용'}(${mostError.count}회)이 주 실점 원인입니다. ${mostError.isUnforced ? '타점 중심을 낮추고 안정적 임팩트가 필요합니다.' : '상대의 타점 포착을 방해하는 변칙적인 랠리 운용이 필요합니다.'}` : '현재 큰 기술적 범실 약점은 보이지 않습니다.',
                opportunity: clutchPI < 40 ? '경기 후반부 점수 획득률이 낮습니다. 체력 안배와 정적인 템포 조절이 필요합니다.' : '후반부 집중력이 탁월합니다. 경기 중반까지만 대등하게 유지해도 승산이 큽니다.',
                threat: serviceErrors.length > 0 && serviceIndex < 50
                    ? '서브 범실 비중이 매우 위험합니다. 공짜 점수를 내주어 상대의 기세를 살려주고 있습니다.'
                    : '안전한 서비스와 안정적인 운영으로 상대의 공격을 효과적으로 억제 중입니다.'
            },
            strategy: strategyAdvice.length > 0 ? strategyAdvice : ["현재 패턴을 유지하며 상대의 체력적 약점 노출 대기"]
        };
    };

    const currentData = useMemo(() => {
        if (selectedSet === 'total') return calculateMetrics(logs);
        if (typeof selectedSet === 'number') {
            const setLogs = logs.filter(l => Number(l.set_number || 1) === Number(selectedSet));
            return calculateMetrics(setLogs);
        }
        return null;
    }, [logs, selectedSet, categories, lastAnalysizedAt]);

    const compareMetrics = useMemo(() => {
        if (selectedSet !== 'compare') return null;
        const availableSets = Array.from(new Set(logs.map(l => l.set_number))).sort((a, b) => a - b);
        return availableSets.map(s => {
            const setLogs = logs.filter(l => l.set_number === s);
            return {
                setNumber: s,
                metrics: calculateMetrics(setLogs)
            };
        }).filter(s => s.metrics !== null);
    }, [logs, selectedSet, categories, lastAnalysizedAt]);

    const { trendData, topShots } = useMemo(() => {
        const availableSets = Array.from(new Set(logs.map(l => l.set_number))).sort((a, b) => a - b);

        // Dynamic extraction of top 5 most used winning techniques
        const winners = logs.filter(l => l.is_my_point);
        const typeCounts: Record<string, number> = {};
        winners.forEach(l => {
            typeCounts[l.point_type] = (typeCounts[l.point_type] || 0) + 1;
        });

        const dynamicTopShots = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(e => e[0]);

        const data = availableSets.map(s => {
            const setLogs = logs.filter(l => l.set_number === s);
            const metrics = calculateMetrics(setLogs);
            const point: any = { set: `${s}세트` };

            if (metrics) {
                dynamicTopShots.forEach(name => {
                    const eff = metrics.efficiency.find(e => e.name === name);
                    point[name] = eff ? eff.winners : 0;
                });
            } else {
                dynamicTopShots.forEach(name => point[name] = 0);
            }

            return point;
        });

        return { trendData: data, topShots: dynamicTopShots };
    }, [logs, categories]);

    const totalMetrics = useMemo(() => calculateMetrics(logs), [logs, categories, lastAnalysizedAt]);

    if (logs.length < 3) {
        return (
            <div className="h-[400px] w-full bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-8 text-center" id="tactical-empty-state">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">전문 전술 분석 대기 중</h3>
                <p className="text-sm text-slate-500 max-w-[280px]">심층 분석 시나리오 구성을 위해 3개 이상의 랠리 데이터가 필요합니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Mobile Header (Only if onClose is provided) */}
            {onClose && (
                <div className="md:hidden sticky top-0 z-[60] bg-slate-950/80 backdrop-blur-xl -mx-4 px-4 py-4 flex items-center justify-between border-b border-white/10 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-black text-white">경기 상세 분석</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/10 text-white active:bg-white/20 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* 1. 컨트롤 패널 (전문적인 분석 도구 느낌) - Sticky Navigation */}
            <div className="sticky top-4 z-50 flex flex-wrap items-center justify-between gap-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 shadow-lg mb-8 relative">
                <div className="flex items-center gap-2">
                    {([1, 2, 3, 'compare', 'total'] as const).map(tab => {
                        const isAvailable = tab === 'total' || tab === 'compare' || logs.some(l => l.set_number === tab);
                        if (!isAvailable) return null;

                        return (
                            <button
                                key={tab}
                                onClick={() => onSetChange(tab)}
                                className={cn(
                                    "px-8 py-3 rounded-2xl text-[15px] font-black transition-all tracking-wider uppercase",
                                    selectedSet === tab
                                        ? "bg-slate-950 text-white shadow-xl scale-105"
                                        : "text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                {tab === 'compare' ? '세트별 비교 분석' : tab === 'total' ? '종합 분석 리포트' : `${tab}세트`}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    {selectedSet !== 'compare' && currentData && (
                        <div className="flex items-center gap-6 px-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">공격 효율</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white">{Math.round((currentData!.winPoints / currentData!.totalPoints) * 100)}% <span className="text-[10px] text-slate-400 font-bold ml-0.5">승률</span></span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">분석 규모</span>
                                <span className="text-lg font-black text-slate-900 dark:text-white">{currentData.totalPoints} <span className="text-[10px] text-slate-400 font-bold ml-0.5">랠리</span></span>
                            </div>
                        </div>
                    )}

                    {/* Run AI Analysis Button */}
                    <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 whitespace-nowrap",
                            isAnalyzing
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20"
                        )}
                    >
                        {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        {selectedSet === 'total' ? '전체 AI 분석 실행' : `${selectedSet}세트 AI 분석`}
                    </button>
                </div>

                {isAnalyzing && (
                    <div className="absolute inset-x-0 -bottom-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress" style={{ width: '40%' }} />
                    </div>
                )}
            </div>


            {selectedSet === 'compare' && compareMetrics ? (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    {/* [NEW] Performance Trend Chart - Redesigned to Individual Sparklines */}
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="mb-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                    <Layers className="w-8 h-8 text-blue-600" />
                                    기술별 퍼포먼스 흐름 분석
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">세트별 주요 기술의 성공 횟수 추이 (성공 횟수 기준)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {topShots.map((shot, idx) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                const color = colors[idx % colors.length];

                                // Calculate total for this shot
                                const totalWinners = trendData.reduce((acc, curr) => acc + (curr[shot] || 0), 0);

                                return (
                                    <div key={shot} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg overflow-hidden">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white">{shot}</h4>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black tabular-nums" style={{ color }}>{totalWinners}<span className="text-[10px] ml-1 text-slate-400">회</span></p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Total Success</p>
                                            </div>
                                        </div>

                                        <div className="h-[120px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={trendData} margin={{ top: 25, right: 35, left: 35, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} strokeOpacity={0.5} />
                                                    <XAxis
                                                        dataKey="set"
                                                        hide
                                                    />
                                                    <YAxis hide domain={[0, 'auto']} />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: '#0f172a',
                                                            borderRadius: '12px',
                                                            border: 'none',
                                                            padding: '8px 12px',
                                                        }}
                                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 900, marginBottom: '4px' }}
                                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 900, padding: '0' }}
                                                        formatter={(value: any) => [`${value}회`, shot]}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey={shot}
                                                        stroke={color}
                                                        strokeWidth={4}
                                                        dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
                                                        activeDot={{ r: 6, fill: color, strokeWidth: 2, stroke: '#fff' }}
                                                    >
                                                        <LabelList
                                                            dataKey={shot}
                                                            position="top"
                                                            content={(props: any) => {
                                                                const { x, y, value } = props;
                                                                if (value === 0) return null;
                                                                return <text x={x} y={y - 12} fill={color} fontSize={11} fontWeight={900} textAnchor="middle">{value}회</text>;
                                                            }}
                                                        />
                                                    </Line>
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="flex justify-between mt-4 px-1">
                                            {trendData.map((d, i) => (
                                                <span key={i} className="text-[10px] font-black text-slate-400 uppercase">{d.set}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Comparison Metrics Grid */}
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="mb-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                    <Compass className="w-8 h-8 text-blue-600" />
                                    전술 분석 지표 심층 비교
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">세트별 상세 기술 성과 및 주요 데이터 지표 분석</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/50">
                                            <th className="px-8 py-8 text-left border-b border-slate-100 dark:border-slate-800">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Detailed Tactical Metric</span>
                                                    <span className="text-lg font-black text-slate-950 dark:text-white">분석 지표</span>
                                                </div>
                                            </th>
                                            {compareMetrics.map(m => (
                                                <th key={m.setNumber} className="px-8 py-8 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{m.setNumber}세트</span>
                                                </th>
                                            ))}
                                            <th className="px-8 py-8 text-center border-b border-slate-100 dark:border-slate-800 bg-blue-600">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none mb-1">Match Stats</span>
                                                    <span className="text-2xl font-black text-white uppercase tracking-tighter">합계</span>
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">세트 승률</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center tabular-nums font-black text-blue-600 text-lg">
                                                    {Math.round((m.metrics!.winPoints / m.metrics!.totalPoints) * 100)}%
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center tabular-nums font-black text-blue-100 bg-blue-600/95 text-lg">
                                                {Math.round((totalMetrics!.winPoints / totalMetrics!.totalPoints) * 100)}%
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">핵심 무기 (Top 3)</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center">
                                                    <div className="flex flex-col gap-2 items-center">
                                                        {m.metrics!.top3Efficiency.map((s, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                                <span className="font-black text-slate-950 dark:text-white w-20 text-left whitespace-nowrap">{s.name}</span>
                                                                <span className="font-black text-blue-600 whitespace-nowrap">{s.winners}회 <span className="text-slate-400 font-bold ml-1 text-[11px]">({s.contributionRate}%)</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center bg-blue-600/95">
                                                <div className="flex flex-col gap-2 items-center">
                                                    {totalMetrics!.top3Efficiency.slice(0, 3).map((s, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                                            <span className="font-black text-white w-20 text-left whitespace-nowrap">{s.name}</span>
                                                            <span className="font-black text-blue-100 whitespace-nowrap">{s.winners}회 <span className="text-blue-200/60 font-bold ml-1 text-[11px]">({s.contributionRate}%)</span></span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">주요 실점 원인 (Top 3)</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center">
                                                    <div className="flex flex-col gap-2 items-center">
                                                        {m.metrics!.top3Error.map((s, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                                <span className="font-black text-slate-950 dark:text-white w-20 text-left whitespace-nowrap">{s.name}</span>
                                                                <span className="font-black text-rose-500 whitespace-nowrap">{s.count}회 <span className="text-slate-400 font-bold ml-1 text-[11px]">({s.contributionRate}%)</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center bg-blue-600/95">
                                                <div className="flex flex-col gap-2 items-center">
                                                    {totalMetrics!.top3Error.slice(0, 3).map((s, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                                            <span className="font-black text-white w-20 text-left whitespace-nowrap">{s.name}</span>
                                                            <span className="font-black text-rose-200 whitespace-nowrap">{s.count}회 <span className="text-blue-200/60 font-bold ml-1 text-[11px]">({s.contributionRate}%)</span></span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">클러치 해결력</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center tabular-nums font-black text-amber-600 text-lg">
                                                    {m.metrics!.clutchData.rate}%
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center tabular-nums font-black text-blue-100 bg-blue-600/95 text-lg">
                                                {totalMetrics!.clutchData.rate}%
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">최대 연속 득점</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center tabular-nums font-black text-blue-600 text-lg">
                                                    {m.metrics!.winStreak} <span className="text-[10px] text-slate-400">회</span>
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center tabular-nums font-black text-blue-100 bg-blue-600/95 text-lg">
                                                {totalMetrics!.winStreak} <span className="text-[10px] text-blue-200/60">회</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">최대 연속 실점</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center tabular-nums font-black text-rose-500 text-lg">
                                                    {m.metrics!.lossStreak} <span className="text-[10px] text-slate-400">회</span>
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center tabular-nums font-black text-blue-100 bg-blue-600/95 text-lg">
                                                {totalMetrics?.lossStreak || 0} <span className="text-[10px] text-blue-200/60">회</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 bg-slate-50/20 dark:bg-slate-800/20 whitespace-nowrap">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-sm text-slate-900 dark:text-white md:whitespace-nowrap">서비스 효율지수</span>
                                                    <span className="text-[10px] text-slate-400 font-bold leading-tight">서브 이후 득점 성공률</span>
                                                </div>
                                            </td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center font-black text-slate-900 dark:text-white tabular-nums text-lg">
                                                    {m.metrics!.serviceIndex}%
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center font-black text-blue-100 tabular-nums bg-blue-600/95 text-lg">
                                                {totalMetrics?.serviceIndex || 0}%
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-8 py-6 font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">주요 기술별 성공률</td>
                                            {compareMetrics.map(m => (
                                                <td key={m.setNumber} className="px-8 py-6 text-center text-sm font-bold">
                                                    <div className="flex flex-col gap-1.5">
                                                        {m.metrics!.efficiency.slice(0, 3).map((eff, i) => (
                                                            <div key={i} className="flex justify-between gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl whitespace-nowrap">
                                                                <span className="text-slate-600 dark:text-slate-400 font-black whitespace-nowrap">{eff.name}</span>
                                                                <span className="text-blue-600 font-black tabular-nums">{eff.rate}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-8 py-6 text-center text-sm font-bold bg-blue-600/95">
                                                <div className="flex flex-col gap-1.5">
                                                    {totalMetrics?.efficiency.slice(0, 3).map((eff, i) => (
                                                        <div key={i} className="flex justify-between gap-3 p-2 bg-white/10 rounded-xl border border-white/5 whitespace-nowrap">
                                                            <span className="text-white/90 font-black whitespace-nowrap">{eff.name}</span>
                                                            <span className="text-white font-black tabular-nums">{eff.rate}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {compareMetrics.map((item) => (
                            <div key={item.setNumber} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-black text-slate-950 dark:text-white group-hover:text-blue-600 transition-colors uppercase tracking-widest">{item.setNumber}세트 전술 밸런스</h3>
                                </div>
                                <div className="h-[240px] mb-8">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={item.metrics!.radar}>
                                            <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                                            <PolarAngleAxis
                                                dataKey="subject"
                                                tick={(props: any) => {
                                                    const { x, y, payload, textAnchor } = props;
                                                    const val = item.metrics?.radar.find(r => r.subject === payload.value)?.value;
                                                    return (
                                                        <text x={x} y={y} textAnchor={textAnchor} fill="#64748b" fontSize={13} fontWeight={900}>
                                                            {payload.value} ({val})
                                                        </text>
                                                    );
                                                }}
                                            />
                                            <Radar
                                                dataKey="value"
                                                stroke="#3b82f6"
                                                fill="#3b82f6"
                                                fillOpacity={0.15}
                                                strokeWidth={3}
                                                dot={(props: any) => {
                                                    const { cx, cy, payload } = props;
                                                    const sortedValues = [...item.metrics!.radar].map(r => r.value).sort((a, b) => b - a);
                                                    const isMax = payload.value === sortedValues[0];
                                                    const isMin = payload.value === sortedValues[sortedValues.length - 1];

                                                    if (isMax) {
                                                        return (
                                                            <g key={props.key}>
                                                                <circle cx={cx} cy={cy} r={10} className="fill-blue-600 opacity-30 animate-ping" />
                                                                <circle cx={cx} cy={cy} r={5} className="fill-blue-600 shadow-lg" />
                                                            </g>
                                                        );
                                                    }
                                                    if (isMin) {
                                                        return (
                                                            <g key={props.key}>
                                                                <circle cx={cx} cy={cy} r={10} className="fill-rose-500 opacity-30 animate-ping" />
                                                                <circle cx={cx} cy={cy} r={5} className="fill-rose-500 shadow-lg" />
                                                            </g>
                                                        );
                                                    }
                                                    return <circle key={props.key} cx={cx} cy={cy} r={3} fill="#cbd5e1" />;
                                                }}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">전술 포인트 분석</h4>
                                    {/* 강점과 약점을 부각시키는 로직 */}
                                    {(() => {
                                        const sortedRadar = [...item.metrics!.radar].sort((a, b) => b.value - a.value);
                                        const strength = sortedRadar[0];
                                        const weakness = sortedRadar[sortedRadar.length - 1];
                                        return (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3.5 bg-blue-600 dark:bg-blue-600 rounded-2xl shadow-lg shadow-blue-200/50 dark:shadow-none transition-transform hover:scale-[1.02]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm animate-pulse" />
                                                        <span className="text-sm font-black text-white">강점: {strength.subject}</span>
                                                    </div>
                                                    <span className="text-lg font-black text-white leading-none">{strength.value}점</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3.5 bg-rose-500 dark:bg-rose-600 rounded-2xl shadow-lg shadow-rose-200/50 dark:shadow-none transition-transform hover:scale-[1.02]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm animate-pulse" />
                                                        <span className="text-sm font-black text-white">약점: {weakness.subject}</span>
                                                    </div>
                                                    <span className="text-lg font-black text-white leading-none">{weakness.value}점</span>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : currentData && (
                <>
                    {/* 0. Scanning Overlay during Analysis */}
                    {isAnalyzing && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[48px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-6 scale-110">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                                    <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-blue-500 animate-pulse" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">AI 전술 엔진 스캔 중</h3>
                                    <p className="text-slate-500 font-bold text-sm tracking-tight">수집된 랠리 데이터를 바탕으로 최적의 전략을 도출하고 있습니다...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 1. Technical Ranking Dashboard (Scoring & Error Rankings + Clutch) */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
                        {/* Scoring Ranking Card */}
                        <div className="bg-white dark:bg-slate-950 rounded-[40px] p-8 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden group/rank-card">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                    <Trophy className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                        득점 기술 랭킹
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Top Scoring: Success Rate & Contribution</p>
                                </div>
                            </div>

                            <div className="w-full mt-4 space-y-3">
                                {currentData.efficiency.length > 0 ? (
                                    currentData.efficiency.slice(0, 5).map((item: any, index: number) => {
                                        const medals = ['🥇', '🥈', '🥉', '4위', '5위'];
                                        const maxVal = Math.max(...currentData.efficiency.map((d: any) => d.winners));
                                        const barPct = maxVal > 0 ? (item.winners / maxVal) * 100 : 0;
                                        const opacities = [1, 0.9, 0.8, 0.7, 0.6];
                                        const bgAlphas = ['bg-blue-50/50 dark:bg-blue-900/10', 'bg-blue-50/30 dark:bg-blue-900/5', 'bg-transparent', 'bg-transparent', 'bg-transparent'];

                                        return (
                                            <div
                                                key={item.name}
                                                className={`rounded-2xl px-3 py-2 border border-transparent hover:border-blue-100 dark:hover:border-white/5 ${bgAlphas[index]} transition-all duration-200 group/item`}
                                                style={{ opacity: opacities[index] }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Rank badge */}
                                                    <div className="text-lg w-7 text-center flex-shrink-0 font-bold text-slate-400">{medals[index]}</div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-baseline gap-3 min-w-0">
                                                                <span className="text-sm font-black text-slate-900 dark:text-white truncate">{item.name}</span>
                                                                <div className="flex items-center gap-3 whitespace-nowrap">
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">성공</span>
                                                                        <span className="text-base font-black text-indigo-500 tabular-nums">{item.rate}%</span>
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">기여</span>
                                                                        <span className="text-base font-black text-blue-500 tabular-nums">{item.contributionRate}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0 text-right">
                                                                <span className="text-sm font-black text-slate-400 tabular-nums">
                                                                    {item.winners}<span className="text-[10px] opacity-60 ml-0.5">/{item.attempts}</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 transition-all duration-700 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                                                                style={{ width: `${barPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-slate-300 dark:text-slate-700 font-bold italic uppercase tracking-widest text-xs">No Data Available</div>
                                )}
                            </div>
                        </div>

                        {/* Error Ranking Card */}
                        <div className="bg-white dark:bg-slate-950 rounded-[40px] p-8 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden group/rank-card">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                                    <AlertCircle className="w-5 h-5 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                        실점 원인 랭킹
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Top Error Sources: Count & Contribution</p>
                                </div>
                            </div>

                            <div className="w-full mt-4 space-y-3">
                                {currentData.errorRanking.length > 0 ? (
                                    currentData.errorRanking.slice(0, 5).map((item: any, index: number) => {
                                        const medals = ['🥇', '🥈', '🥉', '4위', '5위'];
                                        const maxVal = Math.max(...currentData.errorRanking.map((d: any) => d.count));
                                        const barPct = maxVal > 0 ? (item.count / maxVal) * 100 : 0;
                                        const opacities = [1, 0.9, 0.8, 0.7, 0.6];
                                        const bgAlphas = ['bg-rose-50/50 dark:bg-rose-900/10', 'bg-rose-50/30 dark:bg-rose-900/5', 'bg-transparent', 'bg-transparent', 'bg-transparent'];

                                        return (
                                            <div
                                                key={item.name}
                                                className={`rounded-2xl px-3 py-2 border border-transparent hover:border-rose-100 dark:hover:border-white/5 ${bgAlphas[index]} transition-all duration-200 group/item`}
                                                style={{ opacity: opacities[index] }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Rank badge */}
                                                    <div className="text-lg w-7 text-center flex-shrink-0 font-bold text-slate-400">{medals[index]}</div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-baseline gap-3 min-w-0">
                                                                <span className="text-sm font-black text-slate-900 dark:text-white truncate">{item.name}</span>
                                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">기여</span>
                                                                        <span className="text-base font-black text-rose-500 tabular-nums">{item.contributionRate}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0 text-right">
                                                                <span className="text-sm font-black text-slate-400 tabular-nums">
                                                                    {item.count}<span className="text-[10px] opacity-60 ml-0.5">회</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden border border-transparent">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-400 to-pink-500 transition-all duration-700 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                                                style={{ width: `${barPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-slate-300 dark:text-slate-700 font-bold italic uppercase tracking-widest text-xs">No Data Available</div>
                                )}
                            </div>
                        </div>

                        {/* Clutch Analysis */}
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                            <div className="mb-6 w-full">
                                <h3 className="text-xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    클러치 분석
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">15점 이후 경기 집중도</p>
                            </div>
                            <div className="relative w-40 h-40 mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: '득점', value: currentData.clutchData.winners },
                                                { name: '실점', value: currentData.clutchData.losses }
                                            ]}
                                            innerRadius={50}
                                            outerRadius={65}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#3b82f6" strokeWidth={0} />
                                            <Cell fill="#f43f5e" strokeWidth={0} />
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Win Rate</span>
                                    <span className="text-2xl font-black text-slate-950 dark:text-white">{currentData.clutchData.rate}%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-1">득점 확률</p>
                                    <p className="text-lg font-black text-blue-700 dark:text-blue-400">{currentData.clutchData.rate}%</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-2xl text-center">
                                    <p className="text-[9px] font-black text-rose-600 uppercase mb-1">실점 비율</p>
                                    <p className="text-lg font-black text-rose-700 dark:text-rose-400">{100 - currentData.clutchData.rate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. AI Coaching Card - SWOT & NEXT STRATEGY */}
                    <div className="bg-slate-950 rounded-[48px] p-10 mb-12 text-white border border-white/10 shadow-3xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
                        <div className="relative z-10 space-y-12">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-1 block">Advanced Tactical Intelligence</span>
                                    <h2 className="text-3xl font-black tracking-tight">AI 성과 분석 리포트 <span className="text-slate-500 font-bold">({selectedSet === 'total' ? '전체' : `${selectedSet}세트`})</span></h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">장점 (Strength)</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentData!.swot.strength }} />
                                    </div>
                                    <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <AlertCircle className="w-5 h-5 text-rose-400" />
                                            <span className="text-xs font-black uppercase tracking-widest text-rose-400">약점 (Weakness)</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: currentData!.swot.weakness }} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Target className="w-5 h-5 text-blue-400" />
                                            <span className="text-xs font-black uppercase tracking-widest text-blue-400">기회 (Opportunity)</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-200 leading-relaxed">{currentData!.swot.opportunity}</p>
                                    </div>
                                    <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <ArrowRightCircle className="w-5 h-5 text-orange-400" />
                                            <span className="text-xs font-black uppercase tracking-widest text-orange-400">위험 (Threat)</span>
                                        </div>
                                        <p className="text-xl font-bold text-slate-200 leading-relaxed">{currentData!.swot.threat}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-8 rounded-[40px] border border-blue-500/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <Compass className="w-6 h-6 text-blue-400" />
                                    <h3 className="text-2xl font-black tracking-tight">차후 동일 상대 대응 전략 가이드</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {currentData!.strategy.map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 bg-slate-900/50 p-6 rounded-3xl border border-white/5">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 flex-shrink-0" />
                                            <p className="text-lg font-bold text-slate-100 leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {/* Radar PI & Detailed Explanations */}
                        <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="mb-10">
                                <h3 className="text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
                                    <Compass className="w-8 h-8 text-blue-600" />
                                    전술 밸런스 심층 분석
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Advanced Performance Radar</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                                <div className="lg:col-span-5 h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={currentData!.radar}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis
                                                dataKey="subject"
                                                tick={(props: any) => {
                                                    const { x, y, payload, textAnchor } = props;
                                                    const val = currentData?.radar.find(r => r.subject === payload.value)?.value;
                                                    return (
                                                        <text x={x} y={y} textAnchor={textAnchor} fill="#64748b" fontSize={13} fontWeight={900}>
                                                            {payload.value} <tspan fill="#3b82f6">({val})</tspan>
                                                        </text>
                                                    );
                                                }}
                                            />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar name="지표" dataKey="value" stroke="#3b82f6" fill="#3b82f6" strokeWidth={5} fillOpacity={0.15} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="lg:col-span-7 space-y-10 lg:pl-12 lg:border-l border-slate-100 dark:border-slate-800">
                                    {currentData!.radar.map((r, idx) => (
                                        <div key={idx} className="group">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{r.subject}</span>
                                                <span className="text-lg font-black text-blue-600 tabular-nums">{r.value}pts</span>
                                            </div>
                                            <div className="p-0 transition-colors" dangerouslySetInnerHTML={{ __html: r.reason }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Phase & Flow */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl group">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Phase Performance</h3>
                                    <Clock className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="space-y-10">
                                    {currentData!.phase.map((p, idx) => (
                                        <div key={idx} className="space-y-4">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{p.name}</span>
                                                <span className="text-2xl font-black text-slate-950 dark:text-white tabular-nums">{p.winRate}%</span>
                                            </div>
                                            <div className="h-5 bg-slate-50 dark:bg-slate-950 rounded-full border border-slate-100 dark:border-slate-800 p-1">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        p.winRate > 50 ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                                                    )}
                                                    style={{ width: `${p.winRate}%` }}
                                                />
                                            </div>
                                            <p className="text-lg font-bold text-slate-600 dark:text-slate-400 leading-relaxed pl-1">— {p.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950 rounded-[40px] p-10 border border-white/5 shadow-2xl flex flex-col justify-between overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-6 mb-12">
                                        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20">
                                            <Zap className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black text-white uppercase tracking-tight">Momentum Index</h4>
                                            <p className="text-xs text-emerald-500 font-bold uppercase tracking-[0.3em] mt-1">Burst Performance Capacity</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 mb-10">
                                        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                            <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">MAX STREAK</p>
                                            <p className="text-5xl font-black text-white tabular-nums">{currentData!.winStreak}<span className="text-sm ml-2 text-slate-400">PTS</span></p>
                                        </div>
                                        <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                            <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] mb-4">IMPACT SCALE</p>
                                            <p className="text-5xl font-black text-white tabular-nums">
                                                {(currentData!.winPoints / (currentData!.winPoints + (currentData!.winStreak || 1))).toFixed(1)}<span className="text-sm ml-2 text-slate-400">X</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 p-8 rounded-[32px] border border-white/5">
                                        <h4 className="text-base font-black text-emerald-500 uppercase tracking-widest mb-4">모멘텀 지수 상세 설명</h4>
                                        <p className="text-xl font-bold text-slate-300 leading-relaxed">
                                            모멘텀 지수는 경기 중 한 번 잡은 기세를 얼마나 파괴력 있게 지속하느냐를 측정합니다. <br />
                                            <strong className="text-white">Max Streak</strong>은 최대 연속 득점수를 의미하며, <strong className="text-white">Impact Scale</strong>은 이 기세가 전체 승률에 미친 유효 영향력을 지표화한 것입니다.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
