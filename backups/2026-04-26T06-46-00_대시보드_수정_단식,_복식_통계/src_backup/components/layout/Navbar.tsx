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
    Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Navbar() {
    const pathname = usePathname();

    const menuItems = [
        { name: '대시보드', icon: LayoutDashboard, href: '/' },
        { name: '경기 기록', icon: Trophy, href: '/tournaments' },
        { name: '선수 관리', icon: Users2, href: '/players' },
        { name: '트레이닝 지표', icon: BarChart3, href: '/performance' },
        { name: '데이터 백업', icon: Database, href: '/backup' }
    ];

    return (
        <header className="h-[64px] bg-[#0b1221] border-b border-white/5 flex items-center px-8 gap-10 shrink-0 z-[100] sticky top-0">
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                    <span className="text-white font-black text-xl italic italic">B</span>
                </div>
                <span className="text-white font-black text-lg tracking-tighter">EliteBadminton</span>
            </Link>

            {/* Main Menu */}
            <nav className="flex items-center gap-2 flex-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                                isActive 
                                    ? "bg-white/10 text-white" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-blue-500" : "text-slate-500")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-6 text-white font-bold">
                <div className="flex items-center gap-6 mr-2">
                    <button className="text-slate-400 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
                    <button className="text-slate-400 hover:text-white transition-colors"><Settings className="w-5 h-5" /></button>
                </div>
                
                <div className="h-6 w-px bg-white/10" />

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-black tracking-tight">홍길동 선수</span>
                        <span className="text-[10px] font-bold text-slate-500 opacity-80 uppercase tracking-widest">Pro Team</span>
                    </div>
                    <div className="w-10 h-10 bg-slate-800 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden shadow-lg">
                        <span className="text-slate-400 text-xs font-black">JD</span>
                    </div>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-black border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all">
                    <LogOut className="w-4 h-4" /> 로그아웃
                </button>
            </div>
        </header>
    );
}
