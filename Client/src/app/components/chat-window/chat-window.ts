import { Component, inject } from '@angular/core';
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
}
