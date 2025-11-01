import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  list = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, content: `Item ${i + 1}` }));
}
