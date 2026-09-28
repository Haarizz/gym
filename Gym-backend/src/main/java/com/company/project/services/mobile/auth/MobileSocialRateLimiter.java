package com.company.project.services.mobile.auth;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory sliding-window rate limiter for the four public, unauthenticated
 * social sign-in endpoints (/google, /google/complete, /apple,
 * /apple/complete). Same shape as
 * controlplane.service.PlatformLeadRateLimiter (confirmed bespoke to that
 * endpoint, not a shared component — this is a fresh peer, not a reuse).
 *
 * Deliberately in-process only, same accepted tradeoff as its sibling: state
 * resets on restart, doesn't survive behind multiple instances. Revisit with
 * a shared store (Redis) if that changes or real abuse shows up.
 */
@Component
public class MobileSocialRateLimiter {

    private static final int MAX_REQUESTS_PER_WINDOW = 10;
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
