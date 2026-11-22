// ===== 1. 画面の部品を取ってくる =====
const setupCard = document.getElementById("setup-card");
const setupForm = document.getElementById("setup-form");
const birthdateInput = document.getElementById("birthdate");
const ageCard = document.getElementById("age-card");
const currentAgeText = document.getElementById("current-age");
const changeBirthdateButton = document.getElementById("change-birthdate");
const addButton = document.getElementById("add-button");   // 右下の「＋」
const addDialog = document.getElementById("add-dialog");   // やりたいことを追加するダイアログ
const cancelAddButton = document.getElementById("cancel-add");
const sideAddButton = document.getElementById("side-add-button"); // PC のときだけ出る「追加」ボタン
const listCard = document.getElementById("list-card");

const dreamForm = document.getElementById("dream-form");
const titleInput = document.getElementById("dream-title");
const categoryInput = document.getElementById("dream-category");
const memoInput = document.getElementById("dream-memo");
const dreamList = document.getElementById("dream-list");
const dreamCount = document.getElementById("dream-count");

const editDialog = document.getElementById("edit-dialog");
const editForm = document.getElementById("edit-form");
const editTitle = document.getElementById("edit-title");
const editCategory = document.getElementById("edit-category");
const editMemo = document.getElementById("edit-memo");
const cancelEditButton = document.getElementById("cancel-edit");
const deleteDreamButton = document.getElementById("delete-dream");

// ===== 2. 分野と色 =====
// 最初の分野の一覧。「分野を編集」で変えると、変えたものが保存されて、そちらを使う
const DEFAULT_CATEGORIES = [
  { name: "仕事", color: "#2a78d6" },           // 青
  { name: "スポーツ", color: "#1baf7a" },       // 緑
  { name: "お金", color: "#eda100" },           // 黄色
  { name: "学び", color: "#6250d6" },           // 紫
  { name: "旅行", color: "#14a3b8" },           // 水色
  { name: "家族・人間関係", color: "#e87ba4" }, // ピンク
  { name: "健康", color: "#d64545" },           // 赤
  { name: "趣味", color: "#eb6834" },           // オレンジ
  { name: "その他", color: "#9a9893" },         // グレー
];

// 「分野を編集」で選べる15色（分野の上限と同じ数なので、上限まで足しても色がかぶらない）
const COLOR_PALETTE = [
  "#2a78d6", "#1baf7a", "#eda100", "#6250d6", "#14a3b8",
  "#e87ba4", "#d64545", "#eb6834", "#9a9893", "#8d6e63",
  "#7cb342", "#3f51b5", "#b04fc4", "#00897b", "#546e7a", // 黄緑・藍色・赤紫・深緑・青灰
];

// 分野は何個まで登録できるか（多すぎると、絞りこみのボタンやプルダウンが長くなって選びにくいため）
const MAX_CATEGORIES = 15;

const CATEGORIES_KEY = "roadmap-categories"; // 編集した分野を保存しておく場所の名前

// 今の分野の一覧（編集したことがなければ、最初の一覧）
let categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || DEFAULT_CATEGORIES;

function saveCategories() {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  announceSaved();
}

// 「保存したよ」という合図（イベント）を出す関数。
// 同期の係（sync.js）がこの合図を聞いて、Firebase にも送る。
// （ログインしていないときは、合図を聞く人がいないので、何も起きない）
function announceSaved() {
  document.dispatchEvent(new CustomEvent("roadmap-saved"));
}

// 分野の色を返す関数（一覧にない分野ならグレー）
function colorOf(category) {
  const found = categories.find(function (c) { return c.name === category; });
  return found ? found.color : "#9a9893";
}

// ===== 色の丸が付いた、自作のプルダウン（家計簿と同じしくみ） =====
// ふつうのプルダウン（<select>）は、開いたときの一覧を iPhone やブラウザが描くので、
// 色の丸を付けられない。そこで <select> は隠して「値を入れておく場所」としてだけ使い、
// 見た目は自分で作ったボタンと一覧で出す。

// 分野の色の小さな丸を作る関数
function makeDot(category) {
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.backgroundColor = colorOf(category);
  return dot;
}

// <select> を、自作のプルダウンに置きかえる関数
// 戻り値は「見た目を今の値に合わせ直す関数」。プログラムで値を変えたあとに呼ぶ
function makeCategoryPicker(select) {
  select.hidden = true; // 元のプルダウンは隠す（値はここに入れ続ける）

  const picker = document.createElement("div");   // 全体の入れ物
  picker.className = "picker";
  const button = document.createElement("button"); // 閉じているときに見える欄
  button.type = "button";
  button.className = "picker-button";
  button.setAttribute("aria-expanded", "false");   // 読み上げ機能に「閉じている」と伝える
  const list = document.createElement("ul");       // 押すと開く一覧
  list.className = "picker-list";
  list.hidden = true;

  // 一覧を開く・閉じる関数（isOpen が true なら開く）
  function setOpen(isOpen) {
    list.hidden = !isOpen;
    button.setAttribute("aria-expanded", String(isOpen));
  }

  // 欄を押したら、一覧を開く（開いていたら閉じる）
  button.addEventListener("click", function () {
    setOpen(list.hidden);
  });

  // 一覧の外をタップしたら閉じる
  document.addEventListener("click", function (event) {
    if (!picker.contains(event.target)) setOpen(false);
  });

  // 見た目を、隠したプルダウンの今の選択肢と値に合わせる関数
  // （分野を編集したときに選択肢が変わるので、一覧の行も毎回作り直す）
  function refresh() {
    button.textContent = ""; // いったん空にする
    button.appendChild(makeDot(select.value));
    button.append(select.value); // append = 文字を後ろに付け足す

    // 元のプルダウンの選択肢を1つずつ取り出して、一覧の行を作る
    list.textContent = "";
    for (const option of select.options) {
      const item = document.createElement("li");
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "picker-option";
      optionButton.appendChild(makeDot(option.value));
      optionButton.append(option.value);
      // 今選んでいる行に印（selected）を付ける
      if (option.value === select.value) optionButton.classList.add("selected");

      // 選んだら、隠したプルダウンに値を入れて、一覧を閉じる
      optionButton.addEventListener("click", function () {
        select.value = option.value;
        refresh();
      });

      item.appendChild(optionButton);
      list.appendChild(item);
    }
    setOpen(false);
  }

  picker.appendChild(button);
  picker.appendChild(list);
  select.after(picker); // 隠したプルダウンのすぐ後ろに置く
  return refresh;
}

// 入力フォームと編集ダイアログの、2つのプルダウンを置きかえる
const categoryPickers = [makeCategoryPicker(categoryInput), makeCategoryPicker(editCategory)];

// 2つのプルダウンの見た目を、今の値に合わせ直す関数
function refreshCategoryPickers() {
  for (const refresh of categoryPickers) refresh();
}

// 分野の選択肢を、入力フォームと編集ダイアログに作る関数（分野を編集したら、作り直す）
// renames = 名前を変えた分野の表（{ 前の名前: 新しい名前 }）。名前を変えた分野を選んでいたら、新しい名前で選んだままにする
function fillCategorySelects(renames) {
  const names = categories.map(function (c) { return c.name; });
  for (const select of [categoryInput, editCategory]) {
    let previous = select.value; // 今選んでいる分野
    if (renames && renames[previous] !== undefined) previous = renames[previous];
    select.textContent = "";       // 選択肢をいったん空にする
    for (const name of names) {
      const option = document.createElement("option");
      option.textContent = name;
      select.appendChild(option);
    }
    // 前に選んでいた分野がまだあればそのまま、無くなっていれば1つ目にする
    select.value = names.includes(previous) ? previous : names[0];
  }
  refreshCategoryPickers(); // 色の丸付きのプルダウンの見た目も作り直す
}
fillCategorySelects();

// ===== 3. データを入れておく箱と、保存する関数 =====
// 保存しておく場所（ブラウザの中）での名前
const PROFILE_KEY = "roadmap-profile"; // 生年月日
const DREAMS_KEY = "roadmap-dreams";   // やりたいこと

// 生年月日など（{ birthdate: "2003-08-14" } の形）。まだなければ空っぽ
let profile = JSON.parse(localStorage.getItem(PROFILE_KEY)) || {};

// やりたいことの一覧。1つずつ
// { id: 見分けるための記号, title: やりたいこと, category: 分野, memo: メモ,
//   deadline: いつまでに（いつかなら null） }
// deadline は { year: 2029, month: 3, day: 1 } の形。年だけなら month と day が null、年と月だけなら day が null
let dreams = JSON.parse(localStorage.getItem(DREAMS_KEY)) || [];

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}


// ===== 達成したときの写真 =====
// 写真は大きいので、やりたいことのデータとは別の場所に、1枚ずつ保存する
//   この機械の中： "roadmap-photo-（やりたいことの id）" に、小さくした写真（data URL の文字）
//   同期のとき：  Firebase の users/{uid}/apps/roadmap/photos/（id） に1枚ずつ（sync.js）
const PHOTO_PREFIX = "roadmap-photo-";

// 写真を読む（なければ null）
function loadPhoto(dreamId) {
  return localStorage.getItem(PHOTO_PREFIX + dreamId);
}

// 写真を保存する（data = null なら消す）。silent = true なら「保存したよ」の合図を出さない（同期で受け取ったとき）
// 保存する場所がいっぱいで保存できなかったら false を返す
function savePhoto(dreamId, data, silent) {
  try {
    if (data) {
      localStorage.setItem(PHOTO_PREFIX + dreamId, data);
    } else {
      localStorage.removeItem(PHOTO_PREFIX + dreamId);
    }
  } catch (error) {
    showToast("写真を保存する場所がいっぱいです。ほかの写真を外してから試してください");
    return false;
  }
  if (!silent) document.dispatchEvent(new CustomEvent("roadmap-photo-saved", { detail: { dreamId: dreamId } }));
  return true;
}

// この機械にある写真を、全部 { id: 写真 } の形で返す
function allPhotos() {
  const photos = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PHOTO_PREFIX)) photos[key.slice(PHOTO_PREFIX.length)] = localStorage.getItem(key);
  }
  return photos;
}

// この機械の写真を、全部入れかえる（バックアップから戻す・同期で受け取ったとき）
function replaceAllPhotos(photos, silent) {
  for (const id of Object.keys(allPhotos())) {
    if (!photos[id]) savePhoto(id, null, silent);
  }
  for (const id of Object.keys(photos)) savePhoto(id, photos[id], silent);
}

// 選んだ写真を、長い辺が 640px になるまで小さくして、JPEG の文字（data URL）にする
// （そのままだと 1枚 数MB あって、保存する場所がすぐにいっぱいになるため）
function resizeImage(file) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = function () {
      const scale = Math.min(1, 640 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72)); // 0.72 = 画質（0〜1）。見た目をあまり落とさずに小さくする
    };
    image.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("写真を読み込めませんでした"));
    };
    image.src = url;
  });
}
// ===== 家族（年表に、家族の年齢も出す） =====
// 1人ずつ { id: 見分けるための記号, name: 呼び名, birthdate: "YYYY-MM-DD" }
// 生年月日なので、自分の生年月日と同じく、この機械の中だけに保存する（同期では送らない。バックアップには入る）
const FAMILY_KEY = "roadmap-family";
const MAX_FAMILY = 10; // 何人まで登録できるか
let family = JSON.parse(localStorage.getItem(FAMILY_KEY)) || [];

