require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [users] = await pool.query('SELECT user_id, password_hash FROM Users');
  for (const user of users) {
    const hashed = await bcrypt.hash(user.password_hash, 10);
    await pool.query('UPDATE Users SET password_hash = ? WHERE user_id = ?', [hashed, user.user_id]);
    console.log(`Updated user_id ${user.user_id}`);
  }
  console.log('Done!');
  process.exit();
}

run();