package com.chubb.claims.user;

import com.chubb.claims.security.RoleCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** User lookup for the assign dialog (02 P6). Enabled users only, sorted by display name. */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserDto> listByRole(RoleCode role) {
        List<UserDto> users = userRepository.findByRoleCodeAndEnabledTrueOrderByDisplayNameAsc(role.name())
                .stream().map(UserDto::from).toList();
        log.debug("Users listed role={} count={}", role, users.size());
        return users;
    }
}