function saveFamily() {
  localStorage.setItem(FAMILY_KEY, JSON.stringify(family));
}

// ある日の、家族の年齢を「ゆい 4歳・母 61歳」の形で返す（まだ生まれていない人は出さない）
function familyAgesOn(date) {
  const parts = [];
  for (const person of family) {
    const birth = parseDate(person.birthdate);
    if (date < birth) continue;
    parts.push(person.name + " " + ageOn(birth, date) + "歳");
  }
  return parts.join("・");
}

// ある年の、家族の年齢を「ゆい 3〜4歳・母 60〜61歳」の形で返す
// その年に生まれる人は「ゆい 誕生」、その年より後に生まれる人は出さない
function familyAgesInYear(year) {
  const parts = [];
  for (const person of family) {
    const birth = parseDate(person.birthdate);
    if (birth.getFullYear() > year) continue;
    if (birth.getFullYear() === year) {
      parts.push(person.name + " 誕生");
    } else {
      parts.push(person.name + " " + agesInYear(birth, year));
    }
  }
  return parts.join("・");
}

function saveDreams() {
  localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));
  announceSaved();
}

// 前の版（「何歳までに」で入れていたデータ）を、日付の形に変える
// 「30歳まで」→ 30歳の誕生日の日付
function migrateOldDreams() {
  if (!profile.birthdate) return;
  const birth = parseDate(profile.birthdate);
  let changed = false;
  for (const dream of dreams) {
    if (dream.targetAge !== undefined) {
      if (dream.targetAge === null) {
        dream.deadline = null;
      } else {
        const date = new Date(birth.getFullYear() + dream.targetAge, birth.getMonth(), birth.getDate());
        dream.deadline = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
      }
      delete dream.targetAge; // delete = 古い項目を消す
      changed = true;
    }
  }
  if (changed) saveDreams();
}

// ===== 4. 日付と年齢の計算 =====
// "2003-08-14" のような文字を、日付（Date）にする関数
function parseDate(text) {
  return new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10)));
}

// 今日の日付（時刻は 0時0分 にそろえる）
function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ある日の年齢を計算する関数
function ageOn(birth, date) {
  let age = date.getFullYear() - birth.getFullYear();
  // その年の誕生日がまだ来ていなければ、1つ引く
  const birthdayThisYear = new Date(date.getFullYear(), birth.getMonth(), birth.getDate());
  if (date < birthdayThisYear) age = age - 1;
  return age;
}

// その月が何日まであるか（「次の月の0日」＝「その月の最後の日」になる）
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// 期限の「最後の日」を返す関数
// 年だけ → その年の12月31日、年と月だけ → その月の最後の日、年月日 → その日
function deadlineEnd(deadline) {
  if (deadline.month === null) return new Date(deadline.year, 11, 31);
  if (deadline.day === null) return new Date(deadline.year, deadline.month - 1, daysInMonth(deadline.year, deadline.month));
  return new Date(deadline.year, deadline.month - 1, deadline.day);
}

// 期限を文字にする関数
// withYear が true なら「2029年3月1日まで」、false なら「3月1日まで」（年ごとのまとまりの中で使う）
function deadlineLabel(deadline, withYear) {
  const year = withYear ? deadline.year + "年" : "";
  if (deadline.month === null) return withYear ? deadline.year + "年中" : "年内";
  if (deadline.day === null) return year + deadline.month + "月中";
  return year + deadline.month + "月" + deadline.day + "日まで";
}

// 今日から、ある日までの残りを「あと6年8か月」のような文字にする関数
function remainingText(target) {
  const today = todayDate();
  if (target < today) return "期限をすぎています";
  if (target.getTime() === today.getTime()) return "今日が期限です";

  // まず「何か月あるか」を数える
  let months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  if (target.getDate() < today.getDate()) months = months - 1; // 日にちがまだ来ていなければ1か月引く

  if (months < 1) {
    // 1か月もないときは、日数で出す（1日 = 24時間 × 60分 × 60秒 × 1000ミリ秒）
    const days = Math.round((target - today) / (24 * 60 * 60 * 1000));
    return "あと" + days + "日";
  }
  const years = Math.floor(months / 12); // Math.floor = 小数点以下を切り捨てる
  const restMonths = months % 12;        // % = 割った余り
  let text = "あと";
  if (years > 0) text += years + "年";
  if (restMonths > 0) text += restMonths + "か月";
  return text;
}

// 期限の早い順に並べるためのくらべ方
// 最後の日が同じなら、細かく決めたほう（年月日 → 年と月 → 年だけ）を先にする
function compareDreams(a, b) {
  const diff = deadlineEnd(a.deadline) - deadlineEnd(b.deadline);
  if (diff !== 0) return diff;
  return precision(b.deadline) - precision(a.deadline);
}

// 期限をどこまで細かく決めたか（年月日 = 3、年と月 = 2、年だけ = 1）
function precision(deadline) {
  if (deadline.month === null) return 1;
  if (deadline.day === null) return 2;
  return 3;
}

// ===== 5. 「いつまでに」の入力欄（年・月・日） =====
// 月と日の選択肢を作って、入力に合わせて確認の文字を出す仕組みをつける関数
// 入力フォーム・編集ダイアログ・ステップの追加で使う
// warn = 期限を受け取って、注意の文字（なければ ""）を返す関数（なくてもよい）
function setupDeadlineInputs(prefix, warn) {
  const yearInput = document.getElementById(prefix + "-year");
  const monthSelect = document.getElementById(prefix + "-month");
  const daySelect = document.getElementById(prefix + "-day");
  const preview = document.getElementById(prefix + "-preview");

  // 選択肢を作る（一番上は「－」＝決めていない）
  function fillOptions(select, count) {
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "－";
    select.appendChild(blank);
    for (let n = 1; n <= count; n++) {
      const option = document.createElement("option");
      option.value = n;
      option.textContent = n;
      select.appendChild(option);
    }
  }
  fillOptions(monthSelect, 12);
  fillOptions(daySelect, 31);

  // 過去の日付でも、そのまま残してよい期限（編集で開いたときの、もとの期限）。
  // すでに期限をすぎたものを編集するとき、メモだけ直して保存できるようにするため
  let keep = null;

  // 期限が「残してよい期限」と同じか
  function isKept(year, month, day) {
    return keep !== null && keep.year === year && keep.month === month && keep.day === day;
  }

  // 過去の月・日を選べなくする（今日より前の選択肢を disabled にする）
  function disablePastOptions() {
    const today = todayDate();
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth() + 1;
    const year = Number(yearInput.value);
    const month = Number(monthSelect.value);
    // 年の入力欄の下限（▲▼で今年より前に行かないように）。残してよい期限が前の年なら、その年まで
    yearInput.min = keep && keep.year < thisYear ? keep.year : thisYear;
    for (const option of monthSelect.options) {
      if (option.value === "") continue; // 「－」はいつでも選べる
      const m = Number(option.value);
      option.disabled = year === thisYear && m < thisMonth && !(keep && keep.year === year && keep.month === m);
    }
    for (const option of daySelect.options) {
      if (option.value === "") continue;
      const d = Number(option.value);
      option.disabled = year === thisYear && month === thisMonth && d < today.getDate() && !isKept(year, month, d);
    }
    // 年を変えたせいで、選んでいた月・日が選べなくなったら「－」に戻す
    if (monthSelect.selectedOptions[0] && monthSelect.selectedOptions[0].disabled) monthSelect.value = "";
    if (daySelect.selectedOptions[0] && daySelect.selectedOptions[0].disabled) daySelect.value = "";
  }

  // 入力に合わせて、月・日を選べるかどうかと、確認の文字を変える
  function update() {
    // 年がなければ月は選べない、月がなければ日は選べない
    monthSelect.disabled = yearInput.value === "";
    if (monthSelect.disabled) monthSelect.value = "";
    disablePastOptions(); // 過去の月・日を選べなくする
    daySelect.disabled = monthSelect.value === "";
    if (daySelect.disabled) daySelect.value = "";

    const result = read();
    // 入力のとちゅう（typing）のときは赤字にしない
    preview.classList.toggle("error", result.error !== undefined && !result.typing);
    preview.classList.remove("warning");
    if (result.error) {
      preview.textContent = result.error;
    } else if (result.deadline === null) {
      preview.textContent = warn ? "→ 期限なし" : "→「いつか」に入ります";
    } else if (profile.birthdate) {
      const age = ageOn(parseDate(profile.birthdate), deadlineEnd(result.deadline));
      // 家族を登録していれば「（このとき 自分 25歳・ゆい 5歳）」のように家族の年齢も出す
      const familyText = familyAgesOn(deadlineEnd(result.deadline));
      preview.textContent = "→ " + deadlineLabel(result.deadline, true) + "（このとき " + (familyText ? "自分 " + age + "歳・" + familyText : age + "歳") + "）";
      // 注意があれば、後ろに足して、色を変える
      const warning = warn ? warn(result.deadline) : "";
      if (warning) {
        preview.textContent += "　" + warning;
        preview.classList.add("warning");
      }
    }
  }

  // 入力欄の内容を読む。{ deadline: 期限か null } か、ダメなときは { error: 理由 } を返す
  function read() {
    if (yearInput.value === "") return { deadline: null };
    const year = Number(yearInput.value);
    if (!Number.isInteger(year) || year <= 0) return { error: "年は数字で入れてください" };
    // 4けたになるまでは「入力のとちゅう」。赤字にせず、ふつうの文字で案内する（typing: true）
    if (yearInput.value.length < 4) {
      return { error: "→ 年を4けたで入れてください（例: " + (todayDate().getFullYear() + 3) + "）", typing: true };
    }
    if (year > 2200) return { error: "年は 2200年 までで入れてください" };
    // 今年より前の年は、下の「過去の日付は選べません」で止める
    const month = monthSelect.value === "" ? null : Number(monthSelect.value);
    const day = daySelect.value === "" ? null : Number(daySelect.value);
    if (month !== null && day !== null && day > daysInMonth(year, month)) {
      return { error: year + "年" + month + "月" + day + "日 はありません" };
    }
    // 過去の期限はダメ（年だけ＝その年の終わり、年と月＝その月の終わりで比べる。今日はOK）
    const deadline = { year: year, month: month, day: day };
    if (deadlineEnd(deadline) < todayDate() && !isKept(year, month, day)) {
      return { error: "過去の日付は選べません（今日より後にしてください）" };
    }
    return { deadline: { year: year, month: month, day: day } };
  }

  // 期限を入力欄に入れる（編集ダイアログを開いたとき・入力のあと空にするとき）
  // （編集で開いたときは、その期限を「残してよい期限」として覚えておく）
  function write(deadline) {
    keep = deadline ? { year: deadline.year, month: deadline.month, day: deadline.day } : null;
    yearInput.value = deadline ? deadline.year : "";
    monthSelect.value = deadline && deadline.month !== null ? deadline.month : "";
    daySelect.value = deadline && deadline.day !== null ? deadline.day : "";
    update();
  }

  // 書きかえたり選んだりするたびに、確認の文字を新しくする
  yearInput.addEventListener("input", update);
  monthSelect.addEventListener("change", update);
  daySelect.addEventListener("change", update);
  update();

  return { read: read, write: write, update: update };
}

