import { pool } from "../postgres.js";

async function saveQuiz(quiz) {
  try {
    const query = `
      INSERT INTO quizzes (quiz_id, name)
      VALUES ($1, $2)
      ON CONFLICT (quiz_id) DO NOTHING;
    `;
    await pool.query(query, [quiz.quizId, quiz.name]);
  } catch (error) {
    console.error("ERROR WHILE SAVING QUIZ ", error); 
  }
}

async function saveQuizUser(quizId, userId, score = 0) {
  try {
    const query = `
      INSERT INTO quiz_users (quiz_id, user_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (quiz_id, user_id) DO UPDATE SET score = $3;
    `;
    await pool.query(query, [quizId, userId, score]);
  } catch (error) {
    console.error("ERROR WHILE SAVING SCORE TO QUIZ ", error);  
  }
}

async function saveQuizAnswer(quizId, userId, questionId, answer, correct) {
  try {
    const query = `
      INSERT INTO quiz_answers (quiz_id, user_id, question_id, answer, correct)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await pool.query(query, [quizId, userId, questionId, answer, correct]);
  } catch (error) {
    console.error("ERROR WHILE SAVING ANSWER FOR QUIZ ", error);   
  }
}

export { saveQuiz, saveQuizUser, saveQuizAnswer };