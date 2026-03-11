// Vocabilly client logic with Supabase backend, admin editor, and history tracking.

let supabaseClient = null;
let vocabList = [];
let sessionCards = [];
let correctCards = new Set();
let currentIndex = 0;
let sessions = {};
let currentSessionName = null;
let currentTrainingSessionNames = [];
let currentHistoryId = null;
let historyFinalized = false;
let answerShown = false;
let isAdminUser = false;
let selectedSessionNames = new Set();

const trainingSession = document.getElementById('training-session');
const wordDiv = document.getElementById('word');
const userInput = document.getElementById('user-input');
const btnCorrect = document.getElementById('btn-correct');
const btnWrong = document.getElementById('btn-wrong');
const feedbackDiv = document.getElementById('feedback');
const progressDiv = document.getElementById('progress');
const progressRow = document.getElementById('progress-row');
const progressBarFill = document.getElementById('progress-bar-fill');
const sessionEndDiv = document.getElementById('session-end');
const finalScoreDiv = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const sessionsUl = document.getElementById('sessions-ul');
const startSelectedSessionsBtn = document.getElementById('start-selected-sessions-btn');
const showAnswerBtn = document.getElementById('show-answer');
const cancelSessionBtn = document.getElementById('cancel-session');
const answerButtonsDiv = document.getElementById('answer-buttons');

