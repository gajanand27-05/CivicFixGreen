// js/categories.js
// CivicFix Green: waste taxonomy and status helpers shared by all pages

const Green = {
  CATEGORIES: {
    illegal_dumping:     { label: 'Illegal Garbage Dump',         icon: 'trash-2',     department: 'swm' },
    overflowing_bin:     { label: 'Overflowing Bin / Black Spot', icon: 'trash',       department: 'swm' },
    waste_burning:       { label: 'Open Waste Burning',           icon: 'flame',       department: 'swm' },
    construction_debris: { label: 'Construction Debris',          icon: 'hard-hat',    department: 'engineering' },
    plastic_litter:      { label: 'Plastic Litter',               icon: 'recycle',     department: 'swm' },
    e_waste:             { label: 'Dumped E-Waste',               icon: 'cpu',         department: 'swm' },
    other:               { label: 'Other Waste Issue',            icon: 'help-circle', department: 'swm' }
  },

  DEPARTMENTS: {
    swm: 'Solid Waste Management',
    engineering: 'Engineering (C&D Waste)',
    health: 'Health & Sanitation'
  },

  STATUS_LABELS: { open: 'Open', in_progress: 'In Progress', rejected: 'Rejected', resolved: 'Closed' },
  REMINDER_DAYS: 5,

  label(cat) { return (this.CATEGORIES[cat] || this.CATEGORIES.other).label; },
  icon(cat) { return (this.CATEGORIES[cat] || this.CATEGORIES.other).icon; },
  departmentFor(cat) { return (this.CATEGORIES[cat] || this.CATEGORIES.other).department; },
  statusLabel(status) { return this.STATUS_LABELS[status] || status; },

  categoryOptionsHtml() {
    return Object.entries(this.CATEGORIES).map(([k, c]) => `<option value="${k}">${c.label}</option>`).join('');
  },
  departmentOptionsHtml() {
    return Object.entries(this.DEPARTMENTS).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  },

  daysOpen(issue) {
    const end = issue.resolved_at ? new Date(issue.resolved_at) : new Date();
    return Math.max(0, Math.floor((end - new Date(issue.created_at)) / 86400000));
  },
  isOverdue(issue) {
    return !!issue.complaint && !['resolved', 'rejected'].includes(issue.status) && this.daysOpen(issue) >= this.REMINDER_DAYS;
  }
};

window.Green = Green;