const newDeadline = setupDeadlineInputs("dream");   // 入力フォーム
const editDeadline = setupDeadlineInputs("edit");   // 編集ダイアログ

// ===== 6. 画面を描く =====
const viewSwitch = document.querySelector(".view-switch"); // 「一覧｜ロードマップ」の切り替え
function render() {
  // 生年月日がまだなら、「はじめに」だけ出す
  const hasBirthdate = Boolean(profile.birthdate);
  setupCard.hidden = hasBirthdate;
  ageCard.hidden = !hasBirthdate;
  addButton.hidden = !hasBirthdate;
  sideAddButton.hidden = !hasBirthdate;
  listCard.hidden = !hasBirthdate;
  if (!hasBirthdate) return;

  const birth = parseDate(profile.birthdate);
  currentAgeText.textContent = ageOn(birth, todayDate());
  const active = activeDreams();
  dreamCount.textContent = active.length > 0 ? "（" + active.length + "件）" : "";
  viewSwitch.hidden = dreams.length === 0; // まだ1つも無いときは、切り替えのボタンもいらない

  renderFilter();                           // 分野で絞りこむボタン
  renderList(birth, groupEntries(false));   // 一覧：やりたいことだけ
  renderRoadmap(birth, groupEntries(true)); // ロードマップ：期限のあるステップも並べる
  renderAchieved(birth);                    // 叶えたこと
  renderStats();                            // 達成の記録
  renderSide(birth);                        // PC の左の列
}

// まだ叶えていないやりたいこと（叶えたものには achievedAt に叶えた日が入っている）
function activeDreams() {
  return dreams.filter(function (d) { return !d.achievedAt; });
}

// 一覧やロードマップが空のときのお知らせ（絞りこみ中ならそのこと、全部叶えたときは、ほめる）
function emptyMessage(normal) {
  if (filterCategory !== null) return "「" + filterCategory + "」のマイルストーンは、今はありません";
  return dreams.length > 0 ? "全部叶えました！新しいマイルストーンを追加しましょう" : normal;
}

// ===== 分野で絞りこみ =====
const filterBar = document.getElementById("filter-bar");
const FILTER_KEY = "roadmap-filter"; // 選んだ分野を覚えておく場所の名前
let filterCategory = localStorage.getItem(FILTER_KEY); // 選んでいる分野（すべてなら null）

// 絞りこみに合うか（すべてなら、どれでも合う）
function matchesFilter(dream) {
  return filterCategory === null || dream.category === filterCategory;
}

// 一覧やロードマップに出す、まだ叶えていないやりたいこと（絞りこみに合うものだけ）
function shownDreams() {
  return activeDreams().filter(matchesFilter);
}

// 分野を選ぶ関数（null なら「すべて」）
function setFilter(category) {
  filterCategory = category;
  if (category === null) {
    localStorage.removeItem(FILTER_KEY);
  } else {
    localStorage.setItem(FILTER_KEY, category);
  }
  render();
}

// 分野のボタンを並べる関数
function renderFilter() {
  // やりたいこと（叶えたものも含む）が入っている分野だけ、分野の一覧の順に並べる
  const used = categories.map(function (c) { return c.name; }).filter(function (name) {
    return dreams.some(function (d) { return d.category === name; }); // some = どれか1つでも当てはまるか
  });
  // 選んでいた分野のやりたいことが無くなったら、「すべて」に戻す
  if (filterCategory !== null && !used.includes(filterCategory)) {
    filterCategory = null;
    localStorage.removeItem(FILTER_KEY);
  }

  filterBar.textContent = "";
  filterBar.hidden = used.length < 2; // 分野が1つしかなければ、絞りこむ意味がないので隠す
  filterBar.appendChild(makeFilterButton(null, "すべて", activeDreams().length));
  for (const name of used) {
    const count = activeDreams().filter(function (d) { return d.category === name; }).length;
    filterBar.appendChild(makeFilterButton(name, name, count));
  }
}

// 分野のボタン1つ分を作る関数
function makeFilterButton(category, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-chip";
  const selected = filterCategory === category;
  if (selected) button.classList.add("selected");
  if (category !== null) {
    // 色の丸。選んでいるときは、ボタン全体を分野の色にする
    const dot = document.createElement("span");
    dot.className = "filter-dot";
    dot.style.backgroundColor = colorOf(category);
    button.appendChild(dot);
    if (selected) button.style.backgroundColor = colorOf(category);
  }
  button.append(label);
  const number = document.createElement("span");
  number.className = "filter-count";
  number.textContent = count;
  button.appendChild(number);
  button.addEventListener("click", function () {
    setFilter(category);
  });
  return button;
}

// やりたいことのステップの一覧（前の版のデータには無いので、無ければ空にする）
function stepsOf(dream) {
  if (!dream.steps) dream.steps = [];
  return dream.steps;
}

// 一覧やロードマップに並べるもの（「項目」）を、「期限をすぎたもの」「年ごと」「いつか」に分ける関数
// 項目は { kind: "dream" か "step", deadline: 期限, dream: やりたいこと, step: ステップ }
// includeSteps が true なら、期限のあるステップも項目に入れる
function groupEntries(includeSteps) {
  const today = todayDate();
  const entries = [];
  for (const dream of shownDreams()) { // 叶えたものは「叶えたこと」に出すので、ここには入れない（絞りこみにも合わせる）
    if (dream.deadline !== null) entries.push({ kind: "dream", deadline: dream.deadline, dream: dream });
    if (!includeSteps) continue;
    for (const step of stepsOf(dream)) {
      if (step.deadline === null) continue; // 期限のないステップは、詳細の画面だけに出す
      // 期限をすぎた、できたステップは、もう年表に出さない
      if (step.done && deadlineEnd(step.deadline) < today) continue;
      entries.push({ kind: "step", deadline: step.deadline, dream: dream, step: step });
    }
  }
  entries.sort(compareDreams); // 期限の早い順（くらべ方は、やりたいこともステップも同じ）

  const overdue = [];     // 期限をすぎたもの
  const years = [];       // 年ごとのまとまり [{ year: 2029, items: [...] }, …]
  for (const entry of entries) {
    if (deadlineEnd(entry.deadline) < today) {
      overdue.push(entry);
      continue;
    }
    const last = years[years.length - 1];
    if (last && last.year === entry.deadline.year) {
      last.items.push(entry);
    } else {
      years.push({ year: entry.deadline.year, items: [entry] });
    }
  }
  const someday = shownDreams()
    .filter(function (d) { return d.deadline === null; })
    .map(function (d) { return { kind: "dream", deadline: null, dream: d }; });
  return { overdue: overdue, years: years, someday: someday };
}

// 項目1つ分の見た目を作る関数（やりたいことか、ステップか）
function makeEntry(entry, birth, withYear) {
  if (entry.kind === "step") return makeStepEntry(entry, birth, withYear);
  return makeDreamItem(entry.dream, birth, withYear);
}

// ロードマップに並べるステップ（小さめ。押すと、そのやりたいことの詳細が開く）
function makeStepEntry(entry, birth, withYear) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "step-entry";
  if (entry.step.done) item.classList.add("done");
  item.style.borderLeftColor = colorOf(entry.dream.category);

  const mark = document.createElement("span");
  mark.className = "step-mark";
  mark.textContent = entry.step.done ? "✓" : "";

  const text = document.createElement("span");
  text.className = "dream-text";
  const title = document.createElement("span");
  title.className = "step-entry-title";
  title.textContent = entry.step.title;
  const parent = document.createElement("span");
  parent.className = "step-entry-parent";
  parent.textContent = "↳ " + entry.dream.title; // どのやりたいことのステップか
  const end = deadlineEnd(entry.deadline);
  const date = document.createElement("span");
  date.className = "dream-date";
  if (end < todayDate()) date.classList.add("overdue");
  date.textContent = deadlineLabel(entry.deadline, withYear) + "・" + (entry.step.done ? "できた！" : remainingText(end));
  text.append(title, parent, date);

  item.append(mark, text);
  item.addEventListener("click", function () {
    openDetail(entry.dream);
  });
  return item;
}

// その年に何歳か（「25〜26歳」のように、年の初めと終わりの年齢）
function agesInYear(birth, year) {
  const first = ageOn(birth, new Date(year, 0, 1));
  const last = ageOn(birth, new Date(year, 11, 31));
  return first === last ? first + "歳" : first + "〜" + last + "歳";
}

// 自分の、ある年の年齢。家族を登録しているときは「自分 25〜26歳」と、だれの年齢かを付ける
function selfAgesInYear(birth, year) {
  return (family.length > 0 ? "自分 " : "") + agesInYear(birth, year);
}

// やりたいこと1つ分の見た目を作る関数（押すと編集ダイアログが開く）
// withYear = 期限の文字に年も書くか
function makeDreamItem(dream, birth, withYear) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "dream-item";
  item.style.borderLeftColor = colorOf(dream.category); // 左の太い線を、分野の色にする
  item.dataset.dreamId = dream.id; // あとで「追加したもの」を探して光らせるための目じるし

  const text = document.createElement("span");
  text.className = "dream-text";
  const title = document.createElement("span");
  title.className = "dream-title";
  title.textContent = dream.title;
  text.appendChild(title);

  // 叶えたもの：「2026年11月22日に叶えた（22歳）」
  // まだのもの：「3月1日まで・あと2年3か月（25歳）」
  if (dream.achievedAt) {
    item.classList.add("achieved");
    const date = document.createElement("span");
    date.className = "dream-date achieved-date";
    date.textContent = achievedLabel(dream, birth);
    text.appendChild(date);
    // 達成の記録の感想があれば「💬 感想」
    if (dream.achievedNote) {
      const note = document.createElement("span");
      note.className = "dream-memo achieved-note";
      note.textContent = "💬 " + dream.achievedNote;
      text.appendChild(note);
    }
  } else if (dream.deadline !== null) {
    const end = deadlineEnd(dream.deadline);
    const date = document.createElement("span");
    date.className = "dream-date";
    if (end < todayDate()) date.classList.add("overdue");
    date.textContent = deadlineLabel(dream.deadline, withYear) + "・" + remainingText(end) + "（" + ageOn(birth, end) + "歳）";
    text.appendChild(date);
  }
  if (dream.memo) {
    const memo = document.createElement("span");
    memo.className = "dream-memo";
    memo.textContent = dream.memo;
    text.appendChild(memo);
  }
  // ステップがあれば「ステップ 2/4」と進み具合のバー
  const steps = stepsOf(dream);
  if (steps.length > 0) {
    const doneCount = steps.filter(function (s) { return s.done; }).length;
    const progress = document.createElement("span");
    progress.className = "dream-progress";
    const label = document.createElement("span");
    label.textContent = "ステップ " + doneCount + "/" + steps.length;
    const bar = document.createElement("span");
    bar.className = "mini-bar";
    const fill = document.createElement("span");
    fill.style.width = Math.round(doneCount / steps.length * 100) + "%";
    bar.appendChild(fill);
    progress.append(label, bar);
    text.appendChild(progress);
  }

  const chip = document.createElement("span");
  chip.className = "category-chip";
  chip.style.backgroundColor = colorOf(dream.category);
  chip.textContent = dream.category;

  item.append(text);
  // 達成の写真があれば、小さく出す
  const photo = dream.achievedAt ? loadPhoto(dream.id) : null;
  if (photo) {
    const thumb = document.createElement("img");
    thumb.className = "dream-thumb";
    thumb.src = photo;
    thumb.alt = "";
    item.appendChild(thumb);
  }
  item.appendChild(chip);
  item.addEventListener("click", function () {
    openDetail(dream);
  });
  return item;
}

