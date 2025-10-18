import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat-service';
import { TitleCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ChatBox } from "../chat-box/chat-box";
import { PickerModule, SkinComponent } from '@ctrl/ngx-emoji-mart';

@Component({
  selector: 'app-chat-window',
  imports: [TitleCasePipe, MatIconModule, FormsModule, ChatBox, PickerModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.css'
})
export class ChatWindow {
  @ViewChild('chatBox') chatContainer?: ElementRef;

  _chatService = inject(ChatService);
  message: string = '';
  showEmojiPicker = false;

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.message += event.emoji.native;
    this.showEmojiPicker = false;
  }
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const text = this.message.trim();
    if (!text) return;

    this._chatService.sendMessage(text);
    this.message = '';
    this.scrollToBottom();
    const textarea = document.querySelector('.chat-textarea') as HTMLTextAreaElement;
    if (textarea) textarea.style.height = 'auto';

    this.showEmojiPicker = false;
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  // Close emoji picker when clicking outside
  onOutsideClick() {
    this.showEmojiPicker = false;
  }

  private scrollToBottom() {
    if (this.chatContainer)
      this.chatContainer.nativeElement.scrollToTop = this.chatContainer.nativeElement.scrollHeight;
  }

  toggleLeftSidebar() {
    const sidebar = document.querySelector('.chat-left-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    }
  }

  toggleRightSidebar() {
    const sidebar = document.querySelector('.chat-right-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar && overlay) {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    }
  }
}
