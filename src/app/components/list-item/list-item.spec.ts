import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListItem } from './list-item';

describe('ListItem', () => {
  let component: ListItem;
  let fixture: ComponentFixture<ListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListItem],
    }).compileComponents();

    fixture = TestBed.createComponent(ListItem);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.item = {
      id: 1,
      content: 'Test content',
    };
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the item id and content', () => {
    component.item = {
      id: 40,
      content: 'Rendered content',
    };

    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.item-id')?.textContent).toContain('40');
    expect(element.textContent).toContain('Rendered content');
  });
});
