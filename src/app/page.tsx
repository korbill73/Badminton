'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Users,
  Activity,
  Target,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Loader2,
  Video
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDMatch } from '@/types';
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
    totalPoints: 0,
    clutchWinRate: 0
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch recent 5 matches
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
      if (matches) setRecentMatches(matches);

      // Simple stats (could be more complex, but for now just counts)
      const { count: total } = await supabase
        .from('bd_matches')
        .select('*', { count: 'exact', head: true });

      const { count: wins } = await supabase
        .from('bd_matches')
        .select('*', { count: 'exact', head: true })
        .eq('match_result', 'win');

      setStats({
        totalMatches: total || 0,
        winRate: total ? Math.round(((wins || 0) / total) * 100) : 0,
        totalPoints: 0, // Need logs for this
        clutchWinRate: 75 // Placeholder
      });

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 mt-2 font-medium">환영합니다! 오늘 당신의 성장을 기록해 보세요.</p>
        </div>
        <Link href="/tournaments">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-none active:scale-95">
            <Plus className="w-5 h-5" />
            새 경기 기록하기
          </button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Matches"
          value={stats.totalMatches}
          icon={<Trophy className="w-5 h-5" />}
          color="blue"
          trend="+2 this week"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate}%`}
          icon={<Activity className="w-5 h-5" />}
          color="green"
          trend="↑ 4.2%"
        />
        <StatCard
          title="Total Players"
          value="12"
          icon={<Users className="w-5 h-5" />}
          color="indigo"
        />
        <StatCard
          title="Clutch Points"
          value={`${stats.clutchWinRate}%`}
          icon={<Target className="w-5 h-5" />}
          color="orange"
          trend="Top 10%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Matches */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xl font-bold">최근 경기 분석 (Recent)</h2>
            <Link href="/tournaments" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              더 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>데이터 로딩 중...</p>
              </div>
            ) : recentMatches.length === 0 ? (
              <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400">데이터가 없습니다. 첫 경기를 등록해 보세요!</p>
              </div>
            ) : (
              recentMatches.map((match) => (
                <Link key={match.id} href={`/analysis/${match.id}`}>
                  <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl italic shadow-inner",
                        match.match_result === 'win' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {match.match_result === 'win' ? 'W' : 'L'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md uppercase tracking-wider">
                            {match.category}
                          </span>
                          <span className="text-xs font-medium text-slate-400">
                            {match.match_date} • {match.tournament?.name}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          <span className="opacity-50 font-medium">vs</span> {match.opponent_1?.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter mb-1">Score</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                          {match.my_set_score} : {match.opponent_set_score}
                        </p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Highlights / Tips */}
        <div className="space-y-6">
          <div className="bg-slate-900 dark:bg-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">데이터 분석 팁 🏸</h3>
              <p className="text-slate-300 dark:text-blue-100 text-sm leading-relaxed">
                랠리 기록 시 15점 이후의 득실점을 유심히 관찰하세요. <br />
                후반 집중력(Clutch Power)이 승패를 가르는 핵심 지표입니다.
              </p>
              <button className="mt-6 text-sm font-bold flex items-center gap-2 hover:translate-x-1 transition-transform">
                가이드 읽어보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 mb-6 text-sm text-slate-400 uppercase tracking-widest">
              <Video className="w-4 h-4 text-red-500" />
              Analysis Highlight
            </h3>
            <div className="space-y-4">
              <HighlightItem title="Smash Success Rate" value="68%" trend="+5%" />
              <HighlightItem title="Unforced Errors" value="12" trend="-3" positive />
              <HighlightItem title="Net Play Win" value="84%" trend="+12%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend }: any) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600",
  }[color as 'blue' | 'green' | 'indigo' | 'orange'];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-black px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function HighlightItem({ title, value, trend, positive }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-slate-500">{title}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-black tabular-nums">{value}</span>
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded",
          positive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        )}>
          {trend}
        </span>
      </div>
    </div>
  );
}

