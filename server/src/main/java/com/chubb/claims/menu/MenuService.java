package com.chubb.claims.menu;

import com.chubb.claims.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Serves the caller's role menu from roles / role_menu / menus. The menu is for display, not access. */
@Slf4j
@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuRepository menuRepository;

    @Transactional(readOnly = true)
    public List<MenuItemDto> menuFor(AuthenticatedUser user) {
        List<MenuItemDto> items = menuRepository.findMenuItemsByRoleCode(user.role());
        if (items.isEmpty()) {
            log.warn("Menu empty userId={} role={}", user.id(), user.role());
        } else {
            log.info("Menu served userId={} role={} items={}", user.id(), user.role(), items.size());
        }
        return items;
    }
}
