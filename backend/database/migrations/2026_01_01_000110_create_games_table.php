<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->nullable()->constrained('game_rooms')->cascadeOnDelete();
            $table->string('status')->default('waiting'); // waiting | playing | finished
            $table->unsignedBigInteger('current_player_id')->nullable()->index();
            $table->unsignedInteger('current_turn')->default(0);
            $table->unsignedBigInteger('winner_id')->nullable()->index();
            $table->unsignedTinyInteger('dice_value')->nullable();
            $table->string('turn_phase')->default('awaiting_roll'); // awaiting_roll | awaiting_move
            $table->timestamp('turn_started_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};