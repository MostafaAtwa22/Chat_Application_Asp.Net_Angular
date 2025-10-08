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

  async startConnection(token: string, senderId?: string) {
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
    this.hubConnection.on('OnlineUsers', (users: User[]) => {
      console.log(users);
      this.onlineUsers.update(() =>
        users.filter(
          user => user.userName !== this._authService.currentUser!.userName
        )
      );
    });

    // subscribe to receive message list
    this.hubConnection.on('ReceiveMessageList', (message: Message) => {
      this.chatMessages.update(messages => [...messages, message]);
      this.isLoading.update(_ => false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      document.title = '(1) New message';

      this.chatMessages.update((messages) => [...messages, message]);
    });
  }

  disConnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected)
      this.hubConnection.stop()
      .then(() => console.log('Connection Ended'))
      .catch((err) => console.log(err));
  }

  async sendMessage(message: string) {
    if (this.hubConnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot send message: connection not established');
      return;
    }

    this.chatMessages.update((messages) => [
      ...messages,
      {
        content: message,
        senderId: this._authService.currentUser!.userId,
        receiverId: this.currentOpenChat()?.userId!,
        sendingTime: new Date().toString(),
        isReaded: false,
        id: 0
      }
    ])
    
    try {
      const id = await this.hubConnection.invoke('SendMessage', {
      receiverId: this.currentOpenChat()?.userId,
      content: message
      });
      console.log(`Send to : ${id}`);
    } catch (err) {
      console.log(err);
    }
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

  async LoadMessages(pageNumber: number) {
    if (this.hubConnection?.state !== HubConnectionState.Connected) {
      console.error('Cannot load messages: connection not established');
      this.isLoading.update(_ => false);
      return;
    }

    const currentChat = this.currentOpenChat();
    const receiverId = currentChat?.userId;
    
    console.log('LoadMessages called with:', {
      pageNumber,
      currentChat,
      receiverId,
      currentChatUser: currentChat?.userName
    });

    if (!receiverId) {
      console.error('Cannot load messages: no chat user selected or user ID is missing');
      this.isLoading.update(_ => false);
      return;
    }
    
    try {
      await this.hubConnection.invoke('LoadMessages', receiverId, pageNumber);
      console.log(`Successfully requested messages for user: ${currentChat?.userName} (ID: ${receiverId})`);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      this.isLoading.update(_ => false);
    }
  }
}
