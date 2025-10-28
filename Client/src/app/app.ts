import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VideoChatService } from './services/video-chat';
import { AuthService } from './services/auth-service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { VideoChat } from './video-chat/video-chat';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = 'Client';

  private _signalRService = inject(VideoChatService);
  private _authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private offerSubscription?: Subscription;
  private ringtone?: HTMLAudioElement;
  private currentDialogRef?: MatDialogRef<VideoChat>;

  ngOnInit(): void {
    if (!this._authService.getAccessToken) {
      console.log('No access token, skipping video chat connection');
      return;
    }

    this._signalRService.startConnection();
    this.startOfferService();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions and audio
    this.offerSubscription?.unsubscribe();
    this.stopRingtone();
  }

  startOfferService() {
    this.offerSubscription = this._signalRService.offerReceive.subscribe(async (data) => {
      if (data && data.senderId) {
        console.log('Incoming call from:', data.senderId);

        // Set remote user ID and incoming call flag
        this._signalRService.remoteUserId = data.senderId;
        this._signalRService.incomingCall = true;

        // Play ringtone
        this.playRingtone();

        // Open video chat dialog if not already open
        if (!this.currentDialogRef) {
          this.currentDialogRef = this.dialog.open(VideoChat, {
            width: '400px',
            height: '600px',
            disableClose: true,
            hasBackdrop: true,
            panelClass: 'video-chat-dialog'
          });

          // Pass ringtone to component so it can stop it
          if (this.ringtone && this.currentDialogRef.componentInstance) {
            this.currentDialogRef.componentInstance.setRingtone(this.ringtone);
          }

          // Handle dialog close
          this.currentDialogRef.afterClosed().subscribe(() => {
            this.stopRingtone();
            this.currentDialogRef = undefined;

            // Reset call state if not answered
            if (this._signalRService.incomingCall) {
              this._signalRService.incomingCall = false;
              this._signalRService.remoteUserId = '';
            }
          });
        }
      }
    });
  }

  private playRingtone() {
    try {
      this.ringtone = new Audio('assets/phone-ring.wav');
      this.ringtone.loop = true;
      this.ringtone.play().catch(err => {
        console.error('Error playing ringtone:', err);
      });
    } catch (error) {
      console.error('Error creating ringtone:', error);
    }
  }

  private stopRingtone() {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
      this.ringtone = undefined;
    }
  }
}
