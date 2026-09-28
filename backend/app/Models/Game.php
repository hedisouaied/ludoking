<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    public const STATUS_WAITING = 'waiting';
    public const STATUS_PLAYING = 'playing';
    public const STATUS_FINISHED = 'finished';

    public const PHASE_ROLL = 'awaiting_roll';
    public const PHASE_MOVE = 'awaiting_move';

    protected $fillable = [
        'room_id', 'status', 'current_player_id', 'current_turn',
        'winner_id', 'dice_value', 'turn_phase', 'turn_started_at',
    ];

    protected function casts(): array
    {
        return [
            'turn_started_at' => 'datetime',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(GameRoom::class, 'room_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(GamePlayer::class)->orderBy('seat');
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(GameToken::class);
    }

    public function moves(): HasMany
    {
        return $this->hasMany(GameMove::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(GameEvent::class);
    }

    public function currentPlayer(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class, 'current_player_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class, 'winner_id');
    }

    public function isPlaying(): bool
    {
        return $this->status === self::STATUS_PLAYING;
    }
}