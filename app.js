// ▼▼▼【重要】ステップ2で取得する情報をここにコピペする▼▼▼
const firebaseConfig = {
  apiKey: "AIzaSyAQfrr5pJKEhw1GdUCXj8dNE-5PnNBiMnc",
  authDomain: "takoyaki-russian-roulette.firebaseapp.com",
  databaseURL: "https://takoyaki-russian-roulette-default-rtdb.firebaseio.com",
  projectId: "takoyaki-russian-roulette",
  storageBucket: "takoyaki-russian-roulette.firebasestorage.app",
  messagingSenderId: "987497885958",
  appId: "1:987497885958:web:7db1ebd1ec2537d676ae87"
};
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


// --- この下はもういじらなくてOK！ ---

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const gameRef = db.ref('takoyaki-game/gameState');
const playersRef = db.ref('takoyaki-game/players');

// HTML要素を取得
const gameBoard = document.getElementById('game-board');
const infoText = document.getElementById('info-text');
const resetButton = document.getElementById('reset-button');
const nameOverlay = document.getElementById('name-entry-overlay');
const nameInput = document.getElementById('name-input');
const nameSubmit = document.getElementById('name-submit');
const participantsList = document.getElementById('participants-list');
const historyLog = document.getElementById('history-log');
const playerInfo = document.getElementById('player-info');
const playerNameDisplay = document.getElementById('player-name-display');
const logoutButton = document.getElementById('logout-button');
const birthdaySurprise = document.getElementById('birthday-surprise');

const TAKOYAKI_COUNT = 8;
let player = { name: '', key: '' };

// 誕生日期間かチェックする関数
function isBirthdayPeriod() {
    const today = new Date();
    const month = today.getMonth() + 1; // 1月は0
    const day = today.getDate();

    // 8月10日から8月31日まで
    return month === 8 && day >= 10 && day <= 31;
}

// --- 名前の処理 ---
function login(name, key) {
    player.name = name;
    player.key = key;

    playersRef.child(player.key).set(player.name);
    playersRef.child(player.key).onDisconnect().remove();

    nameOverlay.style.display = 'none';
    playerInfo.style.display = 'block';
    playerNameDisplay.textContent = player.name;
}

const storedName = localStorage.getItem('takoyakiPlayerName');
const storedKey = localStorage.getItem('takoyakiPlayerKey');

if (storedName && storedKey) {
    login(storedName, storedKey);
}

nameSubmit.addEventListener('click', () => {
    const inputName = nameInput.value.trim();
    if (inputName) {
        const newPlayerRef = playersRef.push();
        const newKey = newPlayerRef.key;
        
        localStorage.setItem('takoyakiPlayerName', inputName);
        localStorage.setItem('takoyakiPlayerKey', newKey);

        login(inputName, newKey);
    } else {
        alert('名前を入力してくれ！');
    }
});

logoutButton.addEventListener('click', () => {
    if (player.key) {
        playersRef.child(player.key).remove();
    }
    localStorage.removeItem('takoyakiPlayerName');
    localStorage.removeItem('takoyakiPlayerKey');
    player = { name: '', key: '' };
    nameOverlay.style.display = 'flex';
    playerInfo.style.display = 'none';
    nameInput.value = '';
});

// --- ゲームのメイン処理 ---
gameRef.on('value', (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
        initializeGame();
        return;
    }
    updateGameUI(gameState);
});

playersRef.on('value', (snapshot) => {
    updateParticipantsUI(snapshot.val() || {});
});

function updateGameUI(state) {
    gameBoard.innerHTML = '';
    let openedCount = 0;
    state.takoyaki.forEach((tako, i) => {
        const takoyakiEl = document.createElement('div');
        takoyakiEl.classList.add('takoyaki');
        if (tako.opened) {
            takoyakiEl.classList.add('hidden');
            openedCount++;
        }
        takoyakiEl.addEventListener('click', () => selectTakoyaki(i));
        gameBoard.appendChild(takoyakiEl);
    });

    historyLog.innerHTML = '';
    if (state.history) {
        state.history.slice().reverse().forEach(log => {
            const li = document.createElement('li');
            li.textContent = log.message;
            if (log.hazure) li.classList.add('hazure');
            historyLog.appendChild(li);
        });
    }

    const hazureFound = state.takoyaki.filter(t => t.opened && (t.content !== 'あたり')).length;
    infoText.textContent = (hazureFound >= 2) ? "ゲーム終了！ハズレが出揃ったぜ！" : `ハズレは残り ${2 - hazureFound} 個だ！`;

    const lastHistory = state.history ? state.history[state.history.length - 1] : null;
    if (lastHistory && lastHistory.playerKey === player.key && lastHistory.hazure) {
        document.body.classList.add('hazure-effect');
        setTimeout(() => document.body.classList.remove('hazure-effect'), 2000);
    }

    // 誕生日サプライズの表示チェック
    if (openedCount === TAKOYAKI_COUNT && isBirthdayPeriod()) {
        birthdaySurprise.style.display = 'flex';
        infoText.textContent = "おめでとう！";
    } else {
        birthdaySurprise.style.display = 'none';
    }
}

function updateParticipantsUI(players) {
    participantsList.innerHTML = '';
    for (const key in players) {
        const li = document.createElement('li');
        li.textContent = players[key];
        participantsList.appendChild(li);
    }
}

function selectTakoyaki(id) {
    if (!player.name) {
        alert('まず名前を入力してくれ！');
        return;
    }
    gameRef.transaction(currentState => {
        if (!currentState) return currentState;
        // ★★★ 修正点 ★★★
        // 既に開いてるたこ焼きは選べないようにするだけに変更
        if (currentState.takoyaki[id].opened) return;

        currentState.takoyaki[id].opened = true;
        const result = currentState.takoyaki[id].content;
        const isHazure = result !== 'あたり';
        
        let message = isHazure ? `【激辛】${player.name} は ${result}入りを引いた！` : `${player.name} はセーフ！うまい！`;
        
        if (!currentState.history) currentState.history = [];
        currentState.history.push({ message: message, hazure: isHazure, playerKey: player.key });
        
        return currentState;
    });
}

resetButton.addEventListener('click', initializeGame);

function initializeGame() {
    const contents = ['あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'わさび', 'からし'];
    contents.sort(() => Math.random() - 0.5);

    const initialTakoyaki = [];
    for (let i = 0; i < TAKOYAKI_COUNT; i++) {
        initialTakoyaki.push({ content: contents[i], opened: false });
    }

    gameRef.set({
        takoyaki: initialTakoyaki,
        history: []
    });
}
