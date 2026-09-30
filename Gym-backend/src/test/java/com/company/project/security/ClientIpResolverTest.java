package com.company.project.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientIpResolverTest {

    private static MockHttpServletRequest from(String remoteAddr) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(remoteAddr);
        return req;
    }

    @Test
    void behindLocalProxyPrefersXRealIp() {
        MockHttpServletRequest req = from("127.0.0.1");
        req.addHeader("X-Real-IP", "203.0.113.9");
        req.addHeader("X-Forwarded-For", "1.1.1.1, 203.0.113.9");
        assertEquals("203.0.113.9", ClientIpResolver.resolve(req));
    }

    @Test
    void behindLocalProxyUsesLastForwardedHopNotSpoofedFirst() {
        MockHttpServletRequest req = from("127.0.0.1");
        req.addHeader("X-Forwarded-For", "6.6.6.6, 203.0.113.9");
        assertEquals("203.0.113.9", ClientIpResolver.resolve(req));
    }

    @Test
    void directPublicClientCannotSpoofHeaders() {
        MockHttpServletRequest req = from("198.51.100.20");
        req.addHeader("X-Real-IP", "6.6.6.6");
        req.addHeader("X-Forwarded-For", "6.6.6.6");
        assertEquals("198.51.100.20", ClientIpResolver.resolve(req));
    }

    @Test
    void proxyWithoutHeadersFallsBackToPeer() {
        assertEquals("10.0.0.5", ClientIpResolver.resolve(from("10.0.0.5")));
    }

    @Test
    void ipv6LoopbackIsTrusted() {
        MockHttpServletRequest req = from("0:0:0:0:0:0:0:1");
        req.addHeader("X-Real-IP", "203.0.113.9");
        assertEquals("203.0.113.9", ClientIpResolver.resolve(req));
    }
}
