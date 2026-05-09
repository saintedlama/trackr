document.addEventListener('alpine:init', () => {
  Alpine.data('admin', () => ({
    adminUsers: [],
    newUserUsername: '',
    newUserPassword: '',
    newUserError: '',
    resetPasswordUserId: null,
    resetPasswordValue: '',

    async init() {
      const res = await fetch('/api/admin/users');
      this.adminUsers = await res.json();
    },

    async addUser() {
      this.newUserError = '';
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.newUserUsername.trim(), password: this.newUserPassword }),
      });
      const body = await res.json();
      if (!res.ok) { this.newUserError = body.error || 'Failed to add user'; return; }
      this.newUserUsername = '';
      this.newUserPassword = '';
      this.adminUsers.push(body);
    },

    async removeUser(userId) {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      this.adminUsers = this.adminUsers.filter(u => u.id !== userId);
    },

    async toggleRole(user) {
      const role = user.role === 'admin' ? 'user' : 'admin';
      await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      user.role = role;
    },

    async resetPassword(userId) {
      if (!this.resetPasswordValue) return;
      await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: this.resetPasswordValue }),
      });
      this.resetPasswordUserId = null;
      this.resetPasswordValue = '';
    },
  }));
});
