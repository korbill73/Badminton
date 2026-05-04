'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, AlertCircle } from 'lucide-react';
import CategorySelectModal from './CategorySelectModal';

interface Category {
    id: string;
    name: string;
    type: 'winner' | 'loss';
    category_group: 'offensive' | 'tactical' | 'error' | 'others';
    is_default: boolean;
}

interface QuickRecorderProps {
    player: any;
    matchId: string;
    currentSet: number;
    categories: Category[];
    onLogAdded: (log: any) => void;
    onTriggerRecord: (isMyPoint: boolean, timestamp: number) => void;
    scoreMe: number;
    scoreOpp: number;
}

export default function QuickRecorder({
    player,
    matchId,
    currentSet,
    categories,
    onLogAdded,
    onTriggerRecord,
    scoreMe,
    scoreOpp
}: QuickRecorderProps) {
    const [submitting, setSubmitting] = useState(false);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'w':
                    handleQuickRecord(true);
                    break;
                case 's':
                    handleQuickRecord(false);
                    break;
                case ' ':
                    e.preventDefault();
                    if (player) {
                        const state = player.getPlayerState();
                        if (state === 1) player.pauseVideo();
                        else player.playVideo();
                    }
                    break;
                case 'a':
                    if (player) player.seekTo(player.getCurrentTime() - 5);
                    break;
                case 'd':
                    if (player) player.seekTo(player.getCurrentTime() + 5);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [player, scoreMe, scoreOpp]);

    const handleQuickRecord = (isMyPoint: boolean) => {
        if (!player) return;
        const currentTime = Math.floor(player.getCurrentTime());
        player.pauseVideo();
        player.seekTo(Math.max(0, currentTime - 2));

        onTriggerRecord(isMyPoint, currentTime);
    };

    return (
        <div className="flex gap-2 p-2 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/5 relative z-10">
            <button
                onClick={() => handleQuickRecord(true)}
                disabled={submitting}
                className="flex-1 group relative h-14 bg-slate-900 rounded-xl border border-cyan-500/20 overflow-hidden transition-all active:scale-95 hover:bg-cyan-500/5 hover:border-cyan-400/50"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-50" />
                <div className="relative h-full flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-black text-white tracking-tighter uppercase whitespace-nowrap">
                        득점 기록 <span className="text-cyan-400 opacity-60 ml-1">(W)</span>
                    </span>
                </div>
            </button>

            <button
                onClick={() => handleQuickRecord(false)}
                disabled={submitting}
                className="flex-1 group relative h-14 bg-slate-900 rounded-xl border border-rose-500/20 overflow-hidden transition-all active:scale-95 hover:bg-rose-500/5 hover:border-rose-400/50"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-50" />
                <div className="relative h-full flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-black text-white tracking-tighter uppercase whitespace-nowrap">
                        실점 기록 <span className="text-rose-500 opacity-60 ml-1">(S)</span>
                    </span>
                </div>
            </button>
        </div>
    );
}
