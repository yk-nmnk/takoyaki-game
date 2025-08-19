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
const gameRef = db.ref('takoyaki-game'); // 全員で共有するゲームデータの場所

const gameBoard = document.getElementById('game-board');
const infoText = document.getElementById('info-text');
const resetButton = document.getElementById('reset-button');

const TAKOYAKI_COUNT = 8;
let hazureFound = 0;

// ゲームの状態を監視
gameRef.on('value', (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
        // ゲームデータがなければ初期化
        resetGame();
        return;
    }
    hazureFound = gameState.hazureFound || 0;
    updateBoard(gameState.takoyaki);
    updateInfoText();
});

// たこ焼きの見た目を更新する
function updateBoard(takoyakiData) {
    gameBoard.innerHTML = ''; // 一旦まっさらにする
    for (let i = 0; i < TAKOYAKI_COUNT; i++) {
        const takoyaki = document.createElement('div');
        takoyaki.classList.add('takoyaki');
        
        // すでに開けられていたら非表示
        if (takoyakiData[i].opened) {
            takoyaki.classList.add('hidden');
        }

        takoyaki.addEventListener('click', () => selectTakoyaki(i));
        gameBoard.appendChild(takoyaki);
    }
}

// たこ焼きを選んだときの処理
function selectTakoyaki(id) {
    if (hazureFound >= 2) return; // ゲームが終わってたら何もしない
    db.ref(`takoyaki-game/takoyaki/${id}/opened`).set(true);
}

// ゲームの状態に応じてメッセージを更新
function updateInfoText() {
    if (hazureFound >= 2) {
        infoText.textContent = "ゲーム終了！ハズレが出揃ったぜ！";
        resetButton.style.display = 'block';
    } else {
        infoText.textContent = `ハズレは残り ${2 - hazureFound} 個だ！`;
        resetButton.style.display = 'none';
    }
}

// リセットボタンの処理
resetButton.addEventListener('click', () => {
    gameRef.set(null).then(resetGame); // サーバーのデータを消してからリセット
});

// ゲームを初期化する
function resetGame() {
    const contents = ['あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'わさび', 'からし'];
    contents.sort(() => Math.random() - 0.5); // シャッフル

    const initialTakoyaki = {};
    for (let i = 0; i < TAKOYAKI_COUNT; i++) {
        initialTakoyaki[i] = { content: contents[i], opened: false };
    }

    gameRef.set({
        takoyaki: initialTakoyaki,
        hazureFound: 0
    });
}