// 何もないときのお知らせ
function makeEmpty(message) {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}


// やりたいことがまだ1つも無いときの案内（はじめて使う人向け）
// アイコン・説明・例と、追加の画面を開くボタンを出す
function makeWelcome() {
  const box = document.createElement("div");
  box.className = "welcome";

  const icon = document.createElement("img");
  icon.src = "icons/icon.svg";
  icon.alt = "";            // 飾りなので読み上げない
  icon.className = "welcome-icon";

  const title = document.createElement("p");
  title.className = "welcome-title";
  title.textContent = "最初のマイルストーンを追加しよう";

  const text = document.createElement("p");
  text.className = "welcome-text";
  text.textContent = "叶えたいこと・行きたい場所・なりたい自分など、思いつくままでOK。期限が決まっていなくても「いつか」に入れておけます。";

  // 例（押すと、その言葉が入った状態で追加の画面が開く）
  const examples = document.createElement("div");
  examples.className = "welcome-examples";
  for (const example of ["海外に住む", "フルマラソンを走る", "貯金100万円"]) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "welcome-example";
    chip.textContent = example;
    chip.addEventListener("click", function () {
      titleInput.value = example;
      addDialog.showModal();
    });
    examples.appendChild(chip);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "welcome-button";
  button.textContent = "＋ マイルストーンを追加";
  button.addEventListener("click", function () {
    addDialog.showModal();
  });

  box.append(icon, title, text, examples, button);
  return box;
}
// ===== 一覧 =====
function renderList(birth, groups) {
  dreamList.textContent = ""; // いったん空にする
  if (dreams.length === 0) {
    dreamList.appendChild(makeWelcome()); // まだ1つも無いときは、はじめての案内
    return;
  }
  if (shownDreams().length === 0) {
    dreamList.appendChild(makeEmpty(emptyMessage("まだありません。右下の「＋」から、思いつくまま追加してみましょう！")));
    return;
  }
  if (groups.overdue.length > 0) {
    addListGroup("期限をすぎたもの", "", true, groups.overdue.map(function (e) { return makeEntry(e, birth, true); }));
  }
  for (const group of groups.years) {
    addListGroup(group.year + "年", selfAgesInYear(birth, group.year), false,
      group.items.map(function (e) { return makeEntry(e, birth, false); }), familyAgesInYear(group.year));
  }
  if (groups.someday.length > 0) {
    addListGroup("いつか", "期限を決めると、上に並びます", false,
      groups.someday.map(function (e) { return makeEntry(e, birth, true); }));
  }
}

// 一覧に、1つのまとまり（見出し＋やりたいこと）を足す関数
// familyText = 家族の年齢（なくてもよい）。あれば見出しの下にもう1行出す
function addListGroup(title, sub, isOverdue, items, familyText) {
  const heading = document.createElement("div");
  heading.className = "group-title";
  if (isOverdue) heading.classList.add("overdue");
  const titleText = document.createElement("span");
  titleText.className = "group-age";
  titleText.textContent = title;
  const subText = document.createElement("span");
  subText.className = "group-remaining";
  subText.textContent = sub;
  heading.append(titleText, subText);
  if (familyText) {
    const familyLine = document.createElement("span");
    familyLine.className = "group-family";
    familyLine.textContent = familyText;
    heading.appendChild(familyLine);
  }
  dreamList.appendChild(heading);
  for (const item of items) dreamList.appendChild(item);
}

// ===== 叶えたこと =====
const achievedBox = document.getElementById("achieved-box");
const achievedCount = document.getElementById("achieved-count");
const achievedList = document.getElementById("achieved-list");

// 今日の日付を "2026-11-22" の形で返す関数
function todayString() {
  const d = todayDate();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// 「2026年11月22日に叶えた（22歳）」
function achievedLabel(dream, birth) {
  const date = parseDate(dream.achievedAt);
  return formatDate(date) + "に叶えた（" + ageOn(birth, date) + "歳）";
}

// 日付を「2026年11月22日」の形にする関数
function formatDate(date) {
  return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日";
}

// 叶えたことの一覧を描く関数（新しく叶えた順）
function renderAchieved(birth) {
  // 叶えたもので、絞りこみに合うもの
  const achieved = dreams.filter(function (d) { return d.achievedAt && matchesFilter(d); });
  achievedBox.hidden = achieved.length === 0; // 1つもなければ箱ごと隠す
  achievedCount.textContent = "（" + achieved.length + "件）";
  // 叶えた日の新しい順（"2026-11-22" の形の文字は、そのままくらべれば日付の順になる）
  achieved.sort(function (a, b) { return a.achievedAt < b.achievedAt ? 1 : -1; });
  achievedList.textContent = "";
  for (const dream of achieved) achievedList.appendChild(makeDreamItem(dream, birth, true));
}


// ===== PC の左の列（もうすぐのやりたいこと・分野ごとのまとめ・叶えたこと） =====
const upcomingCard = document.getElementById("upcoming-card");
const upcomingList = document.getElementById("upcoming-list");
const summaryCard = document.getElementById("summary-card");
const summaryList = document.getElementById("summary-list");
const sideAchieved = document.getElementById("side-achieved");

// 「PC の広さかどうか」を調べる道具（style.css の @media (min-width: 900px) と同じ広さ）
const pcQuery = window.matchMedia("(min-width: 900px)");

// 「叶えたこと」の箱を、PC なら左の列に、スマホなら「やりたいこと」のカードの一番下に置く
function placeAchievedBox() {
  const target = pcQuery.matches ? sideAchieved : listCard;
  if (achievedBox.parentElement !== target) target.appendChild(achievedBox);
  sideAchieved.hidden = !pcQuery.matches || achievedBox.hidden;
}
// 画面の広さが変わったとき（ウィンドウの大きさを変えた・iPad を回した）も置き直す
pcQuery.addEventListener("change", placeAchievedBox);

// 左の列を描く関数（render から呼ぶ）
function renderSide(birth) {
  renderUpcoming(birth);
  renderSummary();
  placeAchievedBox();
}

// ⏰ もうすぐのやりたいこと：まだ叶えていなくて、期限が今日以降のものを、期限の近い順に3つ
function renderUpcoming(birth) {
  const today = todayDate();
  const upcoming = activeDreams()
    .filter(function (d) { return d.deadline !== null && deadlineEnd(d.deadline) >= today; })
    .sort(compareDreams)
    .slice(0, 3); // slice(0, 3) = 前から3つだけ取り出す
  upcomingCard.hidden = upcoming.length === 0;
  upcomingList.textContent = "";
  for (const dream of upcoming) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "upcoming-item";
    item.style.borderLeftColor = colorOf(dream.category); // 左の線は分野の色
    const title = document.createElement("span");
    title.className = "upcoming-title";
    title.textContent = dream.title;
    const date = document.createElement("span");
    date.className = "upcoming-date";
    date.textContent = deadlineLabel(dream.deadline, true) + "・" + remainingText(deadlineEnd(dream.deadline));
    item.append(title, date);
    item.addEventListener("click", function () { openDetail(dream); });
    upcomingList.appendChild(item);
  }
}

// 📊 分野ごとのまとめ：使っている分野ごとに「○件・叶えた○件」と、叶えた割合のバー
function renderSummary() {
  summaryList.textContent = "";
  let shownCount = 0;
  for (const category of categories) {
    const all = dreams.filter(function (d) { return d.category === category.name; });
    if (all.length === 0) continue; // やりたいことが無い分野は出さない
    shownCount++;
    const achieved = all.filter(function (d) { return d.achievedAt; }).length;

    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "summary-row";
    if (filterCategory === category.name) button.classList.add("selected"); // 絞りこみ中の分野に印

    const head = document.createElement("span");
    head.className = "summary-head";
    head.appendChild(makeDot(category.name));
    const name = document.createElement("span");
    name.className = "summary-name";
    name.textContent = category.name;
    const count = document.createElement("span");
    count.className = "summary-count";
    count.textContent = all.length + "件" + (achieved > 0 ? "・叶えた " + achieved : "");
    head.append(name, count);

    // 叶えた割合のバー（全部叶えたら、いっぱいになる）
    const bar = document.createElement("span");
    bar.className = "summary-bar";
    const fill = document.createElement("span");
    fill.className = "summary-fill";
    fill.style.width = Math.round((achieved / all.length) * 100) + "%";
    fill.style.backgroundColor = category.color;
    bar.appendChild(fill);

    button.append(head, bar);
    // 押すと、その分野で絞りこむ（もう一度押すと「すべて」に戻す）
    button.addEventListener("click", function () {
      setFilter(filterCategory === category.name ? null : category.name);
    });
    row.appendChild(button);
    summaryList.appendChild(row);
  }
  summaryCard.hidden = shownCount === 0;
}
// ===== 達成の記録 =====
const statTotal = document.getElementById("stat-total");
const statYear = document.getElementById("stat-year");
const statSteps = document.getElementById("stat-steps");
const statTotalButton = document.getElementById("stat-total-button");

// 今までに叶えた数・今年叶えた数・できたステップの数を出す関数
function renderStats() {
  const achieved = dreams.filter(function (d) { return d.achievedAt; });
  // 今年 = 叶えた日（"2026-11-22"）の最初の4文字が、今年の数字と同じもの
  const thisYear = String(todayDate().getFullYear());
  const achievedThisYear = achieved.filter(function (d) { return d.achievedAt.slice(0, 4) === thisYear; });
  // できたステップ：全部のやりたいことのステップを数える
  let doneSteps = 0;
  for (const dream of dreams) {
    doneSteps = doneSteps + stepsOf(dream).filter(function (s) { return s.done; }).length;
  }
  statTotal.textContent = achieved.length;
  statYear.textContent = achievedThisYear.length;
  statSteps.textContent = doneSteps;
}

// 「今までに叶えた」を押すと、下の「叶えたこと」を開いて、そこまで移動する
statTotalButton.addEventListener("click", function () {
  if (!dreams.some(function (d) { return d.achievedAt; })) {
    showToast("達成したことは、まだありません。最初の1つを叶えましょう！");
    return;
  }
  if (filterCategory !== null) setFilter(null); // 絞りこみ中なら「すべて」に戻して、全部見せる
  achievedBox.open = true;
  achievedBox.scrollIntoView({ behavior: "smooth", block: "start" }); // なめらかにスクロール
});

// ===== ロードマップ（年表） =====
const roadmap = document.getElementById("roadmap");

// 年と年の間の線の長さ（1年あたり何ピクセルか）。長すぎ・短すぎにならないように上限と下限も決める
const PX_PER_YEAR = 18;
const MIN_GAP = 16;
const MAX_GAP = 160;

