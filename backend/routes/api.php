<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\RoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/me', [AuthController::class, 'update']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/rooms', [RoomController::class, 'store']);
    Route::post('/rooms/join', [RoomController::class, 'join']);
    Route::get('/rooms/{room}', [RoomController::class, 'show']);
    Route::post('/rooms/{room}/leave', [RoomController::class, 'leave']);
    Route::post('/rooms/{room}/start', [RoomController::class, 'start']);

    Route::get('/games/{game}', [GameController::class, 'state']);
    Route::post('/games/{game}/roll', [GameController::class, 'roll']);
    Route::post('/games/{game}/move', [GameController::class, 'move']);
    Route::post('/games/{game}/connected', [GameController::class, 'connected']);
    Route::post('/games/{game}/disconnected', [GameController::class, 'disconnected']);
});