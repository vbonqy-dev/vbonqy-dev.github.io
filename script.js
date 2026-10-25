(function () {
    'use strict';

    const canvas = document.getElementById('space-canvas');
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.classList.add('js');

    const vertexSource = `
attribute vec2 aPos;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;

    const fragmentSource = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uCenter;
uniform float uScale;
uniform vec2 uMouse;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.03 + 11.7;
        a *= 0.5;
    }
    return v;
}

vec3 sky(vec3 d) {
    vec2 uv = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0)));
    vec3 col = vec3(0.0);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 g = uv * (60.0 + fi * 55.0);
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash(id + fi * 31.0);
        if (h > 0.972) {
            vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
            float dd = length(f - o * 0.6);
            float b = smoothstep(0.06, 0.0, dd) * (h - 0.972) * 40.0;
            vec3 tint = mix(vec3(1.0, 0.82, 0.66), vec3(0.72, 0.82, 1.0), hash(id + 9.0));
            col += b * tint;
        }
    }
    float neb = fbm(uv * 2.4 + 4.0);
    col += vec3(0.09, 0.05, 0.035) * pow(neb, 3.0);
    return col;
}

vec3 ramp(float x) {
    vec3 c = mix(vec3(0.28, 0.03, 0.01), vec3(1.0, 0.3, 0.05), smoothstep(0.08, 0.5, x));
    c = mix(c, vec3(1.0, 0.68, 0.34), smoothstep(0.45, 0.85, x));
    c = mix(c, vec3(1.0, 0.94, 0.84), smoothstep(0.8, 1.2, x));
    c = mix(c, vec3(0.78, 0.86, 1.0), smoothstep(1.25, 1.8, x));
    return c;
}

vec4 disk(vec3 p, vec3 rd) {
    float r = length(p.xz);
    float inner = 3.0;
    float outer = 12.0;
    float edge = smoothstep(inner - 0.3, inner + 0.7, r) * (1.0 - smoothstep(outer - 5.0, outer, r));
    if (edge <= 0.0) return vec4(0.0);

    float ang = atan(p.z, p.x);
    float rot = ang + uTime * 2.4 * pow(r, -1.5);
    vec2 q = vec2(cos(rot), sin(rot));
    float n = fbm(q * 2.2 + vec2(r * 2.6, r * 0.8));
    float fine = noise(vec2(r * 14.0, 0.0) + q * 3.0);
    float dens = (0.3 + 0.85 * n) * (0.75 + 0.35 * fine);

    float temp = pow(inner / r, 0.75);
    vec3 vdir = normalize(vec3(-p.z, 0.0, p.x));
    float v = clamp(sqrt(0.5 / max(r - 1.0, 0.5)), 0.0, 0.7);
    float gam = 1.0 / sqrt(1.0 - v * v);
    float dop = 1.0 / (gam * (1.0 - v * dot(vdir, -rd)));
    float grav = sqrt(max(1.0 - 1.0 / r, 0.0));
    float shift = dop * grav;

    float intensity = pow(temp, 2.6) * dens * pow(shift, 3.0) * edge;
    vec3 col = ramp(temp * shift) * intensity * 3.2;
    float alpha = clamp(intensity * 1.6, 0.0, 0.96) * smoothstep(0.0, 0.25, edge);
    return vec4(col, alpha);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - uCenter * uRes) / uRes.y / uScale;
    float roll = -0.16;
    uv = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * uv;

    float elev = 0.16 + uMouse.y * 0.035;
    float yaw = uMouse.x * 0.12 + sin(uTime * 0.05) * 0.04;
    float dist = 28.0;
    vec3 ro = dist * vec3(sin(yaw) * cos(elev), sin(elev), -cos(yaw) * cos(elev));
    vec3 fw = normalize(-ro);
    vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
    vec3 up = cross(fw, rt);
    vec3 vel = normalize(fw * 1.9 + rt * uv.x + up * uv.y);

    vec3 dir0 = vel;
    vec3 pos = ro;
    float h2 = dot(cross(pos, vel), cross(pos, vel));
    vec3 col = vec3(0.0);
    float acc = 0.0;
    float minR = 1e3;
    float haze = 0.0;
    bool escaped = false;

    for (int i = 0; i < STEPS; i++) {
        float r = length(pos);
        minR = min(minR, r);
        float dt = clamp(0.09 * r, 0.025, 2.2);
        vec3 prev = pos;
        vel += -1.5 * h2 * pos / pow(r, 5.0) * dt;
        pos += vel * dt;

        if (prev.y * pos.y < 0.0) {
            float f = prev.y / (prev.y - pos.y);
            vec4 d = disk(mix(prev, pos, f), normalize(vel));
            col += (1.0 - acc) * d.rgb * d.a;
            acc += (1.0 - acc) * d.a;
        }

        float pr = length(pos.xz);
        haze += exp(-abs(pos.y) * 3.0) * smoothstep(2.5, 4.0, pr) * exp(-pr * 0.22) * dt;

        if (acc > 0.985) break;
        if (r < 1.0) break;
        if (r > 60.0 && dot(pos, vel) > 0.0) {
            escaped = true;
            break;
        }
    }

    if (escaped) {
        col += (1.0 - acc) * sky(normalize(mix(dir0, normalize(vel), 0.45)));
        col += (1.0 - acc) * vec3(1.0, 0.78, 0.5) * exp(-max(minR - 1.5, 0.0) * 7.0) * 0.55;
    }
    col += vec3(1.0, 0.45, 0.15) * haze * 0.022;

    col = 1.0 - exp(-col * 1.35);
    col = pow(col, vec3(0.4545));
    vec2 sv = gl_FragCoord.xy / uRes - 0.5;
    col *= 1.0 - dot(sv, sv) * 0.55;
    gl_FragColor = vec4(col, 1.0);
}`;

    function startBlackHole() {
        if (!canvas) return false;
        const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
        if (!gl) return false;

        const isMobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

        function compile(type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
        }

        const vs = compile(gl.VERTEX_SHADER, vertexSource);
        const fs = compile(gl.FRAGMENT_SHADER, '#define STEPS ' + (isMobile ? 130 : 230) + '\n' + fragmentSource);
        if (!vs || !fs) return false;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const u = {
            res: gl.getUniformLocation(program, 'uRes'),
            time: gl.getUniformLocation(program, 'uTime'),
            center: gl.getUniformLocation(program, 'uCenter'),
            scale: gl.getUniformLocation(program, 'uScale'),
            mouse: gl.getUniformLocation(program, 'uMouse')
        };

        let quality = isMobile ? 0.45 : 0.8;
        const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        let layout = { cx: 0.7, cy: 0.5, scale: 1 };
        let lastW = 0;
        let lastH = 0;

        function resize(force) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (force !== true && isMobile && w === lastW && Math.abs(h - lastH) < 160) return;
            lastW = w;
            lastH = h;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const k = Math.min(quality * dpr, 1920 / w);
            canvas.width = Math.round(w * k);
            canvas.height = Math.round(h * k);
            gl.viewport(0, 0, canvas.width, canvas.height);

            if (w < 768) {
                layout = { cx: 0.5, cy: 0.68, scale: Math.min(1, (w / h) * 1.35) };
            } else if (w < 1100) {
                layout = { cx: 0.72, cy: 0.5, scale: 0.78 };
            } else {
                layout = { cx: 0.7, cy: 0.5, scale: 0.9 };
            }
        }

        function render(t) {
            mouse.x += (mouse.tx - mouse.x) * 0.04;
            mouse.y += (mouse.ty - mouse.y) * 0.04;
            gl.uniform2f(u.res, canvas.width, canvas.height);
            gl.uniform1f(u.time, t);
            gl.uniform2f(u.center, layout.cx, layout.cy);
            gl.uniform1f(u.scale, layout.scale);
            gl.uniform2f(u.mouse, mouse.x, mouse.y);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        resize();
        window.addEventListener('resize', resize);

        if (reduceMotion) {
            render(20);
            window.addEventListener('resize', () => render(20));
            return true;
        }

        document.addEventListener('pointermove', (e) => {
            mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
        }, { passive: true });

        const start = performance.now();
        let last = start;
        let slowFrames = 0;
        let running = true;

        function frame(now) {
            if (!running) return;
            const delta = now - last;
            last = now;

            if (delta > 34 && quality > 0.35) {
                if (++slowFrames > 40) {
                    quality *= 0.8;
                    slowFrames = 0;
                    resize(true);
                }
            } else {
                slowFrames = Math.max(0, slowFrames - 1);
            }

            if (window.scrollY < window.innerHeight * 1.6) {
                render((now - start) / 1000 + 20);
            }
            requestAnimationFrame(frame);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                running = false;
            } else if (!running) {
                running = true;
                last = performance.now();
                requestAnimationFrame(frame);
            }
        });

        requestAnimationFrame(frame);
        return true;
    }

    if (!startBlackHole()) {
        root.classList.add('no-gl');
    }

    function updateCanvasFade() {
        if (!canvas) return;
        const k = Math.min(window.scrollY / window.innerHeight, 1);
        canvas.style.opacity = String(1 - k * 0.78);
    }

    const header = document.querySelector('.header');
    const burger = document.querySelector('.burger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    function closeMenu() {
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('open');
    }

    if (burger && mobileMenu) {
        burger.addEventListener('click', () => {
            const open = !mobileMenu.classList.contains('open');
            burger.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
            mobileMenu.classList.toggle('open', open);
        });
        mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
        document.addEventListener('click', (e) => {
            if (mobileMenu.classList.contains('open') && !mobileMenu.contains(e.target) && !burger.contains(e.target)) closeMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
        window.matchMedia('(min-width: 769px)').addEventListener('change', closeMenu);
    }

    function updateActiveNav() {
        const line = window.scrollY + window.innerHeight * 0.35;
        let current = 'home';
        sections.forEach((section) => {
            if (line >= section.offsetTop) current = section.id;
        });
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    }

    function onScroll() {
        updateActiveNav();
        updateCanvasFade();
        if (header) header.classList.toggle('scrolled', window.scrollY > 24);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const revealItems = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !reduceMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        revealItems.forEach((el) => observer.observe(el));
    } else {
        revealItems.forEach((el) => el.classList.add('visible'));
    }

    document.querySelectorAll('.spot').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
            el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
        });
    });

    document.querySelectorAll('[data-copy]').forEach((button) => {
        const label = button.textContent;
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(button.dataset.copy);
            } catch (e) {
                return;
            }
            button.textContent = button.dataset.done;
            setTimeout(() => {
                button.textContent = label;
            }, 1600);
        });
    });
})();
