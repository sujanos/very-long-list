import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  @ViewChild('scrollViewport') scrollViewport!: CdkVirtualScrollViewport;
  
  list = Array.from({ length: 1_000_000 }, (_, i) => ({
    id: i + 1,
    content: `Item ${i + 1}`,
  }));

  itemHeight = 54;

  jumpToItem(itemNumber: number): void {
    if (itemNumber >= 1 && itemNumber <= this.list.length) {
      const index = itemNumber - 1;
      this.scrollViewport.scrollToIndex(index, 'smooth');
    }
  }
}
