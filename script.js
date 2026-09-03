let questions = [];
let currentQIndex = 0;
let timerInterval = null;
let timeLeft = 8;
let ropePosition = 50;
let questionTimeLimit = 8;
let readyTimeLimit = 3;
let readyAnimationClass = 'bounce';
let tickTimer = null;
let readyTimer = null;
let readyCount = 3;

let p1Answered = false;
let p2Answered = false;
let p1SelectedIdx = null;
let p2SelectedIdx = null;

const p1Stats = { correct: 0, wrong: 0 };
const p2Stats = { correct: 0, wrong: 0 };

let audioCtx = null;
let bgMusicInterval = null;
let bgMusicGain = null;

let bgmAudio = new Audio();
bgmAudio.loop = true;
let isPreviewingBgm = false;

const THEMES = [
  { id: 'under-the-sea', name: 'Under the Sea' },
  { id: 'festival', name: 'Festival' },
  { id: 'international-travel', name: 'International Travel' }
];
let currentThemeIndex = 0;

const KEY_SETS = {
  num_1234: { label: "1, 2, 3, 4 (Top Row)", badges: ["1", "2", "3", "4"], mapping: { "1": 0, "2": 1, "3": 2, "4": 3 }, isNumpad: false },
  num_5678: { label: "5, 6, 7, 8 (Top Row)", badges: ["5", "6", "7", "8"], mapping: { "5": 0, "6": 1, "7": 2, "8": 3 }, isNumpad: false },
  wasd: { label: "W, A, S, D", badges: ["W", "A", "S", "D"], mapping: { "w": 0, "a": 1, "s": 2, "d": 3 }, isNumpad: false },
  numpad_1234: { label: "Numpad 1, 2, 3, 4", badges: ["N1", "N2", "N3", "N4"], mapping: { "1": 0, "2": 1, "3": 2, "4": 3 }, isNumpad: true },
  numpad_5678: { label: "Numpad 5, 6, 7, 8", badges: ["N5", "N6", "N7", "N8"], mapping: { "5": 0, "6": 1, "7": 2, "8": 3 }, isNumpad: true }
};

let p1KeySetKey = "num_1234";
let p2KeySetKey = "numpad_1234";

const homeScreen = document.getElementById('home-screen');
const setupPlayerScreen = document.getElementById('setup-player-screen');
const setupQuestionsScreen = document.getElementById('setup-questions-screen');
const setupReadyScreen = document.getElementById('setup-ready-screen');
const readyScreen = document.getElementById('ready-screen');
const gameScreen = document.getElementById('game-screen');
const summaryScreen = document.getElementById('summary-screen');

