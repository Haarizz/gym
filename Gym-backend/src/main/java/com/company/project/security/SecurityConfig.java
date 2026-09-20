package com.company.project.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final DeviceAuthFilter deviceAuthFilter;
    private final TenantContextFilter tenantContextFilter;
    private final BranchContextFilter branchContextFilter;
    private final UserDetailsService userDetailsService;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter,
                          DeviceAuthFilter deviceAuthFilter,
                          TenantContextFilter tenantContextFilter,
                          BranchContextFilter branchContextFilter,
                          UserDetailsService userDetailsService) {
        this.jwtAuthFilter    = jwtAuthFilter;
        this.deviceAuthFilter = deviceAuthFilter;
        this.tenantContextFilter = tenantContextFilter;
        this.branchContextFilter = branchContextFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Uploaded branch images are served as plain static files (BranchImageStorageConfig)
                // and rendered via <img src="..."> by both the public mobile discovery browse screens
                // and the admin UI — a browser image request carries no Authorization/X-Tenant-ID
                // header, so this must stay public rather than falling under the /api/** authenticated()
                // catch-all below (which it wouldn't match anyway, but is called out here for clarity).
                .requestMatchers("/uploads/**").permitAll()

                // Public auth endpoints — no token required (register/login/username-check/mobile-register).
                // The three /api/mobile/auth/{verify-otp,resend-otp,registration-status} routes are
                // also public: an unverified registration has no JWT to present yet by design — the
                // opaque X-Registration-Token header (never this permitAll list) is what scopes those
                // calls to one pending registration. See the email-OTP-verification architecture plan.
                .requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/check-username",
                        "/api/mobile/auth/register", "/api/mobile/auth/verify-otp",
                        "/api/mobile/auth/resend-otp", "/api/mobile/auth/registration-status", "/error").permitAll()

                // Public lead-capture endpoint — the "Request a demo" onboarding form on the
                // unauthenticated pricing/login page (business-onboarding-fullscreen.tsx) submits
                // here with no session. Rate-limited + honeypot-checked in PlatformLeadService;
                // every other /api/platform-leads/** route stays gated by @PreAuthorize
                // (PLATFORM_LEADS_* — GYMBIOS_ADMIN only, see DefaultRolePermissions) under the
                // authenticated() catch-all below.
                .requestMatchers(HttpMethod.POST, "/api/platform-leads").permitAll()

                // Platform-owner-only endpoints. GYMBIOS_ADMIN is scoped to Gym Management
                // only (see RoleService.getEffectivePermissionKeys) — it has no business on
                // any of these operational routes, so it is deliberately absent from all of
                // them (unlike during the ADMIN->GYMBIOS_ADMIN rename, where it kept the old
                // ADMIN's full access). No route currently lives under /api/admin/**, so that
                // matcher is left unowned rather than granted to any role.
                .requestMatchers("/api/admin/**").denyAll()

                // Manager endpoints
                .requestMatchers("/api/manager/**").hasRole("MANAGER")

                // Payroll & HR — restricted to HR
                .requestMatchers("/api/payroll/**", "/api/employees/**", "/api/recruitment/**")
                    .hasRole("HR")

                // Financial endpoints — Accountant, Manager, and the gym owner (ADMIN).
                // ADMIN was missing here despite the app's own fine-grained permission
                // catalog already granting BILLING_VIEW/CREATE/EDIT (etc.) to that role
                // by default (see DefaultRolePermissions.GRANTS) — this URL-level role
                // gate ran BEFORE any controller/permission check, so a gym owner's own
                // real, granted permissions never even got the chance to apply: every
                // owner (confirmed on Test Gym and Power Gym alike) got a flat 403 on
                // their own member's billing statement, cash-in-hand/ledger data, etc.
                // (bios/settings holds org-wide revenue targets and alert/report
                // recipient emails — the same sensitivity as the other financial
                // config here, so it gets the same role gate)
                .requestMatchers("/api/billing/**", "/api/expenses/**", "/api/ledgers/**", "/api/financials/**", "/api/bios/**")
                    .hasAnyRole("MANAGER", "ACCOUNTANT", "ADMIN")

                // Core gym operations — any authenticated user
                .requestMatchers(
                    "/api/members/**",
                    "/api/staff/**",
                    "/api/attendance/**",
                    "/api/products/**",
                    "/api/warehouses/**",
                    "/api/product-categories/**",
                    "/api/plans/**",
                    "/api/promotions/**",
                    "/api/leads/**",
                    "/api/bookings/**",
                    "/api/classes/**",
                    "/api/dashboard/**",
                    "/api/pos/**",
                    "/api/suppliers/**",
                    "/api/purchase-orders/**",
                    "/api/supplier-bills/**",
                    "/api/wastage-returns/**",
                    "/api/recipes/**",
                    "/api/production-orders/**",
                    "/api/referrals/**",
                    "/api/follow-ups/**"
                ).authenticated()

                // Everything else under /api (journal-vouchers, invoices, wallet, rewards,
                // financial-reports, etc.) — not yet bucketed into a role above, but must
                // never fall through to permitAll. Requires at least a valid session.
                .requestMatchers("/api/**").authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            // Device key filter runs first so hardware devices are identified before JWT check
            .addFilterBefore(deviceAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, DeviceAuthFilter.class)
            // Tenant context filter runs after JWT to read the tenant claim (Phase 2 multi-tenant
            // groundwork, no-op while tenant.routing.enabled=false); branch context runs after that.
            .addFilterAfter(tenantContextFilter, JwtAuthenticationFilter.class)
            .addFilterAfter(branchContextFilter, TenantContextFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:19006",
                "http://127.0.0.1:19006",
                "http://localhost:8081",
                "http://127.0.0.1:8081",
                "http://127.0.0.1:9080",
                "https://qa.gymbios.com"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // Allow all headers so any header the frontend sends (Content-Type, Authorization, etc.) is accepted
        configuration.setAllowedHeaders(List.of("*"));
        // Expose Authorization so the frontend can read it from responses if needed
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        // Cache preflight response for 1 hour to reduce OPTIONS round-trips
        configuration.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}



