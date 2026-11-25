package com.chubb.claims.security;

import com.chubb.claims.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;

/** Signs and verifies HS256 JWTs: sub = user id, plus username and role, valid for app.jwt.expiration-seconds. */
@Slf4j
@Service
public class JwtService {

    static final String CLAIM_USERNAME = "username";
    static final String CLAIM_ROLE = "role";

    private final SecretKey key;
    private final long expirationSeconds;
    private final Clock clock;

    public JwtService(AppProperties.Jwt props, Clock clock) {
        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = props.expirationSeconds();
        this.clock = clock;
    }

    public long expirationSeconds() {
        return expirationSeconds;
    }

    public String generate(Long userId, String username, String role) {
        Instant now = clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_USERNAME, username)
                .claim(CLAIM_ROLE, role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * @throws JwtException if the token is malformed, has a bad signature, is expired or lacks required claims
     */
    public AuthenticatedUser parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .clock(() -> Date.from(clock.instant()))
                .build()
                .parseSignedClaims(token)
                .getPayload();
        String subject = claims.getSubject();
        String username = claims.get(CLAIM_USERNAME, String.class);
        String role = claims.get(CLAIM_ROLE, String.class);
        if (subject == null || username == null || role == null) {
            throw new JwtException("Token is missing required claims");
        }
        try {
            return new AuthenticatedUser(Long.valueOf(subject), username, role);
        } catch (NumberFormatException e) {
            throw new JwtException("Token subject is not a user id");
        }
    }
}
