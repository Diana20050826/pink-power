
"use strict";

/* =====================================================
   PINK POWER 3.0 — Diana
   Aplicação fitness pessoal, sem bibliotecas obrigatórias
   ===================================================== */

const STORAGE_KEY = "pinkPowerDiana_v3";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateKey = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseDate = key => {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const dayNames = [
  "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira",
  "sexta-feira", "sábado", "domingo"
];

const defaultWeek = {
  0: "pernas",
  1: "gluteos",
  2: "descanso",
  3: "pernas2",
  4: "descanso",
  5: "ativo",
  6: "descanso"
};

function freshData() {
  return {
    trainedDays: [],
    sessions: [],
    wellbeing: [],
    favorites: [],
    customWorkouts: [],
    weekPlan: { ...defaultWeek },
    settings: {
      name: "Diana",
      weeklyGoal: 4,
      restDuration: 30
    }
  };
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return freshData();

    const defaults = freshData();
    return {
      ...defaults,
      ...saved,
      trainedDays: Array.isArray(saved.trainedDays) ? saved.trainedDays : [],
      sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
      wellbeing: Array.isArray(saved.wellbeing) ? saved.wellbeing : [],
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
      customWorkouts: Array.isArray(saved.customWorkouts) ? saved.customWorkouts : [],
      weekPlan: { ...defaultWeek, ...(saved.weekPlan || {}) },
      settings: { ...defaults.settings, ...(saved.settings || {}) }
    };
  } catch (error) {
    console.warn("Não foi possível ler os dados guardados.", error);
    return freshData();
  }
}

