import { Injectable, signal } from '@angular/core';
import { User } from '../Models/user';
import { AuthService } from './auth-service';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubUrl = `${environment.baseUrl}/hubs/chat`;
  constructor(private _authService: AuthService) {}
  onlineUsers = signal<User[]>([]);

  currentOpenChat = signal<User | null>(null);
  private hubConnectin!: HubConnection;

  startConnection(token: string, senderId?: string) {
    // config the connection
    this.hubConnectin = new HubConnectionBuilder()
    .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
      accessTokenFactory: () => token
    }).withAutomaticReconnect()
    .build();

    // start the connection
    this.hubConnectin.start()
      .then(() => console.log('connection starts'))
      .catch((err) => console.log(`Faild connection: ${err}`));

    // subscribe the onlineusers
    this.hubConnectin!.on('OnlineUsers', (users: User[]) => {
      console.log(users);
      this.onlineUsers.update(() =>
        users.filter(
          user => user.userName !== this._authService.currentUser!.userName
        )
      );
    });
  }

  disConnectConnection() {
    if (this.hubConnectin?.state === HubConnectionState.Connected)
      this.hubConnectin.stop()
      .then(() => console.log('Connection Ended'))
      .catch((err) => console.log(err));
  }

  status (userName: string) : string {
    const currentChatUser = this.currentOpenChat();
    if (!currentChatUser)
      return 'Offline';
    const onlineUser = this.onlineUsers().find (
      u => u.userName == userName
    )
    return onlineUser?.isTyping ? 'Typing..' : this.isUserOnline();
  }
  isUserOnline() {
    let onlineUser = this.onlineUsers().find(u => u.userName === this.currentOpenChat()?.userName);
    return onlineUser?.isOnline ? 'Online' : this.currentOpenChat()!.userName;
  }
}
