import { Component, inject } from '@angular/core';
import { ChatSidebar } from '../components/chat-sidebar/chat-sidebar';
import { ChatWindow } from '../components/chat-window/chat-window';
import { ChatService } from '../services/chat';
import { ChatRightSidebar } from "../components/chat-right-sidebar/chat-right-sidebar";

@Component({
  selector: 'app-chat',
  imports: [ChatSidebar, ChatWindow, ChatRightSidebar],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {
  _chatService = inject(ChatService);
}
