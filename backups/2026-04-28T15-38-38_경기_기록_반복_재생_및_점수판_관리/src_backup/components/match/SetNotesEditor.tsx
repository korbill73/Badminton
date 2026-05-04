'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Bold, Italic, Underline, Strikethrough, Save, CheckCheck,
    Loader2, FileEdit, ChevronDown, ChevronUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SetNotesEditorProps {
    matchId: string;
    setNumber: number;
    /** dark mode (모바일 다크 배경에서 사용 시 true) */
    dark?: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SetNotesEditor({ matchId, setNumber, dark = false }: SetNotesEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteIdRef = useRef<string | null>(null);

    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [isLoading, setIsLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // ── Load note for this set ──────────────────────────────────────────────
    const loadNote = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('bd_set_notes')
                .select('*')
                .eq('match_id', matchId)
                .eq('set_number', setNumber)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                noteIdRef.current = data.id;
                if (editorRef.current) {
                    editorRef.current.innerHTML = data.content || '';
                }
            } else {
                noteIdRef.current = null;
                if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                }
            }
        } catch (err) {
            console.error('노트 로드 오류:', err);
        } finally {
            setIsLoading(false);
        }
    }, [matchId, setNumber]);

    useEffect(() => {
        loadNote();
    }, [loadNote]);

    // ── Save ──────────────────────────────────────────────────────────────
    const saveNote = useCallback(async (manual = false) => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;

        setSaveState('saving');
        try {
            if (noteIdRef.current) {
                // Update
                const { error } = await supabase
                    .from('bd_set_notes')
                    .update({ content, updated_at: new Date().toISOString() })
                    .eq('id', noteIdRef.current);
                if (error) throw error;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('bd_set_notes')
                    .insert({ match_id: matchId, set_number: setNumber, content })
                    .select()
                    .single();
                if (error) throw error;
                noteIdRef.current = data.id;
            }
            setSaveState('saved');
            setTimeout(() => setSaveState('idle'), 2500);
        } catch (err) {
            console.error('노트 저장 오류:', err);
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 3000);
        }
    }, [matchId, setNumber]);

    // ── Auto-save with debounce ───────────────────────────────────────────
    const scheduleAutoSave = () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSaveState('idle');
        saveTimerRef.current = setTimeout(() => saveNote(), 1500);
    };

    // ── Toolbar actions ───────────────────────────────────────────────────
    const exec = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        scheduleAutoSave();
    };

    // ── Styles ───────────────────────────────────────────────────────────
    const surface = dark
        ? 'bg-slate-800/60 border-white/10 text-white'
        : 'bg-white border-slate-200 text-slate-900';
    const toolbar = dark
        ? 'bg-slate-900/80 border-white/10'
        : 'bg-slate-50 border-slate-200';
    const toolBtn = dark
        ? 'text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200 active:bg-slate-300';
    const placeholder = dark ? 'text-slate-600' : 'text-slate-400';
    const editorText = dark ? 'text-white' : 'text-slate-900';

    // Save state badge
    const saveBadge = {
        idle: null,
        saving: (
            <span className={cn('flex items-center gap-1 text-[10px] font-bold', dark ? 'text-slate-500' : 'text-slate-400')}>
                <Loader2 className="w-3 h-3 animate-spin" /> 저장 중...
            </span>
        ),
        saved: (
            <span className={cn('flex items-center gap-1 text-[10px] font-bold text-emerald-500')}>
                <CheckCheck className="w-3 h-3" /> 저장됨
            </span>
        ),
        error: (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500">
                저장 실패
            </span>
        ),
    }[saveState];

    return (
        <div className={cn('rounded-2xl border overflow-hidden shadow-sm transition-all', surface)}>
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(v => !v)}
                className={cn(
                    'w-full flex items-center justify-between px-4 py-3 border-b transition-colors',
                    toolbar,
                    'hover:opacity-80'
                )}
            >
                <div className="flex items-center gap-2">
                    <FileEdit className={cn('w-4 h-4', dark ? 'text-cyan-400' : 'text-blue-500')} />
                    <span className={cn('text-sm font-black', dark ? 'text-white' : 'text-slate-800')}>
                        {setNumber}세트 메모
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {saveBadge}
                    {isCollapsed
                        ? <ChevronDown className={cn('w-4 h-4', dark ? 'text-slate-500' : 'text-slate-400')} />
                        : <ChevronUp className={cn('w-4 h-4', dark ? 'text-slate-500' : 'text-slate-400')} />
                    }
                </div>
            </button>

            {!isCollapsed && (
                <>
                    {/* Toolbar */}
                    <div className={cn('flex items-center gap-1 px-2 py-1.5 border-b', toolbar)}>
                        {[
                            { cmd: 'bold', Icon: Bold, title: '굵게 (Ctrl+B)' },
                            { cmd: 'italic', Icon: Italic, title: '기울임 (Ctrl+I)' },
                            { cmd: 'underline', Icon: Underline, title: '밑줄 (Ctrl+U)' },
                            { cmd: 'strikeThrough', Icon: Strikethrough, title: '취소선' },
                        ].map(({ cmd, Icon, title }) => (
                            <button
                                key={cmd}
                                onMouseDown={(e) => { e.preventDefault(); exec(cmd); }}
                                title={title}
                                className={cn('p-1.5 rounded-md transition-colors', toolBtn)}
                            >
                                <Icon className="w-3.5 h-3.5" />
                            </button>
                        ))}

                        <div className={cn('h-4 w-px mx-1', dark ? 'bg-white/10' : 'bg-slate-200')} />

                        {/* Heading buttons */}
                        {['H2', 'H3'].map(tag => (
                            <button
                                key={tag}
                                onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', tag); }}
                                title={`${tag} 제목`}
                                className={cn('px-2 py-1 rounded-md text-[10px] font-black transition-colors', toolBtn)}
                            >
                                {tag}
                            </button>
                        ))}
                        <button
                            onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'P'); }}
                            title="본문"
                            className={cn('px-2 py-1 rounded-md text-[10px] font-black transition-colors', toolBtn)}
                        >
                            P
                        </button>

                        <div className="flex-1" />

                        {/* Manual Save */}
                        <button
                            onMouseDown={(e) => { e.preventDefault(); saveNote(true); }}
                            title="저장"
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all',
                                dark
                                    ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                                    : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                            )}
                        >
                            <Save className="w-3 h-3" />
                            저장
                        </button>
                    </div>

                    {/* Editor area */}
                    <div className="relative min-h-[120px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-28 gap-2 opacity-40">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs font-bold">노트 불러오는 중...</span>
                            </div>
                        ) : (
                            <>
                                {/* Placeholder */}
                                <div
                                    className={cn(
                                        'absolute top-3 left-4 text-sm pointer-events-none select-none transition-opacity',
                                        placeholder,
                                        editorRef.current?.innerHTML && editorRef.current.innerHTML !== '<br>' ? 'opacity-0' : 'opacity-100'
                                    )}
                                >
                                    이 세트의 느낀 점, 전술 메모, 개선 사항을 자유롭게 작성하세요...
                                </div>
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={scheduleAutoSave}
                                    onKeyDown={(e) => {
                                        // Ctrl+S manual save
                                        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                                            e.preventDefault();
                                            saveNote(true);
                                        }
                                    }}
                                    className={cn(
                                        'w-full min-h-[120px] px-4 py-3 text-sm leading-relaxed outline-none',
                                        'prose prose-sm max-w-none',
                                        editorText,
                                        dark && [
                                            '[&_h2]:text-white [&_h3]:text-white',
                                            '[&_strong]:text-white [&_em]:text-slate-300',
                                            '[&_p]:text-slate-200',
                                        ]
                                    )}
                                    style={{
                                        fontFamily: 'inherit',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                    }}
                                />
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
