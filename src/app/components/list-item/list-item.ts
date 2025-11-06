import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ListItemData {
  id: number;
  content: string;
}

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './list-item.html',
  styleUrl: './list-item.scss',
})
export class ListItem {
  @Input() item!: ListItemData;
}
