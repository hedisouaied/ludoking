<?php

namespace App\Services\Ludo;

use App\Models\Game;
use App\Models\GamePlayer;

/**
 * Serializes a Game into the authoritative snapshot the client consumes.
 * Only serializable public data; the client never derives game rules from this.
 */
class GameState
{
    public static function snapshot(Game $game, ?GamePlayer $viewer = null, ?int $dice = null): array
    {
        $game->loadMissing(['players.tokens', 'players.user', 'tokens']);

        $current = $game->currentPlayer()->first();
        $validMoves = [];

        if (
            $viewer !== null
            && $current !== null
            && $viewer->id === $current->id
            && $game->turn_phase === Game::PHASE_MOVE
        ) {
            $validMoves = (new GameEngine)->getValidMoves($game, $viewer, $game->dice_value)
                ?? [];
            $validMoves = array_map(fn ($m) => [
                'token_id' => $m['token']->id,
                'from' => $m['from'],
                'to' => $m['to'],
                'captures' => $m['captures'],
                'finished' => $m['finished'],
                'entered_board' => $m['enteredBoard'],
            ], $validMoves);
        }

        return [
            'id' => $game->id,
            'room_id' => $game->room_id,
            'room_code' => $game->room?->code,
            'status' => $game->status,
            'current_turn' => $game->current_turn,
            'current_player_id' => $game->current_player_id,
            'turn_phase' => $game->turn_phase,
            'turn_started_at' => optional($game->turn_started_at)->toIso8601String(),
            'dice_value' => $game->dice_value,
            'winner_id' => $game->winner_id,
            'created_at' => optional($game->created_at)->toIso8601String(),
            'viewer_player_id' => $viewer?->id,
            'valid_moves' => $validMoves,
            'players' => $game->players->map(fn (GamePlayer $p) => [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'name' => $p->name,
                'username' => $p->user?->username,
                'avatar' => $p->user?->avatar,
                'is_robot' => (bool) $p->is_robot,
                'robot_difficulty' => $p->robot_difficulty,
                'color' => $p->color,
                'seat' => $p->seat,
                'connected' => (bool) $p->connected,
                'tokens' => $p->tokens->map(fn ($t) => [
                    'id' => $t->id,
                    'token_number' => $t->token_number,
                    'position' => $t->position,
                    'status' => $t->status,
                ])->values()->all(),
            ])->values()->all(),
        ];
    }
}