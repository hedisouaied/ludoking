<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->input('name'),
            'username' => $request->input('username'),
            'email' => $request->input('email'),
            'password' => $request->input('password'),
            'avatar' => $request->input('avatar'),
        ]);

        return response()->json([
            'message' => 'Account created.',
            'token' => $user->createToken('ludo')->plainTextToken,
            'user' => $this->present($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        return response()->json([
            'message' => 'Welcome back.',
            'token' => $user->createToken('ludo')->plainTextToken,
            'user' => $this->present($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->present($request->user())]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:40'],
            'username' => ['sometimes', 'string', 'alpha_dash', 'max:30', 'unique:users,username,'.$request->user()->id],
            'avatar' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $request->user()->update($validated);

        return response()->json(['message' => 'Profile updated.', 'user' => $this->present($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    protected function present(User $user): array
    {
        return $user->only(['id', 'name', 'username', 'email', 'avatar']);
    }
}