/**
 * AI Video Analysis Service (Mock for UI/Prototype)
 * In a real-world scenario, this would send the timestamp/video clip to a CV model server.
 */

export interface AIAnalysisResult {
    is_my_point: boolean;
    point_type: string;
    confidence: number;
}

export const analyzeRally = async (videoId: string, timestamp: number): Promise<AIAnalysisResult> => {
    console.log(`Analyzing rally for video ${videoId} at ${timestamp}s...`);

    // Simulate network/processing delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Probabilistic mock-up based on common outcomes
    const rand = Math.random();

    if (rand > 0.6) {
        return {
            is_my_point: true,
            point_type: Math.random() > 0.5 ? '스매시' : '드롭',
            confidence: 0.85 + (Math.random() * 0.1)
        };
    } else if (rand > 0.2) {
        return {
            is_my_point: false,
            point_type: Math.random() > 0.5 ? '헤어핀 실수' : '라인 아웃',
            confidence: 0.78 + (Math.random() * 0.1)
        };
    } else {
        return {
            is_my_point: true,
            point_type: '상대 범실',
            confidence: 0.92
        };
    }
};
