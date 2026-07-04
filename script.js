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
  searchSuggestions: document.querySelector('#searchSuggestions'),
  tournamentSearch: document.querySelector('#tournamentSearch'),
  tournamentDate: document.querySelector('#tournamentDate'),
  tournamentSuggestions: document.querySelector('#tournamentSuggestions'),
  tournamentCards: document.querySelector('#tournamentCards'),
  locationStatus: document.querySelector('#locationStatus')
};

const state = {
  countdownTimer: null,
  siteTitle: '',
  activeField: '',
  searchPool: [],
  fieldColors: {},
  tournaments: [],
  selectedTournamentId: '',
  selectedTournament: null,
  userPosition: null,
  selectedDate: ''
};

const hasScheduleUi = Boolean(elements.scheduleList);
const hasSelectorUi = Boolean(elements.tournamentCards);
const TOURNAMENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const MIN_VISIBLE_TOURNAMENTS = 5;
const NEARBY_RADIUS_KM = 60;

const createList = (items = []) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const setHtml = (node, html) => { if (node) node.innerHTML = html; };
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatDateDE = (isoDate = '') => {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}.${month}.${year}` : isoDate;
};

const formatDateTimeDE = (isoDate = '', time = '') => {
  const d = formatDateDE(isoDate);
  return d && time ? `${d}, ${time} Uhr` : d || time;
};

function safeImageUrl(value = '') {
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function kickoffDate(eventData = {}) {
  if (!eventData.date || !eventData.startTime) return null;
  return new Date(`${eventData.date}T${eventData.startTime}:00`);
}

function matchDateForTournament(tournament, time) {
  const [h, m] = String(time ?? '').split(':').map(Number);
  const dt = kickoffDate(tournament?.event ?? {});
  if (!dt || Number.isNaN(h) || Number.isNaN(m)) return null;
  dt.setHours(h, m, 0, 0);
  return dt;
}

function tournamentEndDate(tournament = {}) {
  const event = tournament.event ?? {};
  if (event.date && event.endTime) {
    const fixed = new Date(`${event.date}T${event.endTime}:00`);
    if (!Number.isNaN(fixed.getTime())) return fixed;
  }
  const matches = tournament.matches ?? [];
  const lastMatch = matches[matches.length - 1];
  const lastStart = lastMatch ? matchDateForTournament(tournament, lastMatch.time) : null;
  if (lastStart) return new Date(lastStart.getTime() + 10 * 60000);
  return kickoffDate(event);
}

function tournamentStatus(tournament = {}, now = new Date()) {
  const start = kickoffDate(tournament.event ?? {});
  const end = tournamentEndDate(tournament);
  if (!start || !end) return { key: 'unknown', label: 'Unbekannt', rank: 3 };
  if (now >= start && now <= end) return { key: 'running', label: 'Läuft gerade', rank: 0 };
  if (now < start) return { key: 'upcoming', label: 'Kommt noch', rank: 1 };
  return { key: 'past', label: 'Bereits vorbei', rank: 2 };
}

function haversineKm(from, to) {
  if (!from || !to) return null;
  const p = Math.PI / 180;
  const lat1 = Number(from.lat);
  const lon1 = Number(from.lon);
  const lat2 = Number(to.lat);
  const lon2 = Number(to.lon);
  if ([lat1, lon1, lat2, lon2].some((n) => Number.isNaN(n))) return null;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function selectedTournamentIdFromUrl() {
  const rawId = new URLSearchParams(location.search).get('t') ?? '';
  return TOURNAMENT_ID_PATTERN.test(rawId) ? rawId : '';
}

function pageUrlWithTournament(page, tournamentId) {
  const safeTournamentId = TOURNAMENT_ID_PATTERN.test(tournamentId ?? '') ? tournamentId : '';
  if (!safeTournamentId) return page;
  const params = new URLSearchParams({ t: safeTournamentId });
  return `${page}?${params.toString()}`;
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

function markActiveNav() {
  const key = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
  document.querySelectorAll('.top-nav [data-nav]').forEach((el) => {
    if (el.getAttribute('data-nav') === key) el.classList.add('active');
  });
}

function applyTournamentLinksToNav() {
  if (!state.selectedTournamentId) return;
  const allowedPages = new Set(['turnier.html', 'verpflegung.html', 'anfahrt.html', 'spielfeldlayout.html', 'spielplan.html']);
  document.querySelectorAll('.top-nav [data-page]').forEach((el) => {
    const page = el.getAttribute('data-page');
    if (!page || page === 'index.html' || !allowedPages.has(page)) return;
    el.setAttribute('href', pageUrlWithTournament(page, state.selectedTournamentId));
  });
}

function renderCountdown(tournament) {
  if (!elements.kickoffCountdown) return;
  const startDate = kickoffDate(tournament?.event ?? {});
  if (!startDate || Number.isNaN(startDate.getTime())) return;

  const grid = document.getElementById('cdGrid');
  const message = document.getElementById('cdMessage');
  const daysEl = document.getElementById('cdDays');
  const daysBox = daysEl ? daysEl.closest('.cd-box') : null;
  const hoursEl = document.getElementById('cdHours');
  const minutesEl = document.getElementById('cdMinutes');
  const secondsEl = document.getElementById('cdSeconds');

  const update = () => {
    const diff = startDate.getTime() - Date.now();
    if (diff <= 0) {
      if (grid) grid.hidden = true;
      if (message) {
        message.className = 'cd-done';
        message.textContent = '🎉 Das erste Spiel hat bereits begonnen!';
        message.hidden = false;
      }
      return;
    }
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hideDays = totalSeconds < 86400;

    if (grid) grid.hidden = false;
    if (message) message.hidden = true;
    if (daysBox) daysBox.hidden = hideDays;
    if (daysEl) daysEl.textContent = String(days);
    if (hoursEl) hoursEl.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(totalSeconds % 60).padStart(2, '0');
  };

  if (state.countdownTimer) clearInterval(state.countdownTimer);
  update();
  state.countdownTimer = window.setInterval(update, 1000);
}

function renderTournamentInfo(tournament = {}) {
  setHtml(elements.quickInfoContent, createList(tournament.quickInfo));

  const tm = tournament.trainerMeeting ?? {};
  const ac = tournament.awardCeremony ?? {};
  setHtml(elements.orgaInfoContent, `<p><strong>Trainerbesprechung:</strong> ${escapeHtml(tm.time ?? '-')} Uhr, ${escapeHtml(tm.location ?? '-')}</p><p><strong>Siegerehrung:</strong> ${ac.isPlanned ? `Ja${ac.time ? `, geplant um ${escapeHtml(ac.time)} Uhr` : ''}${ac.location ? ` (${escapeHtml(ac.location)})` : ''}.` : 'Nein.'}</p>`);

  const c = tournament.catering ?? {};
  if (Array.isArray(c.categories) && c.categories.length) {
    const tablesHtml = c.categories.map((cat) => {
      const rows = (cat.items ?? []).map((item) => `<tr><td class="catering-icon">${escapeHtml(item.icon ?? '')}</td><td>${escapeHtml(item.name)}</td><td class="catering-price">${escapeHtml(item.price ?? '')}</td></tr>`).join('');
      return `<h3 class="catering-heading">${cat.icon ? `${escapeHtml(cat.icon)} ` : ''}${escapeHtml(cat.name ?? '')}</h3><table class="catering-table"><tbody>${rows}</tbody></table>`;
    }).join('');
    const notesHtml = c.notes ? `<p class="catering-notes"><strong>Hinweis:</strong> ${escapeHtml(c.notes)}</p>` : '';
    setHtml(elements.cateringContent, tablesHtml + notesHtml);
  } else {
    setHtml(elements.cateringContent, `${createList(c.offerings ?? [])}<p><strong>Hinweis:</strong> ${escapeHtml(c.notes ?? '-')}</p>`);
  }

  const d = tournament.directions ?? {};
  const addressHtml = escapeHtml(d.address ?? '-').replace(/\n/g, '<br />');
  const website = String(d.website ?? '').trim();
  const websiteUrl = safeImageUrl(website);
  const websiteHtml = websiteUrl ? `<p><strong>Website:</strong> <a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(website)}</a></p>` : '';
  const noticeHtml = d.notice ? `<p><strong>Hinweis:</strong> ${escapeHtml(d.notice)}</p>` : '';
  setHtml(elements.directionsContent, `<p><strong>Adresse:</strong><br />${addressHtml}</p>${websiteHtml}${noticeHtml}<p><strong>Parken:</strong> ${escapeHtml(d.parking ?? '-')}</p>`);

  const f = tournament.fieldLayout ?? {};
  const fieldListHtml = createList((f.fields ?? []).map((x) => `${x.field}: ${x.group}`));
  const imageUrl = safeImageUrl(f.image?.url ?? '');
  const imageHtml = imageUrl
    ? `<figure class="field-layout-figure"><img class="field-layout-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(f.image?.alt ?? 'Spielfelder')}" loading="lazy" /></figure>`
    : '';
  setHtml(elements.fieldLayoutContent, `<h2 class="field-layout-title">${escapeHtml(f.title ?? 'Spielfelder')}</h2><p>${escapeHtml(f.summary ?? '-')}</p>${imageHtml}${fieldListHtml}`);

  renderCountdown(tournament);
}

function currentFilters() {
  const query = elements.filters.searchTerm?.value.trim().toLowerCase() ?? '';
  return { field: state.activeField.toLowerCase(), query };
}

function matchesFilter(match, filter) {
  const values = [match.home?.team, match.away?.team, match.home?.club, match.away?.club].filter(Boolean).map((v) => v.toLowerCase());
  return (!filter.field || (match.field ?? '').toLowerCase() === filter.field || (match.group ?? '').toLowerCase() === filter.field)
    && (!filter.query || values.some((v) => v.includes(filter.query)));
}

function parseMatchDate(time) {
  return matchDateForTournament(state.selectedTournament, time);
}

function renderMatches() {
  if (!hasScheduleUi || !state.selectedTournament) return;
  const allMatches = state.selectedTournament.matches ?? [];
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

    const fieldName = m.field || m.group || 'Feld';
    const colorClass = state.fieldColors[fieldName.toLowerCase()] ?? '';

    return `<article id="${id}" class="match-card${isRunning ? ' is-running' : ''}"><div class="match-header"><strong>${escapeHtml(m.time ?? '--:--')}</strong><span class="pill field-pill ${colorClass}">${escapeHtml(fieldName)}</span></div><p class="match-line">${escapeHtml(m.home?.team ?? 'TBD')} : ${escapeHtml(m.away?.team ?? 'TBD')}</p></article>`;
  }).join('');

  if (firstActiveId) document.getElementById(firstActiveId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function populateScheduleFilters() {
  if (!hasScheduleUi || !state.selectedTournament) return;
  const matches = state.selectedTournament.matches ?? [];
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  const fields = uniq(matches.map((m) => m.field || m.group));
  state.searchPool = uniq(matches.flatMap((m) => [m.home?.team, m.away?.team, m.home?.club, m.away?.club]));

  state.fieldColors = {};
  const palette = ['pill-c0', 'pill-c1', 'pill-c2', 'pill-c3', 'pill-c4', 'pill-c5'];
  fields.forEach((field, i) => { state.fieldColors[field.toLowerCase()] = palette[i % palette.length]; });

  if (elements.filters.fieldPills) {
    const pills = ['Alle', ...fields].map((name) => {
      const value = name === 'Alle' ? '' : name;
      const active = value === state.activeField;
      const colorClass = name === 'Alle' ? '' : ` ${state.fieldColors[name.toLowerCase()]}`;
      return `<button type="button" class="pill${colorClass}${active ? ' is-active' : ''}" data-field="${escapeHtml(value)}">${escapeHtml(name)}</button>`;
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
    elements.searchSuggestions.innerHTML = hits.map((hit) => `<button type="button" class="autocomplete-item" role="option">${escapeHtml(hit)}</button>`).join('');
  }, 120);
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

function formatDistanceLabel(distanceKm) {
  if (distanceKm == null) return '';
  return distanceKm < 10 ? `${distanceKm.toFixed(1)} km entfernt` : `${Math.round(distanceKm)} km entfernt`;
}

function parseIsoDate(isoDate = '') {
  if (!isoDate) return null;
  const dt = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function dayValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return Number.NaN;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a, b) {
  return dayValue(a) === dayValue(b);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function weekendRange(date) {
  const day = date.getDay();
  const shiftToSaturday = day === 0 ? -1 : day === 6 ? 0 : 6 - day;
  const saturday = new Date(dayValue(date) + shiftToSaturday * 24 * 3600 * 1000);
  const sunday = new Date(dayValue(saturday) + 24 * 3600 * 1000);
  return { start: saturday, end: sunday };
}

function parseSearchTokens(value = '') {
  return value.toLowerCase().split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function eventDate(tournament = {}) {
  return parseIsoDate(tournament.event?.date ?? '');
}

function queryMatchState(searchableText = '', queryTokens = []) {
  if (!queryTokens.length) return { hasMatch: true, missingTokens: 0 };
  const missingTokens = queryTokens.filter((token) => !searchableText.includes(token)).length;
  return { hasMatch: missingTokens < queryTokens.length, missingTokens };
}

function searchableTournamentText(tournament = {}) {
  const event = tournament.event ?? {};
  return [
    event.name,
    event.location,
    formatDateDE(event.date ?? ''),
    event.date,
    event.startTime,
    event.endTime,
    tournament.id
  ].filter(Boolean).join(' ').toLowerCase();
}

function tournamentSortValue(tournament, now, queryTokens = [], searchableText = '') {
  const normalizedQueryTokens = Array.isArray(queryTokens)
    ? queryTokens
    : parseSearchTokens(String(queryTokens ?? ''));
  const status = tournamentStatus(tournament, now);
  const start = kickoffDate(tournament.event ?? {});
  const end = tournamentEndDate(tournament);
  const distance = haversineKm(state.userPosition, tournament.geo);
  const timeDistance = status.key === 'past'
    ? Math.abs(now.getTime() - (end?.getTime() ?? Number.MAX_SAFE_INTEGER))
    : Math.abs((start?.getTime() ?? Number.MAX_SAFE_INTEGER) - now.getTime());
  const queryState = queryMatchState(searchableText, normalizedQueryTokens);

  return {
    statusRank: status.rank,
    queryBoost: queryState.missingTokens,
    distanceRank: distance == null ? Number.MAX_SAFE_INTEGER : distance,
    timeRank: timeDistance,
    name: String(tournament.event?.name ?? '')
  };
}

function filterBySearchWindow(tournaments = [], selectedDate = null) {
  if (!selectedDate) return tournaments;

  const primary = tournaments.filter((tournament) => {
    const date = eventDate(tournament);
    if (!date) return false;
    if (isWeekend(selectedDate)) {
      const range = weekendRange(selectedDate);
      const value = dayValue(date);
      return value >= dayValue(range.start) && value <= dayValue(range.end);
    }
    return isSameDay(date, selectedDate);
  });
  if (primary.length) return primary;

  const expanded = tournaments.filter((tournament) => {
    const date = eventDate(tournament);
    if (!date) return false;
    const diffDays = Math.abs(dayValue(date) - dayValue(selectedDate)) / (24 * 3600 * 1000);
    return diffDays <= 30;
  });
  return expanded.length ? expanded : tournaments;
}

function ensureMinimumTournaments(base = [], minimum = MIN_VISIBLE_TOURNAMENTS) {
  if (base.length >= minimum) return base;
  const now = new Date();
  const queryTokens = parseSearchTokens(elements.tournamentSearch?.value ?? '');
  const searchCache = new Map(state.tournaments.map((tournament) => [tournament.id, searchableTournamentText(tournament)]));
  const fallback = [...state.tournaments].sort((a, b) => {
    const va = tournamentSortValue(a, now, queryTokens, searchCache.get(a.id) ?? '');
    const vb = tournamentSortValue(b, now, queryTokens, searchCache.get(b.id) ?? '');
    return va.statusRank - vb.statusRank
      || va.queryBoost - vb.queryBoost
      || va.distanceRank - vb.distanceRank
      || va.timeRank - vb.timeRank
      || va.name.localeCompare(vb.name, 'de');
  });
  const merged = [...base];
  for (const tournament of fallback) {
    if (merged.some((item) => item.id === tournament.id)) continue;
    merged.push(tournament);
    if (merged.length >= minimum) break;
  }
  return merged;
}

function filterAndSortTournaments(minimum = 0) {
  const queryTokens = parseSearchTokens(elements.tournamentSearch?.value ?? '');
  const now = new Date();
  const selectedDate = parseIsoDate(state.selectedDate);
  const searchCache = new Map(state.tournaments.map((tournament) => [tournament.id, searchableTournamentText(tournament)]));
  const textMatches = state.tournaments.filter((tournament) => {
    const queryState = queryMatchState(searchCache.get(tournament.id) ?? '', queryTokens);
    return queryState.hasMatch;
  });
  const searchBase = textMatches.length ? textMatches : [...state.tournaments];
  const nearbyBase = state.userPosition
    ? (() => {
      const nearby = searchBase.filter((tournament) => {
        const distance = haversineKm(state.userPosition, tournament.geo);
        return distance != null && distance <= NEARBY_RADIUS_KM;
      });
      return nearby.length ? nearby : searchBase;
    })()
    : searchBase;
  const visible = filterBySearchWindow(nearbyBase, selectedDate);
  const sorted = visible.sort((a, b) => {
    const va = tournamentSortValue(a, now, queryTokens, searchCache.get(a.id) ?? '');
    const vb = tournamentSortValue(b, now, queryTokens, searchCache.get(b.id) ?? '');
    return va.statusRank - vb.statusRank
      || va.queryBoost - vb.queryBoost
      || va.distanceRank - vb.distanceRank
      || va.timeRank - vb.timeRank
      || va.name.localeCompare(vb.name, 'de');
  });
  return minimum > 0 ? ensureMinimumTournaments(sorted, minimum) : sorted;
}

function renderTournamentSuggestions() {
  if (!elements.tournamentSuggestions) return;
  const queryTokens = parseSearchTokens(elements.tournamentSearch?.value ?? '');
  if (!queryTokens.length) {
    elements.tournamentSuggestions.innerHTML = '';
    return;
  }
  const suggestions = filterAndSortTournaments(MIN_VISIBLE_TOURNAMENTS).slice(0, MIN_VISIBLE_TOURNAMENTS);
  elements.tournamentSuggestions.innerHTML = suggestions.map((tournament) => {
    const event = tournament.event ?? {};
    return `<button type="button" class="autocomplete-item" data-id="${escapeHtml(tournament.id ?? '')}" role="option">${escapeHtml(event.name ?? 'Turnier')} · ${escapeHtml(formatDateDE(event.date ?? ''))}</button>`;
  }).join('');
}

function renderTournamentCards() {
  if (!elements.tournamentCards) return;
  const now = new Date();
  const tournaments = ensureMinimumTournaments(filterAndSortTournaments(MIN_VISIBLE_TOURNAMENTS), MIN_VISIBLE_TOURNAMENTS);

  if (!tournaments.length) {
    elements.tournamentCards.innerHTML = '<p class="hint">Keine Turniere für diese Suche gefunden.</p>';
    return;
  }

  elements.tournamentCards.innerHTML = tournaments.map((tournament) => {
    const event = tournament.event ?? {};
    const status = tournamentStatus(tournament, now);
    const detailPath = pageUrlWithTournament('turnier.html', tournament.id);
    const detailUrl = new URL(detailPath, location.href).href;
    const schedulePath = pageUrlWithTournament('spielplan.html', tournament.id);
    const distance = formatDistanceLabel(haversineKm(state.userPosition, tournament.geo));
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(detailUrl)}`;

    return `<article class="tournament-card"><div class="tournament-meta"><span class="status-badge status-${status.key}">${escapeHtml(status.label)}</span>${distance ? `<span class="distance-label">${escapeHtml(distance)}</span>` : ''}</div><h3>${escapeHtml(event.name ?? 'Turnier')}</h3><p>${escapeHtml(formatDateTimeDE(event.date ?? '', event.startTime ?? ''))}${event.endTime ? ` – ${escapeHtml(event.endTime)} Uhr` : ''}</p><p class="hint">${escapeHtml(event.location ?? '-')}</p><div class="tournament-actions"><a class="button" href="${escapeHtml(detailPath)}">Startseite öffnen</a><a class="button secondary" href="${escapeHtml(schedulePath)}">Spielplan</a></div><p class="direct-link"><strong>Direktlink:</strong> <a href="${escapeHtml(detailPath)}">${escapeHtml(detailUrl)}</a></p><img class="qr-code" src="${escapeHtml(qrUrl)}" alt="QR-Code für ${escapeHtml(event.name ?? 'Turnier')}" loading="lazy" referrerpolicy="no-referrer" /></article>`;
  }).join('');

  elements.tournamentCards.querySelectorAll('.qr-code').forEach((img) => {
    img.addEventListener('error', () => {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'QR-Code konnte nicht geladen werden. Bitte Direktlink nutzen.';
      img.replaceWith(hint);
    }, { once: true });
  });
}

