let currentConversationId = null;
let notificationPollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    showMainApp();
  } else {
    showAuthScreen();
  }
  setupAuthListeners();
  setupTabListeners();
  setupFormListeners();
  setupNotificationBell();

  document.addEventListener('wheel', () => {
    if (document.activeElement && document.activeElement.type === 'number') {
      document.activeElement.blur();
    }
  }, { passive: true });
});

function showAuthScreen() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  const session = getSession();
  document.getElementById('welcomeText').textContent = `${session.name} — ${session.role}`;

  applyRoleVisibility(session.role);
  loadDashboard(session.role);
   if (session.role === 'Student') loadFeedbackTutorOptions();
  if (session.role === 'Tutor') loadMyFeedback();
  loadMessages(session.role);
  startNotificationPolling();
  if (session.role === 'Admin') {
    loadAdminPanel();
    loadAdminFeedback();
  }
}

function applyRoleVisibility(role) {
  document.getElementById('studentDashboard').classList.toggle('hidden', role !== 'Student');
  document.getElementById('tutorDashboard').classList.toggle('hidden', role !== 'Tutor');
    document.getElementById('feedbackTabBtn').classList.toggle('hidden', role === 'Admin');
  document.getElementById('myFeedbackWrapper').classList.toggle('hidden', role !== 'Tutor');
  document.getElementById('feedbackFormWrapper').classList.toggle('hidden', role !== 'Student');
  document.getElementById('adminTabBtn').classList.toggle('hidden', role !== 'Admin');
  document.getElementById('dashboardTabBtn').classList.toggle('hidden', role === 'Admin');

  document.getElementById('conversationPartnerLabel').textContent = role === 'Student' ? 'Tutor' : 'Student';

  if (role === 'Admin') {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('adminTabBtn').classList.add('active');
    document.getElementById('tab-admin').classList.add('active');
  }
}

