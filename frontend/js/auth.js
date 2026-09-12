function saveSession(data) {
  localStorage.setItem('tms_token', data.token);
  localStorage.setItem('tms_user', JSON.stringify({ user_id: data.user_id, name: data.name, role: data.role }));
}

function getSession() {
  const raw = localStorage.getItem('tms_user');
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem('tms_token');
  localStorage.removeItem('tms_user');
}

function isLoggedIn() {
  return !!localStorage.getItem('tms_token');
}

async function handleLogin(email, password) {
  const data = await api.login(email, password);
  saveSession(data);
  return data;
}

async function handleRegister(payload) {
  const data = await api.register(payload);
  saveSession(data);
  return data;
}

function handleLogout() {
  clearSession();
  window.location.reload();
}