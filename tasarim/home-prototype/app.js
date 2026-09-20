const categories = [...document.querySelectorAll('[data-category]')];
const sheet = document.getElementById('categorySheet');
const categoryText = document.getElementById('categoryText');
document.getElementById('categoryButton')?.addEventListener('click', () => { sheet.hidden = false; });
document.getElementById('sheetClose')?.addEventListener('click', () => { sheet.hidden = true; });
sheet?.addEventListener('click', (event) => { if (event.target === sheet) sheet.hidden = true; });
categories.forEach(button => button.addEventListener('click', () => {
  categories.forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  categoryText.textContent = button.dataset.category;
  sheet.hidden = true;
}));

const rankedButton = document.getElementById('rankedButton');
rankedButton?.addEventListener('click', () => {
  const next = rankedButton.getAttribute('aria-pressed') !== 'true';
  rankedButton.setAttribute('aria-pressed', String(next));
  rankedButton.querySelector('.switch').classList.toggle('on', next);
  document.getElementById('rankedText').textContent = next ? 'Dereceli' : 'Serbest';
});

const overlay = document.getElementById('matchOverlay');
document.getElementById('playButton')?.addEventListener('click', () => {
  overlay.hidden = false;
  setTimeout(() => { if (!overlay.hidden) window.location.href = './match.html'; }, 1200);
});
document.getElementById('cancelSearch')?.addEventListener('click', () => { overlay.hidden = true; });

const avatars = ['k05.svg','k12.svg','k18.svg','k24.svg','k31.svg'];
let avatarIndex = 0;
document.getElementById('avatarButton')?.addEventListener('click', () => {
  avatarIndex = (avatarIndex + 1) % avatars.length;
  const src = `./avatars/${avatars[avatarIndex]}`;
  const headerAvatar = document.getElementById('headerAvatar');
  const playerAvatar = document.getElementById('playerAvatar');
  if (headerAvatar) headerAvatar.src = src;
  if (playerAvatar) playerAvatar.src = src;
  if (!playerAvatar) window.location.href = './profile.html';
});

let remaining = 5322;
if (document.getElementById('seconds')) setInterval(() => {
  remaining = Math.max(0, remaining - 1);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  document.getElementById('hours').textContent = String(h).padStart(2, '0');
  document.getElementById('minutes').textContent = String(m).padStart(2, '0');
  document.getElementById('seconds').textContent = String(s).padStart(2, '0');
}, 1000);

document.querySelectorAll('[data-tab-group]').forEach(group => {
  group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    group.querySelectorAll('button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
  }));
});

const route = (selector, href) => document.querySelector(selector)?.addEventListener('click', () => { window.location.href = href; });
route('.mode-card.duel', './modes.html#duel');
route('.mode-card.pure', './modes.html#pure');
route('.mode-card.challenge', './friends.html');
route('.mode-card.practice', './practice.html');
route('.event-bottom button', './tournament.html');
route('.messages-button', './messages.html');
document.querySelector('button.coin-pill')?.addEventListener('click', () => { window.location.href = './coins.html'; });
document.querySelectorAll('[data-avatar-choice]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-avatar-choice]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  const preview = document.getElementById('profileAvatarPreview');
  if (preview) preview.src = button.querySelector('img').src;
}));

document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-answer]').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  const confirm = document.getElementById('confirmAnswer');
  if (confirm) confirm.disabled = false;
}));

document.getElementById('confirmAnswer')?.addEventListener('click', () => {
  document.getElementById('answerFeedback')?.removeAttribute('hidden');
  setTimeout(() => { window.location.href = './result.html'; }, 1400);
});

document.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => {
  const original = button.textContent;
  button.textContent = 'ALINDI ✓';
  button.classList.add('purchased');
  setTimeout(() => { button.textContent = original; button.classList.remove('purchased'); }, 1600);
}));

route('button.circle-btn', './notifications.html');
route('.modes .section-head button', './modes.html');
route('.league-card button', './league.html');
route('.settings-card a:last-child', './settings.html');
document.querySelectorAll('.friend-info').forEach(item => item.addEventListener('click', () => { window.location.href = './player.html'; }));
document.querySelectorAll('.friend-message').forEach(item => item.addEventListener('click', () => { window.location.href = './messages.html'; }));
document.querySelectorAll('.challenge-btn').forEach(item => item.addEventListener('click', () => { window.location.href = './invite.html'; }));

document.querySelector('[data-reward]')?.addEventListener('click', (event) => {
  event.currentTarget.textContent = 'ÖDÜL ALINDI · +25 ✓';
  event.currentTarget.classList.add('purchased');
});
