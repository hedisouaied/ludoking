<?php

namespace App\Services\Ludo;

use App\Events\DiceRolled;
use App\Events\GameFinished;
use App\Events\TurnChanged;
use App\Jobs\RunRobotTurn;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRoom;
use App\Models\GameToken;
use App\Models\GameMove;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class GameEngine
{
    /**
     * Roll a fair six-sided die.
     */
    public function rollDice(): int
    {
        return random_int(1, 6);
    }

    /**
     * Create the game row for a room and return it (pre-start hook).
     */
    public function createGameForRoom(GameRoom $room): Game
    {
        return $room->game ?? Game::create([
            'room_id' => $room->id,
            'status' => Game::STATUS_WAITING,
            'current_turn' => 0,
            'turn_phase' => Game::PHASE_ROLL,
        ]);
    }

    /**
     * Start a game for a room: assign colors/seats, spawn tokens, pick starter.
     */
    public function startGame(GameRoom $room): Game
    {
        return DB::transaction(function () use ($room) {
            $game = $room->game ?? new Game(['room_id' => $room->id, 'status' => Game::STATUS_WAITING]);
            $game->room_id = $room->id;
            $game->status = Game::STATUS_PLAYING;
            $game->turn_phase = Game::PHASE_ROLL;
            $game->dice_value = null;
            $game->winner_id = null;
            $game->current_turn = 0;
            $game->save();

            $players = $room->lobbyPlayers()->orderBy('seat')->get();
            if ($players->count() < 2 || $players->count() > 4) {
                throw new \DomainException('A game needs between 2 and 4 players.');
            }
            $seat = 0;
            foreach ($players as $player) {
                $player->game_id = $game->id;
                $player->color = Board::COLORS[$seat];
                $player->seat = $seat;
                $player->connected = true;
                $player->save();
                foreach ($game->tokens()->where('game_player_id', $player->id)->get() as $t) {
                    $t->update(['position' => -1, 'status' => GameToken::STATUS_BASE]);
                }
                $seat++;
            }

            // spawn any missing tokens
            foreach ($players as $player) {
                $existing = $game->tokens()->where('game_player_id', $player->id)->count();
                for ($i = $existing; $i < 4; $i++) {
                    $game->tokens()->create([
                        'game_player_id' => $player->id,
                        'token_number' => $i,
                        'position' => -1,
                        'status' => GameToken::STATUS_BASE,
                    ]);
                }
            }

            $room->update(['status' => 'playing', 'started_at' => now()]);

            $first = $players->first();
            $game->current_turn = 0;
            $game->current_player_id = $first->id;
            $game->turn_started_at = now();
            $game->save();

            event(new \App\Events\GameStarted($game));

            $this->maybeDispatchRobot($game);

            $game->load(['players.tokens', 'tokens', 'players.user']);
            return $game;
        });
    }

    /**
     * Roll the die for the current player and advance the game into the
     * move phase (or skip the turn when no token can move).
     *
     * @return array{value:int, game:Game, moved:bool}
     */
    public function roll(Game $game): array
    {
        return DB::transaction(function () use ($game) {
            if ($game->status !== Game::STATUS_PLAYING) {
                throw new \DomainException('The game is not in progress.');
            }
            if ($game->turn_phase !== Game::PHASE_ROLL) {
                throw new \DomainException('A token must be moved before rolling again.');
            }

            $player = $game->currentPlayer()->first();
            if (! $player) {
                throw new \DomainException('No current player.');
            }

            $value = $this->rollDice();
            $game->dice_value = $value;
            $game->save();

            $moves = $this->getValidMoves($game, $player, $value);

            $skipped = false;
            if (empty($moves)) {
                $skipped = true;
                $this->afterRollAndSkip($game, $player, $value);
            } else {
                $game->turn_phase = Game::PHASE_MOVE;
                $game->turn_started_at = now();
                $game->save();
            }

            event(new DiceRolled($game, $player, $value, $moves));

            if ($skipped) {
                $this->maybeDispatchRobot($game);
            }

            return ['value' => $value, 'game' => $game, 'skipped' => $skipped];
        });
    }

    /**
     * Dice rolled, no token can move: consume the turn and move on.
     */
    protected function afterRollAndSkip(Game $game, GamePlayer $player, int $value): void
    {
        $game->events()->create(['type' => 'no_moves', 'payload' => ['player_id' => $player->id, 'dice' => $value]]);

        if ($value === 6) {
            // No token can enter the board with this 6 -> next player.
            $game->dice_value = null;
            $game->turn_phase = Game::PHASE_ROLL;
            $game->turn_started_at = now();
            $game->save();
            event(new TurnChanged($game, $player, false));
            $this->advanceTurnAfterSkip($game, $player);
            return;
        }

        $this->advanceTurnAfterSkip($game, $player);
    }

    protected function advanceTurnAfterSkip(Game $game, GamePlayer $player): void
    {
        $next = $this->nextTurn($game, $player);
        $game->dice_value = null;
        $game->turn_phase = Game::PHASE_ROLL;
        $game->current_player_id = $next->id;
        $game->current_turn++;
        $game->turn_started_at = now();
        $game->save();
        event(new TurnChanged($game, $next));
        $game->events()->create(['type' => 'turn_changed', 'payload' => ['player_id' => $next->id]]);
    }

    /**
     * All legal moves for a player given the current dice value.
     * Each move: token, from_position, to_position, captures (tokens).
     */
    public function getValidMoves(Game $game, GamePlayer $player, ?int $dice = null): array
    {
        $dice = $dice ?? $game->dice_value;
        if ($dice === null || $game->status !== Game::STATUS_PLAYING) {
            return [];
        }

        $moves = [];
        foreach ($player->tokens as $token) {
            if ($token->status === GameToken::STATUS_FINISHED) {
                continue;
            }
            $to = Board::destination($token->position, $dice, $player->color);
            if ($to === null) {
                continue;
            }
            $moves[] = $this->buildMove($game, $player, $token, $to, $dice);
        }

        return $moves;
    }

    /**
     * True when the token can move with the given dice under current turn.
     */
    public function canMoveToken(Game $game, GamePlayer $player, GameToken $token, int $dice): bool
    {
        if ($game->status !== Game::STATUS_PLAYING || $game->dice_value !== $dice) {
            return false;
        }
        foreach ($this->getValidMoves($game, $player, $dice) as $move) {
            if ($move['token']->id === $token->id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Validate and persist a token move. Returns the resulting move record.
     */
    public function moveToken(Game $game, GamePlayer $player, GameToken $token, int $dice): GameMove
    {
        return DB::transaction(function () use ($game, $player, $token, $dice) {
            $this->assertCanAct($game, $player);

            if ($game->turn_phase !== Game::PHASE_MOVE) {
                throw new \DomainException('Roll the dice before moving a token.');
            }
            if ($game->dice_value !== $dice) {
                throw new \DomainException('Dice value mismatch.');
            }
            if ($token->game_player_id !== $player->id) {
                throw new \DomainException('This token does not belong to you.');
            }

            $valid = $this->getValidMoves($game, $player, $dice);
            $match = collect($valid)->first(fn ($m) => $m['token']->id === $token->id);
            if ($match === null) {
                throw new \DomainException('This token cannot move with the current dice.');
            }

            $from = $token->position;
            $to = $match['to'];

            // resolve capture (only here, never during validation)
            $victims = $this->captureOnLanding($game, $player, $to);
            $capturedToken = $victims->first();

            if ($to === Board::FINISHED) {
                $token->status = GameToken::STATUS_FINISHED;
            } elseif ($to >= Board::HOME_BASE) {
                $token->status = GameToken::STATUS_HOME;
            } else {
                $token->status = GameToken::STATUS_ACTIVE;
            }
            $token->position = $to;
            $token->save();

            $move = $game->moves()->create([
                'game_player_id' => $player->id,
                'token_id' => $token->id,
                'dice_value' => $dice,
                'from_position' => $from,
                'to_position' => $to,
                'captured_token_id' => $capturedToken?->id,
            ]);

            $eventPayload = [
                'move_id' => $move->id,
                'player_id' => $player->id,
                'token_id' => $token->id,
                'from' => $from,
                'to' => $to,
                'dice' => $dice,
                'captured_token_ids' => $victims->pluck('id')->all(),
            ];
            event(new \App\Events\TokenMoved($game, $eventPayload));
            $game->events()->create(['type' => 'token_moved', 'payload' => $eventPayload]);

            if ($victims->isNotEmpty()) {
                $victimPlayer = $capturedToken->player;
                $capturePayload = [
                    'player_id' => $player->id,
                    'victim_player_id' => $victimPlayer->id,
                    'token_ids' => $victims->pluck('id')->all(),
                    'tile' => $to,
                ];
                event(new \App\Events\TokenCaptured($game, $capturePayload));
                $game->events()->create(['type' => 'token_captured', 'payload' => $capturePayload]);
            }

            $this->afterMove($game, $player, (bool) $match['finished']);

            return $move;
        });
    }

    protected function afterMove(Game $game, GamePlayer $player, bool $finished): void
    {
        $won = $this->checkWinner($game);
        if ($won) {
            $game->status = Game::STATUS_FINISHED;
            $game->winner_id = $player->id;
            $game->turn_phase = Game::PHASE_ROLL;
            $game->dice_value = null;
            $game->save();
            $game->room()->update(['status' => 'ended']);
            event(new GameFinished($game, $player));
            $game->events()->create(['type' => 'game_finished', 'payload' => ['winner_player_id' => $player->id]]);
            return;
        }

        // extra turn on a six -> same player rolls again
        if ($game->dice_value === 6) {
            $game->dice_value = null;
            $game->turn_phase = Game::PHASE_ROLL;
            $game->turn_started_at = now();
            $game->save();
            event(new TurnChanged($game, $player, true));
            $game->events()->create(['type' => 'extra_turn', 'payload' => ['player_id' => $player->id]]);
            $this->maybeDispatchRobot($game);
            return;
        }

        $this->advanceTurn($game, $player);
    }

    protected function advanceTurn(Game $game, GamePlayer $player): void
    {
        $next = $this->nextTurn($game, $player);
        $game->dice_value = null;
        $game->turn_phase = Game::PHASE_ROLL;
        $game->current_player_id = $next->id;
        $game->current_turn++;
        $game->turn_started_at = now();
        $game->save();
        event(new TurnChanged($game, $next));
        $game->events()->create(['type' => 'turn_changed', 'payload' => ['player_id' => $next->id]]);
        $this->maybeDispatchRobot($game);
    }

    /**
     * Advance to the next player that still has movable tokens.
     */
    public function nextTurn(Game $game, GamePlayer $current): GamePlayer
    {
        $players = $game->players()->orderBy('seat')->get();
        $idx = $players->search(fn ($p) => $p->id === $current->id);
        $count = $players->count();
        if ($idx === false) {
            $idx = 0;
        }
        for ($i = 1; $i <= $count; $i++) {
            $candidate = $players[($idx + $i) % $count];
            $remaining = $candidate->tokens()->where('status', '!=', GameToken::STATUS_FINISHED)->count();
            if ($remaining > 0) {
                return $candidate;
            }
        }
        return $current;
    }

    protected function buildMove(Game $game, GamePlayer $player, GameToken $token, int $to, int $dice): array
    {
        return [
            'token' => $token,
            'token_id' => $token->id,
            'from' => $token->position,
            'to' => $to,
            'dice' => $dice,
            'captures' => $this->tokensAtTile($game, $player, $to)->pluck('id')->all(),
            'enteredBoard' => $token->position === -1,
            'finished' => $to === Board::FINISHED,
        ];
    }

    /**
     * Occupants of a tile that a move would capture. Pure query, no mutation.
     */
    public function tokensAtTile(Game $game, GamePlayer $player, int $tile): Collection
    {
        if ($tile < 0 || $tile >= Board::RING_CELLS || Board::isSafe($tile)) {
            return collect();
        }
        return $game->tokens()
            ->where('position', $tile)
            ->where('game_player_id', '!=', $player->id)
            ->with('player')
            ->get();
    }

    /**
     * Capture opponents on a landing tile (ring only, non-safe). Mutates DB.
     */
    protected function captureOnLanding(Game $game, GamePlayer $player, int $tile): Collection
    {
        $victims = $this->tokensAtTile($game, $player, $tile);
        foreach ($victims as $v) {
            $v->forceFill(['position' => -1, 'status' => GameToken::STATUS_BASE])->save();
        }
        return $victims;
    }

    public function checkWinner(Game $game): bool
    {
        if ($game->status !== Game::STATUS_PLAYING) {
            return false;
        }
        $current = $game->players()->where('id', $game->current_player_id)->first();
        if (! $current) {
            return false;
        }
        $finished = $current->tokens()->where('status', GameToken::STATUS_FINISHED)->count();
        return $finished >= 4;
    }

    protected function assertCanAct(Game $game, GamePlayer $player): void
    {
        if ($game->status !== Game::STATUS_PLAYING) {
            throw new \DomainException('The game is not in progress.');
        }
        if ($game->current_player_id !== $player->id) {
            throw new \DomainException('It is not your turn.');
        }
    }

    /**
     * If the player whose turn is now current is a robot, schedule its turn.
     */
    public function maybeDispatchRobot(Game $game, int $diceForDelay = 0): void
    {
        $current = $game->currentPlayer()->first();
        if (! $current || ! $current->isRobot()) {
            return;
        }
        $difficulty = in_array($current->robot_difficulty, LudoAIService::DIFFICULTIES, true)
            ? $current->robot_difficulty
            : 'medium';

        $delay = match ($difficulty) {
            'easy' => random_int(3, 6),
            'medium' => random_int(4, 8),
            default => random_int(6, 12),
        };

        RunRobotTurn::dispatch($game->id)->delay(now()->addSeconds($delay));
    }
}