const extractProYoutubeId = (url) => {
    if (!url) return '';
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) return url;
    const shortsMatch = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : (url.includes('v=') ? url.split('v=')[1].split('&')[0] : url);
};
console.log(extractProYoutubeId('https://youtube.com/shorts/jZ84-8RyWs8?si=KVLhTIqB6fthNkKG'));
