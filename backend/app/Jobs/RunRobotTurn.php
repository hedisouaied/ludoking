<?php

namespace App\Jobs;

use App\Models\Game;
use App\Services\Ludo\GameEngine;
use App\Services\Ludo\LudoAIService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

/**
 * Server-driven robot turn. Robots roll and move on the server so the AI
 * never depends on a connected client and can never cheat.
 */
class RunRobotTurn implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public int $gameId,
        public string $step = 'roll',
    ) {
    }

    /**
     * @param  int  $gameId
     */
    public static function forMove(int $gameId): static
    {
        return new static($gameId, 'move');
    }

    public function handle(GameEngine $engine, LudoAIService $ai): void
    {
        $game = Game::find($this->gameId);
        if (! $game || $game->status !== Game::STATUS_PLAYING) {
            return;
        }

        $player = $game->currentPlayer()->first();
        if (! $player || ! $player->isRobot()) {
            return;
        }

        if ($this->step === 'roll') {
            if ($game->turn_phase !== Game::PHASE_ROLL) {
                return;
            }

            $result = $engine->roll($game);
            $game = $result['game'];
            if ($result['skipped']) {
                return; // turn advanced, next robot turn auto-dispatched if needed
            }

            // Give observers a moment to see the dice result, then move.
            self::forMove($game->id)->delay(now()->addSeconds(1));
            return;
        }

        // step === 'move'
        if ($game->turn_phase !== Game::PHASE_MOVE) {
            return;
        }

        $moves = $engine->getValidMoves($game, $player);
        if (empty($moves)) {
            return;
        }

        $choice = $ai->chooseMove($game, $player);

        DB::transaction(function () use ($engine, $game, $player, $choice) {
            $engine->moveToken($game, $player, $choice['token'], (int) $choice['dice']);
        });
    }
}