package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.MessageDto;
import com.chubb.claims.claim.dto.SendMessageRequest;
import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/claims/{id}/messages")
@RequiredArgsConstructor
@Tag(name = "Messages", description = "Claimant and staff conversation while IN_PROGRESS")
public class ClaimMessageController {

    private final ClaimMessageService messageService;

    @GetMapping
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Operation(operationId = "listClaimMessages", summary = "Read the claim's messages (oldest first)",
            description = "Roles: CLAIMANT (own claim), CLAIMS_STAFF (assigned to me), MANAGER (any, read only). "
                    + "Works in any status.")
    public ResponseEntity<ApiResponse<List<MessageDto>>> list(
            @PathVariable("id") Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(messageService.list(id, user)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('CLAIMANT','CLAIMS_STAFF')")
    @Operation(operationId = "sendClaimMessage", summary = "Send a message (IN_PROGRESS only)",
            description = "Roles: CLAIMANT (own claim), CLAIMS_STAFF (assigned to me). MANAGER can't send (403). "
                    + "In any status other than IN_PROGRESS the response is 409 MESSAGING_NOT_ALLOWED.")
    public ResponseEntity<ApiResponse<MessageDto>> send(
            @PathVariable("id") Long id,
            @Valid @RequestBody SendMessageRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(messageService.send(id, request, user)));
    }
}
