<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>Acceso · OCOBO</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400..700;1,400&family=Azeret+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,400..800&display=swap">
    <link rel="stylesheet" href="{{ asset('css/portal.css') }}">
</head>
<body class="auth">
    <a class="skip-link" href="#acceso">Ir al formulario de acceso</a>

    <main class="auth__grid">
        <section class="stage" aria-labelledby="stage-title">
            <div class="stage__grain" aria-hidden="true"></div>
            <div class="stage__edge" aria-hidden="true">
                <span>OCOBO &middot; Ventanilla &Uacute;nica &middot; Archivo General</span>
            </div>

            <div class="stage__body">
                <p class="stage__eyebrow"><span class="tick" aria-hidden="true"></span> Sistema de Gesti&oacute;n Documental</p>

                <h1 class="stage__title" id="stage-title">
                    Archivo<br>
                    <em>General</em>
                </h1>

                <p class="stage__lede">
                    Radicaci&oacute;n, clasificaci&oacute;n y tr&aacute;mite de comunicaciones
                    con control de acceso por permisos y trazabilidad normativa.
                </p>

                <dl class="stage__facts">
                    <div class="fact">
                        <dt>Trazabilidad</dt>
                        <dd>ISO 27001</dd>
                    </div>
                    <div class="fact">
                        <dt>Hash documental</dt>
                        <dd>SHA-256</dd>
                    </div>
                    <div class="fact">
                        <dt>Plazos</dt>
                        <dd>Ley 1437</dd>
                    </div>
                </dl>
            </div>

            <svg class="sello" viewBox="0 0 200 200" role="img" aria-label="Sello de radicado">
                <defs>
                    <path id="selloPath" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"></path>
                </defs>
                <circle class="sello__ring" cx="100" cy="100" r="88"></circle>
                <circle class="sello__ring sello__ring--inner" cx="100" cy="100" r="60"></circle>
                <text class="sello__text">
                    <textPath href="#selloPath" startOffset="0%">&middot; RADICADO &middot; VENTANILLA &Uacute;NICA &middot; OCOBO &middot;</textPath>
                </text>
                <path class="sello__check" d="M76 102 l16 17 l34 -38"></path>
            </svg>
        </section>

        <section class="panel" id="acceso">
            <div class="panel__inner">
                <header class="panel__head">
                    <p class="mark">
                        <span class="mark__glyph" aria-hidden="true">O</span>
                        <span class="mark__text">OCOBO</span>
                    </p>
                    <h2 class="panel__title">Iniciar sesi&oacute;n</h2>
                    <p class="panel__hint">Ingresa con las credenciales institucionales asignadas.</p>
                </header>

                <div class="alert" id="alerta" role="alert" aria-live="assertive" hidden></div>

                <form class="form" id="form-login" novalidate autocomplete="on">
                    <div class="field">
                        <label class="field__label" for="email">Correo institucional</label>
                        <input class="field__input" type="email" id="email" name="email"
                               autocomplete="username" inputmode="email" required
                               spellcheck="false" placeholder="nombre@entidad.gov.co">
                        <p class="field__error" data-error-for="email"></p>
                    </div>

                    <div class="field">
                        <label class="field__label" for="password">Contrase&ntilde;a</label>
                        <div class="field__wrap">
                            <input class="field__input" type="password" id="password" name="password"
                                   autocomplete="current-password" required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;">
                            <button class="field__reveal" type="button" data-reveal="password"
                                    aria-label="Mostrar contraseña">Ver</button>
                        </div>
                        <p class="field__error" data-error-for="password"></p>
                    </div>

                    <div class="field field--row">
                        <label class="check">
                            <input type="checkbox" id="remember" name="remember" value="1">
                            <span class="check__box" aria-hidden="true"></span>
                            <span class="check__text">Mantener la sesi&oacute;n abierta</span>
                        </label>
                    </div>

                    <button class="btn btn--primary" type="submit" id="btn-login">
                        <span class="btn__label">Entrar al archivo</span>
                        <span class="btn__arrow" aria-hidden="true">&rarr;</span>
                    </button>

                    <p class="form__foot">
                        El acceso y las operaciones quedan registrados en el log de auditor&iacute;a.
                    </p>
                </form>
            </div>

            <footer class="panel__foot">
                <span class="mono">OCOBO v2.6</span>
                <span class="dot" aria-hidden="true"></span>
                <span class="mono">entorno local</span>
            </footer>
        </section>
    </main>

    <script src="{{ asset('js/portal.js') }}" defer></script>
</body>
</html>