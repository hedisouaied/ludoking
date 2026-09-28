<?php

namespace Tests\Unit;

use App\Services\Ludo\Board;
use PHPUnit\Framework\TestCase;

class BoardTest extends TestCase
{
    public function test_start_tiles_per_color(): void
    {
        $this->assertSame(0, Board::startTile('red'));
        $this->assertSame(13, Board::startTile('green'));
        $this->assertSame(26, Board::startTile('yellow'));
        $this->assertSame(39, Board::startTile('blue'));
    }

    public function test_relative_progress_ring_and_home(): void
    {
        $this->assertSame(-1, Board::relativeProgress(-1, 'red'));
        $this->assertSame(0, Board::relativeProgress(0, 'red'));
        $this->assertSame(5, Board::relativeProgress(5, 'red'));
        $this->assertSame(1, Board::relativeProgress(14, 'green'));
        $this->assertSame(52, Board::relativeProgress(100, 'red'));
        $this->assertSame(56, Board::relativeProgress(104, 'red'));
        $this->assertSame(57, Board::relativeProgress(Board::FINISHED, 'red'));
        // wrap around the ring: tile 1 is 14 steps after blue's start (39)
        $this->assertSame(14, Board::relativeProgress(1, 'blue'));
        $this->assertSame(0, Board::relativeProgress(39, 'blue'));
    }

    public function test_can_enter_board_requires_six(): void
    {
        $this->assertFalse(Board::canEnterBoard(1));
        $this->assertFalse(Board::canEnterBoard(5));
        $this->assertTrue(Board::canEnterBoard(6));
    }

    public function test_base_token_enters_on_six_only(): void
    {
        $this->assertNull(Board::destination(-1, 1, 'red'));
        $this->assertNull(Board::destination(-1, 5, 'green'));
        $this->assertSame(0, Board::destination(-1, 6, 'red'));
        $this->assertSame(13, Board::destination(-1, 6, 'green'));
        $this->assertSame(39, Board::destination(-1, 6, 'blue'));
    }

    public function test_normal_movement_on_ring(): void
    {
        // red at tile 0, moving 4 -> start 0 + 4 = 4
        $this->assertSame(4, Board::destination(0, 4, 'red'));
        // green wraps past tile 51 back to tile 0: rel(51)=38, +1 = 39 -> 0
        $this->assertSame(0, Board::destination(51, 1, 'green'));
    }

    public function test_movement_enters_home_column(): void
    {
        // red at ring tile 48 (rel 48), roll 4 -> rel 52 -> tile 100
        $this->assertSame(100, Board::destination(48, 4, 'red'));
        // roll 6 -> rel 54 -> home column tile 102
        $this->assertSame(102, Board::destination(48, 6, 'red'));
        // roll 5 -> rel 53 -> home column tile 101
        $this->assertSame(101, Board::destination(48, 5, 'red'));
    }

    public function test_exact_roll_finishes_token(): void
    {
        // red rel 50, roll 7 impossible -> starting rel 50 requires two moves.
        // Reaching home: rel 51 + 6 = 57 -> FINISHED
        $this->assertSame(Board::FINISHED, Board::destination(51, 6, 'red'));
    }

    public function test_overshoot_is_invalid(): void
    {
        // token at rel 55 (tile 103), rolling 3 overshoots 57 -> null
        $this->assertNull(Board::destination(103, 3, 'red'));
        // at rel 56 (tile 104) rolling any number overshoots except exact? exact=1 -> 57
        $this->assertSame(Board::FINISHED, Board::destination(104, 1, 'red'));
        $this->assertNull(Board::destination(104, 2, 'red'));
    }

    public function test_invalid_dice_values(): void
    {
        $this->assertNull(Board::destination(0, 0, 'red'));
        $this->assertNull(Board::destination(0, 7, 'red'));
        $this->assertNull(Board::destination(Board::FINISHED, 6, 'red'));
    }

    public function test_safe_tiles(): void
    {
        foreach (Board::SAFE_TILES as $tile) {
            $this->assertTrue(Board::isSafe($tile), "tile {$tile} should be safe");
        }
        $this->assertFalse(Board::isSafe(1));
        $this->assertFalse(Board::isSafe(12));
        $this->assertFalse(Board::isSafe(15));
    }
}