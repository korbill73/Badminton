'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Activity,
  Target,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Video,
  Flame,
  Zap,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDMatch, BDPointLog } from '@/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function HomePage() {
  const [recentMatches, setRecentMatches] = useState<BDMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMatches: 0,
    winRate: 0,
    bestTechnique: { name: 'N/A', rate: 0 },
    recentForm: [] as ('W' | 'L')[],
    totalPoints: 0
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. 최근 경기 가져오기
      const { data: matches, error } = await supabase
        .from('bd_matches')
        .select(`
          *,
          tournament:bd_tournaments(name),
          opponent_1:bd_players!opponent_1_id(name)
        `)
        .order('match_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      const recentMatchesData = matches || [];
      setRecentMatches(recentMatchesData);

      // 2. 전체 경기 수 및 승수 조회
      const { count: totalMatchCount } = await supabase
        .from('bd_matches')
        .select('*', { count: 'exact', head: true });

      const { count: winCount } = await supabase
        .from('bd_matches')
        .select('*', { count: 'exact', head: true })
        .eq('match_result', 'win');

      // 3. 전체 누적 득점수 조회 (정확한 수치 반영을 위해 별도 카운트)
      const { count: totalPointCount } = await supabase
        .from('bd_point_logs')
        .select('*', { count: 'exact', head: true })
        .eq('is_my_point', true);

      // 4. 최근 경기 흐름 (W, L)
      const form = recentMatchesData.map(m => m.match_result === 'win' ? 'W' : 'L').reverse();

      // 5. 기술 분석 (최근 200개 로그 기준)
      const { data: logs } = await supabase
        .from('bd_point_logs')
        .select('point_type, is_my_point')
        .order('created_at', { ascending: false })
        .limit(200);

      let topTech = { name: '없음', rate: 0 };
      if (logs && logs.length > 0) {
        const myPoints = logs.filter(l => l.is_my_point);
        const techCounts: Record<string, number> = {};
        myPoints.forEach(p => {
          if (!p.point_type) return;
          techCounts[p.point_type] = (techCounts[p.point_type] || 0) + 1;
        });

        const sortedTech = Object.entries(techCounts).sort((a, b) => b[1] - a[1]);
        if (sortedTech.length > 0) {
          const totalMyLogPoints = myPoints.length;
          topTech = {
            name: sortedTech[0][0],
            rate: Math.round((sortedTech[0][1] / totalMyLogPoints) * 100)
          };
        }
      }

      setStats({
        totalMatches: totalMatchCount || 0,
        winRate: totalMatchCount ? Math.round(((winCount || 0) / totalMatchCount) * 100) : 0,
        bestTechnique: topTech,
        recentForm: form as ('W' | 'L')[],
        totalPoints: totalPointCount || 0
      });

    } catch (err: any) {
      console.error('대시보드 데이터 로드 실패:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            대시보드 <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
          </h1>
          <p className="text-slate-500 mt-1 font-semibold text-sm md:text-lg">성장을 위한 데이터 분석, Elite Badminton 2.0</p>
        </div>
        <Link href="/tournaments" className="w-full md:w-auto">
          <button className="w-full group relative px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 overflow-hidden transition-all hover:bg-blue-500 active:scale-95 shadow-xl shadow-blue-500/20">
            <Plus className="w-5 h-5" />
            <span>새 경기 기록</span>
          </button>
        </Link>
      </div>

      {/* ── 누적 통계 요약 바 (Summary Bar) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 md:p-6 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-around min-w-[400px] md:min-w-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">전체 누적 경기</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">{stats.totalMatches}</span>
              <span className="text-[10px] md:text-sm font-bold text-slate-400">경기</span>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">통산 승률</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-3xl font-black text-emerald-500">{stats.winRate}</span>
              <span className="text-[10px] md:text-sm font-bold text-slate-400">%</span>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">총 누적 득점</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl md:text-3xl font-black text-blue-600">{stats.totalPoints.toLocaleString()}</span>
              <span className="text-[10px] md:text-sm font-bold text-slate-400">PTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 상세 지표 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <StatCard
          title="최근 경기 흐름"
          value={
            <div className="flex gap-1.5 items-center">
              {stats.recentForm.length > 0 ? (
                stats.recentForm.map((res, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-black border-2",
                      res === 'W' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600" : "bg-rose-500/10 border-rose-500 text-rose-600"
                    )}
                  >
                    {res}
                  </div>
                ))
              ) : (
                <span className="text-slate-300">-</span>
              )}
            </div>
          }
          icon={<Flame className="w-5 h-5" />}
          color="orange"
          description="최근 5경기의 승리/패배 기록입니다."
        />
        <StatCard
          title="주력 득점 기술"
          value={stats.bestTechnique.name}
          subValue={`득점 점유율 ${stats.bestTechnique.rate}%`}
          icon={<Target className="w-5 h-5" />}
          color="indigo"
          description="현재 경기에서 가장 효율적인 득점 수단입니다."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── 최근 분석 리포트 ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center px-2">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">최근 분석 리포트</h2>
              <p className="text-xs md:text-sm text-slate-400 font-medium">나의 경기 내용을 한눈에 확인하세요</p>
            </div>
            <Link href="/tournaments" className="px-3 py-2 text-[10px] md:text-xs font-black text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-1 uppercase tracking-widest">
              전체 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-3 md:gap-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white/50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 opacity-50" />
                <p className="font-bold text-sm animate-pulse">데이터를 수집하고 있습니다...</p>
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold text-sm">아직 기록된 경기가 없습니다. 첫 발을 떼보세요!</p>
              </div>
            ) : (
              recentMatches.map((match) => (
                <Link key={match.id} href={`/analysis/detail?id=${match.id}`}>
                  <div className="group relative bg-white dark:bg-slate-900 px-4 py-4 md:px-6 md:py-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500/50 hover:shadow-2xl transition-all duration-300 flex items-center justify-between cursor-pointer overflow-hidden active:scale-[0.98]">
                    {/* Hover Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/0 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex items-center gap-4 md:gap-6 relative">
                      <div className={cn(
                        "w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl italic shadow-lg shrink-0 transition-transform group-hover:scale-110",
                        match.match_result === 'win'
                          ? "bg-emerald-500 text-white shadow-emerald-200 dark:shadow-none"
                          : "bg-rose-500 text-white shadow-rose-200 dark:shadow-none"
                      )}>
                        {match.match_result === 'win' ? 'W' : 'L'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded tracking-tighter uppercase shrink-0">
                            {match.category}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 truncate">
                            {match.tournament?.name || '일반 매치'}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                          <span className="opacity-30 font-medium">vs</span> {match.opponent_1?.name}
                        </h3>
                        <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase">{match.match_date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-8 relative">
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SET SCORE</p>
                        <p className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                          {match.my_set_score} : {match.opponent_set_score}
                        </p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* ── 사이드바 인사이트 ── */}
        <div className="space-y-6">
          {/* Motivation Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-blue-700 dark:to-blue-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group border border-white/5">
            <Zap className="absolute -right-6 -top-6 w-32 h-32 text-white/5 rotate-12 group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur">
                <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black mb-3">경기 분석 완료 🏸</h3>
              <p className="text-slate-400 dark:text-blue-100 text-sm leading-relaxed font-medium">
                작성하신 랠리 로그를 기반으로 인공지능이 강점과 약점을 분석 중입니다. <br /><br />
                <span className="text-white">후반 15점 이후의 집중력</span>이 승률 확보의 핵심 포인트입니다.
              </p>
              <button className="mt-8 px-6 py-3 bg-white text-slate-900 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-slate-100 transition-all active:scale-95">
                AI 리포트 보기 <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Technical Highlights */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="font-black flex items-center gap-2 mb-8 text-xs text-slate-400 uppercase tracking-[0.2em]">
              <Target className="w-4 h-4 text-blue-500" />
              경쟁력 데이터
            </h3>
            <div className="space-y-8">
              <HighlightItem
                title="스매시 공격력"
                value={`${stats.winRate > 60 ? '최상위권' : '안정적'}`}
                icon={<Flame className="w-4 h-4" />}
                trend="+4.2%"
                positive
              />
              <HighlightItem
                title="범실 제어력"
                value="상위 15%"
                icon={<ShieldCheck className="w-4 h-4" />}
                trend="매우 안정"
                positive
              />
              <HighlightItem
                title="네트 앞 장악력"
                value="탁월함"
                icon={<Zap className="w-4 h-4" />}
                trend="+12%"
                positive
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, unit, icon, color, description }: any) {
  const iconBg = {
    blue: "bg-blue-400/10",
    green: "bg-emerald-400/10",
    indigo: "bg-indigo-400/10",
    orange: "bg-orange-400/10",
  }[color as 'blue' | 'green' | 'indigo' | 'orange'];

  const iconColor = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    indigo: "text-indigo-600",
    orange: "text-orange-600",
  }[color as 'blue' | 'green' | 'indigo' | 'orange'];

  return (
    <div className="bg-white dark:bg-slate-900 p-5 md:p-7 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4 md:mb-6">
        <div className={cn("p-3 rounded-2xl", iconBg)}>
          <div className={cn("w-5 h-5", iconColor)}>
            {icon}
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            {value}
          </div>
          {unit && <span className="text-xs md:text-sm font-bold text-slate-400 ml-0.5">{unit}</span>}
        </div>
        {subValue && (
          <p className="text-[11px] md:text-xs font-bold text-indigo-500 mt-1">{subValue}</p>
        )}
        <p className="text-[11px] text-slate-400 font-medium mt-3 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function HighlightItem({ title, value, trend, positive, icon }: any) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-blue-500 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{title}</p>
          <span className={cn(
            "text-[9px] font-black px-1.5 py-0.5 rounded",
            positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend}
          </span>
        </div>
        <p className="text-[13px] md:text-sm font-black text-blue-600 dark:text-blue-400">{value}</p>
      </div>
    </div>
  );
}

