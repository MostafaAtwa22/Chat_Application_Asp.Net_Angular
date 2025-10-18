import { inject, Inject, Injectable, signal } from '@angular/core';
import { User } from '../Models/user';
import { AuthService } from './auth-service';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Message } from '../Models/message';
import { single } from 'rxjs';

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
  autScrollEnable = signal<boolean>(true);

  private hubConnection!: HubConnection;

  async startConnection(token: string, senderId?: string) {
    // dublicat connection ex(laptop, mobile)
    if (this.hubConnection?.state == HubConnectionState.Connected)
      return;

    if (this.hubConnection) {
      this.hubConnection.off('ReceiveNewMessage');
      this.hubConnection.off('OnlineUsers');
      this.hubConnection.off('NotifyTypingToUser');
      this.hubConnection.off('ReceiveMessageList');
      this.hubConnection.off('Notify');
    }
    // config the connection
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(`${this.hubUrl}?senderId=${senderId || ''}`, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect()
    .build();

    // notify the users that a user login now
    this.hubConnection.on('Notify', (user: User) => {
      Notification.requestPermission().then((res) => {
        if (res = 'granted') {
          new Notification('Acttive Now 🟢', {
            body: `${user.fullName} is online now`,
            icon: user.imageProfile || 'https://randomuser.me/api/portraits/lego/5.jpg'
          })
        }
      })
    })

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

    // Notify if a user is typing
    const typingTimers = new Map<string, any>();
    this.hubConnection.on('NotifyTypingToUser', (senderUserName) => {
      // Set typing to true
      this.onlineUsers.update((users) =>
        users.map((user) => {
          if (user.userName === senderUserName) {
            user.isTyping = true;
          }
          return user;
        })
      );

      // Clear previous timeout if exists
      if (typingTimers.has(senderUserName)) {
        clearTimeout(typingTimers.get(senderUserName));
      }

      // Set a new timeout
      const timer = setTimeout(() => {
        this.onlineUsers.update((users) =>
          users.map((user) => {
            if (user.userName === senderUserName) {
              user.isTyping = false;
            }
            return user;
          })
        );
        typingTimers.delete(senderUserName);
      }, 2000);

      typingTimers.set(senderUserName, timer);
    });

    // subscribe to receive message list
    this.hubConnection.on('ReceiveMessageList', (messages: Message[]) => {
    this.isLoading.update(_ => true);
    this.chatMessages.update(existing => {
      // دمج الرسائل القديمة بالصفحة الجديدة
      // افتراض أن الرسائل القديمة في messages هي الأقدم
      return [...messages, ...existing];
    });
      this.isLoading.set(false);
    });

    this.hubConnection.on('ReceiveNewMessage', (message: Message) => {
      let audio = new Audio('assets/notifications.wav');
      const current = this.currentOpenChat();
      if (current && (message.senderId === current.id || message.receiverId === current.id)) {
        // belongs to currently open chat
        audio.play();
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
    this.isLoading.update(_ => true);
    this.hubConnection?.invoke("LoadMessages", this.currentOpenChat()?.id, pageNumber)
      .then(_ => console.log(`Load messages ${this.currentOpenChat()?.id}`))
      .catch(err => console.log(`LoadMessages Error ${err}`))
      .finally(() => {
        this.isLoading.update(() => false);
      });
  }

  notifyTyping() {
    this.hubConnection.invoke('NotifyTyping', this.currentOpenChat()?.userName)
    .then(x => console.log(`${x} is typing`))
    .catch(err => console.log(`Tying ${err}`))
  }

  loadMoreMessages(pageNumber: number) {
    this.LoadMessages(pageNumber);
  }
}
