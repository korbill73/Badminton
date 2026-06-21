/**
 * AI Video Deep Scan Service (Mock for UI/Prototype - Phase 2)
 * Simulates scanning an entire video to detect multiple point events (OCR/Action Recognition).
 */

import { analyzeRally, AIAnalysisResult } from './videoAnalysis';

export interface ScanProgress {
    percentage: number;
    currentTimestamp: number;
    eventsFound: number;
}

export interface ScannedEvent extends AIAnalysisResult {
    timestamp: number;
    set_number: number;
}

export const scanFullVideo = async (
    videoId: string,
    duration: number,
    onProgress: (p: ScanProgress) => void
): Promise<ScannedEvent[]> => {
    console.log(`Starting Deep Scan for video ${videoId} (Duration: ${duration}s)...`);

    const events: ScannedEvent[] = [];
    const stepSize = 10;

    let currentSet = 1;
    let scoreMe = 0;
    let scoreOpp = 0;

    for (let time = 0; time <= duration; time += stepSize) {
        await new Promise(resolve => setTimeout(resolve, 200));

        onProgress({
            percentage: Math.min(100, Math.round((time / duration) * 100)),
            currentTimestamp: time,
            eventsFound: events.length
        });

        // Simulate event detection
        if (Math.random() > 0.88 && currentSet <= 3) {
            const analysis = await analyzeOneSegment();

            if (analysis.is_my_point) scoreMe++;
            else scoreOpp++;

            events.push({
                ...analysis,
                timestamp: time,
                set_number: currentSet
            });

            // Set/Deuce Logic
            const isSetEnd = (scoreMe >= 21 || scoreOpp >= 21) && Math.abs(scoreMe - scoreOpp) >= 2;
            const isMaxPoint = scoreMe === 30 || scoreOpp === 30;

            if (isSetEnd || isMaxPoint) {
                console.log(`Set ${currentSet} ended at ${time}s with score ${scoreMe}-${scoreOpp}`);
                currentSet++;
                scoreMe = 0;
                scoreOpp = 0;
            }
        }
    }

    if (events.length === 0) {
        events.push({ is_my_point: true, point_type: '스매시', confidence: 0.95, timestamp: 30, set_number: 1 });
    }

    onProgress({ percentage: 100, currentTimestamp: duration, eventsFound: events.length });
    return events.sort((a, b) => a.timestamp - b.timestamp);
};

const analyzeOneSegment = async (): Promise<AIAnalysisResult> => {
    const rand = Math.random();
    if (rand > 0.45) { // 55% My point
        const types = ['스매시', '드롭', '헤어핀', '푸시', '드라이브'];
        return { is_my_point: true, point_type: types[Math.floor(Math.random() * types.length)], confidence: 0.8 + Math.random() * 0.15 };
    } else { // 45% Opp point (Errors etc)
        const types = ['네트 범실', '클리어 아웃', '서브 범실', '스매시 아웃'];
        return { is_my_point: false, point_type: types[Math.floor(Math.random() * types.length)], confidence: 0.75 + Math.random() * 0.15 };
    }
};