function renderRoadmap(birth, groups) {
  roadmap.textContent = ""; // いったん空にする
  if (dreams.length === 0) {
    roadmap.appendChild(makeWelcome()); // まだ1つも無いときは、はじめての案内
    return;
  }
  if (shownDreams().length === 0) {
    roadmap.appendChild(makeEmpty(emptyMessage("マイルストーンを追加すると、ここに人生の地図ができます")));
    return;
  }

  // --- 線の上に並べる「点」を作る。key = 並べる順番と、間の長さを決める数（年） ---
  // 「今」の key は、今年の何割まで来たか（例: 11月なら 2026.9 くらい）
  const today = todayDate();
  const nowKey = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
  const points = [];
  if (groups.overdue.length > 0) points.push({ type: "overdue", key: nowKey - 1 });
  points.push({ type: "now", key: nowKey });
  for (const group of groups.years) {
    // 今年の点は「今」のすぐ下に置く（今年の初めは、もうすぎているので）
    points.push({ type: "year", key: Math.max(group.year, nowKey), group: group });
  }

  // --- 縦の線（年表の本体） ---
  const line = document.createElement("div");
  line.className = "timeline";
  points.forEach(function (point, index) {
    if (index > 0) line.appendChild(makeGap(points[index - 1], point));
    if (point.type === "overdue") line.appendChild(makeOverduePoint(birth, groups.overdue));
    if (point.type === "now") line.appendChild(makeNowPoint(birth));
    if (point.type === "year") line.appendChild(makeYearPoint(birth, point.group));
  });
  roadmap.appendChild(line);

  // --- いつか（年表の下に、点線でつなげて置く） ---
  if (groups.someday.length > 0) {
    const box = document.createElement("div");
    box.className = "someday";
    const title = document.createElement("p");
    title.className = "someday-title";
    title.textContent = "いつか";
    box.appendChild(title);
    for (const entry of groups.someday) box.appendChild(makeEntry(entry, birth, true));
    roadmap.appendChild(box);
  }
}

// 点と点の間のすき間を作る関数。年数が多いほど長くなる
function makeGap(before, after) {
  const years = after.key - before.key;
  const gap = document.createElement("div");
  gap.className = "timeline-gap";
  // Math.min / Math.max で、下限と上限のあいだにおさめる
  const height = Math.max(MIN_GAP, Math.min(MAX_GAP, Math.round(years * PX_PER_YEAR)));
  gap.style.height = height + "px";
  // 年と年の間で、2年以上あいているときは、何年あいているかを小さく書く
  // （今年の点は少しずらして置いているので、年数は本当の年どうしの差で出す）
  if (before.type === "year" && after.type === "year") {
    const yearGap = after.group.year - before.group.year;
    if (yearGap >= 2) {
      const label = document.createElement("span");
      label.className = "gap-label";
      label.textContent = yearGap + "年";
      gap.appendChild(label);
    }
  }
  return gap;
}

// 点の見出し（「2029年」など）を作る関数
// familyText = 家族の年齢（なければ "" か省略）。あれば、その下にもう1行出す
function makePointHeading(point, titleText, subText, familyText) {
  const title = document.createElement("p");
  title.className = "point-title";
  title.textContent = titleText;
  const sub = document.createElement("p");
  sub.className = "point-sub";
  sub.textContent = subText;
  point.append(title, sub);
  if (familyText) {
    const familyLine = document.createElement("p");
    familyLine.className = "point-family";
    familyLine.textContent = familyText;
    point.appendChild(familyLine);
  }
}

// 「今」の点
function makeNowPoint(birth) {
  const point = document.createElement("div");
  point.className = "timeline-point now";
  const today = todayDate();
  makePointHeading(point, "今 " + ageOn(birth, today) + "歳",
    today.getFullYear() + "年" + (today.getMonth() + 1) + "月" + today.getDate() + "日", familyAgesOn(today));
  return point;
}

// 「期限をすぎたもの」の点（赤）
function makeOverduePoint(birth, items) {
  const point = document.createElement("div");
  point.className = "timeline-point overdue";
  makePointHeading(point, "期限をすぎたもの", "期限を決め直すか、叶えたら消しましょう");
  for (const entry of items) point.appendChild(makeEntry(entry, birth, true));
  return point;
}

// 年の点（その年のやりたいことを、期限の早い順に並べる）
function makeYearPoint(birth, group) {
  const point = document.createElement("div");
  point.className = "timeline-point";
  makePointHeading(point, group.year + "年", selfAgesInYear(birth, group.year), familyAgesInYear(group.year));
  for (const entry of group.items) point.appendChild(makeEntry(entry, birth, false));
  return point;
}

// ===== 一覧とロードマップの切り替え =====
const showListButton = document.getElementById("show-list");
const showRoadmapButton = document.getElementById("show-roadmap");
const VIEW_KEY = "roadmap-view"; // 最後に選んだ見え方を覚えておく場所の名前

// 見え方を切り替える関数（view は "list" か "roadmap"）
function setView(view) {
  dreamList.hidden = view !== "list";
  roadmap.hidden = view !== "roadmap";
  showListButton.classList.toggle("active", view === "list");
  showRoadmapButton.classList.toggle("active", view === "roadmap");
  localStorage.setItem(VIEW_KEY, view);
}

showListButton.addEventListener("click", function () { setView("list"); });
showRoadmapButton.addEventListener("click", function () { setView("roadmap"); });

// 最初は、最後に選んだ見え方にする（何も覚えていなければロードマップ）
setView(localStorage.getItem(VIEW_KEY) === "list" ? "list" : "roadmap");

// ===== 7. 生年月日 =====
setupForm.addEventListener("submit", function (event) {
  event.preventDefault(); // ページのリセットを止める
  profile.birthdate = birthdateInput.value;
  saveProfile();
  migrateOldDreams();
  render();
});

// 「生年月日を変更」：はじめの画面に戻す（今の生年月日を入れておく）
// （メニューの中のボタン。押したらメニューを閉じる）
changeBirthdateButton.addEventListener("click", function () {
  menuDialog.close();
  birthdateInput.value = profile.birthdate;
  profile.birthdate = null;
  render();
  birthdateInput.focus();
});

// ===== 8. やりたいことを追加 =====
// 右下の「＋」を押したら、追加のダイアログを開く
addButton.addEventListener("click", function () {
  addDialog.showModal();
});
sideAddButton.addEventListener("click", function () {
  addDialog.showModal();
});

// 「キャンセル」：ダイアログを閉じる（書きかけの文字は、次に開いたときのために残しておく）
cancelAddButton.addEventListener("click", function () {
  addDialog.close();
});

dreamForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const result = newDeadline.read();
  if (result.error) return; // 日付がおかしいとき（確認の文字に、赤で理由が出ている）

  const dream = {
    id: "d" + Date.now(),              // 今の時刻の数字（毎回ちがう数になる）
    title: titleInput.value.trim(),    // trim = 前後のすき間を取る
    category: categoryInput.value,
    deadline: result.deadline,
    memo: memoInput.value.trim(),
  };
  if (dream.title === "") return;

  dreams.push(dream);
  saveDreams();
  // 別の分野で絞りこみ中だと、追加したものが見えないので、絞りこみを外す（外すと描き直される）
  if (filterCategory !== null && dream.category !== filterCategory) {
    setFilter(null);
  } else {
    render();
  }
  addDialog.close(); // 追加したら、ダイアログを閉じてロードマップを見せる
  highlightDream(dream.id); // 追加したものを一瞬光らせて、どこに入ったか教える
  showToast(dream.deadline === null ? "「いつか」に追加しました" : deadlineLabel(dream.deadline, true) + "、を追加しました");

  // 次の入力に備えて、欄を空にする（分野はそのまま）
  titleInput.value = "";
  newDeadline.write(null);
  memoInput.value = "";
});

// 追加したやりたいことを、今見えている一覧かロードマップの中から探して、
// そこまでスクロールして一瞬光らせる関数
function highlightDream(id) {
  const container = roadmap.hidden ? dreamList : roadmap;
  const item = container.querySelector('[data-dream-id="' + id + '"]');
  if (!item) return;
  item.scrollIntoView({ behavior: "smooth", block: "center" }); // 画面の真ん中に来るようにスクロール
  item.classList.remove("flash");
  void item.offsetWidth; // 動きをもう一度最初から始めるための、おまじない
  item.classList.add("flash");
}

// ===== 詳細ダイアログ（小さなステップ） =====
const detailDialog = document.getElementById("detail-dialog");
const detailCategory = document.getElementById("detail-category");
const detailTitle = document.getElementById("detail-title");
const detailDeadline = document.getElementById("detail-deadline");
const detailMemo = document.getElementById("detail-memo");
const detailFamily = document.getElementById("detail-family");
const detailProgressText = document.getElementById("detail-progress-text");
const detailProgressBar = document.getElementById("detail-progress-bar");
const stepList = document.getElementById("step-list");
const stepForm = document.getElementById("step-form");
const stepTitleInput = document.getElementById("step-title");
const closeDetailButton = document.getElementById("close-detail");
const openEditButton = document.getElementById("open-edit");

let dreamInDetail = null; // どのやりたいことの詳細を開いているか

// ステップの期限が、やりたいことの期限より後なら注意を出す
const stepDeadline = setupDeadlineInputs("step", function (deadline) {
  if (!dreamInDetail || dreamInDetail.deadline === null) return "";
  if (deadlineEnd(deadline) > deadlineEnd(dreamInDetail.deadline)) {
    return "※ マイルストーンの期限（" + deadlineLabel(dreamInDetail.deadline, true) + "）より後です";
  }
  return "";
});

// 詳細の画面を開く関数
function openDetail(dream) {
  dreamInDetail = dream;
  stepTitleInput.value = "";
  stepDeadline.write(null);
  renderDetail();
  if (!detailDialog.open) detailDialog.showModal();
}

// 詳細の画面の中身を描く関数（ステップを足したり、チェックしたりするたびに呼ぶ）
function renderDetail() {
  const dream = dreamInDetail;
  const birth = parseDate(profile.birthdate);

  detailCategory.textContent = dream.category;
  detailCategory.style.backgroundColor = colorOf(dream.category);
  detailTitle.textContent = dream.title;
  if (dream.deadline === null) {
    detailDeadline.textContent = "いつか（期限なし）";
  } else {
    const end = deadlineEnd(dream.deadline);
    detailDeadline.textContent = deadlineLabel(dream.deadline, true) + "・" + remainingText(end) + "（" + ageOn(birth, end) + "歳）";
  }
  detailMemo.textContent = dream.memo;
  detailMemo.hidden = dream.memo === "";

  // 家族の年齢（叶えたなら叶えた日、まだなら期限の最後の日。いつかなら出さない）
  const familyDate = dream.achievedAt ? parseDate(dream.achievedAt) : (dream.deadline ? deadlineEnd(dream.deadline) : null);
  const familyText = familyDate ? familyAgesOn(familyDate) : "";
  detailFamily.textContent = "このとき 👪 " + familyText;
  detailFamily.hidden = familyText === "";

  // 叶えたかどうかで、表示とボタンを変える
  if (dream.achievedAt) {
    detailAchieved.textContent = "🎉 " + achievedLabel(dream, birth);
    detailAchieved.hidden = false;
    renderDetailRecord(dream); // 達成の記録（感想と写真）
    if (dream.deadline !== null) detailDeadline.textContent = "期限：" + deadlineLabel(dream.deadline, true);
    achieveButton.textContent = "叶えたを取り消す";
    achieveButton.classList.add("undo");
  } else {
    detailAchieved.hidden = true;
    detailRecord.hidden = true;
    achieveButton.textContent = "🎉 叶えた！";
    achieveButton.classList.remove("undo");
  }

  // 進み具合
  const steps = stepsOf(dream);
  const doneCount = steps.filter(function (s) { return s.done; }).length;
  const percent = steps.length === 0 ? 0 : Math.round(doneCount / steps.length * 100);
  detailProgressText.textContent = steps.length === 0 ? "" : doneCount + "/" + steps.length + "（" + percent + "%）";
  detailProgressBar.style.width = percent + "%";

  // ステップの一覧：期限の早い順。期限のないものは最後（足した順）
  stepList.textContent = "";
  if (steps.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "大きな夢を、小さなステップに分けてみましょう";
    stepList.appendChild(empty);
  }
  const dated = steps.filter(function (s) { return s.deadline !== null; }).sort(compareDreams);
  const undated = steps.filter(function (s) { return s.deadline === null; });
  for (const step of dated.concat(undated)) { // concat = 2つの配列をつなげる
    stepList.appendChild(makeStepRow(step, birth));
  }
}