function chooseDefaultTournamentId() {
  const tournaments = [...state.tournaments];
  const now = new Date();
  tournaments.sort((a, b) => {
    const va = tournamentSortValue(a, now, '');
    const vb = tournamentSortValue(b, now, '');
    return va.statusRank - vb.statusRank || va.timeRank - vb.timeRank;
  });
  return tournaments[0]?.id ?? '';
}

function wireTournamentSelector() {
  elements.tournamentSearch?.addEventListener('input', () => {
    renderTournamentSuggestions();
    renderTournamentCards();
  });
  elements.tournamentDate?.addEventListener('input', () => {
    state.selectedDate = elements.tournamentDate?.value ?? '';
    renderTournamentSuggestions();
    renderTournamentCards();
  });
  elements.tournamentSuggestions?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button || !elements.tournamentSearch) return;
    const id = button.getAttribute('data-id') ?? '';
    const tournament = state.tournaments.find((item) => item.id === id);
    elements.tournamentSearch.value = tournament?.event?.name ?? '';
    elements.tournamentSuggestions.innerHTML = '';
    renderTournamentCards();
  });
}

function requestUserLocation() {
  if (!hasSelectorUi || !navigator.geolocation) {
    if (elements.locationStatus) elements.locationStatus.textContent = 'Kein Geolocation-Support verfügbar – Vorschläge nur nach Zeit.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.userPosition = { lat: position.coords.latitude, lon: position.coords.longitude };
      if (elements.locationStatus) elements.locationStatus.textContent = 'Standort erkannt – Vorschläge sind nach Nähe und Zeit sortiert.';
      renderTournamentCards();
    },
    (error) => {
      if (!elements.locationStatus) return;
      if (error.code === error.PERMISSION_DENIED) {
        elements.locationStatus.textContent = 'Standortfreigabe nicht erteilt – Vorschläge nur nach Zeit sortiert.';
      } else if (error.code === error.TIMEOUT) {
        elements.locationStatus.textContent = 'Standortabfrage ist abgelaufen – Vorschläge nur nach Zeit sortiert.';
      } else {
        elements.locationStatus.textContent = 'Standort konnte nicht bestimmt werden – Vorschläge nur nach Zeit sortiert.';
      }
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
  );
}

