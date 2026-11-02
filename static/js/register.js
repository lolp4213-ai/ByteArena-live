(function(){
	function showMsg(text, color){
		var container = document.getElementById('msg');
		if(!container) return;
		container.innerHTML = '';
		var d = document.createElement('div');
		d.textContent = text;
		d.style.padding = '10px 14px';
		d.style.borderRadius = '6px';
		d.style.marginBottom = '12px';
		d.style.background = color || '#222';
		d.style.color = '#fff';
		container.appendChild(d);
	}

	var params = new URLSearchParams(window.location.search);
	var msg = params.get('msg');
	if(!msg) return;
	if(msg === 'created'){
		showMsg('Аккаунт створено! Тепер, потрібно ввійти в аккаунт...', '#2b8a2b');
		setTimeout(function(){ window.location = '/login'; }, 1400);
	} else if(msg === 'exists'){
		showMsg('Цей Нікнейм вже отримано. Використайте будь ласка інший', '#b02a2a');
	} else if(msg === 'missing'){
		showMsg('Будь ласка, перевірте свій нікнейм або пароль.', '#b02a2a');
	} else if(msg === 'invalid'){
		showMsg('Логін: 3–32 символи без пробілів. Пароль: від 8 символів.', '#b02a2a');
	} else if(msg === 'error'){ 
        showMsg('Виникла помилка, поверніться або спробуйте будь ласка пізніше.', '#b02a2a');
    } 
       
})();