function ensureAudioContext(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return null;
  if(!audioCtx) {
    audioCtx = new Ctx();
    bgMusicGain = audioCtx.createGain();
    bgMusicGain.gain.value = 0.03;
    bgMusicGain.connect(audioCtx.destination);
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playClickTone(){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 220;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playOptionTone(isCorrect = true){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = isCorrect ? 'triangle' : 'sawtooth';
  osc.frequency.value = isCorrect ? 480 : 220;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
  osc.start(now);
  osc.stop(now + 0.18);
}

function playTickTone(){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = timeLeft <= 3 ? 900 : 620;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.start(now);
  osc.stop(now + 0.09);
}

function playCelebrationTone(){
  const ctx = ensureAudioContext();
  if(!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime + index * 0.16;
    gain.gain.exponentialRampToValueAtTime(0.70, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc.start(now);
    osc.stop(now + 0.34);
  });
}

function startBackgroundMusic(){
  stopBackgroundMusic();
  const selectedTrack = document.getElementById('bgm-select')?.value || 'backgroundMusic/Monkeys-Spinning-Monkeys(chosic.com).mp3';
  const volume = parseFloat(document.getElementById('bgm-volume')?.value || 0.5);

  if (selectedTrack === 'none') return;

  if (selectedTrack === 'synth') {
    const ctx = ensureAudioContext();
    if(!ctx || bgMusicInterval) return;
    const notes = [220, 277, 330, 392, 330, 277, 294, 349];
    let step = 0;
    bgMusicGain.gain.value = volume * 0.06;
    bgMusicInterval = setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[step % notes.length];
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(bgMusicGain);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
      step++;
    }, 280);
  } else {
    bgmAudio.src = selectedTrack;
    bgmAudio.volume = volume;
    bgmAudio.play().catch(e => console.log('Audio autoplay prevented or file not found:', e));
  }
}

function stopBackgroundMusic(){
  if(bgMusicInterval){ clearInterval(bgMusicInterval); bgMusicInterval = null; }
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}

function stopTickingSound(){
  if(tickTimer){ clearInterval(tickTimer); tickTimer = null; }
}

function toggleBgmPreview() {
  const previewBtn = document.getElementById('preview-bgm-btn');
  if (isPreviewingBgm) {
    stopBackgroundMusic();
    isPreviewingBgm = false;
    if (previewBtn) previewBtn.textContent = '▶ Play Preview';
  } else {
    startBackgroundMusic();
    isPreviewingBgm = true;
    if (previewBtn) previewBtn.textContent = '⏹ Stop Preview';
  }
}

/* Dynamic Background Canvas Generator with Enhanced Theme Animations */
function startCanvasBackground() {
  const canvas = document.getElementById('bubbles-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Under the Sea: Floating Bubbles
  const bubbleCount = 45;
  const bubbles = Array.from({ length: bubbleCount }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 12 + 5,
    speed: Math.random() * 0.9 + 0.3,
    opacity: Math.random() * 0.2 + 0.05,
    drift: Math.random() * 0.5 - 0.25
  }));

  // Festival Theme: Multiple Banderitas lines + Falling Confetti
  const banderitaColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
  const festivalConfetti = Array.from({ length: 50 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 8 + 4,
    speedY: Math.random() * 1.5 + 0.5,
    speedX: Math.random() * 0.8 - 0.4,
    color: banderitaColors[Math.floor(Math.random() * banderitaColors.length)],
    angle: Math.random() * Math.PI,
    spin: Math.random() * 0.05 - 0.025
  }));

  // International Travel: Subtle Background Passports, Country Flags, Clouds & Planes
  const clouds = Array.from({ length: 6 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height * 0.5),
    radius: Math.random() * 35 + 20,
    speed: Math.random() * 0.3 + 0.1,
    opacity: Math.random() * 0.15 + 0.05
  }));

  const planes = Array.from({ length: 3 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height * 0.6),
    speed: Math.random() * 1.5 + 0.8,
    size: Math.random() * 10 + 20,
    wobbleSpeed: Math.random() * 0.02 + 0.01,
    wobbleDist: Math.random() * 20 + 10,
    baseY: 0
  }));
  planes.forEach(p => p.baseY = p.y);

  const backgroundFlags = ['🇵🇭', '🇺🇸', '🇯🇵', '🇬🇧', '🇰🇷', '🇫🇷', '🇩🇪', '🇨🇦', '🇦🇺', '🇮🇹'];
  const subtleIcons = Array.from({ length: 12 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    icon: Math.random() > 0.5 ? backgroundFlags[Math.floor(Math.random() * backgroundFlags.length)] : '📘',
    speedY: Math.random() * 0.2 + 0.05,
    opacity: Math.random() * 0.12 + 0.03,
    size: Math.random() * 20 + 25
  }));

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const currentTheme = document.body.getAttribute('data-theme');

    if (currentTheme === 'under-the-sea') {
      bubbles.forEach(b => {
        b.y -= b.speed;
        b.x += b.drift;
        if (b.y + b.radius < 0) {
          b.y = canvas.height + b.radius;
          b.x = Math.random() * canvas.width;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${b.opacity})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${b.opacity * 0.8})`;
        ctx.stroke();
      });
    } else if (currentTheme === 'festival') {
      // Multi-tier Banderitas
      [25, 60].forEach((baseY, tierIdx) => {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        const stringSegments = 22;
        const segWidth = canvas.width / stringSegments;
        for (let i = 0; i <= stringSegments; i++) {
          let cx = i * segWidth;
          let cy = baseY + Math.sin(i * 0.4 + tierIdx) * 12;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        for (let i = 0; i < stringSegments; i++) {
          let x1 = i * segWidth;
          let y1 = baseY + Math.sin(i * 0.4 + tierIdx) * 12;
          let x2 = (i + 1) * segWidth;
          let y2 = baseY + Math.sin((i + 1) * 0.4 + tierIdx) * 12;
          let midX = (x1 + x2) / 2;
          let midY = (y1 + y2) / 2 + 22;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(midX, midY);
          ctx.closePath();
          ctx.fillStyle = banderitaColors[(i + tierIdx) % banderitaColors.length];
          ctx.fill();
        }
      });

      // Falling Confetti Animation
      festivalConfetti.forEach(c => {
        c.y += c.speedY;
        c.x += c.speedX + Math.sin(c.y * 0.02) * 0.3;
        c.angle += c.spin;
        if (c.y > canvas.height + 10) {
          c.y = -10;
          c.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
      });
    } else if (currentTheme === 'international-travel') {
      // Subtle background passports and flags
      subtleIcons.forEach(s => {
        s.y -= s.speedY;
        if (s.y < -30) {
          s.y = canvas.height + 30;
          s.x = Math.random() * canvas.width;
        }
        ctx.font = `${s.size}px sans-serif`;
        ctx.globalAlpha = s.opacity;
        ctx.fillText(s.icon, s.x, s.y);
        ctx.globalAlpha = 1.0;
      });

      clouds.forEach(c => {
        c.x += c.speed;
        if (c.x - c.radius * 2 > canvas.width) {
          c.x = -c.radius * 2;
          c.y = Math.random() * (canvas.height * 0.5);
        }
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.arc(c.x + c.radius * 0.6, c.y - c.radius * 0.3, c.radius * 0.7, 0, Math.PI * 2);
        ctx.arc(c.x + c.radius * 1.2, c.y, c.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
        ctx.fill();
      });

      planes.forEach(p => {
        p.x += p.speed;
        p.y = p.baseY + Math.sin(p.x * p.wobbleSpeed) * p.wobbleDist;
        if (p.x > canvas.width + 50) {
          p.x = -50;
          p.baseY = Math.random() * (canvas.height * 0.6);
        }
        ctx.font = `${p.size}px sans-serif`;
        ctx.fillText('✈️', p.x, p.y);
      });
    }

    requestAnimationFrame(animate);
  }

  animate();
}

function updateKeySetDropdownOptions() {
  const p1Select = document.getElementById('p1-keyset-select');
  const p2Select = document.getElementById('p2-keyset-select');
  if (!p1Select || !p2Select) return;

  const p1Val = p1Select.value;
  const p2Val = p2Select.value;

  Array.from(p1Select.options).forEach(opt => { opt.disabled = (opt.value === p2Val); });
  Array.from(p2Select.options).forEach(opt => { opt.disabled = (opt.value === p1Val); });

  p1KeySetKey = p1Val;
  p2KeySetKey = p2Val;
}

function cycleTheme() {
  playClickTone();
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  const activeTheme = THEMES[currentThemeIndex];
  
  document.body.setAttribute('data-theme', activeTheme.id);
  const themeLabelSpan = document.getElementById('current-theme-label');
  if (themeLabelSpan) {
    themeLabelSpan.textContent = activeTheme.name;
  }
}

let selectedRating = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderCategories(1);
  startCanvasBackground();

  document.body.addEventListener('pointerdown', () => {
    ensureAudioContext();
  }, { once: true });

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', cycleTheme);
  }

  const p1KeySelect = document.getElementById('p1-keyset-select');
  const p2KeySelect = document.getElementById('p2-keyset-select');

  if (p1KeySelect) p1KeySelect.addEventListener('change', () => { playClickTone(); updateKeySetDropdownOptions(); });
  if (p2KeySelect) p2KeySelect.addEventListener('change', () => { playClickTone(); updateKeySetDropdownOptions(); });
  updateKeySetDropdownOptions();

  document.getElementById('nav-player-btn').addEventListener('click', () => { playClickTone(); switchScreen(setupPlayerScreen); });
  document.getElementById('nav-questions-btn').addEventListener('click', () => { playClickTone(); switchScreen(setupQuestionsScreen); });
  document.getElementById('nav-ready-btn').addEventListener('click', () => { playClickTone(); switchScreen(setupReadyScreen); });
  document.getElementById('home-start-btn').addEventListener('click', () => { playClickTone(); startGame(); });

  document.querySelectorAll('.back-home-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playClickTone();
      if (isPreviewingBgm) toggleBgmPreview();
      switchScreen(homeScreen);
    });
  });

  document.getElementById('apply-categories-btn').addEventListener('click', () => {
    playClickTone();
    const questionInputs = document.querySelectorAll('.cat-questions-container .q-input');
    const hasContent = Array.from(questionInputs).some(input => input.value.trim() !== '');

    if (hasContent) {
      if (!confirm('Warning: Updating categories will erase all existing questions on the panel!\n\nAre you sure you want to proceed?')) return;
    } else {
      if (!confirm('Warning & Notice: Once this button is pressed, pressing it again in the future will reset your questions.\n\nDo you want to proceed with updating categories?')) return;
    }

    const count = parseInt(document.getElementById('num-categories-input').value, 10) || 1;
    renderCategories(Math.min(5, Math.max(1, count)));
  });

  document.getElementById('preview-bgm-btn').addEventListener('click', () => { toggleBgmPreview(); });
  document.getElementById('bgm-select').addEventListener('change', () => { if (isPreviewingBgm) startBackgroundMusic(); });

  const volInput = document.getElementById('bgm-volume');
  const volDisplay = document.getElementById('volume-val-display');
  volInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    volDisplay.textContent = Math.round(val * 100) + '%';
    bgmAudio.volume = val;
    if (bgMusicGain && audioCtx) bgMusicGain.gain.value = val * 0.06;
  });

  document.getElementById('restart-btn').addEventListener('click', () => { playClickTone(); switchScreen(homeScreen); });

  document.querySelectorAll('.star-rating .star').forEach(star => {
    star.addEventListener('click', (e) => {
      selectedRating = parseInt(e.target.getAttribute('data-value'), 10);
      document.getElementById('rating-input').value = selectedRating;
      updateStarUI(selectedRating);
    });
  });

  const feedbackForm = document.getElementById('feedback-form');
  const feedbackStatus = document.getElementById('feedback-status');

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      playClickTone();

      if (selectedRating === 0) {
        alert('Please select a star rating before submitting.');
        return;
      }

      feedbackStatus.textContent = 'Sending feedback...';
      feedbackStatus.className = 'feedback-status-msg';

      const formData = new FormData(feedbackForm);

      try {
        const response = await fetch(feedbackForm.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } });
        if (response.ok) {
          feedbackStatus.textContent = 'Thank you for your feedback!';
          feedbackStatus.className = 'feedback-status-msg success';
          feedbackForm.reset();
          selectedRating = 0;
          document.getElementById('rating-input').value = 0;
          updateStarUI(0);
        } else {
          feedbackStatus.textContent = 'Oops! There was a problem submitting your feedback.';
          feedbackStatus.className = 'feedback-status-msg error';
        }
      } catch (err) {
        feedbackStatus.textContent = 'Oops! There was a problem submitting your feedback.';
        feedbackStatus.className = 'feedback-status-msg error';
      }
    });
  }

  document.addEventListener('keydown', handleKeyPress);
});

function updateStarUI(rating) {
  document.querySelectorAll('.star-rating .star').forEach(star => {
    const val = parseInt(star.getAttribute('data-value'), 10);
    if (val <= rating) star.classList.add('active');
    else star.classList.remove('active');
  });
}

function renderCategories(count){
  const container = document.getElementById('categories-wrapper');
  container.innerHTML = '';
  for(let i = 0; i < count; i++){
    const catBlock = document.createElement('div');
    catBlock.className = 'category-block card-surface';
    catBlock.innerHTML = `
      <div class="category-header">
        <label>Category Name:
          <input type="text" class="category-name-input" placeholder="Category ${i+1}" value="Category ${i+1}">
        </label>
        <button type="button" class="add-cat-q-btn">+ Add Question</button>
      </div>
      <div class="cat-questions-container"></div>
    `;
    const qContainer = catBlock.querySelector('.cat-questions-container');
    catBlock.querySelector('.add-cat-q-btn').addEventListener('click', () => {
      playClickTone();
      addQuestionCardToCategory(qContainer);
    });
    addQuestionCardToCategory(qContainer);
    container.appendChild(catBlock);
  }
}

function addQuestionCardToCategory(container, qText = '', opts = ['', '', '', ''], correctIdx = 0){
  const qDiv = document.createElement('div');
  qDiv.className = 'question-card';
  qDiv.innerHTML = `
    <input type="text" class="q-input" placeholder="Question Text" value="${qText}">
    <div class="inputs-grid">
      <input type="text" class="opt-input" placeholder="Option 1" value="${opts[0]}">
      <input type="text" class="opt-input" placeholder="Option 2" value="${opts[1]}">
      <input type="text" class="opt-input" placeholder="Option 3" value="${opts[2]}">
      <input type="text" class="opt-input" placeholder="Option 4" value="${opts[3]}">
    </div>
    <label>Correct Option:
      <select class="correct-select">
        <option value="0" ${correctIdx===0?'selected':''}>Option 1</option>
        <option value="1" ${correctIdx===1?'selected':''}>Option 2</option>
        <option value="2" ${correctIdx===2?'selected':''}>Option 3</option>
        <option value="3" ${correctIdx===3?'selected':''}>Option 4</option>
      </select>
    </label>
    <button type="button" class="delete-btn" onclick="this.parentElement.remove(); playClickTone();">Delete</button>
  `;
  container.appendChild(qDiv);
}

function startGame(){
  if (isPreviewingBgm) toggleBgmPreview();

  questions = [];
  document.querySelectorAll('.category-block').forEach(block => {
    const catName = block.querySelector('.category-name-input').value.trim() || 'General';
    block.querySelectorAll('.question-card').forEach(card => {
      const text = card.querySelector('.q-input').value.trim();
      const opts = Array.from(card.querySelectorAll('.opt-input')).map(i=>i.value.trim());
      const correct = parseInt(card.querySelector('.correct-select').value, 10);
      if(text && opts.every(o => o !== '')) {
        questions.push({ category: catName, text, opts, correct });
      }
    });
  });

  if(questions.length === 0){
    alert('Please add at least one complete question in your categories!');
    return;
  }

  questionTimeLimit = Math.min(30, Math.max(5, Number(document.getElementById('question-time-limit')?.value || 8)));
  readyTimeLimit = Math.min(10, Math.max(1, Number(document.getElementById('ready-timer-input')?.value || 3)));
  readyAnimationClass = document.getElementById('ready-anim-select')?.value || 'bounce';

  const p1Name = document.getElementById('p1-name-input')?.value.trim() || 'Player 1';
  const p2Name = document.getElementById('p2-name-input')?.value.trim() || 'Player 2';
  const p1Emoji = document.getElementById('p1-emoji-select')?.value || '💪';
  const p2Emoji = document.getElementById('p2-emoji-select')?.value || '💪';

  p1KeySetKey = document.getElementById('p1-keyset-select')?.value || 'num_1234';
  p2KeySetKey = document.getElementById('p2-keyset-select')?.value || 'numpad_1234';

  document.querySelectorAll('.p1-label').forEach(e => e.textContent = p1Name);
  document.querySelectorAll('.p2-label').forEach(e => e.textContent = p2Name);
  if(document.getElementById('p1-char')) document.getElementById('p1-char').textContent = p1Emoji;
  if(document.getElementById('p2-char')) document.getElementById('p2-char').textContent = p2Emoji;
  if(document.getElementById('summary-p1-emoji')) document.getElementById('summary-p1-emoji').textContent = p1Emoji;
  if(document.getElementById('summary-p2-emoji')) document.getElementById('summary-p2-emoji').textContent = p2Emoji;

  currentQIndex = 0;
  ropePosition = 50;
  p1Stats.correct = p1Stats.wrong = 0;
  p2Stats.correct = p2Stats.wrong = 0;

  stopTickingSound();
  startBackgroundMusic();
  showReadyScreen();
}

function showReadyScreen(){
  clearTimeout(readyTimer);
  readyCount = readyTimeLimit;
  const readyCountdown = document.getElementById('ready-countdown');
  const readyTitle = document.getElementById('ready-title');
  const readyCardBox = document.getElementById('ready-card-box');

  if(readyTitle) readyTitle.textContent = `Round ${currentQIndex + 1}`;
  if(readyCountdown) readyCountdown.textContent = String(readyCount);

  if(readyCardBox){
    readyCardBox.classList.remove('anim-bounce', 'anim-spin', 'anim-pulse');
    if(readyAnimationClass !== 'none') readyCardBox.classList.add(`anim-${readyAnimationClass}`);
  }

  switchScreen(readyScreen);

  const tickReady = () => {
    readyCount -= 1;
    if(readyCountdown) readyCountdown.textContent = String(Math.max(readyCount, 0));
    if(readyCount <= 0){
      clearTimeout(readyTimer);
      switchScreen(gameScreen);
      loadQuestion();
      return;
    }
    readyTimer = setTimeout(tickReady, 1000);
  };
  readyTimer = setTimeout(tickReady, 1000);
}

function loadQuestion(){
  if(currentQIndex >= questions.length || ropePosition <= 10 || ropePosition >= 90){
    endGame(); return;
  }
  p1Answered = p2Answered = false;
  p1SelectedIdx = p2SelectedIdx = null;
  timeLeft = questionTimeLimit;
  const q = questions[currentQIndex];

  document.getElementById('current-category-badge').textContent = q.category;
  document.getElementById('question-tracker').textContent = `Question ${currentQIndex+1} / ${questions.length}`;
  document.getElementById('current-question-text').textContent = q.text;
  document.getElementById('p1-feedback').textContent = '';
  document.getElementById('p2-feedback').textContent = '';

  const p1HintEl = document.querySelector('#p1-panel .key-hint');
  const p2HintEl = document.querySelector('#p2-panel .key-hint');
  if (p1HintEl) p1HintEl.textContent = `Keys: ${KEY_SETS[p1KeySetKey].label}`;
  if (p2HintEl) p2HintEl.textContent = `Keys: ${KEY_SETS[p2KeySetKey].label}`;

  renderOptions('p1-options', q.opts, KEY_SETS[p1KeySetKey].badges);
  renderOptions('p2-options', q.opts, KEY_SETS[p2KeySetKey].badges);
  updateRopeUI();
  updateTimerUI();

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerUI();

    if(timeLeft <= 9) {
      playTickTone();
      if(!tickTimer) tickTimer = setInterval(() => playTickTone(), 500);
    } else if(tickTimer) {
      stopTickingSound();
    }

    if(timeLeft <= 0){
      clearInterval(timerInterval);
      stopTickingSound();
      revealAnswersAndAdvance();
    }
  }, 1000);
}

function updateTimerUI(){
  const timerEl = document.getElementById('timer');
  if(!timerEl) return;
  timerEl.textContent = `Time Left: ${timeLeft}s`;
}

function renderOptions(containerId, options, badges){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  options.forEach((opt, idx) => {
    const btn = document.createElement('div');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-badge">${badges[idx] || (idx + 1)}</span><span class="opt-text">${opt}</span>`;
    btn.addEventListener('click', () => {
      if(!gameScreen.classList.contains('active')) return;
      selectOption(containerId === 'p1-options' ? 1 : 2, idx);
    });
    container.appendChild(btn);
  });
}

