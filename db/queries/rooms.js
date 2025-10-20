import { pool } from "../postgres.js";

async function getAllRooms() {
  try {
    const res = await pool.query("SELECT * FROM rooms");
    const rows = res.rows;
    const lists = new Map();
    rows.forEach(data => {
      lists.set(data.room_id, {
        id: data.room_id,
        photoURL: data.photo_url,
        name: data.name,
        description: data.description,
        host: data.host,
        createdDate: data.created_at,
        lastMessage: null,
        lastModified: data.updated_at,
      });
    });
    return lists;
  } catch (error) {
    console.error("ERROR WHILE LISTING USER ", error);
    throw new Error("Failed to fetch rooms from database.");
  }
}

async function saveRoom(room) {
  console.log(room);
  try {
    const query = `
      INSERT INTO rooms (room_id, photo_url, name, description, host, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      ON CONFLICT (room_id) DO NOTHING;
    `;
    await pool.query(query, [room.id, room.photoURL, room.name, room.description, room.host, room.createdDate]);
  } catch (error) {
    console.error("❌ ERROR WHILE SAVING ROOM:", error.message);
    throw new Error("Failed to save room to database.");
  }
}

async function addRoomUser(roomId, userId, now) {
  try {
    const query = `
      INSERT INTO room_users (room_id, user_id, joined, last_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    `;
    await pool.query(query, [roomId, userId, now, now]);
  } catch (error) {
    console.error("❌ ERROR WHILE ADDING USER TO ROOM:", error.message);
    throw new Error("Failed to add user to room.");
  }
}

async function removeRoomUser(roomId, userId) {
  try {
    const query = `
      DELETE FROM room_users
      WHERE room_id = $1 AND user_id = $2;
    `;

    const result = await pool.query(query, [roomId, userId]);

    if (result.rowCount === 0) {
      throw new Error("User not found in the room or already removed.");
    }

    return true;
  } catch (error) {
    console.error("❌ ERROR WHILE REMOVING USER FROM ROOM:", error.message);
    throw new Error("Failed to remove user from room.");
  }
}

async function saveRoomMessage(roomId, userId, content) {
  try {
    const query = `
      INSERT INTO messages (room_id, user_id, content)
      VALUES ($1, $2, $3);
    `;
    await pool.query(query, [roomId, userId, content]);
  } catch (error) {
    console.error("ERROR WHILE SAVING MESSAGE ", error);  
  }
}

export { 
  getAllRooms, 
  saveRoom, 
  addRoomUser, 
  removeRoomUser, 
  saveRoomMessage 
};