const supabaseUrlInput = document.getElementById('supabase-url-input');
const supabaseKeyInput = document.getElementById('supabase-key-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loadSessionsBtn = document.getElementById('load-sessions-btn');
const authStatus = document.getElementById('auth-status');

const adminPanel = document.getElementById('admin-panel');
const adminSessionNameInput = document.getElementById('admin-session-name-input');
const adminExistingSessionSelect = document.getElementById('admin-existing-session-select');
const adminLoadSessionBtn = document.getElementById('admin-load-session-btn');
const adminDeleteSessionBtn = document.getElementById('admin-delete-session-btn');
const adminJsonInput = document.getElementById('admin-json-input');
const adminSaveSessionBtn = document.getElementById('admin-save-session-btn');
const adminSaveGroupedBtn = document.getElementById('admin-save-grouped-btn');
const adminStatus = document.getElementById('admin-status');

const openHistoryBtn = document.getElementById('open-history-btn');
const backToSessionsBtn = document.getElementById('back-to-sessions-btn');
const historyList = document.getElementById('history-list');
const historyStatus = document.getElementById('history-status');

const viewLogin = document.getElementById('auth-box');
const viewSessions = document.getElementById('sessions-list');
const viewAdmin = document.getElementById('admin-panel');
const viewHistory = document.getElementById('history-view');

function setView(mode) {
    if (mode === 'login') {
        viewLogin.style.display = 'block';
        viewSessions.style.display = 'none';
        viewAdmin.style.display = 'none';
        viewHistory.style.display = 'none';
        trainingSession.style.display = 'none';
        sessionEndDiv.style.display = 'none';
        progressRow.style.display = 'none';
        return;
    }

    if (mode === 'sessions') {
        viewLogin.style.display = 'none';
        viewSessions.style.display = 'block';
        viewAdmin.style.display = isAdminUser ? 'block' : 'none';
        viewHistory.style.display = 'none';
        trainingSession.style.display = 'none';
        sessionEndDiv.style.display = 'none';
        progressRow.style.display = 'none';
        return;
    }

    if (mode === 'history') {
        viewLogin.style.display = 'none';
        viewSessions.style.display = 'none';
        viewAdmin.style.display = 'none';
        viewHistory.style.display = 'block';
        trainingSession.style.display = 'none';
        sessionEndDiv.style.display = 'none';
        progressRow.style.display = 'none';
        return;
    }

    if (mode === 'training') {
        viewLogin.style.display = 'none';
        viewSessions.style.display = 'none';
        viewAdmin.style.display = 'none';
        viewHistory.style.display = 'none';
        trainingSession.style.display = 'block';
        sessionEndDiv.style.display = 'none';
        progressRow.style.display = 'flex';
        return;
    }

    if (mode === 'end') {
        viewLogin.style.display = 'none';
        viewSessions.style.display = 'none';
        viewAdmin.style.display = 'none';
        viewHistory.style.display = 'none';
        trainingSession.style.display = 'none';
        sessionEndDiv.style.display = 'block';
        progressRow.style.display = 'flex';
    }
}

function saveProgress() {
    localStorage.setItem('correctCards', JSON.stringify(Array.from(correctCards)));
}

function loadProgress() {
    const data = localStorage.getItem('correctCards');
    if (data) {
        correctCards = new Set(JSON.parse(data));
    }
}

function updateProgress() {
    const total = vocabList.length;
    const current = correctCards.size;
    progressDiv.textContent = `Fortschritt: ${current}/${total}` +
        (currentSessionName ? ` (${currentSessionName})` : '');

    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    progressBarFill.style.width = `${percent}%`;
}

function updateAuthUi(isLoggedIn, message) {
    loginBtn.disabled = isLoggedIn;
    logoutBtn.disabled = !isLoggedIn;
    loadSessionsBtn.disabled = !isLoggedIn;
    authStatus.textContent = message;
}

function updateAdminUi(enabled, message) {
    isAdminUser = enabled;
    adminStatus.textContent = message;
}

function updateStartSelectedButtonState() {
    startSelectedSessionsBtn.disabled = selectedSessionNames.size === 0;
}

function persistCredentials() {
    localStorage.setItem('supabaseUrl', supabaseUrlInput.value.trim());
    localStorage.setItem('supabaseAnonKey', supabaseKeyInput.value.trim());
    localStorage.setItem('supabaseEmail', emailInput.value.trim());
    localStorage.setItem('supabasePassword', passwordInput.value);
}

function loadPersistedCredentials() {
    supabaseUrlInput.value = localStorage.getItem('supabaseUrl') || '';
    supabaseKeyInput.value = localStorage.getItem('supabaseAnonKey') || '';
    emailInput.value = localStorage.getItem('supabaseEmail') || '';
    passwordInput.value = localStorage.getItem('supabasePassword') || '';
}

function createClientFromInput() {
    const url = supabaseUrlInput.value.trim();
    const anonKey = supabaseKeyInput.value.trim();

    if (!url || !anonKey) {
        throw new Error('Bitte Supabase URL und Anon Key eingeben.');
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error('Supabase Bibliothek konnte nicht geladen werden.');
    }

    supabaseClient = window.supabase.createClient(url, anonKey);
    return supabaseClient;
}

function resetTrainingState() {
    sessions = {};
    selectedSessionNames = new Set();
    currentSessionName = null;
    currentTrainingSessionNames = [];
    currentHistoryId = null;
    historyFinalized = false;
    vocabList = [];
    sessionCards = [];
    correctCards = new Set();
    saveProgress();
    updateProgress();
    updateStartSelectedButtonState();
}

function refreshAdminSessionSelect() {
    adminExistingSessionSelect.innerHTML = '<option value="">Bitte waehlen</option>';

    Object.keys(sessions)
        .sort((a, b) => a.localeCompare(b))
        .forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            adminExistingSessionSelect.appendChild(option);
        });
}

