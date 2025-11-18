import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';

import { List } from './list';

describe('List', () => {
  let component: List;
  let fixture: ComponentFixture<List>;
  let virtualizerStub: {
    scrollToIndex: jasmine.Spy;
    getTotalSize: () => number;
    getVirtualItems: () => [];
    measureElement: () => void;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [List],
    }).compileComponents();

    fixture = TestBed.createComponent(List);
    component = fixture.componentInstance;
    virtualizerStub = {
      scrollToIndex: jasmine.createSpy('scrollToIndex'),
      getTotalSize: () => 0,
      getVirtualItems: () => [],
      measureElement: () => {},
    };
    component.virtualizer = virtualizerStub as unknown as List['virtualizer'];
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should seed the full data set with sequential ids', () => {
    const items = component.allItems();

    expect(items.length).toBe(component.TOTAL_ITEMS);
    expect(items[0].id).toBe(1);
    expect(items[items.length - 1].id).toBe(component.TOTAL_ITEMS);
  });

  describe('jumpToItem', () => {
    it('should ignore non-finite or out-of-range inputs', fakeAsync(() => {
      const initialStart = component.getGlobalIndex(0);

      component.jumpToItem(Number.NaN);
      component.jumpToItem(0);
      component.jumpToItem(component.TOTAL_ITEMS + 1);

      flushMicrotasks();

      expect(component.getGlobalIndex(0)).toBe(initialStart);
      expect(virtualizerStub.scrollToIndex).not.toHaveBeenCalled();
    }));

    it('should move to the containing segment and scroll relative to it', fakeAsync(() => {
      const targetItem = 200_000;
      const expectedStart = component.ITEMS_PER_SEGMENT;
      const expectedLocalIndex = targetItem - 1 - expectedStart;

      component.jumpToItem(targetItem);
      flushMicrotasks();

      expect(component.getGlobalIndex(0)).toBe(expectedStart);
      expect(virtualizerStub.scrollToIndex).toHaveBeenCalledWith(expectedLocalIndex, {
        align: 'start',
      });
    }));

    it('should jump to the final segment near the end of the list', fakeAsync(() => {
      const expectedStart = component.TOTAL_ITEMS - component.ITEMS_PER_SEGMENT;
      const expectedLocalIndex = component.ITEMS_PER_SEGMENT - 1;

      component.jumpToItem(component.TOTAL_ITEMS);
      flushMicrotasks();

      expect(component.getGlobalIndex(0)).toBe(expectedStart);
      expect(virtualizerStub.scrollToIndex).toHaveBeenCalledWith(expectedLocalIndex, {
        align: 'start',
      });
    }));
  });
});
