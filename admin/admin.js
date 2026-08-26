const OWNER = 'frostaqemelih';
const REPO = 'duzce-feyza-d-beauty';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN_KEY = 'fdb-admin-token';
const CONTENT_PATH = 'content.json';
const SITE_URL = 'https://frostaqemelih.github.io/duzce-feyza-d-beauty/';

const state = {
  token: null,
  data: null,
  sha: null,
  pendingImages: [], // { filename, base64, caption, alt, tempSrc }
};

// ---------- Helpers ----------
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function esc(s) { return String(s ?? ''); }

function toast(msg, kind) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'a-toast' + (kind ? ' is-' + kind : '');
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 6000);
}

function slugify(str) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u' };
  return String(str)
    .split('').map((c) => map[c] || c).join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'item';
}

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// ---------- GitHub API ----------
function ghHeaders() {
  return { Authorization: 'token ' + state.token, Accept: 'application/vnd.github+json' };
}
async function ghGetFile(path) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}&t=${Date.now()}`, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub okuma hatası (' + res.status + ')');
  const json = await res.json();
  return { sha: json.sha, text: base64ToUtf8(json.content.replace(/\n/g, '')) };
}
async function ghPutTextFile(path, contentStr, sha, message) {
  const body = { message, content: utf8ToBase64(contentStr), branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('GitHub yazma hatası (' + res.status + '): ' + t.slice(0, 200)); }
  return res.json();
}
async function ghPutBinaryFile(path, base64Content, message) {
  const existing = await ghGetFile(path).catch(() => null);
  const body = { message, content: base64Content, branch: BRANCH };
  if (existing) body.sha = existing.sha;
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error('Görsel yükleme hatası (' + res.status + '): ' + t.slice(0, 200)); }
  return res.json();
}

// ---------- Connect ----------
async function connect(token) {
  state.token = token;
  const file = await ghGetFile(CONTENT_PATH);
  if (!file) throw new Error('content.json depoda bulunamadı.');
  state.data = JSON.parse(file.text);
  state.sha = file.sha;
  try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
  $('#conn-status').textContent = 'Bağlandı';
  $('#conn-status').classList.add('is-connected');
  $('#logout-btn').hidden = false;
  $('#gate').hidden = true;
  $('#panel').hidden = false;
  renderAll();
}

function disconnect() {
  state.token = null;
  state.data = null;
  state.sha = null;
  state.pendingImages = [];
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  $('#conn-status').textContent = 'Bağlı değil';
  $('#conn-status').classList.remove('is-connected');
  $('#logout-btn').hidden = true;
  $('#gate').hidden = false;
  $('#panel').hidden = true;
  $('#token-input').value = '';
}

// ---------- Render ----------
function renderAll() {
  renderContact();
  renderCategories();
  renderServiceItems();
  renderGallery();
  renderReviews();
  renderFaq();
}

function renderContact() {
  const c = state.data.contact || {};
  const r = state.data.rating || {};
  $('#f-phone-display').value = c.phoneDisplay || '';
  $('#f-phone-tel').value = c.phoneTelHref || '';
  $('#f-wa-number').value = c.whatsappNumber || '';
  $('#f-address').value = c.address || '';
  $('#f-address-short').value = c.addressShort || '';
  $('#f-pluscode').value = c.plusCode || '';
  $('#f-hours').value = c.hoursNote || '';
  $('#f-maps-embed').value = c.mapsEmbedUrl || '';
  $('#f-maps-dir').value = c.mapsDirUrl || '';
  $('#f-maps-place').value = c.mapsPlaceUrl || '';
  $('#f-rating-value').value = r.value ?? '';
  $('#f-rating-count').value = r.count ?? '';
}
function collectContact() {
  state.data.contact = {
    phoneDisplay: $('#f-phone-display').value.trim(),
    phoneTelHref: $('#f-phone-tel').value.trim(),
    whatsappUrl: 'https://wa.me/' + $('#f-wa-number').value.trim(),
    whatsappNumber: $('#f-wa-number').value.trim(),
    address: $('#f-address').value.trim(),
    addressShort: $('#f-address-short').value.trim(),
    plusCode: $('#f-pluscode').value.trim(),
    hoursNote: $('#f-hours').value.trim(),
    mapsEmbedUrl: $('#f-maps-embed').value.trim(),
    mapsDirUrl: $('#f-maps-dir').value.trim(),
    mapsPlaceUrl: $('#f-maps-place').value.trim(),
  };
  state.data.rating = {
    value: parseFloat($('#f-rating-value').value) || 0,
    count: parseInt($('#f-rating-count').value, 10) || 0,
  };
}

function renderCategories() {
  const wrap = $('#category-list');
  wrap.innerHTML = '';
  state.data.services.categories.forEach((cat, i) => {
    const row = document.createElement('div');
    row.className = 'a-cat-row';
    row.innerHTML = `
      <span class="a-key">${esc(cat.key)}</span>
      <input type="text" value="${escAttr(cat.label)}" data-cat-label="${i}" />
      <button type="button" class="a-btn a-btn-danger" data-del-cat="${i}">Sil</button>
    `;
    wrap.appendChild(row);
  });
  $all('[data-cat-label]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => { state.data.services.categories[+inp.dataset.catLabel].label = inp.value; refreshCatSelect(); });
  });
  $all('[data-del-cat]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.delCat;
      const cat = state.data.services.categories[i];
      if (!confirm(`"${cat.label}" kategorisini ve içindeki tüm hizmetleri silmek istediğinize emin misiniz?`)) return;
      state.data.services.items = state.data.services.items.filter((it) => it.cat !== cat.key);
      state.data.services.categories.splice(i, 1);
      renderCategories();
      renderServiceItems();
    });
  });
  refreshCatSelect();
}
function refreshCatSelect() {
  const sel = $('#new-item-cat');
  sel.innerHTML = state.data.services.categories.map((c) => `<option value="${escAttr(c.key)}">${esc(c.label)}</option>`).join('');
}

function renderServiceItems() {
  const wrap = $('#service-items-list');
  wrap.innerHTML = '';
  const catLabel = (key) => (state.data.services.categories.find((c) => c.key === key) || {}).label || key;
  state.data.services.items.forEach((it, i) => {
    const card = document.createElement('div');
    card.className = 'a-item-card';
    card.innerHTML = `
      <div class="a-item-top">
        <span class="a-item-badge">${esc(catLabel(it.cat))}</span>
        <button type="button" class="a-btn a-btn-danger" data-del-item="${i}">Sil</button>
      </div>
      <div class="a-grid">
        <div class="a-field"><label>Hizmet Adı</label><input type="text" value="${escAttr(it.name)}" data-item-field="${i}:name" /></div>
        <div class="a-field"><label>Etiket (ör. Cihaz, Salonumuzdan)</label><input type="text" value="${escAttr(it.meta)}" data-item-field="${i}:meta" /></div>
        <div class="a-field a-field-full"><label>Açıklama</label><input type="text" value="${escAttr(it.desc)}" data-item-field="${i}:desc" /></div>
      </div>
    `;
    wrap.appendChild(card);
  });
  $all('[data-item-field]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => {
      const [i, field] = inp.dataset.itemField.split(':');
      state.data.services.items[+i][field] = inp.value;
    });
  });
  $all('[data-del-item]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.data.services.items.splice(+btn.dataset.delItem, 1);
      renderServiceItems();
    });
  });
}

function renderGallery() {
  const wrap = $('#gallery-grid');
  wrap.innerHTML = '';
  state.data.gallery.forEach((g, i) => {
    const item = document.createElement('div');
    item.className = 'a-gallery-item';
    const src = /^https?:/.test(g.src) ? g.src : SITE_URL + g.src;
    item.innerHTML = `
      <img src="${escAttr(src)}" alt="" loading="lazy" />
      <div class="a-gallery-item-body">
        <input type="text" value="${escAttr(g.caption)}" data-gal-field="${i}:caption" placeholder="Başlık" />
        <button type="button" class="a-btn a-btn-danger" data-del-gal="${i}">Sil</button>
      </div>
    `;
    wrap.appendChild(item);
  });
  state.pendingImages.forEach((p, pi) => {
    const item = document.createElement('div');
    item.className = 'a-gallery-item';
    item.innerHTML = `
      <img src="${escAttr(p.tempSrc)}" alt="" />
      <div class="a-gallery-item-body">
        <input type="text" value="${escAttr(p.caption)}" data-pending-caption="${pi}" placeholder="Başlık" />
        <span class="a-item-badge">Yeni — kaydedince yüklenecek</span>
        <button type="button" class="a-btn a-btn-danger" data-del-pending="${pi}">Sil</button>
      </div>
    `;
    wrap.appendChild(item);
  });
  $all('[data-gal-field]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => {
      const [i, field] = inp.dataset.galField.split(':');
      state.data.gallery[+i][field] = inp.value;
    });
  });
  $all('[data-del-gal]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.data.gallery.splice(+btn.dataset.delGal, 1);
      renderGallery();
    });
  });
  $all('[data-pending-caption]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => { state.pendingImages[+inp.dataset.pendingCaption].caption = inp.value; });
  });
  $all('[data-del-pending]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.pendingImages.splice(+btn.dataset.delPending, 1);
      renderGallery();
    });
  });
}

function renderReviews() {
  const wrap = $('#review-list');
  wrap.innerHTML = '';
  state.data.reviews.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'a-item-card';
    card.innerHTML = `
      <div class="a-item-top">
        <span class="a-item-badge">Yorum ${i + 1}</span>
        <button type="button" class="a-btn a-btn-danger" data-del-review="${i}">Sil</button>
      </div>
      <div class="a-grid">
        <div class="a-field"><label>Ad Soyad</label><input type="text" value="${escAttr(r.name)}" data-review-field="${i}:name" /></div>
        <div class="a-field"><label>Baş Harf (avatar)</label><input type="text" maxlength="2" value="${escAttr(r.initial)}" data-review-field="${i}:initial" /></div>
        <div class="a-field a-field-full"><label>Yorum Metni</label><textarea data-review-field="${i}:text">${esc(r.text)}</textarea></div>
      </div>
    `;
    wrap.appendChild(card);
  });
  $all('[data-review-field]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => {
      const [i, field] = inp.dataset.reviewField.split(':');
      state.data.reviews[+i][field] = inp.value;
    });
  });
  $all('[data-del-review]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.data.reviews.splice(+btn.dataset.delReview, 1);
      renderReviews();
    });
  });
}

function renderFaq() {
  const wrap = $('#faq-editor-list');
  wrap.innerHTML = '';
  state.data.faq.forEach((f, i) => {
    const card = document.createElement('div');
    card.className = 'a-item-card';
    card.innerHTML = `
      <div class="a-item-top">
        <span class="a-item-badge">Soru ${i + 1}</span>
        <button type="button" class="a-btn a-btn-danger" data-del-faq="${i}">Sil</button>
      </div>
      <div class="a-field"><label>Soru</label><input type="text" value="${escAttr(f.q)}" data-faq-field="${i}:q" /></div>
      <div class="a-field"><label>Cevap</label><textarea data-faq-field="${i}:a">${esc(f.a)}</textarea></div>
    `;
    wrap.appendChild(card);
  });
  $all('[data-faq-field]', wrap).forEach((inp) => {
    inp.addEventListener('input', () => {
      const [i, field] = inp.dataset.faqField.split(':');
      state.data.faq[+i][field] = inp.value;
    });
  });
  $all('[data-del-faq]', wrap).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.data.faq.splice(+btn.dataset.delFaq, 1);
      renderFaq();
    });
  });
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- Add actions ----------
$('#add-category-btn').addEventListener('click', () => {
  const label = prompt('Yeni kategori adı (ör. Kaş Alımı):');
  if (!label) return;
  const key = slugify(label);
  if (state.data.services.categories.some((c) => c.key === key)) { alert('Bu isimde bir kategori zaten var.'); return; }
  state.data.services.categories.push({ key, label });
  renderCategories();
});

$('#add-item-btn').addEventListener('click', () => {
  const cat = $('#new-item-cat').value;
  if (!cat) { alert('Önce en az bir kategori ekleyin.'); return; }
  state.data.services.items.push({ cat, name: 'Yeni Hizmet', desc: '', meta: '' });
  renderServiceItems();
});

$('#add-photo-btn').addEventListener('click', () => {
  const fileInput = $('#new-photo-file');
  const caption = $('#new-photo-caption').value.trim() || 'Yeni Fotoğraf';
  const file = fileInput.files[0];
  if (!file) { alert('Lütfen bir fotoğraf seçin.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const base64 = dataUrl.split(',')[1];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = `images/${slugify(caption)}-${Date.now()}.${ext}`;
    state.pendingImages.push({ filename, base64, caption, alt: caption, tempSrc: dataUrl });
    fileInput.value = '';
    $('#new-photo-caption').value = '';
    renderGallery();
  };
  reader.readAsDataURL(file);
});

$('#add-review-btn').addEventListener('click', () => {
  state.data.reviews.push({ name: '', initial: '', text: '' });
  renderReviews();
});

$('#add-faq-btn').addEventListener('click', () => {
  state.data.faq.push({ q: '', a: '' });
  renderFaq();
});

// ---------- Tabs ----------
$all('.a-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $all('.a-tab').forEach((t) => t.classList.remove('is-active'));
    $all('.a-panel').forEach((p) => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    $(`.a-panel[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
  });
});

