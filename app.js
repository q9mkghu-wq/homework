const STORAGE_KEY = "homeworkAppData";
const today = new Date().toISOString().slice(0, 10);
const MODE = new URLSearchParams(window.location.search).get("mode");
const CHILD_ONLY_MODE = MODE === "child";
const PARENT_ONLY_MODE = MODE === "parent";
let forceChildLock = false;

const defaultData = {
  date: today,
  mathTasks: [],
  mathChildAnswers: [],
  mathCarryMarks: [],
  words: [],
  question: "",
  childQuestionAnswer: "",
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { ...defaultData };

  try {
    const parsed = JSON.parse(saved);
    if (parsed.date !== today) {
      return { ...defaultData };
    }
    const merged = { ...defaultData, ...parsed };

    // Backward compatibility for older single-problem data.
    if (merged.mathTasks.length === 0 && parsed.mathTask) {
      merged.mathTasks = [parsed.mathTask];
      merged.mathChildAnswers = parsed.mathChildAnswer ? [String(parsed.mathChildAnswer)] : [""];
    }

    if (!Array.isArray(merged.mathCarryMarks)) {
      merged.mathCarryMarks = new Array(merged.mathTasks.length).fill("");
    }

    return merged;
  } catch (error) {
    return { ...defaultData };
  }
}

let state = loadData();
let firestoreDoc = null;
let isRemoteReady = false;

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (isRemoteReady && firestoreDoc) {
    firestoreDoc.set({ ...state }, { merge: false }).catch(() => {
      updateSyncStatus("동기화: Firebase 저장 실패 (로컬은 저장됨)");
    });
  }
}

function select(id) {
  return document.getElementById(id);
}

function updateSyncStatus(message) {
  const el = select("sync-status");
  if (el) el.textContent = message;
}

