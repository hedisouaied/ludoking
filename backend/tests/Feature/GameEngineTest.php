<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GameToken;
use App\Services\Ludo\Board;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\CreatesLudoGames;
use Tests\TestCase;

class GameEngineTest extends TestCase
{
    use RefreshDatabase, CreatesLudoGames;

    public function test_start_game_assigns_colors_and_tokens(): void
    {
        $game = $this->startWithTwoHumans();

        $this->assertSame(Game::STATUS_PLAYING, $game->status);
        $this->assertSame(['red', 'green'], $game->players()->orderBy('seat')->pluck('color')->all());
        $this->assertSame('playing', $game->room->status);

        foreach ($game->players as $player) {
            $this->assertCount(4, $player->tokens);
            foreach ($player->tokens as $token) {
                $this->assertSame(-1, $token->position);
                $this->assertSame(GameToken::STATUS_BASE, $token->status);
            }
        }

        $first = $game->players()->orderBy('seat')->first();
        $this->assertSame($first->id, $game->current_player_id);
        $this->assertSame(Game::PHASE_ROLL, $game->turn_phase);
    }

    public function test_cannot_start_with_single_player(): void
    {
        $host = $this->user('Only me');
        $room = $this->roomService()->create($host, 2, 0, null);

        $this->expectException(\DomainException::class);
        $this->engine()->startGame($room);
    }

    public function test_roll_transitions_to_move_phase_with_moves(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $player = $this->gamePlayer($game, 0);

        // Force a 6 so a base token can enter the board.
        $this->forceDice(6);

        $result = $this->engine()->roll($game->fresh());

        $this->assertSame(6, $result['value']);
        $this->assertFalse($result['skipped']);
        $this->assertSame(Game::PHASE_MOVE, $game->fresh()->turn_phase);
        $this->assertSame(6, $game->fresh()->dice_value);

        $moves = $this->engine()->getValidMoves($game->fresh(), $player, 6);
        $this->assertCount(4, $moves);
        foreach ($moves as $move) {
            $this->assertSame($player->id, $move['token']->game_player_id);
            $this->assertSame(0, $move['to']);
            $this->assertSame(-1, $move['from']);
            $this->assertTrue($move['enteredBoard']);
        }
    }

    public function test_roll_with_no_moves_auto_advances_turn(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $first = $this->gamePlayer($game, 0);
        $second = $this->gamePlayer($game, 1);

        // Non-6 with every token in base => no moves.
        $this->forceDice(3);

        $result = $this->engine()->roll($game->fresh());

        $this->assertTrue($result['skipped']);
        $this->assertSame(3, $result['value']);
        $game = $game->fresh();
        $this->assertSame(Game::PHASE_ROLL, $game->turn_phase);
        $this->assertNull($game->dice_value);
        $this->assertSame($second->id, $game->current_player_id);
        $this->assertSame(1, $game->current_turn);
    }

    public function test_roll_during_move_phase_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $this->forceDice(6);

