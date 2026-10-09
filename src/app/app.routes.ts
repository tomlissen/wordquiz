import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/library/library-page').then((m) => m.LibraryPage) },
  { path: 'quiz/:id', loadComponent: () => import('./features/quiz-editor/quiz-editor-page').then((m) => m.QuizEditorPage) },
  { path: 'quiz/:id/test', loadComponent: () => import('./features/test/test-page').then((m) => m.TestPage) },
  { path: '**', redirectTo: '' },
];
