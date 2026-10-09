/* Oversite dropdowns: every <select> on the page gets drawn as an Oversite-styled button and menu instead of the browser's
   own list. The real <select> stays in the page, hidden, and keeps its value, name and change events, so forms and scripts
   that read or set it carry on working. Selects added later (re-rendered tables, dialogs) are picked up automatically. */
(() => {
  if (window.__ovDropdown) return; window.__ovDropdown = true;
  const css = `
.dd{position:relative;display:inline-flex;min-width:0;vertical-align:middle}
.dd-btn{display:flex;align-items:center;gap:8px;width:100%;min-width:0;text-align:left;cursor:pointer;font:inherit;line-height:1.25;-webkit-tap-highlight-color:transparent;transition:border-color .15s,background-color .15s}
.dd-btn:focus-visible{outline:none;border-color:rgba(240,242,245,.45)!important}
.dd-btn[aria-expanded="true"]{border-color:rgba(240,242,245,.45)!important}
.dd-btn:disabled{opacity:.5;cursor:default}
.dd-btn .dd-v{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dd-btn .dd-c{flex:none;width:8px;height:8px;margin:-3px 2px 0 0;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);opacity:.55;transition:transform .2s cubic-bezier(.23,1,.32,1)}
.dd-btn[aria-expanded="true"] .dd-c{transform:translateY(3px) rotate(-135deg)}
.dd-menu{position:fixed;z-index:2147483000;box-sizing:border-box;max-height:min(300px,calc(100vh - 24px));overflow:auto;overscroll-behavior:contain;padding:4px;border-radius:12px;
  background:#18191C;border:1px solid rgba(240,242,245,.12);box-shadow:0 18px 40px -12px rgba(0,0,0,.65),0 2px 6px rgba(0,0,0,.35);color:#E9EAEC;
  font:13px/1.3 Geist,-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;transform-origin:var(--dd-o,top center);animation:dd-in .14s cubic-bezier(.23,1,.32,1)}
.dd-menu.up{--dd-o:bottom center}
@keyframes dd-in{from{opacity:0;transform:scale(.97) translateY(-3px)}to{opacity:1;transform:none}}
.dd-menu.up{animation-name:dd-up}@keyframes dd-up{from{opacity:0;transform:scale(.97) translateY(3px)}to{opacity:1;transform:none}}
.dd-opt{display:flex;align-items:center;gap:10px;padding:8px 10px 8px 12px;border-radius:8px;cursor:pointer;white-space:nowrap;color:#C9CDD3}
.dd-opt.on{background:rgba(240,242,245,.07);color:#F0F2F5}
.dd-opt[aria-selected="true"]{color:#F0F2F5;font-weight:500}
.dd-opt[aria-disabled="true"]{opacity:.4;cursor:default}
.dd-opt .dd-t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.dd-opt .dd-k{flex:none;width:12px;height:7px;border-left:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:translateY(-2px) rotate(-45deg);opacity:0}
.dd-opt[aria-selected="true"] .dd-k{opacity:.9}
.dd-grp{padding:8px 12px 4px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#7A7F87}
@media (prefers-reduced-motion:reduce){.dd-menu{animation:none}.dd-btn .dd-c{transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const VAL = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value'), IDX = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let open = null, uid = 0;

  const close = (focus) => { if (!open) return; const o = open; open = null; o.menu.remove(); o.btn.setAttribute('aria-expanded', 'false'); o.btn.removeAttribute('aria-activedescendant'); if (focus) o.btn.focus({ preventScroll: true }); };

  const enhance = sel => {
    if (sel.dataset.dd || sel.multiple || sel.size > 1 || sel.closest('.dd-off')) return; sel.dataset.dd = '1';
    const cs = getComputedStyle(sel), wrap = document.createElement('span'), btn = document.createElement('button'), id = 'dd' + (++uid);
    wrap.className = 'dd'; btn.type = 'button'; btn.className = 'dd-btn'; btn.id = id + '-b';
    btn.setAttribute('role', 'combobox'); btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    // look like the select it replaces, so each page keeps its own field style
    for (const p of ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'backgroundImage', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRightWidth', 'borderRightStyle', 'borderRightColor', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'borderLeftWidth', 'borderLeftStyle', 'borderLeftColor', 'borderRadius', 'paddingTop', 'paddingBottom', 'paddingLeft', 'minHeight', 'boxShadow'])
      btn.style[p] = cs[p];
    btn.style.paddingRight = Math.max(10, parseFloat(cs.paddingLeft) || 10) + 'px'; btn.style.boxSizing = 'border-box';
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && /gradient|url/.test(cs.backgroundImage) && cs.appearance === 'none') btn.style.backgroundImage = 'none';
    wrap.style.flex = cs.flex; wrap.style.width = sel.style.width || (cs.display === 'block' || /^100%$/.test(sel.style.width) ? '100%' : ''); wrap.style.margin = cs.margin; wrap.style.minWidth = cs.minWidth;
    if (cs.display === 'block' || parseFloat(cs.width) >= (sel.parentElement?.clientWidth || 1e9) - 2) wrap.style.display = 'flex', wrap.style.width = '100%';
    btn.innerHTML = '<span class="dd-v"></span><i class="dd-c" aria-hidden="true"></i>';
    const label = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`); if (label) label.htmlFor = btn.id;
    const aria = sel.getAttribute('aria-label') || sel.title; if (aria) btn.setAttribute('aria-label', aria);
    sel.parentNode.insertBefore(wrap, sel); wrap.append(btn, sel); sel.style.display = 'none'; sel.tabIndex = -1;
    const sync = () => { const o = sel.options[sel.selectedIndex]; btn.querySelector('.dd-v').textContent = o ? o.text : ''; btn.disabled = sel.disabled; };
    Object.defineProperty(sel, 'value', { configurable: true, get() { return VAL.get.call(this); }, set(v) { VAL.set.call(this, v); sync(); } });
    Object.defineProperty(sel, 'selectedIndex', { configurable: true, get() { return IDX.get.call(this); }, set(v) { IDX.set.call(this, v); sync(); } });
    sel.addEventListener('change', sync); sel.form && sel.form.addEventListener('reset', () => setTimeout(sync));
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
    sync();

    const choose = i => { const o = sel.options[i]; if (!o || o.disabled) return; const was = sel.selectedIndex; IDX.set.call(sel, i); sync(); close(true);
      if (was !== i) { sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } };
    const setActive = (o, i) => { o.items.forEach((el, k) => el.classList.toggle('on', k === i)); o.active = i; const el = o.items[i]; if (el) { btn.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); } };
    const step = (o, d) => { let i = o.active; for (let n = 0; n < o.items.length; n++) { i = (i + d + o.items.length) % o.items.length; if (!sel.options[i].disabled) break; } setActive(o, i); };

    const show = () => {
      if (sel.disabled) return; close(); sync();
      const menu = document.createElement('div'); menu.className = 'dd-menu'; menu.setAttribute('role', 'listbox'); menu.id = id + '-m'; btn.setAttribute('aria-controls', menu.id);
      const items = []; let grp = null;
      [...sel.options].forEach((o, i) => { const g = o.parentElement.tagName === 'OPTGROUP' ? o.parentElement : null;
        if (g && g !== grp) { const h = document.createElement('div'); h.className = 'dd-grp'; h.textContent = g.label; menu.appendChild(h); } grp = g;
        const el = document.createElement('div'); el.className = 'dd-opt'; el.id = id + '-o' + i; el.setAttribute('role', 'option'); el.setAttribute('aria-selected', String(i === sel.selectedIndex));
        if (o.disabled) el.setAttribute('aria-disabled', 'true'); el.innerHTML = '<span class="dd-t"></span><i class="dd-k" aria-hidden="true"></i>'; el.firstChild.textContent = o.text;
        el.addEventListener('pointerdown', e => e.preventDefault()); el.addEventListener('click', () => choose(i)); el.addEventListener('pointermove', () => open && open.active !== i && !o.disabled && setActive(open, i));
        menu.appendChild(el); items.push(el); });
      (sel.closest('dialog[open]') || document.body).appendChild(menu);
      const r = btn.getBoundingClientRect(), h = menu.offsetHeight, below = innerHeight - r.bottom - 8, up = below < h && r.top > below;
      menu.style.minWidth = r.width + 'px'; menu.style.maxWidth = Math.max(r.width, Math.min(420, innerWidth - 16)) + 'px';
      menu.style.left = Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8)) + 'px';
      if (up) { menu.classList.add('up'); menu.style.bottom = (innerHeight - r.top + 6) + 'px'; menu.style.maxHeight = Math.min(300, r.top - 14) + 'px'; }
      else { menu.style.top = (r.bottom + 6) + 'px'; menu.style.maxHeight = Math.min(300, below - 6) + 'px'; }
      open = { sel, btn, menu, items, active: -1, choose }; btn.setAttribute('aria-expanded', 'true'); setActive(open, Math.max(0, sel.selectedIndex));
    };
    btn.addEventListener('click', () => (open && open.btn === btn ? close() : show()));
    let typed = '', typedAt = 0;
    btn.addEventListener('keydown', e => {
      const o = open && open.btn === btn ? open : null;
      if (!o) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); step(o, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); step(o, -1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(o, 0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(o, o.items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.active); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') close();
      else if (e.key.length === 1) { const now = Date.now(); typed = (now - typedAt > 700 ? '' : typed) + e.key.toLowerCase(); typedAt = now;
        const i = [...sel.options].findIndex(op => op.text.toLowerCase().startsWith(typed)); if (i >= 0) setActive(o, i); }
    });
  };

  document.addEventListener('pointerdown', e => { if (open && !open.menu.contains(e.target) && !open.btn.contains(e.target)) close(); }, true);
  addEventListener('resize', () => close()); addEventListener('blur', () => close());
  document.addEventListener('scroll', e => { if (open && !open.menu.contains(e.target)) close(); }, true);

  const scan = root => { if (root.tagName === 'SELECT') enhance(root); else if (root.querySelectorAll) root.querySelectorAll('select').forEach(enhance); };
  const start = () => { scan(document.body); new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => n.nodeType === 1 && scan(n)); }).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
