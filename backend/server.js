// server.js
// Main entry point for the backend server.

require('dotenv').config(); // load values from .env
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const mysql = require('mysql2/promise'); // the "promise" version lets us use async/await

const app = express();
app.use(cors());
app.use(express.json()); // lets the server read JSON sent from the frontend later

// A connection pool is more efficient than opening a new connection for every request
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Health check: confirms the server is running AND can reach the database
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'ok', message: 'Server and database are both working!', dbTest: rows[0].result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});
// GET all subjects — a simple, single-table endpoint to start with
app.get('/api/subjects', async (req, res) => {
  try {
    const [subjects] = await pool.query('SELECT * FROM Subject');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
  }
});

// GET all open tuition posts, with the student's name attached via JOIN
app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT tp.post_id, tp.title, tp.budget, tp.status, u.name AS student_name
      FROM Tuition_Post tp
      JOIN Student s ON tp.student_id = s.student_id
      JOIN Users u ON s.user_id = u.user_id
      WHERE tp.status = 'Open'
    `);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// POST a new tuition post — creates a row instead of reading one
app.post('/api/posts', async (req, res) => {
  try {
    const { student_id, title, description, budget } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Tuition_Post (student_id, title, description, budget) VALUES (?, ?, ?, ?)',
      [student_id, title, description, budget]
    );
    res.status(201).json({ message: 'Tuition post created!', post_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
});

// POST a tutor's application to a specific tuition post
app.post('/api/applications', async (req, res) => {
  try {
    const { post_id, tutor_id, message, proposed_rate } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Tutor_Application (post_id, tutor_id, message, proposed_rate) VALUES (?, ?, ?, ?)',
      [post_id, tutor_id, message, proposed_rate]
    );
    res.status(201).json({ message: 'Application submitted!', application_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit application', error: error.message });
  }
});

// POST: select a tutor for a post — calls the stored procedure we built earlier
app.post('/api/select', async (req, res) => {
  try {
    const { post_id, tutor_id } = req.body;
    await pool.query('CALL SelectTutorForPost(?, ?)', [post_id, tutor_id]);
    res.status(200).json({ message: 'Tutor selected successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to select tutor', error: error.message });
  }
});

// GET all tutor applications, with post title and tutor name attached
app.get('/api/applications', async (req, res) => {
  try {
    const [applications] = await pool.query(`
      SELECT ta.application_id, tp.title AS post_title, u.name AS tutor_name,
             ta.message, ta.proposed_rate, ta.status
      FROM Tutor_Application ta
      JOIN Tuition_Post tp ON ta.post_id = tp.post_id
      JOIN Tutor t ON ta.tutor_id = t.tutor_id
      JOIN Users u ON t.user_id = u.user_id
    `);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

// POST a new class schedule for a confirmed selection
app.post('/api/schedule', async (req, res) => {
  try {
    const { selection_id, start_datetime, end_datetime, location, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Schedule (selection_id, start_datetime, end_datetime, location, notes) VALUES (?, ?, ?, ?, ?)',
      [selection_id, start_datetime, end_datetime, location, notes]
    );
    res.status(201).json({ message: 'Class scheduled!', schedule_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create schedule', error: error.message });
  }
});

// GET all schedules, showing which student and tutor each one belongs to
app.get('/api/schedule', async (req, res) => {
  try {
    const [schedules] = await pool.query(`
      SELECT sc.schedule_id, s_user.name AS student_name, t_user.name AS tutor_name,
             sc.start_datetime, sc.end_datetime, sc.location
      FROM Schedule sc
      JOIN Selection sel ON sc.selection_id = sel.selection_id
      JOIN Tuition_Post tp ON sel.post_id = tp.post_id
      JOIN Student s ON tp.student_id = s.student_id
      JOIN Users s_user ON s.user_id = s_user.user_id
      JOIN Tutor t ON sel.tutor_id = t.tutor_id
      JOIN Users t_user ON t.user_id = t_user.user_id
    `);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch schedules', error: error.message });
  }
});

// POST a payment record for a class
app.post('/api/payments', async (req, res) => {
  try {
    const { schedule_id, amount, method, transaction_ref, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Payment (schedule_id, amount, method, transaction_ref, status) VALUES (?, ?, ?, ?, ?)',
      [schedule_id, amount, method, transaction_ref, status || 'Pending']
    );
    res.status(201).json({ message: 'Payment recorded!', payment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

// GET all payments, with student and tutor names attached
app.get('/api/payments', async (req, res) => {
  try {
    const [payments] = await pool.query(`
      SELECT p.payment_id, s_user.name AS student_name, t_user.name AS tutor_name,
             p.amount, p.method, p.status, p.paid_at
      FROM Payment p
      JOIN Schedule sc ON p.schedule_id = sc.schedule_id
      JOIN Selection sel ON sc.selection_id = sel.selection_id
      JOIN Tuition_Post tp ON sel.post_id = tp.post_id
      JOIN Student s ON tp.student_id = s.student_id
      JOIN Users s_user ON s.user_id = s_user.user_id
      JOIN Tutor t ON sel.tutor_id = t.tutor_id
      JOIN Users t_user ON t.user_id = t_user.user_id
    `);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
  }
});

// POST feedback/rating after a class
app.post('/api/feedback', async (req, res) => {
  try {
    const { schedule_id, student_id, tutor_id, rating, comment } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Feedback (schedule_id, student_id, tutor_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [schedule_id, student_id, tutor_id, rating, comment]
    );
    res.status(201).json({ message: 'Feedback submitted!', feedback_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback', error: error.message });
  }
});

// GET all feedback, with student and tutor names attached
app.get('/api/feedback', async (req, res) => {
  try {
    const [feedback] = await pool.query(`
      SELECT f.feedback_id, s_user.name AS student_name, t_user.name AS tutor_name,
             f.rating, f.comment
      FROM Feedback f
      JOIN Student s ON f.student_id = s.student_id
      JOIN Users s_user ON s.user_id = s_user.user_id
      JOIN Tutor t ON f.tutor_id = t.tutor_id
      JOIN Users t_user ON t.user_id = t_user.user_id
    `);
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch feedback', error: error.message });
  }
});

// POST: admin verifies a tutor
app.post('/api/admin/verify-tutor', async (req, res) => {
  try {
    const { admin_id, tutor_id } = req.body;
    await pool.query('UPDATE Tutor SET is_verified = TRUE WHERE tutor_id = ?', [tutor_id]);
    await pool.query(
      'INSERT INTO System_Log (admin_user_id, action_type, target_type, target_id, notes) VALUES (?, ?, ?, ?, ?)',
      [admin_id, 'verify_tutor', 'tutor', tutor_id, 'Tutor verified by admin']
    );
    res.status(200).json({ message: 'Tutor verified successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify tutor', error: error.message });
  }
});

// POST: admin suspends or reactivates a user account
app.post('/api/admin/update-user-status', async (req, res) => {
  try {
    const { admin_id, user_id, status, reason } = req.body; // status: 'active' or 'suspended'
    await pool.query('UPDATE Users SET status = ? WHERE user_id = ?', [status, user_id]);
    await pool.query(
      'INSERT INTO System_Log (admin_user_id, action_type, target_type, target_id, notes) VALUES (?, ?, ?, ?, ?)',
      [admin_id, `set_status_${status}`, 'user', user_id, reason || null]
    );
    res.status(200).json({ message: `User status updated to ${status}!` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
});

// GET: the full system log, with the admin's name attached
app.get('/api/admin/log', async (req, res) => {
  try {
    const [log] = await pool.query(`
      SELECT l.log_id, u.name AS admin_name, l.action_type, l.target_type, l.target_id, l.notes, l.action_at
      FROM System_Log l
      JOIN Users u ON l.admin_user_id = u.user_id
      ORDER BY l.action_at DESC
    `);
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch system log', error: error.message });
  }
});

// POST: register a new account (Student or Tutor)
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, guardian_name, address, bio, qualification } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await pool.query(
      'INSERT INTO Users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role]
    );
    const newUserId = userResult.insertId;

    if (role === 'Student') {
      await pool.query(
        'INSERT INTO Student (user_id, address, guardian_name) VALUES (?, ?, ?)',
        [newUserId, address || null, guardian_name || null]
      );
    } else if (role === 'Tutor') {
      await pool.query(
        'INSERT INTO Tutor (user_id, bio, qualification) VALUES (?, ?, ?)',
        [newUserId, bio || null, qualification || null]
      );
    }

    res.status(201).json({ message: 'Account created!', user_id: newUserId });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// POST: log in with email + password
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM Users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      message: 'Login successful!',
      user_id: user.user_id,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// POST: start a conversation between a student and tutor (reuses one if it already exists)
app.post('/api/conversations', async (req, res) => {
  try {
    const { student_id, tutor_id } = req.body;
    const [existing] = await pool.query(
      'SELECT conversation_id FROM Conversation WHERE student_id = ? AND tutor_id = ?',
      [student_id, tutor_id]
    );
    if (existing.length > 0) {
      return res.status(200).json({ message: 'Conversation already exists', conversation_id: existing[0].conversation_id });
    }
    const [result] = await pool.query(
      'INSERT INTO Conversation (student_id, tutor_id) VALUES (?, ?)',
      [student_id, tutor_id]
    );
    res.status(201).json({ message: 'Conversation started!', conversation_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start conversation', error: error.message });
  }
});

// GET all conversations, with student and tutor names attached
app.get('/api/conversations', async (req, res) => {
  try {
    const [conversations] = await pool.query(`
      SELECT c.conversation_id, s_user.name AS student_name, t_user.name AS tutor_name, c.last_message_at
      FROM Conversation c
      JOIN Student s ON c.student_id = s.student_id
      JOIN Users s_user ON s.user_id = s_user.user_id
      JOIN Tutor t ON c.tutor_id = t.tutor_id
      JOIN Users t_user ON t.user_id = t_user.user_id
      ORDER BY c.last_message_at DESC
    `);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
  }
});

// POST a new message (the trg_update_last_message trigger updates Conversation automatically)
app.post('/api/messages', async (req, res) => {
  try {
    const { conversation_id, sender_id, message } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Message (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [conversation_id, sender_id, message]
    );
    res.status(201).json({ message: 'Message sent!', message_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

// GET all messages in one conversation, formatted with sender name
app.get('/api/messages/:conversation_id', async (req, res) => {
  try {
    const [messages] = await pool.query(`
      SELECT m.message_id, u.name AS sender_name, m.message, m.sent_at
      FROM Message m
      JOIN Users u ON m.sender_id = u.user_id
      WHERE m.conversation_id = ?
      ORDER BY m.sent_at
    `, [req.params.conversation_id]);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

// POST an attachment to an existing message
app.post('/api/attachments', async (req, res) => {
  try {
    const { message_id, file_url, file_type } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Attachment (message_id, file_url, file_type) VALUES (?, ?, ?)',
      [message_id, file_url, file_type]
    );
    res.status(201).json({ message: 'Attachment added!', attachment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add attachment', error: error.message });
  }
});

// POST a new notification for a user
app.post('/api/notifications', async (req, res) => {
  try {
    const { user_id, message } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Notification (user_id, message) VALUES (?, ?)',
      [user_id, message]
    );
    res.status(201).json({ message: 'Notification created!', notification_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notification', error: error.message });
  }
});

// GET all notifications for a specific user
app.get('/api/notifications/:user_id', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT notification_id, message, is_read, created_at FROM Notification WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