function renderSessionsList() {
    sessionsUl.innerHTML = '';
    const names = Object.keys(sessions);
    selectedSessionNames = new Set([...selectedSessionNames].filter(name => names.includes(name)));

    if (!names.length) {
        const li = document.createElement('li');
        li.textContent = 'Keine Sessions geladen.';
        li.style.color = '#777';
        sessionsUl.appendChild(li);
        refreshAdminSessionSelect();
        updateStartSelectedButtonState();
        return;
    }

    names.sort((a, b) => a.localeCompare(b)).forEach(name => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';

        const left = document.createElement('label');
        left.style.display = 'flex';
        left.style.alignItems = 'center';
        left.style.gap = '8px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'session-checkbox';
        checkbox.dataset.name = name;
        checkbox.checked = selectedSessionNames.has(name);

        const title = document.createElement('span');
        title.style.fontWeight = '500';
        title.textContent = name;

        left.appendChild(checkbox);
        left.appendChild(title);

        const count = document.createElement('span');
        count.style.color = '#888';
        count.textContent = `(${sessions[name].length} Vokabeln)`;

        li.appendChild(left);
        li.appendChild(count);
        sessionsUl.appendChild(li);
    });

    sessionsUl.querySelectorAll('.session-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const name = checkbox.dataset.name;
            if (checkbox.checked) {
                selectedSessionNames.add(name);
            } else {
                selectedSessionNames.delete(name);
            }
            updateStartSelectedButtonState();
        });
    });

    refreshAdminSessionSelect();
    updateStartSelectedButtonState();
}

function formatTimestamp(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleString();
}

function renderHistory(entries) {
    historyList.innerHTML = '';

    if (!entries || !entries.length) {
        historyStatus.textContent = 'Keine Historie vorhanden.';
        return;
    }

    historyStatus.textContent = `${entries.length} Eintrag(e)`;

    entries.forEach(entry => {
        const li = document.createElement('li');
        const sessionNames = Array.isArray(entry.session_names)
            ? entry.session_names.join(', ')
            : '-';
        const started = formatTimestamp(entry.started_at);
        const ended = formatTimestamp(entry.ended_at);
        const status = entry.completed
            ? 'Abgeschlossen'
            : `Abgebrochen (${entry.correct_count}/${entry.total_count})`;

        li.innerHTML = `
            <div><strong>${sessionNames}</strong></div>
            <div style="color:#666;">Start: ${started}</div>
            <div style="color:#666;">Ende: ${ended}</div>
            <div>${status}</div>
        `;
        historyList.appendChild(li);
    });
}

async function loadHistory() {
    historyStatus.textContent = 'Lade Historie...';
    historyList.innerHTML = '';

    const client = await ensureClientAndSession();
    const { data, error } = await client
        .from('session_history')
        .select('id, session_names, total_count, correct_count, completed, started_at, ended_at')
        .order('started_at', { ascending: false });

    if (error) {
        historyStatus.textContent = error.message || 'Historie konnte nicht geladen werden.';
        return;
    }

    renderHistory(data || []);
}

async function startHistoryEntry(sessionNames) {
    const client = await ensureClientAndSession();
    const userId = await getCurrentUserId();
    const payload = {
        user_id: userId,
        session_names: sessionNames,
        total_count: vocabList.length,
        correct_count: 0,
        completed: false,
        started_at: new Date().toISOString(),
        ended_at: null
    };

    const { data, error } = await client
        .from('session_history')
        .insert(payload)
        .select('id')
        .single();

    if (error) {
        currentHistoryId = null;
        historyFinalized = false;
        return;
    }

    currentHistoryId = data ? data.id : null;
    historyFinalized = false;
}

async function finalizeHistoryEntry(completed, correctCount, totalCount) {
    if (!currentHistoryId) {
        return;
    }
    if (historyFinalized) {
        return;
    }

    const resolvedCorrect = typeof correctCount === 'number' ? correctCount : correctCards.size;
    const resolvedTotal = typeof totalCount === 'number' ? totalCount : vocabList.length;

    const client = await ensureClientAndSession();
    const payload = {
        correct_count: resolvedCorrect,
        total_count: resolvedTotal,
        completed,
        ended_at: new Date().toISOString()
    };

    await client
        .from('session_history')
        .update(payload)
        .eq('id', currentHistoryId);

    historyFinalized = true;
}

async function ensureClientAndSession() {
    const client = supabaseClient || createClientFromInput();
    const { data, error } = await client.auth.getSession();

    if (error) {
        throw new Error(error.message || 'Session konnte nicht geprueft werden.');
    }

    if (!data.session) {
        throw new Error('Nicht angemeldet. Bitte zuerst anmelden.');
    }

    return client;
}