async function initFirebaseSync() {
  const config = window.FIREBASE_CONFIG;
  if (!config || !config.apiKey || !config.projectId || !window.firebase) {
    updateSyncStatus("동기화: 로컬 모드 (firebase-config.js 설정 필요)");
    return;
  }

  try {
    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(config);
    const db = app.firestore();
    const roomKey = window.FIREBASE_ROOM_KEY || "family-room-1";
    firestoreDoc = db
      .collection("homeworkRooms")
      .doc(roomKey)
      .collection("days")
      .doc(today);

    const snapshot = await firestoreDoc.get();
    if (snapshot.exists) {
      const remote = snapshot.data() || {};
      state = { ...defaultData, ...remote, date: today };
      if (!Array.isArray(state.mathCarryMarks)) {
        state.mathCarryMarks = new Array(state.mathTasks.length).fill("");
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      await firestoreDoc.set({ ...state }, { merge: false });
    }

    firestoreDoc.onSnapshot((doc) => {
      if (!doc.exists) return;
      const remote = doc.data() || {};
      state = { ...defaultData, ...remote, date: today };
      if (!Array.isArray(state.mathCarryMarks)) {
        state.mathCarryMarks = new Array(state.mathTasks.length).fill("");
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
    });

    isRemoteReady = true;
    updateSyncStatus("동기화: Firebase 연결됨");
  } catch (error) {
    updateSyncStatus("동기화: Firebase 연결 실패 (로컬 모드)");
  }
}

function setupTabs() {
  const parentBtn = select("tab-parent");
  const childBtn = select("tab-child");
  const parentView = select("parent-view");
  const childView = select("child-view");

  function activate(view) {
    const showParent = view === "parent";
    parentBtn.classList.toggle("active", showParent);
    childBtn.classList.toggle("active", !showParent);
    parentView.classList.toggle("active", showParent);
    childView.classList.toggle("active", !showParent);
  }

  parentBtn.addEventListener("click", () => activate("parent"));
  childBtn.addEventListener("click", () => activate("child"));

  if (CHILD_ONLY_MODE || forceChildLock) {
    activate("child");
    parentBtn.style.display = "none";
    childBtn.textContent = "아이 화면(잠금)";
    childBtn.disabled = true;
    childBtn.style.opacity = "1";
    childBtn.style.cursor = "default";
    updateSyncStatus("아이 전용 모드");
  }
}

function guardParentMode() {
  if (!PARENT_ONLY_MODE) return;
  const parentPin = window.PARENT_PIN || "1234";
  const input = window.prompt("부모 비밀번호를 입력하세요", "");
  if (input === parentPin) {
    updateSyncStatus("부모 전용 모드");
    return;
  }
  forceChildLock = true;
  updateSyncStatus("비밀번호 오류: 아이 화면으로 전환됨");
}

function renderMathTask() {
  const mathText = select("math-task-text");
  const tasks = state.mathTasks;

  if (!tasks.length) {
    mathText.classList.remove("math-task-list");
    mathText.textContent = "아직 수학 숙제가 없습니다.";
    return;
  }

  mathText.classList.add("math-task-list");
  mathText.innerHTML = tasks
    .map((task, index) => {
      const correct = task.op === "+" ? task.a + task.b : task.a - task.b;
      const width = Math.max(String(task.a).length, String(task.b).length, String(correct).length, 2);
      const answerDigits = toPaddedDigits(state.mathChildAnswers[index] || "", width);
      const carryDigits = toPaddedDigits(state.mathCarryMarks[index] || "", width - 1);
      const topDigits = String(task.a).padStart(width, " ").split("");
      const bottomDigits = String(task.b).padStart(width, " ").split("");

      return `
        <div class="task-item">
          <div class="vertical-math-grid">
            <div class="digit-row carry-row">
              <span class="op-cell carry-label"></span>
              ${carryDigits
                .map(
                  (digit, colIndex) =>
                    `<input class="digit-input carry-input" data-carry-task="${index}" data-carry-col="${colIndex}" maxlength="1" inputmode="numeric" value="${digit}" />`
                )
                .join("")}
              <span class="digit-cell carry-empty"></span>
            </div>
            <div class="digit-row number-row">
              <span class="op-cell"></span>
              ${topDigits.map((digit) => `<span class="digit-cell">${digit === " " ? "" : digit}</span>`).join("")}
            </div>
            <div class="digit-row number-row">
              <span class="op-cell">${task.op}</span>
              ${bottomDigits.map((digit) => `<span class="digit-cell">${digit === " " ? "" : digit}</span>`).join("")}
            </div>
            <div class="digit-row line-row">
              <span class="op-cell line-cell"></span>
              ${new Array(width).fill(0).map(() => '<span class="line-cell"></span>').join("")}
            </div>
            <div class="digit-row answer-row">
              <span class="op-cell">=</span>
              ${answerDigits
                .map(
                  (digit, colIndex) =>
                    `<input class="digit-input answer-digit-input" data-answer-task="${index}" data-answer-col="${colIndex}" maxlength="1" inputmode="numeric" value="${digit}" />`
                )
                .join("")}
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function toPaddedDigits(value, width) {
  const raw = String(value || "").replace(/\s+/g, "");
  return raw.slice(-width).padStart(width, " ").split("").map((char) => (char === " " ? "" : char));
}

function renderWords() {
  const list = select("word-list");
  list.innerHTML = "";

  if (!state.words.length) {
    const item = document.createElement("li");
    item.textContent = "오늘 단어가 아직 없습니다.";
    list.appendChild(item);
    return;
  }

  state.words.forEach((word) => {
    const item = document.createElement("li");
    item.textContent = word;
    list.appendChild(item);
  });
}

function renderQuestion() {
  select("question-text").textContent = state.question || "아직 질문이 없습니다.";
  select("child-question-answer").value = state.childQuestionAnswer;
}

function renderReview() {
  const area = select("review-area");
  const parts = [];

  if (state.mathTasks.length) {
    parts.push("<p><strong>수학 채점 결과</strong></p>");
    parts.push("<ol>");
    state.mathTasks.forEach((task, index) => {
      const correct = task.op === "+" ? task.a + task.b : task.a - task.b;
      const answer = state.mathChildAnswers[index] || "";
      const answered = answer !== "";
      const isCorrect = Number(answer) === correct;
      const status = answered
        ? isCorrect
          ? '<span class="status-ok">정답</span>'
          : '<span class="status-bad">오답</span>'
        : "미제출";

      parts.push(
        `<li>${task.a} ${task.op} ${task.b} = ? / 아이 답: ${
          answered ? answer : "미제출"
        } / 정답: ${correct} (${status})</li>`
      );
    });
    parts.push("</ol>");
  } else {
    parts.push("<p>수학 숙제가 아직 없습니다.</p>");
  }

  parts.push(
    `<p><strong>영어 단어(${state.words.length}개):</strong> ${
      state.words.length ? state.words.join(", ") : "없음"
    }</p>`
  );
  parts.push(`<p><strong>보낸 질문:</strong> ${state.question || "없음"}</p>`);
  parts.push(`<p><strong>아이 답변:</strong> ${state.childQuestionAnswer || "미제출"}</p>`);

  area.innerHTML = parts.join("");
}

function bindParentActions() {
  const mathForm = select("math-form");
  mathForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const a = Number(select("num-a").value);
    const b = Number(select("num-b").value);
    const op = select("operator").value;

    state.mathTasks.push({ a, b, op });
    state.mathChildAnswers = new Array(state.mathTasks.length).fill("");
    state.mathCarryMarks = new Array(state.mathTasks.length).fill("");
    saveData();
    renderMathTask();
    renderParentMathList();
    renderReview();
    select("math-save-msg").textContent = `${state.mathTasks.length}번째 문제를 추가했습니다.`;
    mathForm.reset();
  });

  select("clear-math-btn").addEventListener("click", () => {
    state.mathTasks = [];
    state.mathChildAnswers = [];
    state.mathCarryMarks = [];
    saveData();
    renderMathTask();
    renderParentMathList();
    renderReview();
    select("math-save-msg").textContent = "오늘 수학 문제를 모두 삭제했습니다.";
  });

  select("save-words-btn").addEventListener("click", () => {
    const raw = select("word-input").value;
    state.words = raw
      .split(/\r?\n|,/)
      .map((word) => word.trim())
      .filter(Boolean);
    saveData();
    renderWords();
    renderReview();
    select("word-save-msg").textContent = `${state.words.length}개 메모를 저장했습니다.`;
  });

  select("clear-words-btn").addEventListener("click", () => {
    state.words = [];
    saveData();
    select("word-input").value = "";
    renderWords();
    renderReview();
    select("word-save-msg").textContent = "영어 메모를 삭제했습니다.";
  });

  select("save-question-btn").addEventListener("click", () => {
    state.question = select("parent-question").value.trim();
    state.childQuestionAnswer = "";
    saveData();
    renderQuestion();
    renderReview();
    select("question-save-msg").textContent = "질문을 저장했습니다.";
  });

  select("clear-math-answers-btn").addEventListener("click", () => {
    state.mathChildAnswers = new Array(state.mathTasks.length).fill("");
    state.mathCarryMarks = new Array(state.mathTasks.length).fill("");
    saveData();
    renderMathTask();
    renderReview();
    select("math-save-msg").textContent = "제출된 수학 답을 삭제했습니다.";
  });

  select("clear-question-answer-btn").addEventListener("click", () => {
    state.childQuestionAnswer = "";
    saveData();
    renderQuestion();
    renderReview();
    select("question-save-msg").textContent = "질문 답변을 삭제했습니다.";
  });

}

function bindChildActions() {
  select("submit-math-btn").addEventListener("click", () => {
    state.mathChildAnswers = state.mathTasks.map((_, index) => {
      const digitInputs = Array.from(
        document.querySelectorAll(`[data-answer-task="${index}"]`)
      );
      const value = digitInputs.map((input) => input.value.trim()).join("").trimStart();
      return value;
    });

    state.mathCarryMarks = state.mathTasks.map((_, index) => {
      const carryInputs = Array.from(
        document.querySelectorAll(`[data-carry-task="${index}"]`)
      );
      const value = carryInputs.map((input) => input.value.trim()).join("").trimStart();
      return value;
    });

    saveData();
    renderReview();
    select("child-math-msg").textContent = "수학 답을 모두 제출했습니다.";
  });

  select("submit-question-btn").addEventListener("click", () => {
    state.childQuestionAnswer = select("child-question-answer").value.trim();
    saveData();
    renderReview();
    select("child-question-msg").textContent = "답변을 제출했습니다.";
  });
}

function renderParentMathList() {
  const listArea = select("parent-math-list");
  if (!state.mathTasks.length) {
    listArea.innerHTML = "<p>저장된 수학 문제가 없습니다.</p>";
    return;
  }

  listArea.innerHTML = `
    <ol>
      ${state.mathTasks.map((task) => `<li>${task.a} ${task.op} ${task.b}</li>`).join("")}
    </ol>
  `;
}

function renderParentInputs() {
  select("word-input").value = state.words.join("\n");
  select("parent-question").value = state.question;
}

function renderAll() {
  renderParentInputs();
  renderMathTask();
  renderParentMathList();
  renderWords();
  renderQuestion();
  renderReview();
}

async function init() {
  guardParentMode();
  await initFirebaseSync();
  setupTabs();
  bindParentActions();
  bindChildActions();
  renderAll();
}

init();
