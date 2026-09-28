<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained('games')->cascadeOnDelete();
            $table->foreignId('game_player_id')->constrained('game_players')->cascadeOnDelete();
            $table->unsignedTinyInteger('token_number')->default(0);
            $table->integer('position')->default(-1); // -1 base | 0..51 ring | 100..104 home | 105 finished
            $table->string('status')->default('base'); // base | active | home | finished
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_tokens');
    }
};