async function getCurrentUserId() {
    const client = await ensureClientAndSession();
    const { data, error } = await client.auth.getSession();
    if (error || !data.session || !data.session.user) {
        throw new Error('Benutzer konnte nicht ermittelt werden.');
    }
    return data.session.user.id;
}

async function loadSessionsFromSupabase() {
    const client = await ensureClientAndSession();

    const { data, error } = await client
        .from('sessions')
        .select('name, words')
        .order('name', { ascending: true });

    if (error) {
        throw new Error(error.message || 'Sessions konnten nicht geladen werden.');
    }

    sessions = {};
    (data || []).forEach(row => {
        const words = Array.isArray(row.words) ? row.words : [];
        sessions[row.name] = words;
    });

    renderSessionsList();
}

async function refreshAdminAccess() {
    try {
        const client = await ensureClientAndSession();
        const { data: userData, error: userError } = await client.auth.getUser();

        if (userError) {
            throw new Error(userError.message || 'Benutzer konnte nicht geladen werden.');
        }

        const email = userData.user && userData.user.email;
        if (!email) {
            updateAdminUi(false, 'Kein Adminzugang.');
            return;
        }

        const { count, error } = await client
            .from('app_admins')
            .select('*', { head: true, count: 'exact' })
            .eq('email', email);

        if (error) {
            updateAdminUi(false, 'Adminpruefung fehlgeschlagen (app_admins Tabelle/POLICY pruefen).');
            return;
        }

        if ((count || 0) > 0) {
            updateAdminUi(true, `Admin aktiv (${email})`);
        } else {
            updateAdminUi(false, `Kein Adminzugang fuer ${email}`);
        }
    } catch (error) {
        updateAdminUi(false, 'Adminbereich nicht aktiv');
    }
}

function parseWordsFromJsonInput(rawText) {
    const trimmed = rawText.trim();
    if (!trimmed) {
        throw new Error('Bitte JSON fuer die Session einfuegen.');
    }

    // Allow trailing commas in pasted JSON snippets.
    const sanitized = trimmed.replace(/,\s*([}\]])/g, '$1');
    let parsed;

    try {
        parsed = JSON.parse(sanitized);
    } catch (error) {
        throw new Error('JSON ist ungueltig. Bitte das Array-Format pruefen.');
    }

    if (!Array.isArray(parsed)) {
        throw new Error('JSON muss ein Array sein.');
    }

    const normalized = parsed.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`Eintrag ${index + 1} ist kein Objekt.`);
        }

        const lesson = typeof item.lesson === 'string' ? item.lesson.trim() : '';
        const section = typeof item.section === 'string' ? item.section.trim() : '';
        const de = typeof item.de === 'string' ? item.de.trim() : '';
        const en = typeof item.en === 'string' ? item.en.trim() : '';
        const fr = typeof item.fr === 'string' ? item.fr.trim() : '';

        if (!de) {
            throw new Error(`Eintrag ${index + 1} hat kein Feld "de".`);
        }

        if (!en && !fr) {
            throw new Error(`Eintrag ${index + 1} braucht "en" oder "fr".`);
        }

        const normalizedItem = { lesson, section, de };
        if (en) normalizedItem.en = en;
        if (fr) normalizedItem.fr = fr;
        return normalizedItem;
    });

    if (!normalized.length) {
        throw new Error('Die Session ist leer.');
    }

    return normalized;
}

async function saveSessionFromAdminEditor() {
    if (!isAdminUser) {
        throw new Error('Nur Admins koennen Sessions speichern.');
    }

    const sessionName = adminSessionNameInput.value.trim();
    if (!sessionName) {
        throw new Error('Bitte Session-Name eingeben.');
    }

    const words = parseWordsFromJsonInput(adminJsonInput.value);
    const client = await ensureClientAndSession();

    const { error } = await client
        .from('sessions')
        .upsert({ name: sessionName, words }, { onConflict: 'name' });

    if (error) {
        throw new Error(error.message || 'Session konnte nicht gespeichert werden.');
    }

    sessions[sessionName] = words;
    renderSessionsList();
    adminExistingSessionSelect.value = sessionName;
    adminStatus.textContent = `Session gespeichert: ${sessionName} (${words.length} Vokabeln)`;
}

