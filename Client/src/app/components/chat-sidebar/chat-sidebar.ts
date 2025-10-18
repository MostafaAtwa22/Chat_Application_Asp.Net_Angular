import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TitleCasePipe, CommonModule, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth-service';
import { ChatService } from '../../services/chat-service';
import { User } from '../../Models/user';
import { TypingIndicator } from '../typing-indicator/typing-indicator';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TitleCasePipe,
    CommonModule,
    NgIf,
    NgClass,
    FormsModule,
    TypingIndicator
  ],
  templateUrl: './chat-sidebar.html',
  styleUrl: './chat-sidebar.css'
})

export class ChatSidebar implements OnInit {
  private _router = inject(Router);
  public _authService = inject(AuthService);
  public _chatService = inject(ChatService);

  onlineUsers = this._chatService.onlineUsers;
  filteredUsers = signal<User[]>([]);
  searchTerm = '';

  constructor() {
    // 👇 Effect runs automatically when onlineUsers changes
    effect(() => {
      const users = this.onlineUsers();
      const term = this.searchTerm.toLowerCase().trim();
      const filtered = users.filter(u =>
        u.fullName?.toLowerCase().includes(term)
      );
      this.filteredUsers.set(filtered);
    });
  }

  ngOnInit() {
    const currentUserId = this._authService.currentUser?.id;
    const token = this._authService.getAccessToken!;
    this._chatService.startConnection(token, currentUserId);
  }

  filterUsers() {
    const term = this.searchTerm.toLowerCase().trim();
    const filtered = this.onlineUsers().filter(u =>
      u.fullName?.toLowerCase().includes(term)
    );
    this.filteredUsers.set(filtered);
  }

  logout() {
    this._authService.logout();
    this._router.navigate(['/login']);
    this._chatService.disConnectConnection();
  }

  openChatWindow(user: User) {
    this._chatService.currentOpenChat.set(user);
    this._chatService.chatMessages.set([]);
    this._chatService.isLoading.set(true);
    this._chatService.LoadMessages(1);
    
    // Close sidebar on mobile after selecting a user
    this.closeSidebarOnMobile();
  }

  private closeSidebarOnMobile() {
    const sidebar = document.querySelector('.chat-left-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
  }
}
