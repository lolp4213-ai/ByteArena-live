document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;
  const lightbox = document.createElement('div');
  lightbox.className = 'gallery-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-label', 'Перегляд скріншота');
  lightbox.innerHTML = '<button type="button" aria-label="Закрити">×</button><img alt="">';
  document.body.appendChild(lightbox);
  const preview = lightbox.querySelector('img');
  const close = () => {
    lightbox.classList.remove('is-open');
    preview.removeAttribute('src');
  };
  gallery.querySelectorAll('img').forEach(image => {
    image.addEventListener('click', () => {
      preview.src = image.currentSrc || image.src;
      preview.alt = image.alt;
      lightbox.classList.add('is-open');
    });
  });
  lightbox.querySelector('button').addEventListener('click', close);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
  });
});
