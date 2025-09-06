import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';

export const routes: Routes = [
	{ path: '', component: LandingComponent },
	{ path: 'chat', loadComponent: () => import('./chat/chat.component').then(m => m.ChatComponent) },
	{ path: '**', redirectTo: '' }
];

