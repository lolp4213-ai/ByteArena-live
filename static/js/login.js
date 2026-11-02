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
	if(msg === 'logged'){
		showMsg('Вхід успішний! Вітаємо на ByteArena.', '#2b8a2b');
		setTimeout(function(){ window.location = '/bytearena'; }, 1200);
	} else if(msg === 'failed'){
		showMsg('Неправильний нікнейм чи пароль. Перевірте або спробуйте. будь ласка. пізніше', '#b02a2a');
	} else if(msg === 'created'){
		showMsg('Аккаунт створено! Тепер ввійдіть в нього', '#2b8a2b');
	} else if(msg === 'missing'){
		showMsg('Будь ласка, введіть логін чи пароль коректнно.', '#b02a2a');
	} else if(msg === 'logged_out'){
		showMsg('Ви вийшли з акаунта.', '#2b8a2b');
	} else if(msg === 'required'){
		showMsg('Увійдіть в акаунт, щоб відкрити профіль.', '#b02a2a');
	}
})();

function login(event){
	const form = event.target; 
	const username = form.username.value.trim();
	const password = form.password.value;
	if (!username || !password){
		alert('Будь ласка, введіть логін та пароль.');
		event.preventDefault(); 
	}
	var msgDiv = document.getElementById('msg');
	if(msgDiv) msgDiv.innerHTML = '';
}
