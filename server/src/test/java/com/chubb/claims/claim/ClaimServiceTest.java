package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.AssessClaimRequest;
import com.chubb.claims.claim.dto.AssignClaimRequest;
import com.chubb.claims.claim.dto.ClaimSearchFilter;
import com.chubb.claims.claim.dto.CreateClaimRequest;
import com.chubb.claims.claim.dto.RejectClaimRequest;
import com.chubb.claims.claim.dto.SettleClaimRequest;
import com.chubb.claims.common.api.FieldErrorDetail;
import com.chubb.claims.common.error.ErrorCode;
import com.chubb.claims.common.error.ForbiddenException;
import com.chubb.claims.common.error.ValidationException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.support.TestData;
import com.chubb.claims.user.User;
import com.chubb.claims.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import static com.chubb.claims.support.TestData.NOW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private ClaimStatusHistoryRepository historyRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ClaimNumberGenerator numberGenerator;

    private ClaimService service;

    private final User claimant1 = TestData.claimant1();
    private final User staff1 = TestData.staff1();
    private final User staff2 = TestData.staff2();
    private final User manager = TestData.manager();

    @BeforeEach
    void setUp() {
        ClaimAccess access = new ClaimAccess(claimRepository, userRepository);
        service = new ClaimService(claimRepository, historyRepository, userRepository, access,
                new ClaimStatusPolicy(), numberGenerator, Clock.fixed(NOW, ZoneOffset.UTC));
        when(claimRepository.saveAndFlush(any(Claim.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(claimant1));
        when(userRepository.findWithRoleById(3L)).thenReturn(Optional.of(staff1));
        when(userRepository.findWithRoleById(4L)).thenReturn(Optional.of(staff2));
        when(userRepository.findWithRoleById(5L)).thenReturn(Optional.of(manager));
        when(userRepository.getReferenceById(any())).thenAnswer(inv -> TestData.user(inv.getArgument(0), "x", "X", "MANAGER"));
    }

    private Claim stored(ClaimStatus status) {
        Claim claim = TestData.claim(10, status);
        when(claimRepository.findWithUsersById(10L)).thenReturn(Optional.of(claim));
        return claim;
    }

    private static AuthenticatedUser as(User user) {
        return TestData.principal(user);
    }

    // ---------- create ----------

    @Test
    void createTakesClaimantFromTokenDefaultsCurrencyAndWritesHistory() {
        when(numberGenerator.next()).thenReturn("CLM-2026-000009");
        var req = new CreateClaimRequest(ClaimType.PROPERTY, Market.HK, " POL-HK-1 ", LocalDate.parse("2026-11-20"),
                " Mong Kok ", " Water came through the ceiling. ", new BigDecimal("80000"), null);

        var dto = service.create(req, as(claimant1));

        assertThat(dto.claimNumber()).isEqualTo("CLM-2026-000009");
        assertThat(dto.status()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(dto.currency()).isEqualTo(Currency.HKD);
        assertThat(dto.claimant().id()).isEqualTo(1L);
        assertThat(dto.assignedStaff()).isNull();
        assertThat(dto.policyNumber()).isEqualTo("POL-HK-1");
        assertThat(dto.location()).isEqualTo("Mong Kok");
        assertThat(dto.estimatedAmount()).isEqualByComparingTo("80000.00");
        assertThat(dto.estimatedAmount().scale()).isEqualTo(2);

        ArgumentCaptor<ClaimStatusHistory> history = ArgumentCaptor.forClass(ClaimStatusHistory.class);
        verify(historyRepository).save(history.capture());
        assertThat(history.getValue().getFromStatus()).isNull();
        assertThat(history.getValue().getToStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(history.getValue().getChangedBy()).isEqualTo(claimant1);
    }

    @Test
    void createKeepsAnExplicitCurrency() {
        when(numberGenerator.next()).thenReturn("CLM-2026-000010");
        var req = new CreateClaimRequest(ClaimType.MOTOR, Market.SG, "P", LocalDate.parse("2026-11-20"),
                "L", "Long enough description", new BigDecimal("10.50"), Currency.MYR);

        assertThat(service.create(req, as(claimant1)).currency()).isEqualTo(Currency.MYR);
    }

    // ---------- get / access ----------

    @Test
    void claimantSeesOwnClaimButGets404ForAnothers() {
        stored(ClaimStatus.SUBMITTED);
        assertThat(service.get(10L, as(claimant1)).id()).isEqualTo(10L);

        assertThatThrownBy(() -> service.get(10L, as(TestData.claimant2())))
                .isInstanceOf(ClaimNotFoundException.class).hasMessage("Claim 10 not found");
    }

    @Test
    void staffSeesAssignedClaimButGets403ForOthers() {
        stored(ClaimStatus.ASSIGNED);
        assertThat(service.get(10L, as(staff1)).id()).isEqualTo(10L);

        assertThatThrownBy(() -> service.get(10L, as(staff2))).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void managerSeesAnyClaim() {
        stored(ClaimStatus.SETTLED);
        assertThat(service.get(10L, as(manager)).status()).isEqualTo(ClaimStatus.SETTLED);
    }

    @Test
    void unknownClaimIs404() {
        when(claimRepository.findWithUsersById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.get(99L, as(manager)))
                .isInstanceOf(ClaimNotFoundException.class)
                .extracting("code").isEqualTo(ErrorCode.CLAIM_NOT_FOUND);
    }

    // ---------- assign ----------

    @Test
    void assignMovesSubmittedToAssignedAndRecordsHistory() {
        stored(ClaimStatus.SUBMITTED);

        var dto = service.assign(10L, new AssignClaimRequest(3L), as(manager));

        assertThat(dto.status()).isEqualTo(ClaimStatus.ASSIGNED);
        assertThat(dto.assignedStaff().id()).isEqualTo(3L);
        assertThat(dto.assignedAt()).isEqualTo(NOW);
        ArgumentCaptor<ClaimStatusHistory> history = ArgumentCaptor.forClass(ClaimStatusHistory.class);
        verify(historyRepository).save(history.capture());
        assertThat(history.getValue().getFromStatus()).isEqualTo(ClaimStatus.SUBMITTED);
        assertThat(history.getValue().getToStatus()).isEqualTo(ClaimStatus.ASSIGNED);
        assertThat(history.getValue().getAssignedStaff()).isEqualTo(staff1);
    }

    @Test
    void reassignKeepsAssignedAndChangesStaff() {
        stored(ClaimStatus.ASSIGNED);

        var dto = service.assign(10L, new AssignClaimRequest(4L), as(manager));

        assertThat(dto.status()).isEqualTo(ClaimStatus.ASSIGNED);
        assertThat(dto.assignedStaff().id()).isEqualTo(4L);
    }

    @Test
    void assignAfterStartIs409AndNeverLooksUpTheStaff() {
        stored(ClaimStatus.IN_PROGRESS);

        assertThatThrownBy(() -> service.assign(10L, new AssignClaimRequest(3L), as(manager)))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage("Cannot move claim from IN_PROGRESS to ASSIGNED");
        verify(userRepository, never()).findWithRoleById(3L);
    }

    @Test
    void assignToNonStaffOrDisabledOrUnknownIsInvalidAssignee() {
        stored(ClaimStatus.SUBMITTED);
        User disabled = TestData.staff2();
        ReflectionTestUtils.setField(disabled, "enabled", false);
        when(userRepository.findWithRoleById(4L)).thenReturn(Optional.of(disabled));
        when(userRepository.findWithRoleById(99L)).thenReturn(Optional.empty());

        for (long target : new long[]{1L, 5L, 4L, 99L}) {
            assertThatThrownBy(() -> service.assign(10L, new AssignClaimRequest(target), as(manager)))
                    .isInstanceOf(InvalidAssigneeException.class)
                    .hasMessage("User " + target + " is not a claims staff member")
                    .extracting("code").isEqualTo(ErrorCode.INVALID_ASSIGNEE);
        }
    }

    // ---------- start ----------

    @Test
    void startMovesAssignedToInProgress() {
        stored(ClaimStatus.ASSIGNED);

        var dto = service.start(10L, as(staff1));

        assertThat(dto.status()).isEqualTo(ClaimStatus.IN_PROGRESS);
        assertThat(dto.startedAt()).isEqualTo(NOW);
    }

    @Test
    void startByAnotherStaffIs403BeforeTheStatusCheck() {
        stored(ClaimStatus.SETTLED);
        assertThatThrownBy(() -> service.start(10L, as(staff2))).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void startTwiceIs409() {
        stored(ClaimStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.start(10L, as(staff1)))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    @Test
    void staffActionsByNonStaffAre403() {
        stored(ClaimStatus.ASSIGNED);
        assertThatThrownBy(() -> service.start(10L, as(manager))).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.start(10L, as(claimant1))).isInstanceOf(ForbiddenException.class);
    }

    // ---------- assess ----------

    @Test
    void assessSetsAmountWithoutChangingStatusOrWritingHistory() {
        stored(ClaimStatus.IN_PROGRESS);

        var dto = service.assess(10L, new AssessClaimRequest(new BigDecimal("5800")), as(staff1));

        assertThat(dto.assessedAmount()).isEqualByComparingTo("5800.00");
        assertThat(dto.status()).isEqualTo(ClaimStatus.IN_PROGRESS);
        verify(historyRepository, never()).save(any());
    }

    @Test
    void assessOutsideInProgressIs409() {
        stored(ClaimStatus.ASSIGNED);
        assertThatThrownBy(() -> service.assess(10L, new AssessClaimRequest(BigDecimal.ONE), as(staff1)))
                .isInstanceOf(InvalidStatusTransitionException.class);
    }

    // ---------- settle ----------

    @Test
    void settleWithoutAssessedAmountIs400() {
        stored(ClaimStatus.IN_PROGRESS);

        assertThatThrownBy(() -> service.settle(10L, new SettleClaimRequest(BigDecimal.TEN, "ok"), as(staff1)))
                .isInstanceOf(ValidationException.class)
                .extracting("details").asList()
                .containsExactly(new FieldErrorDetail("settledAmount", "an assessed amount must be saved before settling"));
    }

    @Test
    void settleAboveAssessedIs400() {
        Claim claim = stored(ClaimStatus.IN_PROGRESS);
        claim.assess(new BigDecimal("5800.00"));

        assertThatThrownBy(() -> service.settle(10L, new SettleClaimRequest(new BigDecimal("5800.01"), "ok"),
                as(staff1)))
                .isInstanceOf(ValidationException.class)
                .extracting("details").asList()
                .containsExactly(new FieldErrorDetail("settledAmount", "must not exceed assessed amount 5800.00"));
    }

    @Test
    void settleUpToAssessedClosesTheClaim() {
        Claim claim = stored(ClaimStatus.IN_PROGRESS);
        claim.assess(new BigDecimal("5800.00"));

        var dto = service.settle(10L, new SettleClaimRequest(new BigDecimal("5800.00"), " Approved. "), as(staff1));

        assertThat(dto.status()).isEqualTo(ClaimStatus.SETTLED);
        assertThat(dto.settledAmount()).isEqualByComparingTo("5800.00");
        assertThat(dto.decisionNote()).isEqualTo("Approved.");
        assertThat(dto.closedAt()).isEqualTo(NOW);
    }

    @Test
    void settleTwiceIs409BeforeTheAmountRules() {
        stored(ClaimStatus.SETTLED);
        assertThatThrownBy(() -> service.settle(10L, new SettleClaimRequest(new BigDecimal("1"), "x"), as(staff1)))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage("Cannot move claim from SETTLED to SETTLED");
    }

    // ---------- reject ----------

    @Test
    void rejectClosesWithNote() {
        stored(ClaimStatus.IN_PROGRESS);

        var dto = service.reject(10L, new RejectClaimRequest("Not covered."), as(staff1));

        assertThat(dto.status()).isEqualTo(ClaimStatus.REJECTED);
        assertThat(dto.decisionNote()).isEqualTo("Not covered.");
        assertThat(dto.closedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectAfterSettleIs409() {
        stored(ClaimStatus.SETTLED);
        assertThatThrownBy(() -> service.reject(10L, new RejectClaimRequest("x"), as(staff1)))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessage("Cannot move claim from SETTLED to REJECTED");
    }

    // ---------- search ----------

    @Test
    void searchWithFromAfterToIs400() {
        var filter = new ClaimSearchFilter(null, null, null, LocalDate.parse("2026-11-30"),
                LocalDate.parse("2026-11-01"));

        assertThatThrownBy(() -> service.search(filter, 0, 20, "createdAt,desc", as(manager)))
                .isInstanceOf(ValidationException.class)
                .extracting("details").asList()
                .containsExactly(new FieldErrorDetail("submittedTo", "must be on or after submittedFrom"));
    }
}
