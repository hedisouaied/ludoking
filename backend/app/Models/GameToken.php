<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameToken extends Model
{
    public const STATUS_BASE = 'base';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_HOME = 'home';
    public const STATUS_FINISHED = 'finished';

    protected $fillable = ['game_id', 'game_player_id', 'token_number', 'position', 'status'];

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class, 'game_player_id');
    }
}