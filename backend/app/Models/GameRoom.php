<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class GameRoom extends Model
{
    protected $fillable = ['code', 'host_id', 'status', 'max_players', 'started_at'];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(GamePlayer::class, 'room_id');
    }

    /**
     * Players seated in the lobby (before a game row attaches them).
     */
    public function lobbyPlayers(): HasMany
    {
        return $this->hasMany(GamePlayer::class, 'room_id')->whereNull('game_id');
    }

    public function game(): HasOne
    {
        return $this->hasOne(Game::class, 'room_id');
    }
}