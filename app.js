
// BrainBank Enhanced MVP Demo — with Investment Simulator
(function() {
    'use strict';

    // --- UTILITY FUNCTIONS ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    // --- STATE MANAGEMENT ---
    const state = {
        user: null,
        leaderboard: [],
        currentQuiz: {
            questions: [],
            currentQ: 0,
            score: 0,
            isDaily: false,
        },
        lessons: [
            { id: "l1", title: "What is Money?", tag: "basics", blurb: "From barter to banknotes to digital cash." },
            { id: "l2", title: "Needs vs Wants", tag: "basics", blurb: "A simple budgeting superpower." },
            { id: "l3", title: "How Banks Work", tag: "banking", blurb: "Deposits, loans, and interest explained." },
            { id: "l4", title: "Credit Scores 101", tag: "banking", blurb: "Build credit the smart way." },
            { id: "l5", title: "Saving vs Investing", tag: "investing", blurb: "Risk, reward, and time horizons." },
            { id: "l6", title: "What is a Stock?", tag: "investing", blurb: "Ownership, dividends, and volatility." },
            { id: "l7", title: "Compound Interest Magic", tag: "investing", blurb: "How time makes money grow exponentially." },
            { id: "l8", title: "Emergency Funds", tag: "basics", blurb: "Your financial safety net explained." },
        ],
        questions: [
            { q: "If you earn 3% interest on $100 for one year, how much will you have?", options: ["$100","$103","$130","$3"], correct: 1, explain: "$100 × 1.03 = $103. This is simple interest." },
            { q: "Which is a 'need' more than a 'want'?", options: ["Streaming service","Fancy sneakers","Groceries","Concert tickets"], correct: 2, explain: "Food is a basic survival need, whereas the others are forms of entertainment or luxury." },
            { q: "Diversification in investing helps you…", options: ["Guarantee profits","Reduce risk","Avoid taxes","Pick the best stock"], correct: 1, explain: "Spreading investments across different assets reduces the impact if one performs poorly. It's the 'don't put all your eggs in one basket' strategy." },
            { q: "A budget is…", options: ["A list of debts","A plan for income & spending","A credit card limit","A saving account"], correct: 1, explain: "A budget is a forward-looking plan to manage your money effectively." },
            { q: "What does 'compounding' refer to?", options: ["Earning interest on your interest", "Selling a stock for a profit", "Paying a fee to a bank", "Withdrawing money"], correct: 0, explain: "Compounding is when your investment returns start earning their own returns, causing exponential growth over time."}
        ]
    };

    // --- LOCAL STORAGE ---
    const saveState = () => {
        try {
            localStorage.setItem('brainBankState', JSON.stringify({ user: state.user, leaderboard: state.leaderboard }));
        } catch (e) {
            console.error("Failed to save state:", e);
        }
    };

    const loadState = () => {
        try {
            const saved = localStorage.getItem('brainBankState');
            if (saved) {
                const { user, leaderboard } = JSON.parse(saved);
                if (user) {
                    state.user = user;
                    state.leaderboard = leaderboard || [];
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("Failed to load state:", e);
            return false;
        }
    };
    
    // --- UI & RENDERING ---
    const updateUI = () => {
        if (!state.user) return;
        
        $('#stat-coins').textContent = state.user.coins;
        $('#stat-level').textContent = Math.floor(state.user.coins / 100) + 1;
        $('#stat-streak').textContent = `${state.user.streak}🔥`;
        $('#stat-portfolio').textContent = `$${(state.user.portfolio || 0).toFixed(2)}`;
        $('#profile-name').value = state.user.name;

        const today = new Date().toDateString();
        if (state.user.lastDaily === today) {
            $('#btn-play-daily').disabled = true;
            $('#daily-status').textContent = "You've completed today's challenge! Come back tomorrow.";
        } else {
            $('#btn-play-daily').disabled = false;
            $('#daily-status').textContent = "Ready for today's question?";
        }

        renderLeaderboard();
        renderLessons();
    };

    const renderLessons = (filter = 'all', query = '') => {
        const list = $('#lesson-list');
        list.innerHTML = '';
        const lowerQuery = query.toLowerCase();
        const filteredLessons = state.lessons.filter(lesson => 
            (filter === 'all' || lesson.tag === filter) &&
            (lesson.title.toLowerCase().includes(lowerQuery) || lesson.blurb.toLowerCase().includes(lowerQuery))
        );

        if (filteredLessons.length === 0) {
            list.innerHTML = '<p>No lessons match your criteria.</p>';
            return;
        }
        
        filteredLessons.forEach(lesson => {
            const lessonEl = document.createElement('div');
            lessonEl.className = 'lesson';
            lessonEl.innerHTML = `
                <div class="pill">${lesson.tag}</div>
                <h4>${lesson.title}</h4>
                <p>${lesson.blurb}</p>
            `;
            list.appendChild(lessonEl);
        });
    };

    const renderLeaderboard = () => {
        const tableBody = $('#lb-table tbody');
        tableBody.innerHTML = '';
        
        const allPlayers = [...state.leaderboard];
        if (state.user && !allPlayers.some(p => p.name === state.user.name)) {
            allPlayers.push({
                name: state.user.name,
                coins: state.user.coins,
                portfolio: state.user.portfolio
            });
        }
        
        allPlayers.sort((a, b) => b.coins - a.coins);
        
        allPlayers.forEach((player, index) => {
            const row = tableBody.insertRow();
            if (player.name === state.user?.name) {
                row.style.background = 'var(--surface-hover)';
            }
            const level = Math.floor((player.coins || 0) / 100) + 1;
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td>${player.coins || 0}</td>
                <td>${level}</td>
                <td>$${(player.portfolio || 0).toFixed(2)}</td>
            `;
        });
    };

    // --- ROUTING ---
    const showRoute = (routeId) => {
        $$('.route').forEach(r => r.classList.remove('visible'));
        $(`#${routeId}`)?.classList.add('visible');
        
        $$('.nav-link').forEach(l => {
            l.classList.toggle('active', l.dataset.route === routeId);
        });
        window.scrollTo(0, 0);
    };

    // --- GAME LOGIC ---
    const handleLogin = (e) => {
        e.preventDefault();
        const nameInput = $('#name');
        const name = nameInput.value.trim();

        if (!name) {
            nameInput.style.borderColor = 'var(--accent-danger)';
            setTimeout(() => { nameInput.style.borderColor = '' }, 2000);
            return;
        }

        // 1. Create the user object in the global state
        state.user = {
            name,
            coins: 0,
            streak: 0,
            portfolio: 0,
            lastDaily: null,
            portfolioUpdated: false, // For simulator
        };

        // 2. Persist this new state to the browser's storage
        saveState();

        // 3. Unlock the navigation UI
        $$('.nav-link').forEach(btn => btn.disabled = false);
        
        // 4. Populate the dashboard and other components with the new user's data
        updateUI();

        // 5. Finally, switch the visible page to the dashboard
        showRoute('dashboard');
    };
    
    // --- QUIZ LOGIC ---
    const startQuiz = (isDaily) => {
        const quiz = state.currentQuiz;
        quiz.isDaily = isDaily;
        quiz.currentQ = 0;
        quiz.score = 0;

        if (isDaily) {
            const dayIndex = new Date().getDate() % state.questions.length;
            quiz.questions = [state.questions[dayIndex]];
            $('#quiz-title').textContent = 'Daily Challenge';
        } else {
            const shuffled = [...state.questions].sort(() => 0.5 - Math.random());
            quiz.questions = shuffled.slice(0, 3);
            $('#quiz-title').textContent = 'Quick Quiz';
        }
        
        renderQuestion();
        $('#quiz-modal').classList.remove('hidden');
    };

    const renderQuestion = () => {
        const quiz = state.currentQuiz;
        const qData = quiz.questions[quiz.currentQ];
        
        if (!qData) {
            endQuiz();
            return;
        }

        const optionsHTML = qData.options.map((opt, i) => `
            <label class="option">
                <input type="radio" name="answer" value="${i}">
                <span>${opt}</span>
            </label>
        `).join('');
        
        $('#quiz-body').innerHTML = `
            <p class="quiz-q">${qData.q}</p>
            <div class="quiz-options">${optionsHTML}</div>
            <div class="explanation hidden"></div>
        `;
        $('#quiz-next').textContent = "Submit";
        $('#quiz-next').onclick = checkAnswer;
    };

    const checkAnswer = () => {
        const selected = $('input[name="answer"]:checked');
        if (!selected) return;

        const quiz = state.currentQuiz;
        const qData = quiz.questions[quiz.currentQ];
        const answerIndex = parseInt(selected.value);
        const options = $$('.option');

        options.forEach(opt => {
            const radio = opt.querySelector('input');
            radio.disabled = true; // Disable all options after submission
        });

        if (answerIndex === qData.correct) {
            quiz.score++;
            options[answerIndex].classList.add('correct');
        } else {
            options[answerIndex].classList.add('incorrect');
            options[qData.correct].classList.add('correct');
        }

        const explanationEl = $('.explanation');
        explanationEl.textContent = qData.explain;
        explanationEl.classList.remove('hidden');

        $('#quiz-next').textContent = "Next";
        $('#quiz-next').onclick = () => {
            quiz.currentQ++;
            renderQuestion();
        };
    };

    const endQuiz = () => {
        const quiz = state.currentQuiz;
        const coinsEarned = quiz.score * 10;
        let summaryHTML = `<h2>Quiz Complete!</h2><p>You answered ${quiz.score} out of ${quiz.questions.length} correctly.</p><p class="success">You earned ${coinsEarned} coins!</p>`;

        state.user.coins += coinsEarned;
        
        if (quiz.isDaily && quiz.score > 0) {
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 864e5).toDateString();
            
            if (state.user.lastDaily === yesterday) {
                state.user.streak++;
                summaryHTML += `<p>Streak extended to ${state.user.streak} days! 🔥</p>`;
            } else if (state.user.lastDaily !== today) {
                state.user.streak = 1;
                 summaryHTML += `<p>New streak started! 🔥</p>`;
            }
            state.user.lastDaily = today;
        }

        $('#quiz-body').innerHTML = summaryHTML;
        $('#quiz-next').textContent = "Finish";
        $('#quiz-next').onclick = closeQuiz;
        saveState();
        updateUI();
    };

    const closeQuiz = () => $('#quiz-modal').classList.add('hidden');

    // --- SIMULATOR LOGIC ---
    const setupSimulator = () => {
        let selectedChoice = null;

        $$('.choice-card').forEach(card => {
            card.addEventListener('click', () => {
                if ($('#investment-progress').classList.contains('hidden')) {
                    $$('.choice-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    selectedChoice = card.dataset.choice;
                    $('#btn-make-choice').disabled = false;
                }
            });
        });
        
        $('#btn-make-choice').addEventListener('click', () => {
            if (selectedChoice === 'invest') {
                $('#investment-progress').classList.remove('hidden');
                updateInvestment(1);
            } else if (selectedChoice === 'spend') {
                 $('#scenario-text').textContent = "You bought the sneakers! They look great, but your $20 is gone. In the investment world, this is a 'consumption' choice with no financial return.";
            }
            $('#btn-make-choice').style.display = 'none';
            $('#btn-reset-scenario').style.display = 'inline-flex';
        });

        $$('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateInvestment(parseInt(btn.dataset.time));
            });
        });

        $('#btn-reset-scenario').addEventListener('click', resetSimulator);
    };

    const updateInvestment = (years) => {
        const principal = 20;
        const rate = 0.07; // 7% average annual return
        const value = principal * Math.pow((1 + rate), years);
        
        $('#chart-value').textContent = `$${value.toFixed(2)}`;
        
        const maxHeight = 250; 
        const heightPercent = Math.min(100, (value / maxHeight) * 100);
        $('#chart-line').style.height = `${heightPercent}%`;
        
        $$('.reward').forEach(reward => {
            reward.classList.toggle('unlocked', value >= parseFloat(reward.dataset.milestone));
        });

        $('#comparison-text').textContent = `After ${years} year(s), your initial $20 investment could grow to $${value.toFixed(2)}. This demonstrates the power of compounding over time!`;

        if(!state.user.portfolioUpdated) {
            state.user.portfolio += value - principal;
            state.user.portfolioUpdated = true; 
            saveState();
            updateUI();
        }
    };
    
    const resetSimulator = () => {
        $('#investment-progress').classList.add('hidden');
        $$('.choice-card').forEach(c => c.classList.remove('selected'));
        $('#btn-make-choice').style.display = 'inline-flex';
        $('#btn-make-choice').disabled = true;
        $('#btn-reset-scenario').style.display = 'none';
        $('#scenario-text').textContent = "You just earned $20 from a side hustle! What will you do with it this time?";
        state.user.portfolioUpdated = false; 
    };

    // --- INITIALIZATION ---
    const init = () => {
        $('#year').textContent = new Date().getFullYear();

        // Check for existing session on page load
        if (loadState()) {
            // User is already logged in
            $$('.nav-link').forEach(btn => btn.disabled = false);
            updateUI();
            showRoute('dashboard');
        } else {
            // New user, show the home page
            showRoute('home');
            renderLeaderboard();
            renderLessons();
        }

        // --- GLOBAL EVENT LISTENERS ---
        $('#demo-login').addEventListener('submit', handleLogin);
        $$('.nav-link').forEach(link => {
            link.addEventListener('click', () => showRoute(link.dataset.route));
        });
        $('#btn-play-daily').addEventListener('click', () => startQuiz(true));
        $('#btn-play-quiz').addEventListener('click', () => startQuiz(false));
        $('#btn-open-simulator').addEventListener('click', () => showRoute('simulator'));
        $('#quiz-close').addEventListener('click', closeQuiz);
        $('#lesson-filter').addEventListener('change', (e) => renderLessons(e.target.value, $('#lesson-search').value));
        $('#lesson-search').addEventListener('input', (e) => renderLessons($('#lesson-filter').value, e.target.value));
        setupSimulator();
        
        $('#lb-add').addEventListener('click', () => {
            const name = $('#lb-name').value.trim();
            const coins = parseInt($('#lb-coins').value) || 0;
            if (name && coins >= 0) {
                state.leaderboard.push({ name, coins, portfolio: 0 });
                $('#lb-name').value = '';
                $('#lb-coins').value = '';
                saveState();
                renderLeaderboard();
            }
        });

        $('#btn-save-profile').addEventListener('click', () => {
            const newName = $('#profile-name').value.trim();
            if (newName && newName !== state.user.name) {
                state.user.name = newName;
                saveState();
                updateUI();
                alert('Profile saved!');
            }
        });

        $('#btn-reset').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                localStorage.removeItem('brainBankState');
                location.reload();
            }
        });
    };

    document.addEventListener('DOMContentLoaded', init);
})();