function handleKeyPress(e){
  if(!gameScreen.classList.contains('active')) return;
  const key = String(e.key).toLowerCase();
  const loc = e.location || 0;
  const isNumpad = (loc === 3);

  if(!p1Answered) {
    const set1 = KEY_SETS[p1KeySetKey];
    if(set1.isNumpad === isNumpad && key in set1.mapping) { selectOption(1, set1.mapping[key]); return; }
  }
  if(!p2Answered) {
    const set2 = KEY_SETS[p2KeySetKey];
    if(set2.isNumpad === isNumpad && key in set2.mapping) { selectOption(2, set2.mapping[key]); return; }
  }
}

function selectOption(player, selectedIdx){
  if(player === 1 && p1Answered) return;
  if(player === 2 && p2Answered) return;

  playClickTone();
  const containerId = player === 1 ? 'p1-options' : 'p2-options';
  const feedbackId = player === 1 ? 'p1-feedback' : 'p2-feedback';
  const buttons = document.getElementById(containerId).children;

  if(player === 1){ p1Answered = true; p1SelectedIdx = selectedIdx; }
  else { p2Answered = true; p2SelectedIdx = selectedIdx; }

  if(buttons[selectedIdx]) buttons[selectedIdx].classList.add('selected');
  document.getElementById(feedbackId).textContent = 'Answer Locked!';

  if(p1Answered && p2Answered){
    clearInterval(timerInterval);
    stopTickingSound();
    revealAnswersAndAdvance();
  }
}

