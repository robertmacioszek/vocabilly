// Vocabulary Trainer App

let vocabList = [];
let sessionCards = [];
let correctCards = new Set();
let currentIndex = 0;
let sessions = {}; // {sessionName: vocabList}
let currentSessionName = null;

// Load from LocalStorage
function loadVocab() {
    const data = localStorage.getItem('vocabList');
    if (data) vocabList = JSON.parse(data);
}
function saveVocab() {
    localStorage.setItem('vocabList', JSON.stringify(vocabList));
}
function saveProgress() {
    localStorage.setItem('correctCards', JSON.stringify(Array.from(correctCards)));
}
function loadProgress() {
    const data = localStorage.getItem('correctCards');
    if (data) correctCards = new Set(JSON.parse(data));
}

// Session-Handling
function loadSessions() {
    const data = localStorage.getItem('sessions');
    sessions = data ? JSON.parse(data) : {};
}
function saveSessions() {
    localStorage.setItem('sessions', JSON.stringify(sessions));
}
function renderSessionsList() {
    sessionsUl.innerHTML = '';
    Object.keys(sessions).forEach(name => {
        const li = document.createElement('li');
        li.style.marginBottom = '8px';
        li.innerHTML = `
            <span style="font-weight:500;">${name}</span>
            <button data-name="${name}" class="start-session-btn" style="margin-left:8px;">Starten</button>
            <button data-name="${name}" class="delete-session-btn" style="margin-left:4px;">Löschen</button>
            <button data-name="${name}" class="export-session-btn" style="margin-left:4px;">Exportieren</button>
            <span style="color:#888; margin-left:8px;">(${sessions[name].length} Vokabeln)</span>
        `;
        sessionsUl.appendChild(li);
    });
    // Event delegation für Start/Löschen/Exportieren
    sessionsUl.querySelectorAll('.start-session-btn').forEach(btn => {
        btn.onclick = () => startTrainingSession(btn.dataset.name);
    });
    sessionsUl.querySelectorAll('.delete-session-btn').forEach(btn => {
        btn.onclick = () => deleteSession(btn.dataset.name);
    });
    sessionsUl.querySelectorAll('.export-session-btn').forEach(btn => {
        btn.onclick = () => exportSession(btn.dataset.name);
    });
}

// Exportieren einer Session
function exportSession(name) {
    const text = JSON.stringify(sessions[name], null, 2);
    navigator.clipboard.writeText(text)
        .then(() => alert(`Session "${name}" als JSON kopiert!`))
        .catch(() => alert('Kopieren fehlgeschlagen!'));
}

// Import/Export
function importVocab(text) {
    let result = [];
    try {
        if (text.trim().startsWith('[')) {
            // JSON
            let parsed = JSON.parse(text);
            // Prüfe, ob Array von Arrays, dann umwandeln
            if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
                result = parsed.map(arr => ({ de: arr[0], en: arr[1] }));
            } else {
                // Prüfe, ob Objekte mit de/en oder andere Properties
                result = parsed.map(obj => {
                    if (typeof obj === 'object' && obj !== null) {
                        if ('de' in obj && 'en' in obj) return obj;
                        // Fallback: Versuche die ersten beiden Properties zu nehmen
                        const keys = Object.keys(obj);
                        return { de: obj[keys[0]], en: obj[keys[1]] };
                    }
                    return { de: '', en: '' };
                });
            }
        } else {
            // CSV/TSV
            let lines = text.trim().split('\n');
            for (let line of lines) {
                let [de, en] = line.split(/[,;\t]/);
                if (de && en) result.push({ de: de.trim(), en: en.trim() });
            }
        }
        if (!Array.isArray(result) || result.length === 0) throw new Error();
        vocabList = result;
        console.log('Importierte Vokabeln:', vocabList); // Debug
        // Session-Name abfragen
        let name = prompt('Name für diese Session eingeben:', `Session ${Object.keys(sessions).length + 1}`);
        if (!name) name = `Session ${Object.keys(sessions).length + 1}`;
        sessions[name] = result;
        saveSessions();
        renderSessionsList();
        alert(`Vokabeln importiert! (${result.length} Einträge in "${name}")`);
    } catch (e) {
        alert('Fehler beim Import. Bitte gültiges JSON oder CSV/TSV eingeben.');
    }
}
function exportVocab() {
    return JSON.stringify(vocabList, null, 2);
}

