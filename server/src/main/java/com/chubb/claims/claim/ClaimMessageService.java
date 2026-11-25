package com.chubb.claims.claim;

import com.chubb.claims.claim.dto.MessageDto;
import com.chubb.claims.claim.dto.SendMessageRequest;
import com.chubb.claims.common.error.ForbiddenException;
import com.chubb.claims.security.AuthenticatedUser;
import com.chubb.claims.security.RoleCode;
import com.chubb.claims.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

/**
 * Claimant and assigned staff conversation (01 §5.1, 02 P10/P11). Readable in any status by everyone who can
 * see the claim; sending is only for the owning claimant and assigned staff while IN_PROGRESS.
 * Message bodies are never logged.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClaimMessageService {

    private final ClaimMessageRepository messageRepository;
    private final ClaimAccess access;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<MessageDto> list(Long claimId, AuthenticatedUser user) {
        access.loadForView(claimId, user);
        return messageRepository.findByClaimIdOrderByCreatedAtAscIdAsc(claimId).stream()
                .map(ClaimMapper::toMessage).toList();
    }

    @Transactional
    public MessageDto send(Long claimId, SendMessageRequest req, AuthenticatedUser user) {
        Claim claim = access.loadForView(claimId, user);
        if (access.role(user) == RoleCode.MANAGER) {
            log.warn("Manager cannot send messages claimId={} userId={}", claimId, user.id());
            throw new ForbiddenException();
        }
        if (claim.getStatus() != ClaimStatus.IN_PROGRESS) {
            log.warn("Messaging not allowed claimId={} status={}", claimId, claim.getStatus());
            throw new MessagingNotAllowedException();
        }
        User author = access.actor(user);
        ClaimMessage saved = messageRepository.save(ClaimMessage.create(claim, author, req.body().trim(),
                clock.instant()));
        log.info("Message sent id={} claimId={} authorId={} role={}", saved.getId(), claimId, author.getId(),
                user.role());
        return ClaimMapper.toMessage(saved);
    }
}
