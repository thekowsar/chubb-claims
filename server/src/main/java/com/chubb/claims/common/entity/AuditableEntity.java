package com.chubb.claims.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;

/** Adds created_by / updated_by (username, or "system" for the seeder). Used by Claim in the claims slice (03 §5). */
@Getter
@MappedSuperclass
public abstract class AuditableEntity extends TimestampedEntity {

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 50)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", nullable = false, length = 50)
    private String updatedBy;
}