        $this->engine()->roll($game->fresh());

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('A token must be moved before rolling again.');
        $this->engine()->roll($game->fresh());
    }

    public function test_token_can_move_with_exact_roll_into_home(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $player = $this->gamePlayer($game, 0);
        $token = $this->tokenFor($player);

        // Put the token 3 tiles before home: rel 54 -> tile 102; roll 3 -> 105.
        $token->forceFill(['position' => 102, 'status' => GameToken::STATUS_HOME])->save();
        $game->forceFill(['dice_value' => 3, 'turn_phase' => Game::PHASE_MOVE])->save();

        $move = $this->engine()->moveToken($game->fresh(), $player, $token->fresh(), 3);

        $this->assertSame(102, $move->from_position);
        $this->assertSame(Board::FINISHED, $move->to_position);
        $this->assertSame(GameToken::STATUS_FINISHED, $token->fresh()->status);
    }

    public function test_overshooting_destination_is_invalid(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $player = $this->gamePlayer($game, 0);
        $token = $this->tokenFor($player);

        $token->forceFill(['position' => 104, 'status' => GameToken::STATUS_HOME])->save();
        $game->forceFill(['dice_value' => 2, 'turn_phase' => Game::PHASE_MOVE])->save();

        $this->assertEmpty($this->engine()->getValidMoves($game->fresh(), $player, 2));

        $this->expectException(\DomainException::class);
        $this->engine()->moveToken($game->fresh(), $player, $token->fresh(), 2);
    }

    public function test_moving_wrong_dice_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $player = $this->gamePlayer($game, 0);
        $token = $this->tokenFor($player);

        $game->forceFill(['dice_value' => 4, 'turn_phase' => Game::PHASE_MOVE])->save();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('Dice value mismatch.');
        $this->engine()->moveToken($game->fresh(), $player, $token, 5);
    }

    public function test_moving_out_of_turn_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $second = $this->gamePlayer($game, 1);
        $token = $this->tokenFor($second);

        $this->forceDice(6);
        $this->engine()->roll($game->fresh());

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('It is not your turn.');
        $this->engine()->moveToken($game->fresh(), $second, $token, 6);
    }

    public function test_move_before_roll_is_rejected(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $player = $this->gamePlayer($game, 0);
        $token = $this->tokenFor($player);

        $this->expectException(\DomainException::class);
        $this->engine()->moveToken($game->fresh(), $player, $token, 6);
    }

    public function test_capturing_opponent_sends_token_to_base(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);
        $green = $this->gamePlayer($game, 1);

        // red token on ring tile 4; green token on 6 (non-safe), red rolls 2 => lands 6.
        $redToken = $this->tokenFor($red);
        $greenToken = $this->tokenFor($green);

        $redToken->forceFill(['position' => 4, 'status' => GameToken::STATUS_ACTIVE])->save();
        $greenToken->forceFill(['position' => 6, 'status' => GameToken::STATUS_ACTIVE])->save();

        $game->forceFill(['dice_value' => 2, 'turn_phase' => Game::PHASE_MOVE])->save();

        $move = $this->engine()->moveToken($game->fresh(), $red, $redToken->fresh(), 2);

        $this->assertSame(6, $move->to_position);
        $this->assertSame($greenToken->id, $move->captured_token_id);
        $this->assertSame(-1, $greenToken->fresh()->position);
        $this->assertSame(GameToken::STATUS_BASE, $greenToken->fresh()->status);
    }

    public function test_safe_tiles_prevent_capture(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);
        $green = $this->gamePlayer($game, 1);

        $redToken = $this->tokenFor($red);
        $greenToken = $this->tokenFor($green);

        // tile 13 is green's safe start; red at 11 rolling 2 would arrive on 13.
        $redToken->forceFill(['position' => 11, 'status' => GameToken::STATUS_ACTIVE])->save();
        $greenToken->forceFill(['position' => 13, 'status' => GameToken::STATUS_ACTIVE])->save();

        $game->forceFill(['dice_value' => 2, 'turn_phase' => Game::PHASE_MOVE])->save();

        $move = $this->engine()->moveToken($game->fresh(), $red, $redToken->fresh(), 2);

        $this->assertSame(13, $move->to_position);
        $this->assertNull($move->captured_token_id);
        $this->assertNotSame(-1, $greenToken->fresh()->position);
    }

    public function test_six_grants_extra_turn(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);

        $this->forceDice(6);
        $this->engine()->roll($game->fresh());

        $redToken = $this->tokenFor($red);
        $this->engine()->moveToken($game->fresh(), $red, $redToken, 6);

        $game = $game->fresh();
        $this->assertSame($red->id, $game->current_player_id);
        $this->assertSame(Game::PHASE_ROLL, $game->turn_phase);
        $this->assertNull($game->dice_value);
    }

    public function test_turn_changes_after_non_six(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);
        $green = $this->gamePlayer($game, 1);
        $redToken = $this->tokenFor($red);

        // red token already on the board, roll 2, move, then turn goes to green.
        $redToken->forceFill(['position' => 5, 'status' => GameToken::STATUS_ACTIVE])->save();
        $game->forceFill(['dice_value' => 2, 'turn_phase' => Game::PHASE_MOVE])->save();

        $this->engine()->moveToken($game->fresh(), $red, $redToken->fresh(), 2);

        $game = $game->fresh();
        $this->assertSame($green->id, $game->current_player_id);
        $this->assertSame(Game::PHASE_ROLL, $game->turn_phase);
        $this->assertSame(1, $game->current_turn);
    }

    public function test_winner_is_declared_when_all_tokens_finish(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);

        // three tokens already finished; last one on home column tile 104.
        $last = $this->tokenFor($red, 3);
        $last->forceFill(['position' => 104, 'status' => GameToken::STATUS_HOME])->save();
        foreach ([0, 1, 2] as $i) {
            $this->tokenFor($red, $i)->forceFill(['position' => Board::FINISHED, 'status' => GameToken::STATUS_FINISHED])->save();
        }

        $game->forceFill(['dice_value' => 1, 'turn_phase' => Game::PHASE_MOVE])->save();

        $this->engine()->moveToken($game->fresh(), $red, $last->fresh(), 1);

        $game = $game->fresh();
        $this->assertSame(Game::STATUS_FINISHED, $game->status);
        $this->assertSame($red->id, $game->winner_id);
        $this->assertSame('ended', $game->room->fresh()->status);
    }

    public function test_dice_rolls_are_within_range(): void
    {
        $engine = $this->engine();
        for ($i = 0; $i < 100; $i++) {
            $value = $engine->rollDice();
            $this->assertGreaterThanOrEqual(1, $value);
            $this->assertLessThanOrEqual(6, $value);
        }
    }

    public function test_cannot_move_after_game_finished(): void
    {
        Queue::fake();
        $game = $this->startWithTwoHumans();
        $red = $this->gamePlayer($game, 0);

        $this->engine()->rollDice(); // satisfies none
        $last = $this->tokenFor($red, 3);
        $last->forceFill(['position' => 104, 'status' => GameToken::STATUS_HOME])->save();
        foreach ([0, 1, 2] as $i) {
            $this->tokenFor($red, $i)->forceFill(['position' => Board::FINISHED, 'status' => GameToken::STATUS_FINISHED])->save();
        }
        $game->forceFill(['dice_value' => 1, 'turn_phase' => Game::PHASE_MOVE])->save();
        $this->engine()->moveToken($game->fresh(), $red, $last->fresh(), 1);

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('The game is not in progress.');
        $this->engine()->roll($game->fresh());
    }
}