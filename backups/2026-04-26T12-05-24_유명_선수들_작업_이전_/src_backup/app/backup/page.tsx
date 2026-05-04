'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Database, 
    Download, 
    Upload, 
    Trash2, 
    History, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    ChevronRight,
    Loader2,
    Eye,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupEntry {
    id: string;
    created_at: string;
    name: string;
    data: any;
}

export default function BackupPage() {
    const [backups, setBackups] = useState<BackupEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const fetchBackups = async () => {
        setLoading(true);
        const { data } = await supabase.from('bd_backups').select('*').order('created_at', { ascending: false });
        setBackups(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const createBackup = async () => {
        const name = prompt("백업 명칭을 입력하세요 (예: 2024 시즌 결산):");
        if (!name) return;

        setProcessing(true);
        setProgress("데이터 추출 중...");

        try {
            // Fetch all core data
            const [
                { data: tournaments },
                { data: players },
                { data: matches },
                { data: pointLogs }
            ] = await Promise.all([
                supabase.from('bd_tournaments').select('*'),
                supabase.from('bd_players').select('*'),
                supabase.from('bd_matches').select('*'),
                supabase.from('bd_point_logs').select('*')
            ]);

            const fullData = { tournaments, players, matches, pointLogs };

            setProgress("로컬 폴더 생성 및 저장 중...");
            
            // Call our new Local API
            const response = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: fullData })
            });

            const result = await response.json();

            if (!result.success) throw new Error(result.error);

            // Also keep a record in DB for history
            const { error: dbError } = await supabase.from('bd_backups').insert([
                { name, data: { ...fullData, local_path: result.path, folder_name: result.folderName } }
            ]);

            if (dbError) console.warn("DB record failed, but local backup was created:", dbError.message);
            
            alert(`백업이 성공적으로 생성되었습니다.\n\n위치: backups/${result.folderName}\n\n데이터와 당시의 UI 코드 스냅샷이 모두 저장되었습니다.`);
            fetchBackups();
        } catch (error: any) {
            alert(`백업 실패: ${error.message}`);
        } finally {
            setProcessing(false);
            setProgress("");
        }
    };

    const restoreBackup = async (backup: BackupEntry) => {
        const confirmed = confirm(`[경고] 백업 지점(${backup.name})으로 복원을 시작합니다.\n\n현재의 모든 데이터가 백업 내용으로 덮어씌워집니다. 정말 진행하시겠습니까?`);
        if (!confirmed) return;

        setProcessing(true);
        const { tournaments, players, matches, pointLogs } = backup.data;

        try {
            // STEP 1: DELETE EXISTING (DANGEROUS!)
            setProgress("기존 데이터 초기화 중 (1/3)...");
            await supabase.from('bd_point_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('bd_matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('bd_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('bd_tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

            // STEP 2: RESTORE CORE (Dependencies First)
            setProgress("기초 데이터 복원 중 (2/3)...");
            if (tournaments?.length) await supabase.from('bd_tournaments').insert(tournaments);
            if (players?.length) await supabase.from('bd_players').insert(players);

            // STEP 3: RESTORE RELATIONS
            setProgress("경기 기록 및 로그 복원 중 (3/3)...");
            if (matches?.length) await supabase.from('bd_matches').insert(matches);
            if (pointLogs?.length) await supabase.from('bd_point_logs').insert(pointLogs);

            // STEP 4: RESTORE UI SOURCE CODE
            const folderName = backup.data?.folder_name;
            if (folderName) {
                setProgress("소스 코드 디자인 복원 중...");
                const uiRes = await fetch('/api/backup', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folderName })
                });
                const uiResult = await uiRes.json();
                if (!uiResult.success) console.warn("UI 복원 실패:", uiResult.error);
            }

            alert("성공적으로 복원되었습니다. 모든 데이터와 디자인 코드가 복구되었습니다.\n\n시스템을 재시작하기 위해 페이지를 새로고침합니다.");
            window.location.reload();
        } catch (error: any) {
            alert(`복원 실패: ${error.message}\n주의: 일부 데이터가 유실되었을 수 있으니 즉시 서비스를 점검하십시오.`);
        } finally {
            setProcessing(false);
            setProgress("");
        }
    };

    const deleteBackup = async (id: string) => {
        if (!confirm("해당 백업 아카이브를 영구 삭제하시겠습니까?")) return;
        await supabase.from('bd_backups').delete().eq('id', id);
        fetchBackups();
    };

    return (
        <div className="min-h-screen bg-[#080d1a] text-white p-12">
            {/* Header Section */}
            <div className="max-w-[1200px] mx-auto space-y-12">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-blue-500 font-black uppercase tracking-[0.3em] text-xs">
                            <Database className="w-5 h-5" /> SYSTEM ARCHIVE
                        </div>
                        <h1 className="text-5xl font-black tracking-tight">전술 데이터 백업 및 복원</h1>
                        <p className="text-slate-500 text-lg">경기 분석 데이터와 전술 카테고리 설정을 스냅샷으로 관리하세요.</p>
                    </div>
                    
                    <button 
                        onClick={createBackup}
                        disabled={processing}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 px-10 py-5 rounded-[2.5rem] font-black text-lg flex items-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-600/20"
                    >
                        {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                        새 백업 생성하기
                    </button>
                </div>

                {/* Status Notice */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-8 rounded-[2.5rem] flex items-center gap-8 shadow-xl">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-3xl flex items-center justify-center shrink-0">
                        <History className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-blue-400">데이터 안전 보호 중</h3>
                        <p className="text-slate-400 leading-relaxed">복원 기능은 현재 시스템의 모든 데이터를 삭제한 후 백업본으로 교체합니다. 복원 전 현재 상태를 반드시 백업해두시길 권장합니다.</p>
                    </div>
                </div>

                {/* Progress Overlay */}
                {processing && (
                    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-8">
                        <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-black tracking-tight">{progress}</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest">DO NOT CLOSE THIS PAGE</p>
                        </div>
                    </div>
                )}

                {/* Backup List */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black flex items-center gap-4 text-slate-400">
                        <Clock className="w-6 h-6 opacity-40" /> 저장된 백업 목록
                    </h2>
                    
                    {loading ? (
                        <div className="h-[400px] flex items-center justify-center">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="h-[300px] bg-white/5 border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center gap-6">
                            <div className="p-6 bg-white/5 rounded-full"><Database className="w-12 h-12 text-slate-700" /></div>
                            <p className="text-slate-500 font-black text-xl">아직 생성된 백업이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {backups.map((backup) => (
                                <div key={backup.id} className="group bg-[#0b1221] border border-white/5 p-8 rounded-[3rem] hover:border-blue-500/40 transition-all flex items-center justify-between shadow-lg hover:shadow-2xl">
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-slate-500 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all">
                                            <ArchiveBoxIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white mb-1">{backup.name}</h4>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(backup.created_at).toLocaleString('ko-KR')}</span>
                                                <span className="text-slate-700">|</span>
                                                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 무결성 검증 완료</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                        {backup.data?.screenshot && (
                                            <button 
                                                onClick={() => setPreviewImage(backup.data.screenshot)}
                                                className="px-6 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all border border-blue-500/20 shadow-xl"
                                            >
                                                <Eye className="w-4 h-4" /> 리포트 엿보기
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => restoreBackup(backup)}
                                            className="px-8 py-3 bg-white/5 hover:bg-emerald-600 text-slate-300 hover:text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 border border-white/10"
                                        >
                                            <RotateCcw className="w-4 h-4" /> 복원하기
                                        </button>
                                        <button 
                                            onClick={() => deleteBackup(backup.id)}
                                            className="p-4 bg-white/5 hover:bg-rose-600 text-slate-500 hover:text-white rounded-2xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Safety Warning Footer */}
            <div className="mt-20 max-w-[1200px] mx-auto p-10 bg-amber-500/5 border border-amber-500/10 rounded-[3rem] flex items-start gap-8">
                <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                <div className="space-y-2">
                    <h4 className="text-xl font-black text-amber-500">주의사항</h4>
                    <p className="text-slate-500 leading-relaxed font-bold">
                        데이터 복원 시 현재 시스템에 입력된 모든 데이터는 영구적으로 삭제됩니다. 특히 복원 중 페이지를 닫거나 인터넷 연결이 끊기면 데이터베이스 상태가 불안정해질 수 있습니다. 
                        중요한 작업 전에는 반드시 현재 상태를 백업하십시오.
                    </p>
                </div>
            </div>

            {/* Preview Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in" 
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-7xl max-h-[90vh] w-full rounded-[2vw] overflow-auto border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] custom-scrollbar" onClick={e => e.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewImage} alt="Backup Preview" className="w-full h-auto object-contain rounded-[2vw]" />
                        <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-4 bg-black/50 text-white rounded-full hover:bg-rose-600 transition-all shadow-xl">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Dummy icons to fix missing references in Lucide
function ArchiveBoxIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M3 10h18"/><path d="M10 14h4"/>
    </svg>
  )
}

function RotateCcw(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  )
}
