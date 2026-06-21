'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    LayoutDashboard, 
    Trophy, 
    Users2, 
    BarChart3, 
    LogOut,
    UserCircle,
    Bell,
    Settings,
    Database,
    Search,
    BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const pathname = usePathname();

    const menuItems = [
        { name: '대시보드', icon: LayoutDashboard, href: '/' },
        { name: '경기 기록', icon: Trophy, href: '/tournaments' },
        { name: '우수 선수 분석', icon: Search, href: '/pro-archive' },
        { name: '선수 관리', icon: Users2, href: '/players' },
        { name: '트레이닝 지표', icon: BarChart3, href: '/performance' },
        { name: '데이터 백업', icon: Database, href: '/backup' },
        { name: '시스템 매뉴얼', icon: BookOpen, href: '/guide' }
    ];

    return (
        <header className="h-[64px] bg-[#0b1221] border-b border-white/5 flex items-center px-4 md:px-8 gap-2 md:gap-10 shrink-0 z-[100] sticky top-0 w-full overflow-hidden">
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                    <span className="text-white font-black text-lg md:text-xl italic">B</span>
                </div>
                <span className="text-white font-black text-base md:text-lg tracking-tighter hidden sm:block md:block">EliteBadminton</span>
            </Link>

            {/* Main Menu */}
            <nav className="flex items-center gap-1 md:gap-2 flex-1 justify-center md:justify-start overflow-x-auto no-scrollbar py-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-3 md:px-5 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shrink-0",
                                isActive 
                                    ? "bg-white/10 text-white" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5",
                                item.name === '데이터 백업' && "hidden md:flex"
                            )}
                            title={item.name}
                        >
                            <item.icon className={cn("w-4 h-4 md:w-4 md:h-4", isActive ? "text-blue-500" : "text-slate-500")} />
                            <span className="hidden md:inline">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3 md:gap-6 text-white font-bold shrink-0">
                <div className="hidden md:flex items-center gap-6 mr-2">
                    <button className="text-slate-400 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
                    <button className="text-slate-400 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
                </div>
                
                <div className="hidden md:block h-6 w-px bg-white/10" />

                <div className="flex items-center gap-2 md:gap-3">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-black tracking-tight text-right">홍길동 선수</span>
                        <span className="text-[10px] font-bold text-slate-500 opacity-80 uppercase tracking-widest">Pro Team</span>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-lg md:rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                        <span className="text-slate-400 text-[10px] md:text-xs font-black">JD</span>
                    </div>
                </div>

                <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-black border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                    <LogOut className="w-4 h-4" /> 로그아웃
                </button>
            </div>
        </header>
    );
}
