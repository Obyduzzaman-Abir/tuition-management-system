function renderPostCard(post, showApplyButton = false) {
  const applyBtn = showApplyButton
    ? `<button class="btn-secondary apply-btn" data-post-id="${post.post_id}">Apply</button>`
    : '';
  const scheduleInfo = (post.days_per_week || post.preferred_time)
    ? `<p class="card-meta">${post.days_per_week ? post.days_per_week + ' days/week' : ''}${post.days_per_week && post.preferred_time ? ' · ' : ''}${post.preferred_time || ''}</p>`
    : '';
  return `
    <div class="card">
      <h3>${post.title}</h3>
      <p class="card-meta">Posted by ${post.student_name || 'you'}</p>
      <p class="card-meta">Budget: ৳${post.budget}</p>
      ${scheduleInfo}
      <span class="badge badge-${post.status.toLowerCase()}">${post.status}</span>
      ${applyBtn}
    </div>`;
}

function renderApplicationCard(app, showSelectButton) {
  const selectBtn = showSelectButton && app.status === 'Pending'
    ? `<button class="btn-secondary select-tutor-btn" data-post-id="${app.post_id}" data-tutor-id="${app.tutor_id}">Select this tutor</button>`
    : '';
  return `
    <div class="card">
      <h3>${app.post_title}</h3>
      <p class="card-meta">Tutor: ${app.tutor_name}</p>
      <p class="card-meta">Proposed rate: ৳${app.proposed_rate}</p>
      <span class="badge badge-${app.status.toLowerCase()}">${app.status}</span>
      ${selectBtn}
    </div>`;
}

function renderScheduleCard(item) {
  return `
    <div class="card">
      <h3>${item.student_name} &amp; ${item.tutor_name}</h3>
      <p class="card-meta">${new Date(item.start_datetime).toLocaleString()} - ${new Date(item.end_datetime).toLocaleTimeString()}</p>
      <p class="card-meta">${item.location || ''}</p>
    </div>`;
}

function renderPaymentCard(p) {
  return `
    <div class="card">
      <h3>${p.student_name} &rarr; ${p.tutor_name}</h3>
      <p class="card-meta">৳${p.amount} (${p.method || 'n/a'})</p>
      <span class="badge badge-${p.status.toLowerCase()}">${p.status}</span>
    </div>`;
}

function renderFeedbackCard(f) {
  const heading = f.tutor_name || 'Feedback received';
  return `
    <div class="card">
      <h3>${heading}</h3>
      <p class="card-meta anonymous-label">${f.student_name}</p>
      <p class="card-meta">Rating: ${f.rating} / 5</p>
      <p class="card-meta">"${f.comment || ''}"</p>
    </div>`;
}

function renderConversationCard(c, role) {
  const partnerName = role === 'Student' ? c.tutor_name : c.student_name;
  return `
    <div class="card">
      <h3>${partnerName}</h3>
      <p class="card-meta">${c.last_message_at ? new Date(c.last_message_at).toLocaleString() : 'No messages yet'}</p>
      <button class="btn-secondary open-conversation-btn" data-conversation-id="${c.conversation_id}">Open</button>
    </div>`;
}

function renderMessageBubble(m, currentUserId) {
  const isOwn = m.sender_id === currentUserId;
  return `
    <div class="message-bubble ${isOwn ? 'own' : ''}">
      <p class="message-sender">${m.sender_name}</p>
      <p class="message-text">${m.message}</p>
    </div>`;
}

function renderNotification(n) {
  return `
    <div class="card notification-item ${n.is_read ? '' : 'unread'}" data-notification-id="${n.notification_id}">
      <p>${n.message}</p>
      <p class="card-meta">${n.is_read ? 'Read' : 'Unread'} — ${new Date(n.created_at).toLocaleString()}</p>
    </div>`;
}

function renderLogEntry(entry) {
  return `
    <div class="card">
      <h3>${entry.action_type}</h3>
      <p class="card-meta">By ${entry.admin_name} on ${entry.target_type} #${entry.target_id}</p>
      <p class="card-meta">${entry.notes || ''} — ${new Date(entry.action_at).toLocaleString()}</p>
    </div>`;
}

function populateSelect(selectEl, items, valueKey, labelFn) {
  selectEl.innerHTML = items.length
    ? items.map(item => `<option value="${item[valueKey]}">${labelFn(item)}</option>`).join('')
    : '<option value="">None available</option>';
}