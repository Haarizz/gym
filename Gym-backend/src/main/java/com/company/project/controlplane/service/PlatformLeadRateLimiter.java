package com.company.project.controlplane.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for POST /api/platform-leads (the public,
 * unauthenticated onboarding-form endpoint). No new dependency (e.g. Bucket4j) —
 * a simple per-IP timestamp deque is enough for the "basic protection against
 * casual abuse" bar this endpoint needs.
 *
 * Deliberately in-process only: state resets on restart and doesn't survive
 * behind multiple app instances. Acceptable for now (the deployment here is a
 * single instance); revisit with a shared store (Redis) if that changes or if
 * real abuse shows up.
 */
@Component
public class PlatformLeadRateLimiter {

    private static final int MAX_REQUESTS_PER_WINDOW = 5;
    private static final Duration WINDOW = Duration.ofMinutes(10);

    private final Map<String, Deque<Instant>> requestsByIp = new ConcurrentHashMap<>();

    /** @return true if the request is allowed, false if the caller should be rejected (429). */
    public boolean tryAcquire(String ip) {
        String key = (ip == null || ip.isBlank()) ? "unknown" : ip;
        Instant now = Instant.now();
        Deque<Instant> timestamps = requestsByIp.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && Duration.between(timestamps.peekFirst(), now).compareTo(WINDOW) > 0) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= MAX_REQUESTS_PER_WINDOW) {
                return false;
            }
            timestamps.addLast(now);
            return true;
        }
    }
}
