package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.AssessClaimRequest;
import com.chubb.claims.claim.dto.AssignClaimRequest;
import com.chubb.claims.claim.dto.ClaimDetailDto;
import com.chubb.claims.claim.dto.ClaimSearchFilter;
import com.chubb.claims.claim.dto.ClaimSummaryPage;
import com.chubb.claims.claim.dto.CreateClaimRequest;
import com.chubb.claims.claim.dto.RejectClaimRequest;
import com.chubb.claims.claim.dto.SettleClaimRequest;
import com.chubb.claims.claim.dto.StatusHistoryDto;
import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

/**
 * Claims and claim workflow endpoints (04-api-spec.yaml). Role checks run at the URL level in SecurityConfig
 * (so a wrong role gets 403 before body validation) and again with @PreAuthorize; ownership and status rules
 * are in the services.
 */
@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    static final String SORT_PATTERN =
            "^(createdAt|updatedAt|incidentDate|estimatedAmount|claimNumber|status),(asc|desc)$";

    private final ClaimService claimService;

    @GetMapping
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Tag(name = "Claims")
    @Operation(operationId = "searchClaims",
            summary = "List claims with filters, sorting and pagination (scoped by role)",
            description = "Roles: CLAIMANT (own claims only), CLAIMS_STAFF (claims assigned to me only), "
                    + "MANAGER (all claims). The role scope is applied on the server before the filters.")
    public ResponseEntity<ApiResponse<ClaimSummaryPage>> search(
            @RequestParam(name = "status", required = false) List<ClaimStatus> status,
            @RequestParam(name = "market", required = false) Market market,
            @RequestParam(name = "type", required = false) ClaimType type,
            @RequestParam(name = "submittedFrom", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate submittedFrom,
            @RequestParam(name = "submittedTo", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate submittedTo,
            @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(name = "size", defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc")
            @Pattern(regexp = SORT_PATTERN, message = "must be field,direction with an allowed field") String sort,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        var filter = new ClaimSearchFilter(status, market, type, submittedFrom, submittedTo);
        return ResponseEntity.ok(ApiResponse.ok(claimService.search(filter, page, size, sort, user)));
    }

    @PostMapping
    @PreAuthorize("hasRole('CLAIMANT')")
    @Tag(name = "Claims")
    @Operation(operationId = "createClaim", summary = "Submit a new claim (status SUBMITTED)",
            description = "Roles: CLAIMANT. The claimant is taken from the token. currency defaults to the market's.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> create(
            @Valid @RequestBody CreateClaimRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        ClaimDetailDto created = claimService.create(request, user);
        return ResponseEntity.created(URI.create("/api/claims/" + created.id())).body(ApiResponse.ok(created));
    }

    @GetMapping("/{id}")
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Tag(name = "Claims")
    @Operation(operationId = "getClaim", summary = "Get claim detail",
            description = "Roles: CLAIMANT (own claim; another claimant's claim returns 404), "
                    + "CLAIMS_STAFF (assigned to me; otherwise 403), MANAGER (any).")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> get(
            @PathVariable("id") Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.get(id, user)));
    }

    @GetMapping("/{id}/history")
    @PreAuthorize(RoleCode.ANY_ROLE)
    @Tag(name = "Claims")
    @Operation(operationId = "getClaimHistory", summary = "Status history of a claim (oldest first)",
            description = "Roles: CLAIMANT (own claim), CLAIMS_STAFF (assigned to me), MANAGER (any).")
    public ResponseEntity<ApiResponse<List<StatusHistoryDto>>> history(
            @PathVariable("id") Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.history(id, user)));
    }

    @PutMapping("/{id}/assignment")
    @PreAuthorize("hasRole('MANAGER')")
    @Tag(name = "Claim workflow")
    @Operation(operationId = "assignClaim",
            summary = "Assign or reassign a claim to a staff member (SUBMITTED/ASSIGNED to ASSIGNED)",
            description = "Roles: MANAGER. Allowed only while the claim is SUBMITTED or ASSIGNED. "
                    + "The target must be an enabled CLAIMS_STAFF user.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> assign(
            @PathVariable("id") Long id,
            @Valid @RequestBody AssignClaimRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.assign(id, request, user)));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('CLAIMS_STAFF')")
    @Tag(name = "Claim workflow")
    @Operation(operationId = "startClaim", summary = "Start work on an assigned claim (ASSIGNED to IN_PROGRESS)",
            description = "Roles: CLAIMS_STAFF (assigned staff only). No request body.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> start(
            @PathVariable("id") Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.start(id, user)));
    }

    @PatchMapping("/{id}/assessment")
    @PreAuthorize("hasRole('CLAIMS_STAFF')")
    @Tag(name = "Claim workflow")
    @Operation(operationId = "assessClaim", summary = "Set or update the assessed amount (IN_PROGRESS only)",
            description = "Roles: CLAIMS_STAFF (assigned staff only). Status doesn't change.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> assess(
            @PathVariable("id") Long id,
            @Valid @RequestBody AssessClaimRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.assess(id, request, user)));
    }

    @PostMapping("/{id}/settle")
    @PreAuthorize("hasRole('CLAIMS_STAFF')")
    @Tag(name = "Claim workflow")
    @Operation(operationId = "settleClaim", summary = "Settle a claim (IN_PROGRESS to SETTLED)",
            description = "Roles: CLAIMS_STAFF (assigned staff only). Uses the stored assessedAmount, which must "
                    + "already be set. settledAmount must be greater than 0 and no more than assessedAmount.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> settle(
            @PathVariable("id") Long id,
            @Valid @RequestBody SettleClaimRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.settle(id, request, user)));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('CLAIMS_STAFF')")
    @Tag(name = "Claim workflow")
    @Operation(operationId = "rejectClaim", summary = "Reject a claim (IN_PROGRESS to REJECTED)",
            description = "Roles: CLAIMS_STAFF (assigned staff only). decisionNote is required.")
    public ResponseEntity<ApiResponse<ClaimDetailDto>> reject(
            @PathVariable("id") Long id,
            @Valid @RequestBody RejectClaimRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthenticatedUser user) {
        return ResponseEntity.ok(ApiResponse.ok(claimService.reject(id, request, user)));
    }
}
