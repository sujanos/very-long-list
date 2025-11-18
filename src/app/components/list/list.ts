import {
  Component,
  OnDestroy,
  ElementRef,
  effect,
  viewChild,
  viewChildren,
  signal,
  AfterViewInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { Subject } from 'rxjs';
import { OverlayscrollbarsModule, OverlayScrollbarsDirective } from 'overlayscrollbars-ngx';

import { ListItem, type ListItemData } from '../list-item/list-item';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ListItem, OverlayscrollbarsModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements AfterViewInit, OnDestroy {
  private scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');
  private virtualItems = viewChildren<ElementRef<HTMLDivElement>>('virtualItem');
  private overlayScrollbarsDirective = viewChild(OverlayScrollbarsDirective);
  private overlayViewport = signal<Element | null>(null);
  private attachedViewport: Element | null = null;
  private isSegmentSwitching = false;

  readonly TOTAL_ITEMS = 1_000_000;
  readonly ESTIMATED_ITEM_HEIGHT = 64;
  readonly MAX_SEGMENT_SIZE_PX = 8_000_000;
  readonly SEGMENT_SWITCH_THRESHOLD_PX = 1_024;
  readonly ITEMS_PER_SEGMENT = Math.max(
    Math.floor(this.MAX_SEGMENT_SIZE_PX / this.ESTIMATED_ITEM_HEIGHT),
    1,
  );
  readonly TOTAL_SEGMENTS = Math.max(1, Math.ceil(this.TOTAL_ITEMS / this.ITEMS_PER_SEGMENT));
  private destroy$ = new Subject<void>();
  allItems = signal<ListItemData[]>([]);
  private currentSegmentIndex = signal(0);
  private segmentStartIndex = computed(() => this.currentSegmentIndex() * this.ITEMS_PER_SEGMENT);
  private currentSegmentCount = computed(() => {
    const remaining = this.TOTAL_ITEMS - this.segmentStartIndex();
    return Math.max(Math.min(this.ITEMS_PER_SEGMENT, remaining), 0);
  });

  #measureItems = effect(() =>
    this.virtualItems().forEach((el) => {
      this.virtualizer.measureElement(el.nativeElement);
    }),
  );

  virtualizer = injectVirtualizer(() => ({
    scrollElement: this.overlayViewport() ?? this.scrollElement(),
    count: this.currentSegmentCount(),
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

  ngAfterViewInit() {
    const overlayScrollbarsDirective = this.overlayScrollbarsDirective();
    const scrollElement = this.scrollElement()?.nativeElement;

    if (overlayScrollbarsDirective && scrollElement) {
      overlayScrollbarsDirective.osInitialize(scrollElement);

      const viewport = overlayScrollbarsDirective.osInstance()?.elements().viewport;
      if (viewport) {
        this.overlayViewport.set(viewport);
        this.attachViewportListeners(viewport);
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.attachedViewport) {
      this.attachedViewport.removeEventListener('scroll', this.handleSegmentedScroll);
      this.attachedViewport = null;
    }
  }

  jumpToItem(itemNumber: number) {
    if (itemNumber >= 1 && itemNumber <= this.TOTAL_ITEMS) {
      const zeroBased = itemNumber - 1;
      const segmentIndex = Math.floor(zeroBased / this.ITEMS_PER_SEGMENT);
      const indexWithinSegment = zeroBased % this.ITEMS_PER_SEGMENT;

      this.currentSegmentIndex.set(segmentIndex);

      queueMicrotask(() => {
        const viewport = this.overlayViewport();
        if (viewport) {
          viewport.scrollTop = 0;
        }
        this.virtualizer.scrollToIndex(indexWithinSegment, { align: 'start' });
      });
    }
  }

  getGlobalIndex(localIndex: number): number {
    return this.segmentStartIndex() + localIndex;
  }

  private attachViewportListeners(viewport: Element) {
    if (this.attachedViewport === viewport) {
      return;
    }

    if (this.attachedViewport) {
      this.attachedViewport.removeEventListener('scroll', this.handleSegmentedScroll);
    }

    viewport.addEventListener('scroll', this.handleSegmentedScroll, { passive: true });
    this.attachedViewport = viewport;
  }

  private handleSegmentedScroll = () => {
    if (this.isSegmentSwitching) {
      return;
    }

    const viewport = this.overlayViewport();
    if (!viewport) {
      return;
    }

    const scrollTop = viewport.scrollTop;
    const viewportHeight = viewport.clientHeight;
    const segmentHeight = Math.max(this.virtualizer.getTotalSize(), viewportHeight);
    const threshold = Math.min(this.SEGMENT_SWITCH_THRESHOLD_PX, segmentHeight / 2);

    const atBottomLimit =
      this.currentSegmentIndex() < this.TOTAL_SEGMENTS - 1 &&
      scrollTop > segmentHeight - viewportHeight - threshold;
    if (atBottomLimit) {
      this.shiftSegment(1);
      return;
    }

    const atTopLimit = this.currentSegmentIndex() > 0 && scrollTop < threshold;
    if (atTopLimit) {
      this.shiftSegment(-1);
    }
  };

  private shiftSegment(direction: 1 | -1) {
    const newIndex = this.currentSegmentIndex() + direction;
    if (newIndex < 0 || newIndex >= this.TOTAL_SEGMENTS) {
      return;
    }

    this.isSegmentSwitching = true;
    this.currentSegmentIndex.set(newIndex);

    requestAnimationFrame(() => {
      const viewport = this.overlayViewport();
      if (viewport) {
        const segmentHeight = Math.max(this.virtualizer.getTotalSize(), viewport.clientHeight);
        const threshold = Math.min(this.SEGMENT_SWITCH_THRESHOLD_PX, segmentHeight / 2);

        if (direction === 1) {
          viewport.scrollTop = threshold;
        } else {
          viewport.scrollTop = Math.max(segmentHeight - viewport.clientHeight - threshold, 0);
        }
      }

      this.isSegmentSwitching = false;
    });
  }

  private generateRandomLengthText(): string {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    return loremIpsum.slice(0, Math.floor(Math.random() * loremIpsum.length));
    // return loremIpsum.slice(0, 100);
  }
}
