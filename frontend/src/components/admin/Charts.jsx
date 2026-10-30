import { useId, useMemo, useState } from "react";

import { formatFullNumber, formatNumber, shortDay } from "../../lib/adminFormat";

function niceMax(value) {
  if (value <= 0) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function LineChart({ labels = [], series = [], height = 248, valueFormatter = formatNumber }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const gradientId = useId().replace(/:/g, "");
  const width = 760;
  const padding = { top: 18, right: 18, bottom: 32, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const count = labels.length;
  const maxValue = niceMax(
    Math.max(1, ...series.flatMap((item) => item.values.map((value) => Number(value) || 0))),
  );
  const ticks = 4;

  const xAt = (index) => padding.left + (count <= 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
  const yAt = (value) => padding.top + plotHeight - (Math.max(0, Number(value) || 0) / maxValue) * plotHeight;

  const paths = useMemo(
    () =>
      series.map((item) => {
        const points = item.values.map((value, index) => `${xAt(index)},${yAt(value)}`);
        return {
          ...item,
          line: points.length ? `M ${points.join(" L ")}` : "",
          area: points.length
            ? `M ${xAt(0)},${padding.top + plotHeight} L ${points.join(" L ")} L ${xAt(count - 1)},${padding.top + plotHeight} Z`
            : "",
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, count, maxValue, height],
  );

  const labelStep = Math.max(1, Math.ceil(count / 6));
  const hovered = hoverIndex !== null && labels[hoverIndex] ? hoverIndex : null;

  return (
    <div className="admin-chart">
      <div className="admin-chart__legend">
        {series.map((item) => (
          <span key={item.label} className="admin-chart__legend-item">
            <span className="admin-chart__swatch" style={{ background: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="admin-chart__svg"
        role="img"
        aria-label={`${series.map((item) => item.label).join(", ")} chart`}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {Array.from({ length: ticks + 1 }).map((_, index) => {
          const value = (maxValue / ticks) * (ticks - index);
          const y = padding.top + (plotHeight / ticks) * index;
          return (
            <g key={`grid-${index}`}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="admin-chart__grid" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="admin-chart__axis">
                {valueFormatter(value)}
              </text>
            </g>
          );
        })}

        {labels.map((label, index) => {
          if (index % labelStep !== 0 && index !== count - 1) return null;
          return (
            <text
              key={`label-${label}-${index}`}
              x={xAt(index)}
              y={height - 8}
              textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
              className="admin-chart__axis"
            >
              {shortDay(label)}
            </text>
          );
        })}

        {paths.map((item, seriesIndex) => (
          <g key={item.label}>
            <defs>
              <linearGradient id={`${gradientId}-${seriesIndex}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={item.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {series.length === 1 && <path d={item.area} fill={`url(#${gradientId}-${seriesIndex})`} />}
            <path d={item.line} fill="none" stroke={item.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}

        {hovered !== null && (
          <g>
            <line
              x1={xAt(hovered)}
              x2={xAt(hovered)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              className="admin-chart__cursor"
            />
            {series.map((item) => (
              <circle
                key={item.label}
                cx={xAt(hovered)}
                cy={yAt(item.values[hovered])}
                r="4"
                fill="var(--surface)"
                stroke={item.color}
                strokeWidth="2.4"
              />
            ))}
          </g>
        )}

        {labels.map((label, index) => (
          <rect
            key={`hover-${label}-${index}`}
            x={xAt(index) - plotWidth / Math.max(1, count * 2)}
            y={padding.top}
            width={plotWidth / Math.max(1, count)}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(index)}
          />
        ))}
      </svg>

      {hovered !== null && (
        <div
          className="admin-chart__tooltip"
          style={{
            left: `${Math.min(86, Math.max(14, (xAt(hovered) / width) * 100))}%`,
          }}
        >
          <span className="admin-chart__tooltip-date">{shortDay(labels[hovered])}</span>
          {series.map((item) => (
            <span key={item.label} className="admin-chart__tooltip-row">
              <span className="admin-chart__swatch" style={{ background: item.color }} aria-hidden="true" />
              {item.label}
              <strong>{formatFullNumber(item.values[hovered])}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function DonutChart({ data = [], centerLabel = "Total", colors = ["#c8fa4b", "#62e3c0", "#7cc4ff", "#f3c45a"] }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  let cursor = 0;
  const stops = data
    .map((item, index) => {
      const start = cursor;
      const portion = total ? (Number(item.value) || 0) / total : 0;
      cursor += portion * 100;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className="admin-donut">
      <div
        className="admin-donut__ring"
        style={{
          background: total
            ? `conic-gradient(${stops})`
            : "conic-gradient(var(--surface-3) 0% 100%)",
        }}
        role="img"
        aria-label={data.map((item) => `${item.label}: ${item.value}`).join(", ")}
      >
        <div className="admin-donut__hole">
          <strong>{formatNumber(total)}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="admin-donut__legend">
        {data.map((item, index) => (
          <li key={item.label}>
            <span className="admin-chart__swatch" style={{ background: colors[index % colors.length] }} aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{formatNumber(item.value)}</strong>
            <span className="admin-donut__pct">
              {total ? `${Math.round(((Number(item.value) || 0) / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RankingBars({ items = [], valueLabel = "" }) {
  const max = Math.max(1, ...items.map((item) => Number(item.value) || 0));
  if (!items.length) {
    return <p className="admin-empty-note">Nothing to rank yet.</p>;
  }
  return (
    <ol className="admin-ranking">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          <span className="admin-ranking__position">{index + 1}</span>
          <div className="admin-ranking__body">
            <div className="admin-ranking__label">
              <span>{item.label}</span>
              <strong>
                {formatNumber(item.value)}
                {valueLabel ? ` ${valueLabel}` : ""}
              </strong>
            </div>
            <span className="admin-ranking__track">
              <span
                className="admin-ranking__fill"
                style={{ width: `${Math.max(4, ((Number(item.value) || 0) / max) * 100)}%` }}
              />
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
