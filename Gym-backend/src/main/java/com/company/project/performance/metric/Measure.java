package com.company.project.performance.metric;

/** What a target line or bonus reads from a metric: how many, or how much money. */
public enum Measure {
    COUNT, AMOUNT;

    public String code() { return name().toLowerCase(); }

    public static Measure parse(String code) {
        if (code == null) throw new com.company.project.exceptions.BusinessRuleViolationException("Measure is required");
        return switch (code.trim().toLowerCase()) {
            case "count" -> COUNT;
            case "amount" -> AMOUNT;
            default -> throw new com.company.project.exceptions.BusinessRuleViolationException("Unknown measure " + code);
        };
    }
}
