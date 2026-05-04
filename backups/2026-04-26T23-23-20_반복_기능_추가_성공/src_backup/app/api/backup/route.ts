import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, data, ui_codes } = body;

        // 1. Create base backup directory
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const folderName = `${timestamp}_${name.replace(/\s+/g, '_')}`;
        const backupPath = path.join(process.cwd(), 'backups', folderName);

        if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
            fs.mkdirSync(path.join(process.cwd(), 'backups'));
        }
        fs.mkdirSync(backupPath, { recursive: true });

        // 2. Save Data JSON
        fs.writeFileSync(
            path.join(backupPath, 'data.json'),
            JSON.stringify(data, null, 2),
            'utf-8'
        );

        // 3. Full Source Snapshot (Recursive Copy of 'src' folder)
        const srcPath = path.join(process.cwd(), 'src');
        const destSrcPath = path.join(backupPath, 'src_backup');
        
        const copyRecursive = (src: string, dest: string) => {
            if (!fs.existsSync(src)) return;
            const stats = fs.statSync(src);
            if (stats.isDirectory()) {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                fs.readdirSync(src).forEach(child => {
                    copyRecursive(path.join(src, child), path.join(dest, child));
                });
            } else {
                fs.copyFileSync(src, dest);
            }
        };

        copyRecursive(srcPath, destSrcPath);

        return NextResponse.json({ 
            success: true, 
            path: backupPath,
            folderName 
        });
    } catch (error: any) {
        console.error('Backup API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { folderName } = await req.json();
        const backupPath = path.join(process.cwd(), 'backups', folderName);
        const backupSrcPath = path.join(backupPath, 'src_backup');

        if (!fs.existsSync(backupSrcPath)) {
            throw new Error('백업 폴더 내의 소스 백업본을 찾을 수 없습니다.');
        }

        // 1. Restore Full 'src' Directory
        const currentSrcPath = path.join(process.cwd(), 'src');
        
        const copyRecursive = (src: string, dest: string) => {
            const stats = fs.statSync(src);
            if (stats.isDirectory()) {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                fs.readdirSync(src).forEach(child => {
                    copyRecursive(path.join(src, child), path.join(dest, child));
                });
            } else {
                fs.writeFileSync(dest, fs.readFileSync(src));
            }
        };

        copyRecursive(backupSrcPath, currentSrcPath);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Restore API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
