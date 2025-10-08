import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBox } from "../chat-box/chat-box";

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBox],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.css'
})
export class ChatWindow {
  _chatService = inject(ChatService);
  message!: string;
  sendMessage() {
    if (!this.message)
      return;
    this._chatService.sendMessage(this.message);
  }
}
