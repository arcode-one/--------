'use strict';

const content = window.siteContent;
const imageIcon = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="7" width="38" height="34" rx="2"/><circle cx="16" cy="18" r="4"/><path d="m7 35 12-11 8 7 7-9 8 13"/></svg>';
const arrowIcon = (direction) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction === 'left' ? 'm14 5-7 7 7 7' : 'm10 5 7 7-7 7'}"/></svg>`;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function createVisual(item, label = 'Фотография') {
  if (item.src) {
    const img = document.createElement('img');
    img.className = 'visual';
    img.src = item.src;
    img.alt = item.alt || item.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return img;
  }
  const placeholder = document.createElement('div');
  placeholder.className = 'visual placeholder';
  placeholder.dataset.variant = (item.demoIndex || 0) % 6;
  placeholder.innerHTML = `<div class="placeholder-art" aria-hidden="true"><i class="art-disc"></i><i class="art-panel"></i><i class="art-line"></i></div>${imageIcon}`;
  const text = document.createElement('span');
  text.textContent = label;
  placeholder.append(text);
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', item.alt || label);
  return placeholder;
}

function createContact(contact) {
  const validLink = /^(https?:|mailto:|tel:)/i.test(contact.href || '');
  const element = document.createElement(validLink ? 'a' : 'span');
  element.textContent = contact.text;
  if (validLink) element.href = contact.href;
  return element;
}

document.querySelector('#brand').textContent = content.name;
document.querySelector('#footer-brand').textContent = content.name;
document.querySelector('#page-title').textContent = content.title;
const hero = createVisual(content.hero, 'Главное фото');
if (hero.tagName === 'IMG') { hero.loading = 'eager'; hero.fetchPriority = 'high'; }
document.querySelector('#hero-image').append(hero);
for (const text of content.paragraphs) {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  document.querySelector('#intro-copy').append(paragraph);
}
for (const contact of content.contacts) {
  document.querySelector('#header-contacts').append(createContact(contact));
  document.querySelector('#footer-contacts').append(createContact(contact));
}
for (const social of content.socials) document.querySelector('#social-links').append(createContact(social));

const lightbox = document.querySelector('#lightbox');
let selectedButton = null;
function openImage(item, trigger) {
  selectedButton = trigger;
  document.querySelector('#lightbox-image').replaceChildren(createVisual(item, item.title));
  document.querySelector('#lightbox-caption').textContent = item.title;
  lightbox.showModal();
  document.body.style.overflow = 'hidden';
}
lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  if (event.target !== lightbox) return;
  const rect = lightbox.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) lightbox.close();
});
lightbox.addEventListener('close', () => {
  document.body.style.overflow = '';
  selectedButton?.focus({ preventScroll: true });
});

function button(className, label, action, icon = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.setAttribute('aria-label', label);
  if (icon) el.innerHTML = icon;
  else el.textContent = label;
  el.addEventListener('click', action);
  return el;
}

function motionMode(root, animate) {
  root.classList.toggle('is-instant', !animate || reducedMotion.matches);
}

function bindKeys(root, move) {
  root.addEventListener('keydown', (event) => {
    if (event.target.matches('input') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1, false);
  });
}

