import { Component, EventEmitter, input, Output } from '@angular/core';
import { ChessGame, PlayerProfile } from '../../../api/api-client';

@Component({
  selector: 'app-player-sidebar',
  templateUrl: './player-sidebar.html',
})
export class PlayerSidebar {
  readonly profile = input<PlayerProfile | null>(null);
  readonly games = input<ChessGame[]>([]);
  readonly gamesLoading = input(false);
  readonly selectedGame = input<ChessGame | null>(null);
  @Output() gameSelected = new EventEmitter<ChessGame>();

  protected playerName(player: ChessGame['white'] | ChessGame['black'] | undefined, fallback = 'Unknown player'): string {
    return player?.username ?? fallback;
  }

  protected gameKey(game: ChessGame): string { return game.uuid ?? game.url ?? game.pgn.slice(0, 20); }

  protected resultForPlayer(game: ChessGame): string {
    const username = this.profile()?.username?.toLowerCase();
    if (!username) return '—';
    if (game.white.username.toLowerCase() === username) return game.white.result ?? '—';
    if (game.black.username.toLowerCase() === username) return game.black.result ?? '—';
    return '—';
  }
}
