const elements = {
  quickInfoContent: document.querySelector('#quickInfoContent'),
  orgaInfoContent: document.querySelector('#orgaInfoContent'),
  kickoffCountdown: document.querySelector('#kickoffCountdown'),
  cateringContent: document.querySelector('#cateringContent'),
  directionsContent: document.querySelector('#directionsContent'),
  fieldLayoutContent: document.querySelector('#fieldLayoutContent'),
  scheduleList: document.querySelector('#scheduleList'),
  scheduleMeta: document.querySelector('#scheduleMeta'),
  jsonExample: document.querySelector('#jsonExample'),
  fileInput: document.querySelector('#scheduleFile'),
  loadSample: document.querySelector('#loadSample'),
  adminGate: document.querySelector('#adminGate'),
  adminPanel: document.querySelector('#adminPanel'),
  adminLoginForm: document.querySelector('#adminLoginForm'),
  adminPassword: document.querySelector('#adminPassword'),
  adminError: document.querySelector('#adminError'),
  adminLogout: document.querySelector('#adminLogout'),
  jsonFormatSection: document.querySelector('#json-format'),
  filters: {
    field: document.querySelector('#searchField'),
    team: document.querySelector('#searchTeam'),
    club: document.querySelector('#searchClub')
  }
};

const state = { data: null, runtimeData: null, sampleData: null, countdownTimer: null, adminPasswordHash: '', siteTitle: '' };

const hasScheduleUi = Boolean(elements.scheduleList && elements.scheduleMeta);
const hasAdminDataControls = Boolean(elements.fileInput || elements.loadSample);
const ADMIN_SESSION_KEY = 'tip-admin-auth';

