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

const TAKOYAKI_COUNT = 8;
let player = { name: '', key: '' };

// --- 名前の処理 ---

// ログイン処理をまとめた関数
function login(name, key) {
    player.name = name;
    player.key = key;

    playersRef.child(player.key).set(player.name);
    playersRef.child(player.key).onDisconnect().remove();

    nameOverlay.style.display = 'none';
    playerInfo.style.display = 'block';
    playerNameDisplay.textContent = player.name;
}

// ページ読み込み時にlocalStorageから復帰を試みる
const storedName = localStorage.getItem('takoyakiPlayerName');
const storedKey = localStorage.getItem('takoyakiPlayerKey');

if (storedName && storedKey) {
    login(storedName, storedKey);
}

// 名前決定ボタンの処理
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

// ログアウト処理
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
    const players = snapshot.val() || {};
    updateParticipantsUI(players);
});

function updateGameUI(state) {
    gameBoard.innerHTML = '';
    state.takoyaki.forEach((tako, i) => {
        const takoyakiEl = document.createElement('div');
        takoyakiEl.classList.add('takoyaki');
        if (tako.opened) takoyakiEl.classList.add('hidden');
        takoyakiEl.addEventListener('click', () => selectTakoyaki(i));
        gameBoard.appendChild(takoyakiEl);
    });

    historyLog.innerHTML = '';
    if (state.history) {
        state.history.slice().reverse().forEach(log => { // 新しい順に表示
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
        const hazureCount = currentState.takoyaki.filter(t => t.opened && t.content !== 'あたり').length;
        if (currentState.takoyaki[id].opened || hazureCount >= 2) return;

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