// ---------- Save ----------
$('#save-btn').addEventListener('click', async () => {
  const btn = $('#save-btn');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';
  try {
    collectContact();

    // Upload any newly added photos first, add them to the gallery list.
    for (const p of state.pendingImages) {
      await ghPutBinaryFile(p.filename, p.base64, `Galeriye fotoğraf eklendi: ${p.caption}`);
      state.data.gallery.push({ src: p.filename, alt: p.alt, caption: p.caption });
    }
    state.pendingImages = [];

    const fresh = await ghGetFile(CONTENT_PATH); // re-fetch sha in case it changed since connect
    const sha = fresh ? fresh.sha : state.sha;
    const json = JSON.stringify(state.data, null, 2) + '\n';
    const result = await ghPutTextFile(CONTENT_PATH, json, sha, 'İçerik güncellendi (yönetim panelinden)');
    state.sha = result.content.sha;

    renderGallery();
    toast('Kaydedildi ve yayınlandı. Site birkaç saniye içinde güncellenecek.', 'ok');
  } catch (err) {
    console.error(err);
    toast('Kaydetme başarısız: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kaydet ve Yayınla';
  }
});

// ---------- Gate wiring ----------
$('#connect-btn').addEventListener('click', async () => {
  const token = $('#token-input').value.trim();
  const errEl = $('#gate-error');
  errEl.hidden = true;
  if (!token) { errEl.textContent = 'Lütfen bir token girin.'; errEl.hidden = false; return; }
  const btn = $('#connect-btn');
  btn.disabled = true;
  btn.textContent = 'Bağlanıyor...';
  try {
    await connect(token);
  } catch (err) {
    console.error(err);
    errEl.textContent = 'Bağlanılamadı: ' + err.message + ' — token izinlerini kontrol edin.';
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Bağlan';
  }
});
$('#logout-btn').addEventListener('click', disconnect);

// ---------- Auto-connect if a token is already stored ----------
(function initAuto() {
  let saved = null;
  try { saved = localStorage.getItem(TOKEN_KEY); } catch (e) {}
  if (saved) {
    $('#token-input').value = saved;
    connect(saved).catch((err) => {
      console.error(err);
      $('#gate-error').textContent = 'Kayıtlı token ile bağlanılamadı: ' + err.message;
      $('#gate-error').hidden = false;
      disconnect();
    });
  }
})();
