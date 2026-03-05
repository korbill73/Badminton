'use client';

import React, { useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

interface YoutubePlayerProps {
    videoId: string;
    onPlayerReady: (player: any) => void;
}

export default function YoutubePlayer({ videoId, onPlayerReady }: YoutubePlayerProps) {
    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
        },
    };

    const onReady: YouTubeProps['onReady'] = (event) => {
        onPlayerReady(event.target);
    };

    return (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
            <YouTube
                videoId={videoId}
                opts={opts}
                onReady={onReady}
                className="w-full h-full"
                iframeClassName="w-full h-full"
            />
        </div>
    );
}