function groupWordsByLessonSection(words) {
    const groups = {};

    words.forEach((word, index) => {
        const lesson = (word.lesson || '').trim();
        const section = (word.section || '').trim();

        let sessionName = '';
        if (lesson && section) {
            sessionName = `${lesson}-${section}`;
        } else if (lesson) {
            sessionName = lesson;
        } else if (section) {
            sessionName = section;
        } else {
            sessionName = 'Ungrouped';
        }

        if (!groups[sessionName]) {
            groups[sessionName] = [];
        }
        groups[sessionName].push(words[index]);
    });

    return groups;
}

async function saveGroupedSessionsFromAdminEditor() {
    if (!isAdminUser) {
        throw new Error('Nur Admins koennen Sessions speichern.');
    }

    const words = parseWordsFromJsonInput(adminJsonInput.value);
    const groups = groupWordsByLessonSection(words);
    const names = Object.keys(groups);
    if (!names.length) {
        throw new Error('Keine Gruppen aus dem JSON erzeugt.');
    }

    const payload = names.map(name => ({ name, words: groups[name] }));
    const client = await ensureClientAndSession();

    const { error } = await client
        .from('sessions')
        .upsert(payload, { onConflict: 'name' });

    if (error) {
        throw new Error(error.message || 'Gruppierte Sessions konnten nicht gespeichert werden.');
    }

    names.forEach(name => {
        sessions[name] = groups[name];
    });
    renderSessionsList();
    adminStatus.textContent = `Gespeichert: ${names.length} Session(s) (${names.join(', ')})`;
}

function loadSessionIntoAdminEditor() {
    if (!isAdminUser) {
        alert('Nur Admins koennen Sessions bearbeiten.');
        return;
    }

    const selected = adminExistingSessionSelect.value.trim();
    if (!selected) {
        alert('Bitte zuerst eine bestehende Session auswaehlen.');
        return;
    }

    const words = sessions[selected];
    if (!Array.isArray(words)) {
        alert('Session konnte nicht geladen werden.');
        return;
    }

    adminSessionNameInput.value = selected;
    adminJsonInput.value = JSON.stringify(words, null, 2);
    adminStatus.textContent = `Session geladen: ${selected}`;
}

async function deleteSelectedSessionFromAdmin() {
    if (!isAdminUser) {
        throw new Error('Nur Admins koennen Sessions loeschen.');
    }

    const selected = adminExistingSessionSelect.value.trim() || adminSessionNameInput.value.trim();
    if (!selected) {
        throw new Error('Bitte Session zum Loeschen auswaehlen oder Namen eingeben.');
    }

    const client = await ensureClientAndSession();
    const { error } = await client
        .from('sessions')
        .delete()
        .eq('name', selected);

    if (error) {
        throw new Error(error.message || 'Session konnte nicht geloescht werden.');
    }

    delete sessions[selected];
    selectedSessionNames.delete(selected);
    renderSessionsList();

    if (currentTrainingSessionNames.includes(selected)) {
        trainingSession.style.display = 'none';
        sessionEndDiv.style.display = 'none';
        currentSessionName = null;
        currentTrainingSessionNames = [];
        vocabList = [];
        sessionCards = [];
        correctCards = new Set();
        saveProgress();
        updateProgress();
        setView('sessions');
    }

    adminSessionNameInput.value = '';
    adminJsonInput.value = '';
    adminStatus.textContent = `Session geloescht: ${selected}`;
}

async function login() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        alert('Bitte E-Mail und Passwort eingeben.');
        return;
    }

    try {
        const client = createClientFromInput();
        persistCredentials();

        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
            throw new Error(error.message || 'Anmeldung fehlgeschlagen.');
        }

        updateAuthUi(true, 'Angemeldet. Du kannst jetzt Sessions laden.');
        await loadSessionsFromSupabase();
        await refreshAdminAccess();
        setView('sessions');
    } catch (error) {
        supabaseClient = null;
        updateAuthUi(false, 'Nicht angemeldet');
        updateAdminUi(false, 'Adminbereich nicht aktiv');
        setView('login');
        alert(error.message);
    }
}

