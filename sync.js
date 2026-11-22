// ===== PC と iPhone の同期（Firebase） =====
// このファイルは「同期の係」。script.js（アプリの本体）のあとに動く。
// 家計簿と同じ Firebase のプロジェクトを使うので、家計簿と同じアカウントでログインできる。
//
// しくみ：
//  ・script.js がデータを保存すると「保存したよ」の合図（roadmap-saved）を出す
//    → ここでその合図を聞いて、Firebase（ネット上のデータ置き場）にも送る
//  ・ほかの機械が Firebase のデータを変えると、ここに知らせが届く
//    → 受け取ったデータで、この機械のデータを置きかえて、画面を描き直す（applyRemoteData）
//
// Firebase のデータの置き方：
//   users / （ログインした人の番号） / apps / roadmap
//     → { dreams: [やりたいこと, …], categories: [分野, …], updatedAt: 保存した時刻 }
//   ※ 生年月日は送らない（「このスマホの中だけに保存」の約束のため。機械ごとに1回入れる）

// Firebase のプロジェクトの「住所」（家計簿と同じ）。パスワードではないので、公開しても大丈夫
// （データは Firebase の「ルール」で、本人しか読み書きできないように守っている）
const firebaseConfig = {
  apiKey: "AIzaSyAqTbNbC_tEyAWxxzUFgTTK4IiB4vE9g58",
  authDomain: "kakeibo-99608.firebaseapp.com",
  projectId: "kakeibo-99608",
  storageBucket: "kakeibo-99608.firebasestorage.app",
  messagingSenderId: "783392599707",
  appId: "1:783392599707:web:184a69e465a81e3d9c203e",
};

// この機械が、どの人のデータとつながっているか（ログインした人の番号）を覚えておく場所の名前
const SYNC_UID_KEY = "roadmap-sync-uid";

// ===== 画面の部品 =====
const syncLoggedOut = document.getElementById("sync-logged-out");
const syncLoggedIn = document.getElementById("sync-logged-in");
const syncStatus = document.getElementById("sync-status");
const openLoginButton = document.getElementById("open-login");
const logoutButton = document.getElementById("logout");
const loginDialog = document.getElementById("login-dialog");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");
const signupSubmit = document.getElementById("signup-submit");
const resetPasswordButton = document.getElementById("reset-password");
const cancelLoginButton = document.getElementById("cancel-login");

// Firebase の部品が読み込めたときだけ、同期を動かす
// （ネットにつながっていないなどで読み込めなければ、今までどおり機械の中のデータだけで使う）
if (typeof firebase === "undefined") {
  openLoginButton.addEventListener("click", function () {
    showToast("同期の仕組みを読み込めませんでした。ネットにつながっているか確かめてください。");
  });
} else {
  startSync();
}

