package com.chubb.claims.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads "Authorization: Bearer ..." and, if the JWT is valid, puts an {@link AuthenticatedUser} with authority
 * ROLE_&lt;role&gt; in the security context. An invalid token leaves the request anonymous, so protected endpoints
 * answer 401 UNAUTHORIZED through {@link RestAuthenticationEntryPoint}. Not a Spring bean, so it is not
 * registered twice as a servlet filter.
 */
@Slf4j
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length()).trim();
            try {
                AuthenticatedUser user = jwtService.parse(token);
                var authentication = new UsernamePasswordAuthenticationToken(user, null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.role())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("JWT accepted userId={} role={}", user.id(), user.role());
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
                log.warn("JWT rejected reason={}", e.getClass().getSimpleName());
            }
        }
        chain.doFilter(request, response);
    }
}
