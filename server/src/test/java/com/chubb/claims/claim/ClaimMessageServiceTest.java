package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.SendMessageRequest;
import com.chubb.claims.common.error.ForbiddenException;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.support.TestData;
import com.chubb.claims.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
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
class ClaimMessageServiceTest {

    @Mock
    private ClaimMessageRepository messageRepository;
    @Mock
    private ClaimRepository claimRepository;
    @Mock
    private UserRepository userRepository;

    private ClaimMessageService service;

    @BeforeEach
    void setUp() {
        service = new ClaimMessageService(messageRepository, new ClaimAccess(claimRepository, userRepository),
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(messageRepository.save(any(ClaimMessage.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRepository.findWithRoleById(1L)).thenReturn(Optional.of(TestData.claimant1()));
        when(userRepository.findWithRoleById(3L)).thenReturn(Optional.of(TestData.staff1()));
    }

    private Claim stored(ClaimStatus status) {
        Claim claim = TestData.claim(10, status);
        when(claimRepository.findWithUsersById(10L)).thenReturn(Optional.of(claim));
        return claim;
    }

    @Test
    void claimantAndAssignedStaffCanSendWhileInProgress() {
        stored(ClaimStatus.IN_PROGRESS);

        var fromClaimant = service.send(10L, new SendMessageRequest(" Here is the quote. "),
                TestData.principal(TestData.claimant1()));
        var fromStaff = service.send(10L, new SendMessageRequest("Thanks."), TestData.principal(TestData.staff1()));

        assertThat(fromClaimant.authorRole()).isEqualTo(RoleCode.CLAIMANT);
        assertThat(fromClaimant.body()).isEqualTo("Here is the quote.");
        assertThat(fromClaimant.author().displayName()).isEqualTo("Alice Tan");
        assertThat(fromClaimant.createdAt()).isEqualTo(NOW);
        assertThat(fromStaff.authorRole()).isEqualTo(RoleCode.CLAIMS_STAFF);
    }

    @ParameterizedTest
    @EnumSource(value = ClaimStatus.class, names = {"SUBMITTED", "ASSIGNED", "SETTLED", "REJECTED"})
    void sendingOutsideInProgressIs409(ClaimStatus status) {
        stored(status);
        var user = status == ClaimStatus.SUBMITTED ? TestData.claimant1() : TestData.staff1();

        assertThatThrownBy(() -> service.send(10L, new SendMessageRequest("hi"), TestData.principal(user)))
                .isInstanceOf(MessagingNotAllowedException.class)
                .hasMessage("Messages can only be sent while the claim is IN_PROGRESS");
        verify(messageRepository, never()).save(any());
    }

    @Test
    void managerCannotSend() {
        stored(ClaimStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.send(10L, new SendMessageRequest("hi"),
                TestData.principal(TestData.manager()))).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void otherClaimantGets404AndOtherStaffGets403() {
        stored(ClaimStatus.IN_PROGRESS);
        assertThatThrownBy(() -> service.send(10L, new SendMessageRequest("hi"),
                TestData.principal(TestData.claimant2()))).isInstanceOf(ClaimNotFoundException.class);
        assertThatThrownBy(() -> service.list(10L, TestData.principal(TestData.staff2())))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void listMapsMessagesInRepositoryOrder() {
        Claim claim = stored(ClaimStatus.SETTLED);
        when(messageRepository.findByClaimIdOrderByCreatedAtAscIdAsc(10L)).thenReturn(List.of(
                ClaimMessage.create(claim, TestData.staff1(), "Question", NOW),
                ClaimMessage.create(claim, TestData.claimant1(), "Answer", NOW.plusSeconds(60))));

        var messages = service.list(10L, TestData.principal(TestData.manager()));

        assertThat(messages).extracting("body").containsExactly("Question", "Answer");
        assertThat(messages).extracting("authorRole").containsExactly(RoleCode.CLAIMS_STAFF, RoleCode.CLAIMANT);
    }
}
