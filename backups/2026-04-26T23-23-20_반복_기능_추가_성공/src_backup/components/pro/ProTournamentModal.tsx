'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Trophy, Save } from 'lucide-react';

interface ProTournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    tournament?: any;
}

export default function ProTournamentModal({ isOpen, onClose, onSave, tournament }: ProTournamentModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        start_date: '',
        end_date: '',
        result: ''
    });

    useEffect(() => {
        if (tournament) {
            setFormData({
                name: tournament.name || '',
                location: tournament.location || '',
                start_date: tournament.start_date || '',
                end_date: tournament.end_date || '',
                result: tournament.result || ''
            });
        } else {
            setFormData({ name: '', location: '', start_date: '', end_date: '', result: '' });
        }
    }, [tournament, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0f172a] w-full max-w-2xl rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />
                
                <div className="p-10">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                            <h2 className="text-4xl font-black text-white tracking-tighter">프로 대회 등록</h2>
                            <p className="text-slate-500 font-bold">프로/선배 선수들의 경기 스케줄과 대회를 관리합니다.</p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
                            <X className="w-8 h-8" />
                        </button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">대회 명칭</label>
                            <div className="relative">
                                <Trophy className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
                                <input 
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-lg focus:border-blue-500 outline-none transition-all"
                                    placeholder="대회 이름을 입력하세요 (예: 2024 전영 오픈)"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">개최 장소</label>
                                <div className="relative">
                                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-yellow-500" />
                                    <input 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-lg focus:border-blue-500 outline-none transition-all"
                                        placeholder="장소 (예: 영국 버밍엄)"
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">최종 결과 (선택)</label>
                                <input 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white font-bold text-lg focus:border-blue-500 outline-none transition-all"
                                    placeholder="예: 우승, 결승 진출"
                                    value={formData.result}
                                    onChange={e => setFormData({...formData, result: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">시작 일자</label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                                    <input 
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-lg focus:border-blue-500 outline-none transition-all"
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">종료 일자</label>
                                <div className="relative">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-orange-500" />
                                    <input 
                                        type="date"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-white font-bold text-lg focus:border-blue-500 outline-none transition-all"
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <button className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black text-2xl transition-all shadow-2xl shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-3">
                            <Save className="w-7 h-7" /> 대회 정보 저장
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
