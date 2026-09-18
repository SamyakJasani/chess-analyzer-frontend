import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ChessGame, GamesResponse, PlayerProfile, getPlayerGames, getPlayerProfile } from '../api/api-client';
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
  private static readonly PAGE_SIZE = 10;
  protected readonly profile = signal<PlayerProfile | null>(null);
  protected readonly games = signal<ChessGame[]>([]);
  protected readonly pagination = signal<GamesResponse['pagination'] | null>(null);
  protected readonly page = signal(1);
  protected readonly selectedGame = signal<ChessGame | null>(null);
  protected readonly loading = signal(false);
  protected readonly gamesLoading = signal(false);
  protected readonly error = signal('');
  private requestController?: AbortController;

  protected async search(username: string) {
    this.page.set(1);
    await this.loadGames(username, 1, true);
  }

  protected async changePage(page: number) {
    const username = this.profile()?.username;
    if (username && page >= 1 && page !== this.page()) await this.loadGames(username, page);
  }

  private async loadGames(username: string, page: number, loadProfile = false) {
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;
    this.loading.set(true); this.gamesLoading.set(false); this.error.set('');
    if (loadProfile) { this.profile.set(null); this.games.set([]); this.pagination.set(null); this.selectedGame.set(null); }
    try {
      if (loadProfile) {
        const profile = await getPlayerProfile(username, controller.signal);
        if (controller.signal.aborted) return;
        this.profile.set(profile);
      }
      this.gamesLoading.set(true);
      const response = await getPlayerGames(username, page, controller.signal, App.PAGE_SIZE);
      if (!controller.signal.aborted) { this.games.set(response.games); this.pagination.set(response.pagination); this.page.set(response.pagination.page); this.selectedGame.set(null); }
    } catch (error) {
      if (!controller.signal.aborted) this.error.set(error instanceof Error ? error.message : 'Unable to load player.');
    } finally {
      if (!controller.signal.aborted) { this.loading.set(false); this.gamesLoading.set(false); }
    }
  }
}
