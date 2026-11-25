package com.chubb.claims.claim;

import com.chubb.claims.common.entity.AuditableEntity;
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
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/**
 * A claim (03 §3.2). State changes only through the methods below, which the service calls after
 * {@link ClaimStatusPolicy} has accepted the transition. No collections: messages and history have their own
 * repositories (03 §6).
 */
@Getter
@Entity
@Table(name = "claims")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Claim extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "claim_number", nullable = false, length = 20, unique = true, updatable = false)
    private String claimNumber;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "type", nullable = false, length = 10)
    private ClaimType type;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "market", nullable = false, length = 2)
    private Market market;

    @Column(name = "policy_number", nullable = false, length = 30)
    private String policyNumber;

    @Column(name = "incident_date", nullable = false)
    private LocalDate incidentDate;

    @Column(name = "location", nullable = false, length = 200)
    private String location;

    @Column(name = "description", nullable = false, length = 2000)
    private String description;

    @Column(name = "estimated_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal estimatedAmount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private Currency currency;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "status", nullable = false, length = 15)
    private ClaimStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claimant_id", nullable = false, updatable = false)
    private User claimant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Column(name = "assessed_amount", precision = 15, scale = 2)
    private BigDecimal assessedAmount;

    @Column(name = "settled_amount", precision = 15, scale = 2)
    private BigDecimal settledAmount;

    @Column(name = "decision_note", length = 2000)
    private String decisionNote;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @SuppressWarnings("java:S107")
    public static Claim submit(String claimNumber, ClaimType type, Market market, String policyNumber,
                               LocalDate incidentDate, String location, String description,
                               BigDecimal estimatedAmount, Currency currency, User claimant) {
        Claim claim = new Claim();
        claim.claimNumber = claimNumber;
        claim.type = type;
        claim.market = market;
        claim.policyNumber = policyNumber;
        claim.incidentDate = incidentDate;
        claim.location = location;
        claim.description = description;
        claim.estimatedAmount = money(estimatedAmount);
        claim.currency = currency;
        claim.claimant = claimant;
        claim.status = ClaimStatus.SUBMITTED;
        return claim;
    }

    /** SUBMITTED/ASSIGNED to ASSIGNED. A reassign resets assignedAt. */
    public void assignTo(User staff, Instant at) {
        this.assignedStaff = staff;
        this.assignedAt = at;
        this.status = ClaimStatus.ASSIGNED;
    }

    /** ASSIGNED to IN_PROGRESS. */
    public void start(Instant at) {
        this.startedAt = at;
        this.status = ClaimStatus.IN_PROGRESS;
    }

    /** IN_PROGRESS only; status does not change. */
    public void assess(BigDecimal amount) {
        this.assessedAmount = money(amount);
    }

    /** IN_PROGRESS to SETTLED. */
    public void settle(BigDecimal amount, String note, Instant at) {
        this.settledAmount = money(amount);
        this.decisionNote = note;
        this.closedAt = at;
        this.status = ClaimStatus.SETTLED;
    }

    /** IN_PROGRESS to REJECTED. */
    public void reject(String note, Instant at) {
        this.decisionNote = note;
        this.closedAt = at;
        this.status = ClaimStatus.REJECTED;
    }

    public boolean isAssignedTo(Long userId) {
        return assignedStaff != null && Objects.equals(assignedStaff.getId(), userId);
    }

    public boolean isOwnedBy(Long userId) {
        return claimant != null && Objects.equals(claimant.getId(), userId);
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount == null ? null : amount.setScale(2, RoundingMode.UNNECESSARY);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof Claim other && id != null && Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "Claim[id=" + id + ", status=" + status + "]";
    }
}
