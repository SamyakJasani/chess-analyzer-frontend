import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-player-search',
  imports: [FormsModule],
  templateUrl: './player-search.html',
})
export class PlayerSearch {
  @Output() searched = new EventEmitter<string>();
  protected username = '';

  protected submit() {
    const username = this.username.trim();
    if (username) this.searched.emit(username);
  }
}
