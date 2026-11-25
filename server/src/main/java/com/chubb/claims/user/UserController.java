package com.chubb.claims.user;

import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.security.RoleCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User lookup for assignment")
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(operationId = "listUsers", summary = "List users by role (used for the staff picker when assigning)",
            description = "Roles: MANAGER. Returns enabled users only, sorted by display name.")
    public ResponseEntity<ApiResponse<List<UserDto>>> list(@RequestParam("role") RoleCode role) {
        return ResponseEntity.ok(ApiResponse.ok(userService.listByRole(role)));
    }
}
