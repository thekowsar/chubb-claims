package com.chubb.claims.auth;

import com.chubb.claims.common.error.ErrorCode;
import com.chubb.claims.common.error.InvalidCredentialsException;
import com.chubb.claims.common.error.UnauthorizedException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.JwtService;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.Role;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String HASH = "$2a$10$storedhash";
    private static final String DUMMY = "$2a$10$dummyhash";

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    private AuthService service;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode(anyString())).thenReturn(DUMMY);
        service = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void loginSuccessReturnsTokenAndUser() {
        User user = user(5L, "manager1", "Evan Lee", "MANAGER", true);
        when(userRepository.findWithRoleByUsername("manager1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", HASH)).thenReturn(true);
        when(jwtService.generate(5L, "manager1", "MANAGER")).thenReturn("jwt-token");
        when(jwtService.expirationSeconds()).thenReturn(3600L);

        LoginResponse response = service.login(new LoginRequest("manager1", "secret"));

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(3600L);
        assertThat(response.user().id()).isEqualTo(5L);
        assertThat(response.user().username()).isEqualTo("manager1");
        assertThat(response.user().displayName()).isEqualTo("Evan Lee");
        assertThat(response.user().role()).isEqualTo(RoleCode.MANAGER);
    }

    @Test
    void loginNormalisesUsernameToLowerCaseAndTrims() {
        User user = user(1L, "claimant1", "Alice Tan", "CLAIMANT", true);
        when(userRepository.findWithRoleByUsername("claimant1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", HASH)).thenReturn(true);
        when(jwtService.generate(1L, "claimant1", "CLAIMANT")).thenReturn("t");

        LoginResponse response = service.login(new LoginRequest("  Claimant1 ", "secret"));

        assertThat(response.user().username()).isEqualTo("claimant1");
    }

    @Test
    void wrongPasswordThrowsInvalidCredentials() {
        User user = user(1L, "claimant1", "Alice Tan", "CLAIMANT", true);
        when(userRepository.findWithRoleByUsername("claimant1")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", HASH)).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("claimant1", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid username or password")
                .extracting("code").isEqualTo(ErrorCode.INVALID_CREDENTIALS);
        verify(jwtService, never()).generate(eq(1L), anyString(), anyString());
    }

    @Test
    void unknownUserThrowsSameErrorAndStillRunsBcrypt() {
        when(userRepository.findWithRoleByUsername("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("nobody", "whatever")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid username or password");
        verify(passwordEncoder).matches("whatever", DUMMY);
    }

    @Test
    void disabledUserThrowsInvalidCredentials() {
        User user = user(2L, "claimant2", "Ben Wong", "CLAIMANT", false);
        when(userRepository.findWithRoleByUsername("claimant2")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", HASH)).thenReturn(true);

        assertThatThrownBy(() -> service.login(new LoginRequest("claimant2", "secret")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void currentUserReturnsDto() {
        User user = user(3L, "staff1", "Chris Lim", "CLAIMS_STAFF", true);
        when(userRepository.findWithRoleById(3L)).thenReturn(Optional.of(user));

        var dto = service.currentUser(new AuthenticatedUser(3L, "staff1", "CLAIMS_STAFF"));

        assertThat(dto.id()).isEqualTo(3L);
        assertThat(dto.displayName()).isEqualTo("Chris Lim");
        assertThat(dto.role()).isEqualTo(RoleCode.CLAIMS_STAFF);
    }

    @Test
    void currentUserMissingThrowsUnauthorized() {
        when(userRepository.findWithRoleById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.currentUser(new AuthenticatedUser(99L, "ghost", "CLAIMANT")))
                .isInstanceOf(UnauthorizedException.class)
                .extracting("code").isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    void currentUserDisabledThrowsUnauthorized() {
        User user = user(2L, "claimant2", "Ben Wong", "CLAIMANT", false);
        when(userRepository.findWithRoleById(2L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.currentUser(new AuthenticatedUser(2L, "claimant2", "CLAIMANT")))
                .isInstanceOf(UnauthorizedException.class);
    }

    static User user(Long id, String username, String displayName, String roleCode, boolean enabled) {
        Role role = org.springframework.beans.BeanUtils.instantiateClass(Role.class);
        ReflectionTestUtils.setField(role, "code", roleCode);
        User user = User.create(username, HASH, displayName, role);
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "enabled", enabled);
        return user;
    }
}
