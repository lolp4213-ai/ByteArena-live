(function () {
  const csrf = () => decodeURIComponent((document.cookie.match('(?:^|; )csrf_token=([^;]*)') || ['', ''])[1]);
  const json = (url, options) => fetch(url, options).then(async response => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Помилка запиту');
    return data;
  });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[char]));
  function renderStats(data) {
    document.getElementById('stats').innerHTML = [
      ['Ігор', data.games], ['Користувачів', data.users],
      ['Замовлень', data.orders], ['Виручка', `${Number(data.revenue).toFixed(2)} грн`]
    ].map(item => `<div class="stat"><strong>${esc(item[1])}</strong><span>${item[0]}</span></div>`).join('');
  }
  function renderGames(games) {
    document.getElementById('game-list').innerHTML = `<table><thead><tr><th>Гра</th><th>Жанр</th><th>Ціна</th><th>Статус</th><th></th></tr></thead><tbody>${
      games.map(game => `<tr><td>${esc(game.title)}</td><td>${esc(game.genre)}</td><td>${game.is_free ? 'Безкоштовно' : `${game.price} грн`}</td><td>${game.sale_percent ? `-${game.sale_percent}%` : ''}${game.released_at ? ' · Нова' : ''}</td><td><button class="secondary edit-game" data-game="${esc(game.id)}">Редагувати</button> <button class="delete delete-game" data-game="${esc(game.id)}">Видалити</button></td></tr>`).join('')
    }</tbody></table>`;
    document.querySelectorAll('.edit-game').forEach(button => button.addEventListener('click', () => {
      const game = games.find(item => item.id === button.dataset.game);
      if (!game) return;
      document.getElementById('game-form').classList.remove('hidden');
      ['id','title','genre','platform','image','description'].forEach(field => {
        document.getElementById(`game-${field}`).value = game[field] || '';
      });
      document.getElementById('game-price').value = game.price;
      document.getElementById('game-sale').value = game.sale_percent || 0;
      document.getElementById('game-release').value = game.released_at || '';
      document.getElementById('game-rating').value = game.rating;
      document.getElementById('game-free').checked = Boolean(game.is_free);
      document.getElementById('game-form').dataset.editing = game.id;
    }));
    document.querySelectorAll('.delete-game').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Видалити цю гру?')) return;
      try { await json(`/api/admin/games/${encodeURIComponent(button.dataset.game)}`, {method:'DELETE', headers:{'X-CSRF-Token':csrf()}}); load(); }
      catch (error) { alert(error.message); }
    }));
  }
  function renderUsers(users) {
    document.getElementById('user-list').innerHTML = `<table><thead><tr><th>Логін</th><th>Ім'я</th><th>Аватар</th></tr></thead><tbody>${
      users.map(user => `<tr><td>${esc(user.username)}</td><td>${esc(user.display_name)}</td><td>${user.has_avatar ? 'Так' : 'Ні'}</td></tr>`).join('')
    }</tbody></table>`;
  }
  function renderOrders(orders) {
    document.getElementById('order-list').innerHTML = `<table><thead><tr><th>#</th><th>Користувач</th><th>Сума</th></tr></thead><tbody>${
      orders.map(order => `<tr><td>${order.id}</td><td>${esc(order.user)}</td><td>${order.total} грн</td><td><select class="order-status" data-order="${order.id}">${['new','paid','processing','completed','cancelled'].map(status => `<option ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}</select></td></tr>`).join('')
    }</tbody></table>`;
    document.querySelectorAll('.order-status').forEach(select => select.addEventListener('change', async () => {
      try {
        await json(`/api/admin/orders/${select.dataset.order}`, {
          method:'PATCH',
          headers:{'Content-Type':'application/json','X-CSRF-Token':csrf()},
          body:JSON.stringify({status:select.value})
        });
      } catch (error) { alert(error.message); }
    }));
  }
  async function load() {
    try {
      const [summary, games, users, orders] = await Promise.all([
        json('/api/admin/summary'), json('/api/admin/games'), json('/api/admin/users'), json('/api/admin/orders')
      ]);
      renderStats(summary); renderGames(games); renderUsers(users); renderOrders(orders);
    } catch (error) { document.body.innerHTML = `<main class="admin-layout"><h1>Помилка</h1><p>${esc(error.message)}</p></main>`; }
  }
  document.getElementById('new-game').addEventListener('click', () => document.getElementById('game-form').classList.remove('hidden'));
  document.getElementById('cancel-game').addEventListener('click', () => document.getElementById('game-form').classList.add('hidden'));
  document.getElementById('game-form').addEventListener('submit', async event => {
    event.preventDefault();
    const value = id => document.getElementById(id).value;
    const editing = event.target.dataset.editing;
    const payload = {
      id:value('game-id'), title:value('game-title'), genre:value('game-genre'), platform:value('game-platform'),
      image:value('game-image'), price:value('game-price') || 0, rating:value('game-rating') || 0,
      description:value('game-description'), is_free:document.getElementById('game-free').checked,
      sale_percent:value('game-sale') || 0, released_at:value('game-release')
    };
    try {
      await json(editing ? `/api/admin/games/${encodeURIComponent(editing)}` : '/api/admin/games', {
        method: editing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json','X-CSRF-Token':csrf()},
        body:JSON.stringify(payload)
      });
      delete event.target.dataset.editing;
      event.target.reset(); event.target.classList.add('hidden'); load();
    } catch (error) { document.getElementById('game-message').textContent = error.message; }
  });
  load();
})();