function startSync() {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();     // ログインの係
  const db = firebase.firestore();  // データ置き場（Firestore）の係
  auth.languageCode = "ja";         // パスワード再設定のメールを日本語にする

  // ネットが切れているあいだに送ったデータを、アプリを閉じても忘れないようにする
  db.enablePersistence({ synchronizeTabs: true }).catch(function () {
    // 使えないブラウザもある。そのときは、開いているあいだだけ覚えておく
  });

  let uid = null;           // ログインしている人の番号（していなければ null）
  let stopListening = null; // 「ほかの機械からの知らせ」の受け取りをやめる関数
  let ready = false;        // 最初の合わせ込みが終わったか（終わるまでは送らない）
  let uploadTimer = null;   // 送るのを少し待つためのタイマー

  // この人のマイルストーンのデータが入っている場所（ドキュメント）
  function roadmapDoc() {
    return db.collection("users").doc(uid).collection("apps").doc("roadmap");
  }

  // 達成の写真の置き場所（1枚ずつ。やりたいことのデータと分けるのは、Firebase の1つの置き場所に入る大きさ（1MB）に限りがあるため）
  function photosCollection() {
    return roadmapDoc().collection("photos");
  }

  // 写真1枚を送る（この機械に無ければ、Firebase からも消す）
  function uploadPhoto(dreamId) {
    const data = loadPhoto(dreamId);
    if (data) return photosCollection().doc(dreamId).set({ data: data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return photosCollection().doc(dreamId).delete();
  }

  // この機械の写真を、全部送る（はじめてログインした機械＝引っ越しのとき）
  async function uploadAllPhotos() {
    const photos = allPhotos();
    await Promise.all(Object.keys(photos).map(uploadPhoto)); // Promise.all = 全部送り終わるまで待つ
  }

  // Firebase の写真を全部受け取って、この機械の写真を入れかえる（2台目の機械など）
  async function downloadAllPhotos() {
    const snapshot = await photosCollection().get();
    const photos = {};
    snapshot.forEach(function (doc) { photos[doc.id] = doc.data().data; });
    replaceAllPhotos(photos, true); // true = 受け取ったものなので、送り返さない
    refreshView();
  }

  // 今のデータを Firebase に送る
  function upload() {
    return roadmapDoc().set({
      // JSON にして戻す = 中身のコピーを作る（Firebase が受け付けない「undefined」も取りのぞける）
      dreams: JSON.parse(JSON.stringify(dreams)),
      categories: JSON.parse(JSON.stringify(categories)),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Firebase 側の時刻
    });
  }

  // 送るのを少しだけ待ってから送る
  // （バックアップから戻すときなど、続けて何回も保存されても、送るのは1回ですむ）
  function scheduleUpload() {
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(function () {
      upload().catch(showSyncError);
    }, 300);
  }

  // Firebase のデータを、この機械に入れる
  function applyDoc(doc) {
    const data = doc.data();
    if (!data || !Array.isArray(data.dreams) || !Array.isArray(data.categories)) return;
    applyRemoteData({ dreams: data.dreams, categories: data.categories });
  }

  // ほかの機械からの知らせを受け取り始める（やりたいこと・分野と、写真の2つ）
  function startListening() {
    // onSnapshot = Firebase のデータが変わるたびに、中の関数を呼んでくれる
    stopListening = roadmapDoc().onSnapshot(function (doc) {
      // 自分が送ったばかりの変更は、もう画面に出ているので何もしない
      if (doc.metadata.hasPendingWrites) return;
      if (doc.exists) applyDoc(doc);
    }, showSyncError);
    const stopPhotos = photosCollection().onSnapshot(function (snapshot) {
      // docChanges = 前から変わった写真だけ（足された・変わった・消された）
      // 自分が送ったばかりの写真（hasPendingWrites）は、もう入っているので飛ばす
      snapshot.docChanges().forEach(function (change) {
        if (change.doc.metadata.hasPendingWrites) return;
        savePhoto(change.doc.id, change.type === "removed" ? null : change.doc.data().data, true);
      });
      if (snapshot.docChanges().length > 0) refreshView();
    }, showSyncError);
    // 受け取りをやめるときは、2つともやめる
    const stopDreams = stopListening;
    stopListening = function () { stopDreams(); stopPhotos(); };
  }

  // この機械のデータとつなげて、同期を始める
  function finishLinking() {
    localStorage.setItem(SYNC_UID_KEY, uid);
    ready = true;
    startListening();
    renderSyncStatus();
  }

  // ===== ログインの状態が変わったとき（アプリを開いたとき・ログイン・ログアウト） =====
  auth.onAuthStateChanged(async function (user) {
    // 前の人の知らせの受け取りをやめる
    if (stopListening !== null) {
      stopListening();
      stopListening = null;
    }
    ready = false;
    uid = user ? user.uid : null;
    renderSyncStatus();
    if (user === null) return; // ログインしていない

    try {
      const doc = await roadmapDoc().get();

      if (!doc.exists) {
        // Firebase がまだ空（はじめてログインした機械）→ この機械のデータを送る（引っ越し）
        await upload();
        await uploadAllPhotos();
        finishLinking();
        showToast("この機械のデータを Firebase に保存しました。これからは自動でそろいます");
      } else if (localStorage.getItem(SYNC_UID_KEY) === uid || !hasLocalData()) {
        // 前にもこの人でつながっていた、またはこの機械にデータがない → Firebase のデータを使う
        applyDoc(doc);
        await downloadAllPhotos();
        finishLinking();
      } else {
        // この機械にもデータがある（2台目の機械）→ 置きかえてよいか確かめる
        const count = (doc.data().dreams || []).length;
        menuDialog.close();
        askConfirm(
          "Firebase のデータを使いますか？",
          "この機械のデータを、Firebase に保存されているデータ（マイルストーン " + count + "件）で置きかえます。" +
            "この機械にしかないデータは消えます。残したいときは「キャンセル」を押して、先にバックアップを保存してください。",
          "置きかえる",
          async function () {
            applyDoc(doc);
            await downloadAllPhotos().catch(showSyncError);
            finishLinking();
            showToast("Firebase のデータに置きかえました。これからは自動でそろいます");
          },
          function () {
            auth.signOut(); // 置きかえないなら、ログインをやめる
            showToast("ログインをやめました。この機械のデータはそのままです");
          }
        );
      }
    } catch (error) {
      showSyncError(error);
    }
  });

  // ===== script.js からの「保存したよ」の合図を聞いて、Firebase に送る =====
  document.addEventListener("roadmap-saved", function () {
    if (ready) scheduleUpload();
  });
  // 写真を保存した・外したときは、その1枚だけ送る
  document.addEventListener("roadmap-photo-saved", function (event) {
    if (ready) uploadPhoto(event.detail.dreamId).catch(showSyncError);
  });

  // ===== メニューの表示 =====
  function renderSyncStatus() {
    const user = auth.currentUser;
    syncLoggedOut.hidden = user !== null;
    syncLoggedIn.hidden = user === null;
    if (user === null) return;
    let state;
    if (!ready) state = "準備中…";
    else if (!navigator.onLine) state = "オフライン（つながったら送ります）";
    else state = "自動で同期しています ✓";
    syncStatus.textContent = user.email + "\n" + state;
  }
  // ネットがつながった・切れたときも、表示を新しくする
  window.addEventListener("online", renderSyncStatus);
  window.addEventListener("offline", renderSyncStatus);

  // ===== ログインのダイアログ =====
  openLoginButton.addEventListener("click", function () {
    menuDialog.close();
    loginError.hidden = true;
    loginDialog.showModal();
  });

  cancelLoginButton.addEventListener("click", function () {
    loginDialog.close();
  });

  // ボタンを押せる・押せないを切り替える（待っているあいだに2回押されないように）
  function setLoginBusy(isBusy) {
    loginSubmit.disabled = isBusy;
    signupSubmit.disabled = isBusy;
    resetPasswordButton.disabled = isBusy;
  }

  // うまくいかなかった理由を、ダイアログの中に出す
  function showLoginError(error) {
    loginError.textContent = authErrorMessage(error);
    loginError.hidden = false;
  }

  // 「ログイン」
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setLoginBusy(true);
    try {
      await auth.signInWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
      loginDialog.close();
      loginPassword.value = "";
      showToast("ログインしました");
    } catch (error) {
      showLoginError(error);
    }
    setLoginBusy(false);
  });

  // 「この内容で新しく登録」
  signupSubmit.addEventListener("click", async function () {
    // reportValidity = 入力欄のきまり（メールの形・6文字以上）を確かめて、ダメなら知らせる
    if (!loginForm.reportValidity()) return;
    setLoginBusy(true);
    try {
      await auth.createUserWithEmailAndPassword(loginEmail.value.trim(), loginPassword.value);
      loginDialog.close();
      loginPassword.value = "";
      showToast("登録してログインしました");
    } catch (error) {
      showLoginError(error);
    }
    setLoginBusy(false);
  });

  // 「パスワードを忘れたとき」：パスワードを決め直すメールを送る
  resetPasswordButton.addEventListener("click", async function () {
    const email = loginEmail.value.trim();
    if (email === "") {
      loginError.textContent = "メールアドレスを入れてから押してください";
      loginError.hidden = false;
      return;
    }
    setLoginBusy(true);
    try {
      await auth.sendPasswordResetEmail(email);
      loginError.hidden = true;
      showToast("パスワードを決め直すメールを送りました");
    } catch (error) {
      showLoginError(error);
    }
    setLoginBusy(false);
  });

  // 「ログアウト」
  logoutButton.addEventListener("click", function () {
    auth.signOut();
    // つながりの印を消しておく。次にログインしたとき、この機械のデータを置きかえる前に確かめるため
    localStorage.removeItem(SYNC_UID_KEY);
    menuDialog.close();
    showToast("ログアウトしました（この機械のデータは残っています）");
  });
}

