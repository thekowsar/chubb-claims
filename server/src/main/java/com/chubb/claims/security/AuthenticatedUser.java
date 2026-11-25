package com.chubb.claims.security;

/** The principal built from a valid JWT: sub (user id), username and role code. No DB lookup per request. */
public record AuthenticatedUser(Long id, String username, String role) {

    @Override
    public String toString() {
        return "AuthenticatedUser[id=" + id + ", role=" + role + "]";
    }
}
