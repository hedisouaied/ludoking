<?php

namespace App\Services\Ludo;

use App\Events\PlayerJoined;
use App\Events\PlayerLeft;
use App\Models\GamePlayer;
use App\Models\GameRoom;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomService
{
    public const ROBOT_NAMES = ['Robot Alice', 'Robot Bob', 'Robot Charlie'];

    /**
     * Create a private room plus the host's seat and any robot seats.
     */
    public function create(User $host, int $maxPlayers, int $robotCount, ?string $difficulty): GameRoom
    {
        if ($maxPlayers < 2 || $maxPlayers > 4) {
            throw ValidationException::withMessages(['max_players' => 'The room must hold between 2 and 4 players.']);
        }
        if ($robotCount < 0 || $robotCount > $maxPlayers - 1) {
            throw ValidationException::withMessages(['robot_count' => 'Robot count does not fit this room.']);
        }
        if ($robotCount > 0 && ! in_array($difficulty, LudoAIService::DIFFICULTIES, true)) {
            throw ValidationException::withMessages(['robot_difficulty' => 'Invalid robot difficulty.']);
        }

        return DB::transaction(function () use ($host, $maxPlayers, $robotCount, $difficulty) {
            $room = GameRoom::create([
                'code' => $this->uniqueCode(),
                'host_id' => $host->id,
                'status' => 'waiting',
                'max_players' => $maxPlayers,
                'robot_count' => $robotCount,
                'robot_difficulty' => $difficulty,
            ]);

            $this->createHuman($room, $host, 0);

            for ($i = 0; $i < $robotCount; $i++) {
                $seat = ($maxPlayers - $robotCount) + $i;
                $this->createRobot($room, $seat, $difficulty ?? 'medium', $i);
            }

            return $room;
        });
    }

    /**
     * Seat a human user into a waiting room.
     */
    public function join(GameRoom $room, User $user): GamePlayer
    {
        if ($room->status !== 'waiting') {
            throw ValidationException::withMessages(['code' => 'This room is already in progress.']);
        }

        return DB::transaction(function () use ($room, $user) {
            $existing = $room->players()->where('user_id', $user->id)->first();
            if ($existing) {
                return $existing;
            }

            $humans = $room->players()->where('is_robot', false)->count();
            $maxHumans = $room->max_players - $room->robot_count;

            if ($humans >= $maxHumans) {
                throw ValidationException::withMessages(['code' => 'This room is full.']);
            }

            $seat = $this->firstFreeHumanSeat($room, $maxHumans);

            $player = $this->createHuman($room, $user, $seat);

            broadcast(new PlayerJoined($player, $room->code))->toOthers();

            return $player;
        });
    }

    /**
     * Remove a human from a waiting room. Closing the room when the host
     * leaves, or surrendering the seat otherwise.
     */
    public function leave(GameRoom $room, GamePlayer $player): void
    {
        DB::transaction(function () use ($room, $player) {
            broadcast(new PlayerLeft($player, $room->code))->toOthers();
            $player->delete();

            if ((int) $player->user_id === (int) $room->host_id) {
                $room->delete();
            }
        });
    }

    public function createRobot(GameRoom $room, int $seat, string $difficulty, int $index): GamePlayer
    {
        return $room->players()->create([
            'game_id' => null,
            'room_id' => $room->id,
            'user_id' => null,
            'name' => self::ROBOT_NAMES[$index] ?? ('Robot '.($index + 1)),
            'is_robot' => true,
            'robot_difficulty' => $difficulty,
            'color' => GamePlayer::COLORS[$seat],
            'seat' => $seat,
            'connected' => true,
        ]);
    }

    protected function createHuman(GameRoom $room, User $user, int $seat): GamePlayer
    {
        return $room->players()->create([
            'game_id' => null,
            'room_id' => $room->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'is_robot' => false,
            'robot_difficulty' => null,
            'color' => GamePlayer::COLORS[$seat],
            'seat' => $seat,
            'connected' => true,
        ]);
    }

    protected function firstFreeHumanSeat(GameRoom $room, int $maxHumans): int
    {
        $taken = $room->players()->where('is_robot', false)->pluck('seat')->all();
        for ($seat = 0; $seat < $maxHumans; $seat++) {
            if (! in_array($seat, $taken, true)) {
                return $seat;
            }
        }
        throw ValidationException::withMessages(['code' => 'No free seat in this room.']);
    }

    /**
     * A stable slot listing for the lobby UI.
     */
    public function slots(GameRoom $room): array
    {
        $room->load('players');
        $slots = [];
        for ($seat = 0; $seat < $room->max_players; $seat++) {
            $player = $room->players->first(fn ($p) => (int) $p->seat === $seat);
            $slots[] = [
                'seat' => $seat,
                'filled' => $player !== null,
                'player' => $player ? $player->only([
                    'id', 'user_id', 'name', 'is_robot', 'robot_difficulty', 'color', 'seat', 'connected',
                ]) : null,
            ];
        }
        return $slots;
    }

    public function uniqueCode(): string
    {
        do {
            $code = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 6));
        } while (GameRoom::where('code', $code)->exists());

        return $code;
    }
}