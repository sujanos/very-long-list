import { ComponentFixture, TestBed } from '@angular/core/testing';

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
    fixture.detectChanges();

    spyOn(component as any, 'scheduleVirtualizerSync').and.callFake((task: () => void) => task());
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
    it('should ignore non-finite or out-of-range inputs', () => {
      const initialStart = component.segmentStartIndex();

      component.jumpToItem(Number.NaN);
      component.jumpToItem(0);
      component.jumpToItem(component.TOTAL_ITEMS + 1);

      expect(component.segmentStartIndex()).toBe(initialStart);
      expect(virtualizerStub.scrollToIndex).not.toHaveBeenCalled();
    });

    it('should move to the containing segment and scroll relative to it', () => {
      component.jumpToItem(75_001);

      expect(component.segmentStartIndex()).toBe(50_000);
      expect(virtualizerStub.scrollToIndex).toHaveBeenCalledWith(25_000, { align: 'start' });
    });

    it('should jump to the final segment near the end of the list', () => {
      component.jumpToItem(component.TOTAL_ITEMS);

      const expectedStart = component.TOTAL_ITEMS - component.SEGMENT_SIZE;
      expect(component.segmentStartIndex()).toBe(expectedStart);
      expect(virtualizerStub.scrollToIndex).toHaveBeenCalledWith(component.SEGMENT_SIZE - 1, {
        align: 'start',
      });
    });
  });
});
