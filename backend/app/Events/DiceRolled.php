<?php

namespace App\Events;

use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DiceRolled implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<int, array<string, mixed>>  $moves  available moves for the roller
     */
    public function __construct(
        public Game $game,
        public GamePlayer $player,
        public int $value,
        public array $moves = [],
        public bool $skipped = false,
    ) {
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("game.{$this->game->id}")];
    }

    public function broadcastAs(): string
    {
        return 'dice.rolled';
    }

    public function broadcastWith(): array
    {
        return [
            'player_id' => $this->player->id,
            'value' => $this->value,
            'skipped' => $this->skipped,
            'moves' => array_map(
                fn ($m) => array_merge($m, [
                    'token' => [
                        'id' => $m['token']->id,
                        'token_number' => $m['token']->token_number,
                    ],
                ]),
                $this->moves
            ),
        ];
    }
}