// UI Elements
const startBtn = document.getElementById('start-training');
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
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const importFile = document.getElementById('import-file');
const importText = document.getElementById('import-text');
const sessionsUl = document.getElementById('sessions-ul');
const showAnswerBtn = document.getElementById('show-answer');
const cancelSessionBtn = document.getElementById('cancel-session');
const answerButtonsDiv = document.getElementById('answer-buttons');
const importExportContent = document.getElementById('import-export-content');
const toggleImportBtn = document.getElementById('toggle-import');
const sessionsListContent = document.getElementById('sessions-list-content');
const toggleSessionsBtn = document.getElementById('toggle-sessions');

// Fortschrittsanzeige
function updateProgress() {
    progressDiv.textContent = `Fortschritt: ${correctCards.size}/${vocabList.length}` +
        (currentSessionName ? ` (${currentSessionName})` : '');
}

// Trainingsmodus starten
function startTraining() {
    console.log('Starte Training, Vokabelliste:', vocabList); // Debug
    sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
    console.log('SessionCards:', sessionCards); // Debug
    currentIndex = 0;
    if (sessionCards.length === 0) {
        alert('Keine Karten zum Üben vorhanden!');
        return;
    }
    trainingSession.style.display = 'block';
    sessionEndDiv.style.display = 'none';
    startBtn.style.display = 'none';
    showCard();
    updateProgress();
}

// Karte anzeigen
function showCard() {
    console.log('showCard() aufgerufen, currentIndex:', currentIndex); // Debug
    if (!sessionCards || sessionCards.length === 0) {
        wordDiv.textContent = '';
        feedbackDiv.textContent = '';
        console.log('SessionCards leer!'); // Debug
        return;
    }
    // Begrenzung des Index auf gültigen Bereich
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= sessionCards.length) currentIndex = 0;
    let card = sessionCards[currentIndex];
    console.log('Aktuelle Karte:', card); // Debug
    if (!wordDiv) {
        console.error('Element mit ID "word" nicht gefunden!');
        return;
    }
    if (!card || typeof card.de === 'undefined' || card.de === '') {
        wordDiv.textContent = 'Keine Vokabel vorhanden!';
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
    // Importbereich beim Start einer Session einklappen
    importExportContent.classList.add('collapsed');
    toggleImportBtn.textContent = 'Vokabeln importieren ▲';
    answerShown = false;
}

// Eingabe beobachten für Button-Vorfärbung
userInput.addEventListener('input', () => {
    // Buttons NICHT einfärben während der Eingabe
    if (!answerShown) {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.remove('selected');
    }
});

// Antwort zeigen Button
showAnswerBtn.addEventListener('click', () => {
    answerShown = true;
    showAnswerBtn.disabled = true;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'flex';
    let card = sessionCards[currentIndex];
    // Buttons einfärben
    if (userInput.value.trim().toLowerCase() === (card.en || '').toLowerCase()) {
        btnCorrect.classList.add('selected');
        btnWrong.classList.remove('selected');
        feedbackDiv.textContent = `Richtig! Antwort: ${card.en}`;
    } else if (userInput.value.trim() !== '') {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.add('selected');
        feedbackDiv.textContent = `Falsch! Antwort: ${card.en}`;
    } else {
        btnCorrect.classList.remove('selected');
        btnWrong.classList.remove('selected');
        feedbackDiv.textContent = `Antwort: ${card.en}`;
    }
});

// Richtig/Falsch Buttons
btnCorrect.addEventListener('click', () => {
    let idx = vocabList.findIndex(
        v => v.de === sessionCards[currentIndex].de && v.en === sessionCards[currentIndex].en
    );
    correctCards.add(idx);
    saveProgress();
    nextCard();
});
btnWrong.addEventListener('click', () => {
    feedbackDiv.textContent = `Richtige Antwort: ${sessionCards[currentIndex].en}`;
    setTimeout(nextCard, 1200);
});

