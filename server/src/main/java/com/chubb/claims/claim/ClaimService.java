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
import com.chubb.claims.common.error.ForbiddenException;
import com.chubb.claims.common.error.ValidationException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

/**
 * Claims and their workflow (02 §2, §4). Order of checks follows the contract: 404, then 403 (ownership),
 * then 409 (status policy), then 400 (business rules). Every status change writes a history row in the same
 * transaction and is logged at INFO with ids and statuses only (no names, notes or amounts).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final ClaimStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ClaimAccess access;
    private final ClaimStatusPolicy statusPolicy;
    private final ClaimNumberGenerator numberGenerator;
    private final Clock clock;

    @Transactional
    public ClaimDetailDto create(CreateClaimRequest req, AuthenticatedUser user) {
        User claimant = access.actor(user);
        Currency currency = req.currency() != null ? req.currency() : req.market().defaultCurrency();
        Claim claim = Claim.submit(numberGenerator.next(), req.type(), req.market(), req.policyNumber().trim(),
                req.incidentDate(), req.location().trim(), req.description().trim(), req.estimatedAmount(),
                currency, claimant);
        claim = claimRepository.saveAndFlush(claim);
        historyRepository.save(ClaimStatusHistory.record(claim, null, claimant, claim.getCreatedAt()));
        log.info("Claim created id={} number={} type={} market={}", claim.getId(), claim.getClaimNumber(),
                claim.getType(), claim.getMarket());
        return ClaimMapper.toDetail(claim);
    }

    @Transactional(readOnly = true)
    public ClaimSummaryPage search(ClaimSearchFilter filter, int page, int size, String sort, AuthenticatedUser user) {
        access.role(user);
        if (filter.submittedFrom() != null && filter.submittedTo() != null
                && filter.submittedFrom().isAfter(filter.submittedTo())) {
            log.warn("Invalid date range userId={}", user.id());
            throw new ValidationException("submittedTo", "must be on or after submittedFrom");
        }
        PageRequest pageable = PageRequest.of(page, size, toSort(sort));
        Page<Claim> result = claimRepository.findAll(ClaimSpecifications.forSearch(user, filter), pageable);
        log.debug("Claim search userId={} role={} total={}", user.id(), user.role(), result.getTotalElements());
        return new ClaimSummaryPage(result.map(ClaimMapper::toSummary).getContent(), result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public ClaimDetailDto get(Long id, AuthenticatedUser user) {
        return ClaimMapper.toDetail(access.loadForView(id, user));
    }

    @Transactional(readOnly = true)
    public List<StatusHistoryDto> history(Long id, AuthenticatedUser user) {
        access.loadForView(id, user);
        return historyRepository.findByClaimIdOrderByChangedAtAscIdAsc(id).stream()
                .map(ClaimMapper::toHistory).toList();
    }

    /** MANAGER: SUBMITTED or ASSIGNED to ASSIGNED (assign or reassign). Order: 404, 409, 400 INVALID_ASSIGNEE. */
    @Transactional
    public ClaimDetailDto assign(Long id, AssignClaimRequest req, AuthenticatedUser user) {
        Claim claim = access.loadForView(id, user);
        if (access.role(user) != RoleCode.MANAGER) {
            throw new ForbiddenException();
        }
        statusPolicy.check(claim, ClaimStatus.ASSIGNED);
        User staff = userRepository.findWithRoleById(req.staffId())
                .filter(u -> u.isEnabled() && RoleCode.CLAIMS_STAFF.name().equals(u.getRole().getCode()))
                .orElseThrow(() -> {
                    log.warn("Invalid assignee claimId={} staffId={}", id, req.staffId());
                    return new InvalidAssigneeException(req.staffId());
                });
        ClaimStatus from = claim.getStatus();
        Instant at = now();
        claim.assignTo(staff, at);
        Claim saved = saveWithHistory(claim, from, user, at);
        log.info("Claim assigned id={} staffId={} reassign={}", id, staff.getId(), from == ClaimStatus.ASSIGNED);
        return ClaimMapper.toDetail(saved);
    }

    /** Assigned CLAIMS_STAFF: ASSIGNED to IN_PROGRESS. */
    @Transactional
    public ClaimDetailDto start(Long id, AuthenticatedUser user) {
        Claim claim = access.loadForStaffAction(id, user);
        statusPolicy.check(claim, ClaimStatus.IN_PROGRESS);
        ClaimStatus from = claim.getStatus();
        Instant at = now();
        claim.start(at);
        return ClaimMapper.toDetail(saveWithHistory(claim, from, user, at));
    }

    /** Assigned CLAIMS_STAFF, IN_PROGRESS only. Status does not change, so no history row. */
    @Transactional
    public ClaimDetailDto assess(Long id, AssessClaimRequest req, AuthenticatedUser user) {
        Claim claim = access.loadForStaffAction(id, user);
        statusPolicy.checkAssessable(claim);
        claim.assess(req.assessedAmount());
        Claim saved = claimRepository.saveAndFlush(claim);
        log.info("Claim assessed id={} actorId={}", id, user.id());
        return ClaimMapper.toDetail(saved);
    }

    /** Assigned CLAIMS_STAFF: IN_PROGRESS to SETTLED. Needs a stored assessed amount and settled ≤ assessed. */
    @Transactional
    public ClaimDetailDto settle(Long id, SettleClaimRequest req, AuthenticatedUser user) {
        Claim claim = access.loadForStaffAction(id, user);
        statusPolicy.check(claim, ClaimStatus.SETTLED);
        if (claim.getAssessedAmount() == null) {
            log.warn("Settle rejected, no assessed amount claimId={}", id);
            throw new ValidationException("settledAmount", "an assessed amount must be saved before settling");
        }
        if (req.settledAmount().compareTo(claim.getAssessedAmount()) > 0) {
            log.warn("Settle rejected, settled above assessed claimId={}", id);
            throw new ValidationException("settledAmount",
                    "must not exceed assessed amount " + claim.getAssessedAmount().toPlainString());
        }
        ClaimStatus from = claim.getStatus();
        Instant at = now();
        claim.settle(req.settledAmount(), req.decisionNote().trim(), at);
        return ClaimMapper.toDetail(saveWithHistory(claim, from, user, at));
    }

    /** Assigned CLAIMS_STAFF: IN_PROGRESS to REJECTED with a decision note. */
    @Transactional
    public ClaimDetailDto reject(Long id, RejectClaimRequest req, AuthenticatedUser user) {
        Claim claim = access.loadForStaffAction(id, user);
        statusPolicy.check(claim, ClaimStatus.REJECTED);
        ClaimStatus from = claim.getStatus();
        Instant at = now();
        claim.reject(req.decisionNote().trim(), at);
        return ClaimMapper.toDetail(saveWithHistory(claim, from, user, at));
    }

    private Claim saveWithHistory(Claim claim, ClaimStatus from, AuthenticatedUser user, Instant at) {
        Claim saved = claimRepository.saveAndFlush(claim);
        historyRepository.save(ClaimStatusHistory.record(saved, from, userRepository.getReferenceById(user.id()), at));
        log.info("Claim status changed id={} from={} to={} actorId={}", saved.getId(), from, saved.getStatus(),
                user.id());
        return saved;
    }

    private Instant now() {
        return clock.instant();
    }

    private static Sort toSort(String sort) {
        String[] parts = sort.split(",");
        Sort.Direction direction = Sort.Direction.fromString(parts[1]);
        return Sort.by(direction, parts[0]).and(Sort.by(direction, "id"));
    }
}
