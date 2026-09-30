package com.company.project.controlplane.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Sliding-window limiter for the public lead-form submit endpoint, applied per
 * client IP and per form. Same in-process design (and single-instance caveat)
 * as {@link PlatformLeadRateLimiter}, but kept separate so ad traffic can't
 * exhaust the onboarding form's budget, and with a looser per-IP limit —
 * several people behind one mobile-carrier NAT may genuinely submit from the
 * same IP while an ad is running. The per-form cap bounds how many leads a
 * botnet rotating IPs can push into one gym's Leads list.
 *
 * Idle keys are evicted on a schedule so the maps can't grow without bound.
 */
@Component
public class LeadFormRateLimiter {

    static final int MAX_PER_IP = 10;
    static final int MAX_PER_FORM = 100;
    static final Duration WINDOW = Duration.ofMinutes(10);

    private final Map<String, Deque<Instant>> byIp = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> byForm = new ConcurrentHashMap<>();

    /** @return true if the request is allowed, false if the caller should be rejected (429). */
    public boolean tryAcquire(String ip, String formKey) {
        Instant now = Instant.now();
        String ipKey = (ip == null || ip.isBlank()) ? "unknown" : ip;
        if (!hasCapacity(byIp, ipKey, MAX_PER_IP, now) || !hasCapacity(byForm, formKey, MAX_PER_FORM, now)) {
            return false;
        }
        record(byIp, ipKey, now);
        record(byForm, formKey, now);
        return true;
    }

    private boolean hasCapacity(Map<String, Deque<Instant>> map, String key, int max, Instant now) {
        Deque<Instant> timestamps = map.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            prune(timestamps, now);
            return timestamps.size() < max;
        }
    }

    private void record(Map<String, Deque<Instant>> map, String key, Instant now) {
        Deque<Instant> timestamps = map.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            timestamps.addLast(now);
        }
    }

    private static void prune(Deque<Instant> timestamps, Instant now) {
        while (!timestamps.isEmpty() && Duration.between(timestamps.peekFirst(), now).compareTo(WINDOW) > 0) {
            timestamps.pollFirst();
        }
    }

    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void evictIdle() {
        Instant now = Instant.now();
        evictIdle(byIp, now);
        evictIdle(byForm, now);
    }

    private static void evictIdle(Map<String, Deque<Instant>> map, Instant now) {
        map.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue(), now);
                return e.getValue().isEmpty();
            }
        });
    }

    int trackedIpCount() {
        return byIp.size();
    }
}