// Nächste Karte
function nextCard() {
    currentIndex++;
    if (currentIndex >= sessionCards.length) {
        // Falsch beantwortete Karten erneut abfragen
        sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
        currentIndex = 0;
        if (sessionCards.length === 0) {
            endSession();
            return;
        }
    }
    showCard();
    updateProgress();
}

// Session-Ende
function endSession() {
    trainingSession.style.display = 'none';
    sessionEndDiv.style.display = 'block';
    finalScoreDiv.textContent = `Alle Vokabeln richtig beantwortet! (${vocabList.length}/${vocabList.length})`;
    startBtn.style.display = 'block';
    correctCards.clear();
    saveProgress();
    updateProgress();
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    cancelSessionBtn.style.display = 'none';
    // Importbereich wieder ausklappen
    importExportContent.classList.remove('collapsed');
    toggleImportBtn.textContent = 'Vokabeln importieren ▼';
    // Sessions-Liste wieder ausklappen (setze explizit auf "collapsed" = false)
    sessionsListContent.classList.remove('collapsed');
    toggleSessionsBtn.textContent = 'Importierte Sessions ▼';
}

// Session starten
function startTrainingSession(name) {
    vocabList = sessions[name];
    currentSessionName = name;
    correctCards = new Set();
    saveProgress();
    currentIndex = 0;
    sessionCards = vocabList.filter((_, i) => !correctCards.has(i));
    if (sessionCards.length === 0) {
        alert('Keine Karten zum Üben vorhanden!');
        return;
    }
    trainingSession.style.display = 'block';
    sessionEndDiv.style.display = 'none';
    // Sessions-Liste direkt einklappen
    sessionsListContent.classList.add('collapsed');
    toggleSessionsBtn.textContent = 'Importierte Sessions ▲';
    showCard();
    updateProgress();
}

// Session löschen
function deleteSession(name) {
    if (confirm(`Session "${name}" wirklich löschen?`)) {
        delete sessions[name];
        saveSessions();
        renderSessionsList();
        // Falls gerade diese Session aktiv ist, Training beenden
        if (currentSessionName === name) {
            trainingSession.style.display = 'none';
            sessionEndDiv.style.display = 'none';
            startBtn.style.display = 'block';
            vocabList = [];
            sessionCards = [];
            correctCards = new Set();
            updateProgress();
        }
    }
}

// Importbereich ein-/ausklappen
toggleImportBtn.addEventListener('click', () => {
    const collapsed = importExportContent.classList.toggle('collapsed');
    toggleImportBtn.textContent = collapsed ? 'Vokabeln importieren ▲' : 'Vokabeln importieren ▼';
});
// Sessions-Liste ein-/ausklappen
toggleSessionsBtn.addEventListener('click', () => {
    const collapsed = sessionsListContent.classList.toggle('collapsed');
    toggleSessionsBtn.textContent = collapsed ? 'Importierte Sessions ▲' : 'Importierte Sessions ▼';
});

// Import/Export Events
importBtn.addEventListener('click', () => {
    if (importText.value.trim()) {
        importVocab(importText.value);
        importText.value = '';
    } else {
        alert('Bitte Text einfügen.');
    }
});
// Entfernt: ExportBtn und ImportFile EventListener

// Abbrechen Button
cancelSessionBtn.addEventListener('click', () => {
    trainingSession.style.display = 'none';
    sessionEndDiv.style.display = 'none';
    startBtn.style.display = 'block';
    vocabList = [];
    sessionCards = [];
    correctCards = new Set();
    currentSessionName = null;
    showAnswerBtn.style.display = 'none';
    answerButtonsDiv.style.display = 'none';
    cancelSessionBtn.style.display = 'none';
    // Importbereich wieder ausklappen
    importExportContent.classList.remove('collapsed');
    toggleImportBtn.textContent = 'Vokabeln importieren ▼';
    // Sessions-Liste wieder ausklappen
    sessionsListContent.classList.remove('collapsed');
    toggleSessionsBtn.textContent = 'Importierte Sessions ▼';
    updateProgress();
});

// Restart
restartBtn.addEventListener('click', () => {
    correctCards.clear();
    saveProgress();
    startTraining();
});

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
    renderSessionsList();
    loadVocab();
    loadProgress();
    updateProgress();
});

// Service Worker Registrierung
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}