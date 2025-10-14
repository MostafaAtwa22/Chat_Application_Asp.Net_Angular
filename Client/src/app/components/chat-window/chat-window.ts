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
  message!: string;
  showEmojiPicker = false;

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    this.message += event.emoji.native;
    this.showEmojiPicker = false; // Close picker after selecting emoji
  }

  sendMessage() {
    if (!this.message)
      return;
    this._chatService.sendMessage(this.message);
    this.message = "";
    this.showEmojiPicker = false; // Close picker when sending message
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
