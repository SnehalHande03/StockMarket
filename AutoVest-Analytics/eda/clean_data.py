def compute_metrics(price: float, eps: float | None, baseline_pe: float = 15.0) -> dict:
    pe_ratio = None
    if eps and eps > 0:
        pe_ratio = round(price / eps, 2)

    fair_value = None
    if eps and eps > 0:
        fair_value = round(eps * baseline_pe, 2)

    discount_percent = None
    if fair_value and fair_value > 0:
        discount_percent = round(((fair_value - price) / fair_value) * 100.0, 2)

    return {
        "pe_ratio": pe_ratio,
        "fair_value": fair_value,
        "discount_percent": discount_percent,
    }

def classify_discount(discount_percent: float) -> str:
    if discount_percent is None:
        return "LOW"
    if discount_percent >= 20:
        return "STRONG"
    elif 10 <= discount_percent < 20:
        return "MODERATE"
    else:
        return "LOW"
