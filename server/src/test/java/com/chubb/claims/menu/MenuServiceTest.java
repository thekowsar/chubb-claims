package com.chubb.claims.menu;

import com.chubb.claims.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @InjectMocks
    private MenuService service;

    @Test
    void returnsRepositoryItemsForTheCallersRoleInOrder() {
        List<MenuItemDto> items = List.of(
                new MenuItemDto("DASHBOARD", "Dashboard", "/manager/dashboard", "dashboard", 10),
                new MenuItemDto("ALL_CLAIMS", "All claims", "/manager/claims", "list", 20));
        when(menuRepository.findMenuItemsByRoleCode("MANAGER")).thenReturn(items);

        List<MenuItemDto> result = service.menuFor(new AuthenticatedUser(5L, "manager1", "MANAGER"));

        assertThat(result).containsExactlyElementsOf(items);
        verify(menuRepository).findMenuItemsByRoleCode("MANAGER");
    }

    @Test
    void unknownRoleGetsEmptyMenu() {
        when(menuRepository.findMenuItemsByRoleCode("AUDITOR")).thenReturn(List.of());

        assertThat(service.menuFor(new AuthenticatedUser(9L, "x", "AUDITOR"))).isEmpty();
    }
}
