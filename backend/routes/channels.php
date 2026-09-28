<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

Broadcast::channel('room.{code}', function ($user, $code) {
    $room = App\Models\GameRoom::where('code', $code)->first();

    if (! $room) {
        return false;
    }

    foreach ($room->players as $player) {
        if ($player->user_id === $user->id) {
            return $player->only(['id', 'name', 'is_robot', 'color', 'seat']);
        }
    }

    return false;
});

// Presence channel for an in-progress game. Players authenticated via web token.
Broadcast::channel('game.{id}', function ($user, $id) {
    $player = App\Models\GamePlayer::where('game_id', $id)
        ->where('user_id', $user->id)
        ->first();

    if (! $player) {
        return false;
    }

    return $player->only(['id', 'name', 'is_robot', 'color', 'seat']);
});

Broadcast::channel('user.{id}', fn ($user, $id) => (int) $user->id === (int) $id);