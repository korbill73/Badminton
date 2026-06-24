'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Trophy, 
    Target, 
    TrendingUp, 
    Activity, 
    BookOpen, 
    ChevronRight,
    Loader2,
    ShieldCheck,
    Zap,
    AlertTriangle,
    Server,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import PerformancePage from '@/app/performance/page';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis as BarXAxis, YAxis as BarYAxis, CartesianGrid, LabelList
} from 'recharts';

const COLORS_WIN = ['#00d2ff', '#3a7bd5', '#7f00ff', '#e100ff', '#ff00cc', '#ff0066', '#ff4b2b', '#ff416c'];
const COLORS_LOSS = ['#ff4b2b', '#ff416c', '#f7971e', '#ffd200', '#91ff00', '#00ff88', '#00dbde', '#fc00ff'];
const COLORS_PRIMARY = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#38bdf8'];

export default function Dashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | '단식' | '복식'>('all');
    const [stats, setStats] = useState({
        totalMatches: 0,
        winRate: 0,
        totalPoints: 0,
        opponentPoints: 0,
        winLoss: { w: 0, l: 0 }
    });
    const [allLogs, setAllLogs] = useState<any[]>([]);
    const [allMatches, setAllMatches] = useState<any[]>([]);
    const [allProMatches, setAllProMatches] = useState<any[]>([]);

    const initialWin = [
        { group: '스매시', items: ['직선 스매시', '대각 스매시', '반 스매시'] }, 
        { group: '드롭', items: ['직선', '대각(크로스)'] }, 
        { group: '네트 플레이', items: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬'] }, 
        { group: '기타 공격', items: ['드라이브', '클리어 공격', '롱서브', '행운의 득점'] }, 
        { group: '상대 에러', items: ['언더 에러', '스매시 에러', '서브 에러', '클리어 에러', '기본기 에러', '백핸드 에러'] }
    ];
    const initialLoss = [
        { group: '상대 공격 득점', items: ['스매시', '대각 스매시', '헤어핀', '크 헤어핀', '드롭', '헤 + 푸시'] }, 
        { group: '전술 당함', items: ['페인트 모션', '코스 속임수', '템포 변화'] }, 
        { group: '나의 에러', items: ['스매시 에러', '드롭 에러', '언더 에러', '헤어핀 에러', '클리어 에러', '기본기 에러'] }
    ];

    useEffect(() => {
        async function fetchAllData() {
            setLoading(true);
            try {
                const { data: matches } = await supabase.from('bd_matches').select('*');
                const { data: proMatches } = await supabase.from('pro_matches').select('*');
                const { data: pointLogs } = await supabase.from('bd_point_logs').select('*');
                setAllMatches(matches || []);
                setAllProMatches(proMatches || []);
                setAllLogs(pointLogs || []);
            } finally {
                setLoading(false);
            }
        }
        fetchAllData();
    }, []);

    // Filtered data based on match type
    const filteredMatches = useMemo(() => {
        if (filterType === 'all') return allMatches;
        return allMatches.filter(m => m.match_type === filterType);
    }, [allMatches, filterType]);

    const filteredLogs = useMemo(() => {
        const allowedIds = new Set(filteredMatches.map(m => m.id));
        return allLogs.filter(l => allowedIds.has(l.match_id));
    }, [allLogs, filteredMatches]);

    // Recalculate stats for filtered view
    const statsDivision = useMemo(() => {
        const parseStats = (raw: string) => {
            if (!raw) return { view_count: 0, view_duration: 0 };
            try {
                const jsonMatch = raw.match(/\{.*\}/s);
                if (jsonMatch) {
                    const meta = JSON.parse(jsonMatch[0]);
                    return meta.stats || { view_count: 0, view_duration: 0 };
                }
            } catch (e) {}
            return { view_count: 0, view_duration: 0 };
        };

        const calc = (matchList: any[], isPro = false) => {
            let views = 0, duration = 0;
            matchList.forEach(m => {
                const s = parseStats(isPro ? m.summary : (m.feedback_notes || m.summary || ''));
                views += s.view_count || 0;
                duration += s.view_duration || 0;
            });
            return { views, duration, count: matchList.length };
        };

        const matchStats = calc(filteredMatches);
        const highSchoolStats = calc(allProMatches.filter(m => (m.category || '고등부') === '고등부'), true);
        const proStats = calc(allProMatches.filter(m => m.category === '프로'), true);

        return {
            matchStats,
            highSchoolStats,
            proStats,
            totalViews: matchStats.views + highSchoolStats.views + proStats.views,
            totalDuration: matchStats.duration + highSchoolStats.duration + proStats.duration
        };
    }, [filteredMatches, allProMatches]);

    const currentStats = useMemo(() => {
        let w = 0, l = 0, totalP = 0, totalO = 0;

        filteredMatches.forEach(m => {
            const p1 = Number(m.set_1_score_player || 0), o1 = Number(m.set_1_score_opponent || 0);
            const p2 = Number(m.set_2_score_player || 0), o2 = Number(m.set_2_score_opponent || 0);
            const p3 = Number(m.set_3_score_player || 0), o3 = Number(m.set_3_score_opponent || 0);
            totalP += (p1 + p2 + p3);
            totalO += (o1 + o2 + o3);
            const s1 = p1 > o1 ? 1 : 0, s2 = p2 > o2 ? 1 : 0, s3 = p3 > o3 ? 1 : 0;
            if ((s1 + s2 + s3) >= 2) w++; else l++;
        });
        return {
            totalMatches: filteredMatches.length,
            winRate: filteredMatches.length ? Math.round((w / filteredMatches.length) * 100) : 0,
            totalPoints: totalP,
            opponentPoints: totalO,
            winLoss: { w, l }
        };
    }, [filteredMatches]);

    // Derived Chart Data (Win/Loss Primary & Technique)
    const winPrimaryData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredLogs.filter(l => l.is_my_point).forEach(l => {
            const pCat = initialWin.find(c => c.items.includes(l.point_type))?.group || '기타';
            counts[pCat] = (counts[pCat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredLogs]);

    const lossPrimaryData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredLogs.filter(l => !l.is_my_point).forEach(l => {
            const pCat = initialLoss.find(c => c.items.includes(l.point_type))?.group || '기타';
            counts[pCat] = (counts[pCat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredLogs]);

    const winData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredLogs.filter(l => l.is_my_point).forEach(l => { counts[l.point_type] = (counts[l.point_type] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredLogs]);

    const lossData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredLogs.filter(l => !l.is_my_point).forEach(l => { counts[l.point_type] = (counts[l.point_type] || 0) + 1; });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredLogs]);

    const totalWin = winData.reduce((acc, d) => acc + d.value, 0);
    const totalLoss = lossData.reduce((acc, d) => acc + d.value, 0);

    const analysisText = useMemo(() => {
        if (filteredLogs.length < 5) return { strength: '데이터 수집 중...', weakness: '데이터 수집 중...' };
        const bestTech = winData[0];
        const worstError = lossData[0];
        let strength = bestTech ? `[${filterType === 'all' ? '종합' : filterType}] 누적 ${bestTech.value}회의 [${bestTech.name}] 득점이 가장 확실한 공격 루트입니다.` : '분석된 전술 패턴이 없습니다.';
        let weakness = worstError ? `[${filterType === 'all' ? '종합' : filterType}] ${worstError.value}회의 [${worstError.name}] 실점을 최소화하는 것이 시급합니다.` : '치명적인 약점은 발견되지 않았습니다.';
        return { strength, weakness };
    }, [filteredLogs, winData, lossData, filterType]);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
        const RADIAN = Math.PI / 180;
        const radius = isMobile ? outerRadius * 1.1 : outerRadius * 1.25; 
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.04) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={isMobile ? 9 : 11} fontWeight={900}>
                {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    if (loading) return (
        <div className="h-screen bg-[#080d1a] flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080d1a] text-white p-4 md:p-12 space-y-8 md:space-y-12 overflow-y-auto custom-scrollbar shadow-inner">
            
            {/* GLOBAL HEADER */}
            <div className="max-w-[1500px] mx-auto flex flex-col lg:flex-row justify-between items-center lg:items-center gap-8 bg-[#0b1221] p-6 md:p-12 rounded-3xl md:rounded-[4rem] border border-white/5 relative overflow-hidden shadow-[0_0_80px_rgba(37,99,235,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/[0.03] to-transparent" />
                <div className="relative z-10 space-y-4 text-center lg:text-left w-full">
                    <div className="flex items-center justify-center lg:justify-start gap-3 text-blue-500 font-black tracking-[0.4em] text-[10px] uppercase">
                        <Activity className="w-6 h-6 animate-pulse" /> MY BADMINTON PERFORMANCE DATA
                    </div>
                    <div className="flex flex-col gap-6">
                        <h1 className="text-4xl md:text-7xl font-black tracking-tight md:tracking-tighter leading-none">나의 경기 기록 통계<span className="text-blue-600">.</span></h1>
                        {/* Match Type Switcher */}
                        <div className="flex bg-white/5 p-1 rounded-2xl md:rounded-[1.5rem] border border-white/10 mx-auto lg:mx-0 w-fit">
                            {(['all', '단식', '복식'] as const).map((t) => (
                                <button 
                                    key={t} onClick={() => setFilterType(t)} 
                                    className={cn(
                                        "px-4 md:px-8 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-[12px] font-black uppercase tracking-widest transition-all",
                                        filterType === t ? "bg-blue-600 text-white shadow-xl" : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    {t === 'all' ? '통합' : t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-slate-400 font-medium text-base md:text-xl max-w-4xl leading-relaxed mx-auto lg:mx-0">
                        최종 선택된 <span className="text-white font-black underline underline-offset-8 decoration-blue-500">{currentStats.totalMatches}경기</span>의 통합 빅데이터를 분석한 정밀 리포트입니다.
                    </p>
                </div>
                <Link href="/guide" className="relative z-10 group flex items-center gap-4 px-8 md:px-10 py-5 md:py-7 bg-blue-600 text-white rounded-[2rem] hover:bg-blue-500 transition-all shadow-[0_0_50px_rgba(37,99,235,0.25)] shrink-0">
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
                    <span className="text-xl md:text-2xl font-black whitespace-nowrap">운영 매뉴얼</span>
                </Link>
            </div>

            <div className="max-w-[1500px] mx-auto space-y-8 md:space-y-12">
                
                {/* GLOBAL SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-[#0f172a] border border-blue-500/20 p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] flex flex-col gap-4 md:gap-5 relative overflow-hidden shadow-2xl group hover:border-blue-500/40 transition-all">
                        <div className="absolute top-4 right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target className="w-24 md:w-32 h-24 md:h-32 text-blue-400" /></div>
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 md:w-6 md:h-6 text-blue-300" />
                            <span className="text-[10px] md:text-sm font-black tracking-widest text-blue-300 uppercase underline decoration-blue-500/50 decoration-4 underline-offset-8 italic">최강 득점 무기 ({filterType === 'all' ? 'TOTAL' : filterType.toUpperCase()})</span>
                        </div>
                        <p className="text-white text-xl md:text-3xl font-black leading-tight pr-10">{analysisText.strength}</p>
                    </div>
                    <div className="bg-[#0f172a] border border-rose-500/20 p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] flex flex-col gap-4 md:gap-5 relative overflow-hidden shadow-2xl group hover:border-rose-500/40 transition-all">
                        <div className="absolute top-4 right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><AlertTriangle className="w-24 md:w-32 h-24 md:h-32 text-rose-400" /></div>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-rose-300" />
                            <span className="text-[10px] md:text-sm font-black tracking-widest text-rose-300 uppercase underline decoration-rose-500/50 decoration-4 underline-offset-8 italic">치명적 실점 루트 ({filterType === 'all' ? 'TOTAL' : filterType.toUpperCase()})</span>
                        </div>
                        <p className="text-white text-xl md:text-3xl font-black leading-tight pr-10">{analysisText.weakness}</p>
                    </div>
                </div>

                {/* KPI STATS - DIVIDED BY CATEGORY */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Overall Summary */}
                    <div className="md:col-span-3 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 p-8 md:p-12 rounded-[2.5rem] border border-blue-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-around gap-8">
                        <div className="text-center md:text-left">
                            <p className="text-blue-300 font-black text-sm md:text-lg uppercase tracking-[0.3em] mb-3 italic">Total Combined Performance</p>
                            <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter">전체 통합 데이터 분석 리포트</h2>
                        </div>
                        <div className="flex gap-12 md:gap-20">
                            <div className="text-center">
                                <p className="text-slate-400 font-bold text-xs md:text-sm uppercase mb-2">누적 총 조회수</p>
                                <span className="text-3xl md:text-6xl font-black text-blue-400 tabular-nums">{statsDivision.totalViews.toLocaleString()}<span className="text-sm md:text-xl text-slate-600 ml-2 italic">회</span></span>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-400 font-bold text-xs md:text-sm uppercase mb-2">누적 총 시청시간</p>
                                <span className="text-3xl md:text-6xl font-black text-amber-400 tabular-nums">{Math.floor(statsDivision.totalDuration / 60).toLocaleString()}<span className="text-sm md:text-xl text-slate-600 ml-2 italic">분</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Divided Stats */}
                    <div className="bg-[#0b1221] p-8 md:p-10 rounded-[2.5rem] border border-white/5 hover:border-blue-500/40 transition-all shadow-xl group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-600/10 rounded-xl border border-blue-500/20"><Trophy className="w-6 h-6 text-blue-500" /></div>
                            <h4 className="text-xl md:text-2xl font-black text-white italic tracking-tight">경기 기록 영상</h4>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">등록 경기수</span>
                                <span className="text-2xl font-black text-white">{statsDivision.matchStats.count}<span className="text-xs text-slate-600 ml-1">게임</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 조회수</span>
                                <span className="text-2xl font-black text-blue-400">{statsDivision.matchStats.views.toLocaleString()}<span className="text-xs text-slate-600 ml-1">회</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 시청시간</span>
                                <span className="text-2xl font-black text-amber-400">{Math.floor(statsDivision.matchStats.duration / 60).toLocaleString()}<span className="text-xs text-slate-600 ml-1">분</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0b1221] p-8 md:p-10 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/40 transition-all shadow-xl group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-600/10 rounded-xl border border-emerald-500/20"><Zap className="w-6 h-6 text-emerald-500" /></div>
                            <h4 className="text-xl md:text-2xl font-black text-white italic tracking-tight">우수 선수 분석 (고등부)</h4>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">분석 영상수</span>
                                <span className="text-2xl font-black text-white">{statsDivision.highSchoolStats.count}<span className="text-xs text-slate-600 ml-1">개</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 조회수</span>
                                <span className="text-2xl font-black text-blue-400">{statsDivision.highSchoolStats.views.toLocaleString()}<span className="text-xs text-slate-600 ml-1">회</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 시청시간</span>
                                <span className="text-2xl font-black text-amber-400">{Math.floor(statsDivision.highSchoolStats.duration / 60).toLocaleString()}<span className="text-xs text-slate-600 ml-1">분</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0b1221] p-8 md:p-10 rounded-[2.5rem] border border-white/5 hover:border-purple-500/40 transition-all shadow-xl group">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-purple-600/10 rounded-xl border border-purple-500/20"><Target className="w-6 h-6 text-purple-500" /></div>
                            <h4 className="text-xl md:text-2xl font-black text-white italic tracking-tight">우수 선수 분석 (프로)</h4>
                        </div>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">분석 영상수</span>
                                <span className="text-2xl font-black text-white">{statsDivision.proStats.count}<span className="text-xs text-slate-600 ml-1">개</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 조회수</span>
                                <span className="text-2xl font-black text-blue-400">{statsDivision.proStats.views.toLocaleString()}<span className="text-xs text-slate-600 ml-1">회</span></span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-500 font-bold text-sm">누적 시청시간</span>
                                <span className="text-2xl font-black text-amber-400">{Math.floor(statsDivision.proStats.duration / 60).toLocaleString()}<span className="text-xs text-slate-600 ml-1">분</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TACTICAL DONUTS - 1ST LEVEL */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-[#0b1221] border border-white/5 p-6 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col gap-6 md:gap-10">
                        <div className="flex items-center gap-3">
                            <Server className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
                            <h3 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase">1차 전술 분포 리포트 (WIN)</h3>
                        </div>
                        <div className="h-[300px] md:h-[500px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <Pie data={winPrimaryData} innerRadius={isMobile ? 60 : 100} outerRadius={isMobile ? 90 : 150} paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false}>
                                        {winPrimaryData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS_PRIMARY[i % COLORS_PRIMARY.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                                <span className="text-3xl md:text-7xl font-black text-white">{totalWin}</span>
                                <span className="text-[8px] md:text-[11px] font-black text-slate-500 tracking-[0.4em] uppercase">Tactical Wins</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#0b1221] border border-white/5 p-6 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col gap-6 md:gap-10">
                        <div className="flex items-center gap-3">
                            <Server className="w-6 h-6 md:w-8 md:h-8 text-rose-500" />
                            <h3 className="text-xl md:text-3xl font-black text-white italic tracking-tighter uppercase">1차 전술 분포 리포트 (LOSS)</h3>
                        </div>
                        <div className="h-[300px] md:h-[500px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                                    <Pie data={lossPrimaryData} innerRadius={isMobile ? 60 : 100} outerRadius={isMobile ? 90 : 150} paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false}>
                                        {lossPrimaryData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS_PRIMARY[(i + 4) % COLORS_PRIMARY.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                                <span className="text-3xl md:text-7xl font-black text-white">{totalLoss}</span>
                                <span className="text-[8px] md:text-[11px] font-black text-slate-500 tracking-[0.4em] uppercase">Tactical Losses</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TACTICAL DONUTS - 2ND LEVEL (PRECISION) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-[#0b1221] border border-blue-500/20 p-6 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col gap-6 md:gap-10">
                        <div className="flex items-center gap-3">
                            <Zap className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
                            <h3 className="text-xl md:text-3xl font-black text-cyan-50 italic tracking-tighter uppercase">2차 정밀 기술 분석 (WIN)</h3>
                        </div>
                        <div className="h-[300px] md:h-[500px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <Pie data={winData} innerRadius={isMobile ? 60 : 100} outerRadius={isMobile ? 90 : 150} paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false}>
                                        {winData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS_WIN[i % COLORS_WIN.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-[#0b1221] border border-rose-500/20 p-6 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col gap-6 md:gap-10">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-rose-400" />
                            <h3 className="text-xl md:text-3xl font-black text-rose-50 italic tracking-tighter uppercase">2차 정밀 에러 분석 (LOSS)</h3>
                        </div>
                        <div className="h-[300px] md:h-[500px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <Pie data={lossData} innerRadius={isMobile ? 60 : 100} outerRadius={isMobile ? 90 : 150} paddingAngle={3} dataKey="value" stroke="none" label={renderCustomizedLabel} labelLine={false}>
                                        {lossData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS_LOSS[i % COLORS_LOSS.length]} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '15px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* RANKING CHARTS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div className="bg-[#0b1221] border border-blue-500/20 p-8 md:p-12 rounded-3xl md:rounded-[4rem] shadow-2xl flex flex-col gap-8 md:gap-10">
                        <h3 className="text-xl md:text-3xl font-black text-blue-300 tracking-[0.2em] uppercase text-center italic">Technique Ranking</h3>
                        <div className="h-[400px] md:h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={winData.slice(0, 10)} layout="vertical" margin={{ top: 10, right: isMobile ? 40 : 120, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                    <BarXAxis type="number" hide />
                                    <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#ffffff90', fontSize: isMobile ? 11 : 15, fontWeight: 900 }} width={isMobile ? 80 : 140} />
                                    <Bar dataKey="value" fill="url(#winGradient)" radius={[0, 10, 10, 0]} barSize={isMobile ? 20 : 30}>
                                        <defs>
                                            <linearGradient id="winGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#60a5fa" />
                                            </linearGradient>
                                        </defs>
                                        <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}회`} fill="#94a3b8" fontSize={isMobile ? 11 : 14} fontWeight={900} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-[#0b1221] border border-rose-500/20 p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] flex flex-col gap-8 md:gap-10 shadow-2xl relative overflow-hidden">
                        <h3 className="text-xl md:text-3xl font-black text-rose-300 tracking-[0.2em] uppercase text-center italic">Error Ranking</h3>
                        <div className="h-[400px] md:h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={lossData.slice(0, 10)} layout="vertical" margin={{ top: 10, right: isMobile ? 40 : 120, left: 0, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff05" />
                                    <BarXAxis type="number" hide />
                                    <BarYAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#ffffff90', fontSize: isMobile ? 11 : 15, fontWeight: 900 }} width={isMobile ? 80 : 140} />
                                    <Bar dataKey="value" fill="url(#lossGradient)" radius={[0, 10, 10, 0]} barSize={isMobile ? 20 : 30}>
                                        <defs>
                                            <linearGradient id="lossGradient" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#f43f5e" />
                                                <stop offset="100%" stopColor="#fb7185" />
                                            </linearGradient>
                                        </defs>
                                        <LabelList dataKey="value" position="right" formatter={(v: any) => `${v}회`} fill="#94a3b8" fontSize={isMobile ? 11 : 14} fontWeight={900} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* SECURITY FOOTER */}
                <div className="bg-[#080d1a] p-8 md:p-16 rounded-[2rem] md:rounded-[5rem] border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 shadow-inner">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 text-center md:text-left">
                        <div className="p-5 md:p-7 bg-blue-600/10 rounded-2xl md:rounded-[2.5rem] border border-blue-500/20 shadow-2xl"><ShieldCheck className="w-10 h-10 md:w-14 md:h-14 text-blue-500" /></div>
                        <div>
                            <h4 className="text-xl md:text-4xl font-black tracking-tighter">유형별 전술 통합 정합성 완료</h4>
                            <p className="text-slate-500 font-bold text-sm md:text-lg max-w-3xl leading-relaxed">
                                글로벌 분석 엔진에 의해 모든 데이터가 실시간 동기화되고 있습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* INTEGRATED PERFORMANCE DASHBOARD */}
                <div className="pt-10 md:pt-20 border-t border-white/10 mt-10 md:mt-20">
                    <div className="mb-10 flex items-center gap-4 px-4">
                        <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30">
                            <Activity className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white">트레이닝 지표 통합 분석</h2>
                            <p className="text-slate-400 font-bold mt-2">최근 30일 데이터 기반 AI 코칭 분석 리포트입니다.</p>
                        </div>
                    </div>
                    <PerformancePage />
                </div>

            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: ${isMobile ? '6px' : '8px'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.15); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                body { background-color: #080d1a; overflow-x: hidden; }
            `}</style>
        </div>
    );
}
