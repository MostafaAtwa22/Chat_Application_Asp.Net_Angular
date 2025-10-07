import { Injectable, signal } from '@angular/core';
import { User } from '../Models/user';
import { AuthService } from './auth-service';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Message } from '../Models/message';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubUrl = `${environment.baseUrl}/hubs/chat`;
  constructor(private _authService: AuthService) {}
  onlineUsers = signal<User[]>([]);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);

  currentOpenChat = signal<User | null>(null);
  private hubConnection!: HubConnection;

  startConnection(token: string, senderId?: string) {
    // config the connection
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
      accessTokenFactory: () => token
    }).withAutomaticReconnect()
    .build();

    // start the connection
    this.hubConnection.start()
      .then(() => console.log('connection starts'))
      .catch((err) => console.log(`Faild connection: ${err}`));

    // subscribe the onlineusers
    this.hubConnection!.on('OnlineUsers', (users: User[]) => {
      console.log(users);
      this.onlineUsers.update(() =>
        users.filter(
          user => user.userName !== this._authService.currentUser!.userName
        )
      );
    });

    // appened to the body message
    this.hubConnection!.invoke('ReceiveMessageList', (message: Message) => {
      this.chatMessages.update(messages => [...messages, message]);
      this.isLoading.update(_ => false);
    });

  }

  disConnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected)
      this.hubConnection.stop()
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

  LoadMessages(pageNumber: number) {
    this.hubConnection?.invoke('LoadMessages', this.currentOpenChat()?.id, pageNumber)
    .then(_ => console.log('Load the messages !!'))
    .catch(err => console.log(err))
    .finally(() => {
      this.isLoading.update(_ => false)
    })
  }
}
