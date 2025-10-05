-- Users
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    display_name TEXT,
    photo_url TEXT,
    status TEXT,
    created_at TEXT,
    timestamp TEXT,
    updated_at TEXT
);

-- Rooms
CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    photo_url TEXT, 
    name TEXT,
    description TEXT,
    host TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Room participants
CREATE TABLE IF NOT EXISTS room_users (
    room_id TEXT REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id TEXT,
    joined TEXT,
    last_active TEXT,
    PRIMARY KEY(room_id, user_id)
);

-- -- Messages
-- CREATE TABLE IF NOT EXISTS messages (
--     id SERIAL PRIMARY KEY,
--     room_id TEXT REFERENCES rooms(room_id) ON DELETE CASCADE,
--     user_id TEXT,
--     content TEXT,
--     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Quizzes
-- CREATE TABLE IF NOT EXISTS quizzes (
--     quiz_id TEXT PRIMARY KEY,
--     name TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Quiz participants
-- CREATE TABLE IF NOT EXISTS quiz_users (
--     quiz_id TEXT REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
--     user_id TEXT,
--     score INT DEFAULT 0,
--     PRIMARY KEY(quiz_id, user_id)
-- );

-- -- Quiz answers
-- CREATE TABLE IF NOT EXISTS quiz_answers (
--     id SERIAL PRIMARY KEY,
--     quiz_id TEXT REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
--     user_id TEXT,
--     question_id TEXT,
--     answer TEXT,
--     correct BOOLEAN,
--     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- DROP TABLE IF EXISTS users;
-- DROP TABLE IF EXISTS rooms CASCADE;