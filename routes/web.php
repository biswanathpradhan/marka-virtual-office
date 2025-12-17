<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('rooms.index');
    }
    return redirect()->route('login');
});

// Authentication Routes
Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
Route::get('/register', [RegisterController::class, 'showRegistrationForm'])->name('register');
Route::post('/register', [RegisterController::class, 'register']);

// Room Routes
Route::middleware('auth')->group(function () {
    Route::get('/rooms', [\App\Http\Controllers\RoomController::class, 'index'])->name('rooms.index');
    Route::get('/rooms/create', [\App\Http\Controllers\RoomController::class, 'create'])->name('rooms.create');
    Route::post('/rooms', [\App\Http\Controllers\RoomController::class, 'store'])->name('rooms.store');
    
    // Redirect /virtual-office to rooms if no room ID provided
    Route::get('/virtual-office', function () {
        return redirect()->route('rooms.index');
    });
    
    Route::get('/virtual-office/{room}', function ($room) {
        $roomModel = \App\Models\Room::findOrFail($room);
        if (!$roomModel->canJoin(Auth::user())) {
            return redirect()->route('rooms.index')->with('error', 'You do not have access to this room.');
        }
        return view('virtual-office', ['room' => $room]);
    })->name('virtual-office');
});

