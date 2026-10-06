/* ==========================================================================
   OCOBO · Portal
   Cliente de API (cookies de sesión Sanctum, mismo origen) + SPA mínima.
   ========================================================================== */

(function () {
    'use strict';

    /* ------------------------------------------------------------ helpers */

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

    /** Escapa texto antes de interpolarlo en innerHTML. */
    const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

    const num = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const nf = new Intl.NumberFormat('es-CO');
    const fmt = (value) => nf.format(num(value));

    const today = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const ago = (iso) => {
        if (!iso) return '—';
        const then = new Date(iso).getTime();
        if (Number.isNaN(then)) return '—';

        const mins = Math.round((Date.now() - then) / 60000);
        if (mins < 1) return 'ahora';
        if (mins < 60) return `hace ${mins} min`;

        const hrs = Math.round(mins / 60);
        if (hrs < 24) return `hace ${hrs} h`;

        const days = Math.round(hrs / 24);
        if (days < 31) return `hace ${days} d`;

        return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const initials = (name) => String(name || '?')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || '?';

    const fullName = (u) => [u.nombres, u.apellidos].filter(Boolean).join(' ').trim() || u.email || 'Usuario';

    const debounce = (fn, wait) => {
        let timer;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), wait);
        };
    };

    const ICONS = {
        search: '<circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path>',
        prev: '<path d="m14 6-6 6 6 6"></path>',
        next: '<path d="m10 6 6 6-6 6"></path>',
        empty: '<path d="M4 7h16v12H4z"></path><path d="M4 11h16M9 7v4"></path>',
        bell: '<path d="M12 4a5 5 0 0 0-5 5v4l-2 3h14l-2-3V9a5 5 0 0 0-5-5zM10 18a2 2 0 0 0 4 0"></path>',
        check: '<path d="m5 13 4 4 10-10"></path>',
        close: '<path d="m7 7 10 10M17 7 7 17"></path>',
    };

    const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

    /* ------------------------------------------------------- cliente API */

    function ApiError(message, status, fields) {
        this.name = 'ApiError';
        this.message = message;
        this.status = status;
        this.fields = fields || null;
    }
    ApiError.prototype = Object.create(Error.prototype);

    const memo = new Map();

    const api = {
        /** X-XSRF-TOKEN crudo de la cookie. */
        xsrf() {
            const hit = document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='));
            return hit ? decodeURIComponent(hit.slice('XSRF-TOKEN='.length)) : '';
        },

        /** Siembra sesión + cookie XSRF. Responde 204 sin cuerpo. */
        async prime() {
            await fetch('/sanctum/csrf-cookie', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
        },

        async request(path, options) {
            const opts = options || {};
            const method = opts.method || 'GET';
            const headers = { Accept: 'application/json' };
            let body;

            if (opts.body !== undefined && opts.body !== null) {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(opts.body);
            }

            if (method !== 'GET') {
                const token = api.xsrf();
                if (token) headers['X-XSRF-TOKEN'] = token;
            }

            let res;
            try {
                res = await fetch(path, { method, headers, body, credentials: 'include' });
            } catch (e) {
                throw new ApiError('No hay conexión con el servidor.', 0, null);
            }

            if (res.status === 204) return null;

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                // Dos envoltorios distintos conviven en la API: `status` en los
                // controladores y `success` en el framework y los middlewares.
                const message = (json && json.message) || res.statusText || 'Error inesperado';
                throw new ApiError(message, res.status, (json && json.errors) || null);
            }

            return json;
        },

        /** Lectura con caché corta en memoria: la navegación no castiga el rate limit. */
        get(path, ttl) {
            const hit = memo.get(path);
            if (hit && Date.now() - hit.at < (ttl || 45000)) return hit.promise;

            const promise = api.request(path);
            memo.set(path, { at: Date.now(), promise });
            promise.catch(() => memo.delete(path));
            return promise;
        },

        clear() {
            memo.clear();
        },
    };

    /* ------------------------------------------------- plantillas comunes */

    /** `title` y `detail` son literales propios: no se escapan. */
    const boxEmpty = (title, detail) => `
        <div class="state-box">
            <span class="state-box__mark">${icon('empty')}</span>
            <p><strong>${title}</strong>${detail ? `<br>${detail}` : ''}</p>
        </div>`;

    /** `message` proviene de la API: sí se escapa. */
    const boxError = (message) => `
        <div class="state-box">
            <span class="state-box__mark">${icon('close')}</span>
            <p><strong>No se pudo cargar la información</strong><br>${esc(message)}</p>
        </div>`;

    const skeletonRows = (rows) => {
        let html = '<div class="tablewrap"><table class="table"><tbody>';
        for (let i = 0; i < rows; i += 1) {
            html += '<tr><td colspan="5"><div class="skel" style="height:15px"></div></td></tr>';
        }
        return `${html}</tbody></table></div>`;
    };

    const head = (title, sub, actions) => `
        <header class="view__head">
            <div>
                <h1 class="view__title">${title}</h1>
                ${sub ? `<p class="view__sub">${sub}</p>` : ''}
            </div>
            ${actions ? `<div class="view__actions">${actions}</div>` : ''}
        </header>`;

    const searchBox = (id, placeholder) => `
        <div class="search">
            ${icon('search')}
            <input class="search__input" id="${id}" type="search" placeholder="${esc(placeholder)}" autocomplete="off">
        </div>`;

    const pagerHtml = (page, lastPage, total, from, to) => `
        <div class="pager">
            <p class="pager__info">${fmt(from)}&ndash;${fmt(to)} de ${fmt(total)}</p>
            <div class="pager__ctrl">
                <button class="pager__btn" type="button" data-page="prev" ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior">${icon('prev')}</button>
                <span class="pager__pos">${fmt(page)} / ${fmt(Math.max(lastPage, 1))}</span>
                <button class="pager__btn" type="button" data-page="next" ${page >= lastPage ? 'disabled' : ''} aria-label="Página siguiente">${icon('next')}</button>
            </div>
        </div>`;

    const wirePager = (host, go) => {
        $$('[data-page]', host).forEach((btn) => {
            btn.addEventListener('click', () => go(btn.dataset.page === 'next' ? 'next' : 'prev'));
        });
    };

    /* ======================================================================
       PANTALLA DE ACCESO
       ====================================================================== */

    function bootLogin() {
        const form = $('#form-login');
        const alert = $('#alerta');
        const button = $('#btn-login');
        const label = $('.btn__label', button);
        const email = $('#email');
        const password = $('#password');

        const reveal = $('[data-reveal]');
        if (reveal) {
            reveal.addEventListener('click', () => {
                const hidden = password.type === 'password';
                password.type = hidden ? 'text' : 'password';
                reveal.textContent = hidden ? 'Ocultar' : 'Ver';
                reveal.setAttribute('aria-label', hidden ? 'Ocultar contraseña' : 'Mostrar contraseña');
                password.focus();
            });
        }

        const fail = (message, fields) => {
            alert.textContent = message;
            alert.hidden = false;

            $$('.field__error').forEach((p) => { p.textContent = ''; });
            [email, password].forEach((i) => i.removeAttribute('aria-invalid'));

            if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
                Object.keys(fields).forEach((key) => {
                    const slot = $(`[data-error-for="${key}"]`);
                    if (slot) slot.textContent = [].concat(fields[key]).join(' ');
                    const input = $('#' + key);
                    if (input) input.setAttribute('aria-invalid', 'true');
                });
            }
        };

        let twoFactorToken = null;

        const removeOtp = () => {
            const wrap = $('#otp-wrap');
            if (wrap) wrap.remove();
        };

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            alert.hidden = true;

            // Sin sesión sembrada, Sanctum no puede validar el POST.
            await api.prime().catch(() => {});

            button.setAttribute('aria-busy', 'true');
            label.textContent = twoFactorToken ? 'Verificando código…' : 'Verificando credenciales…';

            try {
                const otp = $('#otp');
                const payload = twoFactorToken
                    ? { two_factor_token: twoFactorToken, code: otp ? otp.value.trim() : '' }
                    : { email: email.value.trim(), password: password.value, remember: $('#remember').checked };

                const res = await api.request(twoFactorToken ? '/api/2fa/verify' : '/api/login', {
                    method: 'POST',
                    body: payload,
                });

                // Ojo: /api/login responde 200 con requires_2fa sin crear sesión.
                if (!twoFactorToken && res && res.data && res.data.requires_2fa) {
                    twoFactorToken = res.data.two_factor_token;
                    removeOtp();

                    const wrap = document.createElement('div');
                    wrap.id = 'otp-wrap';
                    wrap.className = 'field';
                    wrap.innerHTML = `
                        <label class="field__label" for="otp">Código de verificación</label>
                        <input class="field__input" type="text" id="otp" name="otp" inputmode="numeric"
                               autocomplete="one-time-code" maxlength="6" placeholder="000000">
                        <p class="field__error" data-error-for="otp"></p>`;

                    alert.textContent = 'Cuenta protegida con verificación en dos pasos. Ingresa el código de 6 dígitos.';
                    alert.hidden = false;
                    password.closest('.field').after(wrap);
                    $('#otp').focus();
                    return;
                }

                window.location.href = '/portal';
            } catch (error) {
                twoFactorToken = null;
                removeOtp();
                fail(error.message, error.fields);
                email.focus();
            } finally {
                button.removeAttribute('aria-busy');
                label.textContent = 'Entrar al archivo';
            }
        });

        email.focus();
    }

    /* ======================================================================
       PORTAL
       ====================================================================== */

    const VIEWS = {
        dashboard: { label: 'Panel', render: renderDashboard },
        usuarios: { label: 'Usuarios', render: renderUsuarios },
        roles: { label: 'Roles y permisos', render: renderRoles },
        terceros: { label: 'Terceros', render: renderTerceros },
        notificaciones: { label: 'Notificaciones', render: renderNotificaciones },
    };

    const state = {
        view: 'dashboard',
        profile: {},
        usuarios: { rows: [], term: '', soloActivos: false, page: 1, perPage: 25 },
        roles: { rows: [], term: '', page: 1, perPage: 25 },
        terceros: { rows: [], term: '', tipo: '', page: 1, perPage: 25 },
    };

    function currentRoute() {
        const match = location.pathname.match(/\/portal\/([a-z]+)?/);
        return (match && match[1]) || 'dashboard';
    }

    function go(view, push) {
        if (!VIEWS[view]) view = 'dashboard';
        state.view = view;

        if (push !== false) {
            history.pushState({ view }, '', view === 'dashboard' ? '/portal' : `/portal/${view}`);
        }

        document.body.dataset.view = view;

        const crumb = $('[data-crumb]');
        if (crumb) crumb.textContent = VIEWS[view].label;

        $$('.navlink').forEach((link) => {
            if (link.dataset.route === view) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });

        const shell = $('#shell');
        if (shell) shell.removeAttribute('data-open');
        const burger = $('[data-burger]');
        if (burger) burger.setAttribute('aria-expanded', 'false');

        const slot = $('[data-slot]');
        slot.innerHTML = '<div class="view"></div>';
        VIEWS[view].render(slot.firstElementChild);

        window.scrollTo(0, 0);
    }

    /* ------------------------------------------------------------- panel */

    async function renderDashboard(root) {
        const p = state.profile;

        root.innerHTML = `
            ${head('Panel', 'Resumen del estado del archivo y del acceso institucional.')}
            <div class="lede">
                <section class="panelbox intro">
                    <p class="eyebrow">${esc(today.format(new Date()))}</p>
                    <p class="intro__hi">Hola, <em>${esc(String(p.nombres || '').split(' ')[0] || 'bienvenido')}</em>.</p>
                    <dl class="intro__meta">
                        <div class="intro__metaitem"><dt>Correo</dt><dd>${esc(p.email || '—')}</dd></div>
                        <div class="intro__metaitem"><dt>Roles</dt><dd>${esc((p.roles || []).join(' · ') || '—')}</dd></div>
                        <div class="intro__metaitem"><dt>Cargo</dt><dd>${esc(p.cargo || 'Sin cargo asignado')}</dd></div>
                    </dl>
                </section>

                <aside class="cardid" aria-label="Credencial del usuario">
                    <div class="cardid__top">
                        <span class="cardid__brand"><span>OCOBO</span></span>
                        <span class="cardid__chip" aria-hidden="true"></span>
                    </div>
                    <div class="cardid__who">
                        <p class="cardid__name">${esc(fullName(p))}</p>
                        <p class="cardid__role">${esc((p.roles || [])[0] || 'Sin rol asignado')}</p>
                    </div>
                    <dl class="cardid__grid">
                        <div><dt>Documento</dt><dd>${esc(p.num_docu || '—')}</dd></div>
                        <div><dt>Código orgánico</dt><dd>${esc(p.cod_organico || '—')}</dd></div>
                    </dl>
                </aside>
            </div>

            <div class="tiles" data-tiles>${skeletonRows(1)}</div>

            <div class="split">
                <section class="panelbox">
                    <div class="panelbox__head">
                        <h2 class="panelbox__title">Ocupación del organigrama</h2>
                        <span class="mono" style="color:var(--tx-3)">cargos activos</span>
                    </div>
                    <div class="panelbox__body" data-cargos>${skeletonRows(2)}</div>
                </section>

                <section class="panelbox">
                    <div class="panelbox__head">
                        <h2 class="panelbox__title">Últimas notificaciones</h2>
                        <button class="btn btn--quiet" type="button" data-route="notificaciones">Ver todas</button>
                    </div>
                    <div class="notif__preview" data-notis>${skeletonRows(2)}</div>
                </section>
            </div>`;

        loadTiles(root);
        loadCargos(root);
        loadNotificationPreview(document);
    }

    const tile = (label, value, note, accent, meter) => {
        const pct = meter && meter.total ? Math.round((num(meter.value) / num(meter.total)) * 100) : null;

        return `
            <article class="tile" style="--tile-accent:${accent}">
                <div class="tile__top">
                    <h2 class="tile__label">${label}</h2>
                    <span class="tile__unit">${meter && meter.total ? `de ${fmt(meter.total)}` : ''}</span>
                </div>
                <p class="tile__value">${value}</p>
                ${pct === null ? '' : `<div class="meter"><div class="meter__fill" data-w="${pct}"></div></div>`}
                <p class="tile__note">${note}</p>
            </article>`;
    };

    /** Anima barras y medidores tras insertarlos en el DOM. */
    const fillBars = (root) => {
        requestAnimationFrame(() => {
            $$('[data-w]', root).forEach((el) => { el.style.width = `${el.dataset.w}%`; });
        });
    };

    async function loadTiles(root) {
        const box = $('[data-tiles]', root);
        if (!box) return;

        // Cada cifra tiene su propio permiso: un 403 no debe tumbar el panel.
        const safe = (path) => api.get(path, 30000)
            .then((r) => (r && r.data) || {})
            .catch((e) => ({ __status: e.status, __error: e.message }));

        const [users, roles, terceros, unread] = await Promise.all([
            safe('/api/control-acceso/users/estadisticas'),
            safe('/api/control-acceso/roles/estadisticas'),
            safe('/api/gestion/terceros-estadistica'),
            safe('/api/transversal/in-app-notifications/unread-count'),
        ]);

        if (!unread.__error) paintBadge(num(unread.count));

        const denied = (block) => (block.__status === 403
            ? 'Sin permiso para consultar'
            : (block.__error || 'Sin datos'));

        const cell = (block, label, accent, note, meter) => {
            if (block.__error) return tile(label, '&mdash;', denied(block), accent, null);
            return tile(label, fmt(block.value), note, accent, meter);
        };

        box.innerHTML =
            cell(users, 'Usuarios activos', 'var(--forest)', 'cuentas habilitadas para ingreso',
                users.__error ? null : { value: num(users.total_users_activos), total: num(users.total_users) })
            + cell(roles, 'Roles', 'var(--gold)',
                roles.__error ? '' : `cobertura de ${fmt(roles.total_usuarios)} usuarios`, null)
            + cell(terceros, 'Terceros', 'var(--azure)',
                terceros.__error ? '' : `${fmt(terceros.total_naturales)} naturales · ${fmt(terceros.total_juridicos)} jurídicos`, null)
            + (unread.__error
                ? tile('Notificaciones', '&mdash;', denied(unread), 'var(--seal)', null)
                : tile('Notificaciones', fmt(unread.count), 'avisos sin leer', 'var(--seal)', null));

        fillBars(box);
    }

    async function loadCargos(root) {
        const box = $('[data-cargos]', root);
        if (!box) return;

        try {
            const res = await api.get('/api/control-acceso/user-cargos/estadisticas');
            const data = (res && res.data) || {};
            const resumen = data.resumen_general || {};
            const tipos = data.por_tipo_organigrama || {};

            // Las claves de por_tipo_organigrama dependen de los datos: no se fijan.
            const rows = Object.keys(tipos).map((tipo) => {
                const t = tipos[tipo];
                const pct = num(t.total) ? Math.round((num(t.ocupados) / num(t.total)) * 100) : 0;

                return `
                    <div class="bar">
                        <span class="bar__name">${esc(tipo)}</span>
                        <span class="bar__num">${fmt(t.ocupados)} / ${fmt(t.total)} · ${pct}%</span>
                        <div class="bar__track">
                            <div class="bar__fill" data-w="${pct}" ${pct === 0 ? 'data-zero="1"' : ''}></div>
                        </div>
                    </div>`;
            }).join('');

            box.innerHTML = `
                <div class="bars">${rows || '<p class="tile__note">Sin información de organigrama.</p>'}</div>
                <div class="legend">
                    <span><i></i> cargo ocupado</span>
                    <span><i class="legend--vac"></i> cargo disponible</span>
                    <span>${fmt(resumen.usuarios_con_cargo)} usuarios con cargo · ${fmt(resumen.usuarios_sin_cargo)} sin cargo</span>
                </div>`;

            fillBars(box);
        } catch (e) {
            box.innerHTML = boxError(e.message);
        }
    }

    async function loadNotificationPreview(root) {
        const box = $('[data-notis]', root);
        if (!box) return;

        try {
            const res = await api.get('/api/transversal/in-app-notifications?per_page=6');
            // Este endpoint devuelve un arreglo plano: la paginación se pierde.
            const list = Array.isArray(res && res.data) ? res.data : [];

            box.innerHTML = list.length
                ? list.map(notifItem).join('')
                : boxEmpty('Sin notificaciones', 'No hay avisos registrados para tu usuario.');
        } catch (e) {
            box.innerHTML = boxError(e.message);
        }
    }

    const notifItem = (n) => {
        const unread = !n.read_at;
        const marca = n.type && /firma/i.test(n.type) ? 'check' : 'bell';

        return `
            <article class="notif__item" data-unread="${unread ? 1 : 0}">
                <span class="notif__glyph">${icon(marca)}</span>
                <div class="notif__body">
                    <p class="notif__title">${esc(n.title || 'Aviso')}</p>
                    ${n.message ? `<p class="notif__text">${esc(n.message)}</p>` : ''}
                    <p class="notif__meta">
                        <span>${esc(n.type || 'general')}</span>
                        <span>${esc(ago(n.created_at))}</span>
                    </p>
                </div>
                <div class="notif__act">
                    ${unread ? `<button class="btn btn--quiet" type="button" data-read="${n.id}">Marcar leída</button>` : ''}
                </div>
            </article>`;
    };

    /* ---------------------------------------------------------- usuarios */

    async function renderUsuarios(root) {
        root.innerHTML = `
            ${head('Usuarios', 'Cuentas institucionales registradas en el módulo de control de acceso.', searchBox('q-usuarios', 'Buscar por nombre o correo'))}
            <div data-list>${skeletonRows(6)}</div>`;

        const box = $('[data-list]', root);
        const s = state.usuarios;

        const draw = () => {
            const term = s.term.trim().toLowerCase();
            let rows = s.rows;

            if (term) {
                rows = rows.filter((u) => [u.nombres, u.apellidos, u.email, u.num_docu]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(term)));
            }

            if (s.soloActivos) rows = rows.filter((u) => num(u.estado) === 1);

            const lastPage = Math.max(1, Math.ceil(rows.length / s.perPage));
            s.page = Math.min(s.page, lastPage);
            const slice = rows.slice((s.page - 1) * s.perPage, s.page * s.perPage);

            if (!rows.length) {
                box.innerHTML = `<section class="panelbox">${boxEmpty(
                    'Sin resultados',
                    term ? 'Ningún usuario coincide con la búsqueda.' : 'Aún no hay usuarios cargados.'
                )}</section>`;
                return;
            }

            box.innerHTML = `
                <section class="panelbox">
                    <div class="panelbox__head">
                        <h2 class="panelbox__title">Directorio institucional</h2>
                        <button class="filterchip" type="button" data-solo="1" aria-pressed="${s.soloActivos}">Solo activos</button>
                    </div>
                    <div class="tablewrap">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Documento</th>
                                    <th>Cargo</th>
                                    <th>Roles</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slice.map((u) => {
                                    const roles = (u.roles || []).map((r) => (typeof r === 'string' ? r : r.name)).filter(Boolean);
                                    const cargo = u.cargo || u.oficina || u.dependencia;
                                    const on = num(u.estado) === 1;

                                    return `
                                        <tr>
                                            <td>
                                                <div class="ident">
                                                    <span class="ident__avatar">${esc(initials(fullName(u)))}</span>
                                                    <span class="ident__text">
                                                        <strong>${esc(fullName(u))}</strong>
                                                        <span>${esc(u.email || '—')}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="num">${esc(u.num_docu || '—')}</td>
                                            <td class="cell-dim">${esc(cargo ? (cargo.nom_organico || cargo.nombre || '—') : '—')}</td>
                                            <td>
                                                <div class="taglist">
                                                    ${roles.length
                                                        ? roles.slice(0, 3).map((r) => `<span class="pill">${esc(r)}</span>`).join('')
                                                        : '<span class="cell-dim">—</span>'}
                                                    ${roles.length > 3 ? `<span class="pill">+${roles.length - 3}</span>` : ''}
                                                </div>
                                            </td>
                                            <td class="cell-tight">
                                                <span class="state ${on ? 'state--on' : 'state--off'}"><i></i>${on ? 'Activo' : 'Inactivo'}</span>
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${rows.length > s.perPage ? pagerHtml(s.page, lastPage, rows.length, (s.page - 1) * s.perPage + 1, Math.min(s.page * s.perPage, rows.length)) : ''}
                </section>`;

            const solo = $('[data-solo]', box);
            if (solo) solo.addEventListener('click', () => { s.soloActivos = !s.soloActivos; s.page = 1; draw(); });

            wirePager(box, (dir) => {
                s.page = dir === 'next' ? s.page + 1 : s.page - 1;
                draw();
            });
        };

        const input = $('#q-usuarios', root);
        input.addEventListener('input', debounce(() => {
            s.term = input.value;
            s.page = 1;
            draw();
        }, 180));

        try {
            const res = await api.get('/api/control-acceso/users');
            // Sin paginación en el backend: llega el listado completo.
            s.rows = Array.isArray(res && res.data) ? res.data : [];
        } catch (e) {
            box.innerHTML = `<section class="panelbox">${boxError(e.message)}</section>`;
            return;
        }

        draw();
    }

    /* ------------------------------------------------------------- roles */

    async function renderRoles(root) {
        root.innerHTML = `
            ${head('Roles y permisos', 'Matriz de autorización del sistema. Expande una fila para inspeccionar sus permisos.', searchBox('q-roles', 'Buscar rol'))}
            <div data-list>${skeletonRows(5)}</div>`;

        const box = $('[data-list]', root);
        const s = state.roles;

        const draw = () => {
            const term = s.term.trim().toLowerCase();
            const rows = term ? s.rows.filter((r) => String(r.name).toLowerCase().includes(term)) : s.rows;

            const lastPage = Math.max(1, Math.ceil(rows.length / s.perPage));
            s.page = Math.min(s.page, lastPage);
            const slice = rows.slice((s.page - 1) * s.perPage, s.page * s.perPage);

            if (!rows.length) {
                box.innerHTML = `<section class="panelbox">${boxEmpty(
                    'Sin roles',
                    term ? 'Ningún rol coincide con la búsqueda.' : 'No hay roles definidos.'
                )}</section>`;
                return;
            }

            box.innerHTML = `
                <section class="panelbox">
                    <div class="panelbox__head">
                        <h2 class="panelbox__title">Catálogo de roles</h2>
                        <span class="mono" style="color:var(--tx-3)">${fmt(rows.length)} roles</span>
                    </div>
                    <div class="tablewrap">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Rol</th>
                                    <th>Permisos</th>
                                    <th>Guard</th>
                                    <th class="cell-tight"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slice.map((r) => {
                                    const perms = r.permissions || [];

                                    return `
                                        <tr>
                                            <td class="cell-strong">${esc(r.name)}</td>
                                            <td><span class="pill pill--azure">${fmt(perms.length)}</span></td>
                                            <td class="cell-dim num">${esc(r.guard_name || '—')}</td>
                                            <td class="cell-tight">
                                                <button class="btn btn--quiet" type="button" data-toggle="${r.id}" aria-expanded="false">Ver</button>
                                            </td>
                                        </tr>
                                        <tr id="perm-${r.id}" hidden>
                                            <td colspan="4" style="background:rgba(12,19,16,.028);padding:14px">
                                                <div class="taglist">
                                                    ${perms.length
                                                        ? perms.map((p) => `<span class="pill">${esc(p.name || p)}</span>`).join('')
                                                        : '<span class="cell-dim">Este rol no tiene permisos asignados.</span>'}
                                                </div>
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${rows.length > s.perPage ? pagerHtml(s.page, lastPage, rows.length, (s.page - 1) * s.perPage + 1, Math.min(s.page * s.perPage, rows.length)) : ''}
                </section>`;

            $$('[data-toggle]', box).forEach((btn) => {
                btn.addEventListener('click', () => {
                    const row = $(`#perm-${btn.dataset.toggle}`, box);
                    const open = row.hasAttribute('hidden');
                    row.toggleAttribute('hidden', !open);
                    btn.setAttribute('aria-expanded', String(open));
                    btn.textContent = open ? 'Ocultar' : 'Ver';
                });
            });

            wirePager(box, (dir) => {
                s.page = dir === 'next' ? s.page + 1 : s.page - 1;
                draw();
            });
        };

        const input = $('#q-roles', root);
        input.addEventListener('input', debounce(() => {
            s.term = input.value;
            s.page = 1;
            draw();
        }, 180));

        try {
            const res = await api.get('/api/control-acceso/roles?per_page=100');
            const data = res && res.data;
            // Este endpoint devuelve un paginador: las filas viven en data.data.
            s.rows = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
        } catch (e) {
            const mensaje = e.status === 403
                ? 'Tu usuario no tiene el permiso «Control de acceso - Roles → Listar».'
                : e.message;

            box.innerHTML = `<section class="panelbox">${boxError(mensaje)}</section>`;
            return;
        }

        draw();
    }

    /* ---------------------------------------------------------- terceros */

    async function renderTerceros(root) {
        root.innerHTML = `
            ${head('Terceros', 'Ciudadanos y entidades que remiten comunicaciones al archivo.', searchBox('q-terceros', 'Buscar por nombre o NIT'))}
            <div class="view__actions" style="margin:-8px 0 20px">
                <button class="filterchip" type="button" data-tipo="" aria-pressed="true">Todos</button>
                <button class="filterchip" type="button" data-tipo="Natural" aria-pressed="false">Naturales</button>
                <button class="filterchip" type="button" data-tipo="Juridico" aria-pressed="false">Jurídicos</button>
            </div>
            <div data-list>${skeletonRows(6)}</div>`;

        const box = $('[data-list]', root);
        const s = state.terceros;

        const draw = async () => {
            box.innerHTML = skeletonRows(6);

            const params = new URLSearchParams({ per_page: String(s.perPage), page: String(s.page) });
            if (s.term.trim()) params.set('search', s.term.trim());
            if (s.tipo) params.set('tipo', s.tipo);

            let rows;
            let meta = null;

            try {
                const res = await api.request(`/api/gestion/terceros?${params}`);
                const data = res && res.data;
                meta = data && !Array.isArray(data) ? data : null;
                rows = Array.isArray(data) ? data : (meta ? meta.data : []);
            } catch (e) {
                box.innerHTML = `<section class="panelbox">${boxError(e.message)}</section>`;
                return;
            }

            if (!rows.length) {
                box.innerHTML = `<section class="panelbox">${boxEmpty('Sin terceros', 'Ningún registro coincide con el filtro actual.')}</section>`;
                return;
            }

            box.innerHTML = `
                <section class="panelbox">
                    <div class="panelbox__head">
                        <h2 class="panelbox__title">Directorio de terceros</h2>
                        <span class="mono" style="color:var(--tx-3)">${fmt(meta ? meta.total : rows.length)} registros</span>
                    </div>
                    <div class="tablewrap">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tercero</th>
                                    <th>Documento</th>
                                    <th>Tipo</th>
                                    <th>Contacto</th>
                                    <th>Ciudad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map((t) => {
                                    const natural = String(t.tipo || '').toLowerCase() === 'natural';
                                    const ciudad = t.division_politica;

                                    return `
                                        <tr>
                                            <td class="cell-strong">${esc(t.nom_razo_soci || '—')}</td>
                                            <td class="num">${esc(t.num_docu_nit || '—')}</td>
                                            <td><span class="pill ${natural ? 'pill--forest' : 'pill--gold'}">${esc(t.tipo || '—')}</span></td>
                                            <td class="cell-dim">${esc(t.email || t.telefono || '—')}</td>
                                            <td class="cell-dim">${esc(ciudad ? (ciudad.nombre || '—') : '—')}</td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ${meta && meta.last_page > 1 ? pagerHtml(meta.current_page, meta.last_page, meta.total, meta.from, meta.to) : ''}
                </section>`;

            wirePager(box, (dir) => {
                s.page = dir === 'next' ? s.page + 1 : Math.max(1, s.page - 1);
                draw();
            });
        };

        const input = $('#q-terceros', root);
        input.addEventListener('input', debounce(() => {
            s.term = input.value;
            s.page = 1;
            draw();
        }, 320));

        $$('[data-tipo]', root).forEach((btn) => {
            btn.addEventListener('click', () => {
                s.tipo = btn.dataset.tipo;
                s.page = 1;
                $$('[data-tipo]', root).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
                draw();
            });
        });

        draw();
    }

    /* --------------------------------------------------- notificaciones */

    async function renderNotificaciones(root) {
        root.innerHTML = `
            ${head('Notificaciones', 'Avisos del sistema dirigidos a tu usuario.')}
            <div data-list>${skeletonRows(5)}</div>`;

        const box = $('[data-list]', root);

        const load = async () => {
            try {
                const res = await api.request('/api/transversal/in-app-notifications?per_page=50');
                const list = Array.isArray(res && res.data) ? res.data : [];

                if (!list.length) {
                    box.innerHTML = `<section class="panelbox">${boxEmpty('Bandeja vacía', 'No hay notificaciones registradas.')}</section>`;
                    return;
                }

                const unread = list.filter((n) => !n.read_at).length;

                box.innerHTML = `
                    <section class="panelbox">
                        <div class="panelbox__head">
                            <h2 class="panelbox__title">Bandeja de entrada</h2>
                            <button class="btn btn--quiet" type="button" data-read-all ${unread ? '' : 'disabled'}>
                                Marcar todas como leídas (${fmt(unread)})
                            </button>
                        </div>
                        <div class="notif">${list.map(notifItem).join('')}</div>
                    </section>`;

                $$('[data-read]', box).forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        btn.setAttribute('aria-busy', 'true');
                        try {
                            await api.request(`/api/transversal/in-app-notifications/${btn.dataset.read}/read`, {
                                method: 'PATCH',
                                body: {},
                            });
                            await refreshBadge();
                            await load();
                            toast('Notificación marcada como leída.');
                        } catch (e) {
                            toast(e.message, 'bad');
                            btn.removeAttribute('aria-busy');
                        }
                    });
                });

                const all = $('[data-read-all]', box);
                if (all) {
                    all.addEventListener('click', async () => {
                        all.setAttribute('aria-busy', 'true');
                        try {
                            const res2 = await api.request('/api/transversal/in-app-notifications/read-all', {
                                method: 'POST',
                                body: {},
                            });
                            const marked = num(res2 && res2.data && res2.data.marked);

                            await refreshBadge();
                            await load();
                            toast(marked ? `${fmt(marked)} notificación(es) marcadas como leídas.` : 'No había pendientes.');
                        } catch (e) {
                            toast(e.message, 'bad');
                            all.removeAttribute('aria-busy');
                        }
                    });
                }
            } catch (e) {
                box.innerHTML = `<section class="panelbox">${boxError(e.message)}</section>`;
            }
        };

        load();
    }

    /* ------------------------------------------------------- badge / toast */

    function paintBadge(count) {
        $$('[data-badge]').forEach((el) => {
            el.textContent = fmt(count);
            el.hidden = count <= 0;
        });
    }

    async function refreshBadge() {
        try {
            const res = await api.request('/api/transversal/in-app-notifications/unread-count');
            paintBadge(num(res && res.data && res.data.count));
        } catch (e) { /* el badge no es crítico */ }
    }

    const toast = (message, kind) => {
        const box = $('[data-toaster]');
        if (!box) return;

        const el = document.createElement('div');
        el.className = 'toast' + (kind === 'bad' ? ' toast--bad' : '');
        el.textContent = message;
        box.appendChild(el);

        setTimeout(() => {
            el.classList.add('toast--out');
            setTimeout(() => el.remove(), 240);
        }, kind === 'bad' ? 6000 : 3600);
    };

    /* -------------------------------------------------------------- boot */

    function paintProfile() {
        const p = state.profile;

        const name = $('[data-who-name]');
        if (name) name.textContent = fullName(p);

        const role = $('[data-who-role]');
        if (role) role.textContent = (p.roles || [])[0] || 'Sin rol';

        const avatar = $('[data-avatar]');
        if (avatar) {
            if (p.avatar_url) {
                avatar.style.backgroundImage = `url("${p.avatar_url}")`;
                avatar.textContent = '';
            } else {
                avatar.textContent = initials(fullName(p));
            }
        }
    }

    function bootApp() {
        try {
            state.profile = JSON.parse($('#perfil').textContent || '{}');
        } catch (e) {
            state.profile = {};
        }

        paintProfile();

        // Navegación interna por atributo data-route.
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-route]');
            if (!trigger) return;
            event.preventDefault();
            go(trigger.dataset.route);
        });

        // Vista de notificaciones: manejadores propios. En el resto de vistas
        // (resumen del panel) se delegan aquí.
        document.addEventListener('click', (event) => {
            const read = event.target.closest('[data-read]');
            if (!read || read.closest('[data-list]')) return;

            event.stopPropagation();
            read.setAttribute('aria-busy', 'true');

            api.request(`/api/transversal/in-app-notifications/${read.dataset.read}/read`, { method: 'PATCH', body: {} })
                .then(() => refreshBadge().then(() => loadNotificationPreview(document)))
                .catch((e) => toast(e.message, 'bad'))
                .finally(() => read.removeAttribute('aria-busy'));
        });

        window.addEventListener('popstate', () => go(currentRoute(), false));

        // Menú lateral en pantallas angostas.
        const burger = $('[data-burger]');
        const shell = $('#shell');

        if (burger && shell) {
            burger.addEventListener('click', () => {
                const open = shell.getAttribute('data-open') === '1';
                shell.setAttribute('data-open', open ? '0' : '1');
                burger.setAttribute('aria-expanded', String(!open));
            });

            shell.addEventListener('click', (e) => {
                if (shell.getAttribute('data-open') === '1' && e.target === shell) {
                    shell.removeAttribute('data-open');
                    burger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        const logout = $('[data-logout]');
        if (logout) {
            logout.addEventListener('click', async () => {
                logout.setAttribute('aria-busy', 'true');
                try {
                    await api.request('/api/logout', { method: 'POST' });
                    api.clear();
                    window.location.href = '/login';
                } catch (e) {
                    toast(e.message, 'bad');
                    logout.removeAttribute('aria-busy');
                }
            });
        }

        // Si cualquier petición detecta la sesión caída, se vuelve al acceso.
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason instanceof ApiError && event.reason.status === 401) {
                event.preventDefault();
                window.location.href = '/login';
            }
        });

        refreshBadge();
        setInterval(refreshBadge, 120000);

        go(currentRoute(), false);
    }

    /* --------------------------------------------------------- arranque */

    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.classList.contains('auth')) bootLogin();
        else if (document.body.classList.contains('app')) bootApp();
    });
})();