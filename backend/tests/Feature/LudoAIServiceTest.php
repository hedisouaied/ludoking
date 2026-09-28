<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GameToken;
use App\Services\Ludo\GameEngine;
use App\Services\Ludo\LudoAIService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Concerns\CreatesLudoGames;
use Tests\TestCase;

class LudoAIServiceTest extends TestCase
{
    use RefreshDatabase, CreatesLudoGames;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();

        $host = $this->user('Hedi');
        $room = $this->roomService()->create($host, 4, 3, 'hard');
        $this->game = $this->engine()->startGame($room->refresh());
    }

    public function test_ai_always_returns_a_valid_move(): void
    {
        $robot = $this->game->players()->where('is_robot', true)->first();
        $ai = app(LudoAIService::class);
        $engine = app(GameEngine::class);

        // force a roll of 6 (enter board) for the robot
        $this->game->forceFill(['dice_value' => 6, 'turn_phase' => Game::PHASE_MOVE])->save();

        $choice = $ai->chooseMove($this->game->fresh(), $robot);
        $moves = $engine->getValidMoves($this->game->fresh(), $robot, 6);

        $this->assertNotEmpty($moves);
        $this->assertContains($choice['to'], array_map(fn ($m) => $m['to'], $moves));
    }

    public function test_ai_never_receives_hidden_or_future_dice(): void
    {
        $robot = $this->game->players()->where('is_robot', true)->first();
        $ai = app(LudoAIService::class);

        // No dice rolled yet: engine returns no moves, AI must respect that.
        $choice = $ai->chooseMove($this->game->fresh(), $robot);

        $this->assertSame([], $choice);
    }

    public function test_ai_prefers_capture_opportunities(): void
    {
        $robot = $this->game->players()->where('is_robot', true)->first();
        $human = $this->game->players()->where('is_robot', false)->first();
        $robot->forceFill(['seed' => null])->save();

        // Give the robot a token at tile 3 and a human token at tile 6 (non-safe).
        $robotToken = $robot->tokens()->where('token_number', 0)->first();
        $humanToken = $human->tokens()->where('token_number', 0)->first();

        $robotToken->forceFill(['position' => 3, 'status' => GameToken::STATUS_ACTIVE])->save();
        $humanToken->forceFill(['position' => 6, 'status' => GameToken::STATUS_ACTIVE])->save();

        // Give every non-6 robot token a simple ring position so only the
        // entering vs capture decision matters.
        foreach ($robot->tokens as $t) {
            if ($t->id === $robotToken->id) {
                continue;
            }
            $t->forceFill(['position' => 20 + $t->token_number, 'status' => GameToken::STATUS_ACTIVE])->save();
        }

        $this->game->forceFill(['dice_value' => 3, 'turn_phase' => Game::PHASE_MOVE])->save();

        $ai = app(LudoAIService::class);
        $choice = $ai->chooseMove($this->game->fresh(), $robot);

        $this->assertNotEmpty($choice);
        $this->assertSame(6, $choice['to'], 'hard/medium AI should capture when available');
        $this->assertNotEmpty($choice['captures']);
    }

    public function test_hard_ai_avoids_danger_square_when_alternative_exists(): void
    {
        $robot = $this->game->players()->where('is_robot', true)->first();
        $human = $this->game->players()->where('is_robot', false)->first();
        $robot->forceFill(['robot_difficulty' => 'hard'])->save();

        // Robot token A at tile 2 (rolling 4 lands on 6, next to another human token on 7)
        // Robot token B at tile 30 with a wide-open path ahead, rolling 2 -> 32.
        $tokenA = $robot->tokens()->where('token_number', 0)->first();
        $tokenB = $robot->tokens()->where('token_number', 1)->first();
        $humanToken = $human->tokens()->where('token_number', 0)->first();

        $tokenA->forceFill(['position' => 2, 'status' => GameToken::STATUS_ACTIVE])->save();
        $tokenB->forceFill(['position' => 30, 'status' => GameToken::STATUS_ACTIVE])->save();
        // A dangerous opponent positioned to capture 6: place human at 12 (distance 6 behind).
        $humanToken->forceFill(['position' => 12, 'status' => GameToken::STATUS_ACTIVE])->save();

        foreach ($robot->tokens as $t) {
            if ($t->id === $tokenA->id || $t->id === $tokenB->id) {
                continue;
            }
            $t->forceFill(['position' => -1, 'status' => GameToken::STATUS_BASE])->save();
        }

        // dice 4 for tokenA -> 6 (dangerous), dice 4 for tokenB? tokenB would land at 34 (61? no) 
        // Give distinct moves by rolling 4: A 2+4=6, B 30+4=34 (safe? 34 is a safe tile).
        $this->game->forceFill(['dice_value' => 4, 'turn_phase' => Game::PHASE_MOVE])->save();

        $ai = app(LudoAIService::class);
        $choice = $ai->chooseMove($this->game->fresh(), $robot);

        $this->assertNotEmpty($choice);
        // The AI should not land a token on a square an opponent threatens (6)
        // when a clearly better tile exists (tokenB landing on safe tile 34).
        $this->assertFalse($choice['to'] === 6 && $choice['token']->id === $tokenA->id);
    }

    public function test_robot_turn_job_is_dispatched_for_robot_player(): void
    {
        $host = $this->user('Alice');
        $room = $this->roomService()->create($host, 2, 1, 'medium');
        $this->engine()->startGame($room->refresh());

        $current = $room->game->fresh()->currentPlayer()->first();

        $this->assertTrue($current->isRobot());
        Queue::assertPushed(\App\Jobs\RunRobotTurn::class);
    }

    public function test_choose_token_prefers_selected(): void
    {
        $robot = $this->game->players()->where('is_robot', true)->first();
        $ai = app(LudoAIService::class);
        $this->game->forceFill(['dice_value' => 6, 'turn_phase' => Game::PHASE_MOVE])->save();
        $moves = app(GameEngine::class)->getValidMoves($this->game->fresh(), $robot, 6);

        $preferred = $moves[2]['token']->id;
        $chosen = $ai->chooseToken($moves, $preferred);

        $this->assertSame($preferred, $chosen);
    }
}