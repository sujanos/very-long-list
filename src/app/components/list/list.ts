import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  list = Array.from({ length: 1_000_000 }, (_, i) => ({
    id: i + 1,
    content: `Item ${i + 1}`,
  }));

  itemHeight = 54;
}
