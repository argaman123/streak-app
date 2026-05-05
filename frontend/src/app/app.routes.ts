import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.component').then(m => m.HistoryComponent)
  },
  {
    path: 'planner',
    loadComponent: () =>
      import('./pages/planner/planner.component').then(m => m.PlannerComponent)
  },
  { path: '**', redirectTo: '' }
];
