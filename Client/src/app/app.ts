import { Component, inject, Inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatService } from './services/video-chat';
import { AuthService } from './services/auth-service';
import { MatDialog } from '@angular/material/dialog';
import { VideoChat } from './video-chat/video-chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'client';
  // protected readonly title = signal('Client');
  private _signalRService = inject(VideoChatService);
  private _authService = inject(AuthService);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    if (!this._authService.getAccessToken)
      return;
    this._signalRService.startConnection();
    this.startOfferService();
  }

  startOfferService() {
    this._signalRService.offerReceive.subscribe(async (data) => {
      if (data) {
        this.dialog.open(VideoChat, {
          width: "400px",
          height: "600px",
          disableClose: false
        });

        this._signalRService.remoteUserId = data.senderId;
        this._signalRService.incomingCall = true;
      }
    })
  }
}
