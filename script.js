const elements = {
  quickInfoContent: document.querySelector('#quickInfoContent'),
  orgaInfoContent: document.querySelector('#orgaInfoContent'),
  kickoffCountdown: document.querySelector('#kickoffCountdown'),
  cateringContent: document.querySelector('#cateringContent'),
  directionsContent: document.querySelector('#directionsContent'),
  fieldLayoutContent: document.querySelector('#fieldLayoutContent'),
  scheduleList: document.querySelector('#scheduleList'),
  scheduleMeta: document.querySelector('#scheduleMeta'),
  filters: {
    field: document.querySelector('#searchField'),
    group: document.querySelector('#searchGroup'),
    team: document.querySelector('#searchTeam'),
    club: document.querySelector('#searchClub')
  },
  teamSuggestions: document.querySelector('#teamSuggestions'),
  clubSuggestions: document.querySelector('#clubSuggestions')
};

const state = { data: null, countdownTimer: null, siteTitle: '' };
const hasScheduleUi = Boolean(elements.scheduleList && elements.scheduleMeta);

const createList = (items = []) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
const setHtml = (node, html) => { if (node) node.innerHTML = html; };

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
  update(); state.countdownTimer = window.setInterval(update, 1000);
}

function renderInfo(data) {
  setHtml(elements.quickInfoContent, createList(data.quickInfo));
  const tm = data.trainerMeeting ?? {}; const ac = data.awardCeremony ?? {};
  setHtml(elements.orgaInfoContent, `<p><strong>Trainerbesprechung:</strong> ${tm.time ?? '-'} Uhr, ${tm.location ?? '-'}</p><p><strong>Siegerehrung:</strong> ${ac.isPlanned ? `Ja${ac.time ? `, geplant um ${ac.time} Uhr` : ''}${ac.location ? ` (${ac.location})` : ''}.` : 'Nein.'}</p>`);
  const c = data.catering ?? {};
  setHtml(elements.cateringContent, `${createList(c.offerings)}<p><strong>Zahlung:</strong> ${c.payment ?? '-'}</p><p><strong>Hinweis:</strong> ${c.notes ?? '-'}</p>`);
  const d = data.directions ?? {};
  setHtml(elements.directionsContent, `<p><strong>Adresse:</strong> ${d.address ?? '-'}</p><p><strong>Parken:</strong> ${d.parking ?? '-'}</p><p><strong>ÖPNV:</strong> ${d.publicTransport ?? '-'}</p>`);
  const f = data.fieldLayout ?? {};
  setHtml(elements.fieldLayoutContent, `<p>${f.summary ?? '-'}</p>${createList((f.fields ?? []).map((x) => `${x.field}: ${x.group}`))}`);
  renderCountdown(data);
}

function currentFilters() {
  const { field, group, team, club } = elements.filters;
  return { field: field?.value.trim().toLowerCase() ?? '', group: group?.value.trim().toLowerCase() ?? '', team: team?.value.trim().toLowerCase() ?? '', club: club?.value.trim().toLowerCase() ?? '' };
}
function matchesFilter(match, q) {
  return (!q.field || match.field.toLowerCase() === q.field) && (!q.group || match.group.toLowerCase() === q.group) && (!q.team || match.home.team.toLowerCase().includes(q.team) || match.away.team.toLowerCase().includes(q.team)) && (!q.club || match.home.club.toLowerCase().includes(q.club) || match.away.club.toLowerCase().includes(q.club));
}

function parseMatchDate(time) {
  const [h,m]=time.split(':').map(Number);
  const dt = kickoffDate(state.data?.event ?? {});
  if (!dt || Number.isNaN(h) || Number.isNaN(m)) return null;
  dt.setHours(h,m,0,0);
  return dt;
}