function revealAnswersAndAdvance(){
  const correctIdx = questions[currentQIndex].correct;

  if(p1Answered && p1SelectedIdx !== null){
    const isP1Correct = p1SelectedIdx === correctIdx;
    const buttons = document.getElementById('p1-options').children;
    if(buttons[p1SelectedIdx]){
      buttons[p1SelectedIdx].classList.remove('selected');
      buttons[p1SelectedIdx].classList.add(isP1Correct ? 'correct' : 'wrong');
    }
    if(!isP1Correct && buttons[correctIdx]) buttons[correctIdx].classList.add('correct');
    document.getElementById('p1-feedback').textContent = isP1Correct ? 'Correct!' : 'Wrong!';
    if(isP1Correct){ p1Stats.correct++; ropePosition -= 8; }
    else { p1Stats.wrong++; ropePosition += 4; }
  }

  if(p2Answered && p2SelectedIdx !== null){
    const isP2Correct = p2SelectedIdx === correctIdx;
    const buttons = document.getElementById('p2-options').children;
    if(buttons[p2SelectedIdx]){
      buttons[p2SelectedIdx].classList.remove('selected');
      buttons[p2SelectedIdx].classList.add(isP2Correct ? 'correct' : 'wrong');
    }
    if(!isP2Correct && buttons[correctIdx]) buttons[correctIdx].classList.add('correct');
    document.getElementById('p2-feedback').textContent = isP2Correct ? 'Correct!' : 'Wrong!';
    if(isP2Correct){ p2Stats.correct++; ropePosition += 8; }
    else { p2Stats.wrong++; ropePosition -= 4; }
  }

  if(p1Answered || p2Answered){
    playOptionTone((p1Answered && p1SelectedIdx === correctIdx) || (p2Answered && p2SelectedIdx === correctIdx));
  }

  ropePosition = Math.max(5, Math.min(95, ropePosition));
  updateRopeUI();
  setTimeout(nextQuestion, 1200);
}

