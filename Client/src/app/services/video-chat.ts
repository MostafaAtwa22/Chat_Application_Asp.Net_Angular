import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { AuthService } from './auth-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoChatService {
  private hubUrl = `${environment.baseUrl}/hubs/video`;
  public hubconnection!: HubConnection;

  public offerReceive = new BehaviorSubject<{ senderId: string, offer: RTCSessionDescriptionInit } | null>(null);
  public anwerReceive = new BehaviorSubject<{ senderId: string, answer: RTCSessionDescription } | null>(null);
  public iceCandidateReceive = new BehaviorSubject<{ senderId: string, candidate: RTCIceCandidate } | null>(null);
  public callEndReceive = new BehaviorSubject<boolean>(false);

  public incomingCall = false;
  public isCallActive = false;
  public remoteUserId = '';

  // Ringtone management
  private ringtone?: HTMLAudioElement;

  private _authService = inject(AuthService);

  startConnection() {
    // Prevent duplicate connections
    if (this.hubconnection?.state === HubConnectionState.Connected) {
      console.log('Video hub already connected');
      return;
    }

    // Clean up existing listeners if reconnecting
    if (this.hubconnection) {
      this.hubconnection.off('ReceiveOffer');
      this.hubconnection.off('ReceiveAnswer');
      this.hubconnection.off('ReceiveIceCandidate');
      this.hubconnection.off('CallEnd');
    }

    // Config the connection
    this.hubconnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => {
          const token = this._authService.getAccessToken;
          if (!token) {
            console.error('No access token available for video chat');
            return '';
          }
          return token;
        }
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.random() * 10000;
          } else {
            return null; // Stop retrying after 1 minute
          }
        }
      })
      .build();

    // Handle reconnection events
    this.hubconnection.onreconnecting(error => {
      console.log('Video hub reconnecting...', error);
    });

    this.hubconnection.onreconnected(connectionId => {
      console.log('Video hub reconnected:', connectionId);
    });

    this.hubconnection.onclose(error => {
      console.log('Video hub connection closed:', error);
      // Clean up call state on disconnect
      this.resetCallState();
      this.stopRingtone();
    });

    // Start the connection
    this.hubconnection.start()
      .then(() => console.log('Video hub connection started'))
      .catch(err => console.error(`Video hub connection failed: ${err}`));

    // Subscribe to hub events
    this.setupHubListeners();
  }

  private setupHubListeners() {
    // Receive offer from caller
    this.hubconnection.on('ReceiveOffer', (senderId: string, offer: string) => {
      try {
        const parsedOffer = JSON.parse(offer) as RTCSessionDescriptionInit;
        console.log('Offer received from:', senderId);

        // Play ringtone when offer is received
        this.playRingtone();

        this.offerReceive.next({
          senderId,
          offer: parsedOffer
        });
      } catch (error) {
        console.error('Error parsing offer:', error);
      }
    });

    // Receive answer from callee
    this.hubconnection.on('ReceiveAnswer', (senderId: string, answer: string) => {
      try {
        const parsedAnswer = JSON.parse(answer) as RTCSessionDescription;
        console.log('Answer received from:', senderId);
        this.anwerReceive.next({
          senderId,
          answer: parsedAnswer
        });
      } catch (error) {
        console.error('Error parsing answer:', error);
      }
    });

    // Receive ICE candidate
    this.hubconnection.on('ReceiveIceCandidate', (senderId: string, candidate: string) => {
      try {
        const parsedCandidate = JSON.parse(candidate) as RTCIceCandidate;
        console.log('ICE candidate received from:', senderId);
        this.iceCandidateReceive.next({
          senderId,
          candidate: parsedCandidate
        });
      } catch (error) {
        console.error('Error parsing ICE candidate:', error);
      }
    });

    // Handle call end
    this.hubconnection.on('CallEnd', () => {
      console.log('Call ended by remote user');
      this.callEndReceive.next(true);
      this.stopRingtone();
      this.resetCallState();
    });
  }

  SendOffer(receiverId: string, offer: RTCSessionDescriptionInit) {
    if (this.hubconnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot send offer: Hub not connected');
      return;
    }

    this.hubconnection.invoke('SendOffer', receiverId, JSON.stringify(offer))
      .then(() => console.log('Offer sent to:', receiverId))
      .catch(err => console.error('Error sending offer:', err));
  }

  SendAnswer(receiverId: string, answer: RTCSessionDescriptionInit) {
    if (this.hubconnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot send answer: Hub not connected');
      return;
    }

    // Stop ringtone when sending answer (call accepted)
    this.stopRingtone();

    this.hubconnection.invoke('SendAnswer', receiverId, JSON.stringify(answer))
      .then(() => console.log('Answer sent to:', receiverId))
      .catch(err => console.error('Error sending answer:', err));
  }

  SendIceCandidate(receiverId: string, candidate: RTCIceCandidate) {
    if (this.hubconnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot send ICE candidate: Hub not connected');
      return;
    }

    this.hubconnection.invoke('SendIceCandidate', receiverId, JSON.stringify(candidate))
      .then(() => console.log('ICE candidate sent to:', receiverId))
      .catch(err => console.error('Error sending ICE candidate:', err));
  }

  EndCall(receiverId: string) {
    if (this.hubconnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot end call: Hub not connected');
      return;
    }

    this.hubconnection.invoke('EndCall', receiverId)
      .then(() => {
        console.log('End call signal sent to:', receiverId);
        this.stopRingtone();
        this.resetCallState();
      })
      .catch(err => console.error('Error ending call:', err));
  }

  // Ringtone management methods
  playRingtone() {
    try {
      // Stop any existing ringtone first
      this.stopRingtone();

      this.ringtone = new Audio('assets/phone-ring.wav');
      this.ringtone.loop = true;
      this.ringtone.play().catch(err => {
        console.error('Error playing ringtone:', err);
      });
    } catch (error) {
      console.error('Error creating ringtone:', error);
    }
  }

  stopRingtone() {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
      this.ringtone = undefined;
    }
  }

  private resetCallState() {
    this.incomingCall = false;
    this.isCallActive = false;
    this.remoteUserId = '';
  }

  stopConnection() {
    if (this.hubconnection?.state === HubConnectionState.Connected) {
      this.stopRingtone();
      this.hubconnection.stop()
        .then(() => console.log('Video hub connection stopped'))
        .catch(err => console.error('Error stopping video hub:', err));
    }
  }
}
