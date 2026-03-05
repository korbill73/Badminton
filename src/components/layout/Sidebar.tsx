'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Trophy,
    Users,
    Video,
    Settings,
    LogOut,
    ChevronRight,
    Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
    { name: '대회 기록', href: '/tournaments', icon: Trophy },
    { name: '선수 관리', href: '/players', icon: Users },
    { name: '분석 & 영상', href: '/analysis', icon: Video },
    { name: '트레이닝 지표', href: '/performance', icon: Activity },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-screen w-64 bg-[#0f172a] text-slate-400 border-r border-slate-800">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    B
                </div>
                <span className="text-white font-bold text-xl tracking-tight">EliteBadminton</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors group",
                                isActive
                                    ? "bg-blue-600/10 text-blue-500"
                                    : "hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-blue-500" : "group-hover:text-white")} />
                            <span>{item.name}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white">
                        JD
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">홍길동 선수</p>
                        <p className="text-xs text-slate-500 truncate">Pro Team</p>
                    </div>
                    <Settings className="w-4 h-4 hover:text-white" />
                </div>
                <button className="w-full flex items-center gap-3 px-3 py-3 mt-2 text-sm font-medium rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span>로그아웃</span>
                </button>
            </div>
        </div>
    );
}
