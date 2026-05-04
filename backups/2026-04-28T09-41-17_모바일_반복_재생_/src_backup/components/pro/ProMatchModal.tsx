'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, X, ChevronDown, Zap, Play, ChevronRight, Save, MapPin, Calendar, User, UserPlus, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    match?: any;
    players: any[];
    onSave: (data: any) => void;
    tournamentId?: string | null;
}

const AutocompleteField = ({ label, value, field, color, suggestions, activeField, onSuggest, onSelect }: any) => (
    <div className="space-y-1 relative">
        <p className={cn("text-[10px] font-black tracking-widest ml-1", color === 'blue' ? 'text-blue-400' : 'text-rose-400')}>
            {label}
        </p>
        <div className="relative group">
            <input 
                value={value || ''} 
                onChange={e => onSuggest(e.target.value, field)} 
                className="w-full bg-[#1e293b] border border-white/10 px-4 py-3 rounded-2xl font-black text-lg text-white outline-none focus:border-blue-500/50 shadow-inner transition-all"
                placeholder="이름 입력..."
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 opacity-20" />
            
            {activeField === field && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl z-[100] max-h-[150px] overflow-y-auto custom-scrollbar">
                    {suggestions.map((p: any) => (
                        <div 
                            key={p.id} 
                            onClick={() => onSelect(p, field)} 
                            className="px-4 py-3 hover:bg-blue-600 transition-all cursor-pointer font-bold text-sm border-b border-white/5 last:border-0 flex justify-between items-center"
                        >
                            <span>{p.name}</span>
                            <span className="text-[10px] opacity-40 ml-2">{p.school || '선수'}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

export default function ProMatchModal({ isOpen, onClose, match, players, onSave, tournamentId }: ProMatchModalProps) {
    const [formData, setFormData] = useState({
        match_name: '', match_type: '단식', category: '고등부',
        player_id: '', player_name: '', partner_id: '', partner_name: '',
        opponent: '', opponent_2_name: '', opponent_1_id: '', opponent_2_id: '',
        video_url: '', score: '2:0', summary: '',
        set_1: '21:0', set_2: '21:0', set_3: '',
        tournament: '', location: '', date: new Date().toISOString().split('T')[0]
    });

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [activeSuggestField, setActiveSuggestField] = useState<string | null>(null);

    // AUTO-CALCULATE SCORE
    useEffect(() => {
        const calculateTotalScore = () => {
            const sets = [formData.set_1, formData.set_2, formData.set_3];
            let sideA = 0;
            let sideB = 0;

            sets.forEach(s => {
                if (s && s.includes(':')) {
                    const [a, b] = s.split(':').map(num => parseInt(num.trim()));
                    if (!isNaN(a) && !isNaN(b)) {
                        if (a > b) sideA++;
                        else if (b > a) sideB++;
                    }
                }
            });

            const newScore = `${sideA}:${sideB}`;
            if (newScore !== formData.score) {
                setFormData(prev => ({ ...prev, score: newScore }));
            }
        };

        const timer = setTimeout(calculateTotalScore, 500); 
        return () => clearTimeout(timer);
    }, [formData.set_1, formData.set_2, formData.set_3]);

    useEffect(() => {
        if (isOpen && match) {
            setFormData({
                ...match,
                match_name: match.match_name || '', match_type: match.match_type || '단식',
                category: match.category || '고등부',
                player_id: match.player_id || '', player_name: match.player_name || '',
                partner_id: match.partner_id || '', partner_name: match.partner_name || '',
                opponent: match.opponent || '', opponent_2_name: match.opponent_2_name || '',
                opponent_1_id: match.opponent_1_id || '', opponent_2_id: match.opponent_2_id || '',
                video_url: match.video_url || '', score: match.score || '2:0', summary: match.summary || '',
                set_1: match.set_1 || '', set_2: match.set_2 || '', set_3: match.set_3 || '',
                tournament: match.tournament || '', location: match.location || '',
                date: match.date || new Date().toISOString().split('T')[0]
            });
        } else if (isOpen) {
            setFormData({
                match_name: '', match_type: '단식', category: '고등부',
                player_id: '', player_name: '', partner_id: '', partner_name: '',
                opponent: '', opponent_2_name: '', opponent_1_id: '', opponent_2_id: '',
                video_url: '', score: '2:0', summary: '', set_1: '21:0', set_2: '21:0', set_3: '',
                tournament: '', location: '', date: new Date().toISOString().split('T')[0]
            });
        }
    }, [match, isOpen]);

    if (!isOpen) return null;

    const handleSuggest = (text: string, field: string) => {
        setFormData(prev => ({ ...prev, [field]: text }));
        if (text.length > 0) {
            const filtered = players.filter(p => p.name.includes(text));
            setSuggestions(filtered);
            setActiveSuggestField(field);
        } else {
            setSuggestions([]);
            setActiveSuggestField(null);
        }
    };

    const selectSuggest = (player: any, field: string) => {
        const updates: any = { [field]: player.name };
        if (field === 'player_name') updates.player_id = player.id;
        if (field === 'partner_name') updates.partner_id = player.id;
        if (field === 'opponent') updates.opponent_1_id = player.id;
        if (field === 'opponent_2_name') updates.opponent_2_id = player.id;
        setFormData(prev => ({ ...prev, ...updates }));
        setSuggestions([]);
        setActiveSuggestField(null);
    };

    const handleSetScoreChange = (val: string, field: string) => {
        // AUTO-COLON LOGIC
        let formatted = val.replace(/[^0-9:]/g, ''); // Allow only numbers and colon
        
        // If 2 digits entered and no colon, add it
        if (formatted.length === 2 && !formatted.includes(':')) {
            formatted = formatted + ':';
        }
        
        setFormData(prev => ({ ...prev, [field]: formatted }));
    };

    const handleFinalSave = () => {
        const payload: any = { ...formData };
        const uuidFields = ['player_id', 'partner_id', 'opponent_1_id', 'opponent_2_id'];
        uuidFields.forEach(f => { if (!payload[f] || payload[f] === '') payload[f] = null; });
        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-2 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0f172a] text-white w-full max-w-7xl rounded-[3.5rem] border border-white/10 shadow-[0_0_150px_rgba(37,99,235,0.25)] flex flex-col h-fit max-h-[98vh] overflow-hidden relative">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 px-10 py-5 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="p-3 bg-white/10 rounded-2xl shadow-lg"><Zap className="w-6 h-6 text-yellow-400" /></div>
                        <h2 className="text-2xl md:text-3xl font-black tracking-tighter">선배 전장 데이터 마스터</h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-rose-600/20 text-white/50 hover:text-white rounded-2xl transition-all"><X className="w-8 h-8" /></button>
                </div>

                <div className="p-8 md:p-10 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Row 1: Tournament & Category */}
                    <div className="grid grid-cols-12 gap-5 bg-blue-600/5 p-6 rounded-[2.5rem] border border-blue-500/10">
                        <div className="col-span-1 space-y-1">
                             <p className="text-[10px] font-black text-slate-500 tracking-widest text-center">분류</p>
                             <div className="flex flex-col gap-1">
                                <button type="button" onClick={() => setFormData({...formData, category: '고등부'})} className={cn("py-2 px-1 rounded-xl text-[10px] font-black transition-all", formData.category === '고등부' ? "bg-blue-600 text-white shadow-lg" : "bg-white/5 text-slate-500")}>고등부</button>
                                <button type="button" onClick={() => setFormData({...formData, category: '프로'})} className={cn("py-2 px-1 rounded-xl text-[10px] font-black transition-all", formData.category === '프로' ? "bg-emerald-600 text-white shadow-lg" : "bg-white/5 text-slate-500")}>프로</button>
                             </div>
                        </div>
                        <div className="col-span-3 space-y-1">
                             <p className="text-[10px] font-black text-blue-400 tracking-widest pl-1">대회 명칭</p>
                             <input value={formData.tournament} onChange={e => setFormData({...formData, tournament: e.target.value})} className="w-full bg-[#1e293b] border border-blue-500/20 px-6 py-3 rounded-2xl text-lg font-black outline-none focus:border-blue-500/50 shadow-inner" placeholder="대회명을 입력하세요" />
                        </div>
                        <div className="col-span-3 space-y-1">
                             <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1">장소</p>
                             <input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-[#1e293b] border border-white/5 px-6 py-3 rounded-2xl text-lg font-black outline-none" placeholder="경기 장소" />
                        </div>
                        <div className="col-span-2 space-y-1">
                             <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1">일자</p>
                             <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[#1e293b] border border-white/5 px-4 py-3 rounded-2xl text-base font-black shadow-inner" />
                        </div>
                        <div className="col-span-3 space-y-1">
                             <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1">경기 종목</p>
                             <select value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})} className="w-full bg-blue-600 px-6 py-3 rounded-2xl text-base font-black text-white outline-none appearance-none cursor-pointer text-center shadow-xl">
                                <option value="단식">단식 (Singles)</option>
                                <option value="복식">복식 (Doubles)</option>
                             </select>
                        </div>
                    </div>

                    {/* Row 2: Combatants */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className={cn("p-6 bg-blue-600/[0.03] border border-blue-500/20 rounded-[2.5rem] space-y-4 relative transition-all", formData.match_type === '복식' ? 'grid grid-cols-2 gap-4' : 'block')}>
                            <div className="absolute top-0 left-8 px-4 py-1 bg-blue-600 text-[8px] font-black rounded-b-lg tracking-widest">분석 대상 팀</div>
                            <AutocompleteField label="주요 선수" value={formData.player_name} field="player_name" color="blue" suggestions={suggestions} activeField={activeSuggestField} onSuggest={handleSuggest} onSelect={selectSuggest} />
                            {formData.match_type === '복식' && <AutocompleteField label="파트너" value={formData.partner_name} field="partner_name" color="blue" suggestions={suggestions} activeField={activeSuggestField} onSuggest={handleSuggest} onSelect={selectSuggest} />}
                        </div>
                        <div className={cn("p-6 bg-rose-600/[0.03] border border-rose-500/20 rounded-[2.5rem] space-y-4 relative transition-all", formData.match_type === '복식' ? 'grid grid-cols-2 gap-4' : 'block')}>
                            <div className="absolute top-0 left-8 px-4 py-1 bg-rose-600 text-[8px] font-black rounded-b-lg tracking-widest">상대 선수 팀</div>
                            <AutocompleteField label="상대 선수 1" value={formData.opponent} field="opponent" color="rose" suggestions={suggestions} activeField={activeSuggestField} onSuggest={handleSuggest} onSelect={selectSuggest} />
                            {formData.match_type === '복식' && <AutocompleteField label="상대 선수 2" value={formData.opponent_2_name} field="opponent_2_name" color="rose" suggestions={suggestions} activeField={activeSuggestField} onSuggest={handleSuggest} onSelect={selectSuggest} />}
                        </div>
                    </div>

                    {/* Row 3: Score Board - Auto-COLON logic applied */}
                    <div className="grid grid-cols-12 gap-6 items-center bg-black/40 p-8 rounded-[2.5rem] border border-white/10 shadow-inner">
                        <div className="col-span-4 flex items-center gap-6">
                             <div className="p-5 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-xl overflow-hidden relative">
                                <Trophy className="w-10 h-10 text-yellow-500" />
                                <div className="absolute inset-0 bg-yellow-400 opacity-5 animate-pulse" />
                             </div>
                             <div className="space-y-0 text-left">
                                 <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1 uppercase">토탈 스코어</p>
                                 <div className="flex items-center gap-2">
                                     <span className="text-6xl font-black text-yellow-400 tabular-nums drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">{formData.score}</span>
                                 </div>
                             </div>
                        </div>
                        <div className="col-span-8 grid grid-cols-3 gap-5">
                             {[1, 2, 3].map(s => (
                                <div key={s} className="space-y-1 bg-[#1e293b] p-4 rounded-[2rem] border border-white/5 text-center shadow-xl group/set">
                                     <p className="text-[10px] font-black text-slate-400 tracking-widest group-hover/set:text-yellow-400 transition-colors">제 {s}세트</p>
                                     <input 
                                        value={(formData as any)[`set_${s}`]} 
                                        onChange={e => handleSetScoreChange(e.target.value, `set_${s}`)} 
                                        className="w-full bg-black/40 border border-white/5 py-3 rounded-2xl text-3xl font-black text-white text-center outline-none focus:border-yellow-400/30 transition-all" 
                                        placeholder="21:0" 
                                     />
                                </div>
                             ))}
                        </div>
                    </div>

                    {/* Row 4: Final Details */}
                    <div className="grid grid-cols-12 gap-6 items-center">
                         <div className="col-span-4 space-y-1 text-left">
                              <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1 underline decoration-blue-500/40">유튜브 영상 ID / URL</p>
                              <div className="relative group/vid">
                                   <input value={formData.video_url} onChange={e => setFormData({...formData, video_url: e.target.value})} className="w-full bg-[#1e293b] border border-white/5 px-6 py-4 rounded-2xl text-lg font-bold text-sky-400 outline-none" placeholder="Youtube ID" />
                                   <Play className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-rose-500" />
                              </div>
                         </div>
                         <div className="col-span-2 space-y-1 text-left">
                              <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1">상세 라운드</p>
                              <input value={formData.match_name} onChange={e => setFormData({...formData, match_name: e.target.value})} className="w-full bg-[#1e293b] border border-white/5 px-4 py-4 rounded-2xl text-base font-black outline-none" placeholder="결승/준결승" />
                         </div>
                         <div className="col-span-6 space-y-1 text-left">
                              <p className="text-[10px] font-black text-slate-500 tracking-widest pl-1">분석 요약</p>
                              <input value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} className="w-full bg-[#1e293b] border border-white/5 px-6 py-4 rounded-2xl text-lg font-bold text-slate-300 outline-none" placeholder="실전 전술 핵심 통찰" />
                         </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-6 bg-black/60 border-t border-white/10 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="text-slate-500 font-black hover:text-white transition-all text-[11px] tracking-widest underline underline-offset-4">
                        기록 취소
                    </button>
                    <button 
                        onClick={handleFinalSave} 
                        className="bg-blue-600 px-14 py-4 rounded-[2rem] font-black text-white hover:bg-blue-500 transition-all shadow-2xl active:scale-95 flex items-center gap-5 group text-2xl"
                    >
                        <span>전술 데이터 분석 완료</span>
                        <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