let data = loadData();
let calendarYear = today().getFullYear();
let calendarMonth = today().getMonth();
let selectedDate = dateKey(today());
let currentFilter = "todos";
let activeWorkout = null;
let activeExerciseIndex = 0;
let timerRemaining = 30;
let timerInterval = null;
let toastTimeout = null;
let selectedMood = 0;
let confirmAction = null;
let previousFocus = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    showToast("Não foi possível guardar os dados. Exporta uma cópia de segurança.");
    return false;
  }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3200);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatFullDate(date) {
  return date.toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function formatShortDate(key) {
  return parseDate(key).toLocaleDateString("pt-PT", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function isTrained(key) {
  return data.trainedDays.includes(key);
}

function getMonthDays(year, month) {
  return data.trainedDays.filter(key => {
    const date = parseDate(key);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getWeekRange(reference = today()) {
  const start = new Date(reference);
  start.setDate(start.getDate() - mondayIndex(start));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function getWeeklyCount(reference = today()) {
  const { start, end } = getWeekRange(reference);
  return data.trainedDays.filter(key => {
    const date = parseDate(key);
    return date >= start && date <= end;
  }).length;
}

/* -------------------- Exercícios -------------------- */

const exercises = [
  {
    id: "marcha",
    name: "Marcha no lugar",
    category: "aquecimento",
    categoryLabel: "Aquecimento",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de atividade física",
    description: "Aumenta gradualmente o ritmo antes do treino.",
    steps: [
      "Fica de pé, com os pés afastados confortavelmente.",
      "Marcha no lugar, levantando os joelhos alternadamente.",
      "Move os braços e mantém uma respiração confortável."
    ],
    dose: "3–5 minutos",
    alternative: "Caminhar suavemente pelo espaço"
  },
  {
    id: "agachamento",
    name: "Agachamento",
    category: "pernas",
    categoryLabel: "Pernas",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de treino de força",
    description: "Movimento para praticar força e controlo nas pernas.",
    steps: [
      "Coloca os pés aproximadamente à largura dos ombros.",
      "Leva a anca para trás, como se te fosses sentar.",
      "Mantém os pés apoiados e os joelhos alinhados com os pés.",
      "Sobe devagar, sem prender a respiração."
    ],
    dose: "2 séries de 8–10 repetições",
    alternative: "Sentar e levantar de uma cadeira firme"
  },
  {
    id: "ponte",
    name: "Ponte de glúteos",
    category: "gluteos",
    categoryLabel: "Glúteos",
    image: "https://images.unsplash.com/photo-1599058917212-d750089bc07a?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de treino num tapete",
    description: "Exercício no chão para trabalhar os glúteos.",
    steps: [
      "Deita-te de costas, com os joelhos dobrados.",
      "Mantém os pés assentes no chão.",
      "Eleva a anca sem arquear excessivamente as costas.",
      "Desce devagar e repete apenas enquanto te sentires confortável."
    ],
    dose: "2 séries de 8–10 repetições",
    alternative: "Contração suave dos glúteos deitada"
  },
  {
    id: "abducao",
    name: "Abertura de pernas deitada",
    category: "gluteos",
    categoryLabel: "Glúteos",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de exercício físico",
    description: "Pratica o controlo da anca; a banda é opcional.",
    steps: [
      "Deita-te de lado, com as pernas confortavelmente dobradas.",
      "Mantém os pés juntos e a anca estável.",
      "Abre o joelho de cima sem rodar o tronco.",
      "Regressa lentamente e troca de lado."
    ],
    dose: "2 séries de 8 por lado",
    alternative: "Abertura de joelho sem banda"
  },
  {
    id: "passos-laterais",
    name: "Passos laterais",
    category: "gluteos",
    categoryLabel: "Glúteos",
    image: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de treino de força",
    description: "Pequenos passos laterais, com ou sem banda.",
    steps: [
      "Dobra ligeiramente os joelhos, sem forçar.",
      "Dá um passo curto para o lado.",
      "Junta o outro pé de forma controlada.",
      "Repete e muda de direção."
    ],
    dose: "2 séries de 8 passos por lado",
    alternative: "Passos laterais sem banda"
  },
  {
    id: "calcanhares",
    name: "Elevação de calcanhares",
    category: "pernas",
    categoryLabel: "Pernas",
    image: "https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de exercício de força",
    description: "Movimento controlado para a barriga da perna.",
    steps: [
      "Fica de pé perto de uma parede ou apoio estável.",
      "Eleva os calcanhares lentamente.",
      "Faz uma pequena pausa no alto.",
      "Desce com controlo."
    ],
    dose: "2 séries de 10 repetições",
    alternative: "Elevações de calcanhares sentado"
  },
  {
    id: "extensao",
    name: "Extensão de perna em pé",
    category: "pernas",
    categoryLabel: "Pernas",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de exercício de mobilidade",
    description: "Pratica o equilíbrio com um apoio estável.",
    steps: [
      "Apoia uma mão numa parede ou cadeira firme.",
      "Leva uma perna para trás sem arquear as costas.",
      "Regressa à posição inicial devagar.",
      "Troca de lado."
    ],
    dose: "2 séries de 8 por lado",
    alternative: "Elevação curta da perna com apoio"
  },
  {
    id: "cadeira",
    name: "Sentar e levantar",
    category: "pernas",
    categoryLabel: "Pernas",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de exercício de força",
    description: "Alternativa apoiada para praticar o movimento de agachar.",
    steps: [
      "Coloca uma cadeira firme encostada à parede.",
      "Senta-te com os pés apoiados no chão.",
      "Levanta-te devagar, usando um apoio se necessário.",
      "Volta a sentar de forma controlada."
    ],
    dose: "2 séries de 8 repetições",
    alternative: "Levantar com apoio dos braços"
  },
  {
    id: "respiracao",
    name: "Respiração e recuperação",
    category: "aquecimento",
    categoryLabel: "Recuperação",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80",
    alt: "Imagem ilustrativa de relaxamento",
    description: "Uma pausa tranquila para recuperar o fôlego.",
    steps: [
      "Senta-te ou fica numa posição confortável.",
      "Inspira suavemente, sem forçar.",
      "Expira devagar e relaxa os ombros.",
      "Continua durante alguns ciclos confortáveis."
    ],
    dose: "1–3 minutos",
    alternative: "Descansar sentado"
  }
];

const workouts = {
  pernas: {
    title: "Pernas & glúteos",
    minutes: 22,
    intro: "Aquece primeiro. Mantém o movimento controlado e descansa quando precisares.",
    exercises: ["marcha", "cadeira", "ponte", "calcanhares"]
  },
  gluteos: {
    title: "Glúteos & estabilidade",
    minutes: 20,
    intro: "Foca-te no controlo. A banda elástica é opcional.",
    exercises: ["marcha", "ponte", "abducao", "passos-laterais"]
  },
  pernas2: {
    title: "Pernas em movimento",
    minutes: 22,
    intro: "Podes utilizar uma cadeira firme ou uma parede como apoio.",
    exercises: ["marcha", "agachamento", "extensao", "calcanhares"]
  },
  ativo: {
    title: "Corpo ativo",
    minutes: 18,
    intro: "Uma sessão suave. Se preferires, faz apenas movimentos confortáveis e recuperação.",
    exercises: ["marcha", "ponte", "abducao", "respiracao"]
  }
};

function getExercise(id) {
  return exercises.find(exercise => exercise.id === id);
}

function getWorkout(id) {
  if (workouts[id]) return { ...workouts[id], id, custom: false };
  const custom = data.customWorkouts.find(item => item.id === id);
  if (custom) return { ...custom, id, custom: true };
  return null;
}

function allWorkouts() {
  return [...Object.entries(workouts).map(([id, workout]) => ({ ...workout, id })), ...data.customWorkouts];
}

/* -------------------- Calendário -------------------- */

function renderCalendar() {
  const container = $("#calendarDays");
  container.innerHTML = "";
  $("#calendarMonth").textContent =
    `${monthNames[calendarMonth][0].toUpperCase()}${monthNames[calendarMonth].slice(1)} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const offset = mondayIndex(firstDay);
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const previousMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();

  for (let i = 0; i < 42; i++) {
    let dayNumber;
    let date;

    if (i < offset) {
      dayNumber = previousMonthDays - offset + i + 1;
      date = new Date(calendarYear, calendarMonth - 1, dayNumber);
    } else if (i >= offset + daysInMonth) {
      dayNumber = i - offset - daysInMonth + 1;
      date = new Date(calendarYear, calendarMonth + 1, dayNumber);
    } else {
      dayNumber = i - offset + 1;
      date = new Date(calendarYear, calendarMonth, dayNumber);
    }

    date.setHours(0, 0, 0, 0);
    const key = dateKey(date);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = dayNumber;
    button.setAttribute("aria-label", formatFullDate(date));
    button.setAttribute("aria-pressed", String(isTrained(key)));

    if (date.getMonth() !== calendarMonth) button.classList.add("outside");
    if (key === dateKey(today())) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");
    if (isTrained(key)) button.classList.add("trained");

    button.addEventListener("click", () => {
      selectedDate = key;
      calendarYear = date.getFullYear();
      calendarMonth = date.getMonth();
      renderCalendar();
    });

    container.appendChild(button);
  }

  updateSelectedDate();
  updateCalendarSummary();
}

function updateSelectedDate() {
  const date = parseDate(selectedDate);
  const marked = isTrained(selectedDate);
  $("#selectedDateLabel").textContent = formatFullDate(date);
  $("#selectedDateDescription").textContent = marked
    ? "Este dia está assinalado como dia de treino."
    : "Podes marcar um treino ou escolher uma sessão para este dia.";
  $("#selectedStatus").textContent = marked ? "♥ Dia marcado como treinado" : "○ Ainda sem marcação";
  $("#selectedStatus").classList.toggle("marked", marked);
  $("#toggleSelectedDay").textContent = marked ? "✓ Retirar marcação" : "♡ Marcar como treinado";
  $("#toggleSelectedDay").setAttribute("aria-pressed", String(marked));
}

function updateCalendarSummary() {
  const count = getMonthDays(calendarYear, calendarMonth).length;
  $("#calendarMonthCount").textContent = `${count} ${count === 1 ? "dia" : "dias"}`;
  $("#monthProgressBar").style.width = `${Math.min(100, count / 16 * 100)}%`;
  $("#monthGoalText").textContent = count >= 16
    ? "Objetivo de referência alcançado. Celebra a tua consistência! ♡"
    : count === 0
      ? "Cada dia conta, sem pressas."
      : `${count} de 16 dias de referência. Continua ao teu ritmo.`;
}

function toggleTrainedDay(key) {
  if (isTrained(key)) {
    data.trainedDays = data.trainedDays.filter(item => item !== key);
    showToast("Marcação retirada do calendário.");
  } else {
    data.trainedDays.push(key);
    showToast("Dia marcado! Muito bem! ♡");
  }

  saveData();
  renderCalendar();
  renderStats();
  renderHistory();
  renderAchievements();
  renderWeeklyPlan();
  renderDailyPanel();
}

$("#prevMonth").addEventListener("click", () => {
  calendarMonth--;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  renderCalendar();
});

$("#nextMonth").addEventListener("click", () => {
  calendarMonth++;
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  renderCalendar();
});

$("#todayButton").addEventListener("click", () => {
  calendarYear = today().getFullYear();
  calendarMonth = today().getMonth();
  selectedDate = dateKey(today());
  renderCalendar();
});

$("#toggleSelectedDay").addEventListener("click", () => toggleTrainedDay(selectedDate));

$("#selectedDayWorkout").addEventListener("click", () => {
  const day = parseDate(selectedDate);
  const id = data.weekPlan[day.getDay()];
  const workout = getWorkout(id);
  if (!workout || id === "descanso") {
    showToast("Este dia está reservado para recuperação. Podes escolher outro treino abaixo.");
    $("#treinos").scrollIntoView({ behavior: "smooth" });
    return;
  }
  openWorkout(id);
});

/* -------------------- Plano semanal -------------------- */

function renderWeeklyPlan() {
  const container = $("#weeklyGrid");
  container.innerHTML = "";
  const current = today();
  const monday = new Date(current);
  monday.setDate(current.getDate() - mondayIndex(current));

  const labels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = dateKey(date);
    const id = data.weekPlan[date.getDay()] || "descanso";
    const workout = getWorkout(id);
    const rest = id === "descanso" || !workout;
    const card = document.createElement("article");
    card.className = `week-card${key === dateKey(current) ? " is-today" : ""}${isTrained(key) ? " is-trained" : ""}${rest ? " rest" : ""}`;

    const day = document.createElement("div");
    day.className = "week-day";
    day.textContent = labels[i];

    const number = document.createElement("div");
    number.className = "week-date";
    number.textContent = date.getDate();

    const symbol = document.createElement("div");
    symbol.className = "week-symbol";
    symbol.textContent = isTrained(key) ? "♥" : rest ? "☾" : "✳";

    const title = document.createElement("div");
    title.className = "week-title";
    title.textContent = rest ? "Recuperação" : workout.title;

    const status = document.createElement("div");
    status.className = "week-status";
    status.textContent = isTrained(key) ? "Dia marcado ✓" : key === dateKey(current) ? "Hoje" : rest ? "Descanso" : "Planeado";

    const select = document.createElement("select");
    select.className = "field";
    select.setAttribute("aria-label", `Plano de ${labels[i]}`);
    select.style.padding = "7px 3px";
    select.style.fontSize = "9px";
    select.innerHTML = `<option value="descanso">Descanso</option>` +
      allWorkouts().map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.title)}</option>`).join("");
    select.value = id;

    select.addEventListener("change", () => {
      data.weekPlan[date.getDay()] = select.value;
      saveData();
      renderWeeklyPlan();
      renderDailyPanel();
      showToast("Plano semanal atualizado.");
    });

    const button = document.createElement("button");
    button.className = "button " + (isTrained(key) ? "button-primary" : "button-ghost");
    button.textContent = isTrained(key) ? "Desmarcar" : "Marcar";
    button.addEventListener("click", () => {
      selectedDate = key;
      calendarYear = date.getFullYear();
      calendarMonth = date.getMonth();
      toggleTrainedDay(key);
    });

    card.append(day, number, symbol, title, status, select, button);
    container.appendChild(card);
  }
}

$("#resetWeek").addEventListener("click", () => {
  data.weekPlan = { ...defaultWeek };
  saveData();
  renderWeeklyPlan();
  renderDailyPanel();
  showToast("Plano semanal original reposto.");
});

function renderDailyPanel() {
  const date = today();
  const id = data.weekPlan[date.getDay()] || "descanso";
  const workout = getWorkout(id);
  const title = $("#dailyTitle");
  const message = $("#dailyMessage");
  const icon = $("#dailyIcon");
  const action = $("#dailyAction");

  if (isTrained(dateKey(date))) {
    title.textContent = "Muito bem, " + data.settings.name + "!";
    message.textContent = "Já assinalaste hoje. Podes descansar ou consultar o teu histórico.";
    icon.textContent = "♥";
    action.textContent = "Ver progresso →";
    action.href = "#progresso";
  } else if (id === "descanso" || !workout) {
    title.textContent = "Hoje também conta.";
    message.textContent = "O teu plano prevê recuperação. Descansa ou faz uma atividade leve, se te apetecer.";
    icon.textContent = "☾";
    action.textContent = "Ver calendário →";
    action.href = "#calendario";
  } else {
    title.textContent = `Hoje é dia de ${workout.title.toLowerCase()}.`;
    message.textContent = `${workout.minutes} minutos aproximados. Podes ajustar a sessão ao teu conforto.`;
    icon.textContent = "✳";
    action.textContent = "Começar treino →";
    action.href = "#treinos";
    action.onclick = event => {
      event.preventDefault();
      openWorkout(id);
    };
    return;
  }
  action.onclick = null;
}

/* -------------------- Biblioteca de exercícios -------------------- */

function renderExercises() {
  const grid = $("#exerciseGrid");
  const filtered = exercises.filter(exercise =>
    (currentFilter === "todos" || exercise.category === currentFilter) &&
    (!data.settings.showFavoritesOnly || data.favorites.includes(exercise.id))
  );

  grid.innerHTML = "";

  if (!filtered.length) {
    grid.innerHTML = '<p class="exercise-empty">Não existem exercícios nesta seleção.</p>';
    return;
  }

  filtered.forEach(exercise => {
    const card = document.createElement("article");
    card.className = "exercise-card";

    const imageWrap = document.createElement("div");
    imageWrap.className = "exercise-image-wrap";

    const img = document.createElement("img");
    img.className = "exercise-image";
    img.src = exercise.image;
    img.alt = exercise.alt;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";

    img.addEventListener("error", () => {
      img.style.display = "none";
      imageWrap.style.background = "linear-gradient(145deg,#ffe0ef,#ff9bc9)";
      if (!imageWrap.querySelector(".fallback-icon")) {
        const fallback = document.createElement("span");
        fallback.className = "fallback-icon";
        fallback.textContent = "♡";
        fallback.style.cssText = "display:grid;place-items:center;height:100%;min-height:220px;font-size:60px;color:#d82c7d";
        imageWrap.appendChild(fallback);
      }
    });

    const category = document.createElement("span");
    category.className = "exercise-category";
    category.textContent = exercise.categoryLabel;
    imageWrap.append(img, category);

    const info = document.createElement("div");
    info.className = "exercise-info";

    const titleRow = document.createElement("div");
    titleRow.className = "exercise-title-row";

    const title = document.createElement("h3");
    title.textContent = exercise.name;

    const fav = document.createElement("button");
    fav.type = "button";
    fav.className = "favorite-button" + (data.favorites.includes(exercise.id) ? " is-favorite" : "");
    fav.textContent = data.favorites.includes(exercise.id) ? "♥" : "♡";
    fav.setAttribute("aria-label", "Alternar favorito");
    fav.setAttribute("aria-pressed", String(data.favorites.includes(exercise.id)));
    fav.addEventListener("click", () => toggleFavorite(exercise.id));

    titleRow.append(title, fav);

    const description = document.createElement("p");
    description.textContent = exercise.description;

    const steps = document.createElement("ol");
    steps.className = "exercise-steps";
    exercise.steps.forEach(step => {
      const li = document.createElement("li");
      li.textContent = step;
      steps.appendChild(li);
    });

    const dose = document.createElement("span");
    dose.className = "exercise-dose";
    dose.textContent = `♡ ${exercise.dose}`;

    const alternative = document.createElement("p");
    alternative.className = "microcopy";
    alternative.textContent = `Alternativa: ${exercise.alternative}`;

    info.append(titleRow, description, steps, dose, alternative);
    card.append(imageWrap, info);
    grid.appendChild(card);
  });
}

function toggleFavorite(id) {
  if (data.favorites.includes(id)) {
    data.favorites = data.favorites.filter(item => item !== id);
    showToast("Exercício retirado dos favoritos.");
  } else {
    data.favorites.push(id);
    showToast("Exercício adicionado aos favoritos. ♥");
  }
  saveData();
  renderExercises();
  renderFavoriteSettings();
}

$$(".filter-button").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    $$(".filter-button").forEach(item => item.classList.toggle("active", item === button));
    renderExercises();
  });
});

/* -------------------- Criador de treinos -------------------- */

function renderCreator() {
  const list = $("#creatorExerciseList");
  list.innerHTML = "";

  exercises.forEach(exercise => {
    const label = document.createElement("label");
    label.className = "creator-choice";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = exercise.id;
    checkbox.addEventListener("change", updateCreatorPreview);

    const name = document.createElement("span");
    name.textContent = exercise.name;

    const dose = document.createElement("small");
    dose.textContent = exercise.dose;

    label.append(checkbox, name, dose);
    list.appendChild(label);
  });

  updateCreatorPreview();
  renderCustomWorkouts();
}

function selectedCreatorExercises() {
  return $$("#creatorExerciseList input:checked").map(input => input.value);
}

function updateCreatorPreview() {
  const ids = selectedCreatorExercises();
  $("#creatorPreviewTitle").textContent =
    $("#customWorkoutName").value.trim() || "O teu treino";
  $("#creatorPreviewCount").textContent =
    `${ids.length} ${ids.length === 1 ? "exercício selecionado" : "exercícios selecionados"}`;

  const list = $("#creatorPreviewList");
  list.innerHTML = "";

  ids.forEach((id, index) => {
    const exercise = getExercise(id);
    if (!exercise) return;
    const item = document.createElement("div");
    item.className = "preview-item";
    item.textContent = `${String(index + 1).padStart(2, "0")}  ·  ${exercise.name}`;
    list.appendChild(item);
  });

  if (!ids.length) {
    list.innerHTML = '<div class="preview-item">Os exercícios escolhidos aparecerão aqui.</div>';
  }
}

$("#customWorkoutName").addEventListener("input", updateCreatorPreview);

$("#saveCustomWorkout").addEventListener("click", () => {
  const name = $("#customWorkoutName").value.trim();
  const ids = selectedCreatorExercises();
  const minutes = Number($("#customWorkoutMinutes").value);

  if (!name) {
    showToast("Dá um nome ao teu treino.");
    $("#customWorkoutName").focus();
    return;
  }
  if (!ids.length) {
    showToast("Seleciona pelo menos um exercício.");
    return;
  }

  const workout = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: name,
    minutes: Number.isFinite(minutes) ? minutes : 20,
    exercises: ids,
    custom: true
  };

  data.customWorkouts.push(workout);
  saveData();
  renderCustomWorkouts();
  renderWeeklyPlan();
  $("#customWorkoutName").value = "";
  $$("#creatorExerciseList input").forEach(input => input.checked = false);
  updateCreatorPreview();
  showToast("O teu treino personalizado foi guardado! ♡");
});