// ステップ1行分を作る関数（チェック・名前・期限・×）
function makeStepRow(step, birth) {
  const row = document.createElement("li");
  row.className = "step-row";
  if (step.done) row.classList.add("done");

  // チェックの四角。<label> で包むと、名前を押してもチェックが切りかわる
  const label = document.createElement("label");
  label.className = "step-label";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = step.done;
  checkbox.addEventListener("change", function () {
    step.done = checkbox.checked;
    // できた日を残す（外したら消す）。あとで「今年できたステップ」なども出せるように
    if (step.done) {
      step.doneAt = todayString();
    } else {
      delete step.doneAt;
    }
    saveDreams();
    renderDetail();
    render(); // 一覧やロードマップの進み具合も新しくする
    if (step.done) showToast("できた！ 1歩前進です");
  });

  const text = document.createElement("span");
  text.className = "step-text";
  const title = document.createElement("span");
  title.className = "step-title";
  title.textContent = step.title;
  text.appendChild(title);
  if (step.deadline !== null) {
    const end = deadlineEnd(step.deadline);
    const date = document.createElement("span");
    date.className = "dream-date";
    if (!step.done && end < todayDate()) date.classList.add("overdue");
    date.textContent = deadlineLabel(step.deadline, true) + "・" + (step.done ? "できた！" : remainingText(end)) + "（" + ageOn(birth, end) + "歳）";
    text.appendChild(date);
  }
  label.append(checkbox, text);

  // ×：このステップを消す
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "step-remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "このステップを削除");
  remove.addEventListener("click", function () {
    dreamInDetail.steps = stepsOf(dreamInDetail).filter(function (s) { return s.id !== step.id; });
    saveDreams();
    renderDetail();
    render();
    showToast("ステップを削除しました");
  });

  row.append(label, remove);
  return row;
}

// 「＋ ステップを追加」
stepForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const title = stepTitleInput.value.trim();
  const result = stepDeadline.read();
  if (title === "" || result.error) return;
  stepsOf(dreamInDetail).push({ id: "s" + Date.now(), title: title, deadline: result.deadline, done: false });
  saveDreams();
  stepTitleInput.value = "";
  stepDeadline.write(null);
  renderDetail();
  render();
  showToast("ステップを追加しました");
});

closeDetailButton.addEventListener("click", function () {
  detailDialog.close();
});

// ===== 叶えた！ =====
const detailAchieved = document.getElementById("detail-achieved");
const achieveButton = document.getElementById("achieve-button");
const celebration = document.getElementById("celebration");
const celebrationDream = document.getElementById("celebration-dream");
const confetti = document.getElementById("confetti");

achieveButton.addEventListener("click", function () {
  const dream = dreamInDetail;
  if (dream.achievedAt) {
    // 叶えたを取り消す
    delete dream.achievedAt;
    saveDreams();
    renderDetail();
    render();
    showToast("叶えたを取り消しました");
    return;
  }
  dream.achievedAt = todayString(); // 叶えた日を残す
  saveDreams();
  render();
  detailDialog.close(); // お祝いの画面を、ダイアログより手前に出すため、先に閉じる
  celebrate(dream);
  lastCelebrated = dream; // お祝いの画面を閉じたら、記録の画面を開く
});

// お祝いの画面を出す関数
function celebrate(dream) {
  celebrationDream.textContent = "「" + dream.title + "」を叶えました";
  confetti.textContent = "";
  // 「動きを減らす」設定の人には、紙吹雪を出さない
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    const colors = ["#0f9d8a", "#3bb3c3", "#eda100", "#e87ba4", "#6250d6", "#eb6834"];
    for (let i = 0; i < 80; i++) {
      // 紙吹雪1枚：場所・色・落ちる速さ・始まる時間を、Math.random（でたらめな数）でばらばらにする
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.backgroundColor = colors[i % colors.length];
      piece.style.animationDuration = 2 + Math.random() * 2 + "s";
      piece.style.animationDelay = Math.random() * 0.8 + "s";
      piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
      confetti.appendChild(piece);
    }
  }
  celebration.hidden = false;
}

// お祝いの画面は、どこをタップしても閉じる
celebration.addEventListener("click", function () {
  celebration.hidden = true;
  confetti.textContent = "";
  showToast("「達成したこと」に移しました");
  // 続けて「達成の記録」（感想・写真）の画面を開く。書かないときは「あとで」
  if (lastCelebrated) {
    openRecord(lastCelebrated, false);
    lastCelebrated = null;
  }
});


// ===== 達成の記録（叶えたときの、ひとこと感想と写真） =====
const detailRecord = document.getElementById("detail-record");
const detailRecordPhoto = document.getElementById("detail-record-photo");
const detailRecordNote = document.getElementById("detail-record-note");
const openRecordButton = document.getElementById("open-record");
const recordDialog = document.getElementById("record-dialog");
const recordForm = document.getElementById("record-form");
const recordDream = document.getElementById("record-dream");
const recordNote = document.getElementById("record-note");
const recordPhotoPreview = document.getElementById("record-photo-preview");
const choosePhotoButton = document.getElementById("choose-photo");
const removePhotoButton = document.getElementById("remove-photo");
const photoFile = document.getElementById("photo-file");

let dreamToRecord = null;     // どのやりたいことの記録を書いているか
let draftPhoto = null;        // ダイアログで選んでいる写真（保存するまでは、ここだけ）
let recordFromDetail = false; // 詳細の画面から開いたか（閉じたら詳細に戻る）
let lastCelebrated = null;    // お祝いの画面を出したやりたいこと（閉じたら記録の画面を開く）

// 詳細の画面の「達成の記録」を描く
function renderDetailRecord(dream) {
  const photo = loadPhoto(dream.id);
  detailRecordPhoto.hidden = !photo;
  if (photo) detailRecordPhoto.src = photo;
  const note = dream.achievedNote || "";
  detailRecordNote.textContent = note;
  detailRecordNote.hidden = note === "";
  openRecordButton.textContent = photo || note ? "✏️ 記録を編集" : "✏️ 達成の記録を書く（感想・写真）";
  detailRecord.hidden = false;
}

// 記録のダイアログを開く
function openRecord(dream, fromDetail) {
  dreamToRecord = dream;
  recordFromDetail = fromDetail;
  recordDream.textContent = "「" + dream.title + "」";
  recordNote.value = dream.achievedNote || "";
  draftPhoto = loadPhoto(dream.id);
  renderRecordPhoto();
  recordDialog.showModal();
}

// ダイアログの写真の部分を描く
function renderRecordPhoto() {
  recordPhotoPreview.hidden = !draftPhoto;
  if (draftPhoto) recordPhotoPreview.src = draftPhoto;
  removePhotoButton.hidden = !draftPhoto;
  choosePhotoButton.textContent = draftPhoto ? "📷 写真を選び直す" : "📷 写真を選ぶ";
}

// 詳細の「記録を書く／編集」
openRecordButton.addEventListener("click", function () {
  const dream = dreamInDetail;
  detailDialog.close();
  openRecord(dream, true);
});

// 「写真を選ぶ」：写真を選ぶ画面を開く（iPhone では「写真ライブラリ」「写真を撮る」などを選べる）
choosePhotoButton.addEventListener("click", function () {
  photoFile.click();
});

// 写真が選ばれたら、小さくしてから見せる
photoFile.addEventListener("change", async function () {
  const file = photoFile.files[0];
  photoFile.value = ""; // 同じ写真をもう一度選んでも動くように
  if (!file) return;
  try {
    draftPhoto = await resizeImage(file);
    renderRecordPhoto();
  } catch (error) {
    showToast("この写真は読み込めませんでした。ほかの写真を選んでください");
  }
});

removePhotoButton.addEventListener("click", function () {
  draftPhoto = null;
  renderRecordPhoto();
});

// 記録のダイアログを閉じる（詳細から開いたときは、詳細に戻る）
function closeRecord() {
  recordDialog.close();
  if (recordFromDetail) openDetail(dreamToRecord);
}

// 「あとで」
document.getElementById("cancel-record").addEventListener("click", closeRecord);
// Esc キーで閉じたときも、詳細に戻す
recordDialog.addEventListener("cancel", function (event) {
  event.preventDefault();
  closeRecord();
});

// 「保存する」
recordForm.addEventListener("submit", function (event) {
  event.preventDefault();
  if (!savePhoto(dreamToRecord.id, draftPhoto)) return; // 保存する場所がいっぱいなら、閉じずに止める
  const note = recordNote.value.trim();
  if (note === "") {
    delete dreamToRecord.achievedNote;
  } else {
    dreamToRecord.achievedNote = note;
  }
  saveDreams();
  render();
  closeRecord();
  showToast("達成の記録を保存しました");
});
// 「編集する」：詳細の画面を閉じて、編集の画面を開く
openEditButton.addEventListener("click", function () {
  detailDialog.close();
  openEdit(dreamInDetail);
});

// ===== 9. 編集ダイアログ =====
let dreamToEdit = null; // どのやりたいことを編集しているか

function openEdit(dream) {
  dreamToEdit = dream;
  editTitle.value = dream.title;
  editCategory.value = dream.category;
  refreshCategoryPickers(); // 色の丸付きのプルダウンの見た目も合わせる
  editDeadline.write(dream.deadline);
  editMemo.value = dream.memo;
  resetDeleteButton();
  editDialog.showModal();
}

// 「キャンセル」：編集をやめて、詳細の画面に戻る
cancelEditButton.addEventListener("click", function () {
  editDialog.close();
  openDetail(dreamToEdit);
});

// 「保存する」
editForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const title = editTitle.value.trim();
  const result = editDeadline.read();
  if (title === "" || result.error) return;
  dreamToEdit.title = title;
  dreamToEdit.category = editCategory.value;
  dreamToEdit.deadline = result.deadline;
  dreamToEdit.memo = editMemo.value.trim();
  saveDreams();
  render();
  editDialog.close();
  openDetail(dreamToEdit); // 詳細の画面に戻る
  showToast("保存しました");
});

// 「削除」：押し間違えないように、1回目は「本当に削除する」に変わるだけ。2回目で消す
function resetDeleteButton() {
  deleteDreamButton.textContent = "このマイルストーンを削除";
  deleteDreamButton.classList.remove("confirming");
}

