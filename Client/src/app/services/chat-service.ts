import { inject, Inject, Injectable, signal } from '@angular/core';
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

  onlineUsers = signal<User[]>([]);
  chatMessages = signal<Message[]>([]);
  isLoading = signal<boolean>(true);
  currentOpenChat = signal<User | null>(null);
  _authService = inject(AuthService)

  private hubConnection!: HubConnection;

  async startConnection(token: string, senderId?: string) {
    // config the connection
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
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
    this.hubConnection.on('ReceiveMessageList', (messages: Message[]) => {
      // replace messages with the loaded page (since we cleared before loading)
      this.chatMessages.set(messages);
      this.isLoading.set(false);
    });


    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      const current = this.currentOpenChat();
      if (current && (message.senderId === current.id || message.receiverId === current.id)) {
        // belongs to currently open chat
        this.chatMessages.update((messages) => [...messages, message]);
        document.title = '(1) New message';
      } else {
        // belongs to another chat - فقط حدِّث قائمة غير المقروءة (الـ sidebar)
        // ممكن تبعثلنا حدث لتحديث الـ online users unreadCount
        // أو تطلُب تحديث الـ OnlineUsers من السيرفر لاحقًا
        console.log('New message for other chat', message);
      }
    });
  }

  disConnectConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected)
      this.hubConnection.stop()
      .then(() => console.log('Connection Ended'))
      .catch((err) => console.log(err));
  }

  sendMessage(message: string) {
    this.chatMessages.update((messages) => [
      ...messages,
      {
        content: message,
        senderId: this._authService.currentUser!.id,
        receiverId: this.currentOpenChat()?.id!,
        sendingTime: new Date().toString(),
        isRead: false,
        id: 0
      }
    ])

    this.hubConnection.invoke('SendMessage', {
      receiverId: this.currentOpenChat()?.id,
      content: message
    })
    .then((id) => {
      console.log(`Message send to ${id}`)
    })
    .catch(err => console.log(err));
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
    this.hubConnection?.invoke("LoadMessages", this.currentOpenChat()?.id, pageNumber)
      .then(_ => console.log(`Load messages ${this.currentOpenChat()?.id}`))
      .catch(err => console.log(`LoadMessages Error ${err}`))
      .finally(() => {
        this.isLoading.update(() => false);
      });
  }
}
