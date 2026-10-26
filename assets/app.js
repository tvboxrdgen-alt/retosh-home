/* RETOSH HOME — поведение страниц: каталог, карточка товара, конструктор пошива. */
(function () {
  'use strict';
  var R = JSON.parse(document.getElementById('site-data').textContent);
  var B = R.base || ''; // начало адреса сайта, если он открыт не из корня (например, на GitHub Pages)
  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU'); };
  var byId = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var colorOf = function (code) { return R.colors[code] || { name: code, hex: '#ccc' }; };

  /* ---------- связь с мастером ---------- */
  function messengerLinks(text) {
    var c = R.contacts, out = [], t = encodeURIComponent(text);
    if (c.whatsapp) out.push({ label: 'WhatsApp', href: 'https://wa.me/' + c.whatsapp + '?text=' + t });
    if (c.telegram) out.push({ label: 'Telegram', href: 'https://t.me/' + c.telegram });
    if (c.max) out.push({ label: 'MAX', href: c.max });
    return out;
  }
  function copyText(text, btn) {
    var done = function () { var old = btn.textContent; btn.textContent = 'Скопировано'; setTimeout(function () { btn.textContent = old; }, 1800); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* остаётся выделенный текст */ }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  // Панель «отправить мастеру»: текст заказа, мессенджеры, копирование
  function renderOrderPanel(box, text, intro) {
    var links = messengerLinks(text);
    var h = '<p><b>' + esc(intro) + '</b></p><pre>' + esc(text) + '</pre><div class="row">';
    links.forEach(function (l) { h += '<a class="btn btn-p" target="_blank" rel="noopener" href="' + esc(l.href) + '">Отправить в ' + esc(l.label) + '</a>'; });
    h += '<button type="button" class="btn btn-l" data-copy>Скопировать текст</button></div>';
    if (!links.length) h += '<p class="small">Мессенджеры для связи с мастером появятся после запуска сайта. Пока текст можно скопировать.</p>';
    else if (R.contacts.telegram) h += '<p class="small">В Telegram вставьте скопированный текст в чат.</p>';
    box.innerHTML = h; box.hidden = false;
    box.querySelector('[data-copy]').addEventListener('click', function (e) { copyText(text, e.currentTarget); });
  }

  /* ---------- корзина (хранится в браузере покупателя) ---------- */
  var CART_KEY = 'retosh-cart-v1';
  function cartLoad() { try { var v = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function cartSave(items) { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) { /* без сохранения */ } updateBadge(items); }
  function cartAdd(item) {
    var items = cartLoad(), same = null;
    for (var i = 0; i < items.length; i++) if (items[i].key === item.key) same = items[i];
    if (same) same.qty += item.qty || 1; else { item.qty = item.qty || 1; items.push(item); }
    cartSave(items); return items;
  }
  function updateBadge(items) {
    items = items || cartLoad();
    var n = items.reduce(function (s, i) { return s + i.qty; }, 0);
    [].slice.call(document.querySelectorAll('[data-cart-count]')).forEach(function (el) { el.textContent = n; el.hidden = !n; });
  }
  function added(box, what) {
    box.innerHTML = '<span>' + esc(what) + ' в корзине.</span> <a class="link" href="' + B + '/korzina/">Перейти в корзину →</a>';
    box.hidden = false;
  }
  function cartText(items) {
    var lines = ['Здравствуйте! Хочу оформить заказ с сайта RETOSH HOME:'], sum = 0, unknown = 0;
    items.forEach(function (it, i) {
      lines.push((i + 1) + '. ' + it.title + (it.qty > 1 ? ' × ' + it.qty : ''));
      (it.lines || []).forEach(function (l) { lines.push('   ' + l); });
      if (it.price != null) { lines.push('   Цена: ' + fmt(it.price * it.qty) + ' ₽'); sum += it.price * it.qty; } else { lines.push('   Цена: уточнить'); unknown++; }
    });
    lines.push('Итого по сайту: ' + fmt(sum) + ' ₽' + (unknown ? ' + позиции с ценой по уточнению' : ''));
    return { text: lines.join('\n'), sum: sum, unknown: unknown };
  }
  function initCart() {
    var list = byId('cart-list'), side = byId('cart-side'), empty = byId('cart-empty');
    function render() {
      var items = cartLoad();
      empty.hidden = items.length > 0; side.hidden = !items.length; list.hidden = !items.length;
      list.innerHTML = items.map(function (it, i) {
        return '<div class="cart-item">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" width="720" height="900">' : '<span class="cart-noimg" aria-hidden="true"></span>') +
          '<div class="ci-main"><b>' + (it.url ? '<a href="' + esc(it.url) + '">' + esc(it.title) + '</a>' : esc(it.title)) + '</b>' +
          (it.lines || []).map(function (l) { return '<span class="small">' + esc(l) + '</span>'; }).join('') +
          '<div class="ci-row"><div class="qty"><button type="button" data-dec="' + i + '" aria-label="Меньше">−</button><span>' + it.qty + '</span><button type="button" data-inc="' + i + '" aria-label="Больше">+</button></div>' +
          '<button type="button" class="reset" data-del="' + i + '">Удалить</button></div></div>' +
          '<b class="ci-price">' + (it.price != null ? fmt(it.price * it.qty) + ' ₽' : 'уточнит мастер') + '</b></div>';
      }).join('');
      var t = cartText(items);
      byId('cart-n').textContent = items.reduce(function (s, i) { return s + i.qty; }, 0);
      byId('cart-total').textContent = fmt(t.sum) + ' ₽';
      byId('cart-unknown-row').hidden = !t.unknown; byId('cart-unknown').textContent = t.unknown;
      var box = byId('cart-box'); if (!box.hidden) renderOrderPanel(box, t.text, 'Ваш заказ');
    }
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var items = cartLoad(), i;
      if (b.dataset.inc != null) { i = +b.dataset.inc; items[i].qty++; }
      else if (b.dataset.dec != null) { i = +b.dataset.dec; items[i].qty = Math.max(1, items[i].qty - 1); }
      else if (b.dataset.del != null) { items.splice(+b.dataset.del, 1); }
      else return;
      cartSave(items); render();
    });
    byId('cart-send').addEventListener('click', function () { var box = byId('cart-box'); renderOrderPanel(box, cartText(cartLoad()).text, 'Ваш заказ'); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    byId('cart-clear').addEventListener('click', function () { cartSave([]); byId('cart-box').hidden = true; render(); });
    render();
  }

  /* ---------- образцы ---------- */
  function initSamples() {
    var form = byId('samples'), max = R.samples.max, count = byId('samples-count'), btn = byId('samples-add');
    var want = new URLSearchParams(location.search).get('fabric');
    if (want && byId('f-' + want)) byId('f-' + want).classList.add('hl');
    function picked() { return [].slice.call(form.querySelectorAll('input:checked')).map(function (i) { return i.value; }); }
    function update() {
      var v = picked();
      count.textContent = 'Выбрано ' + v.length + ' из ' + max;
      btn.disabled = !v.length;
      [].slice.call(form.querySelectorAll('input')).forEach(function (i) { if (!i.checked) i.disabled = v.length >= max; });
    }
    form.addEventListener('change', update);
    btn.addEventListener('click', function () {
      var v = picked(); if (!v.length) return;
      var names = v.map(function (x) { var a = x.split(':'), f = R.fabrics.filter(function (q) { return q.id === a[0]; })[0]; return (f ? f.name : a[0]) + ', цвет ' + a[1] + ' ' + colorOf(a[1]).name; });
      cartAdd({ key: 's:' + v.slice().sort().join(','), kind: 'sample', title: 'Образцы тканей (' + v.length + ' шт.)', lines: names, price: R.samples.price, url: B + '/obrazcy/' });
      added(byId('samples-added'), 'Образцы');
      [].slice.call(form.querySelectorAll('input')).forEach(function (i) { i.checked = false; }); update();
    });
    update();
  }

  /* ---------- наши работы: фильтр по комнате ---------- */
  function initWorks() {
    var bar = byId('work-filter'); if (!bar) return;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      [].slice.call(bar.querySelectorAll('button')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      [].slice.call(document.querySelectorAll('#works .work')).forEach(function (w) { w.hidden = !!b.dataset.room && w.dataset.room !== b.dataset.room; });
    });
  }

  /* ---------- каталог ---------- */
  function initCatalog() {
    var data = JSON.parse(byId('products').textContent);
    var form = byId('filters'), grid = byId('grid'), count = byId('count'), sort = byId('sort'), empty = byId('empty');
    var box = byId('fbox');
    if (box && window.matchMedia('(max-width:860px)').matches) box.open = false;
    var groups = ['type', 'shade', 'room', 'header', 'color'];
    // фильтры из адреса страницы: /katalog/?type=tyul&room=kuhnya
    var params = new URLSearchParams(location.search);
    groups.forEach(function (g) {
      params.getAll(g).forEach(function (v) {
        v.split(',').forEach(function (x) { var el = form.querySelector('input[name="' + g + '"][value="' + x + '"]'); if (el) el.checked = true; });
      });
    });
    if (params.get('sort')) sort.value = params.get('sort');
    function selected(g) { return [].slice.call(form.querySelectorAll('input[name="' + g + '"]:checked')).map(function (i) { return i.value; }); }
    function card(p) {
      var dots = p.colors.slice(0, 5).map(function (c) { return '<i class="dot" style="--c:' + colorOf(c.code).hex + '" title="' + esc(c.code + ' ' + colorOf(c.code).name) + '"></i>'; }).join('');
      if (p.colors.length > 5) dots += '<span class="sub">+' + (p.colors.length - 5) + '</span>';
      return '<a class="card" href="' + B + '/katalog/' + p.slug + '/"><div class="ph"><img loading="lazy" src="' + B + '/img/' + p.colors[0].photos[0] + '-m.jpg" alt="' + esc(p.name) + '" width="720" height="900"><span class="tag">' + esc(p.shadeLabel) + '</span></div>' +
        '<h3>' + esc(p.name) + '</h3><div class="meta"><span class="price">от ' + fmt(p.minPrice) + ' ₽</span><span class="dots">' + dots + '</span></div>' +
        '<span class="sub">' + esc(p.sizesLabel) + ' · ' + esc(p.headerName.toLowerCase()) + '</span></a>';
    }
    function apply() {
      var f = {}; groups.forEach(function (g) { f[g] = selected(g); });
      var list = data.filter(function (p) {
        if (f.type.length && f.type.indexOf(p.type) < 0) return false;
        if (f.shade.length && f.shade.indexOf(p.shade) < 0) return false;
        if (f.header.length && f.header.indexOf(p.header) < 0) return false;
        if (f.room.length && !p.rooms.some(function (r) { return f.room.indexOf(r) >= 0; })) return false;
        if (f.color.length && !p.colors.some(function (c) { return f.color.indexOf(c.code) >= 0; })) return false;
        return true;
      });
      var s = sort.value;
      list.sort(function (a, b) { return s === 'cheap' ? a.minPrice - b.minPrice : s === 'expensive' ? b.minPrice - a.minPrice : a.rank - b.rank; });
      grid.innerHTML = list.map(card).join('');
      count.textContent = list.length + ' ' + plural(list.length, ['модель', 'модели', 'моделей']);
      empty.hidden = list.length > 0;
      var q = new URLSearchParams();
      groups.forEach(function (g) { if (f[g].length) q.set(g, f[g].join(',')); });
      if (s !== 'popular') q.set('sort', s);
      var qs = q.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
    form.addEventListener('change', apply);
    sort.addEventListener('change', apply);
    [].slice.call(document.querySelectorAll('[data-reset]')).forEach(function (b) {
      b.addEventListener('click', function () { [].slice.call(form.querySelectorAll('input:checked')).forEach(function (i) { i.checked = false; }); apply(); });
    });
    apply();
  }
  function plural(n, f) { var a = n % 10, b = n % 100; return f[(a === 1 && b !== 11) ? 0 : (a >= 2 && a <= 4 && (b < 10 || b >= 20)) ? 1 : 2]; }

  /* ---------- карточка товара ---------- */
  function productItem(p, code, si) {
    var size = p.sizes[si], photo = null;
    p.colors.forEach(function (c) { if (c.code === code) photo = c.photos[0]; });
    return { key: 'p:' + p.slug + ':' + code + ':' + si, kind: 'product', title: p.name, lines: ['Цвет: ' + code + ' ' + colorOf(code).name, 'Размер: ' + size.label],
      price: size.price, url: B + '/katalog/' + p.slug + '/', img: B + '/img/' + (photo || p.colors[0].photos[0]) + '-m.jpg' };
  }
  function initProduct() {
    var p = JSON.parse(byId('product').textContent);
    var main = byId('gal-main'), thumbs = byId('thumbs'), price = byId('price'), colorName = byId('color-name');
    var form = byId('pform'), custom = byId('custom-link');
    function photosFor(code) { for (var i = 0; i < p.colors.length; i++) if (p.colors[i].code === code) return p.colors[i].photos; return p.colors[0].photos; }
    function showPhoto(key) {
      main.src = B + '/img/' + key + '-l.jpg';
      [].slice.call(thumbs.querySelectorAll('button')).forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.key === key ? 'true' : 'false'); });
    }
    function renderThumbs(code) {
      var keys = photosFor(code).concat(p.extra || []);
      thumbs.innerHTML = keys.map(function (k, i) { return '<button type="button" data-key="' + k + '" aria-pressed="' + (i ? 'false' : 'true') + '" aria-label="Фото ' + (i + 1) + '"><img src="' + B + '/img/' + k + '-m.jpg" alt="" loading="lazy" width="720" height="900"></button>'; }).join('');
      showPhoto(keys[0]);
    }
    thumbs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) showPhoto(b.dataset.key); });
    function state() {
      var code = (form.querySelector('input[name="color"]:checked') || {}).value || p.colors[0].code;
      var si = +((form.querySelector('input[name="size"]:checked') || {}).value || 0);
      return { code: code, si: si, size: p.sizes[si] };
    }
    var lastCode = null, setUpdate = function () {};
    function update() {
      var s = state();
      price.textContent = fmt(s.size.price) + ' ₽';
      colorName.textContent = s.code + ' ' + colorOf(s.code).name;
      if (s.code !== lastCode) { renderThumbs(s.code); lastCode = s.code; }
      custom.href = B + '/poshiv/?fabric=' + p.fabric + '&color=' + s.code + '&header=' + p.header;
      setUpdate();
    }
    form.addEventListener('change', update);
    byId('add-btn').addEventListener('click', function () { var s = state(); cartAdd(productItem(p, s.code, s.si)); added(byId('added'), p.name); });

    // комплект: к шторам подбираем тюль, к тюлю — шторы
    var pairEl = byId('pair-products');
    if (pairEl) {
      var pair = JSON.parse(pairEl.textContent), mSel = byId('set-model'), cSel = byId('set-color'), sSel = byId('set-size');
      mSel.innerHTML = pair.map(function (q, i) { return '<option value="' + i + '">' + esc(q.name) + '</option>'; }).join('');
      var fill = function () {
        var q = pair[+mSel.value];
        cSel.innerHTML = q.colors.map(function (c) { return '<option value="' + c.code + '">' + c.code + ' ' + esc(colorOf(c.code).name) + '</option>'; }).join('');
        sSel.innerHTML = q.sizes.map(function (z, i) { return '<option value="' + i + '">' + esc(z.label) + ' — ' + fmt(z.price) + ' ₽</option>'; }).join('');
      };
      setUpdate = function () {
        var q = pair[+mSel.value], s = state(), b = productItem(q, cSel.value, +sSel.value);
        byId('set-img').src = b.img; byId('set-img').alt = q.name; byId('set-link').href = b.url;
        byId('set-a-name').textContent = p.name + ', ' + s.size.label; byId('set-a-price').textContent = fmt(s.size.price) + ' ₽';
        byId('set-b-name').textContent = q.name + ', ' + q.sizes[+sSel.value].label; byId('set-b-price').textContent = fmt(b.price) + ' ₽';
        byId('set-total').textContent = fmt(s.size.price + b.price) + ' ₽';
      };
      mSel.addEventListener('change', function () { fill(); setUpdate(); });
      cSel.addEventListener('change', setUpdate); sSel.addEventListener('change', setUpdate);
      byId('set-add').addEventListener('click', function () {
        var s = state(), q = pair[+mSel.value];
        cartAdd(productItem(p, s.code, s.si)); cartAdd(productItem(q, cSel.value, +sSel.value));
        added(byId('set-added'), 'Комплект');
      });
      fill();
    }
    update();
  }

  /* ---------- конструктор пошива ---------- */
  // Чистый расчёт. Размеры в сантиметрах, деньги в рублях.
  function calc(o) {
    var flat = o.cornice * o.header.k / o.panels + 10;              // ширина полотна до сборки + 2×5 см на боковые швы
    var meters = Math.ceil(flat * o.panels / 10) / 10;               // ткань по ширине карниза, шаг 10 см
    var finH = o.height + o.drop.d;
    var overRoll = finH + 15 > o.fabric.roll;                        // +15 см на верх и подгибку низа
    var grom = o.header.grommet ? Math.max(6, 2 * Math.round((flat - 10) / 36)) : 0; // шаг около 18 см, всегда чётное число
    var lined = !o.fabric.tulle && o.lining.id !== 'none';
    var shade = lined ? Math.max(o.fabric.shade, o.lining.shade) : o.fabric.shade;
    var work = o.header.work * (o.fabric.tulle ? R.tulleWorkFactor : 1);
    var sum = meters * o.fabric.price + (lined ? meters * o.lining.price : 0) + meters * work + grom * o.panels * (o.header.grommet || 0);
    return { flat: Math.round(flat), fin: Math.round(o.cornice / o.panels), finH: finH, meters: meters, overRoll: overRoll, grom: grom, shade: shade, lined: lined, total: Math.round(sum / 10) * 10 };
  }
  window.retoshCalc = calc;

  function initPoshiv() {
    var form = byId('cfg');
    var params = new URLSearchParams(location.search);
    function radios(boxId, name, list, checkedId, render) {
      byId(boxId).innerHTML = list.map(function (it) {
        var id = name + '-' + it.id;
        return '<label class="opt" for="' + id + '"><input type="radio" name="' + name + '" id="' + id + '" value="' + it.id + '"' + (it.id === checkedId ? ' checked' : '') + '><span>' + render(it) + '</span></label>';
      }).join('');
    }
    function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
    var fabric0 = find(R.fabrics, params.get('fabric')) ? params.get('fabric') : 'linen';
    var header0 = find(R.headers, params.get('header')) ? params.get('header') : 'tape';
    radios('f-fabric', 'fabric', R.fabrics, fabric0, function (f) { return esc(f.name) + '<small>' + (f.shadeText || 'затемнение ' + f.shade + '%') + ' · ' + fmt(f.price) + ' ₽/м</small>'; });
    radios('f-drop', 'drop', R.drops, 'above', function (d) { return esc(d.name); });
    radios('f-header', 'header', R.headers, header0, function (h) { return esc(h.name) + '<small>сборка ×' + String(h.k).replace('.', ',') + '</small>'; });
    radios('f-panels', 'panels', [{ id: '1', name: 'Одно полотно' }, { id: '2', name: 'Пара' }], '2', function (p) { return p.name; });
    radios('f-lining', 'lining', R.linings, 'none', function (l) { return esc(l.name) + '<small>' + (l.price ? '+' + fmt(l.price) + ' ₽/м · до ' + l.shade + '%' : 'как у ткани') + '</small>'; });
    var wantColor = params.get('color');
    function renderColors(fabric, keep) {
      var codes = fabric.colors, cur = keep && codes.indexOf(keep) >= 0 ? keep : codes[0];
      byId('f-color').innerHTML = codes.map(function (code) {
        var c = colorOf(code), id = 'color-' + code;
        return '<label class="sw" for="' + id + '"><input type="radio" name="color" id="' + id + '" value="' + code + '"' + (code === cur ? ' checked' : '') + '><i style="--c:' + c.hex + '"></i><span><b>' + code + '</b>' + esc(c.name) + '</span></label>';
      }).join('');
    }
    var curFabric = find(R.fabrics, fabric0);
    renderColors(curFabric, wantColor);
    function pick(name, list) { var v = (form.querySelector('input[name="' + name + '"]:checked') || {}).value; return find(list, v) || list[0]; }
    function num(id, min, max, def) { var v = parseFloat(byId(id).value); if (!isFinite(v)) return def; return Math.min(max, Math.max(min, v)); }
    var lastText = '', lastItem = { lines: [], price: null };
    function update(e) {
      var fabric = pick('fabric', R.fabrics);
      if (fabric !== curFabric) { var keep = (form.querySelector('input[name="color"]:checked') || {}).value; renderColors(fabric, keep); curFabric = fabric; }
      var header = pick('header', R.headers), drop = pick('drop', R.drops), lining = pick('lining', R.linings);
      var panels = +((form.querySelector('input[name="panels"]:checked') || {}).value || 2);
      var code = (form.querySelector('input[name="color"]:checked') || {}).value || fabric.colors[0], color = colorOf(code);
      R.linings.forEach(function (l) { byId('lining-' + l.id).disabled = fabric.tulle && l.id !== 'none'; });
      if (fabric.tulle) { byId('lining-none').checked = true; lining = R.linings[0]; }
      var cornice = num('w', 60, 800, 300), height = num('h', 60, 400, 265);
      var r = calc({ fabric: fabric, header: header, drop: drop, panels: panels, lining: lining, cornice: cornice, height: height });
      byId('h-hint').textContent = header.hint;
      var summary = (panels === 2 ? 'Пара полотен' : 'Одно полотно') + ' · ' + fabric.name + ' · цвет ' + code + ' ' + color.name + ' · ' + header.name.toLowerCase() + (r.lined ? ' · ' + lining.name.toLowerCase() : '');
      byId('r-sum').textContent = summary;
      byId('r-flat').textContent = fmt(r.flat) + ' см';
      byId('r-fin').textContent = fmt(r.fin) + ' см' + (panels === 2 ? ' каждое' : '');
      byId('r-height').textContent = String(r.finH).replace('.', ',') + ' см';
      byId('r-meters').textContent = String(r.meters).replace('.', ',') + ' м';
      byId('r-grom-row').hidden = !r.grom; byId('r-grom').textContent = r.grom;
      byId('r-shade').textContent = (!r.lined && fabric.shadeText) ? fabric.shadeText : r.shade + '%';
      byId('r-total').textContent = fmt(r.total) + ' ₽';
      var warn = byId('r-warn'); warn.hidden = !r.overRoll;
      warn.textContent = 'Высота больше, чем позволяет рулон этой ткани (' + fabric.roll + ' см вместе с подгибкой). Понадобится горизонтальный шов или другая ткань. Мастер предложит вариант.';
      lastItem = { price: r.total, lines: [summary, 'Карниз ' + cornice + ' см, высота до пола ' + height + ' см (' + drop.name.toLowerCase() + ')', 'Готовая высота ' + String(r.finH).replace('.', ',') + ' см, ткани ' + String(r.meters).replace('.', ',') + ' м' + (r.grom ? ', люверсов ' + r.grom + ' на полотно' : '')] };
      lastText = 'Здравствуйте! Расчёт пошива с сайта RETOSH HOME:\n' + summary + '\nШирина карниза: ' + cornice + ' см\nВысота до пола: ' + height + ' см (' + drop.name.toLowerCase() + ')\nГотовая высота: ' + String(r.finH).replace('.', ',') + ' см\nТкани: ' + String(r.meters).replace('.', ',') + ' м' + (r.grom ? '\nЛюверсов на полотно: ' + r.grom : '') + '\nОриентировочная цена: ' + fmt(r.total) + ' ₽';
      // рисунок шторы
      ['vis-l', 'vis-r'].forEach(function (id) {
        var el = byId(id);
        el.style.setProperty('--c', color.hex);
        el.style.setProperty('--op', fabric.tulle ? (fabric.id === 'voile' ? '.45' : '.62') : '1');
        el.style.setProperty('--bot', drop.id === 'above' ? '15.5%' : drop.id === 'floor' ? '14%' : '11.5%');
        el.style.setProperty('--pr', drop.id === 'puddle' ? '10px' : '0');
        el.classList.toggle('grom', !!header.grommet);
      });
      var pw = Math.max(14, Math.min(30, 10 + header.k * 6));
      byId('vis-l').style.setProperty('--pw', (panels === 2 ? pw : pw * 1.7) + '%');
      byId('vis-r').style.setProperty('--pw', pw + '%');
      byId('vis-r').hidden = panels !== 2;
      var out = byId('send-box'); if (!out.hidden) renderOrderPanel(out, lastText, 'Расчёт для мастера');
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    byId('send-btn').addEventListener('click', function () { var out = byId('send-box'); renderOrderPanel(out, lastText, 'Расчёт для мастера'); out.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    byId('cart-btn').addEventListener('click', function () {
      cartAdd({ key: 'c:' + Date.now(), kind: 'custom', title: 'Пошив по размерам', lines: lastItem.lines, price: lastItem.price, url: B + '/poshiv/' });
      added(byId('cart-added'), 'Расчёт');
    });
    update();
  }

  var page = document.body.dataset.page;
  updateBadge();
  if (page === 'cart') initCart();
  if (page === 'samples') initSamples();
  if (page === 'works') initWorks();
  if (page === 'catalog') initCatalog();
  if (page === 'product') initProduct();
  if (page === 'poshiv') initPoshiv();
})();
