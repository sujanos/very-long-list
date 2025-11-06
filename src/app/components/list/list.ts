import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ListItem, type ListItemData } from '../list-item/list-item';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule, ListItem],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List {
  @ViewChild('scrollViewport') scrollViewport!: CdkVirtualScrollViewport;
  
  list: ListItemData[] = Array.from({ length: 1_000_000 }, (_, i) => ({
    id: i + 1,
    content: this.generateRandomLengthText(),
  }));

  itemHeight = 100;

  jumpToItem(itemNumber: number): void {
    if (itemNumber >= 1 && itemNumber <= this.list.length) {
      const index = itemNumber - 1;
      this.scrollViewport.scrollToIndex(index, 'auto');
    }
  }

  generateRandomLengthText(): string {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    return loremIpsum.slice(0, Math.floor(Math.random() * loremIpsum.length));
  }
}
