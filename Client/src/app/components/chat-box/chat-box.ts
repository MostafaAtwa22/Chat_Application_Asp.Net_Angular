import { AfterViewChecked, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { ChatService } from '../../services/chat-service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth-service';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-chat-box',
  imports: [MatProgressSpinner, DatePipe, MatIcon],
  templateUrl: './chat-box.html',
  styleUrl: './chat-box.css'
})
export class ChatBox implements AfterViewChecked {
  @ViewChild('chatBox', { read: ElementRef }) public chatBox?: ElementRef;
  _chatService = inject(ChatService);
  _authService = inject(AuthService);

  isFakeLoading = true; // 👈 initially true
  private pageNumber = 2;

  constructor() {
    // Simulate fake loading for 2 seconds
    setTimeout(() => {
      this.isFakeLoading = false;
    }, 2000);
  }

  ngAfterViewChecked(): void {
    if (this._chatService.autScrollEnable()) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this._chatService.autScrollEnable.set(true);
    this.chatBox!.nativeElement.scrollTo({
      top: this.chatBox!.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
  }

  scrollToTop() {
    this._chatService.autScrollEnable.set(false);
    this.chatBox!.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  loadMoreMessages() {
    this.pageNumber++;
    this._chatService.loadMoreMessages(this.pageNumber);
    this.scrollToTop();
  }
}
