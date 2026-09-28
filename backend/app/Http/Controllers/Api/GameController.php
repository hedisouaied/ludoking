<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameToken;
use App\Services\Ludo\GameEngine;
use App\Services\Ludo\GameState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function __construct(private GameEngine $engine)
    {
    }

    public function state(Request $request, Game $game): JsonResponse
    {
        $viewer = $this->viewer($game, $request->user());

        if ($viewer && $game->isPlaying()) {
            $viewer->forceFill(['connected' => true])->save();
        }

        return response()->json([
            'game' => GameState::snapshot($game, $viewer),
            'moves' => $game->moves()->orderByDesc('id')->limit(50)->get()->map(fn ($m) => [
                'id' => $m->id,
                'player_id' => $m->game_player_id,
                'token_id' => $m->token_id,
                'dice' => $m->dice_value,
                'from' => $m->from_position,
                'to' => $m->to_position,
                'captured_token_id' => $m->captured_token_id,
                'at' => optional($m->created_at)->toIso8601String(),
            ]),
        ]);
    }

    public function roll(Request $request, Game $game): JsonResponse
    {
        $this->authorizeGame($game, $request->user());

        try {
            $result = $this->engine->roll($game);
        } catch (\DomainException $e) {
            abort(422, $e->getMessage());
        }

        $viewer = $this->viewer($game, $request->user());

        return response()->json([
            'dice' => $result['value'],
            'skipped' => $result['skipped'],
            'game' => GameState::snapshot($result['game'], $viewer),
        ]);
    }

    public function move(Request $request, Game $game): JsonResponse
    {
        $validated = $request->validate([
            'token_id' => ['required', 'integer', 'exists:game_tokens,id'],
            'dice' => ['required', 'integer', 'between:1,6'],
        ]);

        $player = $this->viewer($game, $request->user());
        if (! $player) {
            abort(403, 'You are not part of this game.');
        }

        $token = GameToken::findOrFail((int) $validated['token_id']);

        try {
            $this->engine->moveToken($game, $player, $token, (int) $validated['dice']);
        } catch (\DomainException $e) {
            abort(422, $e->getMessage());
        }

        return response()->json([
            'message' => 'Token moved.',
            'game' => GameState::snapshot($game->fresh(), $player),
        ]);
    }

    public function connected(Request $request, Game $game): JsonResponse
    {
        $player = $this->viewer($game, $request->user());
        if ($player) {
            $wasDisconnected = ! $player->connected;
            $player->forceFill(['connected' => true])->save();
            if ($wasDisconnected && $game->room) {
                broadcast(new \App\Events\PlayerReconnected($player, $game->room->code))->toOthers();
            }
        }

        return response()->json(['message' => 'Presence updated.', 'game' => GameState::snapshot($game, $player)]);
    }

    public function disconnected(Request $request, Game $game): JsonResponse
    {
        $player = $this->viewer($game, $request->user());
        if ($player) {
            $player->forceFill(['connected' => false])->save();
            if ($game->room) {
                broadcast(new \App\Events\PlayerLeft($player, $game->room->code))->toOthers();
            }
        }

        return response()->json(['message' => 'Presence updated.']);
    }

    protected function viewer(Game $game, ?object $user): ?GamePlayer
    {
        if (! $user) {
            return null;
        }
        return $game->players()->where('user_id', $user->id)->first();
    }

    protected function authorizeGame(Game $game, object $user): void
    {
        $player = $this->viewer($game, $user);
        if (! $player) {
            abort(403, 'You are not part of this game.');
        }
        if ($game->status !== Game::STATUS_PLAYING) {
            abort(422, 'The game is not in progress.');
        }
        if ((int) $game->current_player_id !== (int) $player->id) {
            abort(422, 'It is not your turn.');
        }
        if (! $player->isRobot() && $game->turn_phase !== Game::PHASE_ROLL) {
            abort(422, 'Roll the dice before moving.');
        }
    }
}