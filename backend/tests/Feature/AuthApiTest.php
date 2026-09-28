<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_returns_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Hedi Chebbi',
            'username' => 'hedi',
            'email' => 'hedi@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'username', 'email']]);

        $this->assertDatabaseHas('users', ['email' => 'hedi@example.com', 'username' => 'hedi']);
    }

    public function test_register_validates_input(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => '',
            'username' => 'bad username!',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertStatus(422);
    }

    public function test_login_returns_token_for_valid_credentials(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com', 'password' => bcrypt('secret123')]);

        $this->postJson('/api/auth/login', [
            'email' => 'a@example.com',
            'password' => 'secret123',
        ])->assertStatus(200)
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com', 'password' => bcrypt('secret123')]);

        $this->postJson('/api/auth/login', [
            'email' => 'a@example.com',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')->assertStatus(200)->assertJsonPath('user.id', $user->id);
    }

    public function test_me_without_token_is_rejected(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_update_profile(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson('/api/auth/me', ['name' => 'New Name', 'avatar' => '🦊'])->assertOk()
            ->assertJsonPath('user.name', 'New Name');
    }

    public function test_logout_deletes_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ludo')->plainTextToken;

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertCount(0, $user->tokens()->get());
    }
}