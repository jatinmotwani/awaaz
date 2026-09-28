import { $, $$, playOnce, readJson } from './common.js';

const data = readJson('learn-data');

// Cards: tap to hear the word in the grandparent's voice.
document.addEventListener('click', (e) => {
  const card = e.target.closest('.learn-card');
  if (!card) return;
  playOnce(card.dataset.src, {
    onStart: () => card.classList.add('is-playing'),
    onEnd: () => card.classList.remove('is-playing'),
  });
});

// Mode switch
for (const tab of $$('[data-mode]')) {
  tab.addEventListener('click', () => {
    for (const t of $$('[data-mode]')) t.setAttribute('aria-selected', String(t === tab));
    for (const panel of $$('[data-panel]')) panel.hidden = panel.dataset.panel !== tab.dataset.mode;
    if (tab.dataset.mode === 'quiz' && !quiz.word) nextQuestion();
  });
}

// Quiz: hear the word, pick what it means.
const quiz = { word: null, score: 0, answered: false };
const listen = $('[data-listen]');
const options = $('[data-options]');
const feedback = $('[data-feedback]');
const next = $('[data-next]');

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function say() {
  if (!quiz.word) return;
  playOnce(quiz.word.src, {
    onStart: () => listen.classList.add('is-playing'),
    onEnd: () => listen.classList.remove('is-playing'),
  });
}

function nextQuestion() {
  if (!data || data.words.length < 3) return;
  const pool = data.words.filter((w) => w.id !== quiz.word?.id);
  quiz.word = pool[Math.floor(Math.random() * pool.length)];
  quiz.answered = false;
  const others = shuffle(data.words.filter((w) => w.id !== quiz.word.id && w.en !== quiz.word.en)).slice(0, 2);

  options.replaceChildren(
    ...shuffle([quiz.word, ...others]).map((w) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.dataset.id = w.id;
      const emoji = document.createElement('span');
      emoji.textContent = w.emoji;
      const label = document.createElement('small');
      label.textContent = w.en;
      button.append(emoji, label);
      button.addEventListener('click', () => answer(button, w));
      return button;
    }),
  );
  feedback.textContent = '';
  next.hidden = true;
  say();
}

function answer(button, word) {
  if (quiz.answered) return;
  quiz.answered = true;
  const right = word.id === quiz.word.id;
  $(`[data-id="${quiz.word.id}"]`, options).classList.add('is-right');
  if (right) {
    quiz.score += 1;
    $('[data-score]').textContent = `${quiz.score} ⭐`;
    feedback.textContent = `Shabaash! That’s “${quiz.word.roman}” — ${quiz.word.deva}`;
  } else {
    button.classList.add('is-wrong');
    feedback.textContent = `Almost! ${data.name} said “${quiz.word.roman}” — ${quiz.word.en}.`;
  }
  next.hidden = false;
  next.focus();
}

listen?.addEventListener('click', say);
next?.addEventListener('click', nextQuestion);
