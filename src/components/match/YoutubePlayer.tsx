'use client';

import React from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface YoutubePlayerProps {
    videoId: string;
    onPlayerReady: (player: any) => void;
    onStateChange?: (event: any) => void;
}

/**
 * YouTube URL 또는 ID에서 11자리 비디오 ID를 추출합니다.
 * /watch?v=, /live/, youtu.be/ 등 다양한 형식을 지원합니다.
 */
function extractVideoId(input: string): string {
    if (!input) return '';
    // 이미 11자리 ID인 경우 처리
    if (input.length === 11 && !input.includes('/') && !input.includes('?')) return input;

    // Shorts 처리
    const shortsMatch = input.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = input.match(regex);
    return match ? match[1] : input;
}

export default function YoutubePlayer({ videoId, onPlayerReady, onStateChange }: YoutubePlayerProps) {
    const cleanVideoId = extractVideoId(videoId);

    const opts = React.useMemo<YouTubeProps['opts']>(() => ({
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
        },
    }), []);

    const ytRef = React.useRef<any>(null);

    const onReady: YouTubeProps['onReady'] = React.useCallback((event: any) => {
        onPlayerReady(event.target);
    }, [onPlayerReady]);

    return (
        <div className="w-full h-full overflow-hidden bg-black shadow-lg">
            {cleanVideoId ? (
                <YouTube
                    ref={ytRef}
                    videoId={cleanVideoId}
                    opts={opts}
                    onReady={onReady}
                    onStateChange={onStateChange}
                    className="w-full h-full"
                    iframeClassName="w-full h-full"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                    동영상 ID가 유효하지 않습니다.
                </div>
            )}
        </div>
    );
}
