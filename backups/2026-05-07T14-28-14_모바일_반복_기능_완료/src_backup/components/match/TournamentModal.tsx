'use client';

import React, { useState, useEffect } from 'react';
import { X, Trophy, MapPin, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TournamentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    tournament?: any;
}

export default function TournamentModal({ isOpen, onClose, onSave, tournament }: TournamentModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        result: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        if (tournament) {
            setFormData({
                name: tournament.name || '',
                location: tournament.location || '',
                result: tournament.result || '',
                start_date: tournament.start_date || '',
                end_date: tournament.end_date || ''
            });
        } else {
            setFormData({
                name: '',
                location: '',
                result: '',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0]
            });
        }
    }, [tournament, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Trophy className="w-6 h-6 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {tournament ? '대회 정보 수정' : '새 대회 등록'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-8 space-y-8">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">대회 정식 명칭</label>
                        <input 
                            type="text" 
                            placeholder="대회명을 입력하세요"
                            className="w-full px-6 py-5 bg-slate-50 border-none rounded-3xl text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Location */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">개최 장소</label>
                            <div className="relative">
                                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400" />
                                <input 
                                    type="text" 
                                    placeholder="도시/지역"
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Result */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">최종 성적</label>
                            <div className="relative">
                                <Trophy className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                                <input 
                                    type="text" 
                                    placeholder="우승, 준우승 등"
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 transition-all"
                                    value={formData.result}
                                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Start Date */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">대회 시작일</label>
                            <div className="relative">
                                <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input 
                                    type="date" 
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">대회 종료일</label>
                            <div className="relative">
                                <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <input 
                                    type="date" 
                                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-8 bg-slate-50/50 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-3xl font-black transition-all active:scale-95"
                    >
                        취소
                    </button>
                    <button 
                        onClick={() => onSave(formData)}
                        className="flex-[1.5] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {tournament ? '정보 수정하기' : '새 기록 생성'}
                    </button>
                </div>
            </div>
        </div>
    );
}
