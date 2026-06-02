async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: options.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ. حاول مرة أخرى');
  return data;
}

function showToast(text, ok = true) {
  if (!text) return;
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast ' + (ok ? 'success' : 'error');
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function message(id, text, ok = true) {
  const el = document.getElementById(id);
  if (!el) { showToast(text, ok); return; }
  el.className = ok ? 'success' : 'error';
  el.textContent = text;
  if (text) showToast(text, ok);
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  location.href = '/c/6a1dcaf0-3304-83ea-b660-1e9e88d19bd2';
}


function setLoading(id, text = 'جاري التحميل...') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'loading';
  el.textContent = text;
}

function clearMessage(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = '';
  el.textContent = '';
}


// Professional UI helpers
function setButtonLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText || 'من فضلك انتظر...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  document.querySelectorAll('input[inputmode="numeric"], input[pattern*="\d"]').forEach(input => {
    input.addEventListener('input', () => {
      const max = input.getAttribute('maxlength');
      let value = input.value.replace(/\D/g, '');
      if (max) value = value.slice(0, Number(max));
      input.value = value;
    });
  });

  document.querySelectorAll('input[type="file"][accept="image/*"]').forEach(input => {
    input.setAttribute('capture', 'user');
  });

  document.querySelectorAll('table').forEach(table => {
    if (!table.parentElement.classList.contains('table-scroll')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });
});

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}


function toggleSection(id, btn) {
  const section = document.getElementById(id);
  if (!section) return;

  section.classList.toggle('open');

  if (btn) {
    btn.classList.toggle('open', section.classList.contains('open'));
    const showText = btn.dataset.show || btn.textContent.replace('إخفاء', 'عرض');
    const hideText = btn.dataset.hide || btn.textContent.replace('عرض', 'إخفاء');
    btn.textContent = section.classList.contains('open') ? hideText : showText;
  }
}
