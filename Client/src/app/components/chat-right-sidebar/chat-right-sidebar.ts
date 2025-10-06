import { Component, inject } from '@angular/core';
import { ChatService } from '../../services/chat';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-chat-right-sidebar',
  imports: [TitleCasePipe],
  templateUrl: './chat-right-sidebar.html',
  styleUrl: './chat-right-sidebar.css'
})
export class ChatRightSidebar {
  _chatService = inject(ChatService);
}
