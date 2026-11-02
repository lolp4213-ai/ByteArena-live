document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('compare-content');
  let ids;
  try {
    ids = JSON.parse(localStorage.getItem('bytearena-compare') || '[]');
  } catch (error) {
    console.error(error);
    ids = [];
  }
  if (!Array.isArray(ids) || !ids.length) {
    content.innerHTML = '<div class="empty-state"><h2>Поки що нічого порівнювати</h2><p>Додай ігри у порівняння з каталогу.</p></div>';
    return;
  }
  try {
    const response = await fetch('/api/games');
    if (!response.ok) throw new Error('Не вдалося завантажити ігри');
    const games = (await response.json()).filter(game => ids.includes(game.id));
    if (!games.length) {
      content.innerHTML = '<div class="empty-state"><h2>Ігри не знайдено</h2><p>Повернися до каталогу та обери інші ігри.</p></div>';
      return;
    }
    content.innerHTML = `
      <div class="compare-actions"><button id="clear-compare" type="button">Очистити порівняння</button></div>
      <div class="comparison-grid">${games.map(game => `
        <article class="comparison-card">
          <img src="${game.image}" alt="${game.title}">
          <h2>${game.title}</h2>
          <dl>
            <div><dt>Ціна</dt><dd>${game.is_free ? 'Безкоштовно' : `${game.price} грн`}</dd></div>
            <div><dt>Жанр</dt><dd>${game.genre}</dd></div>
            <div><dt>Платформа</dt><dd>${game.platform}</dd></div>
            <div><dt>Рейтинг</dt><dd>★ ${game.rating}</dd></div>
          </dl>
          <button class="remove-game" type="button" data-id="${game.id}">Прибрати</button>
        </article>`).join('')}</div>`;
    const remove = id => {
      ids = ids.filter(item => item !== id);
      localStorage.setItem('bytearena-compare', JSON.stringify(ids));
      window.location.reload();
    };
    document.getElementById('clear-compare').addEventListener('click', () => {
      localStorage.removeItem('bytearena-compare');
      window.location.reload();
    });
    document.querySelectorAll('.remove-game').forEach(button => {
      button.addEventListener('click', () => remove(button.dataset.id));
    });
  } catch (error) {
    console.error(error);
    content.innerHTML = '<p class="error-state">Не вдалося завантажити порівняння. Спробуйте ще раз.</p>';
  }
});
