package com.company.project.security;

import com.company.project.entities.Member;
import com.company.project.repositories.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantContextFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private ApplicationContext applicationContext;

    @Mock
    private MemberRepository memberRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private TenantContextFilter tenantContextFilter;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(tenantContextFilter, "tenantRoutingEnabled", true);
        SecurityContextHolder.clearContext();
        TenantContextHolder.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContextHolder.clear();
    }

    private void setupMockAuth(boolean isGlobal, String... roles) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        for (String role : roles) {
            authorities.add(new SimpleGrantedAuthority(role));
        }
        UserDetailsImpl userDetails = new UserDetailsImpl(1L, "user", "user@test.com", "pass", authorities, true, isGlobal);
        Authentication auth = new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void mockRequestUri(String uri) {
        when(request.getRequestURI()).thenReturn(uri);
    }

    private void mockTenantHeader(String tenantSlug) {
        when(request.getHeader("Authorization")).thenReturn("Bearer fake_token");
        when(jwtService.extractTenant("fake_token")).thenReturn(tenantSlug);
    }

    @Test
    void testStrictlyGlobalPath_WithTenantSlug_IgnoresTenant() throws ServletException, IOException {
        setupMockAuth(true, "ROLE_MEMBER");
        mockTenantHeader("gym-a");
        mockRequestUri("/api/mobile/discovery/gyms");

        // Use an answering filter chain to capture TenantContextHolder *during* execution
        String[] capturedTenant = new String[1];
        doAnswer(invocation -> {
            capturedTenant[0] = TenantContextHolder.getCurrentTenant();
            return null;
        }).when(filterChain).doFilter(any(), any());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        assertNull(capturedTenant[0], "Tenant should be ignored for strictly global paths");
        verify(filterChain).doFilter(request, response);
        assertNull(TenantContextHolder.getCurrentTenant(), "TenantContextHolder should be cleared after filter");
    }

    @Test
    void testProfileTransactions_GlobalPendingMember_Protected() throws ServletException, IOException {
        setupMockAuth(true, "ROLE_MEMBER");
        mockTenantHeader("gym-a");
        mockRequestUri("/api/mobile/profile/transactions");

        when(applicationContext.getBean(MemberRepository.class)).thenReturn(memberRepository);
        Member member = new Member();
        member.setAppAccessEnabled(false);
        when(memberRepository.findByGlobalUserId(1L)).thenReturn(Optional.of(member));

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response).sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied: Membership payment is awaiting approval");
        verify(filterChain, never()).doFilter(request, response);
        assertNull(TenantContextHolder.getCurrentTenant()); // Cleared in finally
    }

    @Test
    void testOwnStatusCheck_GlobalPendingMember_Allowed() throws ServletException, IOException {
        setupMockAuth(true, "ROLE_MEMBER");
        mockTenantHeader("gym-a");
        mockRequestUri("/api/members/me");

        when(applicationContext.getBean(MemberRepository.class)).thenReturn(memberRepository);
        Member member = new Member();
        member.setAppAccessEnabled(false);
        when(memberRepository.findByGlobalUserId(1L)).thenReturn(Optional.of(member));

        String[] capturedTenant = new String[1];
        doAnswer(invocation -> {
            capturedTenant[0] = TenantContextHolder.getCurrentTenant();
            return null;
        }).when(filterChain).doFilter(any(), any());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response, never()).sendError(anyInt(), anyString());
        verify(filterChain).doFilter(request, response);
        assertEquals("gym-a", capturedTenant[0]);
    }

    @Test
    void testGlobalUser_NoTenant_ProfileTransactions_AllowedWithoutTenant() throws ServletException, IOException {
        setupMockAuth(true, "ROLE_MEMBER");
        // No tenant slug
        when(request.getHeader("Authorization")).thenReturn(null);
        mockRequestUri("/api/mobile/profile/transactions");

        String[] capturedTenant = new String[1];
        doAnswer(invocation -> {
            capturedTenant[0] = TenantContextHolder.getCurrentTenant();
            return null;
        }).when(filterChain).doFilter(any(), any());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response, never()).sendError(anyInt(), anyString());
        verify(filterChain).doFilter(request, response);
        assertNull(capturedTenant[0]); // Bypassed the tenant assignment and allowed through
    }

    @Test
    void testLocalStaff_NoTenant_Protected_Rejected() throws ServletException, IOException {
        setupMockAuth(false, "ROLE_MANAGER");
        // No tenant slug
        when(request.getHeader("Authorization")).thenReturn(null);
        mockRequestUri("/api/dashboard/metrics");

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response).sendError(HttpServletResponse.SC_FORBIDDEN, "Request is missing a valid tenant context");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    void testLocalStaff_NoTenant_LegacyExempt_Allowed() throws ServletException, IOException {
        setupMockAuth(false, "ROLE_MANAGER");
        // No tenant slug
        when(request.getHeader("Authorization")).thenReturn(null);
        mockRequestUri("/api/branches/my-branches");

        String[] capturedTenant = new String[1];
        doAnswer(invocation -> {
            capturedTenant[0] = TenantContextHolder.getCurrentTenant();
            return null;
        }).when(filterChain).doFilter(any(), any());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response, never()).sendError(anyInt(), anyString());
        verify(filterChain).doFilter(request, response);
        assertNull(capturedTenant[0]);
    }

    @Test
    void testTrailingSlashAnomaly_Preserved() throws ServletException, IOException {
        setupMockAuth(true, "ROLE_MEMBER");
        mockTenantHeader("gym-a");
        // The anomaly: trailing slash causes it to bypass the transactions equals check
        mockRequestUri("/api/mobile/profile/transactions/");

        String[] capturedTenant = new String[1];
        doAnswer(invocation -> {
            capturedTenant[0] = TenantContextHolder.getCurrentTenant();
            return null;
        }).when(filterChain).doFilter(any(), any());

        tenantContextFilter.doFilterInternal(request, response, filterChain);

        verify(response, never()).sendError(anyInt(), anyString());
        verify(filterChain).doFilter(request, response);
        assertNull(capturedTenant[0], "Should bypass tenant assignment due to anomaly");
    }

}
