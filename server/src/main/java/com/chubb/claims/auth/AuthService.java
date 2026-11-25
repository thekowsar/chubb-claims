package com.chubb.claims.auth;

import com.chubb.claims.common.error.InvalidCredentialsException;
import com.chubb.claims.common.error.UnauthorizedException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.JwtService;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserDto;
import com.chubb.claims.user.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Login and current-user lookup (02 §4.1). Unknown user, wrong password and disabled user all give the same
 * 401 INVALID_CREDENTIALS. A BCrypt check runs even for an unknown user so response time does not reveal it.
 */
@Slf4j
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String dummyHash;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.dummyHash = passwordEncoder.encode("timing-equaliser-not-a-real-password");
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String username = User.normalizeUsername(request.username());
        Optional<User> found = userRepository.findWithRoleByUsername(username);

        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            log.warn("Login failed username={} reason=UNKNOWN_USER", username);
            throw new InvalidCredentialsException();
        }
        User user = found.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            log.warn("Login failed username={} reason=BAD_PASSWORD", username);
            throw new InvalidCredentialsException();
        }
        if (!user.isEnabled()) {
            log.warn("Login failed username={} reason=DISABLED", username);
            throw new InvalidCredentialsException();
        }

        UserDto dto = UserDto.from(user);
        String token = jwtService.generate(dto.id(), dto.username(), dto.role().name());
        log.info("Login success userId={} role={}", dto.id(), dto.role());
        return new LoginResponse(token, LoginResponse.BEARER, jwtService.expirationSeconds(), dto);
    }

    /** Restores the session on refresh. A token for a removed or disabled user counts as unauthenticated. */
    @Transactional(readOnly = true)
    public UserDto currentUser(AuthenticatedUser principal) {
        User user = userRepository.findWithRoleById(principal.id())
                .filter(User::isEnabled)
                .orElseThrow(() -> {
                    log.warn("Current user unavailable userId={}", principal.id());
                    return new UnauthorizedException();
                });
        log.debug("Current user resolved userId={}", user.getId());
        return UserDto.from(user);
    }
}
