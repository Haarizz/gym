package com.company.project.security;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;

/**
 * Resolves the real client IP for abuse controls (rate limiting) on public
 * endpoints, without letting the client spoof it.
 *
 * Forwarding headers are only trusted when the direct peer is our own reverse
 * proxy (loopback or private-network address — nginx on the same VPS). Then:
 * X-Real-IP first (nginx sets it from $remote_addr, overwriting anything the
 * client sent), else the LAST X-Forwarded-For entry (the one nginx's
 * $proxy_add_x_forwarded_for appended; earlier entries are client-controlled).
 * A request reaching the app directly from a public address uses that address
 * and ignores the headers entirely.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {}

    public static String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (!isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] hops = forwarded.split(",");
            String last = hops[hops.length - 1].trim();
            if (!last.isEmpty()) return last;
        }
        return remoteAddr;
    }

    static boolean isTrustedProxy(String addr) {
        if (addr == null || addr.isBlank()) return false;
        // Only literal IPs — never trigger a DNS lookup from a request path.
        if (!addr.matches("[0-9.]+") && !addr.contains(":")) return false;
        try {
            InetAddress ip = InetAddress.getByName(addr);
            return ip.isLoopbackAddress() || ip.isSiteLocalAddress() || ip.isLinkLocalAddress();
        } catch (Exception e) {
            return false;
        }
    }
}
