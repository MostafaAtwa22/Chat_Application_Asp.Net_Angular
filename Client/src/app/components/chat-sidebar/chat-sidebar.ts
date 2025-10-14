import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth-service';
import { Router } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { User } from '../../Models/user';
import { ChatService } from '../../services/chat-service';

@Component({
  selector: 'app-chat-sidebar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule, TitleCasePipe],
  templateUrl: './chat-sidebar.html',
  styleUrl: './chat-sidebar.css'
})
export class ChatSidebar implements OnInit {
  onlineUsers = inject(ChatService).onlineUsers;

  public _authService = inject(AuthService);
  private _router = inject(Router);
  public _chatService = inject(ChatService);

  async ngOnInit() {
    const currentUserId = this._authService.currentUser?.id;
    const token = this._authService.getAccessToken!;
    await this._chatService.startConnection(token, currentUserId);
  }

  logout() {
    this._authService.logout();
    this._router.navigate(['/login']);
    this._chatService.disConnectConnection();
  }

  openChatWindow(user: User) {
    // set the current chat
    this._chatService.currentOpenChat.set(user);

    // clear previous messages before loading new chat
    this._chatService.chatMessages.set([]);

    // set loading state while messages load
    this._chatService.isLoading.set(true);

    // load first page of messages for the selected user
    this._chatService.LoadMessages(1);
  }
}
