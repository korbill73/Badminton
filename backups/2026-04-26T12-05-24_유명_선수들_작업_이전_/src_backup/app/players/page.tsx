'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    X,
    Loader2,
    Save,
    Trash2,
    Edit2,
    MapPin,
    Trophy,
    Calendar,
    ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BDPlayer } from '@/types';
import { cn } from '@/lib/utils';

export default function PlayersPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [players, setPlayers] = useState<BDPlayer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<BDPlayer | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        birth_year: '',
        elem_school: '',
        mid_school: '',
        high_school: '',
        univ_school: '',
        pro_team: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('bd_players').select('*').order('name', { ascending: true });
            if (error) throw error;
            if (data) setPlayers(data);
        } catch (error: any) { 
            console.error('Fetch Error:', error.message);
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchPlayers(); }, []);

    const handleOpenEdit = (p: BDPlayer) => {
        setFormData({
            name: p.name,
            birth_year: p.birth_year || '',
            elem_school: p.elem_school || '',
            mid_school: p.mid_school || '',
            high_school: p.high_school || '',
            univ_school: p.univ_school || '',
            pro_team: p.pro_team || ''
        });
        setEditingPlayerId(p.id);
        setShowAddModal(true);
    };

    const handleSavePlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const safeData: any = {};
            Object.keys(formData).forEach(key => {
                const value = (formData as any)[key];
                safeData[key] = value === '' ? null : value;
            });

            if (editingPlayerId) {
                const { error } = await supabase.from('bd_players').update(safeData).eq('id', editingPlayerId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('bd_players').insert([safeData]);
                if (error) throw error;
            }
            
            setIsSuccess(true);
            fetchPlayers();
            setTimeout(() => {
                setIsSuccess(false);
                setShowAddModal(false);
                setEditingPlayerId(null);
                setFormData({ name: '', birth_year: '', elem_school: '', mid_school: '', high_school: '', univ_school: '', pro_team: '' });
            }, 1000);
        } catch (error: any) {
            alert('저장 실패: ' + error.message);
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleDeletePlayer = async (id: string, name: string) => {
        if (!confirm(`${name} 선수를 삭제하시겠습니까?`)) return;
        try {
            await supabase.from('bd_players').delete().eq('id', id);
            fetchPlayers();
        } catch (e) { 
            alert('삭제 실패'); 
        }
    };

    const getCurrentAffiliation = (p: BDPlayer) => {
        return p.pro_team || p.univ_school || p.high_school || p.mid_school || p.elem_school || '소속 정보 없음';
    };

    const filteredPlayers = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.high_school && p.high_school.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.pro_team && p.pro_team.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 pt-2 p-4 md:p-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0b1221] p-6 md:p-8 rounded-[2rem] border border-white/5 shadow-2xl gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Users className="w-7 h-7 md:w-8 md:h-8 text-blue-500" /> 선수 관리
                    </h1>
                    <p className="text-slate-500 mt-1 font-bold text-xs md:text-sm">파트너 및 상대 선수들의 데이터를 전문적으로 관리합니다.</p>
                </div>
                <button 
                    onClick={() => { 
                        setEditingPlayerId(null); 
                        setFormData({name:'',birth_year:'',elem_school:'',mid_school:'',high_school:'',univ_school:'',pro_team:''}); 
                        setShowAddModal(true); 
                    }} 
                    className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl text-[13px] font-black flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95"
                >
                    <UserPlus className="w-4 h-4" /> 선수 등록
                </button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-4 p-4 md:p-5 bg-[#0b1221] rounded-[2rem] border border-white/5 shadow-inner">
                <div className="relative flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="선수 이름 또는 팀 검색..."
                        className="w-full pl-14 pr-6 py-4 bg-black/30 border border-white/5 rounded-2xl text-sm md:text-base focus:ring-2 focus:ring-blue-500 outline-none text-white font-bold"
                    />
                </div>
            </div>

            {/* Player List Table/Grid */}
            <div className="bg-[#0b1221] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/40 border-b border-white/5">
                                <th className="px-6 md:px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">이름</th>
                                <th className="md:hidden px-5 py-5 text-[11px] font-black text-blue-400 uppercase tracking-widest text-center">현재 소속</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">출생 년도</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">초등</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">중등</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center text-blue-400">고등</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px) font-black text-slate-400 uppercase tracking-widest text-center">대학</th>
                                <th className="hidden md:table-cell px-5 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">실업</th>
                                <th className="hidden md:table-cell px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" /></td></tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr><td colSpan={10} className="py-20 text-center text-slate-500 font-bold uppercase">등록된 선수가 없습니다.</td></tr>
                            ) : (
                                filteredPlayers.map((p) => (
                                    <tr 
                                        key={p.id} 
                                        className="hover:bg-blue-600/5 transition-all group cursor-pointer"
                                        onClick={() => setSelectedPlayer(p)}
                                    >
                                        <td className="px-6 md:px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <span className="text-base md:text-sm font-black text-white group-hover:text-blue-400 transition-colors">{p.name}</span>
                                                <ChevronRight className="w-4 h-4 text-slate-600 md:hidden ml-auto" />
                                            </div>
                                        </td>
                                        <td className="md:hidden px-5 py-5 text-center">
                                            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] font-black border border-blue-500/20">
                                                {getCurrentAffiliation(p)}
                                            </span>
                                        </td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[13px] font-bold text-slate-500">{p.birth_year ? `${p.birth_year}년` : '-'}</td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[12px] font-bold text-slate-400">{p.elem_school || '-'}</td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[12px] font-bold text-slate-400">{p.mid_school || '-'}</td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[13px] font-black text-blue-400">{p.high_school || '-'}</td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[12px] font-bold text-slate-400">{p.univ_school || '-'}</td>
                                        <td className="hidden md:table-cell px-5 py-5 text-center text-[12px] font-bold text-slate-400">{p.pro_team || '-'}</td>
                                        <td className="hidden md:table-cell px-8 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} 
                                                    className="p-2.5 bg-white/5 hover:bg-blue-600/20 rounded-xl text-blue-400"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeletePlayer(p.id, p.name); }} 
                                                    className="p-2.5 bg-white/5 hover:bg-rose-600/20 rounded-xl text-rose-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Player Detail Modal */}
            {selectedPlayer && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-6" onClick={() => setSelectedPlayer(null)}>
                    <div className="bg-[#0b1221] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-white/5 bg-slate-900/40 relative">
                            <h2 className="text-3xl font-black text-white tracking-tighter">{selectedPlayer.name}</h2>
                            <p className="text-blue-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> {getCurrentAffiliation(selectedPlayer)}
                            </p>
                            <button onClick={() => setSelectedPlayer(null)} className="absolute top-8 right-8 p-3 hover:bg-white/5 rounded-2xl transition-all">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Calendar className="w-3 h-3 text-blue-400" /> 출생 년도</p>
                                    <p className="text-white font-bold">{selectedPlayer.birth_year ? `${selectedPlayer.birth_year}년` : '미등록'}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">등록 일자</p>
                                    <p className="text-white font-bold">{new Date(selectedPlayer.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 mb-4">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">교육 및 선수 이력</p>
                                </div>
                                {[
                                    { label: '실업팀', value: selectedPlayer.pro_team, color: 'text-rose-400' },
                                    { label: '대학교', value: selectedPlayer.univ_school, color: 'text-amber-400' },
                                    { label: '고등학교', value: selectedPlayer.high_school, color: 'text-blue-400' },
                                    { label: '중학교', value: selectedPlayer.mid_school, color: 'text-emerald-400' },
                                    { label: '초등학교', value: selectedPlayer.elem_school, color: 'text-slate-400' },
                                ].map((edu, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{edu.label}</span>
                                        <span className={cn("text-sm font-bold", edu.value ? edu.color : "text-slate-600 italic")}>{edu.value || '정보 없음'}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    onClick={() => { handleOpenEdit(selectedPlayer); setSelectedPlayer(null); }} 
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/10 active:scale-95"
                                >
                                    <Edit2 className="w-4 h-4" /> 정보 수정
                                </button>
                                <button 
                                    onClick={() => { handleDeletePlayer(selectedPlayer.id, selectedPlayer.name); setSelectedPlayer(null); }} 
                                    className="px-6 py-4 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20 active:scale-95"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal (Existing) */}
            {showAddModal && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
                    <div className="bg-[#0b1221] w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)] overflow-hidden">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                <UserPlus className="w-6 h-6 text-blue-500" /> 
                                {editingPlayerId ? '선수 정보 수정' : '신규 선수 등록'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-rose-500 rounded-2xl transition-all">
                                <X className="w-6 h-6 text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleSavePlayer} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">이름 (필수)</label>
                                    <input required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">출생 년도</label>
                                    <input value={formData.birth_year} onChange={e=>setFormData({...formData, birth_year: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none" placeholder="예: 2005" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">초등학교</label>
                                    <input value={formData.elem_school} onChange={e=>setFormData({...formData, elem_school: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">중학교</label>
                                    <input value={formData.mid_school} onChange={e=>setFormData({...formData, mid_school: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-black text-blue-500 uppercase tracking-widest ml-2 mb-2 block">고등학교</label>
                                    <input value={formData.high_school} onChange={e=>setFormData({...formData, high_school: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-blue-500/20 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">대학교</label>
                                    <input value={formData.univ_school} onChange={e=>setFormData({...formData, univ_school: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 mb-2 block">실업 선수팀</label>
                                    <input value={formData.pro_team} onChange={e=>setFormData({...formData, pro_team: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-white font-bold outline-none" />
                                </div>
                            </div>
                            <div className="md:col-span-2 pt-6 flex flex-col md:flex-row gap-4">
                                <button type="button" onClick={()=>setShowAddModal(false)} className="flex-1 py-5 rounded-[2rem] bg-white/5 text-slate-400 font-black hover:text-white transition-all order-2 md:order-1">취소 및 닫기</button>
                                <button type="submit" disabled={submitting} className="flex-[2] py-5 rounded-[2rem] bg-blue-600 text-white font-black hover:bg-blue-500 shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 order-1 md:order-2">
                                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> {editingPlayerId ? '변경 사항 적용 및 저장' : '선수 정보 마스터 저장'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
