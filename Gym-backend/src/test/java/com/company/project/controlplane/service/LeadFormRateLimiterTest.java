package com.company.project.controlplane.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LeadFormRateLimiterTest {

    @Test
    void limitsEachIp() {
        LeadFormRateLimiter limiter = new LeadFormRateLimiter();
        for (int i = 0; i < LeadFormRateLimiter.MAX_PER_IP; i++) {
            assertTrue(limiter.tryAcquire("1.2.3.4", "form"));
        }
        assertFalse(limiter.tryAcquire("1.2.3.4", "form"));
        assertTrue(limiter.tryAcquire("5.6.7.8", "form"), "other visitors are unaffected");
    }

    @Test
    void capsOneFormAcrossRotatingIps() {
        LeadFormRateLimiter limiter = new LeadFormRateLimiter();
        for (int i = 0; i < LeadFormRateLimiter.MAX_PER_FORM; i++) {
            assertTrue(limiter.tryAcquire("10.0." + (i / 250) + "." + (i % 250), "form"));
        }
        assertFalse(limiter.tryAcquire("9.9.9.9", "form"));
        assertTrue(limiter.tryAcquire("9.9.9.9", "another-form"));
    }

    @Test
    void rejectedIpDoesNotConsumeFormBudget() {
        LeadFormRateLimiter limiter = new LeadFormRateLimiter();
        for (int i = 0; i < LeadFormRateLimiter.MAX_PER_IP; i++) limiter.tryAcquire("1.1.1.1", "a");
        for (int i = 0; i < 50; i++) assertFalse(limiter.tryAcquire("1.1.1.1", "b"));
        for (int i = 0; i < LeadFormRateLimiter.MAX_PER_IP; i++) {
            assertTrue(limiter.tryAcquire("2.2.2." + i, "b"));
        }
    }

    @Test
    void evictionKeepsActiveKeys() {
        LeadFormRateLimiter limiter = new LeadFormRateLimiter();
        limiter.tryAcquire("1.1.1.1", "a");
        limiter.evictIdle();
        assertEquals(1, limiter.trackedIpCount(), "entries inside the window survive eviction");
    }
}
