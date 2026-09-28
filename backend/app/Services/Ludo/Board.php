<?php

namespace App\Services\Ludo;

/**
 * Pure Ludo board model and rules. No database access.
 *
 * Board: 52-cell clockwise ring. Each player enters at their START tile.
 * A token travels 57 squares from its start tile to finish:
 *   rel 0..51   -> ring tiles
 *   rel 52..56  -> home column cells (encoded 100..104)
 *   rel 57      -> home / finished (encoded 105)
 * Bases are encoded -1.
 */
class Board
{
    public const RING_CELLS = 52;

    public const FINISHED = 105;
    public const HOME_BASE = 100; // home column cell 0

    public const COLORS = ['red', 'green', 'yellow', 'blue'];

    public const START_TILES = [
        'red' => 0,
        'green' => 13,
        'yellow' => 26,
        'blue' => 39,
    ];

    /** Each player's start tile + the tile 8 after it. */
    public const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];

    public static function startTile(string $color): int
    {
        return self::START_TILES[$color];
    }

    public static function isSafe(int $tile): bool
    {
        return in_array($tile, self::SAFE_TILES, true);
    }

    /**
     * Relative progress (0..57) of a token position for a player color.
     * -1 (base) => -1, ring tiles => (p - start) mod 52,
     * 100..104 => 52..56, 105 => 57.
     */
    public static function relativeProgress(int $position, string $color): int
    {
        if ($position === -1) {
            return -1;
        }
        if ($position === self::FINISHED) {
            return 57;
        }
        if ($position >= self::HOME_BASE) {
            return 52 + ($position - self::HOME_BASE);
        }
        $start = self::startTile($color);
        return (($position - $start) % self::RING_CELLS + self::RING_CELLS) % self::RING_CELLS;
    }

    /**
     * Absolute position after moving `rel` steps is not needed; we compute
     * token destination from a relative offset.
     */

    /**
     * Can a token in the base leave with this dice value? Classic rule: needs 6.
     */
    public static function canEnterBoard(int $dice): bool
    {
        return $dice === 6;
    }

    /**
     * Destination position for a token with the given position and dice roll.
     * Returns the absolute destination (or FINISHED), or null when the move
     * is invalid (overshoot or cannot leave base).
     */
    public static function destination(int $position, int $dice, string $color): ?int
    {
        if ($dice < 1 || $dice > 6) {
            return null;
        }

        if ($position === -1) {
            return self::canEnterBoard($dice) ? self::startTile($color) : null;
        }

        if ($position === self::FINISHED) {
            return null;
        }

        $rel = self::relativeProgress($position, $color);
        if ($rel < 0) {
            return null;
        }

        $newRel = $rel + $dice;
        if ($newRel > 57) {
            return null;
        }

        if ($newRel >= 52) {
            // home column (52..56) or home (57)
            return $newRel === 57 ? self::FINISHED : self::HOME_BASE + ($newRel - 52);
        }

        // still on the ring
        $start = self::startTile($color);
        return ($start + $newRel) % self::RING_CELLS;
    }

    /**
     * Does a moving token land exactly on the given tile (same color start
     * considered, everything modulo the ring).
     */
    public static function toHomeStep(int $position): int
    {
        return $position >= self::HOME_BASE && $position < self::FINISHED
            ? $position - self::HOME_BASE + 1
            : 0;
    }
}