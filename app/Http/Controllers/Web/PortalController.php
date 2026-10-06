<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Portal web basico servido desde el mismo origen que la API.
 *
 * Evita CORS y problemas de SameSite al usar las cookies de sesion de
 * Sanctum, ya que el navegador solo fala con http://ocobo.test:8000.
 */
class PortalController extends Controller
{
    /**
     * Pantalla de acceso.
     */
    public function login(Request $request): View|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('portal');
        }

        return view('portal.login');
    }

    /**
     * Shell del portal. Todas las vistas de la SPA comparten este esqueleto.
     */
    public function app(Request $request, ?string $view = null): View
    {
        $user = $request->user();

        return view('portal.app', [
            'view' => $view,
            'profile' => [
                'id' => $user->id,
                'num_docu' => $user->num_docu,
                'nombres' => $user->nombres,
                'apellidos' => $user->apellidos,
                'email' => $user->email,
                'estado' => $user->estado,
                'avatar_url' => $user->avatar_url,
                'roles' => $user->getRoleNames()->values(),
                'cargo' => $user->cargoActivo?->cargo?->nom_organico,
                'cod_organico' => $user->cargoActivo?->cargo?->cod_organico,
            ],
        ]);
    }
}
