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
        <div className="space-y-8 relative">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">대회 기록</h1>
                    <p className="text-slate-500 mt-2">연간 참가 대회 현황 및 성적을 관리합니다.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    대회 추가
                </button>
            </div>

            <div className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="대회명 검색..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-800">
                                <th className="px-6 py-6 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-44">날짜</th>
                                <th className="px-6 py-6 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-52">장소</th>
                                <th className="px-10 py-6 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-[32%]">대회명</th>
                                <th className="px-10 py-6 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-center w-[32%]">대회 성적</th>
                                <th className="px-6 py-6 text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight text-right w-24 pr-10">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                            <p className="text-slate-400 text-sm">데이터를 불러오는 중...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTournaments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <p className="text-slate-400 text-sm">{searchTerm ? '검색 결과가 없습니다.' : '등록된 대회가 없습니다.'}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTournaments.map((t, idx) => (
                                    <tr key={t.id} className="group hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 hover:shadow-inner">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                                                <Calendar className="w-4 h-4 text-blue-500/50" />
                                                <span>{t.start_date || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-bold">
                                                <MapPin className="w-4 h-4 text-rose-500/50" />
                                                <span className="truncate max-w-[150px]">{t.location || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <Link href={`/tournaments/${t.id}`} className="block text-center">
                                                <span className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors drop-shadow-sm">
                                                    {t.name}
                                                </span>
                                            </Link>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            {t.result ? (
                                                <span className="inline-flex items-center px-5 py-1.5 rounded-full text-[13px] font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md tracking-tighter ring-2 ring-blue-500/20">
                                                    <Trophy className="w-3.5 h-3.5 mr-2 opacity-90" />
                                                    {t.result}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-sm font-medium">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-6 text-right pr-10">
                                            <div className="flex items-center justify-end gap-4">
                                                <button
                                                    onClick={(e) => handleOpenEdit(e, t)}
                                                    className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-slate-400 hover:text-blue-600 transition-all active:scale-90 border border-transparent hover:border-blue-200"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                                <Link href={`/tournaments/${t.id}`} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-300 hover:text-slate-900 transition-all active:scale-95 border border-transparent hover:border-slate-200">
                                                    <ChevronRight className="w-6 h-6" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Tournament Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {isSuccess ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h2 className="text-xl font-bold">등록 완료!</h2>
                                <p className="text-slate-500">새로운 대회가 성공적으로 추가되었습니다.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">{editingTournament ? '대회 수정' : '대회 추가'}</h2>
                                    <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                                <form onSubmit={handleAddTournament} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">대회명</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="대회명을 입력하세요"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">대회 장소</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => setLocation(e.target.value)}
                                                placeholder="체육관 이름 등 장소를 입력하세요"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">주요 성적</label>
                                        <div className="relative">
                                            <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                            <input
                                                type="text"
                                                value={result}
                                                onChange={(e) => setResult(e.target.value)}
                                                placeholder="예: 우승, 준우승, 8강 등"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">시작일</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">종료일</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold transition-colors">
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingTournament ? '수정하기' : '등록하기')}
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