function updateRopeUI(){
  const marker = document.getElementById('rope-marker');
  if(marker) marker.style.left = `${ropePosition}%`;
  const leftChar = document.getElementById('p1-char'), rightChar = document.getElementById('p2-char');
  if(leftChar && rightChar){
    const offset = (ropePosition - 50) / 50;
    const px = Math.round(offset * 36);
    leftChar.style.transform = `translateX(${px}px)`;
    rightChar.style.transform = `translateX(${px * -1}px)`;
  }
}

function nextQuestion(){ currentQIndex++; loadQuestion(); }

function endGame(){
  clearInterval(timerInterval);
  stopTickingSound();
  stopBackgroundMusic();
  playCelebrationTone();
  switchScreen(summaryScreen);

  const p1Name = document.getElementById('p1-name-input')?.value.trim() || 'Player 1';
  const p2Name = document.getElementById('p2-name-input')?.value.trim() || 'Player 2';

  let winnerText = "It's a Tie!";
  if(ropePosition < 50) winnerText = `${p1Name} Wins!`;
  else if(ropePosition > 50) winnerText = `${p2Name} Wins!`;

  document.getElementById('winner-announcement').textContent = winnerText;
  document.getElementById('p1-stat-correct').textContent = p1Stats.correct;
  document.getElementById('p1-stat-wrong').textContent = p1Stats.wrong;
  document.getElementById('p2-stat-correct').textContent = p2Stats.correct;
  document.getElementById('p2-stat-wrong').textContent = p2Stats.wrong;
  showConfetti();
}

