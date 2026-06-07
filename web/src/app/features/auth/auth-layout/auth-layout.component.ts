import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WORKSPHERE_LOGO, ICON_SHIELD } from '../auth-icons';

@Component({
  selector: 'ws-auth-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  readonly logo   = WORKSPHERE_LOGO;
  readonly shield = ICON_SHIELD;
}
