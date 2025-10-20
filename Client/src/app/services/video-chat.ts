import { inject, Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth-service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VideoChatService {
  private hubUrl = `${environment.baseUrl}/hubs/video`;
  public hubconnection!: HubConnection;
  public offerReceive = new BehaviorSubject<{ senderId: string, offer: RTCSessionDescriptionInit } | null>(null);
  public anwerReceive = new BehaviorSubject<{ senderId: string, answer: RTCSessionDescriptionInit } | null>(null);
  public iceCandidateReceive = new BehaviorSubject<{ senderId: string, candidate: RTCIceCandidateInit } | null>(null);
  public incomingCall = false;
  public isCallActive = false;
  public remoteUserId = '';
  public peerConnection!: RTCPeerConnection;

  private _authService = inject(AuthService);

  startConnection() {
    // config the connnection
    this.hubconnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this._authService.getAccessToken!
      })
      .withAutomaticReconnect()
      .build();

      // start the connection
      this.hubconnection.start()
        .then(_ => console.log("The video Hubs start"))
        .catch(err => console.log(`Video hubs ${err}`));

      // subscribe on the functions
      this.hubconnection.on('ReceiveOffer', (senderId, offer) => {
        this.offerReceive.next({
          senderId,
          offer: JSON.parse(offer)
        })
      });

      this.hubconnection.on('ReceiveAnswer', (senderId, answer) => {
        this.anwerReceive.next({
          senderId,
          answer: JSON.parse(answer)
        })
      });

      this.hubconnection.on('ReceiveIceCandidate', (senderId, candidate) => {
        this.iceCandidateReceive.next({
          senderId,
          candidate: JSON.parse(candidate)
        })
      });
  }

  SendOffer(receiverId: string, offer: RTCSessionDescriptionInit) {
    this.hubconnection.invoke('SendOffer', receiverId, JSON.stringify(offer));
  }

  SendAnswer(receiverId: string, answer: RTCSessionDescriptionInit) {
    this.hubconnection.invoke('SendAnswer', receiverId, JSON.stringify(answer));
  }

  SendIceCandidate(receiverId: string, candidate: RTCIceCandidateInit) {
    this.hubconnection.invoke('SendIceCandidate', receiverId, JSON.stringify(candidate));
  }

  EndCall(receiverId: string) {
    this.hubconnection.invoke('EndCall', receiverId);
  }
}