// ===== うまくいかなかったときの説明 =====
// Firebase のエラーの記号（code）を、わかりやすい日本語にする
function authErrorMessage(error) {
  const messages = {
    "auth/invalid-credential": "メールアドレスかパスワードがちがいます",
    "auth/wrong-password": "メールアドレスかパスワードがちがいます",
    "auth/user-not-found": "メールアドレスかパスワードがちがいます",
    "auth/invalid-email": "メールアドレスの形がちがいます",
    "auth/email-already-in-use": "このメールアドレスはもう登録されています。「ログイン」を押してください",
    "auth/weak-password": "パスワードは6文字以上にしてください",
    "auth/too-many-requests": "何度も失敗したので、しばらく待ってから試してください",
    "auth/network-request-failed": "ネットにつながっていないようです",
    "auth/operation-not-allowed": "Firebase で「メール / パスワード」のログインがオンになっていないようです",
  };
  return messages[error.code] || "うまくいきませんでした（" + error.code + "）";
}

// 同期でうまくいかなかったときのお知らせ
function showSyncError(error) {
  console.error(error); // くわしい原因は開発者ツールに出す
  if (error.code === "permission-denied") {
    showToast("同期できませんでした。Firebase のルールの設定を確かめてください");
  } else {
    showToast("同期できませんでした（" + (error.code || error.message) + "）");
  }
}
