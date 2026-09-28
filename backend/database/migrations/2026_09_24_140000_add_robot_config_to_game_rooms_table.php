<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_rooms', function (Blueprint $table) {
            $table->unsignedTinyInteger('robot_count')->default(0);
            $table->string('robot_difficulty')->nullable(); // easy | medium | hard
        });
    }

    public function down(): void
    {
        Schema::table('game_rooms', function (Blueprint $table) {
            $table->dropColumn(['robot_count', 'robot_difficulty']);
        });
    }
};