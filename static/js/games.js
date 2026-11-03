document.addEventListener('DOMContentLoaded', function(){
  const container = document.getElementById('games-list');
  if(!container) return;
  const search = document.getElementById('game-search');
  const genre = document.getElementById('game-genre');
  const platform = document.getElementById('game-platform');
  const maxPrice = document.getElementById('game-max-price');
  const minRating = document.getElementById('game-min-rating');
  const sort = document.getElementById('game-sort');
  const resetFilters = document.getElementById('reset-game-filters');
  const recommendations = document.getElementById('recommendations-list');
  const clearSearch = document.getElementById('clear-game-search');
  const summary = document.getElementById('games-summary');
  let wishlist = new Set();
  let compare = JSON.parse(localStorage.getItem('bytearena-compare') || '[]');
  let searchTimer;

  const initialParams = new URLSearchParams(window.location.search);
  if (search) search.value = initialParams.get('q') || '';
  if (genre) genre.dataset.initial = initialParams.get('genre') || 'all';
  if (platform) platform.dataset.initial = initialParams.get('platform') || 'all';
  if (maxPrice) maxPrice.dataset.initial = initialParams.get('max_price') || '';
  if (minRating) minRating.dataset.initial = initialParams.get('min_rating') || '';
  if (sort) sort.dataset.initial = initialParams.get('sort') || 'popular';

  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));

  if (recommendations) {
    fetch('/api/recommendations').then(response => response.json()).then(games => {
      recommendations.innerHTML = games.length ? games.map(game => `
        <a class="recommendation-card" href="/biblioteka?q=${encodeURIComponent(game.title)}">
          <img src="${escapeHtml(game.image)}" alt="">
          <strong>${escapeHtml(game.title)}</strong>
          <small>${escapeHtml(game.genre)} · ★ ${escapeHtml(game.rating)}</small>
        </a>`).join('') : '<p>Переглянь ігри, щоб отримати персональні рекомендації.</p>';
    }).catch(() => {
      recommendations.innerHTML = '<p>Рекомендації тимчасово недоступні.</p>';
    });
  }

  fetch('/api/wishlist').then(response => response.ok ? response.json() : []).then(items => {
    wishlist = new Set(items.map(item => item.id));
    loadGames();
  }).catch(() => {});

  function renderCompare() {
    let bar = document.getElementById('compare-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'compare-bar';
      bar.className = 'compare-bar';
      container.parentElement.prepend(bar);
    }
    bar.innerHTML = compare.length
      ? `<strong>Порівняння (${compare.length}/3)</strong> ${compare.map(id => `<span>${id}</span>`).join('')}<a href="/compare">Відкрити</a><button type="button" id="clear-compare">Очистити</button>`
      : '';
    document.getElementById('clear-compare')?.addEventListener('click', () => {
      compare = [];
      localStorage.setItem('bytearena-compare', '[]');
      renderCompare();
      loadGames();
    });
  }

  async function loadGames(){
    container.classList.add('is-loading');
    const params = new URLSearchParams({
      q: search ? search.value : '',
      genre: genre ? genre.value : 'all',
      platform: platform ? platform.value : 'all',
      max_price: maxPrice ? maxPrice.value : '',
      min_rating: minRating ? minRating.value : '',
      sort: sort ? sort.value : 'popular'
    });
    const response = await fetch('/api/games?' + params);
    if (!response.ok) throw new Error('Не вдалося завантажити каталог');
    const games = await response.json();
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
    container.innerHTML = games.length ? '' : '<p class="empty-state">Ігор за цим запитом не знайдено. Спробуйте іншу назву або жанр.</p>';
    if (summary) {
      summary.textContent = `${games.length} ${games.length === 1 ? 'гра' : games.length < 5 ? 'ігри' : 'ігор'} знайдено`;
    }
    if (clearSearch && search) clearSearch.hidden = !search.value;
    games.forEach(g => {
      const card = document.createElement('article');
      card.className = 'game-card';
      const routes = {
        uncharted: 'Uncharted',
        'ghost-of-tsushima': 'GostOfTsusima',
        'god-of-war': 'GodofWar',
        'spider-man': 'Spider-Man',
        'the-last-of-us': 'TheLastofUs',
        'horizon-zero-dawn': 'HorizonZeroDawn',
        'death-stranding': 'DeathStranding',
        'demons-souls': 'DemonSouls',
        'elden-ring': 'biblioteka',
        'cyberpunk-2077': 'biblioteka',
        'baldurs-gate-3': 'biblioteka',
        'hades': 'biblioteka'
      };
      card.innerHTML = `
        <img src="${escapeHtml(g.image)}" alt="${escapeHtml(g.title)}" loading="lazy">
        <div class="game-card-content">
          <span class="game-badge">${g.is_free ? 'FREE' : escapeHtml(g.price) + ' грн'}</span>
          <h3>${escapeHtml(g.title)}</h3>
          <p>${escapeHtml(g.description)}</p>
          <small>${escapeHtml(g.genre)} · ${escapeHtml(g.platform)} · ★ ${escapeHtml(g.rating)}</small>
          <div class="game-card-actions">
            <a href="/${routes[g.id] || 'biblioteka'}" class="button-secondary">Деталі</a>
            <button class="button-primary" data-game="${g.id}">До кошика</button>
            <button class="button-secondary wishlist-button" data-wishlist="${g.id}">${wishlist.has(g.id) ? 'У бажаному' : '♡ Бажане'}</button>
            <button class="button-secondary compare-button" data-compare="${g.id}">${compare.includes(g.id) ? 'Обрано' : 'Порівняти'}</button>
            <button class="button-secondary review-button" data-review="${g.id}">Відгук</button>
          </div>
        </div>`;
      card.querySelector('button').addEventListener('click', async () => {
        try {
          await addToBasket(g.id);
          card.querySelector('button').textContent = 'Додано';
        } catch (error) {
          console.error(error);
        }
      });
      card.querySelector('[data-wishlist]').addEventListener('click', async event => {
        const id = event.currentTarget.dataset.wishlist;
        const method = wishlist.has(id) ? 'DELETE' : 'POST';
        const response = await fetch('/api/wishlist', {
          method,
          headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
          body: JSON.stringify({game: id})
        });
        if (response.status === 401) return (window.location.href = '/login');
        if (response.ok) {
          wishlist[method === 'POST' ? 'add' : 'delete'](id);
          event.currentTarget.textContent = wishlist.has(id) ? 'У бажаному' : '♡ Бажане';
        }
      });
      card.querySelector('[data-compare]').addEventListener('click', event => {
        const id = event.currentTarget.dataset.compare;
        if (compare.includes(id)) compare = compare.filter(item => item !== id);
        else if (compare.length < 3) compare.push(id);
        localStorage.setItem('bytearena-compare', JSON.stringify(compare));
        renderCompare();
        loadGames();
      });
      card.querySelector('[data-review]').addEventListener('click', async event => {
        const rating = Number(window.prompt('Оцінка від 1 до 5:'));
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
        const comment = window.prompt('Ваш відгук (необов’язково):', '') || '';
        try {
          const response = await fetch(`/api/games/${encodeURIComponent(event.currentTarget.dataset.review)}/reviews`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
            body: JSON.stringify({rating, comment})
          });
          if (response.status === 401) window.location.href = '/login';
          else if (response.ok) window.alert('Дякуємо за відгук!');
          else window.alert('Не вдалося зберегти відгук.');
        } catch (error) {
          console.error(error);
          window.alert('Сервер недоступний. Спробуйте ще раз.');
        }
      });
      container.appendChild(card);
    });
    container.classList.remove('is-loading');
    renderCompare();
  }

  fetch('/api/games/genres').then(r => r.json()).then(genres => {
    if (genre) {
      genres.forEach(item => genre.insertAdjacentHTML('beforeend', `<option value="${item}">${item}</option>`));
      genre.value = genre.dataset.initial || 'all';
    }
    if (platform) platform.value = platform.dataset.initial || 'all';
    if (maxPrice) maxPrice.value = maxPrice.dataset.initial || '';
    if (minRating) minRating.value = minRating.dataset.initial || '';
    if (sort) sort.value = sort.dataset.initial || 'popular';
  }).then(loadGames).catch(error => {
    container.innerHTML = `<p class="empty-state">${error.message}. Оновіть сторінку та спробуйте ще раз.</p>`;
    if (summary) summary.textContent = '';
    console.error(error);
  });
  if (search) {
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadGames, 220);
    });
  }
  [genre, platform, maxPrice, minRating, sort].filter(Boolean).forEach(control => control.addEventListener('change', loadGames));
  clearSearch?.addEventListener('click', () => {
    search.value = '';
    search.focus();
    loadGames();
  });
  resetFilters?.addEventListener('click', () => {
    if (search) search.value = '';
    if (genre) genre.value = 'all';
    if (platform) platform.value = 'all';
    if (maxPrice) maxPrice.value = '';
    if (minRating) minRating.value = '';
    if (sort) sort.value = 'popular';
    loadGames();
  });
});
