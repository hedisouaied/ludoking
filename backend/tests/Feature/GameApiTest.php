<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GameToken;
use App\Services\Ludo\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\CreatesLudoGames;
use Tests\TestCase;

class GameApiTest extends TestCase
{
    use RefreshDatabase, CreatesLudoGames;

    public function test_unauthenticated_game_access_is_rejected(): void
    {
        $game = $this->startWithTwoHumans();

        $this->getJson("/api/games/{$game->id}")->assertStatus(401);
        $this->postJson("/api/games/{$game->id}/roll")->assertStatus(401);
        $this->postJson("/api/games/{$game->id}/move")->assertStatus(401);
    }

    public function test_happy_path_roll_and_move(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        Sanctum::actingAs($this->host);

        // force dice => 6 (enter board), then non-six to end turn
        $this->forceDice(6);

        $roll = $this->postJson("/api/games/{$game->id}/roll");
        $roll->assertOk()->assertJsonPath('dice', 6);
        $this->assertSame(Game::PHASE_MOVE, $roll->json('game.turn_phase'));

        $token = $hostPlayer->tokens()->where('token_number', 0)->first();

        $move = $this->postJson("/api/games/{$game->id}/move", [
            'token_id' => $token->id,
            'dice' => 6,
        ]);
        $move->assertOk()->assertJsonPath('game.players.0.tokens.0.position', 0);

        $this->assertDatabaseHas('game_moves', [
            'game_id' => $game->id,
            'token_id' => $token->id,
            'to_position' => 0,
        ]);
    }

    public function test_roll_and_move_with_manipulated_dice_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        Sanctum::actingAs($this->host);

        $this->forceDice(6);
        $this->postJson("/api/games/{$game->id}/roll")->assertOk();

        $token = $hostPlayer->tokens()->where('token_number', 0)->first();

        // Client sends dice=5 even though server rolled 6.
        $this->postJson("/api/games/{$game->id}/move", ['token_id' => $token->id, 'dice' => 5])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Dice value mismatch.');
    }

    public function test_moving_token_belonging_to_another_player_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $other = $this->gamePlayer($game, 1);
        Sanctum::actingAs($this->host);

        $this->forceDice(6);
        $this->postJson("/api/games/{$game->id}/roll")->assertOk();

        $otherToken = $other->tokens()->where('token_number', 0)->first();

        $this->postJson("/api/games/{$game->id}/move", ['token_id' => $otherToken->id, 'dice' => 6])
            ->assertStatus(422);
    }

    public function test_moving_out_of_turn_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        Sanctum::actingAs($this->friend);

        // friend (green, seat 1) tries to act on host's turn.
        $this->postJson("/api/games/{$game->id}/roll")->assertStatus(422);

        $otherToken = $hostPlayer->tokens()->where('token_number', 0)->first();
        $this->postJson("/api/games/{$game->id}/move", ['token_id' => $otherToken->id, 'dice' => 6])
            ->assertStatus(422);
    }

    public function test_rolling_twice_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        Sanctum::actingAs($this->host);

        $this->forceDice(6);
        $this->postJson("/api/games/{$game->id}/roll")->assertOk();

        $this->postJson("/api/games/{$game->id}/roll")->assertStatus(422);
    }

    public function test_full_game_via_api_until_winner(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        $greenPlayer = $this->humanPlayer($game, 1);
        Sanctum::actingAs($this->host);

        // Give host all-but-one finished, remaining on 104; roll 1 and move -> win.
        foreach ([0, 1, 2] as $i) {
            $this->tokenFor($hostPlayer, $i)->forceFill(['position' => Board::FINISHED, 'status' => GameToken::STATUS_FINISHED])->save();
        }
        $this->tokenFor($hostPlayer, 3)->forceFill(['position' => 104, 'status' => GameToken::STATUS_HOME])->save();

        $this->forceDice(1);
        $this->postJson("/api/games/{$game->id}/roll")->assertOk();

        $lastToken = $this->tokenFor($hostPlayer, 3);
        $this->postJson("/api/games/{$game->id}/move", ['token_id' => $lastToken->id, 'dice' => 1])
            ->assertOk()
            ->assertJsonPath('game.status', 'finished')
            ->assertJsonPath('game.winner_id', $hostPlayer->id);
    }

    public function test_state_endpoint_restores_reconnection(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        $hostPlayer->forceFill(['connected' => false])->save();

        Sanctum::actingAs($this->host);

        $response = $this->getJson("/api/games/{$game->id}");
        $response->assertOk()
            ->assertJsonPath('game.status', 'playing')
            ->assertJsonPath('game.players.0.connected', true);

        $this->assertDatabaseHas('game_players', ['id' => $hostPlayer->id, 'connected' => true]);
    }

    public function test_disconnect_and_reconnect_lifecycle(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);

        Sanctum::actingAs($this->host);
        $this->postJson("/api/games/{$game->id}/disconnected")->assertOk();
        $this->assertDatabaseHas('game_players', ['id' => $hostPlayer->id, 'connected' => false]);

        $this->getJson("/api/games/{$game->id}")->assertOk();
        $this->assertDatabaseHas('game_players', ['id' => $hostPlayer->id, 'connected' => true]);
    }

    public function test_replay_old_action_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);
        Sanctum::actingAs($this->host);

        $this->forceDice(6);
        $this->postJson("/api/games/{$game->id}/roll")->assertOk();

        $this->tokenFor($hostPlayer, 0)->forceFill(['position' => 0, 'status' => GameToken::STATUS_ACTIVE])->save();
        // Now turn moved away in DB; replaying old roll is invalid because dice is null.
        $game->forceFill(['dice_value' => null, 'turn_phase' => Game::PHASE_ROLL])->save();

        $this->postJson("/api/games/{$game->id}/move", ['token_id' => $this->tokenFor($hostPlayer, 0)->id, 'dice' => 6])
            ->assertStatus(422);
    }

    public function test_game_state_exposes_valid_moves_only_for_current_player(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $hostPlayer = $this->humanPlayer($game);

        $game->forceFill(['dice_value' => 6, 'turn_phase' => Game::PHASE_MOVE])->save();

        // viewer = current player sees valid_moves
        Sanctum::actingAs($this->host);
        $this->getJson("/api/games/{$game->id}")
            ->assertOk()
            ->assertJsonCount(4, 'game.valid_moves');

        // viewer = non-current player sees no moves
        Sanctum::actingAs($this->friend);
        $this->getJson("/api/games/{$game->id}")
            ->assertOk()
            ->assertJsonCount(0, 'game.valid_moves');
    }
}