package com.chubb.claims.claim;

import com.chubb.claims.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Objects;

/** One status change (03 §3.4), written in the same transaction as the claim update. Append-only. */
@Getter
@Entity
@Immutable
@Table(name = "claim_status_history")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClaimStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, updatable = false)
    private Claim claim;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "from_status", length = 15, updatable = false)
    private ClaimStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "to_status", nullable = false, length = 15, updatable = false)
    private ClaimStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false, updatable = false)
    private User changedBy;

    /** The staff member assigned at that moment, so a reassign (ASSIGNED to ASSIGNED) is visible. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id", updatable = false)
    private User assignedStaff;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;

    public static ClaimStatusHistory record(Claim claim, ClaimStatus from, User changedBy, Instant at) {
        ClaimStatusHistory row = new ClaimStatusHistory();
        row.claim = claim;
        row.fromStatus = from;
        row.toStatus = claim.getStatus();
        row.changedBy = changedBy;
        row.assignedStaff = claim.getAssignedStaff();
        row.changedAt = at;
        return row;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof ClaimStatusHistory other && id != null && Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "ClaimStatusHistory[id=" + id + ", " + fromStatus + "->" + toStatus + "]";
    }
}