async function hashPassword(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function createList(items = []) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function setHtml(node, html) {
  if (node) node.innerHTML = html;
}

function setAdminError(message, hidden = false) {
  if (!elements.adminError) return;
  elements.adminError.textContent = message;
  elements.adminError.hidden = hidden;
}

function kickoffDate(eventData = {}) {
  if (!eventData.date || !eventData.startTime) return null;
  return new Date(`${eventData.date}T${eventData.startTime}:00`);
}

function formatCountdown(targetDate) {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return 'Das erste Spiel hat bereits begonnen.';

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days} Tage, ${hours} Stunden, ${minutes} Minuten, ${seconds} Sekunden`;
}

function renderCountdown(data) {
  if (!elements.kickoffCountdown) return;

  const startDate = kickoffDate(data.event ?? {});
  if (!startDate || Number.isNaN(startDate.getTime())) {
    elements.kickoffCountdown.textContent = 'Kein gültiger Anpfiff in den Daten vorhanden.';
    return;
  }

  const updateCountdown = () => {
    elements.kickoffCountdown.textContent = formatCountdown(startDate);
  };

  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
  }

  updateCountdown();
  state.countdownTimer = window.setInterval(updateCountdown, 1000);
}

function renderInfo(data) {
  setHtml(elements.quickInfoContent, createList(data.quickInfo));

  const trainerMeeting = data.trainerMeeting ?? {};
  const awardCeremony = data.awardCeremony ?? {};
  const awardCeremonyText = awardCeremony.isPlanned
    ? `Ja${awardCeremony.time ? `, geplant um ${awardCeremony.time} Uhr` : ''}${awardCeremony.location ? ` (${awardCeremony.location})` : ''}.`
    : 'Nein.';

  setHtml(
    elements.orgaInfoContent,
    `<p><strong>Trainerbesprechung:</strong> ${trainerMeeting.time ?? '-'} Uhr, ${trainerMeeting.location ?? '-'}</p><p><strong>Siegerehrung:</strong> ${awardCeremonyText}</p>`
  );

  const catering = data.catering ?? {};
  setHtml(
    elements.cateringContent,
    `${createList(catering.offerings)}<p><strong>Zahlung:</strong> ${catering.payment ?? '-'}</p><p><strong>Hinweis:</strong> ${catering.notes ?? '-'}</p>`
  );

  const directions = data.directions ?? {};
  setHtml(
    elements.directionsContent,
    `<p><strong>Adresse:</strong> ${directions.address ?? '-'}</p><p><strong>Parken:</strong> ${directions.parking ?? '-'}</p><p><strong>ÖPNV:</strong> ${directions.publicTransport ?? '-'}</p>`
  );

  const fieldLayout = data.fieldLayout ?? {};
  setHtml(
    elements.fieldLayoutContent,
    `<p>${fieldLayout.summary ?? '-'}</p>${createList((fieldLayout.fields ?? []).map((f) => `${f.field}: ${f.group}`))}`
  );

  renderCountdown(data);
}

function currentFilters() {
  const { field, team, club } = elements.filters;
  return {
    field: field?.value.trim().toLowerCase() ?? '',
    team: team?.value.trim().toLowerCase() ?? '',
    club: club?.value.trim().toLowerCase() ?? ''
  };
}

function matchesFilter(match, query) {
  return (
    (!query.field || match.field.toLowerCase().includes(query.field)) &&
    (!query.team || match.home.team.toLowerCase().includes(query.team) || match.away.team.toLowerCase().includes(query.team)) &&
    (!query.club || match.home.club.toLowerCase().includes(query.club) || match.away.club.toLowerCase().includes(query.club))
  );
}

function renderMatches() {
  if (!hasScheduleUi || !state.data) return;

  const event = state.data.event ?? {};
  const allMatches = state.data.matches ?? [];
  const filtered = allMatches.filter((match) => matchesFilter(match, currentFilters()));

  elements.scheduleMeta.textContent = `${event.name ?? 'Turnier'} · ${event.date ?? '-'} · ${event.startTime ?? '-'} · ${event.location ?? '-'} · ${filtered.length}/${allMatches.length} Spiele`;

  if (!filtered.length) {
    elements.scheduleList.innerHTML = '<p>Keine Spiele mit diesen Filtern gefunden.</p>';
    return;
  }

  elements.scheduleList.innerHTML = filtered
    .map(
      (m) => `<article class="match-card"><div class="match-header"><strong>${m.time}</strong><span>${m.field} · ${m.group}</span></div><p>${m.home.team} (${m.home.club})</p><p>vs.</p><p>${m.away.team} (${m.away.club})</p></article>`
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

async function loadJson(path, errorMessage) {
  let response;
  try {
    response = await fetch(path);
  } catch {
    throw new Error(errorMessage);
  }
  if (!response.ok) throw new Error(errorMessage);
  try {
    return await response.json();
  } catch {
    throw new Error(errorMessage);
  }
}

function mergeDataParts(parts) {
  const merged = {};
  const keyOwners = new Map();

  parts.forEach(({ source, data }) => {
    Object.entries(data).forEach(([key, value]) => {
      if (keyOwners.has(key)) {
        throw new Error(`Datenkonflikt: Schlüssel "${key}" ist doppelt vorhanden (${keyOwners.get(key)} und ${source}).`);
      }
      keyOwners.set(key, source);
      merged[key] = value;
    });
  });

  return merged;
}

async function loadAllData() {
  const requests = {
    config: loadJson(
      './data/config.json',
      'Konfiguration konnte nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    ),
    eventData: loadJson(
      './data/event.json',
      'Event-Daten konnten nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    ),
    cateringData: loadJson(
      './data/catering.json',
      'Verpflegungsdaten konnten nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    ),
    directionsData: loadJson(
      './data/anfahrt.json',
      'Anfahrtsdaten konnten nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    ),
    fieldLayoutData: loadJson(
      './data/spielfeldlayout.json',
      'Spielfeldlayout konnte nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    ),
    scheduleData: loadJson(
      './data/spielplan.json',
      'Spielplandaten konnten nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).'
    )
  };

  const loadedData = Object.fromEntries(
    await Promise.all(Object.entries(requests).map(async ([key, promise]) => [key, await promise]))
  );
  const { config, eventData, cateringData, directionsData, fieldLayoutData, scheduleData } = loadedData;

  const adminPasswordHash = config.adminPasswordHash;
  if (typeof adminPasswordHash !== 'string' || !/^[a-f0-9]{64}$/i.test(adminPasswordHash)) {
    throw new Error('Konfiguration ungültig: data/config.json benötigt ein gültiges Feld "adminPasswordHash" (SHA-256 Hex).');
  }

  state.adminPasswordHash = adminPasswordHash;
  state.siteTitle = config.siteTitle ?? '';
  applySiteConfig();

  return mergeDataParts([
    { source: 'data/spielplan.json', data: scheduleData },
    { source: 'data/event.json', data: eventData },
    { source: 'data/catering.json', data: cateringData },
    { source: 'data/anfahrt.json', data: directionsData },
    { source: 'data/spielfeldlayout.json', data: fieldLayoutData }
  ]);
}

async function loadSampleData() {
  return loadJson('./sample-data.json', 'Beispieldaten konnten nicht geladen werden. Bitte Datei prüfen (vorhanden, gültiges JSON).');
}

function setAdminVisibility(isUnlocked) {
  if (!elements.adminPanel || !elements.adminGate) return;
  elements.adminPanel.hidden = !isUnlocked;
  elements.adminGate.hidden = isUnlocked;
  if (elements.jsonFormatSection) elements.jsonFormatSection.hidden = !isUnlocked;
  if (!isUnlocked && elements.adminPassword) elements.adminPassword.value = '';
  setAdminError('Falsches Passwort.', true);
}

function wireAdminAuth() {
  if (!elements.adminLoginForm) return;

  const isUnlocked = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  setAdminVisibility(isUnlocked);

  elements.adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.adminPasswordHash) {
      setAdminError('Admin-Zugang ist nicht konfiguriert. Bitte data/config.json prüfen.', false);
      return;
    }
    const enteredPassword = elements.adminPassword?.value ?? '';
    const granted = (await hashPassword(enteredPassword)) === state.adminPasswordHash;

    if (!granted) {
      setAdminError('Falsches Passwort.', false);
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    setAdminVisibility(true);
  });

  elements.adminLogout?.addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminVisibility(false);
  });
}

function wireAdminDataControls() {
  if (!hasAdminDataControls) return;
  elements.loadSample?.addEventListener('click', async () => {
    try {
      if (!state.sampleData) {
        state.sampleData = await loadSampleData();
      }
      setData(state.sampleData);
    } catch (error) {
      alert(error.message);
    }
  });
  elements.fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setData(JSON.parse(await file.text()));
    } catch {
      alert('Datei konnte nicht gelesen werden. Bitte gültiges JSON wählen.');
    } finally {
      elements.fileInput.value = '';
    }
  });
}

function wireScheduleFilters() {
  if (!hasScheduleUi) return;
  Object.values(elements.filters).forEach((node) => node?.addEventListener('input', renderMatches));
}

async function init() {
  state.runtimeData = await loadAllData();
  setData(state.runtimeData);
  wireAdminAuth();
  wireAdminDataControls();
  wireScheduleFilters();
}

init().catch((error) => {
  if (elements.scheduleMeta) elements.scheduleMeta.textContent = error.message;
  if (elements.kickoffCountdown) elements.kickoffCountdown.textContent = error.message;
  if (elements.adminError) setAdminError(error.message);
  const hasNoErrorDisplay = !elements.scheduleMeta && !elements.kickoffCountdown && !elements.adminError;
  if (hasNoErrorDisplay) alert(error.message);
  console.error(error);
});
