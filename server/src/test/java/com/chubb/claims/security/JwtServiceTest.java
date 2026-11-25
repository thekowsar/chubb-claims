package com.chubb.claims.security;

import com.chubb.claims.config.AppProperties;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-0123456789abcdef-0123456789";
    private static final Instant NOW = Instant.parse("2026-11-25T09:30:00Z");

    private final AppProperties.Jwt props = new AppProperties.Jwt(SECRET, 3600);
    private final JwtService service = new JwtService(props, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void generatedTokenParsesBackToTheSameUser() {
        String token = service.generate(5L, "manager1", "MANAGER");

        AuthenticatedUser user = service.parse(token);

        assertThat(user.id()).isEqualTo(5L);
        assertThat(user.username()).isEqualTo("manager1");
        assertThat(user.role()).isEqualTo("MANAGER");
    }

    @Test
    void tokenCarriesSubUsernameRoleAndSixtyMinuteExpiry() {
        String token = service.generate(1L, "claimant1", "CLAIMANT");

        var claims = Jwts.parser().verifyWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .clock(() -> Date.from(NOW)).build().parseSignedClaims(token).getPayload();

        assertThat(claims.getSubject()).isEqualTo("1");
        assertThat(claims.get("username", String.class)).isEqualTo("claimant1");
        assertThat(claims.get("role", String.class)).isEqualTo("CLAIMANT");
        assertThat(Duration.between(claims.getIssuedAt().toInstant(), claims.getExpiration().toInstant()))
                .isEqualTo(Duration.ofHours(1));
        assertThat(service.expirationSeconds()).isEqualTo(3600);
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService pastIssuer = new JwtService(props, Clock.fixed(NOW.minus(Duration.ofHours(2)), ZoneOffset.UTC));
        String token = pastIssuer.generate(1L, "claimant1", "CLAIMANT");

        assertThatThrownBy(() -> service.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejected() {
        JwtService other = new JwtService(new AppProperties.Jwt("another-secret-0123456789abcdef-0123456789", 3600),
                Clock.fixed(NOW, ZoneOffset.UTC));
        String token = other.generate(1L, "claimant1", "CLAIMANT");

        assertThatThrownBy(() -> service.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = service.generate(1L, "claimant1", "CLAIMANT");
        String tampered = token.substring(0, token.length() - 3) + (token.endsWith("AAA") ? "BBB" : "AAA");

        assertThatThrownBy(() -> service.parse(tampered)).isInstanceOf(JwtException.class);
    }

    @Test
    void garbageIsRejected() {
        assertThatThrownBy(() -> service.parse("not-a-jwt")).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenWithoutRoleClaimIsRejected() {
        String token = Jwts.builder().subject("1").claim("username", "claimant1")
                .issuedAt(Date.from(NOW)).expiration(Date.from(NOW.plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();

        assertThatThrownBy(() -> service.parse(token)).isInstanceOf(JwtException.class);
    }
}
