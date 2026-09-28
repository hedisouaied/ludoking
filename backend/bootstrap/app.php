<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API auth is Bearer-token based (Sanctum), not cookie/session based,
        // so we must NOT enable statefulApi() — it would force CSRF checks on
        // SPA-origin requests and break the JSON API (419 responses).
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
