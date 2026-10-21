(async () => {
  const status = document.getElementById('accountStatus');
  const login = document.getElementById('accountLogin');
  const moderation = document.getElementById('accountModeration');
  const logout = document.getElementById('accountLogout');
  if (!status || !login || !moderation || !logout) return;
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) {
      status.textContent = 'Visitante — entre para publicar e confirmar relatos';
      login.hidden = false;
      return;
    }
    if (!response.ok) throw new Error('Não foi possível verificar sua sessão.');
    const user = await response.json();
    status.textContent = 'Conectado: ' + user.email;
    moderation.hidden = user.role !== 'admin';
    logout.hidden = false;
  } catch {
    status.textContent = 'Sessão indisponível — tente novamente';
    login.hidden = false;
  }
})();
