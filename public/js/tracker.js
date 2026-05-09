document.addEventListener('alpine:init', () => {
  Alpine.data('trackerPage', () => ({
    currentTracker: null,
    events: [],
    flashed: false,
    tracking: false,
    renaming: false,
    renameValue: '',
    confirmDelete: false,
    expandedHours: {},
    totalEvents: 0,
    dailyAvg: '0',
    streak: 0,
    bestDay: 0,
    hourlyDist: [],
    hourlyMax: 1,
    dowDist: [],
    dowMax: 1,
    reasonDist: [],
    reasonMax: 1,
    lastTrackedEventId: null,
    reasonValue: '',
    historicReasons: [],
    editingReasonId: null,
    editingReasonValue: '',

    async init() {
      const id = window.PineconeRouter.context.params.id;
      const res = await fetch(`/api/trackers/${id}`);
      this.currentTracker = await res.json();
      await this.loadEvents();
      await this.loadHistoricReasons();
    },

    async loadEvents() {
      const res = await fetch(`/api/trackers/${this.currentTracker.id}/events`);
      this.events = this.groupEventsByLocalDay(await res.json());
      this.computeStats();
    },

    groupEventsByLocalDay(events) {
      const map = new Map();
      for (const { id, trackedAt, reason } of events) {
        const d = new Date(trackedAt);
        const day = d.toLocaleDateString('en-CA');
        if (!map.has(day)) map.set(day, []);
        const hh = d.getHours(), mm = d.getMinutes(), ss = d.getSeconds();
        map.get(day).push({
          id,
          time: `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,
          hour: hh,
          reason,
        });
      }
      return Array.from(map.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([day, times]) => ({ day, count: times.length, times }));
    },

    async loadHistoricReasons() {
      const res = await fetch(`/api/trackers/${this.currentTracker.id}/events/reasons`);
      this.historicReasons = await res.json();
    },

    async saveEventReason(eventId, reason) {
      const r = (reason ?? '').trim() || null;
      await fetch(`/api/trackers/${this.currentTracker.id}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: r }),
      });
      this.lastTrackedEventId = null;
      this.editingReasonId = null;
      await this.loadEvents();
      await this.loadHistoricReasons();
    },

    computeStats() {
      this.totalEvents = this.events.reduce((sum, g) => sum + g.count, 0);

      this.dailyAvg = this.events.length
        ? String(parseFloat((this.totalEvents / this.events.length).toFixed(1)))
        : '0';

      this.bestDay = this.events.length ? Math.min(...this.events.map(e => e.count)) : 0;

      this.streak = (() => {
        if (!this.events.length) return 0;
        const days = this.events.map(e => e.day);
        const today = new Date().toLocaleDateString('en-CA');
        const yd = new Date(); yd.setDate(yd.getDate() - 1);
        const yesterday = yd.toLocaleDateString('en-CA');
        if (days[0] !== today && days[0] !== yesterday) return 0;
        let count = 0;
        let expected = days[0];
        for (const day of days) {
          if (day !== expected) break;
          count++;
          const d = new Date(expected + 'T12:00:00');
          d.setDate(d.getDate() - 1);
          expected = d.toISOString().slice(0, 10);
        }
        return count;
      })();

      const reasonMap = {};
      const hourMap = {};
      for (const group of this.events) {
        for (const { hour, reason } of group.times) {
          hourMap[hour] = (hourMap[hour] || 0) + 1;
          if (reason) reasonMap[reason] = (reasonMap[reason] || 0) + 1;
        }
      }
      this.hourlyDist = Object.entries(hourMap)
        .map(([h, count]) => ({ hour: parseInt(h), count }))
        .sort((a, b) => a.hour - b.hour);
      this.hourlyMax = this.hourlyDist.length ? Math.max(...this.hourlyDist.map(h => h.count)) : 1;

      const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dowMap = {};
      for (const group of this.events) {
        const dow = new Date(group.day + 'T12:00:00').getDay();
        dowMap[dow] = (dowMap[dow] || 0) + group.count;
      }
      this.dowDist = Object.entries(dowMap)
        .map(([dow, count]) => ({ dow: parseInt(dow), label: dowNames[parseInt(dow)], count }))
        .sort((a, b) => a.dow - b.dow);
      this.dowMax = this.dowDist.length ? Math.max(...this.dowDist.map(d => d.count)) : 1;

      this.reasonDist = Object.entries(reasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count);
      this.reasonMax = this.reasonDist.length ? Math.max(...this.reasonDist.map(r => r.count)) : 1;
    },

    startRename() {
      this.confirmDelete = false;
      this.renameValue = this.currentTracker.name;
      this.renaming = true;
      this.$nextTick(() => this.$refs.renameInput.focus());
    },

    async saveRename() {
      const name = this.renameValue.trim();
      if (!name) return;
      await fetch(`/api/trackers/${this.currentTracker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      this.currentTracker = { ...this.currentTracker, name };
      this.renaming = false;
    },

    async deleteTracker() {
      await fetch(`/api/trackers/${this.currentTracker.id}`, { method: 'DELETE' });
      window.PineconeRouter.navigate('/');
    },

    async toggleGoal() {
      const goal = this.currentTracker.goal === 'decrease' ? 'increase' : 'decrease';
      await fetch(`/api/trackers/${this.currentTracker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      this.currentTracker = { ...this.currentTracker, goal };
      this.computeStats();
    },

    async toggleGoalPeriod() {
      const periods = ['daily', 'weekly', 'monthly', 'yearly'];
      const goalPeriod = periods[(periods.indexOf(this.currentTracker.goalPeriod) + 1) % periods.length];
      await fetch(`/api/trackers/${this.currentTracker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalPeriod }),
      });
      this.currentTracker = { ...this.currentTracker, goalPeriod };
    },

    async track() {
      this.tracking = true;
      try {
        const res = await fetch(`/api/trackers/${this.currentTracker.id}/events`, { method: 'POST' });
        const { id: eventId } = await res.json();
        await this.loadEvents();
        this.lastTrackedEventId = eventId;
        this.reasonValue = '';
        this.flashed = true;
        setTimeout(() => { this.flashed = false; }, 1200);
      } finally {
        this.tracking = false;
      }
    },

    async saveCountGoal(val) {
      const countGoal = val === '' ? null : parseInt(val);
      if (countGoal !== null && (isNaN(countGoal) || countGoal < 1)) return;
      await fetch(`/api/trackers/${this.currentTracker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countGoal }),
      });
      this.currentTracker = { ...this.currentTracker, countGoal };
    },

    async deleteEvent(eventId) {
      await fetch(`/api/trackers/${this.currentTracker.id}/events/${eventId}`, { method: 'DELETE' });
      await this.loadEvents();
    },

    formatHour(h) {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2000, 0, 1, h));
    },

    hourGroups(group) {
      if (group.times.length <= 3) return [];
      const older = group.times.slice(0, -3);
      const map = {};
      for (const t of older) {
        const h = String(t.hour).padStart(2, '0');
        (map[h] ??= []).push(t);
      }
      return Object.entries(map).map(([hour, times]) => ({ hour, times }));
    },

    detailTimes(group) {
      return group.times.length <= 3 ? group.times : group.times.slice(-3);
    },

    toggleHour(key) {
      this.expandedHours[key] = !this.expandedHours[key];
    },

    formatDay(day) {
      const today = new Date().toLocaleDateString('en-CA');
      const yd = new Date(); yd.setDate(yd.getDate() - 1);
      const yesterday = yd.toLocaleDateString('en-CA');
      if (day === today) return 'Today';
      if (day === yesterday) return 'Yesterday';
      return new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long', month: 'long', day: 'numeric',
      });
    },
  }));
});
