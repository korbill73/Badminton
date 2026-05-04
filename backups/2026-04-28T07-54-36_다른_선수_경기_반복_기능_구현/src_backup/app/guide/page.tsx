'use client';

import React from 'react';
import { 
    BookOpen, 
    Database, 
    ShieldCheck, 
    Layout, 
    Zap, 
    AlertCircle, 
    ChevronRight,
    Search,
    History,
    Settings,
    FileCode,
    Activity
} from 'lucide-react';

export default function GuidePage() {
    return (
        <div className="min-h-screen bg-[#080d1a] text-white p-12">
            <div className="max-w-[1200px] mx-auto space-y-16">
                
                {/* Hero Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-transparent p-12 rounded-[3rem] border border-blue-500/20 shadow-2xl">
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3 text-blue-400 font-black tracking-[0.3em] text-sm uppercase">
                            <BookOpen className="w-5 h-5" /> Operation Manual
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter">시스템 운영 매뉴얼<span className="text-blue-500">.</span></h1>
                        <p className="text-slate-400 text-xl font-medium max-w-3xl leading-relaxed">
                            Badminton Performance Analytics System의 핵심 기능을 정복하고 데이터 무결성을 유지하기 위한 종합 가이드입니다.
                        </p>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Section 0: Dashboard Analytics (New!) */}
                    <div className="bg-[#0b1221] p-10 rounded-[2.5rem] border border-blue-500/30 space-y-6 hover:border-blue-500/60 transition-all group lg:col-span-2">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            통합 대시보드 분석 (KPI) <ChevronRight className="w-6 h-6 text-slate-700" />
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-400 leading-relaxed font-medium">
                            <div className="space-y-3">
                                <h4 className="text-white font-black">실시간 승률 관리</h4>
                                <p className="text-sm">입력된 모든 경기 데이터를 기반으로 승률을 실시간 계산합니다. 60% 이상 시 <span className="text-emerald-500 italic">Optimal</span> 상태로 표시됩니다.</p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-white font-black">승/패 카운트</h4>
                                <p className="text-sm">전체 경기 중 승리와 패배의 비율을 명확하게 수치화하여 현재의 기세를 보여줍니다.</p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-white font-black">인텔리전스 패널</h4>
                                <p className="text-sm">데이터의 무결성 주기를 체크하고 백업 상태를 모니터링하는 전문 보안 영역입니다.</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Backup & Restore */}
                    <div className="bg-[#0b1221] p-10 rounded-[2.5rem] border border-white/5 space-y-6 hover:border-blue-500/40 transition-all group">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Database className="w-8 h-8 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            데이터 및 소스 백업 <ChevronRight className="w-6 h-6 text-slate-700" />
                        </h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>이 시스템은 단순한 DB 백업을 넘어 **전체 소스 코드(`src`)**를 타임머신처럼 보관합니다.</p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" /> <span className="strong text-white">백업 위치:</span> 프로젝트 루트의 <code className="bg-white/5 px-2 py-0.5 rounded text-blue-400">backups/</code> 폴더</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" /> <span className="strong text-white">동시 백업:</span> DB 레코드(`data.json`) + 전체 소스 코드(`src_backup`)</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" /> <span className="strong text-white">복원 주의사항:</span> 복원 시 현재의 디자인 코드가 백업 시점으로 **완전히 덮어씌워지며** 화면이 새로고침됩니다.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 2: Tournament Management */}
                    <div className="bg-[#0b1221] p-10 rounded-[2.5rem] border border-white/5 space-y-6 hover:border-emerald-500/40 transition-all group">
                        <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Layout className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            대회 및 정보 관리 <ChevronRight className="w-6 h-6 text-slate-700" />
                        </h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>대회명 뿐만 아니라 장소, 기간, 최종 성적을 정밀하게 기록할 수 있습니다.</p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" /> 대회 제목을 클릭하면 정보를 수정할 수 있는 모달이 나타납니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" /> <span className="text-yellow-400 font-bold underline">장소 정보</span>는 디자인 포인트로 활용되어 메인 제목 옆에 가장 크게 노출됩니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" /> 정렬 기준은 항상 **가장 최근의 대회 시작일**을 우선으로 합니다.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 3: Match List UI */}
                    <div className="bg-[#0b1221] p-10 rounded-[2.5rem] border border-white/5 space-y-6 hover:border-amber-500/40 transition-all group">
                        <div className="w-16 h-16 bg-amber-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Zap className="w-8 h-8 text-amber-500" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            경기 목차 스코어 정렬 <ChevronRight className="w-6 h-6 text-slate-700" />
                        </h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>코 cockpit 디자인 철학에 따라 결과 데이터를 전진 배치했습니다.</p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" /> 모든 경기의 스코어는 왼쪽의 수직 라인을 기준으로 정렬됩니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" /> <span className="text-yellow-400 font-bold">노란색 네온</span> 컬러는 이번 경기에서 우리가 이룩한 "결과"를 상징합니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" /> 카드 마우스 오버 시 블루 글로우 효과가 타겟 가시성을 높여줍니다.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Section 4: Design System & Color Tokens */}
                    <div className="bg-[#0b1221] p-10 rounded-[2.5rem] border border-white/5 space-y-6 hover:border-sky-500/40 transition-all group">
                        <div className="w-16 h-16 bg-sky-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Settings className="w-8 h-8 text-sky-500" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            디자인 시스템 & 토큰 <ChevronRight className="w-6 h-6 text-slate-700" />
                        </h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>시스템 전반에 사용된 컬러는 데이터의 성격에 따라 정의되었습니다.</p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0" /> <span className="text-sky-400 font-bold">Sky Blue:</span> 우리 선수 및 아군 데이터를 상징합니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" /> <span className="text-yellow-400 font-bold">Neon Yellow:</span> 상대 팀 및 핵심 결과값(공통)을 상징합니다.</li>
                                <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white mt-2 shrink-0" /> <span className="text-white font-bold">Pure White:</span> 날짜, 상태값 등 메타데이터에 사용됩니다.</li>
                            </ul>
                        </div>
                    </div>

                </div>

                {/* Footer Warning */}
                <div className="p-10 bg-amber-500/5 border border-amber-500/10 rounded-[3rem] flex items-start gap-8">
                    <AlertCircle className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
                    <div className="space-y-4">
                        <h4 className="text-xl font-black text-amber-500 underline underline-offset-8">운영 수칙 01: 복원 전 필수 백업</h4>
                        <p className="text-slate-500 leading-relaxed font-bold text-lg">
                            전체 복원을 수행하면 현재 진행 중인 최신 소스 개발 내용이 날아갈 수 있습니다. 
                            반드시 복원 작업 전에는 현재 상태를 하나의 백업 폴더로 명시하여 저장한 뒤 진행하십시오.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
