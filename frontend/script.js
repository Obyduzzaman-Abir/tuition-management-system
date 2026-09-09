const API_URL = 'http://localhost:5000/api';

function toMySQLDatetime(value) {
  return value.replace('T', ' ') + ':00';
}

// ---- Open Tuition Posts ----
async function loadPosts() {
  const postsList = document.getElementById('postsList');
  try {
    const response = await fetch(`${API_URL}/posts`);
    const posts = await response.json();
    postsList.innerHTML = posts.length === 0
      ? '<p>No open posts right now.</p>'
      : posts.map(post => `
        <div class="post-card">
          <h3>${post.title}</h3>
          <p>Post ID: ${post.post_id}</p>
          <p>Posted by: ${post.student_name}</p>
          <p>Budget: ৳${post.budget}</p>
        </div>
      `).join('');
  } catch (error) {
    postsList.innerHTML = '<p>Could not load posts. Is the server running?</p>';
  }
}

// ---- Applications ----
async function loadApplications() {
  const list = document.getElementById('applicationsList');
  try {
    const response = await fetch(`${API_URL}/applications`);
    const applications = await response.json();
    list.innerHTML = applications.length === 0
      ? '<p>No applications yet.</p>'
      : applications.map(app => `
        <div class="post-card">
          <h3>${app.post_title}</h3>
          <p>Tutor: ${app.tutor_name}</p>
          <p>Proposed Rate: ৳${app.proposed_rate}</p>
          <p>Status: ${app.status}</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load applications.</p>';
  }
}

// ---- Schedule ----
async function loadSchedule() {
  const list = document.getElementById('scheduleList');
  try {
    const response = await fetch(`${API_URL}/schedule`);
    const schedule = await response.json();
    list.innerHTML = schedule.length === 0
      ? '<p>No classes scheduled yet.</p>'
      : schedule.map(item => `
        <div class="post-card">
          <h3>${item.student_name} &amp; ${item.tutor_name}</h3>
          <p>${new Date(item.start_datetime).toLocaleString()} - ${new Date(item.end_datetime).toLocaleTimeString()}</p>
          <p>Location: ${item.location}</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load schedule.</p>';
  }
}

// ---- Payments ----
async function loadPayments() {
  const list = document.getElementById('paymentsList');
  try {
    const response = await fetch(`${API_URL}/payments`);
    const payments = await response.json();
    list.innerHTML = payments.length === 0
      ? '<p>No payments recorded yet.</p>'
      : payments.map(p => `
        <div class="post-card">
          <h3>${p.student_name} &rarr; ${p.tutor_name}</h3>
          <p>Amount: ৳${p.amount} (${p.method})</p>
          <p>Status: ${p.status}</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load payments.</p>';
  }
}

// ---- Feedback ----
async function loadFeedback() {
  const list = document.getElementById('feedbackList');
  try {
    const response = await fetch(`${API_URL}/feedback`);
    const feedback = await response.json();
    list.innerHTML = feedback.length === 0
      ? '<p>No feedback submitted yet.</p>'
      : feedback.map(f => `
        <div class="post-card">
          <h3>${f.student_name} on ${f.tutor_name}</h3>
          <p>Rating: ${f.rating} / 5</p>
          <p>"${f.comment}"</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load feedback.</p>';
  }
}

// ---- System Log (Admin) ----
async function loadSystemLog() {
  const list = document.getElementById('systemLogList');
  try {
    const response = await fetch(`${API_URL}/admin/log`);
    const log = await response.json();
    list.innerHTML = log.length === 0
      ? '<p>No admin actions logged yet.</p>'
      : log.map(entry => `
        <div class="post-card">
          <h3>${entry.action_type}</h3>
          <p>By: ${entry.admin_name} | Target: ${entry.target_type} #${entry.target_id}</p>
          <p>${entry.notes || ''}</p>
          <p>${new Date(entry.action_at).toLocaleString()}</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load system log.</p>';
  }
}

// ---- Messages for one conversation ----
async function loadMessages(conversationId) {
  const list = document.getElementById('messagesList');
  try {
    const response = await fetch(`${API_URL}/messages/${conversationId}`);
    const messages = await response.json();
    list.innerHTML = messages.length === 0
      ? '<p>No messages in this conversation yet.</p>'
      : messages.map(m => `<p><strong>${m.sender_name}:</strong> ${m.message}</p>`).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load messages.</p>';
  }
}

// ---- Login ----
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const credentials = {
    email: document.getElementById('login_email').value,
    password: document.getElementById('login_password').value,
  };
  const statusMessage = document.getElementById('loginStatusMessage');
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const result = await response.json();
    if (response.ok) {
      statusMessage.textContent = `Welcome, ${result.name}! (Role: ${result.role}, User ID: ${result.user_id})`;
      statusMessage.style.color = 'green';
    } else {
      statusMessage.textContent = result.message;
      statusMessage.style.color = 'red';
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Post a New Tuition Requirement ----
document.getElementById('postForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newPost = {
    student_id: document.getElementById('student_id').value,
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    budget: document.getElementById('budget').value,
  };
  const statusMessage = document.getElementById('statusMessage');
  try {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPost),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('postForm').reset();
      loadPosts();
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Apply to a Tuition Post ----
document.getElementById('applyForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newApplication = {
    post_id: document.getElementById('post_id').value,
    tutor_id: document.getElementById('tutor_id').value,
    message: document.getElementById('message').value,
    proposed_rate: document.getElementById('proposed_rate').value,
  };
  const applyStatusMessage = document.getElementById('applyStatusMessage');
  try {
    const response = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newApplication),
    });
    const result = await response.json();
    applyStatusMessage.textContent = result.message;
    applyStatusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('applyForm').reset();
      loadApplications();
    }
  } catch (error) {
    applyStatusMessage.textContent = 'Could not reach the server.';
    applyStatusMessage.style.color = 'red';
  }
});

// ---- Schedule a Class ----
document.getElementById('scheduleForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newSchedule = {
    selection_id: document.getElementById('selection_id').value,
    start_datetime: toMySQLDatetime(document.getElementById('start_datetime').value),
    end_datetime: toMySQLDatetime(document.getElementById('end_datetime').value),
    location: document.getElementById('sched_location').value,
    notes: document.getElementById('sched_notes').value,
  };
  const statusMessage = document.getElementById('scheduleStatusMessage');
  try {
    const response = await fetch(`${API_URL}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSchedule),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('scheduleForm').reset();
      loadSchedule();
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Record a Payment ----
document.getElementById('paymentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newPayment = {
    schedule_id: document.getElementById('pay_schedule_id').value,
    amount: document.getElementById('pay_amount').value,
    method: document.getElementById('pay_method').value,
    status: document.getElementById('pay_status').value,
  };
  const statusMessage = document.getElementById('paymentStatusMessage');
  try {
    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPayment),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('paymentForm').reset();
      loadPayments();
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Load Notifications ----
document.getElementById('notifForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const userId = document.getElementById('notif_user_id').value;
  const list = document.getElementById('notificationsList');
  try {
    const response = await fetch(`${API_URL}/notifications/${userId}`);
    const notifications = await response.json();
    list.innerHTML = notifications.length === 0
      ? '<p>No notifications for this user.</p>'
      : notifications.map(n => `
        <div class="post-card">
          <p>${n.message}</p>
          <p>Read: ${n.is_read ? 'Yes' : 'No'} | ${new Date(n.created_at).toLocaleString()}</p>
        </div>
      `).join('');
  } catch (error) {
    list.innerHTML = '<p>Could not load notifications.</p>';
  }
});

// ---- Start / Open Conversation ----
document.getElementById('conversationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newConversation = {
    student_id: document.getElementById('conv_student_id').value,
    tutor_id: document.getElementById('conv_tutor_id').value,
  };
  const statusMessage = document.getElementById('conversationStatusMessage');
  try {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConversation),
    });
    const result = await response.json();
    statusMessage.textContent = `${result.message} (Conversation ID: ${result.conversation_id})`;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('msg_conversation_id').value = result.conversation_id;
      loadMessages(result.conversation_id);
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Send Message ----
document.getElementById('messageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const conversationId = document.getElementById('msg_conversation_id').value;
  const newMessage = {
    conversation_id: conversationId,
    sender_id: document.getElementById('msg_sender_id').value,
    message: document.getElementById('msg_text').value,
  };
  const statusMessage = document.getElementById('messageStatusMessage');
  try {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMessage),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) {
      document.getElementById('msg_text').value = '';
      loadMessages(conversationId);
    }
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Attach a File to a Message ----
document.getElementById('attachmentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const newAttachment = {
    message_id: document.getElementById('attach_message_id').value,
    file_url: document.getElementById('attach_file_url').value,
    file_type: document.getElementById('attach_file_type').value,
  };
  const statusMessage = document.getElementById('attachmentStatusMessage');
  try {
    const response = await fetch(`${API_URL}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAttachment),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) document.getElementById('attachmentForm').reset();
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Admin: Verify Tutor ----
document.getElementById('verifyTutorForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    admin_id: document.getElementById('verify_admin_id').value,
    tutor_id: document.getElementById('verify_tutor_id').value,
  };
  const statusMessage = document.getElementById('verifyStatusMessage');
  try {
    const response = await fetch(`${API_URL}/admin/verify-tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) loadSystemLog();
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// ---- Admin: Update User Status ----
document.getElementById('userStatusForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    admin_id: document.getElementById('status_admin_id').value,
    user_id: document.getElementById('status_user_id').value,
    status: document.getElementById('status_value').value,
    reason: document.getElementById('status_reason').value,
  };
  const statusMessage = document.getElementById('userStatusMessage');
  try {
    const response = await fetch(`${API_URL}/admin/update-user-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    statusMessage.textContent = result.message;
    statusMessage.style.color = response.ok ? 'green' : 'red';
    if (response.ok) loadSystemLog();
  } catch (error) {
    statusMessage.textContent = 'Could not reach the server.';
    statusMessage.style.color = 'red';
  }
});

// Load everything when the page first opens
loadPosts();
loadApplications();
loadSchedule();
loadPayments();
loadFeedback();
loadSystemLog();
// ---- Tab navigation ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});