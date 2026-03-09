// Vocabilly client logic with Supabase backend.

let supabaseClient = null;
let vocabList = [];
let sessionCards = [];
let correctCards = new Set();
let currentIndex = 0;
let sessions = {};
let currentSessionName = null;
let answerShown = false;

const trainingSession = document.getElementById('training-session');
const wordDiv = document.getElementById('word');
const userInput = document.getElementById('user-input');
const btnCorrect = document.getElementById('btn-correct');
const btnWrong = document.getElementById('btn-wrong');
const feedbackDiv = document.getElementById('feedback');
const progressDiv = document.getElementById('progress');
const sessionEndDiv = document.getElementById('session-end');
const finalScoreDiv = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const sessionsUl = document.getElementById('sessions-ul');
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
    progressDiv.textContent = `Fortschritt: ${correctCards.size}/${vocabList.length}` +
        (currentSessionName ? ` (${currentSessionName})` : '');
}

function updateAuthUi(isLoggedIn, message) {
    loginBtn.disabled = isLoggedIn;
    logoutBtn.disabled = !isLoggedIn;
    loadSessionsBtn.disabled = !isLoggedIn;
    authStatus.textContent = message;
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
    currentSessionName = null;
    vocabList = [];
    sessionCards = [];
    correctCards = new Set();
    saveProgress();
    updateProgress();
    trainingSession.style.display = 'none';
    sessionEndDiv.style.display = 'none';
}

function renderSessionsList() {
    sessionsUl.innerHTML = '';
    const names = Object.keys(sessions);

    if (!names.length) {
        const li = document.createElement('li');
        li.textContent = 'Keine Sessions geladen.';
        li.style.color = '#777';
        sessionsUl.appendChild(li);
        return;
    }

    names.forEach(name => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="font-weight:500;">${name}</span>
            <button data-name="${name}" class="start-session-btn" style="margin-left:8px;">Starten</button>
            <span style="color:#888; margin-left:8px;">(${sessions[name].length} Vokabeln)</span>
        `;
        sessionsUl.appendChild(li);
    });

    sessionsUl.querySelectorAll('.start-session-btn').forEach(btn => {
        btn.onclick = async () => {
            try {
                await startTrainingSession(btn.dataset.name);
            } catch (error) {
                alert(error.message);
            }
        };
    });
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
    } catch (error) {
        supabaseClient = null;
        updateAuthUi(false, 'Nicht angemeldet');
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
    cancelSessionBtn.style.display = 'block';
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

function endSession() {
    trainingSession.style.display = 'none';
    sessionEndDiv.style.display = 'block';
    finalScoreDiv.textContent = `Alle Vokabeln richtig beantwortet! (${vocabList.length}/${vocabList.length})`;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    cancelSessionBtn.style.display = 'none';
    correctCards.clear();
    saveProgress();
    updateProgress();
}

async function startTrainingSession(name) {
    const selected = sessions[name];
    if (!Array.isArray(selected) || !selected.length) {
        throw new Error('Session ist leer oder nicht verfuegbar.');
    }

    vocabList = selected;
    currentSessionName = name;
    correctCards = new Set();
    saveProgress();
    currentIndex = 0;

    sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
    if (!sessionCards.length) {
        alert('Keine Karten zum Ueben vorhanden.');
        return;
    }

    trainingSession.style.display = 'block';
    sessionEndDiv.style.display = 'none';
    showCard();
    updateProgress();
}

loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', () => {
    logout().catch(error => alert(error.message));
});
loadSessionsBtn.addEventListener('click', async () => {
    try {
        await loadSessionsFromSupabase();
    } catch (error) {
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

cancelSessionBtn.addEventListener('click', () => {
    trainingSession.style.display = 'none';
    sessionEndDiv.style.display = 'none';
    vocabList = [];
    sessionCards = [];
    correctCards = new Set();
    currentSessionName = null;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    cancelSessionBtn.style.display = 'none';
    saveProgress();
    updateProgress();
});

restartBtn.addEventListener('click', () => {
    correctCards.clear();
    saveProgress();
    if (currentSessionName) {
        startTrainingSession(currentSessionName).catch(error => alert(error.message));
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    loadPersistedCredentials();
    loadProgress();
    updateProgress();
    renderSessionsList();

    if (supabaseUrlInput.value && supabaseKeyInput.value) {
        try {
            supabaseClient = createClientFromInput();
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session) {
                updateAuthUi(true, 'Angemeldet. Du kannst jetzt Sessions laden.');
                await loadSessionsFromSupabase();
                return;
            }
        } catch (error) {
            supabaseClient = null;
        }
    }

    updateAuthUi(false, 'Nicht angemeldet');
});
