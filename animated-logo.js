(() => {
  let logoId = 0;

  function AnimatedLogo({ layout = 'row', size = 'row', className = '', wordmark = true, label = 'candleX' } = {}) {
    const id = `cxLogoBand${++logoId}`;
    const safeLayout = layout === 'stacked' ? 'stacked' : 'row';
    const safeSize = ['auth', 'large'].includes(size) ? size : 'row';
    const classes = ['cx-logo3d', `cx-logo3d--${safeLayout}`, `cx-logo3d--${safeSize}`, className].filter(Boolean).join(' ');
    return `<span class="${classes}" data-layout="${safeLayout}" role="img" aria-label="${label}">
      <span class="cx-logo3d__tilt"><span class="cx-logo3d__stage">
        <svg class="cx-logo3d__layer cx-logo3d__layer--disc" viewBox="100 96 400 332" aria-hidden="true"><circle cx="302" cy="262" r="150" fill="var(--cx-accent)" fill-opacity=".09"/></svg>
        <svg class="cx-logo3d__layer cx-logo3d__layer--band" viewBox="100 96 400 332" aria-hidden="true"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="151" y1="0" x2="446" y2="0"><stop offset="0" stop-color="var(--cx-neutral)"/><stop offset=".26" stop-color="var(--cx-neutral)"/><stop offset=".38" stop-color="var(--cx-surface)"/><stop offset=".58" stop-color="var(--cx-surface)"/><stop offset=".70" stop-color="var(--cx-neutral)"/><stop offset="1" stop-color="var(--cx-neutral)"/></linearGradient></defs><path d="M151 155 L446 347 L446 372 L151 207 Z" fill="url(#${id})"/></svg>
        <svg class="cx-logo3d__layer cx-logo3d__layer--purple" viewBox="100 96 400 332" aria-hidden="true"><path d="M119 348 L197 348 L484 113 L437 113 Z" fill="var(--cx-accent)"/></svg>
        <svg class="cx-logo3d__layer cx-logo3d__layer--blade" viewBox="100 96 400 332" aria-hidden="true"><path d="M151 411 L215 411 L460 171 Z" fill="var(--cx-neutral)"/></svg>
      </span></span>${wordmark ? `<span class="cx-logo3d__word"><span>candle</span><b>X</b></span>` : ''}</span>`;
  }

  function attachPointerTilt() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(hover: none)').matches) return;
    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const logo = event.target.closest('.cx-logo3d');
      if (!logo) return;
      const tilt = logo.querySelector('.cx-logo3d__tilt');
      if (!tilt) return;
      const bounds = logo.getBoundingClientRect(), x = (event.clientX - bounds.left) / bounds.width - .5, y = (event.clientY - bounds.top) / bounds.height - .5;
      const root = getComputedStyle(document.documentElement), maxX = Number.parseFloat(root.getPropertyValue('--cx-logo-tilt-x')) || 16, maxY = Number.parseFloat(root.getPropertyValue('--cx-logo-tilt-y')) || 12;
      tilt.style.setProperty('--cx-logo-rx', `${(-y * maxY).toFixed(1)}deg`);
      tilt.style.setProperty('--cx-logo-ry', `${(x * maxX).toFixed(1)}deg`);
    }, { passive: true });
    document.addEventListener('pointerout', event => {
      const logo = event.target.closest('.cx-logo3d');
      if (!logo || logo.contains(event.relatedTarget)) return;
      const tilt = logo.querySelector('.cx-logo3d__tilt');
      tilt?.style.removeProperty('--cx-logo-rx'); tilt?.style.removeProperty('--cx-logo-ry');
    }, { passive: true });
  }

  window.CandleXLogo = Object.freeze({ render: AnimatedLogo });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachPointerTilt, { once: true });
  else attachPointerTilt();
})();