async function logout() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    } catch (error) {
        // Ignore sign-out errors and still clear local UI state.
    }

    supabaseClient = null;
    resetTrainingState();
    renderSessionsList();
    updateAuthUi(false, 'Nicht angemeldet');
    updateAdminUi(false, 'Adminbereich nicht aktiv');
    adminJsonInput.value = '';
    adminSessionNameInput.value = '';
    setView('login');
}

function showCard() {
    if (!sessionCards.length) {
        wordDiv.textContent = '';
        feedbackDiv.textContent = '';
        return;
    }

    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= sessionCards.length) currentIndex = 0;

    const card = sessionCards[currentIndex];
    if (!card || typeof card.de !== 'string' || card.de.trim() === '') {
        wordDiv.textContent = 'Keine Vokabel vorhanden';
        feedbackDiv.textContent = '';
        return;
    }

    wordDiv.textContent = card.de;
    userInput.value = '';
    feedbackDiv.textContent = '';
    btnCorrect.classList.remove('selected');
    btnWrong.classList.remove('selected');
    showAnswerBtn.disabled = false;
    showAnswerBtn.style.display = 'block';
    answerButtonsDiv.style.display = 'none';
    answerShown = false;
}

function nextCard() {
    currentIndex += 1;
    if (currentIndex >= sessionCards.length) {
        sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
        currentIndex = 0;
        if (!sessionCards.length) {
            endSession();
            return;
        }
    }
    showCard();
    updateProgress();
}

async function endSession() {
    finalScoreDiv.textContent = `Alle Vokabeln richtig beantwortet! (${vocabList.length}/${vocabList.length})`;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    const finalCorrect = correctCards.size;
    const finalTotal = vocabList.length;
    await finalizeHistoryEntry(true, finalCorrect, finalTotal);
    correctCards.clear();
    saveProgress();
    updateProgress();
    setView('end');
}

async function startTrainingSession(name) {
    await startTrainingSessionsByNames([name]);
}

async function startTrainingSessionsByNames(names) {
    if (!Array.isArray(names) || names.length === 0) {
        throw new Error('Bitte mindestens eine Session waehlen.');
    }

    const combined = [];
    names.forEach(name => {
        const selected = sessions[name];
        if (Array.isArray(selected) && selected.length) {
            combined.push(...selected);
        }
    });

    if (!combined.length) {
        throw new Error('Die ausgewaehlten Sessions sind leer oder nicht verfuegbar.');
    }

    vocabList = combined;
    currentTrainingSessionNames = [...names];
    currentSessionName = names.length === 1 ? names[0] : `${names.length} Sessions`;
    historyFinalized = false;
    correctCards = new Set();
    saveProgress();
    currentIndex = 0;

    sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
    if (!sessionCards.length) {
        alert('Keine Karten zum Ueben vorhanden.');
        return;
    }

    showCard();
    updateProgress();
    setView('training');
    await startHistoryEntry(currentTrainingSessionNames);
}

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', () => {
    logout().catch(error => alert(error.message));
});
loadSessionsBtn.addEventListener('click', async () => {
    try {
        await loadSessionsFromSupabase();
        await refreshAdminAccess();
    } catch (error) {
        alert(error.message);
    }
});
startSelectedSessionsBtn.addEventListener('click', async () => {
    try {
        await startTrainingSessionsByNames([...selectedSessionNames]);
    } catch (error) {
        alert(error.message);
    }
});

openHistoryBtn.addEventListener('click', async () => {
    try {
        await loadHistory();
        setView('history');
    } catch (error) {
        alert(error.message);
    }
});
backToSessionsBtn.addEventListener('click', () => {
    setView('sessions');
});

