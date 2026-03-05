'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    MoreHorizontal,
    X,
    Loader2,
    CheckCircle2,
    Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDPlayer } from '@/types';

export default function PlayersPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [players, setPlayers] = useState<BDPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [name, setName] = useState('');
    const [team, setTeam] = useState('');
    const [birthYear, setBirthYear] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch players from Supabase
    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bd_players')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            if (data) setPlayers(data);
        } catch (error: any) {
            console.error('Error fetching players:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlayers();
    }, []);

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('bd_players')
                .insert([
                    {
                        name,
                        school_or_team: team,
                        birth_year: birthYear ? parseInt(birthYear) : null
                    }
                ]);

            if (error) throw error;

            setIsSuccess(true);
            fetchPlayers(); // Refresh list

            setTimeout(() => {
                setIsSuccess(false);
                setShowAddModal(false);
                setName('');
                setTeam('');
                setBirthYear('');
            }, 1500);
        } catch (error: any) {
            alert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.school_or_team && p.school_or_team.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">선수 관리</h1>
                    <p className="text-slate-500 mt-2">파트너 및 상대 선수들의 데이터를 관리합니다.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg"
                >
                    <UserPlus className="w-4 h-4" />
                    선수 등록
                </button>
            </div>

            <div className="flex gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="선수 이름 또는 팀 검색..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">이름 / 소속 / 생년</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">등록일</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                        <span>불러오는 중...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredPlayers.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                    등록된 선수가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredPlayers.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {p.name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {p.name}
                                                    {p.birth_year && <span className="ml-2 text-[10px] text-slate-400 font-normal">({p.birth_year}년생)</span>}
                                                </p>
                                                <p className="text-xs text-slate-500">{p.school_or_team || '소속 미정'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">
                                        {new Date(p.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Player Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {isSuccess ? (
                            <div className="p-12 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h2 className="text-xl font-bold">등록 완료!</h2>
                                <p className="text-slate-500">새로운 선수가 성공적으로 등록되었습니다.</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <h2 className="text-xl font-bold">선수 등록</h2>
                                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                                <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">이름</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="선수 이름을 입력하세요"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">소속 (학교/팀)</label>
                                        <input
                                            type="text"
                                            value={team}
                                            onChange={(e) => setTeam(e.target.value)}
                                            placeholder="소속 팀명을 입력하세요"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">생년 (YYYY)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                value={birthYear}
                                                onChange={(e) => setBirthYear(e.target.value)}
                                                placeholder="예: 2005"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-2">
                                        <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-bold transition-colors">
                                            취소
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '등록하기'}
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
