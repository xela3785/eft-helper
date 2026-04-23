export type DashboardViewMode = 'expanded' | 'compact';

const DASHBOARD_VIEW_STORAGE_KEY = 'eft-helper-dashboard-view';

export function getStoredDashboardView(): DashboardViewMode {
  try {
    const value = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
    return value === 'compact' ? 'compact' : 'expanded';
  } catch {
    return 'expanded';
  }
}

export function setStoredDashboardView(view: DashboardViewMode) {
  try {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, view);
  } catch {
    // Ignore storage failures and keep default navigation behavior.
  }
}

export function getPreferredDashboardPath() {
  return getStoredDashboardView() === 'compact' ? '/dashboard-compact' : '/dashboard';
}