deleteDreamButton.addEventListener("click", function () {
  if (!deleteDreamButton.classList.contains("confirming")) {
    deleteDreamButton.textContent = "本当に削除する（もう一度押す）";
    deleteDreamButton.classList.add("confirming");
    return;
  }
  dreams = dreams.filter(function (d) { return d.id !== dreamToEdit.id; }); // 消すもの以外を残す
  savePhoto(dreamToEdit.id, null); // 達成の写真があれば、それも消す
  saveDreams();
  render();
  editDialog.close();
  showToast("削除しました");
});

// ===== 分野を編集 =====
const categoryDialog = document.getElementById("category-dialog");
const categoryForm = document.getElementById("category-form");
const categoryRows = document.getElementById("category-rows");
const addCategoryButton = document.getElementById("add-category");
const cancelCategoryButton = document.getElementById("cancel-category");
const saveCategoryButton = document.getElementById("save-category");
const categoryMessage = document.getElementById("category-message");
const openCategoryEditorButton = document.getElementById("open-category-editor");

// 編集中の分野（保存するまでは、ここだけを書きかえる）
// 1つずつ { name: 名前, color: 色, originalName: 編集を始めたときの名前（新しく足した分野は null） }
let draftCategories = [];
let openPaletteIndex = null;   // 色の一覧を開いている行の番号（開いていなければ null）
let confirmingMove = false;    // 「やりたいことを移して保存」の確認中か

// 「分野を編集」：今の分野を写して、ダイアログを開く
function openCategoryEditor() {
  draftCategories = categories.map(function (c) {
    return { name: c.name, color: c.color, originalName: c.name };
  });
  openPaletteIndex = null;
  resetCategoryMessage();
  renderCategoryRows();
  categoryDialog.showModal();
}
openCategoryEditorButton.addEventListener("click", openCategoryEditor);

// ===== メニュー（☰） =====
const menuButton = document.getElementById("menu-button");
const menuDialog = document.getElementById("menu-dialog");
const closeMenuButton = document.getElementById("close-menu");
const menuCategoriesButton = document.getElementById("menu-categories");

// ☰ を押したら、メニューを開く
menuButton.addEventListener("click", function () {
  menuDialog.showModal();
});

// × を押したら、メニューを閉じる
closeMenuButton.addEventListener("click", function () {
  menuDialog.close();
});

// メニューの外側（暗いところ）を押しても閉じる
// （外側を押すと、ダイアログそのものが押されたことになるので見分けられる）
menuDialog.addEventListener("click", function (event) {
  if (event.target === menuDialog) menuDialog.close();
});

// 「分野を編集」：メニューを閉じて、分野を編集する画面を開く
menuCategoriesButton.addEventListener("click", function () {
  menuDialog.close();
  openCategoryEditor();
});

// お知らせを消して、「保存する」ボタンを元に戻す（何か変えたら、確認はやり直し）
function resetCategoryMessage() {
  confirmingMove = false;
  categoryMessage.hidden = true;
  categoryMessage.classList.remove("warning");
  saveCategoryButton.textContent = "保存する";
}

// お知らせを出す（isWarning = 移す確認のときは true。エラーのときは false）
function showCategoryMessage(text, isWarning) {
  categoryMessage.textContent = text;
  categoryMessage.hidden = false;
  categoryMessage.classList.toggle("warning", isWarning);
}

// 小さなボタンを作る関数（↑・↓・× など）
function makeIconButton(text, label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button";
  button.textContent = text;
  button.setAttribute("aria-label", label); // 読み上げ機能に、何のボタンか伝える
  button.addEventListener("click", onClick);
  return button;
}

// 編集中の分野を、1行ずつ描き直す関数
function renderCategoryRows() {
  categoryRows.textContent = "";
  draftCategories.forEach(function (category, index) {
    const row = document.createElement("li");
    row.className = "category-row";

    // 色の丸：押すと、その下に色の一覧が開く
    const colorButton = document.createElement("button");
    colorButton.type = "button";
    colorButton.className = "color-button";
    colorButton.style.backgroundColor = category.color;
    colorButton.setAttribute("aria-label", "色を選ぶ");
    colorButton.addEventListener("click", function () {
      openPaletteIndex = openPaletteIndex === index ? null : index;
      renderCategoryRows();
    });

    // 名前の入力欄：書きかえるたびに、編集中の分野に入れておく
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = category.name;
    nameInput.maxLength = 12;
    nameInput.placeholder = "分野の名前";
    nameInput.addEventListener("input", function () {
      category.name = nameInput.value;
      resetCategoryMessage();
    });

    // ↑：1つ上と入れかえる（splice = 配列から取り出して、別の場所に入れる）
    const upButton = makeIconButton("↑", "上へ", function () {
      draftCategories.splice(index - 1, 0, draftCategories.splice(index, 1)[0]);
      openPaletteIndex = null;
      resetCategoryMessage();
      renderCategoryRows();
    });
    upButton.disabled = index === 0; // いちばん上は、上へ動かせない

    // ↓：1つ下と入れかえる
    const downButton = makeIconButton("↓", "下へ", function () {
      draftCategories.splice(index + 1, 0, draftCategories.splice(index, 1)[0]);
      openPaletteIndex = null;
      resetCategoryMessage();
      renderCategoryRows();
    });
    downButton.disabled = index === draftCategories.length - 1; // いちばん下は、下へ動かせない

    // ×：この分野を消す（やりたいことの移し先は、保存するときに確かめる）
    const deleteButton = makeIconButton("×", "削除", function () {
      draftCategories.splice(index, 1);
      openPaletteIndex = null;
      resetCategoryMessage();
      renderCategoryRows();
    });
    deleteButton.disabled = draftCategories.length === 1; // 分野が1つだけなら消せない

    row.append(colorButton, nameInput, upButton, downButton, deleteButton);

    // 色の一覧（この行の丸を押したときだけ出す）
    if (openPaletteIndex === index) {
      const palette = document.createElement("div");
      palette.className = "palette";
      for (const color of COLOR_PALETTE) {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("aria-label", "この色にする");
        if (color === category.color) swatch.classList.add("selected");
        swatch.addEventListener("click", function () {
          category.color = color;
          openPaletteIndex = null;
          renderCategoryRows();
        });
        palette.appendChild(swatch);
      }
      row.appendChild(palette);
    }

    categoryRows.appendChild(row);
  });

  // 上限まで来たら「＋ 分野を追加」を押せなくして、理由を出す
  const isFull = draftCategories.length >= MAX_CATEGORIES;
  addCategoryButton.disabled = isFull;
  addCategoryButton.textContent = isFull ? "分野は " + MAX_CATEGORIES + "個 まで登録できます" : "＋ 分野を追加";
}

// 「＋ 分野を追加」：まだ使っていない色で、空の分野を1行足す
addCategoryButton.addEventListener("click", function () {
  if (draftCategories.length >= MAX_CATEGORIES) return; // 上限まで来ていたら足さない
  const usedColors = draftCategories.map(function (c) { return c.color; });
  const color = COLOR_PALETTE.find(function (c) { return !usedColors.includes(c); }) || COLOR_PALETTE[0];
  draftCategories.push({ name: "", color: color, originalName: null });
  openPaletteIndex = null;
  resetCategoryMessage();
  renderCategoryRows();
  // 足した行の名前の欄に、カーソルを置いておく
  const inputs = categoryRows.querySelectorAll("input");
  inputs[inputs.length - 1].focus();
});

// 「キャンセル」：編集した内容は捨てて閉じる
cancelCategoryButton.addEventListener("click", function () {
  categoryDialog.close();
});

// 「保存する」
categoryForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // 名前の前後のすき間を取る
  for (const category of draftCategories) category.name = category.name.trim();
  const names = draftCategories.map(function (c) { return c.name; });

  // 名前が空・同じ名前が2つ、はダメ
  if (names.includes("")) {
    showCategoryMessage("名前が空の分野があります", false);
    return;
  }
  // filter で「前にも同じ名前が出てきたもの」を探す
  const duplicates = names.filter(function (name, i) { return names.indexOf(name) !== i; });
  if (duplicates.length > 0) {
    showCategoryMessage("「" + duplicates[0] + "」が2つあります。ちがう名前にしてください", false);
    return;
  }

  // やりたいことの分野名をどう変えるかの表を作る（「古い名前 → 新しい名前」）
  const renameTable = {};
  for (const category of draftCategories) {
    if (category.originalName !== null) renameTable[category.originalName] = category.name;
  }
  // 消した分野：編集を始めたときにはあって、表に入っていない分野
  const deletedNames = categories
    .map(function (c) { return c.name; })
    .filter(function (name) { return renameTable[name] === undefined; });
  // 消した分野のやりたいことは、いちばん下の分野に移す
  const fallback = names[names.length - 1];
  const movedCount = dreams.filter(function (d) { return deletedNames.includes(d.category); }).length;

  // 移すやりたいことがあるときは、1回目は確認だけ出す。もう一度押したら保存する
  if (movedCount > 0 && !confirmingMove) {
    showCategoryMessage("「" + deletedNames.join("」「") + "」のマイルストーン " + movedCount + "件 は、「" + fallback + "」に移します。よければ、もう一度押してください。", true);
    saveCategoryButton.textContent = "移して保存する";
    confirmingMove = true;
    return;
  }

  // 実際に保存する
  for (const dream of dreams) {
    if (renameTable[dream.category] !== undefined) {
      dream.category = renameTable[dream.category]; // 名前を変えた分野
    } else if (deletedNames.includes(dream.category)) {
      dream.category = fallback;                    // 消した分野
    }
  }
  categories = draftCategories.map(function (c) { return { name: c.name, color: c.color }; });
  saveCategories();
  saveDreams();
  // 絞りこみ中の分野の名前を変えたら、絞りこみも新しい名前にする
  // （新しい分野の一覧を保存したあとにする。前にすると「その分野は無い」と判断されてしまう）
  if (filterCategory !== null && renameTable[filterCategory] !== undefined) {
    setFilter(renameTable[filterCategory]);
  }
  fillCategorySelects(renameTable); // 分野の選択肢を作り直す
  render();
  categoryDialog.close();
  showToast("分野を保存しました");
});



// ===== 家族を登録するダイアログ =====
const familyDialog = document.getElementById("family-dialog");
const familyForm = document.getElementById("family-form");
const familyRows = document.getElementById("family-rows");
const addFamilyButton = document.getElementById("add-family");
const familyMessage = document.getElementById("family-message");

// 編集中の家族（保存するまでは、ここだけを書きかえる）
let draftFamily = [];

// メニューの「家族を登録」：今の家族を写して、ダイアログを開く
document.getElementById("menu-family").addEventListener("click", function () {
  menuDialog.close();
  draftFamily = family.map(function (p) { return { id: p.id, name: p.name, birthdate: p.birthdate }; });
  if (draftFamily.length === 0) draftFamily.push(newFamilyRow()); // だれもいなければ、1行目を出しておく
  familyMessage.hidden = true;
  renderFamilyRows();
  familyDialog.showModal();
});

// 新しい1行
function newFamilyRow() {
  return { id: "f" + Date.now() + Math.floor(Math.random() * 1000), name: "", birthdate: "" };
}

