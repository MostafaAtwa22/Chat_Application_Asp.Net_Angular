import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { User } from '../../Models/user';
import { Chat } from '../../services/chat';

@Component({
  selector: 'app-chat-sidebar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TitleCasePipe],
  templateUrl: './chat-sidebar.html',
  styleUrl: './chat-sidebar.css'
})
export class ChatSidebar implements OnInit {
  currentUser!: User | null;

  onlineUsers = inject(Chat).onlineUsers;

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _chatService = inject(Chat);

  ngOnInit(): void {
    this._chatService.startConnection(this._authService.getAccessToken!);
    this.currentUser = this._authService.currentUser;
  }

  logout() {
    this._authService.logout();
    this._router.navigate(['/login']);
  }
}
