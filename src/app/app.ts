import { Component } from '@angular/core';
import { RadialMenuComponent } from './radial-menu/radial-menu.component';
import { MenuItem } from './radial-menu/menu-item.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RadialMenuComponent],
  template: `
    <app-radial-menu (itemSelected)="onMenuSelect($event)"></app-radial-menu>
  `,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  `]
})
export class App {
  onMenuSelect(item: MenuItem) {
    console.log('Action triggered for menu item:', item);
  }
}
