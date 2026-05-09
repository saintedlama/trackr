document.addEventListener('alpine:init', () => {
  Alpine.data('home', () => ({
    trackers: [],
    newTrackerName: '',
    showNewTracker: false,
    flashedTrackerId: null,

    async init() {
      await this.loadTrackers();
    },

    async loadTrackers() {
      const date = new Date().toLocaleDateString('en-CA');
      const res = await fetch(`/api/trackers?date=${date}`);
      this.trackers = await res.json();
    },

    async createTracker() {
      const name = this.newTrackerName.trim();
      if (!name) return;
      const res = await fetch('/api/trackers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const tracker = await res.json();
      this.newTrackerName = '';
      this.showNewTracker = false;
      window.PineconeRouter.navigate(`/trackers/${tracker.id}`);
    },

    async quickTrack(trackerId) {
      await fetch(`/api/trackers/${trackerId}/events`, { method: 'POST' });
      this.flashedTrackerId = trackerId;
      await this.loadTrackers();
      setTimeout(() => { this.flashedTrackerId = null; }, 1200);
    },

    trackerRowClass(tracker) {
      if (tracker.countGoal && tracker.goal === 'increase' && tracker.todayCount >= tracker.countGoal)
        return 'bg-green-50 hover:bg-green-100';
      if (tracker.countGoal && tracker.goal === 'decrease' && tracker.todayCount > tracker.countGoal)
        return 'bg-red-50 hover:bg-red-100';
      return 'hover:bg-cream-dk';
    },
  }));
});
