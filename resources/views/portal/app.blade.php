<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Portal &middot; OCOBO</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..700;1,400&family=Azeret+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400..800&display=swap">
    <link rel="stylesheet" href="{{ asset('css/portal.css') }}">
</head>
<body class="app" data-view="{{ $view ?? 'dashboard' }}">
    <a class="skip-link" href="#contenido">Ir al contenido principal</a>

    <div class="shell" id="shell">
        <aside class="rail" id="rail" aria-label="Barra lateral">
            <a class="rail__brand" href="{{ route('portal.index') }}" data-route="dashboard">
                <span class="rail__glyph" aria-hidden="true">
                    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17.5"></circle><path d="M20 8 v24 M8 20 h24"></path></svg>
                </span>
                <span class="rail__brandtext">
                    <strong>OCOBO</strong>
                    <em>Archivo General</em>
                </span>
            </a>

            <nav class="rail__nav" aria-label="Módulos del sistema">
                <p class="rail__label">Principal</p>
                <a class="navlink" href="{{ route('portal.index') }}" data-route="dashboard">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h7V3H3zM14 21h7v-9h-7zM3 21h7v-5H3zM14 9h7V3h-7z"></path></svg>
                    <span>Panel</span>
                </a>
                <a class="navlink" href="{{ route('portal.view', ['view' => 'notificaciones']) }}" data-route="notificaciones">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5zM10 19a2 2 0 0 0 4 0"></path></svg>
                    <span>Notificaciones</span>
                    <span class="navlink__count" data-badge hidden>0</span>
                </a>

                <p class="rail__label">Control de acceso</p>
                <a class="navlink" href="{{ route('portal.view', ['view' => 'usuarios']) }}" data-route="usuarios">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"></circle><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 11.5a3 3 0 1 0 0-6M18 20h3.5a5 5 0 0 0-4-4.9"></path></svg>
                    <span>Usuarios</span>
                </a>
                <a class="navlink" href="{{ route('portal.view', ['view' => 'roles']) }}" data-route="roles">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 3.5 6v6c0 5 3.6 8.4 8.5 9.5 4.9-1.1 8.5-4.5 8.5-9.5V6z"></path><path d="M9 12l2 2 4-4"></path></svg>
                    <span>Roles y permisos</span>
                </a>

                <p class="rail__label">Gesti&oacute;n</p>
                <a class="navlink" href="{{ route('portal.view', ['view' => 'terceros']) }}" data-route="terceros">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20a7.5 7.5 0 0 1 15 0"></path></svg>
                    <span>Terceros</span>
                </a>
            </nav>

            <div class="rail__foot">
                <div class="who" data-who>
                    <span class="who__avatar" data-avatar aria-hidden="true"></span>
                    <span class="who__meta">
                        <strong data-who-name>&mdash;</strong>
                        <em data-who-role>&mdash;</em>
                    </span>
                </div>
                <button class="btn btn--ghost btn--icon" type="button" data-logout title="Cerrar sesión">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5M11 8l-4 4 4 4M7 12h9"></path></svg>
                    <span class="sr-only">Cerrar sesión</span>
                </button>
            </div>
        </aside>

        <div class="main">
            <header class="topbar">
                <button class="burger" type="button" data-burger aria-label="Abrir menú" aria-expanded="false">
                    <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
                </button>

                <p class="crumb">
                    <span class="crumb__sec">OCOBO</span>
                    <span class="crumb__sep" aria-hidden="true">/</span>
                    <span class="crumb__now" data-crumb>Panel</span>
                </p>

                <div class="topbar__tools">
                    <button class="bell" type="button" data-route="notificaciones" title="Notificaciones">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5zM10 19a2 2 0 0 0 4 0"></path></svg>
                        <span class="bell__count" data-badge hidden>0</span>
                        <span class="sr-only">Notificaciones sin leer</span>
                    </button>
                </div>
            </header>

            <main class="work" id="contenido" tabindex="-1">
                <div class="toaster" data-toaster aria-live="polite" aria-atomic="false"></div>
                <div data-slot></div>
            </main>
        </div>
    </div>

    <script id="perfil" type="application/json">@json($profile)</script>
    <script src="{{ asset('js/portal.js') }}" defer></script>
</body>
</html>