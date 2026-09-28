<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasFactory;

    protected $fillable = ['name', 'username', 'email', 'password', 'avatar'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function gameRooms(): HasMany
    {
        return $this->hasMany(GameRoom::class, 'host_id');
    }

    public function gamePlayers(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }

    public function gamePlayerInGame(\App\Models\Game $game): ?GamePlayer
    {
        return GamePlayer::where('game_id', $game->id)->where('user_id', $this->id)->first();
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }
}