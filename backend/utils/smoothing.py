# backend/utils/smoothing.py
"""Numerical smoothing helpers used across agents."""
from __future__ import annotations
from typing import List


def moving_average(values: List[float], window: int = 3) -> List[float]:
    """Simple moving average over a list of floats."""
    if not values or window <= 0:
        return values
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        chunk = values[start : i + 1]
        result.append(sum(chunk) / len(chunk))
    return result


def exponential_moving_average(values: List[float], alpha: float = 0.3) -> List[float]:
    """Exponential moving average (EMA).

    alpha : smoothing factor in (0, 1].  Higher = more weight on recent values.
    """
    if not values:
        return values
    ema = [values[0]]
    for v in values[1:]:
        ema.append(alpha * v + (1 - alpha) * ema[-1])
    return ema


def bound(value: float, lo: float, hi: float) -> float:
    """Clamp *value* to [lo, hi]."""
    return max(lo, min(hi, value))
