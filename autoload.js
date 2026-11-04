/*!
 * 芙宁娜 Live2D 看板娘 - 统一加载脚本
 *
 * 两种模式：
 *   mini   （默认，主模型）：自建 WebGL 渲染器 + 量化网格，2.4 MB，秒开
 *   widget （回退）        ：原版 Cubism 看板娘（PIXI + 91 MB moc3），带气泡对话/工具栏
 *
 * 切换方式（任选其一）：
 *   <script>window.LIVE2D_MODE = 'widget'</script>   // 在引入本脚本前设置
 *   autoload.js?mode=widget                          // URL 参数
 */
(function () {
  'use strict';

  var PAGES = 'https://zjkl0330.github.io/Live2D/';
  /* 自建版资源线路：Pages 优先，jsDelivr 两条兜底 */
  var MINI_BASES = [
    PAGES + 'furina-mini/',
    'https://testingcf.jsdelivr.net/gh/zjkl0330/Live2D@master/furina-mini/',
    'https://cdn.jsdelivr.net/gh/zjkl0330/Live2D@master/furina-mini/'
  ];
  /* 与 index.html 的 VER 保持同步，用于资源缓存穿透 */
  var MINI_VER = 'v20261104a';

  var qs = new URLSearchParams(location.search);
  var MODE = (window.LIVE2D_MODE || qs.get('mode') || 'mini').toLowerCase();

  if (MODE === 'widget') { bootWidget(); return; }
  bootMini();

  /* ============================================================
   *  自建渲染器模式（主模型）
   * ============================================================ */
  function bootMini() {
    var host = document.createElement('div');
    host.id = 'furina-mini-dock';
    host.innerHTML =
      '<style>' +
      '#furina-mini-dock{position:fixed;right:18px;bottom:0;z-index:2147483000;' +
        'width:clamp(180px,26vw,300px);pointer-events:none;' +
        'transition:opacity .45s ease,transform .45s ease}' +
      '#furina-mini-dock.fm-in{opacity:1;transform:none}' +
      '#furina-mini-dock.fm-out{opacity:0;transform:translateY(18px)}' +
      '#furina-mini-dock .fm-body{position:relative;pointer-events:auto;' +
        'filter:drop-shadow(0 14px 30px rgba(20,60,140,.32))}' +
      '#furina-mini-dock .fm-close{position:absolute;top:4px;right:4px;width:24px;height:24px;' +
        'border:0;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;' +
        'color:#cfe2ff;background:rgba(20,34,58,.55);backdrop-filter:blur(6px);' +
        'opacity:0;transition:opacity .2s}' +
      '#furina-mini-dock .fm-body:hover .fm-close{opacity:1}' +
      '#furina-mini-dock .fm-close:hover{background:rgba(201,72,92,.75);color:#fff}' +
      '#furina-mini-dock .fm-tip{position:absolute;left:50%;top:-6px;transform:translate(-50%,-100%);' +
        'white-space:nowrap;font-size:12px;padding:5px 11px;border-radius:999px;' +
        'color:#eaf3ff;background:rgba(16,28,48,.86);border:1px solid rgba(140,185,255,.22);' +
        'opacity:0;transition:opacity .3s;pointer-events:none}' +
      '#furina-mini-dock.fm-in .fm-tip{opacity:1}' +
      '@media(max-width:860px){#furina-mini-dock{right:8px;width:clamp(150px,42vw,220px)}}' +
      '</style>' +
      '<div class="fm-body">' +
        '<div class="fm-tip">轻点她试试～</div>' +
        '<button class="fm-close" title="隐藏看板娘" aria-label="隐藏">×</button>' +
        '<div class="fm-canvas"></div>' +
      '</div>';
    document.body.appendChild(host);

    var box = host.querySelector('.fm-canvas');
    var closeBtn = host.querySelector('.fm-close');
    var tip = host.querySelector('.fm-tip');
    var size = Math.round(box.getBoundingClientRect().width) || 260;

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      host.classList.remove('fm-in');
      host.classList.add('fm-out');
      setTimeout(function () { host.remove(); }, 500);
    });

    function loadScript(url, timeoutMs) {
      return new Promise(function (res, rej) {
        var s = document.createElement('script');
        var done = false;
        var timer = setTimeout(function () {
          if (done) return; done = true; s.remove(); rej(new Error('timeout'));
        }, timeoutMs || 12000);
        s.src = url;
        s.onload = function () { if (done) return; done = true; clearTimeout(timer); res(); };
        s.onerror = function () { if (done) return; done = true; clearTimeout(timer); s.remove(); rej(new Error('fail')); };
        document.head.appendChild(s);
      });
    }

    function tryBase(i) {
      if (i >= MINI_BASES.length) {
        console.warn('[FurinaMini] 所有线路均失败，看板娘未加载');
        host.remove();
        return;
      }
      var base = MINI_BASES[i];
      loadScript(base + 'furina-mini.js?v=' + MINI_VER, 14000)
        .then(function () {
          if (!window.FurinaMini) throw new Error('no FurinaMini');
          return window.FurinaMini.mount(box, {
            size: size,
            base: base,
            ver: MINI_VER,
            frames: ['blink', 'eyeLeft', 'eyeRight', 'eyeUp', 'eyeDown',
                     'smile', 'catMouth', 'mouthOpen', 'angry', 'cry', 'blush']
          });
        })
        .then(function () {
          host.classList.add('fm-in');
          setTimeout(function () { if (tip) tip.style.opacity = '0'; }, 5200);
        })
        .catch(function () { tryBase(i + 1); });
    }
    tryBase(0);
  }

  /* ============================================================
   *  原版 Cubism 看板娘（回退模式）
   * ============================================================ */
  function bootWidget() {
    /* 插件核心(dist)所在路径，含末尾 / */
    var live2d_path = PAGES + 'dist/';
    /* 模型大文件（91MB moc3 等）走自定义加速 DNS（镜像 raw.githubusercontent.com） */
    var model_root = 'https://raw-githubusercontent-com-gh.zjkl0330.dpdns.org/zjkl0330/Live2D/refs/heads/master/';

    function loadExternalResource(url, type) {
      return new Promise(function (resolve, reject) {
        var tag;
        if (type === 'css') {
          tag = document.createElement('link');
          tag.rel = 'stylesheet';
          tag.href = url;
        } else if (type === 'js') {
          tag = document.createElement('script');
          tag.type = 'module';
          tag.src = url;
        }
        if (tag) {
          tag.onload = function () { resolve(url); };
          tag.onerror = function () { reject(url); };
          document.head.appendChild(tag);
        }
      });
    }

    /* ===== 下载进度追踪：包装 fetch，统计模型文件字节数 ===== */
    function installProgressTracker() {
      var EXPECTED_TOTAL = 98378358;   // moc3(91MB) + 4K WebP(2.5MB) + physics + cdi + idle
      var state = window.__live2dProgress = { total: EXPECTED_TOTAL, loaded: 0, activeUrl: null };
      var origFetch = window.fetch.bind(window);
      var rafPending = false;

      function updateUI() {
        var el = document.getElementById('waifu-loading');
        if (!el) return;
        var bar = el.querySelector('.waifu-loading-bar-fill');
        var pct = el.querySelector('.waifu-loading-pct');
        var info = el.querySelector('.waifu-loading-info');
        if (!bar || !pct) return;
        var p = Math.min(100, Math.round(state.loaded / state.total * 100));
        bar.style.width = p + '%';
        pct.textContent = p + '%';
        if (info) {
          var f = state.activeUrl ? state.activeUrl.split('/').pop() : '';
          var mb = function (n) { return (n / 1048576).toFixed(1); };
          info.textContent = f
            ? '正在下载 ' + f + ' · ' + mb(state.loaded) + ' / ' + mb(state.total) + ' MB'
            : '已下载 ' + mb(state.loaded) + ' / ' + mb(state.total) + ' MB';
        }
      }
      function scheduleUI() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () { rafPending = false; updateUI(); });
      }

      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.indexOf('model/') === -1) return origFetch(input, init);
        return origFetch(input, init).then(function (resp) {
          if (!resp || !resp.body) return resp;
          state.activeUrl = url;
          var reader = resp.body.getReader();
          var chunks = [];
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) {
                var headers = new Headers(resp.headers);
                headers.delete('content-encoding');
                headers.delete('content-length');
                headers.delete('transfer-encoding');
                return new Response(new Blob(chunks), {
                  status: resp.status, statusText: resp.statusText, headers: headers
                });
              }
              chunks.push(r.value);
              state.loaded += r.value.byteLength;
              scheduleUI();
              return pump();
            });
          }
          return pump();
        });
      };
    }

    /* ===== 加载框 ===== */
    function showLoading() {
      if (document.getElementById('waifu-loading')) return;
      document.body.classList.add('live2d-loading');

      var wrap = document.createElement('div');
      wrap.id = 'waifu-loading';
      wrap.innerHTML =
        '<div class="waifu-loading-spin"></div>' +
        '<div class="waifu-loading-text">看板娘正在准备迎客</div>' +
        '<div class="waifu-loading-bar"><div class="waifu-loading-bar-fill"></div></div>' +
        '<div class="waifu-loading-pct">0%</div>' +
        '<div class="waifu-loading-info">正在连接模型…</div>';
      document.body.appendChild(wrap);

      if (window.__live2dProgress) {
        var el = document.getElementById('waifu-loading');
        var bar = el.querySelector('.waifu-loading-bar-fill');
        var pct = el.querySelector('.waifu-loading-pct');
        var info = el.querySelector('.waifu-loading-info');
        var st = window.__live2dProgress;
        var p = Math.min(100, Math.round(st.loaded / st.total * 100));
        if (bar) bar.style.width = p + '%';
        if (pct) pct.textContent = p + '%';
        if (info) info.textContent = '已下载 ' + (st.loaded / 1048576).toFixed(1) + ' / ' + (st.total / 1048576).toFixed(1) + ' MB';
      }

      function onLoaded() {
        var el2 = document.getElementById('waifu-loading');
        if (!el2) return;
        var text = el2.querySelector('.waifu-loading-text');
        var pct2 = el2.querySelector('.waifu-loading-pct');
        var info2 = el2.querySelector('.waifu-loading-info');
        var bar2 = el2.querySelector('.waifu-loading-bar-fill');
        if (text) text.textContent = '模型加载完成，正在渲染…';
        if (pct2) pct2.textContent = '100%';
        if (info2) info2.textContent = '即将登场，请稍候';
        if (bar2) bar2.style.width = '100%';
      }

      var stallTimer;
      function hide() {
        var el3 = document.getElementById('waifu-loading');
        if (el3) el3.remove();
        document.body.classList.remove('live2d-loading');
        window.removeEventListener('live2d:rendered', hide);
        window.removeEventListener('live2d:loaded', onLoaded);
        window.clearInterval(stallTimer);
      }

      window.addEventListener('live2d:loaded', onLoaded, { once: true });
      window.addEventListener('live2d:rendered', hide, { once: true });

      var lastLoaded = 0;
      stallTimer = window.setInterval(function () {
        var st2 = window.__live2dProgress;
        var cur = st2 ? st2.loaded : 0;
        if (cur > lastLoaded) { lastLoaded = cur; return; }
        hide();
      }, 60000);
    }

    (async function () {
      (function initConfig() {
        var preset = (typeof LIVE2D_PRESET !== 'undefined') ? LIVE2D_PRESET : {};
        var cfg = Object.assign(
          { angleX: 30, angleY: 30, angleZ: 30, bodyAngleX: 10, deadZone: 0.06 },
          preset || {}
        );
        try {
          var saved = JSON.parse(window.localStorage.getItem('live2dConfig') || 'null');
          if (saved && typeof saved === 'object') Object.assign(cfg, saved);
        } catch (e) {}
        window.__live2dConfig = cfg;
      })();

      installProgressTracker();

      var OriginalImage = window.Image;
      window.Image = function () {
        var img = new OriginalImage();
        for (var i = 0; i < arguments.length; i++) {
          if (i === 0) img.src = arguments[0];
          else if (i === 1) img.width = arguments[1];
          else if (i === 2) img.height = arguments[2];
        }
        img.crossOrigin = 'anonymous';
        return img;
      };
      window.Image.prototype = OriginalImage.prototype;

      await Promise.all([
        loadExternalResource(live2d_path + 'waifu.css', 'css'),
        loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
      ]);

      showLoading();

      window.initWidget({
        waifuPath: live2d_path + 'waifu-tips.json',
        cdnPath: model_root,
        cubism2Path: live2d_path + 'live2d.min.js',
        cubism5Path: live2d_path + 'live2dcubismcore.min.js',
        tools: ['hitokoto', 'photo', 'info', 'quit'],
        modelId: 0,
        drag: false,
        logLevel: 'info'
      });

      loadExternalResource(live2d_path + 'config-panel.js', 'js');
    })();
  }
})();
