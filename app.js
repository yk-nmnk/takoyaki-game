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
const gameRef = db.ref('takoyaki-game-v2'); // v2にしてデータをリセット

// HTML要素を取得
const gameBoard = document.getElementById('game-board');
const infoText = document.getElementById('info-text');
const lastActionText = document.getElementById('last-action-text');
const resetButton = document.getElementById('reset-button');
const nameOverlay = document.getElementById('name-entry-overlay');
const nameInput = document.getElementById('name-input');
const nameSubmit = document.getElementById('name-submit');

const TAKOYAKI_COUNT = 8;
let playerName = '';

// --- 名前の処理 ---
// ページ読み込み時にセッションストレージから名前を取得
playerName = sessionStorage.getItem('takoyakiPlayerName');
if (playerName) {
    nameOverlay.style.display = 'none'; // 名前が既にあれば入力画面を非表示
}

// 名前決定ボタンの処理
nameSubmit.addEventListener('click', () => {
    const inputName = nameInput.value.trim();
    if (inputName) {
        playerName = inputName;
        sessionStorage.setItem('takoyakiPlayerName', playerName); // 名前をセッションストレージに保存
        nameOverlay.style.display = 'none';
    } else {
        alert('名前を入力してくれ！');
    }
});


// --- ゲームのメイン処理 ---

// Firebaseのデータ変更を監視
gameRef.on('value', (snapshot) => {
    const gameState = snapshot.val();
    if (!gameState) {
        // ゲームデータがなければ初期化
        initializeGame();
        return;
    }
    updateUI(gameState);
});

// UI（画面）を更新する
function updateUI(state) {
    // たこ焼きの表示を更新
    gameBoard.innerHTML = '';
    state.takoyaki.forEach((tako, i) => {
        const takoyakiEl = document.createElement('div');
        takoyakiEl.classList.add('takoyaki');
        if (tako.opened) {
            takoyakiEl.classList.add('hidden');
        }
        takoyakiEl.addEventListener('click', () => selectTakoyaki(i));
        gameBoard.appendChild(takoyakiEl);
    });

    // メッセージを更新
    const hazureFound = state.takoyaki.filter(t => t.opened && (t.content === 'わさび' || t.content === 'からし')).length;
    
    if (hazureFound >= 2) {
        infoText.textContent = "ゲーム終了！ハズレが出揃ったぜ！";
        resetButton.style.display = 'block';
    } else {
        infoText.textContent = `ハズレは残り ${2 - hazureFound} 個だ！`;
        resetButton.style.display = 'none';
    }

    // 最後の行動を表示
    if(state.lastAction) {
        lastActionText.textContent = state.lastAction;
    } else {
        lastActionText.textContent = 'さあ、誰からいく？';
    }
}

// たこ焼きを選んだときの処理
function selectTakoyaki(id) {
    if (!playerName) {
        alert('まず名前を入力してくれ！');
        return;
    }

    // トランザクションで安全にデータ更新
    gameRef.transaction(currentState => {
        if (currentState) {
            // 既に開いてるか、ゲームが終わってたら何もしない
            const hazureCount = currentState.takoyaki.filter(t => t.opened && (t.content === 'わさび' || t.content === 'からし')).length;
            if (currentState.takoyaki[id].opened || hazureCount >= 2) {
                return; // 更新を中止
            }
            
            // たこ焼きを開ける
            currentState.takoyaki[id].opened = true;

            // 結果メッセージを作成
            const result = currentState.takoyaki[id].content;
            let message = '';
            if (result === 'あたり') {
                message = `${playerName} はセーフ！うまい！`;
            } else {
                message = `【激辛】${playerName} は ${result}入りを引いた！`;
            }
            currentState.lastAction = message;
        }
        return currentState; // 更新後のデータを返す
    });
}

// リセットボタンの処理
resetButton.addEventListener('click', initializeGame);

// ゲームを初期化する関数
function initializeGame() {
    const contents = ['あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'あたり', 'わさび', 'からし'];
    contents.sort(() => Math.random() - 0.5); // シャッフル

    const initialTakoyaki = [];
    for (let i = 0; i < TAKOYAKI_COUNT; i++) {
        initialTakoyaki.push({ content: contents[i], opened: false });
    }

    gameRef.set({
        takoyaki: initialTakoyaki,
        lastAction: ''
    });
}
