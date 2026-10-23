package com.company.project.exceptions;

/**
 * A check-out before the branch's minimum visit time. Members are refused; the web
 * desk sees it as a warning and can repeat the check-out with force=true.
 */
public class MinVisitNotReachedException extends BusinessRuleViolationException {
    public MinVisitNotReachedException(String message) {
        super(message);
    }
}
