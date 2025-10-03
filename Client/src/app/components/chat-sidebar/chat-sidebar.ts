import { Component } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-chat-sidebar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './chat-sidebar.html',
  styleUrl: './chat-sidebar.css'
})
export class ChatSidebar {

}
