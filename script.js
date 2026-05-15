const elements = {
  quickInfoContent: document.querySelector('#quickInfoContent'),
  orgaInfoContent: document.querySelector('#orgaInfoContent'),
  kickoffCountdown: document.querySelector('#kickoffCountdown'),
  cateringContent: document.querySelector('#cateringContent'),
  directionsContent: document.querySelector('#directionsContent'),
  fieldLayoutContent: document.querySelector('#fieldLayoutContent'),
  scheduleList: document.querySelector('#scheduleList'),
  pageMeta: document.querySelector('#pageMeta'),
  filters: {
    searchTerm: document.querySelector('#searchTerm'),
    fieldPills: document.querySelector('#fieldFilterPills')
  },
  searchSuggestions: document.querySelector('#searchSuggestions')
};

const state = { data: null, countdownTimer: null, siteTitle: '', activeField: '', searchPool: [], fieldColors: {} };
const hasScheduleUi = Boolean(elements.scheduleList);

const createList = (items = []) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const setHtml = (node, html) => { if (node) node.innerHTML = html; };
const formatDateDE = (isoDate = '') => {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
};

function kickoffDate(eventData = {}) {
  if (!eventData.date || !eventData.startTime) return null;
  return new Date(`${eventData.date}T${eventData.startTime}:00`);
}

function formatCountdown(targetDate) {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return 'Das erste Spiel hat bereits begonnen.';
  const totalSeconds = Math.floor(diff / 1000);
  return `${Math.floor(totalSeconds / 86400)} Tage, ${Math.floor((totalSeconds % 86400) / 3600)} Stunden, ${Math.floor((totalSeconds % 3600) / 60)} Minuten, ${totalSeconds % 60} Sekunden`;
}

function renderCountdown(data) {
  if (!elements.kickoffCountdown) return;
  const startDate = kickoffDate(data.event ?? {});
  if (!startDate || Number.isNaN(startDate.getTime())) return;
  const update = () => { elements.kickoffCountdown.textContent = formatCountdown(startDate); };
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  update();
  state.countdownTimer = window.setInterval(update, 1000);
}

function renderInfo(data) {
  setHtml(elements.quickInfoContent, createList(data.quickInfo));
  const tm = data.trainerMeeting ?? {};
  const ac = data.awardCeremony ?? {};
  setHtml(elements.orgaInfoContent, `<p><strong>Trainerbesprechung:</strong> ${tm.time ?? '-'} Uhr, ${tm.location ?? '-'}</p><p><strong>Siegerehrung:</strong> ${ac.isPlanned ? `Ja${ac.time ? `, geplant um ${ac.time} Uhr` : ''}${ac.location ? ` (${ac.location})` : ''}.` : 'Nein.'}</p>`);
  const c = data.catering ?? {};
  if (Array.isArray(c.categories) && c.categories.length) {
    const tablesHtml = c.categories.map((cat) => {
      const rows = (cat.items ?? []).map((item) => `<tr><td class="catering-icon">${item.icon ?? ''}</td><td>${item.name}</td><td class="catering-price">${item.price}</td></tr>`).join('');
      return `<h3 class="catering-heading">${cat.icon ? `${cat.icon} ` : ''}${cat.name}</h3><table class="catering-table"><tbody>${rows}</tbody></table>`;
    }).join('');
    const notesHtml = c.notes ? `<p class="catering-notes"><strong>Hinweis:</strong> ${c.notes}</p>` : '';
    setHtml(elements.cateringContent, tablesHtml + notesHtml);
  } else {
    setHtml(elements.cateringContent, `${createList(c.offerings ?? [])}<p><strong>Hinweis:</strong> ${c.notes ?? '-'}</p>`);
  }
  const d = data.directions ?? {};
  const addressHtml = (d.address ?? '-').replace(/\n/g, '<br />');
  const websiteHtml = d.website ? `<p><strong>Website:</strong> <a href="${d.website}" target="_blank" rel="noopener noreferrer">${d.website}</a></p>` : '';
  const noticeHtml = d.notice ? `<p><strong>Hinweis:</strong> ${d.notice}</p>` : '';
  setHtml(elements.directionsContent, `<p><strong>Adresse:</strong><br />${addressHtml}</p>${websiteHtml}${noticeHtml}<p><strong>Parken:</strong> ${d.parking ?? '-'}</p>`);
  const f = data.fieldLayout ?? {};
  setHtml(elements.fieldLayoutContent, `<p>${f.summary ?? '-'}</p>${createList((f.fields ?? []).map((x) => `${x.field}: ${x.group}`))}`);
  renderCountdown(data);
}

function currentFilters() {
  const query = elements.filters.searchTerm?.value.trim().toLowerCase() ?? '';
  return {
    field: state.activeField.toLowerCase(),
    query
  };
}

function matchesFilter(match, q) {
  return (!q.field || match.field.toLowerCase() === q.field || match.group.toLowerCase() === q.field)
    && (!q.query || [match.home.team, match.away.team, match.home.club, match.away.club].some((v) => v.toLowerCase().includes(q.query)));
}

function parseMatchDate(time) {
  const [h, m] = time.split(':').map(Number);
  const dt = kickoffDate(state.data?.event ?? {});
  if (!dt || Number.isNaN(h) || Number.isNaN(m)) return null;
  dt.setHours(h, m, 0, 0);
  return dt;
}

