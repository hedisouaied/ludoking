<?php

namespace Tests\Concerns;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameRoom;
use App\Models\User;
use App\Services\Ludo\GameEngine;
use App\Services\Ludo\RoomService;

trait CreatesLudoGames
{
    protected User $host;

    protected User $friend;

    protected GameRoom $room;

    protected Game $game;

    protected function user(string $name = 'Player'): User
    {
        return User::factory()->create([
            'name' => $name,
            'username' => strtolower(uniqid($name)),
        ]);
    }

    protected function roomService(): RoomService
    {
        return app(RoomService::class);
    }

    protected function engine(): GameEngine
    {
        return app(GameEngine::class);
    }

    /**
     * Two human players in a room + started game.
     */
    protected function startWithTwoHumans(): Game
    {
        $this->host = $this->user('Hedi');
        $this->friend = $this->user('Nada');

        $this->room = $this->roomService()->create($this->host, 2, 0, null);
        $this->roomService()->join($this->room, $this->friend);
        $this->room->refresh();

        $this->game = $this->engine()->startGame($this->room->refresh());

        return $this->game;
    }

    /**
     * One human + N robots (same player count, used for AI/reconnection tests).
     */
    protected function startWithRobots(int $robots = 3, string $difficulty = 'hard'): Game
    {
        $this->host = $this->user('Hedi');
        $this->room = $this->roomService()->create($this->host, $robots + 1, $robots, $difficulty);
        $this->room->refresh();

        $this->game = $this->engine()->startGame($this->room->refresh());

        return $this->game;
    }

    protected function gamePlayer(Game $game, int $index = 0): GamePlayer
    {
        return $game->players()->orderBy('seat')->get()[$index];
    }

    protected function humanPlayer(Game $game): GamePlayer
    {
        return $game->players()->where('is_robot', false)->first();
    }

    protected function tokenFor(GamePlayer $player, int $number = 0): \App\Models\GameToken
    {
        return $player->tokens()->where('token_number', $number)->first();
    }

    /**
     * Bind the engine so every die roll returns the given series of values
     * (repeating 1 when exhausted).
     */
    protected function forceDice(int ...$values): void
    {
        $sequence = new \ArrayObject($values);
        $this->app->bind(GameEngine::class, function () use ($sequence) {
            return new class($sequence) extends GameEngine
            {
                public function __construct(private \ArrayObject $seq)
                {
                }

                public function rollDice(): int
                {
                    if ($this->seq->count() === 0) {
                        return 1;
                    }
                    $value = $this->seq->offsetGet(0);
                    $this->seq->offsetUnset(0);
                    return (int) $value;
                }
            };
        });
    }
}