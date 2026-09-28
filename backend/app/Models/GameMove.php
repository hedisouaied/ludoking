<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GameMove extends Model
{
    protected $fillable = [
        'game_id', 'game_player_id', 'token_id', 'dice_value',
        'from_position', 'to_position', 'captured_token_id',
    ];

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class, 'game_player_id');
    }

    public function token(): BelongsTo
    {
        return $this->belongsTo(GameToken::class, 'token_id');
    }

    public function capturedToken(): BelongsTo
    {
        return $this->belongsTo(GameToken::class, 'captured_token_id');
    }
}