function renderCustomWorkouts() {
  const container = $("#savedCustomWorkouts");
  container.innerHTML = "";

  if (!data.customWorkouts.length) return;

  data.customWorkouts.forEach(workout => {
    const card = document.createElement("article");
    card.className = "custom-saved-card";

    const title = document.createElement("h3");
    title.textContent = workout.title;

    const detail = document.createElement("p");
    detail.textContent = `${workout.exercises.length} exercícios · ${workout.minutes} minutos aproximados`;

    const actions = document.createElement("div");
    actions.className = "custom-card-actions";

    const start = document.createElement("button");
    start.className = "button button-primary";
    start.textContent = "Treinar →";
    start.addEventListener("click", () => openWorkout(workout.id));

    const remove = document.createElement("button");
    remove.className = "button button-ghost";
    remove.textContent = "Apagar";
    remove.addEventListener("click", () => askConfirmation(
      "Apagar treino personalizado?",
      `Queres apagar "${workout.title}"? Esta ação não pode ser desfeita.`,
      () => {
        data.customWorkouts = data.customWorkouts.filter(item => item.id !== workout.id);
        Object.keys(data.weekPlan).forEach(day => {
          if (data.weekPlan[day] === workout.id) data.weekPlan[day] = "descanso";
        });
        saveData();
        renderCustomWorkouts();
        renderWeeklyPlan();
        showToast("Treino personalizado apagado.");
      }
    ));

    actions.append(start, remove);
    card.append(title, detail, actions);
    container.appendChild(card);
  });
}

/* -------------------- Modo de treino -------------------- */

function openWorkout(id) {
  const workout = getWorkout(id);
  if (!workout) {
    showToast("Não foi possível encontrar este treino.");
    return;
  }

  const selectedExercises = workout.exercises.map(getExercise).filter(Boolean);
  if (!selectedExercises.length) {
    showToast("Este treino não tem exercícios disponíveis.");
    return;
  }

  activeWorkout = { ...workout, exercises: selectedExercises };
  activeExerciseIndex = 0;
  timerRemaining = Number(data.settings.restDuration) || 30;
  previousFocus = document.activeElement;

  $("#workoutModal").hidden = false;
  document.body.style.overflow = "hidden";
  $("#modalTitle").textContent = `Vamos a isso, ${data.settings.name}! ♡`;
  $("#modalIntro").textContent = workout.intro ||
    `${workout.minutes} minutos aproximados. Descansa sempre que precisares.`;

  renderActiveExercise();
  updateTimerDisplay();
  $("#timerStart").textContent = "Iniciar descanso";
  $("#closeModal").focus();
}

