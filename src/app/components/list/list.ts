import {
  Component,
  ViewChild,
  OnDestroy,
  ElementRef,
  ViewChildren,
  QueryList,
  effect,
  viewChild,
  viewChildren,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { Subject } from 'rxjs';
import { ListItem, type ListItemData } from '../list-item/list-item';

interface Chunk {
  startIndex: number;
  endIndex: number;
  items: ListItemData[];
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ListItem],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements OnDestroy {
  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');
  virtualItems = viewChildren<ElementRef<HTMLDivElement>>('virtualItem');

  readonly TOTAL_ITEMS = 600_000;
  readonly ESTIMATED_ITEM_HEIGHT = 64;
  private destroy$ = new Subject<void>();
  allItems = signal<ListItemData[]>([]);

  #measureItems = effect(() =>
    this.virtualItems().forEach((el) => {
      this.virtualizer.measureElement(el.nativeElement);
    }),
  );

  virtualizer = injectVirtualizer(() => ({
    scrollElement: this.scrollElement(),
    count: this.TOTAL_ITEMS,
    estimateSize: () => this.ESTIMATED_ITEM_HEIGHT,
    overscan: 2,
  }));

  constructor() {
    this.allItems.set(
      Array.from({ length: this.TOTAL_ITEMS }, (_, i) => ({
        id: i + 1,
        content: this.generateRandomLengthText(),
      })),
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  jumpToItem(itemNumber: number) {
    if (itemNumber >= 1 && itemNumber <= this.TOTAL_ITEMS) {
      this.virtualizer.scrollToIndex(itemNumber - 1, { align: 'start' });
    }
  }

  private generateRandomLengthText(): string {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    return loremIpsum.slice(0, Math.floor(Math.random() * loremIpsum.length));
    // return loremIpsum.slice(0, 100);
  }
}
