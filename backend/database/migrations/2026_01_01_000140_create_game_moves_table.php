<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_moves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained('games')->cascadeOnDelete();
            $table->foreignId('game_player_id')->constrained('game_players')->cascadeOnDelete();
            $table->foreignId('token_id')->constrained('game_tokens')->cascadeOnDelete();
            $table->unsignedTinyInteger('dice_value');
            $table->integer('from_position');
            $table->integer('to_position');
            $table->foreignId('captured_token_id')->nullable()->constrained('game_tokens')->nullOnDelete();
            $table->timestamps();

            $table->index(['game_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_moves');
    }
};