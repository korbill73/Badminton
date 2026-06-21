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
    Settings,
    Database,
    BookOpen,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
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
        <aside className="w-[280px] bg-[#0b1221] text-white flex flex-col h-screen fixed left-0 top-0 z-50">
            {/* Logo Section */}
            <div className="p-8 pb-10">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
                        <span className="text-white font-black text-2xl italic italic">B</span>
                    </div>
                    <span className="text-white font-black text-xl tracking-tighter">EliteBadminton</span>
                </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 px-4 space-y-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 rounded-2xl text-[15px] font-black tracking-tight transition-all duration-300 group relative overflow-hidden",
                                isActive 
                                    ? "bg-blue-600/15 text-white shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                                    : "text-white hover:bg-white/5 hover:pl-8",
                                item.name === '데이터 백업' && "hidden md:flex"
                            )}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                            )}
                            
                            <item.icon className={cn(
                                "w-5 h-5 transition-all duration-300", 
                                isActive 
                                    ? "text-blue-500 scale-110" 
                                    : "text-white/40 group-hover:text-blue-400 group-hover:scale-110"
                            )} />
                            <span className={cn(
                                "transition-all duration-300",
                                !isActive && "opacity-80 group-hover:opacity-100 group-hover:translate-x-1"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* Profile & Footer Section */}
            <div className="p-6 mt-auto space-y-4 border-t border-white/5 bg-[#080d1a]">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                        <UserCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">홍길동 선수</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">Pro Team Player</p>
                    </div>
                    <button className="ml-auto text-slate-500 hover:text-white">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
                <button className="w-full flex items-center gap-3 px-6 py-4 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all text-xs font-black uppercase tracking-widest group">
                    <LogOut className="w-4 h-4 text-slate-600 group-hover:text-rose-500" />
                    로그아웃
                </button>
            </div>
        </aside>
    );
}
