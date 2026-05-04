import { BDPointLog } from '@/types';

export interface HierarchyStats {
    level1: {
        total: number;
        myPoints: number;
        oppPoints: number;
        myPointRate: number;
    };
    level2: {
        winQuality: { winners: number; opponentErrors: number };
        lossQuality: { unforcedErrors: number; forcedErrors: number; opponentWinners: number };
    };
    level3: {
        topLossCauses: Array<{ cause: string; count: number }>;
    };
}

export function generateHierarchyStats(logs: BDPointLog[]): HierarchyStats {
    const total = logs.length;
    let myPoints = 0;
    
    // 득점 품질 (Win Quality)
    let winners = 0;
    let opponentErrors = 0; // Forced Error from Opponent (우리의 득점)
    
    // 실점 품질 (Loss Quality)
    let unforcedErrors = 0;
    let forcedErrors = 0;
    let opponentWinners = 0;

    // 실점 상세 원인 (Level 3)
    const lossCauses: Record<string, number> = {};

    logs.forEach(log => {
        const reason = log.reason || '';
        
        if (log.is_my_point) {
            myPoints++;
            if (reason.includes('Winner')) {
                winners++;
            } else {
                opponentErrors++;
            }
        } else {
            // 실점
            if (reason.includes('Unforced Error') || reason.includes('UFE')) {
                unforcedErrors++;
            } else if (reason.includes('Forced Error')) {
                forcedErrors++;
            } else {
                opponentWinners++;
            }

            // 실점 상세 원인 트래킹
            const cause = log.point_type as string;
            if (cause) {
                lossCauses[cause] = (lossCauses[cause] || 0) + 1;
            }
        }
    });

    const oppPoints = total - myPoints;

    // 가장 빈번한 실점 원인 Top 3 추출
    const topLossCauses = Object.entries(lossCauses)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cause, count]) => ({ cause, count }));

    return {
        level1: {
            total,
            myPoints,
            oppPoints,
            myPointRate: total ? (myPoints / total) * 100 : 0
        },
        level2: {
            winQuality: { winners, opponentErrors },
            lossQuality: { unforcedErrors, forcedErrors, opponentWinners }
        },
        level3: {
            topLossCauses
        }
    };
}
