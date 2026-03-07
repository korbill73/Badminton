'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Trophy,
    Calendar,
    ChevronRight,
    Plus,
    Search,
    X,
    CheckCircle2,
    Loader2,
    Edit2,
    MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDTournament } from '@/types';

export default function TournamentsPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [tournaments, setTournaments] = useState<BDTournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [editingTournament, setEditingTournament] = useState<BDTournament | null>(null);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [result, setResult] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch tournaments from Supabase
    const fetchTournaments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bd_tournaments')
                .select('*')
                .order('start_date', { ascending: false });

            if (error) throw error;
            if (data) setTournaments(data);
        } catch (error: any) {
            console.error('Error fetching tournaments:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, []);

    const handleAddTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const tournamentData = {
                name,
                location: location || null,
                result: result || null,
                start_date: startDate || null,
                end_date: endDate || null
            };

            let error;
            if (editingTournament) {
                const { error: updateError } = await supabase
                    .from('bd_tournaments')
                    .update(tournamentData)
                    .eq('id', editingTournament.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('bd_tournaments')
                    .insert([tournamentData]);
                error = insertError;
            }

            if (error) throw error;

            setIsSuccess(true);
            fetchTournaments(); // Refresh list

            setTimeout(() => {
                setIsSuccess(false);
                handleCloseModal();
            }, 1000);
        } catch (error: any) {
            alert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (e: React.MouseEvent, tournament: BDTournament) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingTournament(tournament);
        setName(tournament.name);
        setLocation(tournament.location || '');
        setResult(tournament.result || '');
        setStartDate(tournament.start_date || '');
        setEndDate(tournament.end_date || '');
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingTournament(null);
        setName('');
        setLocation('');
        setResult('');
        setStartDate('');
        setEndDate('');
    };

    const filteredTournaments = tournaments.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 relative pb-20">
            {/* Premium Header Section */}
            <div className="relative mb-12">
                {/* Abstract Background Blur Decorative Elements */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[120px]" />

                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-[1px] w-12 bg-blue-600/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 dark:text-blue-400">Tactical Performance</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-4">
                            대회 기록 <span className="text-blue-600">.</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
                            연간 참가 대회 현황 및 성적을 관리합니다. <br />
                            <span className="text-sm opacity-70">모든 경기의 흐름과 전략적 우위를 한눈에 추적하세요.</span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="group relative px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl text-base font-black flex items-center gap-3 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                        <Plus className="w-5 h-5 transition-transform duration-500 group-hover:rotate-180" />
                        <span>대회 추가하기</span>
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar - Glassmorphism */}
            <div className="sticky top-4 z-40 p-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden mb-12 max-w-3xl mx-auto">
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="대회명 또는 장소 검색..."
                        className="w-full pl-16 pr-6 py-5 bg-transparent border-none rounded-2xl text-lg font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-0 outline-none text-slate-800 dark:text-white"
                    />
                </div>
            </div>

            {/* Tournament List - Premium Cards */}
            <div className="pb-10">
                {loading ? (
                    <div className="py-40 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Trophy className="w-8 h-8 text-blue-500/50" />
                            </div>
                        </div>
                        <p className="text-xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest animate-pulse">Synchronizing Data</p>
                    </div>
                ) : filteredTournaments.length === 0 ? (
                    <div className="py-40 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800">
                            <Search className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">기록이 발견되지 않았습니다</h3>
                        <p className="text-slate-500 max-w-sm">
                            {searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다.` : "아직 등록된 대회가 없습니다. 새로운 도전을 기록해 보세요."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredTournaments.map((t, idx) => (
                            <div
                                key={t.id}
                                className="group relative bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.12)] transition-all duration-700 hover:-translate-y-3 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700 fill-mode-both"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-700" />

                                {/* Tournament Info */}
                                <div className="relative mb-8 flex-1">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-500/20">
                                            {t.start_date || 'TBD'}
                                        </div>
                                    </div>

                                    <Link href={`/tournaments/detail?id=${t.id}`} className="block">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-[1.2] group-hover:text-blue-600 transition-colors mb-4 line-clamp-2">
                                            {t.name}
                                        </h3>
                                    </Link>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                                            <MapPin className="w-4 h-4 text-rose-500" />
                                            <span className="text-sm font-bold tracking-tight">{t.location || '장소 정보 없음'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <Calendar className="w-4 h-4 text-slate-300" />
                                            <span className="text-sm font-bold tracking-tight opacity-70">
                                                {t.start_date} {t.end_date && `~ ${t.end_date}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Result & Footer */}
                                <div className="relative pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex-1">
                                        {t.result ? (
                                            <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                                                <Trophy className="w-4 h-4 mr-2" />
                                                <span className="text-[13px] font-black tracking-tight">{t.result}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-200 dark:text-slate-800">Participation Only</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleOpenEdit(e, t)}
                                            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 dark:hover:bg-blue-600 text-slate-400 hover:text-white rounded-2xl transition-all active:scale-90"
                                            title="수정"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <Link
                                            href={`/tournaments/detail?id=${t.id}`}
                                            className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all active:scale-95 group/btn"
                                        >
                                            <ChevronRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Tournament Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        {isSuccess ? (
                            <div className="p-16 text-center space-y-6">
                                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-500/20 animate-bounce">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">등록 완료!</h2>
                                    <p className="text-slate-500">대회 기록이 성공적으로 업데이트되었습니다.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{editingTournament ? '대회 수정' : '대회 추가'}</h2>
                                    <button onClick={handleCloseModal} className="p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                                <form onSubmit={handleAddTournament} className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tournament Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="대회명을 입력하세요"
                                            className="w-full px-6 py-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500/50" />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                placeholder="체육관 또는 도시 이름"
                                                className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Final Result</label>
                                        <div className="relative">
                                            <Trophy className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/50" />
                                            <input
                                                type="text"
                                                value={result}
                                                onChange={(e) => setResult(e.target.value)}
                                                placeholder="예: 우승, 비기너 준우승 등"
                                                className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-4 py-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-4 py-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-6 flex gap-4">
                                        <button type="button" onClick={handleCloseModal} className="flex-1 py-4 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl text-slate-600 dark:text-slate-300 font-black transition-all active:scale-95">
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 py-4 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center group/submit disabled:opacity-50"
                                        >
                                            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (editingTournament ? '수정 완료' : '기록 저장')}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
