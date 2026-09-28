<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GamePlayer extends Model
{
    public const COLORS = ['red', 'green', 'yellow', 'blue'];

    protected $fillable = [
        'game_id', 'room_id', 'user_id', 'name', 'is_robot', 'robot_difficulty',
        'color', 'seat', 'connected',
    ];

    protected function casts(): array
    {
        return [
            'is_robot' => 'boolean',
            'connected' => 'boolean',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(GameToken::class)->orderBy('token_number');
    }

    public function isRobot(): bool
    {
        return (bool) $this->is_robot;
    }
}