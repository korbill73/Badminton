import { YoutubeTranscript } from 'youtube-transcript';

export async function onRequest(context: any) {
    const { request } = context;
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId');

    if (!videoId) {
        return new Response(JSON.stringify({ error: 'videoId is required' }), { 
            status: 400, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return new Response(JSON.stringify({ transcript }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}
