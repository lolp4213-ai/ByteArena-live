document.addEventListener('DOMContentLoaded', function(){
  const container = document.getElementById('games-list');
  if(!container) return;
  const search = document.getElementById('game-search');
  const genre = document.getElementById('game-genre');
  const sort = document.getElementById('game-sort');
  let wishlist = new Set();
  let compare = JSON.parse(localStorage.getItem('bytearena-compare') || '[]');

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
    const params = new URLSearchParams({
      q: search ? search.value : '',
      genre: genre ? genre.value : 'all',
      sort: sort ? sort.value : 'popular'
    });
    const response = await fetch('/api/games?' + params);
    if (!response.ok) throw new Error('Failed to load games');
    const games = await response.json();
    container.innerHTML = games.length ? '' : '<p>Ігор за цим запитом не знайдено.</p>';
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
        <img src="${g.image}" alt="${g.title}">
        <div class="game-card-content">
          <span class="game-badge">${g.is_free ? 'FREE' : g.price + ' грн'}</span>
          <h3>${g.title}</h3>
          <p>${g.description}</p>
          <small>${g.genre} · ${g.platform} · ★ ${g.rating}</small>
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
    renderCompare();
  }

  fetch('/api/games/genres').then(r => r.json()).then(genres => {
    if (genre) genres.forEach(item => genre.insertAdjacentHTML('beforeend', `<option value="${item}">${item}</option>`));
  }).then(loadGames).catch(error => {
    container.innerHTML = '<p>Не вдалося завантажити каталог.</p>';
    console.error(error);
  });
  [search, genre, sort].filter(Boolean).forEach(control => control.addEventListener('input', loadGames));
});
