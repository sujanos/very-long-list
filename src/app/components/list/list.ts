import { Component, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { BehaviorSubject, Subject } from 'rxjs';
import { ListItem, type ListItemData } from '../list-item/list-item';

interface Chunk {
  startIndex: number;
  endIndex: number;
  items: ListItemData[];
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollingModule, ListItem],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements OnDestroy {
  @ViewChild('scrollViewport') scrollViewport!: CdkVirtualScrollViewport;
  
  private readonly TOTAL_ITEMS = 1_000_000;
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_BUFFER = 500;
  private destroy$ = new Subject<void>();
  currentChunk: Chunk | null = null;
  
  items$ = new BehaviorSubject<ListItemData[]>([]);
  itemHeight = 55;
  
  constructor() {
    this.loadChunk(0);
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  jumpToItem(itemNumber: number): void {
    if (itemNumber < 1 || itemNumber > this.TOTAL_ITEMS) return;
    
    const targetIndex = itemNumber - 1;
    
    if (this.currentChunk && 
        targetIndex >= this.currentChunk.startIndex && 
        targetIndex <= this.currentChunk.endIndex) {
      this.scrollToIndex(targetIndex);
      return;
    }
    
    this.loadChunk(targetIndex);
  }
  
  private loadChunk(centerIndex: number): void {
    let startIndex = Math.max(0, centerIndex - this.CHUNK_BUFFER);
    let endIndex = Math.min(this.TOTAL_ITEMS - 1, centerIndex + this.CHUNK_BUFFER);
    
    const chunkItems = Array.from(
      { length: endIndex - startIndex + 1 },
      (_, i) => ({
        id: startIndex + i + 1,
        content: this.generateRandomLengthText(),
      })
    );
    
    this.currentChunk = {
      startIndex,
      endIndex,
      items: chunkItems
    };
    
    this.items$.next(chunkItems);
    
    setTimeout(() => {
      if (centerIndex >= startIndex && centerIndex <= endIndex) {
        this.scrollToIndex(centerIndex - startIndex);
      }
    });
  }
  
  private scrollToIndex(index: number): void {
    if (this.scrollViewport) {
      this.scrollViewport.scrollToIndex(index, 'auto');
    }
  }

  private generateRandomLengthText(): string {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    // return loremIpsum.slice(0, Math.floor(Math.random() * loremIpsum.length));
    return loremIpsum.slice(0, 100);
  }
}
