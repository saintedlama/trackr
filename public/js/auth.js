document.addEventListener('alpine:init', () => {
  window.PineconeRouter.settings({ targetID: 'app' });

  Alpine.store('auth', { user: null });

  Alpine.data('authShell', () => ({
    authState: 'loading',
    loginUsername: '',
    loginPassword: '',
    loginError: '',
    setupUsername: '',
    setupPassword: '',
    setupError: '',

    authGuard(context, controller) {
      if (this.authState !== 'app') controller.abort();
    },

    notFound() {
      window.PineconeRouter.navigate('/');
    },

    async init() {
      const res = await fetch('/api/me');
      const me = await res.json();
      if (me.setupRequired) {
        this.authState = 'setup';
      } else if (me.authenticated) {
        Alpine.store('auth').user = me;
        this.authState = 'app';
        window.PineconeRouter.navigate(window.location.pathname);
      } else {
        this.authState = 'login';
      }
    },

    async login() {
      this.loginError = '';
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.loginUsername, password: this.loginPassword }),
      });
      const body = await res.json();
      if (!res.ok) { this.loginError = body.error || 'Login failed'; return; }
      Alpine.store('auth').user = body;
      this.loginUsername = '';
      this.loginPassword = '';
      this.authState = 'app';
      window.PineconeRouter.navigate(window.location.pathname);
    },

    async setup() {
      this.setupError = '';
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.setupUsername, password: this.setupPassword }),
      });
      const body = await res.json();
      if (!res.ok) { this.setupError = body.error || 'Setup failed'; return; }
      Alpine.store('auth').user = body;
      this.setupUsername = '';
      this.setupPassword = '';
      this.authState = 'app';
      window.PineconeRouter.navigate('/');
    },

    async logout() {
      await fetch('/api/logout', { method: 'POST' });
      Alpine.store('auth').user = null;
      this.authState = 'login';
    },
  }));
});