function renderMatches() {
  if (!hasScheduleUi || !state.data) return;
  const event = state.data.event ?? {};
  const allMatches = state.data.matches ?? [];
  const filtered = allMatches.filter((match) => matchesFilter(match, currentFilters()));

  if (!filtered.length) {
    elements.scheduleList.innerHTML = '<p>Keine Spiele mit diesen Filtern gefunden.</p>';
    return;
  }

  const now = new Date();
  let firstActiveId = '';
  elements.scheduleList.innerHTML = filtered.map((m, i) => {
    const start = parseMatchDate(m.time);
    const end = start ? new Date(start.getTime() + 9 * 60000) : null;
    const isRunning = start && end && now >= start && now < end;
    const id = `match-${i}`;
    if (isRunning && !firstActiveId) firstActiveId = id;

    const fieldName = m.field || m.group;
    const fieldClass = `field-${fieldName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const colorClass = state.fieldColors[fieldName.toLowerCase()] ?? '';

    return `<article id="${id}" class="match-card ${fieldClass}${isRunning ? ' is-running' : ''}"><div class="match-header"><strong>${m.time}</strong><span class="pill field-pill ${colorClass}">${fieldName}</span></div><p class="match-line">${m.home.team} : ${m.away.team}</p></article>`;
  }).join('');

  if (firstActiveId) document.getElementById(firstActiveId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function validateData(data) {
  return Boolean(data && data.event && Array.isArray(data.matches));
}

function applySiteConfig() {
  if (!state.siteTitle) return;
  document.title = `${document.title.split(' | ')[0]} | ${state.siteTitle}`;
}

function applyPageMeta(eventData = {}) {
  if (!elements.pageMeta) return;
  const subtitle = elements.pageMeta.getAttribute('data-subtitle') ?? '';
  const titlePart = eventData.name ?? 'Turnier';
  const datePart = formatDateDE(eventData.date ?? '');
  elements.pageMeta.textContent = `${titlePart} am ${datePart}${subtitle ? ` | ${subtitle}` : ''}`;
}

function populateScheduleFilters() {
  if (!hasScheduleUi || !state.data) return;
  const matches = state.data.matches ?? [];
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  const fields = uniq(matches.map((m) => m.field || m.group));
  state.searchPool = uniq(matches.flatMap((m) => [m.home.team, m.away.team, m.home.club, m.away.club]));

  const PILL_PALETTE = ['pill-c0', 'pill-c1', 'pill-c2', 'pill-c3', 'pill-c4', 'pill-c5'];
  fields.forEach((f, i) => { state.fieldColors[f.toLowerCase()] = PILL_PALETTE[i % PILL_PALETTE.length]; });

  if (elements.filters.fieldPills) {
    const pills = ['Alle', ...fields].map((name) => {
      const value = name === 'Alle' ? '' : name;
      const active = value === state.activeField;
      const colorClass = name === 'Alle' ? '' : ` ${state.fieldColors[name.toLowerCase()]}`;
      return `<button type="button" class="pill${colorClass}${active ? ' is-active' : ''}" data-field="${value}">${name}</button>`;
    }).join('');
    elements.filters.fieldPills.innerHTML = pills;
  }
}

function updateSearchSuggestions() {
  if (!elements.searchSuggestions) return;
  const q = (elements.filters.searchTerm?.value ?? '').trim().toLowerCase();
  if (!q) {
    elements.searchSuggestions.innerHTML = '';
    return;
  }

  window.setTimeout(() => {
    const hits = state.searchPool.filter((value) => value.toLowerCase().includes(q)).slice(0, 8);
    elements.searchSuggestions.innerHTML = hits.map((hit) => `<button type="button" class="autocomplete-item" role="option">${hit}</button>`).join('');
  }, 120);
}
async function loadJson(path, err) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(err);
  return r.json();
}

async function loadAllData() {
  const [config, eventData, cateringData, directionsData, fieldLayoutData, scheduleData] = await Promise.all([
    loadJson('./data/config.json', 'Konfiguration konnte nicht geladen werden.'),
    loadJson('./data/event.json', 'Event-Daten konnten nicht geladen werden.'),
    loadJson('./data/catering.json', 'Verpflegungsdaten konnten nicht geladen werden.'),
    loadJson('./data/anfahrt.json', 'Anfahrtsdaten konnten nicht geladen werden.'),
    loadJson('./data/spielfeldlayout.json', 'Spielfeldlayout konnte nicht geladen werden.'),
    loadJson('./data/spielplan.json', 'Spielplandaten konnten nicht geladen werden.')
  ]);
  state.siteTitle = config.siteTitle ?? '';
  return { ...scheduleData, ...eventData, ...cateringData, ...directionsData, ...fieldLayoutData };
}

function wireScheduleFilters() {
  if (!hasScheduleUi) return;
  elements.filters.searchTerm?.addEventListener('input', () => { updateSearchSuggestions(); renderMatches(); });
  elements.filters.fieldPills?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-field]');
    if (!button) return;
    state.activeField = button.getAttribute('data-field') ?? '';
    populateScheduleFilters();
    renderMatches();
  });
  elements.searchSuggestions?.addEventListener('click', (event) => {
    const button = event.target.closest('.autocomplete-item');
    if (!button || !elements.filters.searchTerm) return;
    elements.filters.searchTerm.value = button.textContent ?? '';
    elements.searchSuggestions.innerHTML = '';
    renderMatches();
  });
}

function markActiveNav() {
  const key = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  document.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    if (el.getAttribute('data-nav') === key) el.classList.add('active');
  });
}

async function init() {
  state.data = await loadAllData();
  if (!validateData(state.data)) throw new Error('JSON ungültig: Erwartet wird mindestens "event" und "matches".');
  applySiteConfig();
  applyPageMeta(state.data.event ?? {});
  renderInfo(state.data);
  populateScheduleFilters();
  renderMatches();
  wireScheduleFilters();
  markActiveNav();
}

init().catch((error) => {
  if (elements.scheduleList) elements.scheduleList.innerHTML = `<p class="hint">${error.message}</p>`;
  console.error(error);
});
