package com.chubb.claims.auth;

import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Login and current user")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(operationId = "login", summary = "Log in with username and password and get a JWT",
            description = "Public. Roles: none required. Related: FR-02, US-01.")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    @GetMapping("/me")
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Operation(operationId = "getCurrentUser", summary = "Get the logged-in user (restore the session on refresh)",
            description = "Roles: CLAIMANT, CLAIMS_STAFF, MANAGER. Related: FR-05.")
    public ResponseEntity<ApiResponse<UserDto>> me(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(authService.currentUser(user)));
    }
}