function switchScreen(screenToActive){
  [homeScreen, setupPlayerScreen, setupQuestionsScreen, setupReadyScreen, readyScreen, gameScreen, summaryScreen].forEach(s => s && s.classList.remove('active'));
  if(screenToActive) screenToActive.classList.add('active');
}

function showConfetti(){
  const confettiArea = document.createElement('div');
  confettiArea.className = 'confetti';
  const currentTheme = document.body.getAttribute('data-theme');
  let emojis = ['🎉','✨','🎊','💥','🌟','⚔️','👑'];
  
  if (currentTheme === 'festival') {
    emojis = ['🍕','🍔','🍟','🌭','🍿','🥞','🧇','🧀','🍗','🍖','🌮','🌯','🍜','🍝','🍛','🍣','🍩','🍪','🎂','🍦'];
  } else if (currentTheme === 'international-travel') {
    emojis = ['🇵🇭','🇺🇸','🇯🇵','🇬🇧','🇰🇷','🇫🇷','🇩🇪','🇨🇦','🇦🇺','🇮🇹','🇪🇸','🇧🇷','🇲🇽','🇮🇳','🇸🇬','🇹🇭','🇻🇳','🇨🇳','🇷🇺','🇿🇦'];
  }

  for(let i=0; i<24; i++){
    const s = document.createElement('span');
    s.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    s.style.left = Math.random()*100+'%';
    s.style.fontSize = (16+Math.random()*24)+'px';
    s.style.animationDelay = (Math.random()*0.6)+'s';
    confettiArea.appendChild(s);
  }
  document.body.appendChild(confettiArea);
  setTimeout(() => confettiArea.remove(), 2800);
}