document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('library-list');
  const search = document.getElementById('library-search');
  const summary = document.getElementById('library-summary');
  let status = '';
  let timer;
  const labels = {not_started: 'Не зіграна', playing: 'Граю', completed: 'Пройдена'};
  const csrf = () => decodeURIComponent((document.cookie.match('(?:^|; )csrf_token=([^;]*)') || ['', ''])[1]);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  async function loadLibrary() {
    const params = new URLSearchParams({status, q: search.value});
    const response = await fetch('/api/library?' + params);
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (!response.ok) throw new Error('Не вдалося завантажити бібліотеку.');
    const games = await response.json();
    summary.textContent = `${games.length} ${games.length === 1 ? 'гра' : games.length < 5 ? 'ігри' : 'ігор'}`;
    list.innerHTML = games.length ? '' : '<p class="empty-state">У цьому розділі поки немає ігор. Придбай гру в магазині.</p>';
    games.forEach(game => {
      const card = document.createElement('article');
      card.className = 'library-card';
      card.innerHTML = `
        <img src="${escapeHtml(game.image)}" alt="${escapeHtml(game.title)}" loading="lazy">
        <div class="library-card-content">
          <div class="library-card-title"><h2>${escapeHtml(game.title)}</h2><span>${labels[game.status]}</span></div>
          <p>${escapeHtml(game.genre)} · ${escapeHtml(game.platform)}</p>
          <label>Статус
            <select class="game-status">
              <option value="not_started">Не зіграна</option>
              <option value="playing">Граю</option>
              <option value="completed">Пройдена</option>
            </select>
          </label>
          <div class="library-fields">
            <label>Моя оцінка
              <select class="game-rating">
                <option value="">Не оцінено</option>
                <option value="1">★ 1</option><option value="2">★ 2</option><option value="3">★ 3</option>
                <option value="4">★ 4</option><option value="5">★ 5</option>
              </select>
            </label>
            <label>Час у грі (хв)
              <input class="game-time" type="number" min="0" max="1000000" value="${game.playtime_minutes}">
            </label>
          </div>
          <button class="save-library button-primary" type="button">Зберегти прогрес</button>
          <p class="save-message" role="status"></p>
        </div>`;
      card.querySelector('.game-status').value = game.status;
      card.querySelector('.game-rating').value = game.personal_rating || '';
      card.querySelector('.save-library').addEventListener('click', async event => {
        const button = event.currentTarget;
        const message = card.querySelector('.save-message');
        const response = await fetch('/api/library/' + encodeURIComponent(game.game), {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf()},
          body: JSON.stringify({
            status: card.querySelector('.game-status').value,
            personal_rating: card.querySelector('.game-rating').value,
            playtime_minutes: card.querySelector('.game-time').value
          })
        });
        message.textContent = response.ok ? 'Прогрес збережено.' : 'Не вдалося зберегти прогрес.';
        message.className = response.ok ? 'save-message success' : 'save-message error';
        if (response.ok) button.textContent = 'Збережено';
        setTimeout(() => { button.textContent = 'Зберегти прогрес'; }, 1500);
      });
      list.appendChild(card);
    });
  }

  document.querySelectorAll('.status-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.status-tab').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    status = tab.dataset.status;
    loadLibrary().catch(error => { list.innerHTML = `<p class="empty-state">${error.message}</p>`; });
  }));
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadLibrary().catch(console.error), 220);
  });
  loadLibrary().catch(error => { list.innerHTML = `<p class="empty-state">${error.message}</p>`; });
});
