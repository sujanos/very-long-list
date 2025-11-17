import {
  Component,
  OnDestroy,
  ElementRef,
  effect,
  viewChild,
  viewChildren,
  signal,
  computed,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { injectVirtualizer } from '@tanstack/angular-virtual';
import { Subject, fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { OverlayscrollbarsModule, OverlayScrollbarsDirective } from 'overlayscrollbars-ngx';
import { ListItem, type ListItemData } from '../list-item/list-item';

interface Chunk {
  startIndex: number;
  endIndex: number;
  items: ListItemData[];
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ListItem, OverlayscrollbarsModule],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List implements AfterViewInit, OnDestroy {
  scrollElement = viewChild<ElementRef<HTMLDivElement>>('scrollElement');
  virtualItems = viewChildren<ElementRef<HTMLDivElement>>('virtualItem');
  overlayScrollbarsDirective = viewChild(OverlayScrollbarsDirective);
  private overlayViewport = signal<HTMLElement | null>(null);

  readonly TOTAL_ITEMS = 1_000_000;
  readonly ESTIMATED_ITEM_HEIGHT = 64;
  readonly SEGMENT_SIZE = 50_000;
  readonly SEGMENT_SCROLL_THRESHOLD_PX = 512;
  private destroy$ = new Subject<void>();
  allItems = signal<ListItemData[]>([]);
  segmentStartIndex = signal(0);
  private pendingScrollAdjustment: number | null = null;
  private itemHeights!: Float32Array;
  private currentSegmentCount = computed(() =>
    Math.min(this.SEGMENT_SIZE, Math.max(0, this.TOTAL_ITEMS - this.segmentStartIndex())),
  );

  #measureItems = effect(() =>
    this.virtualItems().forEach((el) => {
      const element = el.nativeElement;
      this.virtualizer.measureElement(element);

      const dataIndex = element.dataset['index'];
      if (!dataIndex) {
        return;
      }

      const globalIndex = Number(dataIndex);
      if (Number.isNaN(globalIndex) || globalIndex < 0 || globalIndex >= this.TOTAL_ITEMS) {
        return;
      }

      const measuredHeight = element.offsetHeight;
      if (measuredHeight > 0 && this.itemHeights[globalIndex] !== measuredHeight) {
        this.itemHeights[globalIndex] = measuredHeight;
      }
    }),
  );

  virtualizer = injectVirtualizer(() => ({
    scrollElement: this.overlayViewport() ?? this.scrollElement(),
    count: this.currentSegmentCount(),
    estimateSize: () => this.ESTIMATED_ITEM_HEIGHT,
    overscan: 2,
  }));

  constructor() {
    this.itemHeights = new Float32Array(this.TOTAL_ITEMS);
    this.itemHeights.fill(this.ESTIMATED_ITEM_HEIGHT);

    this.allItems.set(
      Array.from({ length: this.TOTAL_ITEMS }, (_, i) => ({
        id: i + 1,
        content: this.generateRandomLengthText(),
      })),
    );
  }

  ngAfterViewInit() {
    const directive = this.overlayScrollbarsDirective();
    const scrollElement = this.scrollElement()?.nativeElement;
    let scrollTarget: Element | null = null;

    if (directive && scrollElement) {
      directive.osInitialize(scrollElement);

      const viewport = directive.osInstance()?.elements().viewport;
      if (viewport) {
        this.overlayViewport.set(viewport);
        scrollTarget = viewport;
      }
    }

    if (!scrollTarget && scrollElement) {
      scrollTarget = scrollElement;
    }

    if (scrollTarget) {
      this.initializeScrollStream(scrollTarget);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  jumpToItem(itemNumber: number) {
    if (!Number.isFinite(itemNumber)) {
      return;
    }

    const targetIndex = Math.floor(itemNumber) - 1;
    if (targetIndex < 0 || targetIndex >= this.TOTAL_ITEMS) {
      return;
    }

    const desiredSegmentStart = Math.floor(targetIndex / this.SEGMENT_SIZE) * this.SEGMENT_SIZE;
    const maxStart = Math.max(0, this.TOTAL_ITEMS - this.SEGMENT_SIZE);
    const nextStart = this.clamp(desiredSegmentStart, 0, maxStart);

    if (nextStart !== this.segmentStartIndex()) {
      this.segmentStartIndex.set(nextStart);
    }

    this.scheduleVirtualizerSync(() => {
      const relativeIndex = targetIndex - this.segmentStartIndex();
      this.virtualizer.scrollToIndex(relativeIndex, { align: 'start' });
    });
  }

  private generateRandomLengthText(): string {
    const loremIpsum = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
    return loremIpsum.slice(0, Math.floor(Math.random() * loremIpsum.length));
    // return loremIpsum.slice(0, 100);
  }

  private initializeScrollStream(target: Element) {
    fromEvent(target, 'scroll')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.handleScrollSegmenting());
  }

  private handleScrollSegmenting() {
    if (this.pendingScrollAdjustment !== null) {
      return;
    }

    const viewport = this.getViewportElement();
    if (!viewport) {
      return;
    }

    const scrollTop = viewport.scrollTop;
    const scrollHeight = viewport.scrollHeight;
    const clientHeight = viewport.clientHeight;
    const atTop = scrollTop <= this.SEGMENT_SCROLL_THRESHOLD_PX;
    const atBottom = scrollTop + clientHeight >= scrollHeight - this.SEGMENT_SCROLL_THRESHOLD_PX;

    if (atTop && this.segmentStartIndex() > 0) {
      this.shiftSegmentWindow(-1, viewport);
      return;
    }

    const canMoveForward = this.segmentStartIndex() + this.currentSegmentCount() < this.TOTAL_ITEMS;
    if (atBottom && canMoveForward) {
      this.shiftSegmentWindow(1, viewport);
    }
  }

  private shiftSegmentWindow(direction: 1 | -1, viewport: HTMLElement) {
    const deltaItems = Math.floor(this.SEGMENT_SIZE / 2);
    const candidate = this.segmentStartIndex() + direction * deltaItems;
    const maxStart = Math.max(0, this.TOTAL_ITEMS - this.SEGMENT_SIZE);
    const nextStart = this.clamp(candidate, 0, maxStart);

    if (nextStart === this.segmentStartIndex()) {
      return;
    }

    const currentStart = this.segmentStartIndex();
    const deltaPixels = this.sumHeights(
      Math.min(currentStart, nextStart),
      Math.max(currentStart, nextStart),
    );
    const adjustedScrollTop = this.clamp(
      viewport.scrollTop - direction * deltaPixels,
      0,
      Math.max(viewport.scrollHeight - viewport.clientHeight, 0),
    );

    this.segmentStartIndex.set(nextStart);
    this.pendingScrollAdjustment = adjustedScrollTop;
    this.scheduleVirtualizerSync(() => this.applyPendingScrollAdjustment());
  }

  private applyPendingScrollAdjustment() {
    const viewport = this.getViewportElement();
    if (!viewport || this.pendingScrollAdjustment === null) {
      return;
    }

    const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
    viewport.scrollTop = this.clamp(this.pendingScrollAdjustment, 0, maxScrollTop);
    this.pendingScrollAdjustment = null;
  }

  private scheduleVirtualizerSync(task: () => void) {
    requestAnimationFrame(() => task());
  }

  private getViewportElement(): HTMLElement | null {
    return this.overlayViewport() ?? this.scrollElement()?.nativeElement ?? null;
  }

  private clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  private sumHeights(startIndex: number, endIndex: number) {
    if (startIndex >= endIndex) {
      return 0;
    }

    let total = 0;
    for (let i = startIndex; i < endIndex && i < this.TOTAL_ITEMS; i++) {
      total += this.itemHeights[i];
    }
    return total;
  }
}
