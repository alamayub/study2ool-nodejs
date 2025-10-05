import { pool } from "../postgres.js";

async function saveUser(user) {
  try {
    const query = `
      INSERT INTO users (uid, display_name, photo_url, status, created_at, timestamp, updated_at)
      VALUES ($1, $2, $3, $4, $5, $5, $5)
      ON CONFLICT (uid) DO UPDATE 
        SET display_name = EXCLUDED.display_name,
            photo_url = EXCLUDED.photo_url,
            status = EXCLUDED.status,
            timestamp = EXCLUDED.timestamp;
    `;
    const values = [
      user.uid,
      user.displayName,
      user.photoURL,
      user.status,
      user.timestamp,
    ];
    await pool.query(query, values);
  } catch (error) {
    console.error("ERROR WHILE SAVING USER ", error);
    throw new Error("Failed to save user to database.");
  }
}

async function updateUserStatus(uid, status, now) {
  try {
    const query = `
      UPDATE users 
      SET status = $1, timestamp = $2, updated_at = $2
      WHERE uid = $3;
    `;
    await pool.query(query, [status, now, uid]);
  } catch (error) {
    console.error("ERROR WHILE UPDATING USER ", error);
    throw new Error("Failed to update user detail to database.");
  }
}

async function getAllUsers() {
  try {
    const res = await pool.query("SELECT * FROM users");
    const rows = res.rows;
    const usersMap = new Map();
    rows.forEach(u => {
      usersMap.set(u.uid, {
        uid: u.uid,
        displayName: u.display_name,
        photoURL: u.photo_url,
        status: u.status,
        timestamp: u.timestamp,
        socketId: null, 
      });
    });
    return usersMap;
  } catch (error) {
    console.error("ERROR WHILE LISTING USER ", error);
    throw new Error("Failed to fetch users from database.");
  }
}

export { saveUser, updateUserStatus, getAllUsers };