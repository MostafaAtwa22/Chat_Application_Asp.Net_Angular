import { Injectable, signal } from '@angular/core';
import { User } from '../Models/user';
import { AuthService } from './auth-service';
import { environment } from '../environments/environment';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class Chat {
  private hubUrl = `${environment.baseUrl}/hubs/chat`;
  constructor(private _authService: AuthService) {}
  onlineUsers = signal<User[]>([]);

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
}
