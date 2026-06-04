const ROUND_TO = 2.5;
const STORAGE_KEY = "workout-calculator-plan";

const dayDefinitions = {
  push: {
    label: "Push Day",
    anchorName: "Chest Press",
    anchorMultiplier: 0.7,
    exercises: [
      ["Chest Press", 1],
      ["Shoulder Press", 0.6],
      ["Pec Fly", 0.8],
      ["Tricep Press", 0.65],
      ["Seated Crunches", 0.55],
      ["Rotary Torso", 0.5],
      ["Leg Raises", null],
    ],
  },
  pull: {
    label: "Pull Day",
    anchorName: "Seated Row / Lat Pulldowns",
    anchorMultiplier: 0.8,
    exercises: [
      ["Seated Row", 1],
      ["Lat Pulldowns", 1],
      ["Rear Deltoids", 0.45],
      ["Bicep Curls", 0.55],
      ["Back Extension", 0.65],
    ],
  },
  legs: {
    label: "Leg Day",
    anchorName: "Leg Press",
    anchorMultiplier: 1,
    exercises: [
      ["Leg Press", 1],
      ["Leg Curl", 0.5],
      ["Leg Extension", 0.5],
      ["Glutes", 0.4],
      ["Adductors", 0.35],
      ["Abductors", 0.35],
      ["Calf Raises", 0.35],
    ],
  },
};

const modes = {
  strength: {
    label: "Strength Week",
    percent: 0.8,
    sets: "5 x 5",
  },
  endurance: {
    label: "Endurance Week",
    percent: 0.4,
    sets: "4 x 12",
  },
};

const state = {
  activeDay: "push",
  activeMode: "strength",
  legStrength: 0,
  today: new Date(),
};

const legStrengthInput = document.querySelector("#legStrengthInput");
const saveButton = document.querySelector("#saveButton");
const primeAnchorValue = document.querySelector("#primeAnchorValue");
const chestAnchorValue = document.querySelector("#chestAnchorValue");
const pullAnchorValue = document.querySelector("#pullAnchorValue");
const weekTypeBadge = document.querySelector("#weekTypeBadge");
const weekDescription = document.querySelector("#weekDescription");
const todayButton = document.querySelector("#todayButton");
const dayLabel = document.querySelector("#dayLabel");
const modeTitle = document.querySelector("#modeTitle");
const setsLabel = document.querySelector("#setsLabel");
const exerciseList = document.querySelector("#exerciseList");
const tabs = Array.from(document.querySelectorAll(".tab"));
const modeButtons = Array.from(document.querySelectorAll(".mode"));

function roundWeight(value) {
  return Math.round(value / ROUND_TO) * ROUND_TO;
}

function formatWeight(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "--";
  }

  return `${roundWeight(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} lb`;
}

function getPrimeAnchor() {
  return state.legStrength > 0 ? state.legStrength / 0.8 : 0;
}

function getDayAnchor(dayKey) {
  return getPrimeAnchor() * dayDefinitions[dayKey].anchorMultiplier;
}

function getTargetWeight(dayKey, exerciseRatio, modeKey) {
  if (!exerciseRatio) {
    return null;
  }

  const oneRepMax = getDayAnchor(dayKey) * exerciseRatio;
  return oneRepMax * modes[modeKey].percent;
}

function getMonday(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getFirstFullWeekOfMonth(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysUntilMonday = firstDayOfWeek === 1 ? 0 : (8 - firstDayOfWeek) % 7;
  const monday = new Date(year, monthIndex, 1 + daysUntilMonday);
  const sunday = addDays(monday, 6);

  if (sunday.getMonth() !== monthIndex) {
    return null;
  }

  return { monday, sunday };
}

function isEnduranceWeek(date) {
  const monday = getMonday(date);
  const week = getFirstFullWeekOfMonth(monday.getFullYear(), monday.getMonth());

  if (!week) {
    return false;
  }

  return monday.toDateString() === week.monday.toDateString();
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function savePlan() {
  const enteredWeight = Number.parseFloat(legStrengthInput.value);
  state.legStrength = Number.isFinite(enteredWeight) ? enteredWeight : 0;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ legStrength: state.legStrength }));
  render();
}

function loadPlan() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.legStrength = Number(parsed.legStrength) || 0;
    legStrengthInput.value = state.legStrength || "";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function setActiveDay(dayKey) {
  state.activeDay = dayKey;
  render();
}

function setActiveMode(modeKey) {
  state.activeMode = modeKey;
  render();
}

function renderSummary() {
  const primeAnchor = getPrimeAnchor();
  primeAnchorValue.textContent = formatWeight(primeAnchor);
  chestAnchorValue.textContent = formatWeight(primeAnchor * 0.7);
  pullAnchorValue.textContent = formatWeight(primeAnchor * 0.8);
}

function renderWeek() {
  const currentMode = isEnduranceWeek(state.today) ? "endurance" : "strength";
  const monday = getMonday(state.today);
  const sunday = addDays(monday, 6);
  const weekLabel = currentMode === "endurance" ? "Endurance" : "Strength";

  weekTypeBadge.textContent = weekLabel;
  weekTypeBadge.dataset.mode = currentMode;
  weekDescription.textContent = `${weekLabel} week: ${formatDate(monday)} to ${formatDate(sunday)}`;
}

function renderControls() {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.day === state.activeDay);
  });

  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.activeMode);
  });
}

function renderExercises() {
  const day = dayDefinitions[state.activeDay];
  const mode = modes[state.activeMode];

  dayLabel.textContent = day.label;
  modeTitle.textContent = mode.label;
  setsLabel.textContent = mode.sets;

  exerciseList.innerHTML = "";

  day.exercises.forEach(([name, ratio]) => {
    const row = document.createElement("article");
    row.className = "exercise-row";

    const details = document.createElement("div");
    const title = document.createElement("h3");
    const meta = document.createElement("p");
    title.textContent = name;
    if (!ratio) {
      meta.textContent = "Bodyweight / unweighted";
    } else if (ratio === 1) {
      meta.textContent = "Anchor";
    } else {
      meta.textContent = `${Math.round(ratio * 100)}% of ${day.anchorName} anchor`;
    }
    details.append(title, meta);

    const weight = document.createElement("strong");
    const target = getTargetWeight(state.activeDay, ratio, state.activeMode);
    weight.textContent = ratio ? formatWeight(target) : "Bodyweight";

    row.append(details, weight);
    exerciseList.append(row);
  });
}

function render() {
  renderSummary();
  renderWeek();
  renderControls();
  renderExercises();
}

saveButton.addEventListener("click", savePlan);

legStrengthInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    savePlan();
    legStrengthInput.blur();
  }
});

todayButton.addEventListener("click", () => {
  state.today = new Date();
  renderWeek();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveDay(tab.dataset.day));
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveMode(button.dataset.mode));
});

loadPlan();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app still works without offline caching, such as when opened from a local file.
    });
  });
}