function closeWorkout() {
  $("#workoutModal").hidden = true;
  document.body.style.overflow = "";
  stopTimer();
  activeWorkout = null;
  if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
}

function renderActiveExercise() {
  if (!activeWorkout) return;
  const exercise = activeWorkout.exercises[activeExerciseIndex];
  if (!exercise) return;

  $("#sessionCounter").textContent =
    `EXERCÍCIO ${activeExerciseIndex + 1} DE ${activeWorkout.exercises.length}`;
  $("#sessionProgressBar").style.width =
    `${((activeExerciseIndex + 1) / activeWorkout.exercises.length) * 100}%`;

  const image = $("#sessionImage");
  image.style.display = "block";
  image.src = exercise.image;
  image.alt = exercise.alt;
  image.onerror = () => {
    image.onerror = null;
    image.style.display = "none";
  };

  $("#sessionExercise").textContent = exercise.name;
  $("#sessionInstructions").textContent =
    `${exercise.description} ${exercise.steps.join(" ")} Alternativa: ${exercise.alternative}.`;
  $("#sessionPrescription").textContent = exercise.dose;
  $("#previousExercise").disabled = activeExerciseIndex === 0;
  $("#previousExercise").style.opacity = activeExerciseIndex === 0 ? ".45" : "1";
  $("#nextExercise").textContent =
    activeExerciseIndex === activeWorkout.exercises.length - 1 ? "Último exercício ✓" : "Seguinte →";
}

$("#closeModal").addEventListener("click", closeWorkout);

$("#workoutModal").addEventListener("click", event => {
  if (event.target === $("#workoutModal")) closeWorkout();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("#workoutModal").hidden) closeWorkout();
  if (event.key === "Escape" && !$("#confirmModal").hidden) closeConfirmation();
});

$("#previousExercise").addEventListener("click", () => {
  if (!activeWorkout || activeExerciseIndex <= 0) return;
  activeExerciseIndex--;
  renderActiveExercise();
});

$("#nextExercise").addEventListener("click", () => {
  if (!activeWorkout) return;
  if (activeExerciseIndex < activeWorkout.exercises.length - 1) {
    activeExerciseIndex++;
    renderActiveExercise();
  } else {
    showToast("Este é o último exercício. Conclui a sessão quando terminares.");
  }
});

$$(".start-workout").forEach(button => {
  button.addEventListener("click", () => openWorkout(button.dataset.workout));
});

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  $("#timerDisplay").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  if (timerInterval !== null) {
    stopTimer();
    $("#timerStart").textContent = "Retomar descanso";
    return;
  }

  if (timerRemaining <= 0) timerRemaining = Number(data.settings.restDuration) || 30;
  $("#timerStart").textContent = "Pausar";

  timerInterval = setInterval(() => {
    timerRemaining = Math.max(0, timerRemaining - 1);
    updateTimerDisplay();

    if (timerRemaining === 0) {
      stopTimer();
      $("#timerStart").textContent = "Recomeçar descanso";
      showToast("Descanso terminado. Continua apenas se te sentires bem. ♡");
    }
  }, 1000);
}

$("#timerStart").addEventListener("click", startTimer);

$("#timerReset").addEventListener("click", () => {
  stopTimer();
  timerRemaining = Number(data.settings.restDuration) || 30;
  updateTimerDisplay();
  $("#timerStart").textContent = "Iniciar descanso";
});

