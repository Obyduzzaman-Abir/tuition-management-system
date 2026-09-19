require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function getStudentId(userId) {
  const [rows] = await pool.query('SELECT student_id FROM Student WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].student_id : null;
}
async function getTutorId(userId) {
  const [rows] = await pool.query('SELECT tutor_id FROM Tutor WHERE user_id = ?', [userId]);
  return rows.length ? rows[0].tutor_id : null;
}

// ============ PUBLIC ROUTES ============

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'ok', message: 'Server and database are both working!', dbTest: rows[0].result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, guardian_name, address, institute, class_level, bio, experience, hourly_rate } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await pool.query(
      'INSERT INTO Users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role]
    );
    const newUserId = userResult.insertId;

    if (role === 'Student') {
      await pool.query(
        'INSERT INTO Student (user_id, address, guardian_name, institute, class_level) VALUES (?, ?, ?, ?, ?)',
        [newUserId, address || null, guardian_name || null, institute || null, class_level || null]
      );
    } else if (role === 'Tutor') {
      await pool.query(
        'INSERT INTO Tutor (user_id, bio, experience, hourly_rate) VALUES (?, ?, ?, ?)',
        [newUserId, bio || null, experience || 0, hourly_rate || null]
      );
    }

    const token = jwt.sign({ user_id: newUserId, name, role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.status(201).json({ message: 'Account created!', token, user_id: newUserId, name, role });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

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

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.status(200).json({ message: 'Login successful!', token, user_id: user.user_id, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ============ PROTECTED: everything below requires a valid token ============
app.use('/api', authenticateToken);

app.get('/api/subjects', async (req, res) => {
  try {
    const [subjects] = await pool.query('SELECT * FROM Subject');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
  }
});

// ---- Posts ----

app.get('/api/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(`
      SELECT tp.post_id, tp.title, tp.description, tp.budget, tp.status, tp.days_per_week, tp.preferred_time, u.name AS student_name
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

app.get('/api/posts/mine', requireRole('Student'), async (req, res) => {
  try {
    const studentId = await getStudentId(req.user.user_id);
    const [posts] = await pool.query('SELECT * FROM Tuition_Post WHERE student_id = ? ORDER BY created_at DESC', [studentId]);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your posts', error: error.message });
  }
});

app.post('/api/posts', requireRole('Student'), async (req, res) => {
  try {
    const { title, description, budget, days_per_week, preferred_time } = req.body;
    const studentId = await getStudentId(req.user.user_id);
    const [result] = await pool.query(
      'INSERT INTO Tuition_Post (student_id, title, description, budget, days_per_week, preferred_time) VALUES (?, ?, ?, ?, ?, ?)',
      [studentId, title, description || null, budget, days_per_week || null, preferred_time || null]
    );
    res.status(201).json({ message: 'Tuition post created!', post_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
});

// ---- Applications (auto-filtered by role) ----

app.get('/api/applications', async (req, res) => {
  try {
    let query = `
      SELECT ta.application_id, ta.post_id, ta.tutor_id, tp.title AS post_title, u.name AS tutor_name,
             ta.message, ta.proposed_rate, ta.status
      FROM Tutor_Application ta
      JOIN Tuition_Post tp ON ta.post_id = tp.post_id
      JOIN Tutor t ON ta.tutor_id = t.tutor_id
      JOIN Users u ON t.user_id = u.user_id
    `;
    const params = [];
    if (req.user.role === 'Student') {
      query += ' JOIN Student s ON tp.student_id = s.student_id WHERE s.user_id = ?';
      params.push(req.user.user_id);
    } else if (req.user.role === 'Tutor') {
      query += ' WHERE ta.tutor_id = (SELECT tutor_id FROM Tutor WHERE user_id = ?)';
      params.push(req.user.user_id);
    }
    const [applications] = await pool.query(query, params);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

app.post('/api/applications', requireRole('Tutor'), async (req, res) => {
  try {
    const { post_id, message, proposed_rate } = req.body;
    const tutorId = await getTutorId(req.user.user_id);
    const [result] = await pool.query(
      'INSERT INTO Tutor_Application (post_id, tutor_id, message, proposed_rate) VALUES (?, ?, ?, ?)',
      [post_id, tutorId, message || null, proposed_rate]
    );
    res.status(201).json({ message: 'Application submitted!', application_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit application', error: error.message });
  }
});

// ---- Select tutor ----

app.post('/api/select', requireRole('Student', 'Admin'), async (req, res) => {
  try {
    const { post_id, tutor_id } = req.body;
    if (req.user.role === 'Student') {
      const [ownershipCheck] = await pool.query(
        `SELECT tp.post_id FROM Tuition_Post tp JOIN Student s ON tp.student_id = s.student_id
         WHERE tp.post_id = ? AND s.user_id = ?`,
        [post_id, req.user.user_id]
      );
      if (ownershipCheck.length === 0) {
        return res.status(403).json({ message: 'You can only select a tutor for your own post.' });
      }
    }
    await pool.query('CALL SelectTutorForPost(?, ?)', [post_id, tutor_id]);

    const [postInfo] = await pool.query(
      'SELECT student_id FROM Tuition_Post WHERE post_id = ?',
      [post_id]
    );
    const studentId = postInfo[0].student_id;

    const [existingConversation] = await pool.query(
      'SELECT conversation_id FROM Conversation WHERE student_id = ? AND tutor_id = ?',
      [studentId, tutor_id]
    );
    if (existingConversation.length === 0) {
      await pool.query(
        'INSERT INTO Conversation (student_id, tutor_id) VALUES (?, ?)',
        [studentId, tutor_id]
      );
    }

    res.status(200).json({ message: 'Tutor selected successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to select tutor', error: error.message });
  }
});

// ---- Selections (for populating dropdowns — no raw IDs typed) ----

app.get('/api/selections/mine', async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'Student') {
      query = `
        SELECT sel.selection_id, tp.title AS post_title, u.name AS tutor_name, sel.tutor_id
        FROM Selection sel
        JOIN Tuition_Post tp ON sel.post_id = tp.post_id
        JOIN Student s ON tp.student_id = s.student_id
        JOIN Tutor t ON sel.tutor_id = t.tutor_id
        JOIN Users u ON t.user_id = u.user_id
        WHERE s.user_id = ?
      `;
      params = [req.user.user_id];
    } else if (req.user.role === 'Tutor') {
      query = `
        SELECT sel.selection_id, tp.title AS post_title, u.name AS student_name, s.student_id
        FROM Selection sel
        JOIN Tuition_Post tp ON sel.post_id = tp.post_id
        JOIN Student s ON tp.student_id = s.student_id
        JOIN Users u ON s.user_id = u.user_id
        WHERE sel.tutor_id = (SELECT tutor_id FROM Tutor WHERE user_id = ?)
      `;
      params = [req.user.user_id];
    } else {
      return res.json([]);
    }
    const [selections] = await pool.query(query, params);
    res.json(selections);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch selections', error: error.message });
  }
});

// ---- Schedule ----

app.post('/api/schedule', async (req, res) => {
  try {
    const { selection_id, start_datetime, end_datetime, location, notes } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Schedule (selection_id, start_datetime, end_datetime, location, notes) VALUES (?, ?, ?, ?, ?)',
      [selection_id, start_datetime, end_datetime, location || null, notes || null]
    );
    res.status(201).json({ message: 'Class scheduled!', schedule_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create schedule', error: error.message });
  }
});

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
    res.status(500).json({ message: 'Failed to fetch schedule', error: error.message });
  }
});

// ---- Payments ----

app.post('/api/payments', async (req, res) => {
  try {
    const { schedule_id, amount, method, transaction_ref, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Payment (schedule_id, amount, method, transaction_ref, status) VALUES (?, ?, ?, ?, ?)',
      [schedule_id, amount, method || null, transaction_ref || null, status || 'Pending']
    );
    res.status(201).json({ message: 'Payment recorded!', payment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

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

// ---- Feedback (tutor_id resolved server-side from schedule_id — frontend never needs it) ----

app.post('/api/feedback', requireRole('Student'), async (req, res) => {
  try {
    const { tutor_id, rating, comment } = req.body;
    const studentId = await getStudentId(req.user.user_id);
    const [result] = await pool.query(
      'INSERT INTO Feedback (student_id, tutor_id, rating, comment) VALUES (?, ?, ?, ?)',
      [studentId, tutor_id, rating, comment || null]
    );
    res.status(201).json({ message: 'Feedback submitted!', feedback_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit feedback', error: error.message });
  }
});


app.get('/api/feedback', async (req, res) => {
  try {
    if (req.user.role === 'Admin') {
      const [feedback] = await pool.query(`
        SELECT f.feedback_id, s_user.name AS student_name, t_user.name AS tutor_name, f.rating, f.comment, f.created_at
        FROM Feedback f
        JOIN Student s ON f.student_id = s.student_id
        JOIN Users s_user ON s.user_id = s_user.user_id
        JOIN Tutor t ON f.tutor_id = t.tutor_id
        JOIN Users t_user ON t.user_id = t_user.user_id
        ORDER BY f.created_at DESC
      `);
      return res.json(feedback);
    }

    if (req.user.role === 'Tutor') {
      const tutorId = await getTutorId(req.user.user_id);
      const [feedback] = await pool.query(`
        SELECT f.feedback_id, 'Anonymous' AS student_name, f.rating, f.comment, f.created_at
        FROM Feedback f
        WHERE f.tutor_id = ?
        ORDER BY f.created_at DESC
      `, [tutorId]);
      return res.json(feedback);
    }

    return res.status(403).json({ message: 'Feedback list is only available to Tutors and Admins.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch feedback', error: error.message });
  }
});

// ---- Messaging ----

app.post('/api/conversations', async (req, res) => {
  try {
    let studentId, tutorId;
    if (req.user.role === 'Student') {
      studentId = await getStudentId(req.user.user_id);
      tutorId = req.body.tutor_id;
    } else if (req.user.role === 'Tutor') {
      tutorId = await getTutorId(req.user.user_id);
      studentId = req.body.student_id;
    } else {
      return res.status(403).json({ message: 'Only students and tutors can start conversations.' });
    }

    const [existing] = await pool.query(
      'SELECT conversation_id FROM Conversation WHERE student_id = ? AND tutor_id = ?',
      [studentId, tutorId]
    );
    if (existing.length > 0) {
      return res.status(200).json({ message: 'Conversation already exists', conversation_id: existing[0].conversation_id });
    }
    const [result] = await pool.query('INSERT INTO Conversation (student_id, tutor_id) VALUES (?, ?)', [studentId, tutorId]);
    res.status(201).json({ message: 'Conversation started!', conversation_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start conversation', error: error.message });
  }
});

app.get('/api/conversations', async (req, res) => {
  try {
    let where = '';
    const params = [];
    if (req.user.role === 'Student') {
      where = 'WHERE s_user.user_id = ?';
      params.push(req.user.user_id);
    } else if (req.user.role === 'Tutor') {
      where = 'WHERE t_user.user_id = ?';
      params.push(req.user.user_id);
    }
    const [conversations] = await pool.query(`
      SELECT c.conversation_id, s_user.name AS student_name, t_user.name AS tutor_name, c.last_message_at
      FROM Conversation c
      JOIN Student s ON c.student_id = s.student_id
      JOIN Users s_user ON s.user_id = s_user.user_id
      JOIN Tutor t ON c.tutor_id = t.tutor_id
      JOIN Users t_user ON t.user_id = t_user.user_id
      ${where}
      ORDER BY c.last_message_at DESC
    `, params);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { conversation_id, message } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Message (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [conversation_id, req.user.user_id, message]
    );
    res.status(201).json({ message: 'Message sent!', message_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

app.get('/api/messages/:conversation_id', async (req, res) => {
  try {
    const [messages] = await pool.query(`
      SELECT m.message_id, u.name AS sender_name, m.sender_id, m.message, m.sent_at
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

app.post('/api/attachments', async (req, res) => {
  try {
    const { message_id, file_url, file_type } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Attachment (message_id, file_url, file_type) VALUES (?, ?, ?)',
      [message_id, file_url, file_type || null]
    );
    res.status(201).json({ message: 'Attachment added!', attachment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add attachment', error: error.message });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const [notifications] = await pool.query(
      'SELECT notification_id, message, is_read, created_at FROM Notification WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.user_id]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE Notification SET is_read = TRUE WHERE notification_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    res.status(200).json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
});

// ---- Admin ----

app.post('/api/admin/verify-tutor', requireRole('Admin'), async (req, res) => {
  try {
    const { tutor_id } = req.body;
    await pool.query('UPDATE Tutor SET is_verified = TRUE WHERE tutor_id = ?', [tutor_id]);
    await pool.query(
      'INSERT INTO System_Log (admin_user_id, action_type, target_type, target_id, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, 'verify_tutor', 'tutor', tutor_id, 'Tutor verified by admin']
    );
    res.status(200).json({ message: 'Tutor verified successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to verify tutor', error: error.message });
  }
});

app.post('/api/admin/update-user-status', requireRole('Admin'), async (req, res) => {
  try {
    const { user_id, status, reason } = req.body;
    await pool.query('UPDATE Users SET status = ? WHERE user_id = ?', [status, user_id]);
    await pool.query(
      'INSERT INTO System_Log (admin_user_id, action_type, target_type, target_id, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.user_id, `set_status_${status}`, 'user', user_id, reason || null]
    );
    res.status(200).json({ message: `User status updated to ${status}!` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user status', error: error.message });
  }
});

app.get('/api/admin/log', requireRole('Admin'), async (req, res) => {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});