package com.chubb.claims.dashboard;

import com.chubb.claims.common.api.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Manager workload and liability")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    @Operation(operationId = "getDashboard",
            summary = "Manager dashboard with workload, counts and outstanding liability",
            description = "Roles: MANAGER. period = WEEK | MONTH | ALL (default). Liability, workload and the "
                    + "unassigned count are a snapshot of now and don't change with the period.")
    public ResponseEntity<ApiResponse<DashboardDto>> get(
            @RequestParam(name = "period", defaultValue = "ALL") DashboardPeriod period) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.get(period)));
    }
}
