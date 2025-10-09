import { saveVideo } from "../db/queries/videos.js";
import { extractVideoID, fetchVideoMetadata } from "../utils/utils.js";

export default function videoHandlers(io, socket, usersList, roomsList, videosList) {
  // --- add video ---
  socket.on("add-video", async ({ url, roomId, uid }) => {
    try {
      if (!url || !uid) throw new Error("All the fields are required!");

      const room = roomsList.get(roomId);
      if (!room) throw new Error("Room not found!");

      const user = usersList.get(uid);
      if (!user) throw new Error("User not found!");
      
      const now = new Date().toISOString();
      const videoId = extractVideoID(url);
      var videoData = videosList.get(videoId);
      if(!videoData) {
        videoData = await fetchVideoMetadata(videoId);
        videoData[uid] = uid;
        videoData[created_at] = now;
        await saveVideo(videoData);
      }

      io.to(roomId).emit("video-added", { video: videoData, roomId });
    } catch (error) {
      const message = error.message ?? "Something went wrong while closing the room!";
      console.error(`Error adding video: ${message}`);
      socket.emit("error", { message });
    }
  });
}