$("#finishWorkout").addEventListener("click", () => {
  if (!activeWorkout) return;

  const key = dateKey(today());
  if (!isTrained(key)) data.trainedDays.push(key);

  data.sessions.push({
    id: `session-${Date.now()}`,
    date: key,
    workout: activeWorkout.title,
    minutes: Number(activeWorkout.minutes) || 0,
    completedAt: new Date().toISOString(),
    exercises: activeWorkout.exercises.map(item => item.id)
  });

  saveData();
  closeWorkout();

  selectedDate = key;
  calendarYear = today().getFullYear();
  calendarMonth = today().getMonth();

  renderCalendar();
  renderStats();
  renderHistory();
  renderAchievements();
  renderWeeklyPlan();
  renderDailyPanel();

  showToast(`Treino registado, ${data.settings.name}! Orgulha-te deste passo. ♥`);
  $("#progresso").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* -------------------- Estatísticas e gráfico -------------------- */

function renderStats() {
  const monthCount = getMonthDays(today().getFullYear(), today().getMonth()).length;
  const totalMinutes = data.sessions.reduce((sum, session) => sum + (Number(session.minutes) || 0), 0);

  $("#totalDays").innerHTML = `${new Set(data.trainedDays).size} <small>dias</small>`;
  $("#totalMinutes").textContent = totalMinutes;
  $("#monthDays").innerHTML = `${monthCount} <small>dias</small>`;
  $("#weeklyCount").textContent = `${Math.min(getWeeklyCount(), Number(data.settings.weeklyGoal))}/${data.settings.weeklyGoal}`;

  const percent = Math.min(100, Math.round(monthCount / 16 * 100));
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#progressDays").textContent = new Set(data.trainedDays).size;
  $("#progressMinutes").textContent = totalMinutes;
  $("#progressSessions").textContent = data.sessions.length;

  $("#progressMessage").textContent = monthCount === 0
    ? "Cada dia marcado conta como uma vitória. Começa ao teu ritmo."
    : monthCount >= 16
      ? "Objetivo mensal de referência alcançado! Celebra a tua consistência."
      : `Já marcaste ${monthCount} ${monthCount === 1 ? "dia" : "dias"} este mês. Cada passo conta.`;

  drawProgressChart();
}

function drawProgressChart() {
  const canvas = $("#progressChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(280, rect.width);
  const height = 190;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const weeks = [];
  const end = today();

  for (let i = 5; i >= 0; i--) {
    const reference = new Date(end);
    reference.setDate(end.getDate() - i * 7);
    const { start, end: weekEnd } = getWeekRange(reference);

    const count = data.trainedDays.filter(key => {
      const date = parseDate(key);
      return date >= start && date <= weekEnd;
    }).length;

    weeks.push({
      label: start.toLocaleDateString("pt-PT", { day: "numeric", month: "short" }),
      value: count
    });
  }

  const left = 24, right = 10, top = 15, bottom = 33;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxValue = Math.max(4, ...weeks.map(item => item.value));
  const barWidth = Math.min(27, plotW / weeks.length * .48);

  ctx.font = "10px DM Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let line = 0; line <= 4; line++) {
    const y = top + plotH * line / 4;
    ctx.strokeStyle = "#f0e8ef";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
  }

  weeks.forEach((week, index) => {
    const x = left + plotW * (index + .5) / weeks.length;
    const barH = week.value / maxValue * plotH;
    const y = top + plotH - barH;

    ctx.fillStyle = "#f22b87";
    roundedRect(ctx, x - barWidth / 2, y, barWidth, Math.max(week.value ? 3 : 0, barH), 6);
    ctx.fill();

    ctx.fillStyle = "#6f6371";
    ctx.fillText(String(week.value), x, Math.max(8, y - 9));

    ctx.fillStyle = "#948896";
    ctx.font = "9px DM Sans, sans-serif";
    ctx.fillText(week.label, x, height - 13);
    ctx.font = "10px DM Sans, sans-serif";
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function renderHistory() {
  const container = $("#recentHistory");
  container.innerHTML = "";

  const recentDays = [...new Set(data.trainedDays)].sort((a, b) => b.localeCompare(a)).slice(0, 7);

  if (!recentDays.length) {
    container.innerHTML = '<div class="history-empty">Ainda não tens dias marcados. O teu primeiro registo aparecerá aqui. ♡</div>';
    return;
  }

  recentDays.forEach(key => {
    const session = [...data.sessions].reverse().find(item => item.date === key);
    const row = document.createElement("div");
    row.className = "history-row";

    const heart = document.createElement("div");
    heart.className = "history-heart";
    heart.textContent = "♥";

    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = formatFullDate(parseDate(key));

    const detail = document.createElement("small");
    detail.textContent = session
      ? `${session.workout} · ${session.minutes} min`
      : "Dia marcado manualmente";

    info.append(title, detail);
    row.append(heart, info);
    container.appendChild(row);
  });
}

$("#clearHistory").addEventListener("click", () => {
  askConfirmation(
    "Limpar o histórico?",
    "Serão removidos os dias assinalados e as sessões concluídas. Esta ação não pode ser desfeita.",
    () => {
      data.trainedDays = [];
      data.sessions = [];
      saveData();
      renderCalendar();
      renderStats();
      renderHistory();
      renderAchievements();
      renderWeeklyPlan();
      renderDailyPanel();
      showToast("Histórico limpo.");
    }
  );
});

/* -------------------- Diário de bem-estar -------------------- */

function setMood(value) {
  selectedMood = Number(value) || 0;
  $$(".mood-button").forEach(button => {
    const selected = Number(button.dataset.mood) === selectedMood;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

$$(".mood-button").forEach(button => {
  button.addEventListener("click", () => setMood(button.dataset.mood));
});

function renderWellbeing() {
  const container = $("#wellbeingEntries");
  container.innerHTML = "";

  const entries = [...data.wellbeing].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  if (!entries.length) {
    container.innerHTML = '<p class="muted">Ainda não tens entradas. Podes começar por registar como te sentes hoje.</p>';
    return;
  }

  const moodLabels = { 1: "Energia baixa", 2: "Energia média", 3: "Boa energia", 4: "Energia ótima" };

  entries.forEach(entry => {
    const item = document.createElement("article");
    item.className = "wellbeing-entry";

    const head = document.createElement("div");
    head.className = "wellbeing-entry-head";

    const date = document.createElement("strong");
    date.textContent = formatShortDate(entry.date);

    const mood = document.createElement("span");
    mood.textContent = moodLabels[entry.mood] || "Sem classificação";

    const notes = document.createElement("p");
    notes.textContent = entry.notes || "Sem notas.";

    const remove = document.createElement("button");
    remove.className = "text-button";
    remove.textContent = "Apagar entrada";
    remove.addEventListener("click", () => {
      askConfirmation("Apagar esta entrada?", "A entrada do diário será removida.", () => {
        data.wellbeing = data.wellbeing.filter(item => item.id !== entry.id);
        saveData();
        renderWellbeing();
        showToast("Entrada apagada.");
      });
    });

    head.append(date, mood);
    item.append(head, notes, remove);
    container.appendChild(item);
  });
}

$("#wellbeingDate").value = dateKey(today());

$("#saveWellbeing").addEventListener("click", () => {
  const date = $("#wellbeingDate").value || dateKey(today());
  const notes = $("#wellbeingNotes").value.trim();

  if (!selectedMood && !notes) {
    showToast("Escolhe o teu nível de energia ou escreve uma nota.");
    return;
  }

  const existing = data.wellbeing.find(entry => entry.date === date);
  if (existing) {
    existing.mood = selectedMood || existing.mood;
    existing.notes = notes;
    existing.updatedAt = new Date().toISOString();
  } else {
    data.wellbeing.push({
      id: `mood-${Date.now()}`,
      date,
      mood: selectedMood,
      notes,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  $("#wellbeingNotes").value = "";
  setMood(0);
  renderWellbeing();
  showToast("Entrada do diário guardada. Cuida de ti. ♡");
});

/* -------------------- Conquistas -------------------- */

function getAchievements() {
  const days = new Set(data.trainedDays).size;
  const sessions = data.sessions.length;
  const months = new Set(data.trainedDays.map(key => key.slice(0, 7))).size;
  const weeks = new Set(data.trainedDays.map(key => {
    const date = parseDate(key);
    const { start } = getWeekRange(date);
    return dateKey(start);
  })).size;

  return [
    { id: "first-day", icon: "♡", title: "Primeiro passo", text: "Marca o teu primeiro dia.", unlocked: days >= 1 },
    { id: "three-days", icon: "✳", title: "A ganhar ritmo", text: "Assinala 3 dias de treino.", unlocked: days >= 3 },
    { id: "week", icon: "♧", title: "Semana ativa", text: "Regista 4 sessões concluídas.", unlocked: sessions >= 4 },
    { id: "ten-days", icon: "♥", title: "Persistência", text: "Marca 10 dias diferentes.", unlocked: days >= 10 },
    { id: "five-sessions", icon: "✦", title: "Já cá cantam 5", text: "Conclui 5 sessões.", unlocked: sessions >= 5 },
    { id: "three-weeks", icon: "♕", title: "Ritmo construído", text: "Treina em 3 semanas diferentes.", unlocked: weeks >= 3 },
    { id: "two-months", icon: "☼", title: "A tua jornada", text: "Regista atividade em 2 meses.", unlocked: months >= 2 },
    { id: "twenty-days", icon: "★", title: "Pequenas grandes vitórias", text: "Marca 20 dias de atividade.", unlocked: days >= 20 }
  ];
}

function renderAchievements() {
  const grid = $("#achievementGrid");
  grid.innerHTML = "";

  getAchievements().forEach(achievement => {
    const card = document.createElement("article");
    card.className = "achievement-card" + (achievement.unlocked ? " unlocked" : "");

    const icon = document.createElement("div");
    icon.className = "achievement-icon";
    icon.textContent = achievement.unlocked ? achievement.icon : "🔒";

    const title = document.createElement("h3");
    title.textContent = achievement.title;

    const text = document.createElement("p");
    text.textContent = achievement.unlocked ? "Conquista desbloqueada! ♥" : achievement.text;

    card.append(icon, title, text);
    grid.appendChild(card);
  });
}

/* -------------------- Definições e favoritos -------------------- */

function renderFavoriteSettings() {
  const container = $("#favoriteSettings");
  container.innerHTML = "";

  exercises.forEach(exercise => {
    const label = document.createElement("label");
    label.className = "favorite-setting-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = data.favorites.includes(exercise.id);
    checkbox.addEventListener("change", () => toggleFavorite(exercise.id));

    const name = document.createElement("span");
    name.textContent = exercise.name;

    label.append(checkbox, name);
    container.appendChild(label);
  });
}

function loadSettings() {
  $("#profileName").value = data.settings.name;
  $("#weeklyGoal").value = String(data.settings.weeklyGoal);
  $("#restDuration").value = String(data.settings.restDuration);
}

$("#saveSettings").addEventListener("click", () => {
  const name = $("#profileName").value.trim() || "Diana";
  const weeklyGoal = Number($("#weeklyGoal").value);
  const restDuration = Number($("#restDuration").value);

  data.settings.name = name;
  data.settings.weeklyGoal = [2, 3, 4, 5].includes(weeklyGoal) ? weeklyGoal : 4;
  data.settings.restDuration = [20, 30, 45, 60, 90].includes(restDuration) ? restDuration : 30;

  saveData();
  renderProfile();
  renderStats();
  renderDailyPanel();
  showToast("Definições guardadas, " + name + "! ♡");
});

function renderProfile() {
  const name = data.settings.name || "Diana";
  $$(".profile-mini strong").forEach(element => element.textContent = name);
  $$(".avatar").forEach(element => {
    element.innerHTML = `${escapeHTML(name.charAt(0).toUpperCase())}<span>♥</span>`;
  });
  $(".top-avatar").textContent = name.charAt(0).toUpperCase();
  $("#modalTitle").textContent = `Vamos a isso, ${name}! ♡`;
  document.title = `PINK POWER | ${name}`;
}

/* -------------------- Exportar / importar -------------------- */

function downloadJSON(object, filename) {
  const blob = new Blob([JSON.stringify(object, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("#exportData").addEventListener("click", () => {
  downloadJSON({
    app: "PINK POWER",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    data
  }, "pink-power-copia-de-seguranca.json");
  showToast("Cópia de segurança preparada para descarregar.");
});

$("#importDataButton").addEventListener("click", () => $("#importDataFile").click());

$("#importDataFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const imported = parsed.data || parsed;

    if (!imported || typeof imported !== "object" ||
        !Array.isArray(imported.trainedDays) ||
        !Array.isArray(imported.sessions)) {
      throw new Error("Ficheiro não reconhecido.");
    }

    askConfirmation(
      "Importar cópia de segurança?",
      "Os dados atuais serão substituídos pelos dados do ficheiro selecionado.",
      () => {
        const defaults = freshData();
        data = {
          ...defaults,
          ...imported,
          trainedDays: [...new Set(imported.trainedDays)],
          sessions: imported.sessions,
          wellbeing: Array.isArray(imported.wellbeing) ? imported.wellbeing : [],
          favorites: Array.isArray(imported.favorites) ? imported.favorites : [],
          customWorkouts: Array.isArray(imported.customWorkouts) ? imported.customWorkouts : [],
          weekPlan: { ...defaultWeek, ...(imported.weekPlan || {}) },
          settings: { ...defaults.settings, ...(imported.settings || {}) }
        };

        saveData();
        loadSettings();
        refreshAll();
        showToast("Cópia de segurança importada.");
      }
    );
  } catch (error) {
    showToast("Não foi possível importar este ficheiro. Escolhe uma cópia JSON válida do PINK POWER.");
  } finally {
    event.target.value = "";
  }
});

$("#resetAllData").addEventListener("click", () => {
  askConfirmation(
    "Apagar todos os dados locais?",
    "Serão apagados os registos de treino, calendário, diário, favoritos, definições e planos personalizados. Exporta uma cópia primeiro, se quiseres guardar os dados.",
    () => {
      data = freshData();
      saveData();
      selectedDate = dateKey(today());
      calendarYear = today().getFullYear();
      calendarMonth = today().getMonth();
      currentFilter = "todos";
      $$(".filter-button").forEach(button =>
        button.classList.toggle("active", button.dataset.filter === "todos")
      );
      setMood(0);
      loadSettings();
      refreshAll();
      showToast("Os dados locais foram reiniciados.");
    }
  );
});

/* -------------------- Confirmações -------------------- */

function askConfirmation(title, message, action) {
  confirmAction = action;
  previousFocus = document.activeElement;
  $("#confirmTitle").textContent = title;
  $("#confirmMessage").textContent = message;
  $("#confirmModal").hidden = false;
  $("#acceptConfirm").focus();
}

function closeConfirmation() {
  $("#confirmModal").hidden = true;
  confirmAction = null;
  if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
}

$("#cancelConfirm").addEventListener("click", closeConfirmation);
$("#acceptConfirm").addEventListener("click", () => {
  const action = confirmAction;
  closeConfirmation();
  if (typeof action === "function") action();
});

$("#confirmModal").addEventListener("click", event => {
  if (event.target === $("#confirmModal")) closeConfirmation();
});

/* -------------------- Menu, navegação e início -------------------- */

$("#menuButton").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$$(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    $$(".nav-link").forEach(item => item.classList.toggle("active", item === link));
    $("#sidebar").classList.remove("open");
    const target = link.getAttribute("href");
    const section = $(target);
    if (section) $("#pageName").textContent = link.textContent.trim().toUpperCase();
  });
});

function refreshAll() {
  renderCalendar();
  renderWeeklyPlan();
  renderExercises();
  renderCreator();
  renderStats();
  renderHistory();
  renderWellbeing();
  renderAchievements();
  renderFavoriteSettings();
  renderDailyPanel();
  renderProfile();
}

function initialise() {
  const date = today();

  $("#todayLabel").textContent = date.toLocaleDateString("pt-PT", {
    weekday: "short", day: "numeric", month: "short"
  });

  $("#wellbeingDate").value = dateKey(date);
  loadSettings();
  renderProfile();
  refreshAll();

  // Atualiza o gráfico quando o tamanho do ecrã muda.
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => drawProgressChart());
    observer.observe($("#progressChart").parentElement);
  } else {
    window.addEventListener("resize", drawProgressChart);
  }
}

initialise();

/* =========================================
   PINK WORLD — FUNCIONALIDADES
   Integrado com o PINK POWER existente
========================================= */

(() => {
  "use strict";

  const WORLD_KEY = "pinkPowerWorld_v1";

  const defaultWorld = {
    petName: "Mochi",
    stars: 0,
    love: 0,
    unlocked: ["bow"],
    equipped: "bow",
    envelopes: [],
    openedLetters: [],
    rewardedDays: [],
    rewardedSessions: [],
    rewardedRestDays: [],
    lastKnownTrainingCount: 0
  };

  function loadWorld() {
    try {
      const saved = JSON.parse(localStorage.getItem(WORLD_KEY));
      return saved && typeof saved === "object"
        ? { ...defaultWorld, ...saved }
        : { ...defaultWorld };
    } catch {
      return { ...defaultWorld };
    }
  }

  let world = loadWorld();

  function saveWorld() {
    localStorage.setItem(WORLD_KEY, JSON.stringify(world));
    renderWorld();
  }

  const closetItems = [
    { id: "bow", emoji: "🎀", name: "Laço rosa", cost: 0 },
    { id: "crown", emoji: "👑", name: "Coroa real", cost: 10 },
    { id: "flower", emoji: "🌸", name: "Flor delicada", cost: 15 },
    { id: "star", emoji: "⭐", name: "Estrela mágica", cost: 20 },
    { id: "glasses", emoji: "🕶️", name: "Óculos fashion", cost: 25 },
    { id: "halo", emoji: "😇", name: "Aurinha angelical", cost: 30 },
    { id: "heart", emoji: "💖", name: "Coração brilhante", cost: 35 },
    { id: "unicorn", emoji: "🦄", name: "Magia unicórnio", cost: 50 }
  ];

  const letters = [
    {
      emoji: "💌",
      title: "Uma mensagem só para ti",
      message: "Não precisas de fazer tudo num só dia. Cada pequeno passo conta. Continua a construir o teu universo ao teu ritmo!",
      reward: 3
    },
    {
      emoji: "🌸",
      title: "Um lembrete cor-de-rosa",
      message: "O teu valor não depende dos treinos que fazes. Descansar, divertir-te e cuidar de ti também são conquistas.",
      reward: 3
    },
    {
      emoji: "🐾",
      title: "Mensagem do Mochi",
      message: "Miauuu! Estou orgulhoso de ti por continuares a aparecer para ti própria. Vamos brincar um bocadinho?",
      reward: 3
    },
    {
      emoji: "✨",
      title: "Um desejo brilhante",
      message: "Escolhe uma coisa pequenina que te faça feliz hoje. O teu universo também é feito desses momentos.",
      reward: 3
    },
    {
      emoji: "🎀",
      title: "Uma carta especial",
      message: "Não tens de ser perfeita para merecer celebrar as tuas conquistas. Sê gentil contigo, hoje e sempre.",
      reward: 5
    }
  ];

  const $ = id => document.getElementById(id);

  function setMessage(message) {
    const element = $("pet-message");
    if (element) element.textContent = message;
  }

  function animatePet(className) {
    const pet = $("pet-character");
    if (!pet) return;

    pet.classList.remove("is-playing", "is-loved");
    void pet.offsetWidth;
    pet.classList.add(className);

    setTimeout(() => pet.classList.remove(className), 1800);
  }

  function addStars(amount) {
    world.stars += amount;
    saveWorld();
  }

  function queueEnvelope(reason) {
    if (world.envelopes.includes(reason)) return;
    world.envelopes.push(reason);
    saveWorld();
    setMessage("Miau! Tens uma surpresa nova à tua espera! 💌");
  }

  function getTrainingCount() {
    try {
      const saved = JSON.parse(localStorage.getItem("pinkPowerDiana_v3"));
      return Array.isArray(saved?.sessions) ? saved.sessions.length : 0;
    } catch {
      return 0;
    }
  }

  function getTrainedDays() {
    try {
      const saved = JSON.parse(localStorage.getItem("pinkPowerDiana_v3"));
      return Array.isArray(saved?.trainedDays) ? saved.trainedDays : [];
    } catch {
      return [];
    }
  }

  function checkTrainingRewards() {
    const count = getTrainingCount();

    for (let i = world.lastKnownTrainingCount + 1; i <= count; i++) {
      if (i < 1) continue;

      const rewardId = `session-${i}`;
      if (!world.rewardedSessions.includes(rewardId)) {
        world.rewardedSessions.push(rewardId);
        world.stars += 10;
        queueEnvelope(rewardId);
      }
    }

    world.lastKnownTrainingCount = Math.max(
      world.lastKnownTrainingCount,
      count
    );

    const days = getTrainedDays();

    for (const day of days) {
      const rewardId = `day-${day}`;

      if (!world.rewardedDays.includes(rewardId)) {
        world.rewardedDays.push(rewardId);
        world.stars += 5;
      }
    }

    saveWorld();
  }

  function renderPet() {
    const name = world.petName || "Mochi";

    if ($("pet-name-input")) $("pet-name-input").value = name;
    if ($("pet-stars")) $("pet-stars").textContent = world.stars;
    if ($("pet-love")) $("pet-love").textContent = world.love;
    if ($("closet-stars")) $("closet-stars").textContent = world.stars;
    if ($("pet-achievements")) {
      $("pet-achievements").textContent =
        world.rewardedDays.length + world.rewardedSessions.length;
    }

    if ($("pet-level")) {
      $("pet-level").textContent =
        `Nível ${1 + Math.floor(world.stars / 50)}`;
    }

    const messages = [
      `Miau! Olá, ${name}! Vamos tornar este dia especial? 💗`,
      `${name} está a mandar-te ronrons e boas energias! 🐾`,
      `${name} lembra-te: descansar também faz parte! 🌸`
    ];

    if ($("pet-message") && !$("pet-message").dataset.customMessage) {
      $("pet-message").textContent = messages[0];
    }

    const accessory = closetItems.find(item => item.id === world.equipped);

    if ($("pet-accessory")) {
      $("pet-accessory").textContent = accessory ? accessory.emoji : "";
    }

    if ($("equipped-item")) {
      $("equipped-item").textContent = accessory
        ? `${accessory.emoji} ${accessory.name}`
        : "Nenhum acessório";
    }
  }

  function renderCloset() {
    const grid = $("closet-grid");
    if (!grid) return;

    grid.innerHTML = "";

    closetItems.forEach(item => {
      const unlocked = world.unlocked.includes(item.id);
      const equipped = world.equipped === item.id;

      const card = document.createElement("div");
      card.className = `closet-item${equipped ? " equipped" : ""}`;

      const emoji = document.createElement("span");
      emoji.className = "closet-item-emoji";
      emoji.textContent = item.emoji;

      const name = document.createElement("strong");
      name.textContent = item.name;

      const cost = document.createElement("small");
      cost.textContent = unlocked ? "Já desbloqueado" : `${item.cost} estrelas`;

      const button = document.createElement("button");

      if (equipped) {
        button.textContent = "✓ Equipado";
        button.disabled = true;
      } else if (unlocked) {
        button.textContent = "Equipar";
        button.addEventListener("click", () => {
          world.equipped = item.id;
          setMessage(`${world.petName} adorou este acessório! 🎀`);
          saveWorld();
        });
      } else {
        button.textContent = "Desbloquear";
        button.disabled = world.stars < item.cost;

        button.addEventListener("click", () => {
          if (world.stars < item.cost) {
            setMessage("Ainda faltam algumas estrelas. Continua ao teu ritmo! ⭐");
            return;
          }

          world.stars -= item.cost;
          world.unlocked.push(item.id);
          world.equipped = item.id;
          setMessage(`Conseguiste! ${item.name} é teu! 🎉`);
          saveWorld();
        });
      }

      card.append(emoji, name, cost, button);
      grid.appendChild(card);
    });
  }

  function renderEnvelopes() {
    if ($("envelope-count")) {
      $("envelope-count").textContent =
        `${world.envelopes.length} por abrir`;
    }

    const history = $("opened-envelopes");
    if (!history) return;

    history.innerHTML = "";

    if (world.openedLetters.length === 0) {
      history.textContent = "Ainda não abriste nenhuma carta.";
      return;
    }

    world.openedLetters.slice().reverse().forEach(letter => {
      const row = document.createElement("div");
      row.className = "opened-letter";

      const icon = document.createElement("span");
      icon.textContent = letter.emoji;

      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = letter.title;

      const message = document.createElement("p");
      message.textContent = letter.message;

      content.append(title, message);
      row.append(icon, content);
      history.appendChild(row);
    });
  }

  function renderWorld() {
    renderPet();
    renderCloset();
    renderEnvelopes();
  }

  $("save-pet-name")?.addEventListener("click", () => {
    const input = $("pet-name-input");
    const name = input?.value.trim();

    if (!name) {
      setMessage("O teu gatinho precisa de um nome! 🐱");
      return;
    }

    world.petName = name.slice(0, 18);
    setMessage(`Miau! A partir de agora sou ${world.petName}! 💗`);
    saveWorld();
  });

  $("pet-pet-button")?.addEventListener("click", () => {
    world.love += 1;
    animatePet("is-loved");
    setMessage(`${world.petName} está a ronronar de felicidade! 💕`);

    // Pequena recompensa diária por carinho, sem necessidade de treinar.
    const today = new Date().toLocaleDateString("en-CA");
    const loveKey = `love-${today}`;

    if (!world.rewardedRestDays.includes(loveKey)) {
      world.rewardedRestDays.push(loveKey);
      world.stars += 1;
      setMessage(`${world.petName} adorou as festinhas! Ganhaste 1 estrela. ⭐`);
    }

    saveWorld();
  });

  $("pet-play-button")?.addEventListener("click", () => {
    animatePet("is-playing");
    setMessage(`${world.petName} está a brincar contigo! ✨`);
  });

  $("remove-accessory")?.addEventListener("click", () => {
    world.equipped = "";
    saveWorld();
    setMessage(`${world.petName} está confortável assim! 🐾`);
  });

  let currentLetter = null;

  $("open-envelope")?.addEventListener("click", () => {
    if (world.envelopes.length === 0) {
      setMessage("Ainda não tens envelopes novos. Um treino registado pode desbloquear uma surpresa! 💌");
      return;
    }

    const reason = world.envelopes.shift();
    currentLetter = letters[
      Math.abs(reason.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0))
      % letters.length
    ];

    if ($("envelope-result")) $("envelope-result").hidden = false;
    if ($("envelope-display")) $("envelope-display").hidden = true;
    if ($("envelope-hint")) $("envelope-hint").hidden = true;

    if ($("envelope-title")) {
      $("envelope-title").textContent = currentLetter.title;
    }

    if ($("envelope-message")) {
      $("envelope-message").textContent = currentLetter.message;
    }

    if (!world.openedLetters.some(letter => letter.reason === reason)) {
      world.openedLetters.push({
        ...currentLetter,
        reason,
        date: new Date().toLocaleDateString("pt-PT")
      });

      world.stars += currentLetter.reward;
    }

    saveWorld();
  });

  $("close-envelope")?.addEventListener("click", () => {
    if ($("envelope-result")) $("envelope-result").hidden = true;
    if ($("envelope-display")) $("envelope-display").hidden = false;
    if ($("envelope-hint")) $("envelope-hint").hidden = false;

    setMessage("Espero que tenhas gostado da tua surpresa! 💗");
    saveWorld();
  });

  $("envelope-display")?.addEventListener("animationend", () => {
    $("open-envelope")?.classList.remove("pink-pop");
  });

  // Verifica os treinos já registados e atribui recompensas apenas
  // aos registos que ainda não foram recompensados.
  checkTrainingRewards();
  renderWorld();

  // Permite que a área de recompensas seja atualizada quando o treino
  // é concluído e a aplicação atualiza os seus dados no localStorage.
  window.addEventListener("storage", event => {
    if (event.key === "pinkPowerDiana_v3") {
      checkTrainingRewards();
    }
  });

  // Conquista inicial: primeiro envelope disponível.
  if (
    getTrainingCount() === 0 &&
    world.openedLetters.length === 0 &&
    world.envelopes.length === 0
  ) {
    setMessage(`Miau! Sou ${world.petName}. Faz-me festinhas enquanto esperas pela primeira surpresa! 🐱`);
  }
})();

/* ==================================
   PINK CLOSET — FUNCIONALIDADE
================================== */

(() => {
  const WORLD_KEY = "pinkPowerWorld_v1";
  const CLOSET_KEY = "pinkPowerCloset_v1";

  const accessories = [
    { id: "bow", name: "Laço rosa", emoji: "🎀", cost: 0 },
    { id: "crown", name: "Coroa real", emoji: "👑", cost: 10 },
    { id: "flower", name: "Flor fofinha", emoji: "🌸", cost: 15 },
    { id: "star", name: "Estrela mágica", emoji: "⭐", cost: 20 },
    { id: "glasses", name: "Óculos fashion", emoji: "👓", cost: 25 },
    { id: "halo", name: "Auréola", emoji: "😇", cost: 30 },
    { id: "heart", name: "Coração rosa", emoji: "💗", cost: 35 },
    { id: "unicorn", name: "Unicórnio", emoji: "🦄", cost: 50 }
  ];

  const defaultCloset = {
    unlocked: ["bow"],
    equipped: "bow",
    stars: 0
  };

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  let closet = {
    ...defaultCloset,
    ...readJSON(CLOSET_KEY, {})
  };

  closet.unlocked = Array.isArray(closet.unlocked)
    ? [...new Set(["bow", ...closet.unlocked])]
    : ["bow"];

  if (!accessories.some(item => item.id === closet.equipped) ||
      !closet.unlocked.includes(closet.equipped)) {
    closet.equipped = "bow";
  }

  function getWorld() {
    return readJSON(WORLD_KEY, {});
  }

  function getStars() {
    const world = getWorld();

    // Usa o saldo partilhado com a gatinha, se existir.
    if (Number.isFinite(world.stars)) {
      return Math.max(0, world.stars);
    }

    return Math.max(0, Number(closet.stars) || 0);
  }

  function saveCloset() {
    try {
      localStorage.setItem(CLOSET_KEY, JSON.stringify(closet));
    } catch (error) {
      console.error("Não foi possível guardar o PINK CLOSET:", error);
    }
  }

  function spendStars(amount) {
    const world = getWorld();

    if (Number.isFinite(world.stars)) {
      if (world.stars < amount) return false;

      world.stars -= amount;

      try {
        localStorage.setItem(WORLD_KEY, JSON.stringify(world));
      } catch (error) {
        console.error("Não foi possível guardar as estrelas:", error);
        return false;
      }

      return true;
    }

    if (closet.stars < amount) return false;

    closet.stars -= amount;
    return true;
  }

  function updateExistingPet() {
    const item = accessories.find(a => a.id === closet.equipped);
    if (!item) return;

    // Compatibilidade com a versão anterior da gatinha.
    const existingAccessory = document.getElementById("pet-accessory");
    if (existingAccessory) {
      existingAccessory.textContent = item.emoji;
    }

    const existingStars = document.getElementById("pet-stars");
    if (existingStars) {
      existingStars.textContent = getStars();
    }

    const existingPetMessage = document.getElementById("pet-message");
    if (existingPetMessage) {
      existingPetMessage.textContent =
        `Olha o meu novo visual! Estou a usar ${item.name}! 💗`;
    }
  }

  function renderCloset() {
    const grid = document.getElementById("closet-accessory-grid");
    const starCount = document.getElementById("closet-star-count");
    const worn = document.getElementById("closet-worn-accessory");
    const outfitName = document.getElementById("closet-outfit-name");
    const removeButton = document.getElementById("closet-remove-accessory");

    if (!grid || !starCount || !worn || !outfitName) return;

    const stars = getStars();
    const equippedItem = accessories.find(
      item => item.id === closet.equipped
    ) || accessories[0];

    starCount.textContent = `${stars} ⭐`;
    worn.textContent = equippedItem.emoji;
    outfitName.textContent = equippedItem.name;

    grid.innerHTML = accessories.map(item => {
      const unlocked = closet.unlocked.includes(item.id);
      const equipped = closet.equipped === item.id;
      const canAfford = stars >= item.cost;

      let buttonText = "Desbloquear";
      if (equipped) buttonText = "✓ Equipado";
      else if (unlocked) buttonText = "Equipar";
      else if (!canAfford) buttonText = `Faltam ${item.cost - stars} ⭐`;

      return `
        <article class="closet-item ${equipped ? "is-equipped" : ""} ${!unlocked ? "is-locked" : ""}">
          <span class="closet-item-emoji">${item.emoji}</span>
          <span class="closet-item-name">${item.name}</span>
          <span class="closet-item-cost">
            ${item.cost === 0 ? "Oferta inicial 💕" : `${item.cost} ⭐`}
          </span>
          <button
            type="button"
            class="closet-item-button"
            data-closet-item="${item.id}"
            ${equipped || (!unlocked && !canAfford) ? "disabled" : ""}
          >${buttonText}</button>
        </article>
      `;
    }).join("");

    if (removeButton) {
      removeButton.disabled = closet.equipped === "bow";
    }

    updateExistingPet();
  }

  function showFeedback(message) {
    const feedback = document.getElementById("closet-feedback");
    if (feedback) feedback.textContent = message;
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-closet-item]");
    if (!button) return;

    const item = accessories.find(
      accessory => accessory.id === button.dataset.closetItem
    );

    if (!item) return;

    if (closet.unlocked.includes(item.id)) {
      closet.equipped = item.id;
      saveCloset();
      renderCloset();
      showFeedback(`${item.emoji} A tua gatinha está a usar ${item.name}!`);
      return;
    }

    if (getStars() < item.cost) {
      showFeedback(`Ainda te faltam ${item.cost - getStars()} estrelas. ✨`);
      return;
    }

    if (!spendStars(item.cost)) {
      showFeedback("Não foi possível utilizar as estrelas. Tenta novamente.");
      return;
    }

    closet.unlocked.push(item.id);
    closet.equipped = item.id;

    saveCloset();
    renderCloset();
    showFeedback(`🎉 Desbloqueaste ${item.name}! Já está equipado.`);
  });

  document.getElementById("closet-remove-accessory")
    ?.addEventListener("click", () => {
      closet.equipped = "bow";
      saveCloset();
      renderCloset();
      showFeedback("🎀 A tua gatinha voltou ao look inicial!");
    });

  // Atualiza o saldo se outra funcionalidade o alterar no mesmo separador.
  window.addEventListener("pinkPowerStarsUpdated", renderCloset);

  // Atualiza o saldo quando outra página do site o altera.
  window.addEventListener("storage", event => {
    if (event.key === WORLD_KEY || event.key === CLOSET_KEY) {
      closet = {
        ...defaultCloset,
        ...readJSON(CLOSET_KEY, {})
      };
      renderCloset();
    }
  });

  renderCloset();
})();

/* ==================================
   PINK POWER — PERFIL PESSOAL
================================== */

(() => {
  const STORAGE_KEY = "pinkPowerProfile_v1";

  const defaults = {
    name: "Diana",
    bio: "A construir a minha melhor versão, ao meu ritmo. 💕",
    color: "#f062a8",
    photo: ""
  };

  const $ = id => document.getElementById(id);

  const form = $("profile-edit-form");
  const photoInput = $("profile-photo");

  if (!form || !photoInput) return;

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      return saved && typeof saved === "object"
        ? { ...defaults, ...saved }
        : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  let profile = loadProfile();
  let pendingPhoto = profile.photo || "";

  function renderProfile() {
    $("profile-name").value = profile.name;
    $("profile-bio").value = profile.bio;
    $("profile-color").value = profile.color;

    $("profile-name-preview").textContent = profile.name || "A minha conta";
    $("profile-bio-preview").textContent =
      profile.bio || "Este é o meu cantinho PINK POWER. 💗";

    $("profile-color-label").textContent = profile.color.toUpperCase();

    $("pink-profile").style.setProperty("--profile-accent", profile.color);
    $("profile-preview").style.setProperty("--profile-accent", profile.color);

    const photo = $("profile-photo-preview");
    const placeholder = $("profile-avatar-placeholder");

    if (profile.photo) {
      photo.src = profile.photo;
      photo.hidden = false;
      placeholder.hidden = true;
    } else {
      photo.removeAttribute("src");
      photo.hidden = true;
      placeholder.hidden = false;
    }
  }

  function showMessage(message) {
    $("profile-feedback").textContent = message;
  }

  function saveProfile() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error("Erro ao guardar o perfil:", error);
      showMessage(
        "Não foi possível guardar. Experimenta uma imagem mais pequena ou com outro formato."
      );
      return false;
    }
  }

  // Pré-visualiza a cor imediatamente.
  $("profile-color").addEventListener("input", event => {
    const color = event.target.value;

    $("pink-profile").style.setProperty("--profile-accent", color);
    $("profile-preview").style.setProperty("--profile-accent", color);
    $("profile-color-label").textContent = color.toUpperCase();
  });

  // Redimensiona a fotografia para reduzir o espaço ocupado.
  function preparePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Escolhe um ficheiro de imagem válido."));
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        reject(new Error("A imagem deve ter menos de 10 MB."));
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));

      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));

        image.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSide = 512;
          const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height)
          );

          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Não foi possível preparar a fotografia."));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          // Converte para JPEG comprimido para facilitar o armazenamento.
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files?.[0];
    if (!file) return;

    showMessage("A preparar a tua fotografia... 💗");

    try {
      pendingPhoto = await preparePhoto(file);

      const preview = $("profile-photo-preview");
      preview.src = pendingPhoto;
      preview.hidden = false;
      $("profile-avatar-placeholder").hidden = true;

      showMessage("Fotografia pronta! Carrega em guardar para confirmar. ✨");
    } catch (error) {
      showMessage(error.message || "Ocorreu um erro com a fotografia.");
      photoInput.value = "";
    }
  });

  // Guarda o nome, a descrição, a cor e a fotografia.
  form.addEventListener("submit", event => {
    event.preventDefault();

    const name = $("profile-name").value.trim();
    const bio = $("profile-bio").value.trim();
    const color = $("profile-color").value;

    if (!name) {
      showMessage("Escreve o teu nome antes de guardar. 💕");
      return;
    }

    const previousProfile = { ...profile };

    profile = {
      name,
      bio,
      color,
      photo: pendingPhoto
    };

    if (!saveProfile()) {
      profile = previousProfile;
      return;
    }

    renderProfile();
    showMessage("Perfil guardado com sucesso! 💖");
  });

  // Remove apenas a fotografia.
  $("profile-remove-photo").addEventListener("click", () => {
    pendingPhoto = "";
    profile.photo = "";
    photoInput.value = "";

    if (saveProfile()) {
      renderProfile();
      showMessage("Fotografia removida. Podes escolher outra quando quiseres. 🎀");
    }
  });

  // Repõe todos os campos do perfil.
  $("profile-reset").addEventListener("click", () => {
    const confirmed = window.confirm(
      "Queres mesmo repor o perfil inicial? O nome, a descrição, a cor e a fotografia serão repostos."
    );

    if (!confirmed) return;

    profile = { ...defaults };
    pendingPhoto = "";
    photoInput.value = "";

    if (saveProfile()) {
      renderProfile();
      showMessage("O teu perfil voltou ao estado inicial. 💗");
    }
  });

  // Carrega o perfil guardado ao abrir a página.
  renderProfile();
})();
