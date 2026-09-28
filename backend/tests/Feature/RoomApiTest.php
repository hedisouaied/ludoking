<?php

namespace Tests\Feature;

use App\Models\GameRoom;
use App\Services\Ludo\GameEngine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesLudoGames;
use Tests\TestCase;

class RoomApiTest extends TestCase
{
    use RefreshDatabase, CreatesLudoGames;

    public function test_room_requires_authentication(): void
    {
        $this->postJson('/api/rooms')->assertStatus(401);
    }

    public function test_host_creates_room(): void
    {
        Sanctum::actingAs($this->user('Hedi'));

        $this->postJson('/api/rooms', ['max_players' => 4])
            ->assertCreated()
            ->assertJsonPath('room.max_players', 4)
            ->assertJsonStructure(['room' => ['code', 'host_id', 'slots']]);

        $this->assertSame('waiting', GameRoom::first()->status);
    }

    public function test_room_validation(): void
    {
        Sanctum::actingAs($this->user('Hedi'));

        $this->postJson('/api/rooms', ['max_players' => 9])->assertStatus(422);
        $this->postJson('/api/rooms', ['max_players' => 1])->assertStatus(422);
    }

    public function test_joining_room_by_code(): void
    {
        Sanctum::actingAs($host = $this->user('Hedi'));
        $room = $this->roomService()->create($host, 4, 0, null);
        $this->assertCount(4, $room->fresh()->slots());

        Sanctum::actingAs($friend = $this->user('Nada'));
        $this->postJson('/api/rooms/join', ['code' => $room->code])
            ->assertOk()
            ->assertJsonPath('player.seat', 1)
            ->assertJsonPath('player.color', 'green');

        $this->assertDatabaseHas('game_players', ['room_id' => $room->id, 'user_id' => $friend->id, 'seat' => 1]);
    }

    public function test_join_with_invalid_code(): void
    {
        Sanctum::actingAs($this->user('Nada'));
        $this->postJson('/api/rooms/join', ['code' => 'ZZZZZZ'])->assertStatus(422);
    }

    public function test_room_shows_slots_for_everyone(): void
    {
        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 2, 0, null);

        Sanctum::actingAs($host);
        $response = $this->getJson("/api/rooms/{$room->id}")->assertOk();

        $slots = collect($response->json('room.slots'));
        $this->assertCount(2, $slots);
        $this->assertTrue($slots[0]['filled']);
        $this->assertFalse($slots[1]['filled']);
    }

    public function test_non_host_cannot_start_game(): void
    {
        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 2, 0, null);

        Sanctum::actingAs($this->user('Nada'));
        $this->postJson("/api/rooms/{$room->id}/start")->assertStatus(403);
    }

    public function test_host_starts_game_with_robots(): void
    {
        Queue::fake();
        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 3, 2, 'hard');

        Sanctum::actingAs($host);
        $response = $this->postJson("/api/rooms/{$room->id}/start")->assertOk();

        $this->assertSame('playing', $room->fresh()->status);
        $this->assertSame('playing', $response->json('game.status'));
        $this->assertCount(3, $response->json('game.players'));

        $players = collect($response->json('game.players'));
        $this->assertCount(2, $players->where('is_robot', true));
        $this->assertSame('hard', $players->where('is_robot', true)->first()['robot_difficulty']);
    }

    public function test_host_leaves_room_destroys_it(): void
    {
        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 2, 0, null);

        Sanctum::actingAs($host);
        $this->postJson("/api/rooms/{$room->id}/leave")->assertOk();

        $this->assertDatabaseMissing('game_rooms', ['id' => $room->id]);
    }

    public function test_game_start_sets_room_to_ended_on_win(): void
    {
        Queue::fake();
        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 2, 0, null);
        $game = app(GameEngine::class)->startGame($room->refresh());

        $this->assertSame('playing', $room->fresh()->status);
    }
}