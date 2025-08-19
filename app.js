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

// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// --- この下はもういじらなくてOK！ ---

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const gameRef = db.ref('takoyaki-game/gameState');
const playersRef = db.ref('takoyaki-game/players');

// HTML要素を取得
const gameBoard = document.getElementById('game-board');
const infoText = document.getElementById('info-text');
const lastActionText = document.getElementById('last-action-text');
const resetButton = document.getElementById('reset-button');
const nameOverlay = document.getElementById('name-entry-overlay');
const nameInput = document.getElementById('name-input');
const nameSubmit = document.getElementById('name-submit');
const participantsList = document.getElementById('participants-list');
const historyLog = document.getElementById('history-log');

const TAKOYAKI_COUNT = 8;
let player = { name: '', key: '' };

// --- 名前の処理 ---
player.name = sessionStorage.getItem('takoyakiPlayerName');
player.key = sessionStorage.getItem('takoyakiPlayerKey');

if (player.name && player.key) {
    nameOverlay.style.display = 'none';
    // 既にキーがある場合、存在を確認して再接続
    playersRef.child(player.key).set(player.name);
    playersRef.child(player.key).onDisconnect().remove();
}

nameSubmit.addEventListener('click', () => {
    const inputName = nameInput.value.trim();
    if (inputName) {
        player.name = inputName;
        const newPlayerRef = playersRef.push(); // 新しいユニークなキーを生成
        player.key = newPlayerRef.key;
        
        newPlayerRef.set(player.name); // サーバーに名前を保存
        newPlayerRef.onDisconnect().remove(); // タブを閉じたら自動で削除

        sessionStorage.setItem('takoyakiPlayerName', player.name);
        sessionStorage.setItem('takoyakiPlayerKey', player.key);
        nameOverlay.style.display = 'none';
    } else {
        alert('名前を入力してくれ！');
    }
});

// --- ゲームのメイン処理 ---

// ゲーム状態の監視
gameRef.on('value', (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
        initializeGame();
        return;
    }
    updateGameUI(gameState);
});

// 参加者リストの監視
playersRef.on('value', (snapshot) => {
    const players = snapshot.val() || {};
    updateParticipantsUI(players);
});

// UI更新
function updateGameUI(state) {
    // たこ焼き表示
    gameBoard.innerHTML = '';
    state.takoyaki.forEach((tako, i) => {
        const takoyakiEl = document.createElement('div');
        takoyakiEl.classList.add('takoyaki');
        if (tako.opened) takoyakiEl.classList.add('hidden');
        takoyakiEl.addEventListener('click', () => selectTakoyaki(i));
        gameBoard.appendChild(takoyakiEl);
    });

    // 履歴表示
    historyLog.innerHTML = '';
    if (state.history) {
        state.history.forEach(log => {
            const li = document.createElement('li');
            li.textContent = log.message;
            if (log.hazure) li.classList.add('hazure');
            historyLog.appendChild(li);
        });
    }

    // メッセージ更新
    const hazureFound = state.takoyaki.filter(t => t.opened && (t.content !== 'あたり')).length;
    infoText.textContent = (hazureFound >= 2) ? "ゲーム終了！ハズレが出揃ったぜ！" : `ハズレは残り ${2 - hazureFound} 個だ！`;
    lastActionText.textContent = state.lastAction || 'さあ、誰からいく？';

    // ハズレ演出
    const lastHistory = state.history ? state.history[state.history.length - 1] : null;
    if (lastHistory && lastHistory.playerKey === player.key && lastHistory.hazure) {
        document.body.classList.add('hazure-effect');
        setTimeout(() => document.body.classList.remove('hazure-effect'), 2000); // 2秒後に戻す
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

// たこ焼き選択
function selectTakoyaki(id) {
    if (!player.name) {
        alert('まず名前を入力してくれ！');
        return;
    }
    gameRef.transaction(currentState => {
        if (!currentState) return currentState;

        const hazureCount = currentState.takoyaki.filter(t => t.opened && t.content !== 'あたり').length;
        if (currentState.takoyaki[id].opened || hazureCount >= 2) return; // 中止

        currentState.takoyaki[id].opened = true;
        const result = currentState.takoyaki[id].content;
        const isHazure = result !== 'あたり';
        
        let message = isHazure ? `【激辛】${player.name} は ${result}入りを引いた！` : `${player.name} はセーフ！うまい！`;
        currentState.lastAction = message;

        if (!currentState.history) currentState.history = [];
        currentState.history.push({ message: message, hazure: isHazure, playerKey: player.key });
        
        return currentState;
    });
}

// リセット
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
        lastAction: '',
        history: []
    });
}
