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
  filters: {
    field: document.querySelector('#searchField'),
    team: document.querySelector('#searchTeam'),
    club: document.querySelector('#searchClub')
  }
};

const state = { data: null, sampleData: null, countdownTimer: null };

const hasScheduleUi = Boolean(elements.scheduleList && elements.scheduleMeta);

function createList(items = []) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function setHtml(node, html) {
  if (node) node.innerHTML = html;
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

function setData(data) {
  if (!validateData(data)) {
    alert('JSON ungültig: Erwartet wird mindestens "event" und "matches".');
    return;
  }
  state.data = data;
  renderInfo(data);
  renderMatches();
}

async function loadSampleData() {
  const response = await fetch('./sample-data.json');
  if (!response.ok) throw new Error('Beispieldaten konnten nicht geladen werden.');
  return response.json();
}

function wireScheduleEvents() {
  if (!hasScheduleUi) return;

  elements.loadSample?.addEventListener('click', () => setData(state.sampleData));

  Object.values(elements.filters).forEach((node) => node?.addEventListener('input', renderMatches));

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

async function init() {
  state.sampleData = await loadSampleData();
  setData(state.sampleData);
  if (elements.jsonExample) elements.jsonExample.textContent = JSON.stringify(state.sampleData, null, 2);
  wireScheduleEvents();
}

init().catch((error) => {
  if (elements.scheduleMeta) elements.scheduleMeta.textContent = error.message;
  if (elements.kickoffCountdown) elements.kickoffCountdown.textContent = error.message;
});
