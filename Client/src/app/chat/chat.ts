import { Component, inject } from '@angular/core';
import { ChatSidebar } from '../components/chat-sidebar/chat-sidebar';
import { ChatWindow } from '../components/chat-window/chat-window';
import { ChatService } from '../services/chat-service';
import { ChatRightSidebar } from "../components/chat-right-sidebar/chat-right-sidebar";

@Component({
  selector: 'app-chat',
  imports: [ChatSidebar, ChatWindow, ChatRightSidebar],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat {
  _chatService = inject(ChatService);

  closeSidebars() {
    const leftSidebar = document.querySelector('.chat-left-sidebar');
    const rightSidebar = document.querySelector('.chat-right-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (leftSidebar) leftSidebar.classList.remove('show');
    if (rightSidebar) rightSidebar.classList.remove('show');
    if (overlay) overlay.classList.remove('show');
  }
}
