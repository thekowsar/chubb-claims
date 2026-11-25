package com.chubb.claims.claim;

import com.chubb.claims.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.time.Instant;
import java.util.Objects;

/** One message on a claim (03 §3.3). Append-only: created once, never updated. The body is never logged. */
@Getter
@Entity
@Immutable
@Table(name = "claim_messages")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ClaimMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "claim_id", nullable = false, updatable = false)
    private Claim claim;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false, updatable = false)
    private User author;

    @Column(name = "body", nullable = false, length = 2000, updatable = false)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by", nullable = false, length = 50, updatable = false)
    private String createdBy;

    public static ClaimMessage create(Claim claim, User author, String body, Instant at) {
        ClaimMessage message = new ClaimMessage();
        message.claim = claim;
        message.author = author;
        message.body = body;
        message.createdAt = at;
        message.createdBy = author.getUsername();
        return message;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof ClaimMessage other && id != null && Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "ClaimMessage[id=" + id + "]";
    }
}
