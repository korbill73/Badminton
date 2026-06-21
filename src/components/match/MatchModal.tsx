import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, X, ChevronDown, Zap, Play, ChevronRight, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// AutocompleteField Component
const AutocompleteField = ({ value, onChange, placeholder, players, onAddNewPlayer }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const getID = (val: any) => (typeof val === 'object' && val !== null) ? val.id : val;
    const selectedPlayer = players.find((p: any) => String(p.id) === String(getID(value)));
    const displayText = selectedPlayer ? `${selectedPlayer.name}${selectedPlayer.school ? ` (${selectedPlayer.school})` : ''}` : '';

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = players.filter((p: any) => {
        if (!search) return true;
        const s = search.replace(/\s+/g, '').toLowerCase();
        const pName = (p.name || '').replace(/\s+/g, '').toLowerCase();
        const pSchool = (p.school || '').replace(/\s+/g, '').toLowerCase();
        return pName.includes(s) || pSchool.includes(s) || `${pSchool}${pName}`.includes(s);
    });

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-[#1e293b] border border-white/10 px-4 py-3.5 rounded-xl font-black text-base text-white shadow-xl transition-all hover:border-rose-500 outline-none cursor-pointer flex items-center justify-between group"
            >
                <span className={value ? "text-white" : "text-slate-500"}>{value ? displayText : placeholder}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-white/5 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="이름 또는 학교명 검색..."
                            className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-sm text-white font-bold outline-none focus:border-rose-500"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filtered.map((p: any) => (
                            <div 
                                key={p.id}
                                onClick={() => { onChange(p.id); setIsOpen(false); setSearch(''); }}
                                className="px-4 py-3 hover:bg-rose-500/20 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0"
                            >
                                <span className="font-bold text-white text-sm">{p.name}</span>
                                <span className="text-xs text-slate-400 font-medium">{p.school || ''}</span>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-6 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
                                <span>검색 결과가 없습니다.</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAddNewPlayer(search); setIsOpen(false); }}
                                    className="flex items-center gap-2 bg-rose-600/20 text-rose-400 px-4 py-2 rounded-lg font-bold hover:bg-rose-600 hover:text-white transition-colors"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    신규 선수 등록
                                </button>
                            </div>
                        )}
                        {filtered.length > 0 && search && (
                            <div className="p-2 border-t border-white/5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onAddNewPlayer(search); setIsOpen(false); }}
                                    className="w-full flex items-center justify-center gap-2 bg-rose-600/10 text-rose-400 px-4 py-2 rounded-lg font-bold hover:bg-rose-600 hover:text-white transition-colors text-sm"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    "{search}" 신규 등록하기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


const MatchModal = ({ isOpen, onClose, tournamentId, match, players: initialPlayers, matches = [], onSave }: { isOpen: boolean, onClose: () => void, tournamentId?: string, match?: any, players: any[], matches?: any[], onSave: (data: any) => void }) => {
    const [localPlayers, setLocalPlayers] = useState<any[]>([]);
    
    // Default player name
    const DEFAULT_PLAYER_SCHOOL = '김천';
    const DEFAULT_PLAYER_NAME = '박준서';

    const [formData, setFormData] = useState({
        match_name: '',
        match_type: '단식',
        player_id: '',
        partner_id: '',
        opponent_1_id: '',
        opponent_2_id: '',
        match_result: 'win',
        youtube_video_id: '',
        match_date: new Date().toISOString().split('T')[0],
        set_1_score_player: '0',
        set_1_score_opponent: '0',
        set_2_score_player: '0',
        set_2_score_opponent: '0',
        set_3_score_player: '0',
        set_3_score_opponent: '0',
        set_1_start: '00:00',
        set_2_start: '00:00',
        set_3_start: '00:00'
    });

    // Create player modal state
    const [isCreatingPlayer, setIsCreatingPlayer] = useState<'player' | 'partner' | 'opponent_1' | 'opponent_2' | null>(null);
    const [newPlayerForm, setNewPlayerForm] = useState({ name: '', school: '' });
    const [isSubmittingPlayer, setIsSubmittingPlayer] = useState(false);

    useEffect(() => {
        // Sort players by school then name
        const sorted = [...initialPlayers].sort((a, b) => {
            const sA = a.school || a.school_or_team || '';
            const sB = b.school || b.school_or_team || '';
            if (sA !== sB) return sA.localeCompare(sB);
            return (a.name || '').localeCompare(b.name || '');
        });
        // Normalize school property for UI
        const normalized = sorted.map(p => ({...p, school: p.school || p.school_or_team || ''}));
        setLocalPlayers(normalized);
    }, [initialPlayers]);

    useEffect(() => {
        if (isOpen) {
            const getID = (val: any) => (typeof val === 'object' && val !== null) ? val.id : val;
            
            // Find default player
            let defaultPlayerId = '';
            if (localPlayers.length > 0) {
                const defaultP = localPlayers.find(p => p.name === DEFAULT_PLAYER_NAME && (p.school || p.school_or_team)?.includes(DEFAULT_PLAYER_SCHOOL));
                if (defaultP) defaultPlayerId = defaultP.id;
            }

            if (match) {
                setFormData({
                    match_name: match.match_name || '',
                    match_type: match.match_type || '단식',
                    player_id: String(getID(match.player_id) || defaultPlayerId),
                    partner_id: String(getID(match.partner_id) || ''),
                    opponent_1_id: String(getID(match.opponent_1_id) || ''),
                    opponent_2_id: String(getID(match.opponent_2_id) || ''),
                    match_result: match.match_result || 'win',
                    youtube_video_id: match.youtube_video_id || '',
                    match_date: match.match_date || new Date().toISOString().split('T')[0],
                    set_1_score_player: String(match.set_1_score_player !== undefined ? match.set_1_score_player : '0'),
                    set_1_score_opponent: String(match.set_1_score_opponent !== undefined ? match.set_1_score_opponent : '0'),
                    set_2_score_player: String(match.set_2_score_player !== undefined ? match.set_2_score_player : '0'),
                    set_2_score_opponent: String(match.set_2_score_opponent !== undefined ? match.set_2_score_opponent : '0'),
                    set_3_score_player: String(match.set_3_score_player !== undefined ? match.set_3_score_player : '0'),
                    set_3_score_opponent: String(match.set_3_score_opponent !== undefined ? match.set_3_score_opponent : '0'),
                    set_1_start: match.set_1_start || '00:00',
                    set_2_start: match.set_2_start || '00:00',
                    set_3_start: match.set_3_start || '00:00'
                });
            } else {
                setFormData({ 
                    match_name: '', match_type: '단식', player_id: defaultPlayerId, partner_id: '', opponent_1_id: '', opponent_2_id: '', 
                    match_result: 'win', youtube_video_id: '', match_date: new Date().toISOString().split('T')[0], 
                    set_1_score_player: '0', set_1_score_opponent: '0', set_2_score_player: '0', set_2_score_opponent: '0', 
                    set_3_score_player: '0', set_3_score_opponent: '0', set_1_start: '00:00', set_2_start: '00:00', set_3_start: '00:00' 
                });
            }
        }
    }, [match, isOpen, localPlayers]);

    // Calculate Past Stats
    const pastStats = useMemo(() => {
        const getID = (val: any) => (typeof val === 'object' && val !== null) ? val.id : val;
        const opponent1Id = getID(formData.opponent_1_id);
        const myId = getID(formData.player_id);

        if (!opponent1Id || !matches || matches.length === 0) return null;
        
        let wins = 0;
        let losses = 0;

        matches.forEach(m => {
            // Ignore current match if editing
            if (match && m.id === match.id) return;

            const mPlayerId = String(getID(m.player_id));
            const mPartnerId = String(getID(m.partner_id));
            const mOpponent1Id = String(getID(m.opponent_1_id));
            const mOpponent2Id = String(getID(m.opponent_2_id));

            const isMyMatch = mPlayerId === myId || mPartnerId === myId;
            const isOpponentMatch = mOpponent1Id === opponent1Id || mOpponent2Id === opponent1Id;
            
            if (isMyMatch && isOpponentMatch) {
                if (m.match_result === 'win') wins++;
                else losses++;
            }
        });

        const total = wins + losses;
        if (total === 0) return null;
        const rate = Math.round((wins / total) * 100);

        return { wins, losses, total, rate };
    }, [formData.opponent_1_id, formData.player_id, matches, match]);

    const openVideoAt = (time: string) => {
        if (!formData.youtube_video_id) return;
        const parts = time.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
        else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        else seconds = Number(time) || 0;
        window.open(`https://youtube.com/watch?v=${formData.youtube_video_id}&t=${seconds}s`, '_blank');
    };

    const formatTimeInput = (val: string) => {
        const cleaned = val.replace(/\D/g, '').slice(0, 4);
        if (cleaned.length <= 2) return cleaned;
        return cleaned.slice(0, cleaned.length - 2) + ':' + cleaned.slice(cleaned.length - 2);
    };

    const handleCreatePlayer = async () => {
        if (!newPlayerForm.name.trim()) return alert("이름을 입력해주세요.");
        if (!newPlayerForm.school.trim()) return alert("학교명을 입력해주세요.");

        setIsSubmittingPlayer(true);
        try {
            // Check for duplicates
            const sName = newPlayerForm.name.trim();
            const sSchool = newPlayerForm.school.trim();
            
            const existing = localPlayers.find(p => p.name === sName && p.school === sSchool);
            if (existing) {
                alert(`이미 존재하는 선수입니다. 자동 선택됩니다.`);
                setFormData(prev => ({ ...prev, [isCreatingPlayer!]: existing.id }));
                setIsCreatingPlayer(null);
                setNewPlayerForm({ name: '', school: '' });
                return;
            }

            // Insert into bd_players
            const { data, error } = await supabase.from('bd_players').insert([{
                name: sName,
                school_or_team: sSchool,
                high_school: sSchool // Save to high_school as well just in case
            }]).select().single();

            if (error) throw error;

            if (data) {
                const newP = { ...data, school: data.school_or_team };
                const newLocalPlayers = [...localPlayers, newP].sort((a, b) => {
                    const sA = a.school || '';
                    const sB = b.school || '';
                    if (sA !== sB) return sA.localeCompare(sB);
                    return (a.name || '').localeCompare(b.name || '');
                });
                setLocalPlayers(newLocalPlayers);
                setFormData(prev => ({ ...prev, [isCreatingPlayer!]: newP.id }));
                setIsCreatingPlayer(null);
                setNewPlayerForm({ name: '', school: '' });
            }
        } catch (e: any) {
            alert("선수 등록에 실패했습니다: " + e.message);
        } finally {
            setIsSubmittingPlayer(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050810]/95 backdrop-blur-md p-2 animate-in fade-in duration-300">
            {/* Create Player Sub-modal */}
            {isCreatingPlayer && (
                <div className="absolute inset-0 z-[210] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-black text-lg">신규 선수 등록</h3>
                            <button onClick={() => setIsCreatingPlayer(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">학교명 (소속)</label>
                                <input value={newPlayerForm.school} onChange={e=>setNewPlayerForm({...newPlayerForm, school: e.target.value})} className="w-full bg-slate-900 border border-white/10 px-4 py-2.5 rounded-xl font-bold text-white outline-none focus:border-rose-500" placeholder="예: 김천생과고" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">이름</label>
                                <input value={newPlayerForm.name} onChange={e=>setNewPlayerForm({...newPlayerForm, name: e.target.value})} className="w-full bg-slate-900 border border-white/10 px-4 py-2.5 rounded-xl font-bold text-white outline-none focus:border-rose-500" placeholder="선수 이름" />
                            </div>
                        </div>
                        <div className="pt-2">
                            <button 
                                onClick={handleCreatePlayer} 
                                disabled={isSubmittingPlayer}
                                className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-colors"
                            >
                                {isSubmittingPlayer ? '등록 중...' : '등록 및 선택하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-[#0f172a] text-white w-full max-w-4xl rounded-[2rem] shadow-[0_0_80px_rgba(37,99,235,0.15)] border border-white/10 overflow-hidden flex flex-col max-h-[98vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex items-center justify-between shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20"><Trophy className="w-5 h-5 text-yellow-400" /></div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight uppercase leading-none">경기 기록 카드</h2>
                            <p className="text-blue-100/60 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Tactical Analysis System</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white relative z-10"><X className="w-6 h-6" /></button>
                </div>
                
                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                    {/* Basic Info */}
                    <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                        <div className="flex-1 space-y-1">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest pl-1">Match Title</p>
                            <input value={formData.match_name} onChange={e=>setFormData({...formData, match_name: e.target.value})} className="w-full bg-[#1e293b] border border-white/10 px-4 py-3 rounded-xl font-black text-lg focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 shadow-inner" placeholder="대회명 및 라운드" />
                        </div>
                        <div className="w-48 space-y-1">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest pl-1">Date</p>
                            <input type="date" value={formData.match_date} onChange={e=>setFormData({...formData, match_date: e.target.value})} className="w-full bg-[#1e293b] border border-white/10 px-4 py-3 rounded-xl font-bold text-slate-300 focus:border-blue-500 outline-none transition-all shadow-inner" />
                        </div>
                    </div>

                    {/* Players Section */}
                    <div className="grid grid-cols-11 gap-4 items-center">
                        <div className="col-span-5 space-y-4 p-5 bg-blue-600/5 border border-blue-500/20 rounded-[1.5rem] relative">
                            <div className="absolute -top-2.5 right-6 px-3 py-0.5 bg-blue-600 text-[8px] font-black rounded-full shadow-lg tracking-widest uppercase z-20">우리팀</div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest pl-1">Primary Player</p>
                                    <AutocompleteField 
                                        value={formData.player_id} 
                                        onChange={(val: string) => setFormData({...formData, player_id: val})} 
                                        placeholder="본인 선수 선택 (검색)" 
                                        players={localPlayers}
                                        onAddNewPlayer={(initialSchoolName?: string) => {
                                            setNewPlayerForm({ name: '', school: initialSchoolName || '' });
                                            setIsCreatingPlayer('player');
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 opacity-50">Partner (Optional)</p>
                                    <AutocompleteField 
                                        value={formData.partner_id} 
                                        onChange={(val: string) => setFormData({...formData, partner_id: val})} 
                                        placeholder="파트너 선택 (검색)" 
                                        players={localPlayers}
                                        onAddNewPlayer={(initialSchoolName?: string) => {
                                            setNewPlayerForm({ name: '', school: initialSchoolName || '' });
                                            setIsCreatingPlayer('partner');
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 flex flex-col items-center justify-center opacity-30">
                            <span className="text-[10px] font-black tracking-widest italic uppercase">VS</span>
                        </div>

                        <div className="col-span-5 space-y-4 p-5 bg-rose-600/5 border border-rose-500/20 rounded-[1.5rem] relative">
                            <div className="absolute -top-2.5 right-6 px-3 py-0.5 bg-rose-600 text-[8px] font-black rounded-full shadow-lg tracking-widest uppercase z-20">상대팀</div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest pl-1">Primary Opponent</p>
                                        {pastStats && (
                                            <span className="text-[10px] font-black text-rose-300/80 tracking-tight">
                                                역대 전적: {pastStats.total}전 {pastStats.wins}승 {pastStats.losses}패 ({pastStats.rate}%)
                                            </span>
                                        )}
                                    </div>
                                    <AutocompleteField 
                                        value={formData.opponent_1_id} 
                                        onChange={(val: string) => setFormData({...formData, opponent_1_id: val})} 
                                        placeholder="상대 선수 선택 (검색)" 
                                        players={localPlayers}
                                        onAddNewPlayer={(initialSchoolName?: string) => {
                                            setNewPlayerForm({ name: '', school: initialSchoolName || '' });
                                            setIsCreatingPlayer('opponent_1');
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1 opacity-50">Wingman (Optional)</p>
                                    <AutocompleteField 
                                        value={formData.opponent_2_id} 
                                        onChange={(val: string) => setFormData({...formData, opponent_2_id: val})} 
                                        placeholder="상대 2번 선택 (검색)" 
                                        players={localPlayers}
                                        onAddNewPlayer={(initialSchoolName?: string) => {
                                            setNewPlayerForm({ name: '', school: initialSchoolName || '' });
                                            setIsCreatingPlayer('opponent_2');
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Media Control */}
                    <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-4 flex items-center justify-between gap-6">
                        <div className="flex flex-col gap-1 w-1/3">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Youtube Reference</label>
                            <div className="relative">
                                <input value={formData.youtube_video_id} onChange={e=>setFormData({...formData, youtube_video_id: e.target.value})} className="w-full bg-slate-900 border border-white/5 px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-300 text-sm pl-10" placeholder="Youtube ID" />
                                <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 w-2/3">
                            {[1, 2, 3].map(s => (
                                <div key={s} className="space-y-1">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest pl-1">Set {s} Start</p>
                                    <div className="flex items-center bg-slate-900/50 border border-white/5 rounded-xl px-2 py-1.5 focus-within:border-blue-500 transition-all">
                                        <button onClick={() => openVideoAt(String(formData[`set_${s}_start` as keyof typeof formData]))} className="p-1 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-md transition-all mr-2"><Play className="w-3 h-3 fill-current" /></button>
                                        <input 
                                            value={formData[`set_${s}_start` as keyof typeof formData] === '00:00' ? '' : String(formData[`set_${s}_start` as keyof typeof formData])} 
                                            onChange={e => setFormData({...formData, [`set_${s}_start`]: formatTimeInput(e.target.value)})} 
                                            className={cn(
                                                "w-full bg-transparent outline-none font-black text-xs text-center placeholder:text-slate-600 transition-colors",
                                                formData[`set_${s}_start` as keyof typeof formData] === '00:00' ? "text-slate-500" : "text-white"
                                            )} 
                                            placeholder="00:00" 
                                            maxLength={5}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between shrink-0">
                    <button onClick={onClose} className="text-slate-500 font-black hover:text-white transition-all tracking-widest uppercase text-[10px]">Cancel</button>
                    <button 
                        onClick={() => {
                            if (!formData.player_id || !formData.opponent_1_id) {
                                alert("본인 선수와 상대 선수를 반드시 선택해 주세요.");
                                return;
                            }
                            // Calculate score to save result logic here...
                            const p1 = Number(formData.set_1_score_player);
                            const o1 = Number(formData.set_1_score_opponent);
                            const p2 = Number(formData.set_2_score_player);
                            const o2 = Number(formData.set_2_score_opponent);
                            const p3 = Number(formData.set_3_score_player);
                            const o3 = Number(formData.set_3_score_opponent);
                            let pw = 0, ow = 0;
                            if (p1 > o1) pw++; else if (o1 > p1) ow++;
                            if (p2 > o2) pw++; else if (o2 > p2) ow++;
                            if (p3 > o3 && (p3 > 0 || o3 > 0)) pw++; else if (o3 > p3 && (p3 > 0 || o3 > 0)) ow++;
                            const savePayload: any = { 
                                ...formData, 
                                tournament_id: tournamentId, 
                                id: match?.id, 
                                match_result: pw >= ow ? 'win' : 'lose',
                                match_type: (formData.partner_id || formData.opponent_2_id) ? '복식' : '단식'
                            };
                            
                            // Fix UUID empty string issue for optional foreign keys
                            if (!savePayload.partner_id) savePayload.partner_id = null;
                            if (!savePayload.opponent_2_id) savePayload.opponent_2_id = null;

                            onSave(savePayload);
                        }} 
                        className="bg-blue-600 px-10 py-3 rounded-2xl font-black text-white hover:bg-blue-500 transition-all shadow-lg flex items-center gap-3 active:scale-95 group/save text-sm"
                    >
                        <span>{match ? '기록 업데이트' : '전술 리포트 생성'}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchModal;
