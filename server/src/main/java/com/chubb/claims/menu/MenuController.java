package com.chubb.claims.menu;

import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
@Tag(name = "Menu", description = "Role menu from the database (roles, menus, role_menu)")
public class MenuController {

    private final MenuService menuService;

    @GetMapping
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Operation(operationId = "getMyMenu",
            summary = "Get the menu for the caller's role (from roles, menus and role_menu)",
            description = "Roles: CLAIMANT, CLAIMS_STAFF, MANAGER. Returns only the caller's enabled menu items, "
                    + "ordered by sortOrder. The first item is the role's home page.")
    public ResponseEntity<ApiResponse<List<MenuItemDto>>> getMyMenu(
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(menuService.menuFor(user)));
    }
}
