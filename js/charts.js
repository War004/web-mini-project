// Chart Renderer — Canvas 2D
// Bar, Line, Donut charts with the warm editorial palette. No external libraries.

const Charts = (() => {

  const COLORS = [
    '#C2553A', // terracotta
    '#D4913B', // amber
    '#7A8B6F', // sage
    '#5C4A3A', // espresso
    '#9E9189', // warm gray
    '#A67C52', // caramel
    '#6B8F71', // forest
    '#C4856A'  // rose clay
  ];

  const FONT_BODY = '"DM Sans", sans-serif';
  const TEXT_PRIMARY = '#FAF6F1';
  const TEXT_SECONDARY = '#9E9189';
  const GRID_COLOR = 'rgba(158, 145, 137, 0.15)';
  const SURFACE = '#2A2320';

  function getCtx(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
  }

  // --- BAR CHART ---
  function renderBarChart(canvas, data, options = {}) {
    if (!canvas || !data || data.length === 0) return;
    const { ctx, w, h } = getCtx(canvas);
    const {
      title = '',
      horizontal = false,
      showValues = true,
      colors = COLORS,
      barRadius = 4
    } = options;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: title ? 40 : 16, right: 20, bottom: 40, left: horizontal ? 120 : 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Title
    if (title) {
      ctx.font = `600 14px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'left';
      ctx.fillText(title, padding.left, 24);
    }

    const maxVal = Math.max(...data.map(d => d.count || d.value || 0), 1);

    if (horizontal) {
      // Horizontal bars
      const barH = Math.min(28, (chartH / data.length) * 0.7);
      const gap = (chartH - barH * data.length) / (data.length + 1);

      data.forEach((d, i) => {
        const y = padding.top + gap + i * (barH + gap);
        const val = d.count || d.value || 0;
        const barW = (val / maxVal) * chartW;

        // Label
        ctx.font = `400 12px ${FONT_BODY}`;
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const label = d.option || d.label || '';
        ctx.fillText(label.length > 16 ? label.substring(0, 15) + '…' : label, padding.left - 10, y + barH / 2);

        // Bar
        ctx.fillStyle = colors[i % colors.length];
        roundRect(ctx, padding.left, y, barW, barH, barRadius);

        // Value
        if (showValues && barW > 30) {
          ctx.font = `600 11px ${FONT_BODY}`;
          ctx.fillStyle = TEXT_PRIMARY;
          ctx.textAlign = 'left';
          ctx.fillText(`${val}`, padding.left + barW + 8, y + barH / 2);
        }
      });
    } else {
      // Vertical bars
      const barW = Math.min(40, (chartW / data.length) * 0.6);
      const gap = (chartW - barW * data.length) / (data.length + 1);

      // Grid lines
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const y = padding.top + chartH - (chartH / gridSteps) * i;
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();

        ctx.font = `400 10px ${FONT_BODY}`;
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round((maxVal / gridSteps) * i), padding.left - 8, y);
      }

      data.forEach((d, i) => {
        const x = padding.left + gap + i * (barW + gap);
        const val = d.count || d.value || 0;
        const barH2 = (val / maxVal) * chartH;
        const y = padding.top + chartH - barH2;

        // Bar
        ctx.fillStyle = colors[i % colors.length];
        roundRect(ctx, x, y, barW, barH2, barRadius);

        // Label
        ctx.font = `400 10px ${FONT_BODY}`;
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = d.option || d.label || '';
        ctx.fillText(label.length > 8 ? label.substring(0, 7) + '…' : label, x + barW / 2, padding.top + chartH + 8);

        // Value on top
        if (showValues) {
          ctx.font = `600 11px ${FONT_BODY}`;
          ctx.fillStyle = TEXT_PRIMARY;
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${val}`, x + barW / 2, y - 4);
        }
      });
    }
  }

  // --- LINE CHART ---
  function renderLineChart(canvas, data, options = {}) {
    if (!canvas || !data || data.length === 0) return;
    const { ctx, w, h } = getCtx(canvas);
    const {
      title = '',
      color = COLORS[0],
      fillArea = true,
      showDots = true,
      smooth = true
    } = options;

    ctx.clearRect(0, 0, w, h);

    const padding = { top: title ? 40 : 16, right: 20, bottom: 50, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Title
    if (title) {
      ctx.font = `600 14px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'left';
      ctx.fillText(title, padding.left, 24);
    }

    const maxVal = Math.max(...data.map(d => d.count), 1);
    const points = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1 || 1)) * chartW,
      y: padding.top + chartH - (d.count / maxVal) * chartH,
      data: d
    }));

    // Grid
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padding.top + chartH - (chartH / gridSteps) * i;
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.font = `400 10px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round((maxVal / gridSteps) * i), padding.left - 8, y);
    }

    // X-axis labels (show ~6 labels max)
    const labelInterval = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % labelInterval === 0 || i === data.length - 1) {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartW;
        ctx.font = `400 10px ${FONT_BODY}`;
        ctx.fillStyle = TEXT_SECONDARY;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const dateStr = d.date ? d.date.substring(5) : `${i}`;
        ctx.save();
        ctx.translate(x, padding.top + chartH + 8);
        ctx.rotate(-0.4);
        ctx.fillText(dateStr, 0, 0);
        ctx.restore();
      }
    });

    if (points.length < 2) return;

    // Area fill
    if (fillArea) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, padding.top + chartH);
      if (smooth) {
        ctx.lineTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          const cpx = (points[i - 1].x + points[i].x) / 2;
          ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
        }
      } else {
        points.forEach(p => ctx.lineTo(p.x, p.y));
      }
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, color + '40');
      grad.addColorStop(1, color + '05');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (smooth) {
      for (let i = 1; i < points.length; i++) {
        const cpx = (points[i - 1].x + points[i].x) / 2;
        ctx.bezierCurveTo(cpx, points[i - 1].y, cpx, points[i].y, points[i].x, points[i].y);
      }
    } else {
      points.forEach(p => ctx.lineTo(p.x, p.y));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    if (showDots) {
      const dotInterval = Math.max(1, Math.floor(points.length / 15));
      points.forEach((p, i) => {
        if (i % dotInterval === 0 || i === points.length - 1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = SURFACE;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }
  }

  // --- DONUT CHART ---
  function renderDonutChart(canvas, data, options = {}) {
    if (!canvas || !data || data.length === 0) return;
    const { ctx, w, h } = getCtx(canvas);
    const {
      title = '',
      centerLabel = '',
      centerValue = '',
      colors = COLORS,
      thickness = 0.35
    } = options;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = (title ? h / 2 + 10 : h / 2);
    const radius = Math.min(w, h) * 0.35;
    const innerRadius = radius * (1 - thickness);

    // Title
    if (title) {
      ctx.font = `600 14px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'center';
      ctx.fillText(title, centerX, 24);
    }

    const total = data.reduce((s, d) => s + (d.count || d.value || 0), 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      const val = d.count || d.value || 0;
      const sliceAngle = (val / total) * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Segment gap
      ctx.strokeStyle = SURFACE;
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;
    });

    // Center text
    if (centerValue) {
      ctx.font = `700 24px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_PRIMARY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerValue, centerX, centerY - (centerLabel ? 8 : 0));
    }
    if (centerLabel) {
      ctx.font = `400 11px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(centerLabel, centerX, centerY + 16);
    }

    // Legend
    const legendY = centerY + radius + 20;
    const legendItemW = Math.min(120, w / Math.min(data.length, 3));
    const cols = Math.min(data.length, 3);
    const legendStartX = centerX - (cols * legendItemW) / 2;

    data.forEach((d, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = legendStartX + col * legendItemW;
      const y = legendY + row * 20;

      if (y > h - 10) return;

      // Color dot
      ctx.beginPath();
      ctx.arc(x + 6, y + 6, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      // Label
      ctx.font = `400 10px ${FONT_BODY}`;
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const label = d.option || d.label || '';
      ctx.fillText(label.length > 14 ? label.substring(0, 13) + '…' : label, x + 14, y + 6);
    });
  }

  // --- UTILITIES ---
  function roundRect(ctx, x, y, w, h, r) {
    if (h <= 0 || w <= 0) return;
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  function handleResize(canvasElements) {
    // Debounced resize — caller passes array of {canvas, renderFn}
    canvasElements.forEach(({ canvas, renderFn }) => {
      if (canvas && renderFn) renderFn();
    });
  }

  function chartToPNG(canvas, filename = 'chart.png') {
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');
  }

  return {
    renderBarChart,
    renderLineChart,
    renderDonutChart,
    handleResize,
    chartToPNG,
    COLORS
  };
})();
