import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatRightSidebar } from './chat-right-sidebar';

describe('ChatRightSidebar', () => {
  let component: ChatRightSidebar;
  let fixture: ComponentFixture<ChatRightSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatRightSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatRightSidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
