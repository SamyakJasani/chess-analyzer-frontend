import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { Chess, Move, PieceSymbol } from 'chess.js';
import { ChessGame } from '../../../api/api-client';

interface BoardPiece { type: PieceSymbol; color: 'w' | 'b'; }
interface MoveRow { number: number; white?: Move; black?: Move; }

@Component({
  selector: 'app-game-analysis',
  templateUrl: './game-analysis.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameAnalysis {
  readonly game = input<ChessGame | null>(null);
  protected readonly analysisError = signal('');
  protected readonly engineStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly currentPly = signal(0);
  protected readonly totalPlies = signal(0);
  protected readonly board = signal<Record<string, BoardPiece>>({});
  protected readonly moves = signal<MoveRow[]>([]);
  protected readonly engineLine = signal('');
  protected readonly whiteClock = signal('—');
  protected readonly blackClock = signal('—');
  protected readonly evaluation = signal(0);
  private evaluationTurn: 'w' | 'b' = 'w';
  protected readonly evaluationLabel = computed(() => {
    const score = this.evaluation();
    return `${score > 0 ? '+' : ''}${(score / 100).toFixed(2)}`;
  });
  protected readonly evaluationPosition = computed(() => `${Math.max(5, Math.min(95, 50 + 50 * Math.tanh(this.evaluation() / 400)))}%`);
  protected readonly files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  protected readonly ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  protected readonly flipped = signal(false);
  protected readonly displayFiles = computed(() => this.flipped() ? [...this.files].reverse() : this.files);
  protected readonly displayRanks = computed(() => this.flipped() ? [...this.ranks].reverse() : this.ranks);
  private engine?: Worker;
  private moveClocks: string[] = [];

  constructor() {
    effect(() => {
      const game = this.game();
      untracked(() => game ? this.loadGame(game) : this.reset());
    });
  }

  protected playerName(player: ChessGame['white'] | ChessGame['black'] | undefined): string { return player?.username ?? 'Unknown player'; }
  protected gameDate(game: ChessGame): string { return game.end_time ? new Date(game.end_time * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Date unavailable'; }
  protected pieceSymbol(type: PieceSymbol, color: 'w' | 'b'): string { const symbols: Record<PieceSymbol, [string, string]> = { p: ['♙', '♟'], n: ['♘', '♞'], b: ['♗', '♝'], r: ['♖', '♜'], q: ['♕', '♛'], k: ['♔', '♚'] }; return symbols[type][color === 'w' ? 0 : 1]; }
  protected toggleBoard() { this.flipped.update((value) => !value); }

  protected goToPly(ply: number) {
    const game = this.game(); if (!game) return;
    const nextPly = Math.max(0, Math.min(ply, this.totalPlies()));
    this.currentPly.set(nextPly); this.updateBoard(nextPly, game.pgn);
  }

  private loadGame(game: ChessGame) {
    this.currentPly.set(0); this.analysisError.set(''); this.engineLine.set(''); this.evaluation.set(0); this.moveClocks = [];
    try {
      const chess = new Chess(); chess.loadPgn(game.pgn); const history = chess.history({ verbose: true });
      this.moveClocks = [...game.pgn.matchAll(/\[%clk\s+([^\]]+)\]/g)].map((match) => this.formatClock(match[1]));
      this.totalPlies.set(history.length);
      this.moves.set(history.reduce<MoveRow[]>((rows, move, index) => { const row = rows[Math.floor(index / 2)] ?? { number: Math.floor(index / 2) + 1 }; if (index % 2 === 0) row.white = move; else row.black = move; rows[Math.floor(index / 2)] = row; return rows; }, []));
      this.updateBoard(0, game.pgn); this.startEngine();
    } catch { this.board.set({}); this.moves.set([]); this.analysisError.set('This game has a malformed PGN and cannot be displayed.'); }
  }

  private reset() { this.engine?.terminate(); this.board.set({}); this.moves.set([]); this.currentPly.set(0); this.totalPlies.set(0); this.evaluation.set(0); this.whiteClock.set('—'); this.blackClock.set('—'); this.engineStatus.set('idle'); }
  private updateBoard(ply: number, pgn: string) { const chess = new Chess(); chess.loadPgn(pgn); const history = chess.history({ verbose: true }); const replay = new Chess(); history.slice(0, ply).forEach((move) => replay.move(move)); this.evaluationTurn = replay.turn(); this.updateClocks(ply); const nextBoard: Record<string, BoardPiece> = {}; replay.board().forEach((row, rowIndex) => row.forEach((piece, colIndex) => { if (piece) nextBoard[`${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`] = piece; })); this.board.set(nextBoard); if (this.engineStatus() === 'ready') { this.engine?.postMessage('stop'); this.engine?.postMessage(`position fen ${replay.fen()}`); this.engine?.postMessage('go depth 14'); } }
  private updateClocks(ply: number) { let white = '—'; let black = '—'; this.moveClocks.slice(0, ply).forEach((clock, index) => { if (index % 2 === 0) white = clock; else black = clock; }); this.whiteClock.set(white); this.blackClock.set(black); }
  private formatClock(value: string): string { const parts = value.trim().split(':'); if (parts.length !== 3) return value.trim(); const hours = Number(parts[0]); const minutes = parts[1].padStart(2, '0'); const seconds = Math.floor(Number(parts[2])).toString().padStart(2, '0'); return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`; }
  private startEngine() {
    this.engine?.terminate();
    this.engineStatus.set('loading');
    try {
      this.engine = new Worker('/stockfish/stockfish-19-lite-single.js');
      this.engine.onmessage = ({ data }: MessageEvent<string>) => {
        const line = typeof data === 'string' ? data : '';
        if (line === 'uciok') this.engine?.postMessage('isready');
        else if (line === 'readyok') { this.engineStatus.set('ready'); this.goToPly(this.currentPly()); }
        else if (line.startsWith('info depth')) {
          const score = line.match(/score (cp|mate) (-?\d+)/);
          if (score) {
            const value = Number(score[2]);
            const centipawns = score[1] === 'mate' ? Math.sign(value || 1) * 1000 : value;
            this.evaluation.set(this.evaluationTurn === 'w' ? centipawns : -centipawns);
          }
          this.engineLine.set(line);
          this.engineStatus.set('ready');
        }
      };
      this.engine.onerror = () => { if (this.engineStatus() === 'loading') this.engineStatus.set('error'); };
      this.engine.postMessage('uci');
    } catch { this.engineStatus.set('error'); }
  }
}