// Discrete swipe: vertical page scrolling remains native; no fake momentum.
function bindSwipe(surface, move) {
  let start = null;
  let suppressClickUntil = 0;
  surface.addEventListener('pointerdown', (event) => {
    suppressClickUntil = 0;
    if (event.isPrimary && event.button === 0) start = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  surface.addEventListener('pointercancel', () => { start = null; });
  surface.addEventListener('pointerup', (event) => {
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    suppressClickUntil = Date.now() + 300;
    move(dx < 0 ? 1 : -1, true);
  });
  surface.addEventListener('click', (event) => {
    if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
}

function buildFocus(section, root) {
  const items = section.items;
  let index = Math.min(2, items.length - 1);
  root.innerHTML = '<div class="focus-viewport" tabindex="0" role="region" aria-label="Лента позиций"><div class="focus-track"></div></div><div class="focus-footer"><span class="focus-count" aria-live="polite"></span><input class="focus-range" type="range" aria-label="Выбрать позицию"><div class="focus-controls"></div></div>';
  const track = root.querySelector('.focus-track');
  const viewport = root.querySelector('.focus-viewport');
  const range = root.querySelector('input');
  range.min = 0; range.max = items.length - 1; range.step = 1;
  const cards = items.map((item, i) => {
    const card = document.createElement('article');
    card.className = 'focus-card';
    const select = button('focus-image', `Выбрать: ${item.title}`, (event) => go(i, event.detail > 0));
    select.replaceChildren();
    select.append(createVisual(item, 'Фото позиции'));
    const title = document.createElement('h3'); title.textContent = item.title;
    const zoom = button('focus-zoom', 'Увеличить фото', () => openImage(item, zoom));
    zoom.setAttribute('aria-haspopup', 'dialog');
    card.append(select, title, zoom); track.append(card);
    return card;
  });
  const previous = button('focus-arrow previous', 'Предыдущая позиция', (e) => go(index - 1, e.detail > 0), arrowIcon('left'));
  const next = button('focus-arrow next', 'Следующая позиция', (e) => go(index + 1, e.detail > 0), arrowIcon('right'));
  root.querySelector('.focus-controls').append(previous, next);
  function go(target, animate = true) {
    index = Math.max(0, Math.min(items.length - 1, target));
    root.dataset.index = index;
    motionMode(root, animate);
    cards.forEach((card, i) => {
      card.classList.toggle('is-selected', i === index);
      card.querySelector('.focus-image').setAttribute('aria-pressed', i === index);
      card.querySelector('.focus-image').tabIndex = i === index ? 0 : -1;
      card.querySelector('.focus-zoom').tabIndex = i === index ? 0 : -1;
      card.querySelector('.focus-zoom').setAttribute('aria-hidden', i !== index);
    });
    range.value = index;
    range.setAttribute('aria-valuetext', items[index].title);
    root.querySelector('.focus-count').textContent = `${index + 1} / ${items.length}`;
    previous.disabled = index === 0; next.disabled = index === items.length - 1;
    const shift = (viewport.clientWidth - cards[index].offsetWidth) / 2 - cards[index].offsetLeft;
    track.style.transform = `translateX(${shift}px)`;
  }
  range.addEventListener('input', () => go(Number(range.value), false));
  bindSwipe(viewport, (direction, animate) => go(index + direction, animate));
  bindKeys(root, (direction, animate) => go(index + direction, animate));
  new ResizeObserver(() => go(index, false)).observe(viewport);
  go(index, false);
}

function buildEditorial(section, root) {
  const items = section.items;
  let index = 0;
  let layer = 0;
  root.innerHTML = '<div class="editorial-stage"><button class="editorial-photo" type="button" aria-haspopup="dialog"><span class="photo-layer"></span><span class="photo-layer"></span><span class="photo-open">Смотреть крупнее</span></button></div><div class="editorial-sidebar"><div class="editorial-caption"><span class="editorial-count" aria-live="polite"></span><h3></h3></div><div class="editorial-thumbs" role="group" aria-label="Выбор фотографии"></div><div class="editorial-controls"></div></div>';
  const stage = root.querySelector('.editorial-stage');
  const photo = root.querySelector('.editorial-photo');
  const layers = [...root.querySelectorAll('.photo-layer')];
  const thumbs = items.map((item, i) => {
    const thumb = button('editorial-thumb', `Показать: ${item.title}`, (event) => go(i, event.detail > 0));
    thumb.replaceChildren();
    thumb.append(createVisual(item, `Фото ${i + 1}`));
    root.querySelector('.editorial-thumbs').append(thumb);
    return thumb;
  });
  const previous = button('editorial-nav previous', 'Назад', (e) => go(index - 1, e.detail > 0));
  const next = button('editorial-nav next', 'Далее', (e) => go(index + 1, e.detail > 0));
  root.querySelector('.editorial-controls').append(previous, next);
  function go(target, animate = true) {
    const nextIndex = Math.max(0, Math.min(items.length - 1, target));
    if (nextIndex === index && root.dataset.index !== undefined) return;
    index = nextIndex;
    root.dataset.index = index;
    motionMode(root, animate);
    layer = 1 - layer;
    layers[layer].replaceChildren(createVisual(items[index], `Фотография ${index + 1}`));
    layers.forEach((el, i) => {
      el.classList.toggle('is-visible', i === layer);
      el.setAttribute('aria-hidden', i !== layer);
    });
    photo.setAttribute('aria-label', `Увеличить: ${items[index].title}`);
    root.querySelector('h3').textContent = items[index].title;
    root.querySelector('.editorial-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-selected', i === index);
      thumb.setAttribute('aria-pressed', i === index);
    });
    previous.disabled = index === 0; next.disabled = index === items.length - 1;
    const activeThumb = thumbs[index];
    const strip = root.querySelector('.editorial-thumbs');
    if (strip.scrollWidth > strip.clientWidth) strip.scrollTo({ left: activeThumb.offsetLeft - strip.offsetLeft - (strip.clientWidth - activeThumb.offsetWidth) / 2, behavior: 'instant' });
    else strip.scrollTo({ top: activeThumb.offsetTop - strip.offsetTop - (strip.clientHeight - activeThumb.offsetHeight) / 2, behavior: 'instant' });
  }
  photo.addEventListener('click', () => openImage(items[index], photo));
  bindSwipe(stage, (direction, animate) => go(index + direction, animate));
  bindKeys(root, (direction, animate) => go(index + direction, animate));
  go(0, false);
}

function buildStack(section, root) {
  const items = section.items;
  let index = 0;
  root.innerHTML = '<div class="stack-caption"><span class="stack-count" aria-live="polite"></span><h3></h3><p>Каждое фото можно открыть крупнее.</p><div class="stack-controls"></div><span class="stack-hint">Или смахните фотографию</span></div><div class="stack-stage" role="group" aria-label="Стопка фотографий"></div>';
  const stage = root.querySelector('.stack-stage');
  const cards = items.map((item, i) => {
    const card = button('stack-photo', `Увеличить: ${item.title}`, () => openImage(item, card));
    card.replaceChildren();
    card.setAttribute('aria-haspopup', 'dialog');
    const frame = document.createElement('div'); frame.className = 'stack-photo-frame';
    frame.append(createVisual(item, `Фотография ${i + 1}`));
    const caption = document.createElement('span'); caption.className = 'stack-photo-label'; caption.textContent = item.title;
    card.append(frame, caption); stage.append(card);
    return card;
  });
  const previous = button('stack-prev previous', 'Предыдущее фото', (e) => go(index - 1, e.detail > 0), arrowIcon('left'));
  const next = button('stack-next next', 'Следующее фото', (e) => go(index + 1, e.detail > 0));
  previous.disabled = next.disabled = items.length < 2;
  root.querySelector('.stack-controls').append(previous, next);
  function go(target, animate = true) {
    index = (target + items.length) % items.length;
    root.dataset.index = index;
    motionMode(root, animate);
    cards.forEach((card, i) => {
      const distance = (i - index + items.length) % items.length;
      card.className = `stack-photo ${distance === 0 ? 'is-front' : distance === 1 ? 'is-second' : distance === 2 ? 'is-third' : 'is-hidden'}`;
      card.tabIndex = distance === 0 ? 0 : -1;
      card.setAttribute('aria-hidden', distance !== 0);
    });
    root.querySelector('h3').textContent = items[index].title;
    root.querySelector('.stack-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  }
  bindSwipe(stage, (direction, animate) => go(index + direction, animate));
  bindKeys(root, (direction, animate) => go(index + direction, animate));
  go(0, false);
}

for (const section of content.sections) {
  const element = document.createElement('section');
  element.className = `content-section ${section.kind}`;
  element.id = section.id;
  element.setAttribute('aria-labelledby', `${section.id}-title`);
  const container = document.createElement('div'); container.className = 'container';
  const heading = document.createElement('div'); heading.className = 'section-heading';
  const text = document.createElement('div');
  const title = document.createElement('h2'); title.id = `${section.id}-title`; title.textContent = section.title;
  const description = document.createElement('p'); description.className = 'section-description'; description.textContent = section.description;
  text.append(title, description); heading.append(text);
  const root = document.createElement('div'); root.className = `${section.kind}-slider`;
  container.append(heading, root); element.append(container);
  document.querySelector('#sections').append(element);
  if (!section.items.length) { root.textContent = 'Пока нет фотографий'; continue; }
  if (section.kind === 'focus') buildFocus(section, root);
  else if (section.kind === 'editorial') buildEditorial(section, root);
  else buildStack(section, root);
}