// 家族の行を描く関数
function renderFamilyRows() {
  familyRows.textContent = "";
  draftFamily.forEach(function (person, index) {
    const row = document.createElement("li");
    row.className = "family-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 10;
    nameInput.placeholder = "呼び名（例: 母）";
    nameInput.value = person.name;
    nameInput.setAttribute("aria-label", "呼び名");
    nameInput.addEventListener("input", function () { person.name = nameInput.value; });

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = person.birthdate;
    dateInput.setAttribute("aria-label", "生年月日");
    dateInput.addEventListener("input", function () { person.birthdate = dateInput.value; });

    const deleteButton = makeIconButton("×", "削除", function () {
      draftFamily.splice(index, 1); // splice = 配列から index 番目を1つ取りのぞく
      renderFamilyRows();
    });

    row.append(nameInput, dateInput, deleteButton);
    familyRows.appendChild(row);
  });

  // 上限まで来たら「＋ 家族を追加」を押せなくする
  const isFull = draftFamily.length >= MAX_FAMILY;
  addFamilyButton.disabled = isFull;
  addFamilyButton.textContent = isFull ? "家族は " + MAX_FAMILY + "人 まで登録できます" : "＋ 家族を追加";
}

addFamilyButton.addEventListener("click", function () {
  if (draftFamily.length >= MAX_FAMILY) return;
  draftFamily.push(newFamilyRow());
  renderFamilyRows();
  const inputs = familyRows.querySelectorAll('input[type="text"]');
  inputs[inputs.length - 1].focus(); // 足した行の名前の欄にカーソルを置く
});

document.getElementById("cancel-family").addEventListener("click", function () {
  familyDialog.close();
});

// 「保存する」
familyForm.addEventListener("submit", function (event) {
  event.preventDefault();
  // 名前も生年月日も空の行は、無かったことにする
  const rows = draftFamily
    .map(function (p) { return { id: p.id, name: p.name.trim(), birthdate: p.birthdate }; })
    .filter(function (p) { return p.name !== "" || p.birthdate !== ""; });
  // 片方だけ入っている行があれば、知らせて止める
  if (rows.some(function (p) { return p.name === "" || p.birthdate === ""; })) {
    familyMessage.textContent = "呼び名と生年月日の両方を入れてください";
    familyMessage.hidden = false;
    return;
  }
  family = rows;
  saveFamily();
  render();
  familyDialog.close();
  showToast(family.length > 0 ? "家族を保存しました（" + family.length + "人）" : "家族の登録を消しました");
});
// ===== 確認のダイアログ（取り消せないことの前に出す） =====
const confirmDialog = document.getElementById("confirm-dialog");
const confirmTitle = document.getElementById("confirm-title");
const confirmMessage = document.getElementById("confirm-message");
const confirmOkButton = document.getElementById("confirm-ok");
let confirmAction = null; // 「OK」を押したときにやること（関数）

// 確認のダイアログを出す関数。okText = OKボタンの文字、action = OKを押したらやること
// onCancel = 「キャンセル」を押したらやること（なくてもよい）
let cancelAction = null;
function askConfirm(title, message, okText, action, onCancel) {
  cancelAction = onCancel || null;
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOkButton.textContent = okText;
  confirmAction = action;
  confirmDialog.showModal();
}

document.getElementById("confirm-cancel").addEventListener("click", function () {
  confirmDialog.close();
  if (cancelAction) cancelAction();
});

// Esc キーで閉じたときも「キャンセル」と同じにする
confirmDialog.addEventListener("cancel", function () {
  if (cancelAction) cancelAction();
});

confirmOkButton.addEventListener("click", function () {
  confirmDialog.close();
  if (confirmAction) confirmAction();
});

// ===== バックアップ（保存と戻す） =====
const exportBackupButton = document.getElementById("export-backup");
const importBackupButton = document.getElementById("import-backup");
const importFileInput = document.getElementById("import-file");
const lastBackupText = document.getElementById("last-backup");
const LAST_BACKUP_KEY = "roadmap-last-backup"; // 最後にバックアップを保存した日

// 「最後に保存：2026年11月23日」の表示を更新する関数
function renderLastBackup() {
  const last = localStorage.getItem(LAST_BACKUP_KEY); // 例: "2026-11-23"
  lastBackupText.textContent = last === null ? "まだ保存していません" : "最後に保存：" + formatDate(parseDate(last));
}
renderLastBackup();

// 「バックアップを保存」
exportBackupButton.addEventListener("click", function () {
  // 生年月日・やりたいこと（ステップ・叶えた日も入っている）・分野を、1つにまとめる
  const backup = {
    app: "roadmap",           // このアプリのバックアップだという印
    version: 1,               // ファイルの形の版（あとで形を変えたときに見分けるため）
    savedAt: todayString(),   // 保存した日
    profile: { birthdate: profile.birthdate || null },
    family: family,           // 家族（呼び名と生年月日）
    photos: allPhotos(),      // 達成の写真 { やりたいことの id: 写真 }
    dreams: dreams,
    categories: categories,
  };

  // まとめたものを文字（JSON）にして、ファイルにする
  // null, 2 = 人が読みやすいように、改行とすき間を入れる
  const fileName = "milestone-backup-" + backup.savedAt + ".json";
  const file = new File([JSON.stringify(backup, null, 2)], fileName, { type: "application/json" });

  // スマホで共有の画面が使えるときは、それを出す（「ファイル」に保存・LINE・AirDrop などを選べる）
  const isPhone = /iPhone|iPad|Android/.test(navigator.userAgent);
  if (isPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] })
      .then(function () { backupSaved(); })
      .catch(function (error) {
        // AbortError = 共有の画面で「キャンセル」した。それ以外の失敗なら、ダウンロードで保存する
        if (error.name !== "AbortError") downloadFile(file);
      });
  } else {
    downloadFile(file);
  }
});

// ファイルをダウンロードする関数
// 見えないリンク（<a download>）を作って押したことにすると、ブラウザがファイルを保存してくれる
function downloadFile(file) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file); // ファイルに一時的な住所（URL）を付ける
  link.download = file.name;             // 保存するときのファイル名
  link.click();
  // 少し待ってから、一時的な住所を片付ける
  setTimeout(function () { URL.revokeObjectURL(link.href); }, 10000);
  backupSaved();
}

// 保存できたときにやること
function backupSaved() {
  localStorage.setItem(LAST_BACKUP_KEY, todayString());
  renderLastBackup();
  menuDialog.close();
  showToast("バックアップを保存しました");
}

// 「バックアップから戻す」：ファイルを選ぶ画面を開く
importBackupButton.addEventListener("click", function () {
  importFileInput.click();
});

// ファイルが選ばれたとき
importFileInput.addEventListener("change", async function () {
  const file = importFileInput.files[0];
  importFileInput.value = ""; // 同じファイルをもう一度選んでも動くように、選んだ状態を消す
  if (!file) return;

  // ファイルの中身を読んで、バックアップとして正しい形か確かめる
  let backup;
  try {
    backup = JSON.parse(await file.text()); // await = 読み終わるまで待つ
  } catch (error) {
    backup = null; // JSON として読めなかった
  }
  menuDialog.close();
  if (!isValidBackup(backup)) {
    showToast("マイルストーンのバックアップファイルではないようです");
    return;
  }

  const achievedCount = backup.dreams.filter(function (d) { return d.achievedAt; }).length;
  askConfirm(
    "バックアップから戻しますか？",
    formatDate(parseDate(backup.savedAt)) + " に保存したバックアップ（マイルストーン " + backup.dreams.length + "件・うち達成したこと " + achievedCount + "件）で、" +
      "今のデータをすべて置きかえます。今のデータは消えます。",
    "戻す",
    function () { restoreBackup(backup); }
  );
});

// バックアップとして正しい形かを確かめる関数（正しければ true）
function isValidBackup(backup) {
  if (backup === null || typeof backup !== "object") return false;
  if (backup.app !== "roadmap" || !Array.isArray(backup.dreams)) return false;
  if (typeof backup.savedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(backup.savedAt)) return false;
  // 分野は「名前と色」の一覧
  if (!Array.isArray(backup.categories) || backup.categories.length === 0) return false;
  const categoriesOk = backup.categories.every(function (c) {
    return c && typeof c.name === "string" && typeof c.color === "string";
  });
  // やりたいことは、少なくとも id とやりたいこと（文字）がある
  const dreamsOk = backup.dreams.every(function (d) {
    return d && typeof d.id === "string" && typeof d.title === "string";
  });
  return categoriesOk && dreamsOk;
}

// バックアップの内容で、今のデータを置きかえる関数
function restoreBackup(backup) {
  dreams = backup.dreams;
  categories = backup.categories;
  // 生年月日は、バックアップに入っていればそれにする（無ければ今のまま）
  if (backup.profile && backup.profile.birthdate) profile.birthdate = backup.profile.birthdate;
  // 達成の写真（写真の機能を作る前のバックアップには入っていないので、そのときは全部消す）
  replaceAllPhotos(backup.photos && typeof backup.photos === "object" ? backup.photos : {});
  // 家族も、バックアップに入っていれば戻す（家族の機能を作る前のバックアップには入っていない）
  if (Array.isArray(backup.family)) {
    family = backup.family;
    saveFamily();
  }
  saveDreams();
  saveCategories();
  saveProfile();
  fillCategorySelects(); // 分野の選択肢を作り直す
  setFilter(null);       // 絞りこみを外して、描き直す
  showToast("バックアップから戻しました");
}

// ===== 同期で受け取ったデータで置きかえる（sync.js から呼ばれる） =====
// data = { dreams: やりたいことの一覧, categories: 分野の一覧 }
// ここでは「保存したよ」の合図を出さない（受け取ったデータを送り返さないため）
function applyRemoteData(data) {
  dreams = data.dreams;
  categories = data.categories;
  localStorage.setItem(DREAMS_KEY, JSON.stringify(dreams));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  fillCategorySelects();

  // 絞りこみ中の分野が無くなっていたら、絞りこみを外す
  if (filterCategory !== null && !categories.some(function (c) { return c.name === filterCategory; })) {
    filterCategory = null;
    localStorage.removeItem(FILTER_KEY);
  }

  // 詳細や編集の画面を開いているときは、新しいデータの同じやりたいことに付けかえる
  // （ほかの機械で消されていたら、画面を閉じる）
  if (detailDialog.open) {
    dreamInDetail = dreams.find(function (d) { return d.id === dreamInDetail.id; }) || null;
    if (dreamInDetail) renderDetail(); else detailDialog.close();
  }
  if (editDialog.open) {
    dreamToEdit = dreams.find(function (d) { return d.id === dreamToEdit.id; }) || null;
    if (!dreamToEdit) editDialog.close();
  }
  render();
}

// この機械に、残しておきたいデータがあるか（やりたいことがある・分野を編集した）
function hasLocalData() {
  return dreams.length > 0 || localStorage.getItem(CATEGORIES_KEY) !== null;
}
// ===== 10. お知らせ（トースト） =====
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

// ===== 11. ページを開いたときの準備 =====
migrateOldDreams(); // 前の版のデータがあれば、日付の形に変える
render();

// ===== 12. ホーム画面のアプリとして動かす準備（サービスワーカー） =====
// ネットにつながっていないときも開けるように、sw.js を登録する
// （パソコンでファイルを直接開いているとき＝file:// では使えないので、http/https のときだけ）
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js");
}

// ===== 同期で写真を受け取ったあと、画面を描き直す（sync.js から呼ばれる） =====
function refreshView() {
  render();
  if (detailDialog.open && dreamInDetail) renderDetail();
}