function renderMatches() {
  if (!hasScheduleUi || !state.data) return;
  const event = state.data.event ?? {}; const allMatches = state.data.matches ?? [];
  const filtered = allMatches.filter((match) => matchesFilter(match, currentFilters()));
  elements.scheduleMeta.textContent = `${event.name ?? 'Turnier'} · ${event.date ?? '-'} · ${event.startTime ?? '-'} · ${event.location ?? '-'} · ${filtered.length}/${allMatches.length} Spiele`;
  if (!filtered.length) { elements.scheduleList.innerHTML = '<p>Keine Spiele mit diesen Filtern gefunden.</p>'; return; }

  const now = new Date();
  let firstActiveId = '';
  elements.scheduleList.innerHTML = filtered.map((m, i) => {
    const start = parseMatchDate(m.time); const end = start ? new Date(start.getTime() + 9*60000) : null;
    const isRunning = start && end && now >= start && now < end;
    const id = `match-${i}`;
    if (isRunning && !firstActiveId) firstActiveId = id;
    return `<article id="${id}" class="match-card${isRunning ? ' is-running' : ''}"><div class="match-header"><strong>${m.time}</strong><span>${m.field} · ${m.group}</span></div><p>${m.home.team} (${m.home.club})</p><p>vs.</p><p>${m.away.team} (${m.away.club})</p></article>`;
  }).join('');
  if (!filtered.length) {
    elements.scheduleList.innerHTML = '<p>Keine Spiele mit diesen Filtern gefunden.</p>';
    return;
  }

  elements.scheduleList.innerHTML = filtered
    .map(
      (m) => `<article class="match-card"><div class="match-header"><strong>${m.time}</strong><span>${m.field} · ${m.group}</span></div><p>${m.home.team} vs. ${m.away.team} </p></article>`
    )
    .join('');
}

function validateData(data) {
  return Boolean(data && data.event && Array.isArray(data.matches));
}

function applySiteConfig() {
  if (!state.siteTitle) return;
  const currentTitle = document.title.trim();
  if (!currentTitle) {
    document.title = state.siteTitle;
    return;
  }
  const separator = ' | ';
  const suffixStart = currentTitle.lastIndexOf(separator);
  const hasSuffix = suffixStart !== -1;
  const baseTitle = hasSuffix ? currentTitle.slice(0, suffixStart).trim() : currentTitle;
  const currentSuffix = hasSuffix ? currentTitle.slice(suffixStart + separator.length).trim() : '';
  if (currentSuffix === state.siteTitle) return;
  document.title = baseTitle ? `${baseTitle}${separator}${state.siteTitle}` : state.siteTitle;
}

function setData(data) {
  if (!validateData(data)) {
    alert('JSON ungültig: Erwartet wird mindestens "event" und "matches".');
    return;
  }
  state.data = data;
  renderInfo(data);
  renderMatches();
  if (elements.jsonExample) elements.jsonExample.textContent = JSON.stringify(data, null, 2);
}

  if (firstActiveId) document.getElementById(firstActiveId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function populateScheduleFilters() {
  if (!hasScheduleUi || !state.data) return;
  const matches = state.data.matches ?? [];
  const uniq = (arr) => [...new Set(arr)].sort((a,b)=>a.localeCompare(b,'de'));
  const fillSelect = (el, vals, label) => {
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="">${label}</option>` + vals.map((v) => `<option value="${v}">${v}</option>`).join('');
    el.value = cur;
  };
  fillSelect(elements.filters.field, uniq(matches.map((m)=>m.field)), 'Alle Spielfelder');
  fillSelect(elements.filters.group, uniq(matches.map((m)=>m.group)), 'Alle Gruppen');
  if (elements.teamSuggestions) elements.teamSuggestions.innerHTML = uniq(matches.flatMap((m)=>[m.home.team,m.away.team])).map((v)=>`<option value="${v}"></option>`).join('');
  if (elements.clubSuggestions) elements.clubSuggestions.innerHTML = uniq(matches.flatMap((m)=>[m.home.club,m.away.club])).map((v)=>`<option value="${v}"></option>`).join('');
}

async function loadJson(path, err) { const r = await fetch(path); if (!r.ok) throw new Error(err); return r.json(); }
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
function applySiteConfig() { if (state.siteTitle) document.title = `${document.title.split(' | ')[0]} | ${state.siteTitle}`; }

function wireScheduleFilters() {
  if (!hasScheduleUi) return;
  Object.values(elements.filters).forEach((n) => n?.addEventListener('input', renderMatches));
}

function markActiveNav() {
  const key = (location.pathname.split('/').pop() || 'index.html').replace('.html','');
  document.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    if (el.getAttribute('data-nav') === key) el.classList.add('active');
  });
}

async function init() {
  state.data = await loadAllData();
  applySiteConfig();
  renderInfo(state.data);
  populateScheduleFilters();
  renderMatches();
  wireScheduleFilters();
  markActiveNav();
}
init().catch((error) => { if (elements.scheduleMeta) elements.scheduleMeta.textContent = error.message; console.error(error); });
