import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { VideoChatService } from '../services/video-chat';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-video-chat',
  imports: [MatIcon],
  templateUrl: './video-chat.html',
  styleUrl: './video-chat.css'
})
export class VideoChat implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private _peerConnection!: RTCPeerConnection;
  public _signalRService = inject(VideoChatService);
  private _dialogRef = inject(MatDialogRef<VideoChat>);
  private localStream?: MediaStream;
  private ringtone?: HTMLAudioElement;

  ngOnInit(): void {
    this.setupPeerConnection();
    this.startLocalVideo();
    this.setupSignalListeners();
  }

  ngOnDestroy(): void {
    // Clean up when component is destroyed
    this.cleanup();
  }

  setupSignalListeners() {
    // Handle call end from remote user
    this._signalRService.hubconnection.on('CallEnd', () => {
      this.cleanup();
      this._dialogRef?.close();
    });

    // Handle answer received
    this._signalRService.anwerReceive.subscribe(async (data) => {
      if (data && this._peerConnection) {
        try {
          await this._peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    // Handle ICE candidate received
    this._signalRService.iceCandidateReceive.subscribe(async (data) => {
      if (data && this._peerConnection) {
        try {
          await this._peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });
  }

  declineCall() {
    this.stopRingtone();
    this._signalRService.EndCall(this._signalRService.remoteUserId);
    this.cleanup();
    this._dialogRef?.close();
  }

  async acceptCall() {
    this.stopRingtone();
    this._signalRService.incomingCall = false;
    this._signalRService.isCallActive = true;

    const offerData = this._signalRService.offerReceive.getValue();

    if (offerData?.offer) {
      try {
        await this._peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));

        const answer = await this._peerConnection.createAnswer();
        await this._peerConnection.setLocalDescription(answer);

        this._signalRService.SendAnswer(this._signalRService.remoteUserId, answer);
      } catch (error) {
        console.error('Error accepting call:', error);
      }
    }
  }

  async startCall() {
    this._signalRService.isCallActive = true;

    try {
      const offer = await this._peerConnection.createOffer();
      await this._peerConnection.setLocalDescription(offer);

      this._signalRService.SendOffer(this._signalRService.remoteUserId, offer);
    } catch (error) {
      console.error('Error starting call:', error);
    }
  }

  setupPeerConnection() {
    this._peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
      ]
    });

    // Handle ICE candidates
    this._peerConnection.onicecandidate = (event) => {
      if (event.candidate && this._signalRService.remoteUserId) {
        this._signalRService.SendIceCandidate(this._signalRService.remoteUserId, event.candidate);
      }
    };

    // Handle remote track
    this._peerConnection.ontrack = (event) => {
      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    this._peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this._peerConnection.connectionState);

      if (this._peerConnection.connectionState === 'disconnected' ||
          this._peerConnection.connectionState === 'failed' ||
          this._peerConnection.connectionState === 'closed') {
        this.handleConnectionFailure();
      }
    };

    // Handle ICE connection state
    this._peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this._peerConnection.iceConnectionState);

      if (this._peerConnection.iceConnectionState === 'failed') {
        // Try to restart ICE
        this._peerConnection.restartIce();
      }
    };

    // Add local stream tracks if available
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this._peerConnection.addTrack(track, this.localStream!);
      });
    }
  }

  async startLocalVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.localStream = stream;

      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
        this.localVideo.nativeElement.muted = true; // Prevent echo
      }

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        if (this._peerConnection) {
          this._peerConnection.addTrack(track, stream);
        }
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  }

  async endCall() {
    // Notify remote user
    if (this._signalRService.remoteUserId) {
      this._signalRService.EndCall(this._signalRService.remoteUserId);
    }

    this.cleanup();
    this._dialogRef?.close();
  }

  private cleanup() {
    // Stop all local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
    }

    // Clear video elements
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }

    // Close peer connection
    if (this._peerConnection) {
      this._peerConnection.ontrack = null;
      this._peerConnection.onicecandidate = null;
      this._peerConnection.onconnectionstatechange = null;
      this._peerConnection.oniceconnectionstatechange = null;
      this._peerConnection.close();
    }

    // Reset service state
    this._signalRService.isCallActive = false;
    this._signalRService.incomingCall = false;
    this._signalRService.remoteUserId = '';
  }

  private handleConnectionFailure() {
    console.error('Connection failed or disconnected');
    // Optionally show error to user or attempt reconnection
    this.cleanup();
    this._dialogRef?.close();
  }

  private stopRingtone() {
    if (this.ringtone) {
      this.ringtone.pause();
      this.ringtone.currentTime = 0;
      this.ringtone = undefined;
    }
  }

  // Method to set ringtone from parent component
  setRingtone(audio: HTMLAudioElement) {
    this.ringtone = audio;
  }
}
