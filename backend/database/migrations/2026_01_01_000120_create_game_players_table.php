<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained('games')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->boolean('is_robot')->default(false);
            $table->string('robot_difficulty')->nullable(); // easy | medium | hard
            $table->string('color'); // red | green | yellow | blue
            $table->unsignedTinyInteger('seat')->default(0);
            $table->boolean('connected')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_players');
    }
};