<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Ludo\RoomService;
use App\Services\Ludo\GameState;
use App\Models\GameRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RoomController extends Controller
{
    public function __construct(private RoomService $rooms)
    {
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'max_players' => ['required', 'integer', 'between:2,4'],
            'robot_count' => ['sometimes', 'integer', 'between:0,4'],
            'robot_difficulty' => ['sometimes', 'nullable', 'string', 'in:easy,medium,hard'],
        ]);

        $room = $this->rooms->create(
            $request->user(),
            (int) $validated['max_players'],
            (int) ($validated['robot_count'] ?? 0),
            $validated['robot_difficulty'] ?? null,
        );

        return response()->json([
            'message' => 'Room created.',
            'room' => $this->roomPayload($room),
        ], 201);
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $room = GameRoom::where('code', strtoupper($validated['code']))->first();

        if (! $room) {
            throw ValidationException::withMessages(['code' => ['Room code not found.']]);
        }

        $player = $this->rooms->join($room, $request->user());

        return response()->json([
            'message' => 'Joined room.',
            'room' => $this->roomPayload($room),
            'player' => $player->only(['id', 'seat', 'color']),
        ]);
    }

    public function show(GameRoom $room): JsonResponse
    {
        return response()->json(['room' => $this->roomPayload($room)]);
    }

    public function start(Request $request, GameRoom $room, \App\Services\Ludo\GameEngine $engine): JsonResponse
    {
        if ((int) $room->host_id !== (int) $request->user()->id) {
            abort(403, 'Only the host can start the game.');
        }
        if ($room->status !== 'waiting') {
            abort(422, 'This room already started.');
        }

        $game = $engine->startGame($room->refresh());

        return response()->json([
            'message' => 'Game started.',
            'game' => GameState::snapshot($game, $request->user()->gamePlayerInGame($game)),
        ]);
    }

    public function leave(Request $request, GameRoom $room): JsonResponse
    {
        $player = $room->players()->where('user_id', $request->user()->id)->first();

        if (! $player) {
            return response()->json(['message' => 'You are not in this room.']);
        }

        $this->rooms->leave($room, $player);

        return response()->json(['message' => 'Left the room.']);
    }

    protected function roomPayload(GameRoom $room): array
    {
        $room->refresh();
        $game = $room->game;

        return [
            'id' => $room->id,
            'code' => $room->code,
            'host_id' => $room->host_id,
            'status' => $room->status,
            'max_players' => $room->max_players,
            'robot_count' => $room->robot_count,
            'robot_difficulty' => $room->robot_difficulty,
            'started_at' => optional($room->started_at)->toIso8601String(),
            'game_id' => $game?->id,
            'slots' => $this->rooms->slots($room),
        ];
    }
}