<?php

namespace App\Events;

use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GameFinished implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Game $game, public GamePlayer $winner)
    {
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("game.{$this->game->id}")];
    }

    public function broadcastAs(): string
    {
        return 'game.finished';
    }

    public function broadcastWith(): array
    {
        return [
            'game_id' => $this->game->id,
            'winner_player_id' => $this->winner->id,
            'winner_name' => $this->winner->name,
        ];
    }
}