function validateTournamentData(tournament) {
  return Boolean(tournament && TOURNAMENT_ID_PATTERN.test(String(tournament.id ?? '')) && tournament.event && Array.isArray(tournament.matches));
}

async function loadJson(path, err) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(err);
  return response.json();
}

async function loadConfigAndTournaments() {
  const [config, tournamentData] = await Promise.all([
    loadJson('./data/config.json', 'Konfiguration konnte nicht geladen werden.'),
    loadJson('./data/tournaments.json', 'Turnierdaten konnten nicht geladen werden.')
  ]);

  state.siteTitle = config.siteTitle ?? '';
  state.tournaments = Array.isArray(tournamentData.tournaments) ? tournamentData.tournaments : [];
  if (!state.tournaments.length || state.tournaments.some((tournament) => !validateTournamentData(tournament))) {
    throw new Error('JSON ungültig: Erwartet wird data/tournaments.json mit id, event und matches je Turnier.');
  }
}

function renderDetailPages() {
  const tournamentId = selectedTournamentIdFromUrl() || chooseDefaultTournamentId();
  const selected = state.tournaments.find((tournament) => tournament.id === tournamentId);
  if (!selected) throw new Error('Turnier nicht gefunden. Bitte über die Turnier-Auswahl starten.');

  state.selectedTournamentId = selected.id;
  state.selectedTournament = selected;

  applyTournamentLinksToNav();
  markActiveNav();
  applyPageMeta(selected.event ?? {});
  renderTournamentInfo(selected);
  populateScheduleFilters();
  renderMatches();
  wireScheduleFilters();
}

function renderSelectorPage() {
  markActiveNav();
  if (elements.tournamentDate && !elements.tournamentDate.value) {
    const today = new Date();
    elements.tournamentDate.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  state.selectedDate = elements.tournamentDate?.value ?? '';
  wireTournamentSelector();
  renderTournamentCards();
  requestUserLocation();
}

function renderInitError(message = 'Unbekannter Fehler') {
  const html = `<p class="hint">${escapeHtml(message)}</p>`;
  const target = [
    elements.scheduleList,
    elements.tournamentCards,
    elements.quickInfoContent,
    elements.orgaInfoContent,
    elements.cateringContent,
    elements.directionsContent,
    elements.fieldLayoutContent,
    elements.kickoffCountdown
  ].find(Boolean);
  if (target) {
    target.innerHTML = html;
    return;
  }
  const main = document.querySelector('main');
  if (main) main.innerHTML = `<section class="card">${html}</section>`;
}

async function init() {
  await loadConfigAndTournaments();
  applySiteConfig();
  if (hasSelectorUi) {
    renderSelectorPage();
    return;
  }
  renderDetailPages();
}

init().catch((error) => {
  renderInitError(error.message);
  console.error(error);
});
