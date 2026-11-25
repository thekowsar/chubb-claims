package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.ClaimDetailDto;
import com.chubb.claims.claim.dto.ClaimSummaryDto;
import com.chubb.claims.claim.dto.MessageDto;
import com.chubb.claims.claim.dto.StatusHistoryDto;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.UserRef;

/** Entity to DTO mapping, used by the services inside their transactions (CLAUDE.md layering). */
public final class ClaimMapper {

    private ClaimMapper() {
    }

    public static ClaimSummaryDto toSummary(Claim c) {
        return new ClaimSummaryDto(c.getId(), c.getClaimNumber(), c.getType(), c.getMarket(), c.getStatus(),
                c.getIncidentDate(), c.getEstimatedAmount(), c.getCurrency(), UserRef.of(c.getClaimant()),
                UserRef.of(c.getAssignedStaff()), c.getCreatedAt(), c.getUpdatedAt());
    }

    public static ClaimDetailDto toDetail(Claim c) {
        return new ClaimDetailDto(c.getId(), c.getClaimNumber(), c.getType(), c.getMarket(), c.getPolicyNumber(),
                c.getIncidentDate(), c.getLocation(), c.getDescription(), c.getEstimatedAmount(), c.getCurrency(),
                c.getStatus(), UserRef.of(c.getClaimant()), UserRef.of(c.getAssignedStaff()),
                c.getAssessedAmount(), c.getSettledAmount(), c.getDecisionNote(), c.getCreatedAt(),
                c.getUpdatedAt(), c.getAssignedAt(), c.getStartedAt(), c.getClosedAt());
    }

    public static MessageDto toMessage(ClaimMessage m) {
        return new MessageDto(m.getId(), UserRef.of(m.getAuthor()),
                RoleCode.valueOf(m.getAuthor().getRole().getCode()), m.getBody(), m.getCreatedAt());
    }

    public static StatusHistoryDto toHistory(ClaimStatusHistory h) {
        return new StatusHistoryDto(h.getFromStatus(), h.getToStatus(), UserRef.of(h.getChangedBy()),
                UserRef.of(h.getAssignedStaff()), h.getChangedAt());
    }
}
