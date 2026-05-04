'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
    ChevronLeft, BarChart3, TrendingUp, Trophy, 
    Download, Share2, Loader2, Activity
} from 'lucide-react';
import SetDashboard from '@/components/match/SetDashboard';
import { cn } from '@/lib/utils';

function ReportPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const matchId = searchParams.get('id');

    const [match, setMatch] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSet, setSelectedSet] = useState<number>(0); // 0 = Total, 1, 2, 3 = Sets

    const initialWin = [{ group: '스매시', items: ['직선 스매시', '대각 스매시', '반 스매시', '스매시 + 푸시'] }, { group: '드롭', items: ['직선', '대각(크로스)'] }, { group: '네트 플레이', items: ['헤어핀', '크로스 헤어핀', '푸시', '네트 킬'] }, { group: '기타 공격', items: ['드라이브', '클리어 공격', '롱서브', '행운의 득점'] }, { group: '상대 에러', items: ['언더 에러', '스매시 에러', '서브 에러', '클리어 에러', '기본기 에러', '백핸드 에러'] }];
    const initialLoss = [{ group: '상대 공격 득점', items: ['스매시', '대각 스매시', '헤어핀', '크 헤어핀', '드롭', '헤 + 푸시'] }, { group: '전술 당함', items: ['페인트 모션', '코스 속임수', '템포 변화', '빽공략 + 공격'] }, { group: '나의 에러', items: ['스매시 에러', '드롭 에러', '언더 에러', '헤어핀 에러', '클리어 에러', '기본기 에러'] }];
    
    const [winCats, setWinCats] = useState(initialWin);
    const [lossCats, setLossCats] = useState(initialLoss);

    useEffect(() => {
        const fetchData = async () => {
            if (!matchId) return;
            setLoading(true);
            try {
                const { data: mData } = await supabase.from('bd_matches').select(`
                    *,
                    opponent_1:bd_players!opponent_1_id(name),
                    tournament:bd_tournaments(name)
                `).eq('id', matchId).single();
                
                if (mData) {
                    setMatch(mData);
                    if (mData.feedback_notes && mData.feedback_notes.startsWith('{')) {
                        const meta = JSON.parse(mData.feedback_notes);
                        if (meta.customCategories) {
                            setWinCats(meta.customCategories.win || initialWin);
                            setLossCats(meta.customCategories.loss || initialLoss);
                        }
                    }
                }

                const { data: lData } = await supabase.from('bd_point_logs').select('*').eq('match_id', matchId).order('video_timestamp', { ascending: true });
                setLogs(lData || []);
            } catch (e) {}
            setLoading(false);
        };
        fetchData();
    }, [matchId]);

    const filteredLogs = useMemo(() => {
        if (selectedSet === 0) return logs;
        return logs.filter(l => Number(l.set_number) === selectedSet);
    }, [logs, selectedSet]);

    if (loading) return (
        <div className="h-screen bg-[#080d1a] flex flex-col items-center justify-center gap-6">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-cyan-400 font-black italic uppercase tracking-widest animate-pulse">복원된 정밀 분석 리포트 생성 중...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080d1a] text-white font-sans overflow-x-hidden">
            {/* [HEADER] 고정 프리미엄 헤더 */}
            <div className="bg-[#0b1221] border-b border-white/10 p-4 md:p-6 lg:px-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl sticky top-0 z-[100] backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-cyan-400/60 hover:text-cyan-400 uppercase tracking-widest transition-all mb-1">
                        <ChevronLeft className="w-4 h-4" /> Cockpit Return
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                            <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none">{match?.match_name} <span className="text-cyan-400/40 text-[10px] md:text-sm ml-2">Legacy 精密 리포트</span></h1>
                            <p className="text-[9px] md:text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">{match?.tournament?.name} • Match Analytics Hub</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 shadow-inner flex-1 md:flex-none">
                        {(['전체', '1세트', '2세트', '3세트'] as const).map((label, idx) => (
                            <button 
                                key={label} 
                                onClick={() => setSelectedSet(idx)} 
                                className={cn(
                                    "flex-1 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                    selectedSet === idx ? "bg-cyan-500 text-black shadow-lg" : "text-white/40 hover:text-white"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all active:scale-95"><Download className="w-4 h-4" /></button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all active:scale-95"><Share2 className="w-4 h-4" /></button>
                </div>
            </div>

            {/* [MAIN CONTENT] 스크린샷과 동일한 구성 요소 이식 */}
            <div className="p-4 md:p-8 lg:p-12 animate-in fade-in duration-1000">
                <SetDashboard 
                    logs={filteredLogs} 
                    setNumber={selectedSet} 
                    winCats={winCats} 
                    lossCats={lossCats} 
                />
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}

export default function RevertedStatisticsReportPage() {
    return (
        <Suspense fallback={
            <div className="h-screen bg-[#080d1a] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            </div>
        }>
            <ReportPageContent />
        </Suspense>
    );
}
