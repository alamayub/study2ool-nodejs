import { pool } from "../postgres.js";

async function saveVideo(data) {
  try {
    const query = `
      INSERT INTO youtube (id, title, author_name, author_url, type, thumbnail_url, html, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `;
    const values = [
      data.id, 
      data.title, 
      data.author_name, 
      data.author_url, 
      data.type, 
      data.thumbnail_url, 
      data.html, 
      data.uid, 
      data.created_at
    ];
    await pool.query(query, values);
  } catch (error) {
    console.error("ERROR WHILE SAVING VIDEO ", error);
    throw new Error("Failed to save video to database.");
  }
}

async function getAllVideos() {
  try {
    const res = await pool.query("SELECT * FROM youtube");
    const rows = res.rows;
    const lists = new Map();
    rows.forEach(u => {
      lists.set(u.uid, {
        id: u.id,
        title: u.title,
        authorName: u.author_name,
        authorUrl: u.author_url,
        type: u.type,
        thumbnailUrl: u.thumbnail_url,
        html: u.html,
        createdBy: u.created_by,
      });
    });
    return lists;
  } catch (error) {
    console.error("ERROR WHILE LISTING USER ", error);
    throw new Error("Failed to fetch users from database.");
  }
}

export { saveVideo, getAllVideos };