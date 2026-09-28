<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_players', function (Blueprint $table) {
            $table->dropForeign(['game_id']);
            $table->foreignId('game_id')->nullable()->change()->constrained('games')->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->after('game_id')->constrained('game_rooms')->nullOnDelete();

            $table->index(['room_id', 'seat']);
        });
    }

    public function down(): void
    {
        Schema::table('game_players', function (Blueprint $table) {
            $table->dropIndex(['room_id', 'seat']);
            $table->dropForeign(['room_id']);
            $table->dropColumn('room_id');
            $table->dropForeign(['game_id']);
            $table->foreignId('game_id')->nullable(false)->change()->constrained('games')->cascadeOnDelete();
        });
    }
};