adminLoadSessionBtn.addEventListener('click', loadSessionIntoAdminEditor);
adminSaveSessionBtn.addEventListener('click', async () => {
    try {
        await saveSessionFromAdminEditor();
    } catch (error) {
        adminStatus.textContent = error.message;
        alert(error.message);
    }
});
adminSaveGroupedBtn.addEventListener('click', async () => {
    try {
        await saveGroupedSessionsFromAdminEditor();
    } catch (error) {
        adminStatus.textContent = error.message;
        alert(error.message);
    }
});
adminDeleteSessionBtn.addEventListener('click', async () => {
    try {
        await deleteSelectedSessionFromAdmin();
    } catch (error) {
        adminStatus.textContent = error.message;
        alert(error.message);
    }
});

userInput.addEventListener('input', () => {
    if (!answerShown) {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.remove('selected');
    }
});

showAnswerBtn.addEventListener('click', () => {
    if (!sessionCards.length) return;

    answerShown = true;
    showAnswerBtn.disabled = true;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'flex';

    const card = sessionCards[currentIndex];
    const correctAnswer = (typeof card.fr === 'string' && card.fr) ? card.fr : (card.en || '');
    const answer = userInput.value.trim();

    if (answer && answer.toLowerCase() === correctAnswer.toLowerCase()) {
        btnCorrect.classList.add('selected');
        btnWrong.classList.remove('selected');
        feedbackDiv.textContent = `Richtig! Antwort: ${correctAnswer}`;
    } else if (answer) {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.add('selected');
        feedbackDiv.textContent = `Falsch! Antwort: ${correctAnswer}`;
    } else {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.remove('selected');
        feedbackDiv.textContent = `Antwort: ${correctAnswer}`;
    }
});

btnCorrect.addEventListener('click', () => {
    if (!sessionCards.length) return;

    const card = sessionCards[currentIndex];
    const correctAnswer = (typeof card.fr === 'string' && card.fr) ? card.fr : (card.en || '');
    const idx = vocabList.findIndex(v =>
        v.de === card.de &&
        ((v.fr && v.fr === correctAnswer) || (v.en && v.en === correctAnswer))
    );

    if (idx >= 0) {
        correctCards.add(idx);
        saveProgress();
        updateProgress();
    }

    nextCard();
});

btnWrong.addEventListener('click', () => {
    if (!sessionCards.length) return;

    const card = sessionCards[currentIndex];
    const correctAnswer = (typeof card.fr === 'string' && card.fr) ? card.fr : (card.en || '');
    feedbackDiv.textContent = `Richtige Antwort: ${correctAnswer}`;
    setTimeout(nextCard, 1200);
});

cancelSessionBtn.addEventListener('click', async () => {
    if (sessionEndDiv.style.display === 'block') {
        setView('sessions');
        return;
    }
    const finalCorrect = correctCards.size;
    const finalTotal = vocabList.length;
    vocabList = [];
    sessionCards = [];
    correctCards = new Set();
    currentSessionName = null;
    currentTrainingSessionNames = [];
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    saveProgress();
    updateProgress();
    await finalizeHistoryEntry(false, finalCorrect, finalTotal);
    setView('sessions');
});

restartBtn.addEventListener('click', () => {
    correctCards.clear();
    saveProgress();
    if (currentTrainingSessionNames.length) {
        startTrainingSessionsByNames(currentTrainingSessionNames).catch(error => alert(error.message));
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    loadPersistedCredentials();
    loadProgress();
    updateProgress();
    renderSessionsList();
    updateAdminUi(false, 'Adminbereich nicht aktiv');
    setView('login');

    if (supabaseUrlInput.value && supabaseKeyInput.value) {
        try {
            supabaseClient = createClientFromInput();
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session) {
                updateAuthUi(true, 'Angemeldet. Du kannst jetzt Sessions laden.');
                await loadSessionsFromSupabase();
                await refreshAdminAccess();
                setView('sessions');
                return;
            }
        } catch (error) {
            supabaseClient = null;
        }
    }

    updateAuthUi(false, 'Nicht angemeldet');
});
