export function generateAvatarURL(id) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`; 
}

export function generateRoomAvatarURL(name) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${name}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=gradientLinear`;
}

export function extractVideoID(url) {
  try {
    const videoIdMatch = url.match(
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|embed|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    );
    if (!videoIdMatch) throw new Error("Invalid YouTube URL");
    return videoIdMatch[1];
  } catch (error) {
    throw new Error(error.message || "Failed to extract YouTube video ID");
  }
}


export async function fetchVideoMetadata(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) throw new Error("Video not found");
    const data = await res.json();
    return {
      id: videoId,
      ...data,
    };
  } catch {
    return null;
  }
}

export const UserStatus = Object.freeze({
  ONLINE: "online",
  OFFLINE: "offline",
});