function setupAuthListeners() {
  document.getElementById('showLoginBtn').addEventListener('click', () => {
    document.getElementById('showLoginBtn').classList.add('active');
    document.getElementById('showRegisterBtn').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  });

  document.getElementById('showRegisterBtn').addEventListener('click', () => {
    document.getElementById('showRegisterBtn').classList.add('active');
    document.getElementById('showLoginBtn').classList.remove('active');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
  });

  document.getElementById('reg_role').addEventListener('change', (e) => {
    const isTutorRole = e.target.value === 'Tutor';
    document.getElementById('studentFields').classList.toggle('hidden', isTutorRole);
    document.getElementById('tutorFields').classList.toggle('hidden', !isTutorRole);
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('loginMessage');
    try {
      await handleLogin(
        document.getElementById('login_email').value,
        document.getElementById('login_password').value
      );
      showMainApp();
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('registerMessage');
    const role = document.getElementById('reg_role').value;
    const payload = {
      name: document.getElementById('reg_name').value,
      email: document.getElementById('reg_email').value,
      phone: document.getElementById('reg_phone').value,
      password: document.getElementById('reg_password').value,
      role,
    };
    if (role === 'Student') {
      payload.guardian_name = document.getElementById('reg_guardian').value;
      payload.address = document.getElementById('reg_address').value;
      payload.institute = document.getElementById('reg_institute').value;
      payload.class_level = document.getElementById('reg_class').value;
    } else {
      payload.bio = document.getElementById('reg_bio').value;
      payload.experience = document.getElementById('reg_experience').value;
      payload.hourly_rate = document.getElementById('reg_rate').value;
    }
    try {
      await handleRegister(payload);
      showMainApp();
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

function setupTabListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ---------- Notification bell ----------
function setupNotificationBell() {
  const bellBtn = document.getElementById('notificationBellBtn');
  const dropdown = document.getElementById('notificationDropdown');

  bellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

async function loadNotificationBell() {
  try {
    const notifications = await api.getNotifications();
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    document.getElementById('notificationDropdownList').innerHTML = notifications.length
      ? notifications.slice(0, 8).map(renderNotification).join('')
      : '<p class="empty-state">No notifications.</p>';

    document.querySelectorAll('#notificationDropdownList .notification-item').forEach(item => {
      item.addEventListener('click', async () => {
        await api.markNotificationRead(item.dataset.notificationId);
        loadNotificationBell();
      });
    });
  } catch (error) {
    console.error('Notification bell load failed:', error);
  }
}

function startNotificationPolling() {
  if (notificationPollInterval) clearInterval(notificationPollInterval);
  loadNotificationBell();
  notificationPollInterval = setInterval(loadNotificationBell, 30000);
}

// ---------- Dashboard ----------
async function loadDashboard(role) {
  try {
    if (role === 'Student') {
      const [myPosts, applications] = await Promise.all([api.getMyPosts(), api.getApplications()]);
      document.getElementById('myPostsList').innerHTML = myPosts.length
        ? myPosts.map(p => renderPostCard(p)).join('')
        : '<p class="empty-state">You haven\'t posted a requirement yet.</p>';
      document.getElementById('myPostApplicationsList').innerHTML = applications.length
        ? applications.map(app => renderApplicationCard(app, true)).join('')
        : '<p class="empty-state">No applications yet.</p>';
      attachSelectButtons();
    } else if (role === 'Tutor') {
      const [openPosts, myApplications] = await Promise.all([api.getOpenPosts(), api.getApplications()]);
      document.getElementById('openPostsList').innerHTML = openPosts.length
        ? openPosts.map(post => renderPostCard(post, true)).join('')
        : '<p class="empty-state">No open posts right now.</p>';
      document.getElementById('myApplicationsList').innerHTML = myApplications.length
        ? myApplications.map(app => renderApplicationCard(app, false)).join('')
        : '<p class="empty-state">You haven\'t applied to anything yet.</p>';
      attachApplyButtons();
    }
  } catch (error) {
    console.error('Dashboard load failed:', error);
  }
}

function attachApplyButtons() {
  document.querySelectorAll('.apply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.postId;
      btn.outerHTML = `
        <form class="inline-apply-form card-form" data-post-id="${postId}">
          <textarea placeholder="Message to student" rows="2" required></textarea>
          <input type="number" placeholder="Proposed rate (৳)" required>
          <button type="submit" class="btn-primary">Submit</button>
        </form>`;
      attachInlineApplyListener(postId);
    });
  });
}

function attachInlineApplyListener(postId) {
  const form = document.querySelector(`.inline-apply-form[data-post-id="${postId}"]`);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const [messageInput, rateInput] = form.querySelectorAll('textarea, input');
    try {
      await api.applyToPost({ post_id: postId, message: messageInput.value, proposed_rate: rateInput.value });
      loadDashboard('Tutor');
    } catch (error) {
      alert(error.message);
    }
  });
}

function attachSelectButtons() {
  document.querySelectorAll('.select-tutor-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.selectTutor(btn.dataset.postId, btn.dataset.tutorId);
        loadDashboard('Student');
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

// ---------- Feedback ----------
async function loadFeedbackTutorOptions() {
  try {
    const selections = await api.getMySelections();
    const uniqueTutors = Array.from(new Map(selections.map(s => [s.tutor_id, s])).values());
    populateSelect(document.getElementById('feedback_tutor'), uniqueTutors, 'tutor_id', s => s.tutor_name);
  } catch (error) {
    console.error('Failed to load feedback tutor options:', error);
  }
}
async function loadMyFeedback() {
  try {
    const feedback = await api.getFeedback();
    document.getElementById('myFeedbackList').innerHTML = feedback.length
      ? feedback.map(renderFeedbackCard).join('') : '<p class="empty-state">No feedback received yet.</p>';
  } catch (error) {
    console.error('Failed to load your feedback:', error);
  }
}

async function loadAdminFeedback() {
  try {
    const feedback = await api.getFeedback();
    document.getElementById('adminFeedbackList').innerHTML = feedback.length
      ? feedback.map(renderFeedbackCard).join('') : '<p class="empty-state">No feedback submitted yet.</p>';
  } catch (error) {
    console.error('Admin feedback load failed:', error);
  }
}

// ---------- Messages ----------
async function loadMessages(role) {
  try {
    const [selections, conversations, notifications] = await Promise.all([
      api.getMySelections(), api.getConversations(), api.getNotifications(),
    ]);

    populateSelect(document.getElementById('conversation_partner'), selections,
      role === 'Student' ? 'tutor_id' : 'student_id',
      s => role === 'Student' ? s.tutor_name : s.student_name);

    document.getElementById('conversationsList').innerHTML = conversations.length
      ? conversations.map(c => renderConversationCard(c, role)).join('')
      : '<p class="empty-state">No conversations yet.</p>';
    attachConversationOpenButtons();

    document.getElementById('notificationsList').innerHTML = notifications.length
      ? notifications.map(renderNotification).join('') : '<p class="empty-state">No notifications.</p>';
  } catch (error) {
    console.error('Messages load failed:', error);
  }
}

function attachConversationOpenButtons() {
  document.querySelectorAll('.open-conversation-btn').forEach(btn => {
    btn.addEventListener('click', () => openConversation(btn.dataset.conversationId));
  });
}

async function openConversation(conversationId) {
  currentConversationId = conversationId;
  document.getElementById('activeConversation').classList.remove('hidden');
  const session = getSession();
  const messages = await api.getMessages(conversationId);
  document.getElementById('messagesThread').innerHTML = messages.length
    ? messages.map(m => renderMessageBubble(m, session.user_id)).join('')
    : '<p class="empty-state">No messages yet. Say hello.</p>';
}

// ---------- Admin ----------
async function loadAdminPanel() {
  try {
    const log = await api.getAdminLog();
    document.getElementById('systemLogList').innerHTML = log.length
      ? log.map(renderLogEntry).join('') : '<p class="empty-state">No admin actions logged yet.</p>';
  } catch (error) {
    console.error('Admin log load failed:', error);
  }
}

// ---------- Forms ----------
function setupFormListeners() {
  document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('postMessage');
    try {
      await api.createPost({
        title: document.getElementById('post_title').value,
        description: document.getElementById('post_description').value,
        budget: document.getElementById('post_budget').value,
        days_per_week: document.getElementById('post_days').value,
        preferred_time: document.getElementById('post_time').value,
      });
      msg.textContent = 'Posted!';
      msg.className = 'form-message success';
      document.getElementById('postForm').reset();
      loadDashboard('Student');
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('feedbackMessage');
    try {
      await api.submitFeedback({
        tutor_id: document.getElementById('feedback_tutor').value,
        rating: document.getElementById('feedback_rating').value,
        comment: document.getElementById('feedback_comment').value,
      });
      msg.textContent = 'Feedback submitted!';
      msg.className = 'form-message success';
      document.getElementById('feedbackForm').reset();
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('conversationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('conversationMessage');
    const role = getSession().role;
    const partnerId = document.getElementById('conversation_partner').value;
    const payload = role === 'Student' ? { tutor_id: partnerId } : { student_id: partnerId };
    try {
      const result = await api.startConversation(payload);
      msg.textContent = result.message;
      msg.className = 'form-message success';
      loadMessages(role);
      openConversation(result.conversation_id);
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('message_text');
    if (!currentConversationId) return;
    try {
      await api.sendMessage(currentConversationId, input.value);
      input.value = '';
      openConversation(currentConversationId);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('verifyTutorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('verifyMessage');
    try {
      const result = await api.verifyTutor(document.getElementById('verify_tutor_id').value);
      msg.textContent = result.message;
      msg.className = 'form-message success';
      document.getElementById('verifyTutorForm').reset();
      loadAdminPanel();
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });

  document.getElementById('userStatusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('userStatusMessage');
    try {
      const result = await api.updateUserStatus({
        user_id: document.getElementById('status_user_id').value,
        status: document.getElementById('status_value').value,
        reason: document.getElementById('status_reason').value,
      });
      msg.textContent = result.message;
      msg.className = 'form-message success';
      document.getElementById('userStatusForm').reset();
      loadAdminPanel();
    } catch (error) {
      msg.textContent = error.message;
      msg.className = 'form-message error';
    }
  });
}