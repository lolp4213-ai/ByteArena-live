function getCsrfToken(){
  const match = document.cookie.match('(?:^|; )csrf_token=([^;]*)');
  return match ? decodeURIComponent(match[1]) : '';
}

async function addToBasket(gameId){
  const response = await fetch('/api/basket/add', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
    body: JSON.stringify({game: gameId})
  });
  if (!response.ok) {
    if (response.status === 401) window.location.href = '/login';
    throw new Error('Unable to add game to basket');
  }
  await loadBasket();
}

async function removeFromBasket(basketId){
  const response = await fetch('/api/basket/remove', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
    body: JSON.stringify({basket_id: basketId})
  });
  if (!response.ok) throw new Error('Unable to remove basket item');
  await loadBasket();
}

async function updateBasketItem(basketId, count){
  const response = await fetch('/api/basket/update', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
    body: JSON.stringify({basket_id: basketId, count})
  });
  if (!response.ok) throw new Error('Unable to update basket item');
  await loadBasket();
}

async function loadBasket(){
  const basketDiv = document.getElementById('basket-list');
  if(!basketDiv) return;

  const response = await fetch('/api/basket');
  if (!response.ok) {
    basketDiv.innerHTML = '<p>Увійдіть, щоб переглянути кошик.</p>';
    return;
  }
  const basket = await response.json();
  if(basket.length === 0){
    basketDiv.innerHTML = '<p>Кошик порожній. <a href="/biblioteka">Перейти до каталогу →</a></p>';
    return;
  }

  basketDiv.innerHTML = '';
  const total = basket.reduce((sum, item) => sum + item.price * item.count, 0);
  const summary = document.createElement('aside');
  summary.className = 'basket-summary';
  summary.innerHTML = `
    <strong>Разом</strong>
    <b>${total} грн</b>
    <input class="coupon-input" placeholder="Промокод" maxlength="32">
    <button type="button" class="checkout-button">Оформити замовлення</button>
  `;
  summary.querySelector('button').onclick = async () => {
    const response = await fetch('/api/basket/checkout', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken()},
      body: JSON.stringify({coupon: summary.querySelector('.coupon-input').value})
    });
    if (response.ok) {
      await loadBasket();
      window.alert('Замовлення успішно оформлено!');
    } else {
      window.alert('Не вдалося оформити замовлення.');
    }
  };
  basketDiv.appendChild(summary);
  const items = document.createElement('div');
  items.className = 'basket-items';
  basketDiv.appendChild(items);
  basket.forEach(item => {
    const div = document.createElement('div');
    div.className = 'block';
      div.innerHTML = `
      <img src="${item.image}" alt="${item.title}">
      <strong>${item.title}</strong>
      <p>${item.price === 0 ? 'Безкоштовно' : item.price + ' грн'}</p>
      <div class="quantity">
        <button type="button" data-action="decrease" aria-label="Зменшити кількість">−</button>
        <span>${item.count}</span>
        <button type="button" data-action="increase" aria-label="Збільшити кількість">+</button>
      </div>
    `;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Видалити';
    removeBtn.onclick = () => removeFromBasket(item.id);
    div.appendChild(removeBtn);
    div.querySelector('[data-action="decrease"]').onclick = () =>
      updateBasketItem(item.id, item.count - 1).catch(console.error);
    div.querySelector('[data-action="increase"]').onclick = () =>
      updateBasketItem(item.id, item.count + 1).catch(console.error);
    items.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', function(){
  if(document.getElementById('basket-list')){
    loadBasket().catch(console.error);
  }
});
