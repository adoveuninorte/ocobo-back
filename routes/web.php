<?php

use App\Http\Controllers\Web\PortalController;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Portal web basico (mismo origen que la API -> cookies Sanctum sin CORS)
Route::get('/login', [PortalController::class, 'login'])->name('login');

Route::middleware('auth')->prefix('portal')->name('portal.')->group(function () {
    Route::get('/', [PortalController::class, 'app'])->name('index');

    Route::get('/{view}', [PortalController::class, 'app'])
        ->where('view', 'dashboard|usuarios|roles|terceros|notificaciones')
        ->name('view');
});

// Rutas de Sanctum para CSRF cookie (requiere middleware web)
Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);
