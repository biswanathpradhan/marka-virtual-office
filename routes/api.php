<?php

use App\Http\Controllers\Api\UserSettingsController;
use App\Http\Controllers\Api\VirtualOfficeController;
use App\Http\Controllers\Api\WebRTCController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // Virtual Office Routes
    Route::prefix('virtual-office')->group(function () {
        Route::get('/rooms', [VirtualOfficeController::class, 'index']);
        Route::post('/rooms', [VirtualOfficeController::class, 'store']);
        Route::get('/rooms/{room}', [VirtualOfficeController::class, 'show']);
        Route::post('/rooms/{room}/join', [VirtualOfficeController::class, 'join']);
        Route::post('/rooms/{room}/leave', [VirtualOfficeController::class, 'leave']);
        Route::put('/rooms/{room}/presence', [VirtualOfficeController::class, 'updatePresence']);
        Route::get('/rooms/{room}/presences', [VirtualOfficeController::class, 'getPresences']);
        Route::get('/rooms/{room}/messages', [\App\Http\Controllers\Api\ChatController::class, 'index']);
        Route::post('/rooms/{room}/messages', [\App\Http\Controllers\Api\ChatController::class, 'store']);
        Route::post('/rooms/{room}/background', [VirtualOfficeController::class, 'updateBackground']);
        Route::post('/rooms/{room}/invite', [\App\Http\Controllers\Api\InviteController::class, 'invite']);
    });

    // WebRTC Routes
    Route::prefix('webrtc')->group(function () {
        Route::get('/ice-servers', [WebRTCController::class, 'getIceServers']);
        Route::post('/rooms/{room}/offer', [WebRTCController::class, 'offer']);
        Route::post('/rooms/{room}/answer', [WebRTCController::class, 'answer']);
        Route::post('/rooms/{room}/ice-candidate', [WebRTCController::class, 'iceCandidate']);
    });

    // User Settings Routes
    Route::prefix('settings')->group(function () {
        Route::get('/', [UserSettingsController::class, 'show']);
        Route::put('/', [UserSettingsController::class, 'update']);
    });

    // User Profile Routes
    Route::prefix('profile')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\UserProfileController::class, 'show']);
        Route::post('/', [\App\Http\Controllers\Api\UserProfileController::class, 'update']);
        Route::put('/', [\App\Http\Controllers\Api\UserProfileController::class, 'update']);
    });
});

