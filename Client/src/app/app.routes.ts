import { Routes } from '@angular/router';
import { NotFound } from './not-found/not-found';
import { loginGuard } from './guards/login-guard';
import { Chat } from './chat/chat';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {path: '', redirectTo: 'chat', pathMatch: 'full'},
  {
    path: 'chat',
    component: Chat,
    canActivate: [authGuard]
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register').then((c) => c.Register),
    canActivate: [loginGuard]
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then((c) => c.Login),
    canActivate: [loginGuard]
  },
  {
    path: '**',
    component: NotFound
  }
];
