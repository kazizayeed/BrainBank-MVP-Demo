// BrainBank MVP Demo — dark theme only, all local
(function() {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const routes = ["home","dashboard","leaderboard","profile"]; 
  const state = {
    user: null,
    lessons: [
      { id: "l1", title: "What is Money?", tag: "basics", blurb: "From barter to banknotes to digital cash." },
      { id: "l2", title: "Needs vs Wants", tag: "basics", blurb: "A simple budgeting superpower." },
      { id: "l3", title: "How Banks Work", tag: "banking", blurb: "Deposits, loans, and interest explained." },
      { id: "l4", title: "Credit Scores 101", tag: "banking", blurb: "Build credit the smart way." },
      { id: "l5", title: "Saving vs Investing", tag: "investing", blurb: "Risk, reward, and time horizons." },
      { id: "l6", title: "What is a Stock?", tag: "investing", blurb: "Ownership, dividends, and volatility." },
    ],
    questions: [
      { q: "If you earn 3% interest on $100 for one year, how much will you have?", options: ["$100","$103","$130","$3"], correct: 1, explain: "$100 × 1.03 = $103" },
      { q: "Which is a 'need' more than a 'want'?", options: ["Streaming service","Fancy sneakers","Groceries","Concert tickets"], correct: 2, explain: "Food is a basic need." },
      { q: "Diversification helps you…", options: ["Guarantee profits","Reduce risk","Avoid taxes","Pick the best stock"], correct: 1, explain: "Spreading investments reduces risk." },
      { q: "A budget is…", options: ["A list of debts","A plan for income & spending","A credit card limit","A saving account"], correct: 1, explain: "Budget = plan for money flows." },
      { q: "An emergency fund ideally covers…", options: ["1 week of expenses","3–6 months of expenses","A vacation","A new phone"], correct: 1, explain: "Common guidance is 3–6 months." },
    ],
    quiz: {
      queue: [], step: 0, correct: 0, daily: false
    },
    leaderboard: []
  };

  // --- Storage helpers ---
  const storage = {
    get() {
      try { return JSON.parse(localStorage.getItem("brainbank-demo") || "{}"); } catch { return {}; }
    },
    set(data) { localStorage.setItem("brainbank-demo", JSON.stringify(data)); },
    clear() { localStorage.removeItem("brainbank-demo"); }
  };

  // --- Init ---
  function init() {
    // year
    $('#year').textContent = new Date().getFullYear();

    // restore
    const save = storage.get();
    if (save.user) {
      state.user = save.user;
      enableApp();
      routeTo('dashboard');
      renderAll();
    }

    // nav
    $$('.nav-link').forEach(btn => btn.addEventListener('click', () => routeTo(btn.dataset.route)));

    // login
    $('#demo-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#name').value.trim();
      if (!name) return;
      state.user = {
        name,
        coins: 0,
        level: 1,
        streak: 0,
        lastDaily: null
      };
      persist();
      enableApp();
      routeTo('dashboard');
      renderAll();
    });

    // dashboard actions
    $('#btn-play-daily').addEventListener('click', startDaily);
    $('#btn-play-quiz').addEventListener('click', () => startQuiz(3));

    // leaderboard
    $('#lb-add').addEventListener('click', addLeaderboardRow);

    // profile
    $('#btn-save-profile').addEventListener('click', saveProfile);
    $('#btn-reset').addEventListener('click', resetAll);

    // quiz modal
    $('#quiz-close').addEventListener('click', closeQuiz);
    $('#quiz-next').addEventListener('click', quizNext);

    // lessons
    $('#lesson-filter').addEventListener('change', renderLessons);
    $('#lesson-search').addEventListener('input', renderLessons);
  }

  function enableApp() {
    ['#nav-dashboard','#nav-leaderboard','#nav-profile'].forEach(sel => {
      const el = $(sel); el.disabled = false; 
    });
    // Prefill profile
    if (state.user) {
      $('#profile-name').value = state.user.name;
    }
  }

  function routeTo(name) {
    if (!routes.includes(name)) return;
    $$('.route').forEach(s => s.classList.remove('visible'));
    document.getElementById(name).classList.add('visible');
    $$('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.route === name));
    if (name === 'dashboard') renderDashboard();
    if (name === 'leaderboard') renderLeaderboard();
    if (name === 'profile') renderProfile();
  }

  function persist() {
    storage.set({ user: state.user, leaderboard: state.leaderboard });
  }

  // --- Renders ---
  function renderAll() {
    renderDashboard();
    renderLessons();
    renderLeaderboard();
  }

  function renderDashboard() {
    if (!state.user) return;
    $('#stat-coins').textContent = state.user.coins;
    $('#stat-level').textContent = state.user.level;
    $('#stat-streak').textContent = state.user.streak + '🔥';

    const today = new Date().toDateString();
    const played = state.user.lastDaily === today;
    $('#daily-status').textContent = played ? "You've completed today's challenge. Come back tomorrow!" : "Ready for today's question?";
    $('#btn-play-daily').disabled = played;
  }

  function renderLessons() {
    const filter = $('#lesson-filter').value;
    const term = $('#lesson-search').value.trim().toLowerCase();
    const wrap = $('#lesson-list');
    wrap.innerHTML = '';

    state.lessons
      .filter(l => filter === 'all' || l.tag === filter)
      .filter(l => !term || l.title.toLowerCase().includes(term) || l.blurb.toLowerCase().includes(term))
      .forEach(l => {
        const div = document.createElement('div');
        div.className = 'lesson';
        div.innerHTML = `<h4>${l.title} <span class="pill">${capitalize(l.tag)}</span></h4>
                         <p>${l.blurb}</p>`;
        wrap.appendChild(div);
      });
  }

  function renderLeaderboard() {
    // Merge current user into leaderboard view
    const lb = loadLeaderboard();
    const tbody = $('#lb-table tbody');
    tbody.innerHTML = '';
    lb.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i+1}</td><td>${row.name}</td><td>${row.coins}</td><td>${row.level}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderProfile() {
    if (!state.user) return;
    $('#profile-name').value = state.user.name;
  }

  // --- Quiz Logic ---
  function startDaily() {
    if (!state.user) return;
    const today = new Date().toDateString();
    if (state.user.lastDaily === today) return; // already done
    state.quiz.daily = true;
    state.quiz.queue = pickRandom(state.questions, 1);
    state.quiz.step = 0; state.quiz.correct = 0;
    openQuiz('Daily Challenge');
  }

  function startQuiz(n = 3) {
    state.quiz.daily = false;
    state.quiz.queue = pickRandom(state.questions, Math.min(n, state.questions.length));
    state.quiz.step = 0; state.quiz.correct = 0;
    openQuiz('Quick Quiz');
  }

  function openQuiz(title) {
    $('#quiz-title').textContent = title;
    $('#quiz-modal').classList.remove('hidden');
    $('#quiz-next').textContent = 'Next';
    renderQuizStep();
  }
  function closeQuiz() {
    $('#quiz-modal').classList.add('hidden');
  }

  function renderQuizStep() {
    const body = $('#quiz-body');
    const item = state.quiz.queue[state.quiz.step];
    if (!item) return;

    body.innerHTML = '';
    const q = document.createElement('p');
    q.className = 'quiz-q';
    q.textContent = `Q${state.quiz.step + 1}. ${item.q}`;

    const options = document.createElement('div');
    options.className = 'quiz-options';

    item.options.forEach((opt, idx) => {
      const label = document.createElement('label');
      label.className = 'option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'quizopt';
      radio.value = idx;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opt));
      options.appendChild(label);
    });

    body.appendChild(q);
    body.appendChild(options);
  }

  function quizNext() {
    const item = state.quiz.queue[state.quiz.step];
    if (!item) return;

    const selected = $('input[name="quizopt"]:checked');
    if (!selected) { alert('Please choose an option.'); return; }

    const chosen = Number(selected.value);
    const correct = chosen === item.correct;
    if (correct) state.quiz.correct++;

    // Show feedback
    const body = $('#quiz-body');
    const p = document.createElement('p');
    p.style.marginTop = '8px';
    p.innerHTML = correct
      ? `✅ Correct! ${item.explain}`
      : `❌ Not quite. ${item.explain}`;
    body.appendChild(p);

    // Advance or finish
    if (state.quiz.step < state.quiz.queue.length - 1) {
      state.quiz.step++;
      setTimeout(renderQuizStep, 600);
    } else {
      // Score and rewards
      const reward = state.quiz.correct * 10; // 10 coins per correct
      if (state.user) {
        state.user.coins += reward;
        maybeLevelUp();
        if (state.quiz.daily) {
          const today = new Date().toDateString();
          // handle streak
          if (state.user.lastDaily) {
            const last = new Date(state.user.lastDaily);
            const diff = daysBetween(last, new Date());
            state.user.streak = (diff === 1) ? (state.user.streak + 1) : 1;
          } else {
            state.user.streak = 1;
          }
          state.user.lastDaily = today;
        }
        persist();
        renderDashboard();
        // also reflect in leaderboard
        upsertLeaderboard({ name: state.user.name, coins: state.user.coins, level: state.user.level });
      }

      $('#quiz-next').textContent = `Done (+${reward}🪙)`;
      setTimeout(closeQuiz, 700);
    }
  }

  function maybeLevelUp() {
    // simple level curve: every 50 coins
    const lvl = Math.floor(state.user.coins / 50) + 1;
    state.user.level = Math.max(state.user.level, lvl);
  }

  // --- Leaderboard ---
  function loadLeaderboard() {
    // include saved players + current user
    const saved = storage.get().leaderboard || [];
    state.leaderboard = saved;
    const all = [...saved];
    if (state.user) {
      all.push({ name: state.user.name, coins: state.user.coins, level: state.user.level });
    }
    return all
      .filter(Boolean)
      .sort((a,b) => (b.coins||0) - (a.coins||0))
      .slice(0, 20);
  }

  function upsertLeaderboard(player) {
    const list = storage.get().leaderboard || [];
    const idx = list.findIndex(p => p.name === player.name);
    if (idx >= 0) list[idx] = player; else list.push(player);
    state.leaderboard = list;
    persist();
    renderLeaderboard();
  }

  function addLeaderboardRow() {
    const name = $('#lb-name').value.trim();
    const coins = Number($('#lb-coins').value || 0);
    if (!name) return;
    const level = Math.floor(coins / 50) + 1;
    upsertLeaderboard({ name, coins, level });
    $('#lb-name').value = '';
    $('#lb-coins').value = '';
  }

  // --- Profile (no theme toggle) ---
  function saveProfile() {
    if (!state.user) return;
    const newName = $('#profile-name').value.trim();
    if (newName) state.user.name = newName;
    persist();
    renderLeaderboard();
    alert('Saved!');
  }

  function resetAll() {
    if (!confirm('Reset all demo data? This clears localStorage.')) return;
    storage.clear();
    location.reload();
  }

  // --- Utils ---
  function pickRandom(arr, n) {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length) {
      const i = Math.floor(Math.random()*copy.length);
      out.push(copy.splice(i,1)[0]);
    }
    return out;
  }
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
  function daysBetween(d1, d2){
    const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((b - a) / (1000*60*60*24));
  }

  // Kickoff
  document.addEventListener('DOMContentLoaded', init);
})();