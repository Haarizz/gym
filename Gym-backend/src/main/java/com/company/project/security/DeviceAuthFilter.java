package com.company.project.security;

import com.company.project.entities.DeviceKey;
import com.company.project.services.DeviceKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates hardware devices via the {@code X-Device-Key} header.
 *
 * Devices cannot use JWT (no login flow), so they send a pre-issued API key.
 * The key is validated against its SHA-256 hash stored in the device_keys table.
 *
 * This filter runs before {@link JwtAuthenticationFilter}. If a JWT has already
 * set authentication in the context this filter is a no-op for that request.
 */
@Component
public class DeviceAuthFilter extends OncePerRequestFilter {

    static final String DEVICE_KEY_HEADER = "X-Device-Key";

    private final DeviceKeyService deviceKeyService;

    public DeviceAuthFilter(DeviceKeyService deviceKeyService) {
        this.deviceKeyService = deviceKeyService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String rawKey = request.getHeader(DEVICE_KEY_HEADER);

        if (rawKey != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Optional<DeviceKey> deviceKey = deviceKeyService.validateKey(rawKey);
            deviceKey.ifPresent(device -> {
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        device.getName(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_DEVICE"))
                );
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            });
        }

        filterChain.doFilter(request, response);
    }
}
