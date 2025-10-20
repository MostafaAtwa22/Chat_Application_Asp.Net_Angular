import { Component, ElementRef, Inject, inject, OnInit, ViewChild } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { VideoChatService } from '../services/video-chat';
import { MatDialogRef } from '@angular/material/dialog';
import { every } from 'rxjs';

@Component({
  selector: 'app-video-chat',
  imports: [MatIcon],
  templateUrl: './video-chat.html',
  styleUrl: './video-chat.css'
})
export class VideoChat implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private _peerConnection!: RTCPeerConnection;
  public _signalRService = inject(VideoChatService);
  private _dialogRef: MatDialogRef<VideoChat> = Inject(MatDialogRef);
  ngOnInit(): void {

  }

  setupSignalListeners() {
    this._signalRService.hubconnection.on('EndCall', () => {

    })

    this._signalRService.anwerReceive.subscribe(async (data) => {
      if (data) {
        await this._peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    })

    this._signalRService.iceCandidateReceive.subscribe(async (data) => {
      if (data) {
        await this._peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    })
  }

  declineCall() {
    this._signalRService.incomingCall = false;
    this._signalRService.isCallActive = false;
    this._signalRService.EndCall(this._signalRService.remoteUserId);
    this._dialogRef.close();
  }

  async acceptCall() {
    this._signalRService.incomingCall = false;
    this._signalRService.isCallActive = true;

    let offer = await this._signalRService.offerReceive.getValue()?.offer;

    if (offer) {
      await this._peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      let answer = await this._peerConnection.createAnswer();
      await this._peerConnection.setLocalDescription(answer);
      this._signalRService.SendAnswer(this._signalRService.remoteUserId, answer);
    }
  }

  async startCall() {
    this._signalRService.isCallActive = true;
    let offer = await this._peerConnection.createOffer();

    await this._peerConnection.setLocalDescription(offer);
    this._signalRService.SendOffer(this._signalRService.remoteUserId, offer);
  }

  setupPeerConnection() {
    this._peerConnection = new RTCPeerConnection ({
      iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun.services.mozilla.com'}
      ]
    });
    this._peerConnection.onicecandidate = (event) => {
      if (event.candidate)
        this._signalRService.SendIceCandidate(this._signalRService.remoteUserId, event.candidate);
    }

    this._peerConnection.ontrack = (event) => {
      this.remoteVideo.nativeElement.srcObject = event.streams[0];
    }
  }

  async startLocalVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    this.localVideo.nativeElement.srcObject = stream;

    stream.getTracks()
      .forEach((track) => this._peerConnection.addTrack(track, stream));
  }

  async endCall() {
    if (this._peerConnection) {
      this._dialogRef.close();
      this._signalRService.isCallActive = false;
      this._signalRService.incomingCall = false;
      this._signalRService.remoteUserId = '';
      this._peerConnection.close();
      this._peerConnection = new RTCPeerConnection();
      this.localVideo.nativeElement.srcObject = null;
    }

    const stream = this.localVideo.nativeElement.srcObject as MediaStream;

    if (stream) {
      stream.getTracks()
        .forEach((track) => track.stop());
      this.localVideo.nativeElement.srcObject = null;
    }

    this._signalRService.EndCall(this._signalRService.remoteUserId)
  }
}
