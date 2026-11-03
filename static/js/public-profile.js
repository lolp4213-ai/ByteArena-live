(function () {
  const username = decodeURIComponent(window.location.pathname.split('/').pop());
  const csrf = () => decodeURIComponent((document.cookie.match('(?:^|; )csrf_token=([^;]*)') || ['', ''])[1]);
  const profileBox = document.getElementById('public-profile');
  const feedBox = document.getElementById('public-feed');
  fetch(`/api/social/profile/${encodeURIComponent(username)}`)
    .then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Профіль не знайдено.');
      return data;
    })
    .then(profile => {
      profileBox.innerHTML = `
        <div>
          <p class="eyebrow">BYTEARENA PLAYER</p>
          <h1>${profile.display_name}</h1>
          <p class="muted">@${profile.username}</p>
          <div class="public-profile-meta">
            <span>${profile.followers} підписників</span>
            <span>${profile.following} підписок</span>
            <span>${profile.is_friend ? 'Ваш друг' : 'Гравець ByteArena'}</span>
          </div>
          ${profile.bio ? `<p class="public-profile-bio">${profile.bio}</p>` : ''}
        </div>
        <div class="public-profile-actions">
          <button id="follow-button" class="button-primary" type="button">${profile.is_following ? 'Відписатися' : 'Підписатися'}</button>
          <button id="friend-button" class="button-secondary" type="button">Додати в друзі</button>
        </div>`;
      document.getElementById('follow-button').addEventListener('click', async () => {
        const response = await fetch('/api/social/follow', {
          method: profile.is_following ? 'DELETE' : 'POST',
          headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf()},
          body: JSON.stringify({username: profile.username})
        });
        if (response.ok) window.location.reload();
      });
      document.getElementById('friend-button').addEventListener('click', async event => {
        const response = await fetch('/api/social/friends', {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'X-CSRF-Token': csrf()},
          body: JSON.stringify({username: profile.username})
        });
        if (response.ok) event.currentTarget.textContent = 'Запит надіслано';
      });
      return fetch(`/api/social/feed?user=${encodeURIComponent(profile.username)}`);
    })
    .then(response => response.json())
    .then(feed => {
      feedBox.innerHTML = feed.length ? feed.map(item => `
        <article class="order"><div><strong>${item.display_name} відгукнувся про ${item.title}</strong>
        <small>${'★'.repeat(item.rating)} · ${item.comment || 'Без коментаря'} · ${item.created_at}</small></div></article>
      `).join('') : '<p class="muted">Публічної активності ще немає.</p>';
    })
    .catch(error => {
      profileBox.innerHTML = `<p class="form-message error">${error.message}</p>`;
      feedBox.innerHTML = '';
    });
})();
