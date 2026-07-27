/**
 * Shared UI components and formatting helpers.
 */

import type {
  ReactNode,
} from "react";

import type {
  Priority,
} from "../types";

export const number = (
  value: unknown,
): string =>
  Number(value || 0).toLocaleString();

export const percent = (
  value: unknown,
): string =>
  `${(
    Number(value || 0) * 100
  ).toFixed(1)}%`;

interface BadgeProps {
  priority: Priority | string;
  label?: string;
}

export function Badge({
  priority,
  label,
}: BadgeProps) {
  const defaultLabel =
    priority.charAt(0).toUpperCase() +
    priority.slice(1);

  return (
    <span className={`badge ${priority}`}>
      {label ?? defaultLabel}
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: ReactNode;
  caption?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function KpiCard({
  title,
  value,
  caption = "",
  onClick,
  selected = false,
}: KpiCardProps) {
  const content = (
    <>
      <div className="kpi-label">
        {title}
      </div>

      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-note">
        {caption}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`card kpi-card-button ${
          selected ? "selected" : ""
        }`}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="card">
      {content}
    </div>
  );
}

interface TableProps {
  headers: ReactNode[];
  children: ReactNode;
}

export function Table({
  headers,
  children,
}: TableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map(
              (header, index) => (
                <th key={index}>
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface BarChartItem {
  label: string;
  value: number;
  display?: string;
}

interface BarChartProps {
  items: BarChartItem[];
}

export function BarChart({
  items,
}: BarChartProps) {
  const max = Math.max(
    ...items.map(
      (item) => item.value,
    ),
    1,
  );

  return (
    <div>
      {items.map((item) => (
        <div
          className="bar-row"
          key={item.label}
        >
          <span>{item.label}</span>

          <div className="bar">
            <span
              style={{
                width: `${Math.min(
                  100,
                  (item.value / max) * 100,
                )}%`,
              }}
            />
          </div>

          <b>
            {item.display ??
              item.value.toFixed(0)}
          </b>
        </div>
      ))}
    </div>
  );
}

interface EmptyProps {
  children: ReactNode;
}

export function Empty({
  children,
}: EmptyProps) {
  return (
    <div className="notice">
      {children}
    </div>
  );
}