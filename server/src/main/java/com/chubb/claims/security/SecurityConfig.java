package com.chubb.claims.security;

import com.chubb.claims.common.web.CorrelationIdFilter;
import com.chubb.claims.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Stateless JWT security (NFR-07). Public: login, Swagger, and the H2 console in the dev profile only.
 * Everything else needs a valid token; role checks use @PreAuthorize on each controller method.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    static final String[] SWAGGER_PATHS = {"/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**"};

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtService jwtService,
                                                   RestAuthenticationEntryPoint entryPoint,
                                                   RestAccessDeniedHandler accessDeniedHandler,
                                                   @Value("${spring.h2.console.enabled:false}") boolean h2Console)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint).accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(auth -> {
                    if (h2Console) {
                        auth.requestMatchers(PathRequest.toH2Console()).permitAll();
                    }
                    auth.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                            .requestMatchers(SWAGGER_PATHS).permitAll()
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            // Role checks here run before body validation, giving the contract's order:
                            // 401, 403 (role), 400 (body), 404, 403 (ownership), 409, 400 (business rules).
                            .requestMatchers(HttpMethod.POST, "/api/claims").hasRole("CLAIMANT")
                            .requestMatchers(HttpMethod.PUT, "/api/claims/*/assignment").hasRole("MANAGER")
                            .requestMatchers(HttpMethod.POST, "/api/claims/*/start", "/api/claims/*/settle",
                                    "/api/claims/*/reject").hasRole("CLAIMS_STAFF")
                            .requestMatchers(HttpMethod.PATCH, "/api/claims/*/assessment").hasRole("CLAIMS_STAFF")
                            .requestMatchers(HttpMethod.POST, "/api/claims/*/messages")
                            .hasAnyRole("CLAIMANT", "CLAIMS_STAFF")
                            .requestMatchers("/api/users/**", "/api/dashboard/**", "/api/users", "/api/dashboard")
                            .hasRole("MANAGER")
                            .requestMatchers("/api/**").hasAnyRole("CLAIMANT", "CLAIMS_STAFF", "MANAGER")
                            .anyRequest().authenticated();
                })
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
        if (h2Console) {
            http.headers(h -> h.frameOptions(f -> f.sameOrigin()));
        }
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(AppProperties.Cors cors) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(cors.allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", CorrelationIdFilter.HEADER));
        config.setExposedHeaders(List.of(CorrelationIdFilter.HEADER, "Location"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
