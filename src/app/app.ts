import { Component, signal } from '@angular/core';
import { List } from './components/list/list';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [List],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
}
