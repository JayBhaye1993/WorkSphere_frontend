import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector:   'app-root',
  standalone: true,
  imports:    [RouterOutlet],
  template:   '<router-outlet />',
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const isAuth = e.urlAfterRedirects.startsWith('/auth');
        document.body.classList.toggle('auth-route', isAuth);
      });
  }
}
