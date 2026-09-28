<?php

namespace App\Events;

use App\Models\Game;
use App\Models\GamePlayer;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public GamePlayer $player, public string $roomCode)
    {
    }

    public function broadcastOn(): array
    {
        return [new PresenceChannel("room.{$this->roomCode}")];
    }

    public function broadcastAs(): string
    {
        return 'player.joined';
    }

    public function broadcastWith(): array
    {
        return ['player' => $this->player->only(['id', 'name', 'is_robot', 'color', 'seat'])];
    }
}