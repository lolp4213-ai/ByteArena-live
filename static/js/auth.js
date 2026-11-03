(function(){
  function showUserInNav(username, avatarUrl, isAdmin){
    var modernLogin = document.querySelector('.site-nav .nav-button') ||
      document.querySelector('nav a[href="/login"]');
    var modernNav = document.querySelector('.site-nav') ||
      document.querySelector('nav');
    var navList = modernNav && modernNav.querySelector('ul');
    if(modernLogin && modernNav){
      modernLogin.textContent = '';
      modernLogin.classList.add('profile-button');
      modernLogin.href = '/profil';
      modernLogin.title = username;
      modernLogin.setAttribute('aria-label', 'Відкрити профіль ' + username);
      if (avatarUrl) {
        var avatarImage = modernLogin.querySelector('.profile-button-image');
        if (!avatarImage) {
          avatarImage = document.createElement('img');
          avatarImage.className = 'profile-button-image';
          avatarImage.alt = '';
          modernLogin.appendChild(avatarImage);
        }
        avatarImage.src = avatarUrl;
        modernLogin.classList.add('has-avatar');
      } else {
        var existingAvatar = modernLogin.querySelector('.profile-button-image');
        if (existingAvatar) existingAvatar.remove();
        modernLogin.classList.remove('has-avatar');
      }
      var logoutLink = modernNav.querySelector('.nav-logout');
      if(!logoutLink){
        logoutLink = document.createElement('a');
        logoutLink.className = 'nav-logout';
        logoutLink.href = '/logout';
        logoutLink.textContent = 'Вийти';
        if (navList) {
          var logoutItem = document.createElement('li');
          logoutItem.appendChild(logoutLink);
          navList.appendChild(logoutItem);
        } else {
          modernNav.appendChild(logoutLink);
        }
      }
      if (isAdmin && !modernNav.querySelector('.admin-link')) {
        var adminLink = document.createElement('a');
        adminLink.className = 'admin-link';
        adminLink.href = '/admin';
        adminLink.textContent = 'Адмін';
        if (navList) {
          var adminItem = document.createElement('li');
          adminItem.appendChild(adminLink);
          navList.appendChild(adminItem);
        } else {
          modernNav.appendChild(adminLink);
        }
      }
    }
    var navRegister = document.getElementById('nav-register');
    var navLogin = document.getElementById('nav-login');
    var userArea = document.getElementById('user-area');
    if(userArea){
      userArea.style.display = 'inline-block';
      var link = document.getElementById('user-link');
      if(link){ link.textContent = username; link.href = '/'; }
    }
    if(navRegister) navRegister.style.display = 'none';
    if(navLogin) navLogin.style.display = 'none';
    var addLink = document.getElementById('add-game-link');
    if(addLink) addLink.style.display = 'inline-block';
  }

  function clearUserInNav(){
    var navRegister = document.getElementById('nav-register');
    var navLogin = document.getElementById('nav-login');
    var userArea = document.getElementById('user-area');
    if(userArea) userArea.style.display = 'none';
    if(navRegister) navRegister.style.display = 'inline-block';
    if(navLogin) navLogin.style.display = 'inline-block';
    var addLink = document.getElementById('add-game-link');
    if(addLink) addLink.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function(){
    fetch('/api/profile').then(function(response) {
      if (!response.ok) throw new Error('not authenticated');
      return response.json();
    }).then(function(profile) {
      document.body.dataset.theme = profile.profile && profile.profile.theme || 'dark';
      showUserInNav(profile.username, profile.profile && profile.profile.avatar_url, profile.is_admin);
    }).catch(function() {
      document.body.dataset.theme = 'dark';
      clearUserInNav();
    });
  });
})();
