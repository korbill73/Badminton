import React, { useState, useEffect, useRef } from 'react';
import { Zap, Plus, X, Edit2, Check, Trash2, ChevronRight, Layout, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIN_GROUPS_INITIAL, LOSS_GROUPS_INITIAL, REASONS_INITIAL } from '@/lib/constants/badminton-categories';
import { supabase } from '@/lib/supabase';
import { BDPointLog } from '@/types';

interface VerticalDataEntryProps {
    mode: 'WIN' | 'LOSS';
    onInsert: (isMyPoint: boolean, timestamp: string, data: any) => void;
    logs: BDPointLog[];
    categories?: any;
    activeTime: string;
    onCategoriesChange?: (data: any) => void;
}

export default function VerticalDataEntry({
    mode,
    onInsert,
    logs,
    categories,
    activeTime,
    onCategoriesChange
}: VerticalDataEntryProps) {
    const isWin = mode === 'WIN';
    
    // ── New 2-Level Direct Structure ──
    const [groups, setGroups] = useState<Record<string, any>>(isWin ? WIN_GROUPS_INITIAL : LOSS_GROUPS_INITIAL);
    const [reasons, setReasons] = useState<any[]>(isWin ? REASONS_INITIAL.WIN : REASONS_INITIAL.LOSS);

    const [isEditMode, setIsEditMode] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // ── Ref System to prevent infinite loops (Crucial!) ──
    const currentDataRef = useRef<any>({});
    useEffect(() => {
        currentDataRef.current = { groups, reasons };
    }, [groups, reasons]);

    const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

    // Inline Editing State
    const [editingPath, setEditingPath] = useState<string | null>(null); 
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const loadFromLocal = () => {
        const key = `badminton_cockpit_categories_v3_${mode}`; // Using v3 for new structure
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const current = currentDataRef.current;
                
                if (parsed.groups && !isEqual(parsed.groups, current.groups)) {
                    setGroups(parsed.groups);
                }
                if (parsed.reasons && !isEqual(parsed.reasons, current.reasons)) {
                    setReasons(parsed.reasons);
                }
            } catch (e) {
                console.error("Failed to load v3 categories", e);
            }
        }
    };

    // Load from localStorage on mount or mode change
    useEffect(() => {
        setIsInitialized(false);
        loadFromLocal();
        setIsInitialized(true);
        window.addEventListener('badminton_categories_updated', loadFromLocal);
        return () => window.removeEventListener('badminton_categories_updated', loadFromLocal);
    }, [mode]);

    // Save to localStorage and notify parent
    useEffect(() => {
        if (!isInitialized) return;
        const key = `badminton_cockpit_categories_v3_${mode}`;
        const data = { groups, reasons };
        localStorage.setItem(key, JSON.stringify(data));
        
        if (onCategoriesChange) {
            onCategoriesChange(data);
        }
        
        window.dispatchEvent(new CustomEvent('badminton_categories_updated'));
    }, [groups, reasons, mode, isInitialized]);

    const handleFinalSelect = (groupId: string, sub: string) => {
        if (isEditMode) return;
        const group = groups[groupId];
        if (!group) return;

        const data = {
            reason: group.reasonId,
            situation: groupId,
            pointType: sub,
            activeTime: activeTime
        };

        onInsert(isWin, activeTime, data);
    };

    // --- Inline CRUD Handlers ---
    const startEditing = (e: React.MouseEvent, path: string, initial: string) => {
        e.stopPropagation();
        setEditingPath(path);
        setEditValue(initial);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const commitEdit = () => {
        if (!editingPath) return;
        const [type, p1, p2] = editingPath.split(':');
        const newValue = editValue.trim();

        if (type === 'group') {
            setGroups(prev => ({
                ...prev,
                [p1]: { ...prev[p1], label: newValue }
            }));
        } else if (type === 'sub') {
            setGroups(prev => {
                const grp = prev[p1];
                const newSubs = [...grp.subs];
                newSubs[parseInt(p2)] = newValue;
                return { ...prev, [p1]: { ...grp, subs: newSubs } };
            });
        }
        setEditingPath(null);
    };

    const addGroup = (reasonId: string) => {
        const name = "새 기술군";
        const key = `custom_grp_${Date.now()}`;
        setGroups(prev => ({
            ...prev,
            [key]: { label: name, reasonId, subs: ["항목 1"] }
        }));
        setEditingPath(`group:${key}`);
        setEditValue(name);
    };

    const removeGroup = (key: string) => {
        if (confirm("이 항목을 삭제하시겠습니까?")) {
            setGroups(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const addSub = (groupId: string) => {
        const name = "새 항목";
        setGroups(prev => {
            const grp = prev[groupId];
            const newIndex = grp.subs.length;
            setEditingPath(`sub:${groupId}:${newIndex}`);
            setEditValue(name);
            return {
                ...prev,
                [groupId]: { ...grp, subs: [...grp.subs, name] }
            };
        });
    };

    const removeSub = (groupId: string, index: number) => {
        setGroups(prev => {
            const grp = prev[groupId];
            return {
                ...prev,
                [groupId]: { ...grp, subs: grp.subs.filter((_: any, i: number) => i !== index) }
            };
        });
    };

    const getGroupPulseColor = (index: number) => {
        const colors = isWin 
            ? ['bg-cyan-500', 'bg-blue-500', 'bg-teal-500', 'bg-sky-500', 'bg-indigo-500']
            : ['bg-rose-500', 'bg-pink-500', 'bg-orange-500', 'bg-red-500', 'bg-fuchsia-500'];
        return colors[index % colors.length];
    };

    return (
        <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Header Area */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 border-b shrink-0 z-30 relative",
                isWin ? "bg-cyan-500/10 border-cyan-500/20" : "bg-rose-500/10 border-rose-500/20"
            )}>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse", 
                        isWin ? "bg-cyan-500" : "bg-rose-500"
                    )} />
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest", 
                        isWin ? "text-cyan-400" : "text-rose-400"
                    )}>
                        {mode} CATEGORY
                    </span>
                </div>
                <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={cn(
                        "p-1.5 rounded-lg border transition-all active:scale-95",
                        isEditMode ? "bg-amber-500 border-amber-400 text-slate-950" : "bg-white/5 border-white/5 text-slate-500 hover:text-white"
                    )}
                >
                    {isEditMode ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
                {Object.entries(groups).map(([key, group], gIdx) => (
                    <div key={key} className={cn(
                        "group relative bg-white/[0.03] hover:bg-white/[0.05] rounded-2xl border transition-all overflow-hidden",
                        isWin ? "border-cyan-500/20 hover:border-cyan-500/40" : "border-rose-500/20 hover:border-rose-500/40"
                    )}>
                        <div className={cn("absolute left-0 top-0 bottom-0 w-1", getGroupPulseColor(gIdx))} />
                        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                            {editingPath === `group:${key}` ? (
                                <input
                                    ref={inputRef}
                                    className="bg-slate-800 text-white text-[10px] font-bold rounded px-1.5 py-0.5 outline-none border border-white/10"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={commitEdit}
                                    onKeyDown={e => e.key === 'Enter' && commitEdit()}
                                />
                            ) : (
                                <span className="text-[10px] font-bold text-slate-300">{group.label}</span>
                            )}
                            {isEditMode && editingPath !== `group:${key}` && (
                                <div className="flex gap-1.5">
                                    <button onClick={(e) => startEditing(e, `group:${key}`, group.label)}><Edit2 className="w-2.5 h-2.5 text-slate-500 hover:text-amber-500"/></button>
                                    <button onClick={() => removeGroup(key)}><Trash2 className="w-2.5 h-2.5 text-slate-500 hover:text-rose-500"/></button>
                                </div>
                            )}
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-1.5">
                            {group.subs.map((sub: string, sIdx: number) => (
                                <div key={sIdx} className="relative group/sub">
                                    <button
                                        onClick={() => !isEditMode && handleFinalSelect(key, sub)}
                                        className={cn(
                                            "w-full py-2 px-1 rounded-lg border text-[10px] font-bold text-center transition-all truncate",
                                            isWin 
                                                ? "bg-blue-600/20 border-blue-500/30 text-blue-100 hover:bg-blue-600 hover:border-blue-400" 
                                                : "bg-rose-600/20 border-rose-500/30 text-rose-100 hover:bg-rose-600 hover:border-rose-400"
                                        )}
                                    >
                                        {editingPath === `sub:${key}:${sIdx}` ? (
                                            <input
                                                ref={inputRef}
                                                className="bg-transparent text-center w-full outline-none"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={commitEdit}
                                                onKeyDown={e => e.key === 'Enter' && commitEdit()}
                                            />
                                        ) : sub}
                                    </button>
                                    {isEditMode && editingPath !== `sub:${key}:${sIdx}` && (
                                        <div className="absolute -top-1.5 -right-1.5 flex gap-1 z-20">
                                            <button onClick={(e) => startEditing(e, `sub:${key}:${sIdx}`, sub)} className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"><Edit2 className="w-2 h-2 text-black"/></button>
                                            <button onClick={() => removeSub(key, sIdx)} className="w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center"><X className="w-2 h-2 text-white"/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isEditMode && (
                                <button onClick={() => addSub(key)} className="py-1.5 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {isEditMode && (
                    <button onClick={() => addGroup(reasons[0]?.id)} className="w-full py-3 rounded-xl border border-dashed border-white/10 hover:border-white/30 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-300">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Add Group</span>
                    </button>
                )}
            </div>
        </div>
    );
}
