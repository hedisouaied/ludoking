<?php

namespace App\Services\Ludo;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameToken;

class LudoAIService
{
    public const DIFFICULTIES = ['easy', 'medium', 'hard'];

    public function __construct(private GameEngine $engine)
    {
    }

    /**
     * Choose a move for the given player. The move is returned with the
     * same shape as GameEngine::getValidMoves() entries (plus 'score').
     */
    public function chooseMove(Game $game, GamePlayer $player): array
    {
        $moves = $this->engine->getValidMoves($game, $player);
        if (empty($moves)) {
            return [];
        }

        $difficulty = $player->robot_difficulty ?: 'medium';

        if ($difficulty === 'easy') {
            return $this->pickRandom($moves);
        }

        $scored = array_map(fn ($m) => $m + ['score' => $this->evaluateMove($game, $player, $m)], $moves);

        if ($difficulty === 'medium') {
            // weighted random: prefer good moves, occasionally suboptimal
            return $this->weightedPick($moves, $scored);
        }

        // hard: pick the best (with a small randomness between near-equal moves)
        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);
        $best = $scored[0];
        $near = array_values(array_filter($scored, fn ($m) => $m['score'] >= $best['score'] - 2));
        return $near[array_rand($near)];
    }

    protected function pickRandom(array $moves): array
    {
        return $moves[array_rand($moves)];
    }

    protected function weightedPick(array $moves, array $scored): array
    {
        $weights = array_map(fn ($m) => max(1, $m['score'] - count($moves) * 2), $scored);
        $total = array_sum($weights);
        $roll = random_int(1, max(1, $total));
        $acc = 0;
        foreach ($moves as $i => $move) {
            $acc += $weights[$i];
            if ($roll <= $acc) {
                return $move;
            }
        }
        return $moves[array_rand($moves)];
    }

    /**
     * Score a move from the perspective of the moving player (higher = better).
     * Score components:
     *  - +60 capture
     *  - +50 finish a token
     *  - +25 enter board
     *  - + (progress toward home) * 4
     *  - +12 landing on a safe tile
     *  - - (risk: opponents within 6 behind on an unsafe tile) * 20
     *  - - splitting a stacked pair when only one token on the stack remains
     */
    public function evaluateMove(Game $game, GamePlayer $player, array $move): int
    {
        $score = 0;
        $to = $move['to'];
        $from = $move['from'];
        $dice = $move['dice'];

        if (! empty($move['captures'])) {
            $score += 60 * count($move['captures']);
        }

        if ($move['finished']) {
            $score += 50;
        }

        if ($move['enteredBoard']) {
            $score += 25;
        }

        $start = Board::startTile($player->color);
        $rel = Board::relativeProgress($to, $player->color);
        $score += max(0, $rel) * 4;

        if ($to >= 0 && $to < Board::RING_CELLS && Board::isSafe($to)) {
            $score += 12;
        }

        // risk: how many opponent tokens could capture this destination on their next roll
        if ($to >= 0 && $to < Board::RING_CELLS) {
            $threats = 0;
            foreach ($game->players as $opponent) {
                if ($opponent->id === $player->id) {
                    continue;
                }
                foreach ($opponent->tokens as $ot) {
                    $p = $ot->position;
                    if ($p < 0 || $p >= Board::RING_CELLS || $ot->status === GameToken::STATUS_FINISHED) {
                        continue;
                    }
                    $distance = ($to - $p + Board::RING_CELLS) % Board::RING_CELLS;
                    if ($distance >= 1 && $distance <= 6 && ! Board::isSafe($to)) {
                        $threats++;
                    }
                }
            }
            $score -= max(0, $threats) * 18;
        }

        // encourage keeping tokens together defensively (hard mode nuance)
        $ownOnTile = $game->tokens()->where('game_player_id', $player->id)->where('position', $to)->where('id', '!=', $move['token']->id)->count();
        $ownOnFrom = $game->tokens()->where('game_player_id', $player->id)->where('position', $from)->count();
        if ($ownOnFrom >= 2 && $ownOnTile === 0) {
            $score -= 6; // splitting a pair exposes the trailing token
        }

        return $score;
    }

    /**
     * How many tiles ahead the destination lies from an opponent token,
     * if and only if that opponent could reach the destination in one move.
     */
    protected function tileAheadOf(GamePlayer $opponent, GameToken $ot, GamePlayer $player, int $dest): int
    {
        $oppTile = $ot->position;
        return ($dest - $oppTile + Board::RING_CELLS) % Board::RING_CELLS;
    }

    public function chooseToken(array $moves, ?int $preferred = null): int
    {
        foreach ($moves as $m) {
            if ($m['token']->id === $preferred) {
                return $preferred;
            }
        }
        return $moves[array_rand($moves)]['token']->id;
    }
}