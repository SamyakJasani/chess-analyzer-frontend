import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ChessGame, PlayerProfile, getPlayerGames, getPlayerProfile } from '../api/api-client';
import { GameAnalysis } from './components/game-analysis/game-analysis';
import { PlayerSearch } from './components/player-search/player-search';
import { PlayerSidebar } from './components/player-sidebar/player-sidebar';

@Component({
  selector: 'app-root',
  imports: [GameAnalysis, PlayerSearch, PlayerSidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly profile = signal<PlayerProfile | null>(null);
  protected readonly games = signal<ChessGame[]>([]);
  protected readonly selectedGame = signal<ChessGame | null>(null);
  protected readonly loading = signal(false);
  protected readonly gamesLoading = signal(false);
  protected readonly error = signal('');
  private requestController?: AbortController;

  protected async search(username: string) {
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;
    this.loading.set(true); this.gamesLoading.set(false); this.error.set('');
    this.profile.set(null); this.games.set([]); this.selectedGame.set(null);
    try {
      const profile = await getPlayerProfile(username, controller.signal);
      if (controller.signal.aborted) return;
      this.profile.set(profile); this.gamesLoading.set(true);
      const games = await getPlayerGames(username, controller.signal);
      if (!controller.signal.aborted) this.games.set(games);
    } catch (error) {
      if (!controller.signal.aborted) this.error.set(error instanceof Error ? error.message : 'Unable to load player.');
    } finally {
      if (!controller.signal.aborted) { this.loading.set(false); this.gamesLoading.set(false); }
    }
  }
}
