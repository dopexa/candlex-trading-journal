(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function Button({ label, variant = 'primary', size = 'md', type = 'button', action = '', disabled = false, loading = false, shortcutHint = '', iconLeft = '', className = '' } = {}) {
    const busy = loading ? ' aria-busy="true" disabled' : disabled ? ' disabled aria-disabled="true"' : '';
    const shortcut = shortcutHint ? ` aria-keyshortcuts="${escapeHtml(shortcutHint)}"` : '';
    return `<button type="${escapeHtml(type)}" class="btn btn-${escapeHtml(variant)} btn-${escapeHtml(size)} ${escapeHtml(className)}"${action ? ` data-action="${escapeHtml(action)}"` : ''}${busy}${shortcut}>${iconLeft ? `<span aria-hidden="true">${iconLeft}</span>` : ''}${loading ? '<span class="cx-spinner" aria-hidden="true"></span>' : escapeHtml(label)}${shortcutHint ? `<kbd class="shortcut-hint">${escapeHtml(shortcutHint)}</kbd>` : ''}</button>`;
  }

  function Field({ id, label, name = id, type = 'text', value = '', placeholder = '', required = false, error = '', helper = '', disabled = false, readOnly = false, inputMode = '', options = [] } = {}) {
    const errorId = `${id}-error`, helpId = `${id}-help`, describedBy = error ? errorId : helper ? helpId : '';
    const common = `id="${escapeHtml(id)}" name="${escapeHtml(name)}" class="input cx-field-control"${required ? ' required' : ''}${disabled ? ' disabled' : ''}${readOnly ? ' readonly' : ''}${inputMode ? ` inputmode="${escapeHtml(inputMode)}"` : ''}${describedBy ? ` aria-describedby="${escapeHtml(describedBy)}"` : ''}${error ? ' aria-invalid="true"' : ''}`;
    const control = type === 'select'
      ? `<select ${common}>${options.map(option => `<option value="${escapeHtml(option.value)}"${String(option.value) === String(value) ? ' selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>`
      : type === 'textarea'
        ? `<textarea ${common} placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
        : `<input ${common} type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`;
    return `<div class="cx-field" data-state="${error ? 'error' : disabled ? 'disabled' : readOnly ? 'read-only' : value ? 'filled' : 'default'}"><label class="field-label" for="${escapeHtml(id)}">${escapeHtml(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${control}${error ? `<p class="cx-field-error" id="${escapeHtml(errorId)}">${escapeHtml(error)}</p>` : helper ? `<p class="field-help" id="${escapeHtml(helpId)}">${escapeHtml(helper)}</p>` : ''}</div>`;
  }

  function Chip({ label, selected = false, removable = false, action = '', mode = 'tag' } = {}) {
    if (mode === 'choice') return `<button type="button" class="emotion-chip" aria-pressed="${Boolean(selected)}"${action ? ` data-action="${escapeHtml(action)}"` : ''}>${escapeHtml(label)}</button>`;
    return `<span class="tag-chip" data-state="${selected ? 'selected' : 'default'}">${escapeHtml(label)}${removable ? `<button type="button" aria-label="Remove tag ${escapeHtml(label)}"${action ? ` data-action="${escapeHtml(action)}"` : ''}>×</button>` : ''}</span>`;
  }

  function Badge({ label, kind = 'status', state = 'safe', value = null } = {}) {
    if (kind === 'pnl') {
      const amount = Number(value) || 0;
      const formatted = typeof window.formatMoney === 'function' ? window.formatMoney(amount, undefined, { sign: true }) : `${amount > 0 ? '+' : ''}${amount}`;
      return `<span class="cx-badge cx-badge-pnl ${amount < 0 ? 'cx-neg' : 'cx-pos'}" data-state="${amount < 0 ? 'loss' : amount > 0 ? 'profit' : 'flat'}">${escapeHtml(formatted)}</span>`;
    }
    return `<span class="cx-badge cx-badge-status" data-state="${escapeHtml(state)}"><i aria-hidden="true"></i>${escapeHtml(label)}</span>`;
  }

  function KpiCard({ label, value, valueClass = '', state = 'default', trend = '', className = '', tilt = true } = {}) {
    return `<article class="tile ${escapeHtml(className)}"${tilt ? ' data-tilt' : ''} data-state="${escapeHtml(state)}" role="region" aria-label="${escapeHtml(label)}"><div class="tile-label">${escapeHtml(label)}</div><div class="tile-value ${escapeHtml(valueClass)} cx-num" data-count-up>${value}</div>${trend ? `<small class="cx-kpi-trend">${escapeHtml(trend)}</small>` : ''}</article>`;
  }

  function NavItem({ label, view, icon = '', active = false, collapsed = false } = {}) {
    return `<button class="nav-btn" data-action="nav" data-view="${escapeHtml(view)}" data-state="${active ? 'active' : 'default'}"${active ? ' aria-current="page"' : ''}${collapsed ? ` title="${escapeHtml(label)}"` : ''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></button>`;
  }

  function DayCell({ date, day, label, pnl = null, type = '', intensity = 0, isToday = false, isBest = false, isWorst = false, isOutsideMonth = false, selected = false, index = 0 } = {}) {
    const hasData = pnl !== null && pnl !== undefined;
    const state = isOutsideMonth ? 'outside' : selected ? 'selected' : hasData ? pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'flat' : 'empty';
    const formatted = hasData && typeof window.formatMoney === 'function' ? window.formatMoney(pnl, undefined, { sign: true }) : '';
    const compact = hasData && typeof window.formatMoney === 'function' ? window.formatMoney(pnl, undefined, { sign: true, notation: 'compact', maximumFractionDigits: 1 }) : formatted;
    const classes = ['cal-cell', isToday && 'is-today', isOutsideMonth && 'is-outside', selected && 'is-selected', isBest && 'is-best', isWorst && 'is-worst', hasData && 'has-data', hasData && (pnl > 0 ? 'is-profit' : pnl < 0 ? 'is-loss' : 'is-flat')].filter(Boolean).join(' ');
    return `<button type="button" class="${classes}" style="--pnl-alpha:${Math.max(0, Math.min(.42, Number(intensity) || 0))};--cal-index:${Number(index) || 0}" data-state="${state}" data-action="open-day" data-date="${escapeHtml(date)}" aria-label="${escapeHtml(label)}${hasData ? `, ${escapeHtml(formatted)}, ${escapeHtml(type)}` : ', no result'}"><span class="cal-cell-head"><span class="cal-daynum">${escapeHtml(day)}</span><span class="cal-cell-marker" aria-hidden="true">${hasData ? '•' : ''}</span></span>${hasData ? `<span class="cal-pl ${pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'flat'} cx-num"><span class="cal-full-value">${escapeHtml(formatted)}</span><span class="cal-short-value">${escapeHtml(compact)}</span></span><span class="cal-count">${escapeHtml(type)}</span>` : ''}</button>`;
  }

  function Modal({ title, body = '', footer = '', labelledBy = 'cx-modal-title', className = '' } = {}) {
    return `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${escapeHtml(className)}" data-stop role="dialog" aria-modal="true" aria-labelledby="${escapeHtml(labelledBy)}"><div class="modal-head"><h2 class="modal-title" id="${escapeHtml(labelledBy)}">${escapeHtml(title)}</h2><button type="button" class="icon-btn" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</section></div>`;
  }

  function RuleGauge({ label, value = 0, limit = 0, kind = 'limit', status = 'safe', approximate = false } = {}) {
    const numericLimit = Math.max(0, Number(limit) || 0), numericValue = Math.max(0, Number(value) || 0);
    const percent = numericLimit ? Math.max(0, Math.min(100, numericValue / numericLimit * 100)) : 0;
    return `<section class="cx-rule-gauge" data-state="${escapeHtml(status)}"><div class="cx-rule-head"><strong>${escapeHtml(label)}</strong>${approximate ? '<span class="cx-approx">Approx.</span>' : ''}</div><div class="cx-rule-track" role="progressbar" aria-label="${escapeHtml(label)}: ${Math.round(numericValue)} of ${Math.round(numericLimit)} used, ${escapeHtml(status)}" aria-valuemin="0" aria-valuemax="${numericLimit}" aria-valuenow="${Math.min(numericValue, numericLimit)}"><span style="width:${kind === 'target' ? Math.min(100, percent) : percent}%"></span></div><div class="cx-rule-values"><span>${escapeHtml(String(numericValue))}</span><span>${escapeHtml(String(numericLimit))}</span></div></section>`;
  }

  function Toast(message, { error = false, undo = null, duration = 5000 } = {}) {
    const root = document.getElementById('toastRoot');
    if (!root) return null;
    while (root.children.length >= 3) root.firstElementChild.remove();
    const item = document.createElement('div');
    item.className = `toast${error ? ' toast-err' : ''}`;
    item.setAttribute('role', error ? 'alert' : 'status');
    const text = document.createElement('span'); text.textContent = message; item.appendChild(text);
    if (typeof undo === 'function') {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'cx-toast-undo'; button.textContent = 'Undo';
      button.addEventListener('click', () => { undo(); item.remove(); }); item.appendChild(button);
    }
    let timer;
    const dismiss = () => { clearTimeout(timer); item.classList.remove('show'); setTimeout(() => item.remove(), 300); };
    const startTimer = () => { clearTimeout(timer); timer = setTimeout(dismiss, duration); };
    item.addEventListener('mouseenter', () => clearTimeout(timer)); item.addEventListener('mouseleave', startTimer);
    item.addEventListener('focusin', () => clearTimeout(timer)); item.addEventListener('focusout', startTimer);
    root.appendChild(item); requestAnimationFrame(() => item.classList.add('show')); startTimer(); return item;
  }

  function GalleryTile({ thumbUrl = '', instrument = '', date = '', pnl = 0, currency = undefined, emotion = '', action = 'gallery-open', id = '' } = {}) {
    const formatted = typeof window.formatMoney === 'function' ? window.formatMoney(pnl, currency, { sign: true }) : String(pnl);
    return `<button type="button" class="cx-gallery-tile" data-action="${escapeHtml(action)}" data-id="${escapeHtml(id)}" data-state="loading"><img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(`${instrument}, ${date}, ${formatted}`)}" loading="lazy"><span class="cx-gallery-pnl ${Number(pnl) < 0 ? 'cx-neg' : 'cx-pos'}">${escapeHtml(formatted)}</span><span class="cx-gallery-caption"><strong>${escapeHtml(instrument)}</strong><small>${escapeHtml(date)}${emotion ? ` · ${escapeHtml(emotion)}` : ''}</small></span></button>`;
  }

  function Skeleton({ className = '', label = 'Loading' } = {}) {
    return `<span class="cx-skeleton ${escapeHtml(className)}" role="status" aria-label="${escapeHtml(label)}"></span>`;
  }

  function EmptyState({ title, body, actionLabel = '', action = '' } = {}) {
    const logo = window.CandleXLogo?.render({ layout: 'stacked', size: 'large', wordmark: false }) || '<img src="./assets/candlex-mark.svg" alt="" class="cx-empty-mark">';
    return `<section class="empty cx-empty-state" data-state="empty">${logo}<h2 class="empty-title">${escapeHtml(title)}</h2><p class="empty-body">${escapeHtml(body)}</p>${actionLabel ? Button({ label: actionLabel, action, variant: 'primary' }) : ''}</section>`;
  }

  window.CandleXUI = Object.freeze({ Button, Field, Chip, Badge, KpiCard, NavItem, DayCell, Modal, RuleGauge, Toast, GalleryTile, Skeleton, EmptyState });
})();
