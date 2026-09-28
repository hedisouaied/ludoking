<?php

namespace App\Events;

use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TurnChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Game $game, public GamePlayer $player, public bool $extraTurn = false)
    {
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("game.{$this->game->id}")];
    }

    public function broadcastAs(): string
    {
        return 'turn.changed';
    }

    public function broadcastWith(): array
    {
        return ['player_id' => $this->player->id, 'extra_turn' => $this->extraTurn];
    }
}