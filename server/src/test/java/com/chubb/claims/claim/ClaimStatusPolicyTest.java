package com.chubb.claims.claim;

import com.chubb.claims.common.error.ErrorCode;
import com.chubb.claims.support.TestData;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Every from/to pair against the table in 02 §2. */
class ClaimStatusPolicyTest {

    private static final Set<String> ALLOWED = Set.of(
            "SUBMITTED->ASSIGNED",
            "ASSIGNED->ASSIGNED",
            "ASSIGNED->IN_PROGRESS",
            "IN_PROGRESS->SETTLED",
            "IN_PROGRESS->REJECTED");

    private final ClaimStatusPolicy policy = new ClaimStatusPolicy();

    static Stream<Arguments> allPairs() {
        return Arrays.stream(ClaimStatus.values())
                .flatMap(from -> Arrays.stream(ClaimStatus.values()).map(to -> Arguments.of(from, to)));
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("allPairs")
    void onlyTheDocumentedTransitionsAreAllowed(ClaimStatus from, ClaimStatus to) {
        boolean expected = ALLOWED.contains(from + "->" + to);
        assertThat(policy.isAllowed(from, to)).isEqualTo(expected);

        Claim claim = TestData.claim(1, from);
        if (expected) {
            assertThatCode(() -> policy.check(claim, to)).doesNotThrowAnyException();
        } else {
            assertThatThrownBy(() -> policy.check(claim, to))
                    .isInstanceOf(InvalidStatusTransitionException.class)
                    .hasMessage("Cannot move claim from " + from + " to " + to)
                    .extracting("code").isEqualTo(ErrorCode.INVALID_STATUS_TRANSITION);
        }
    }

    @Test
    void settledAndRejectedAreFinal() {
        for (ClaimStatus to : ClaimStatus.values()) {
            assertThat(policy.isAllowed(ClaimStatus.SETTLED, to)).isFalse();
            assertThat(policy.isAllowed(ClaimStatus.REJECTED, to)).isFalse();
        }
    }

    @Test
    void assessmentOnlyWhileInProgress() {
        assertThatCode(() -> policy.checkAssessable(TestData.claim(1, ClaimStatus.IN_PROGRESS)))
                .doesNotThrowAnyException();
        for (ClaimStatus status : new ClaimStatus[]{ClaimStatus.SUBMITTED, ClaimStatus.ASSIGNED,
                ClaimStatus.SETTLED, ClaimStatus.REJECTED}) {
            assertThatThrownBy(() -> policy.checkAssessable(TestData.claim(1, status)))
                    .isInstanceOf(InvalidStatusTransitionException.class)
                    .hasMessageContaining(status.name());
        }
    }

    @Test
    void openAndClosedSetsMatchTheRequirements() {
        assertThat(ClaimStatus.OPEN).containsExactlyInAnyOrder(
                ClaimStatus.SUBMITTED, ClaimStatus.ASSIGNED, ClaimStatus.IN_PROGRESS);
        assertThat(ClaimStatus.CLOSED).containsExactlyInAnyOrder(ClaimStatus.SETTLED, ClaimStatus.REJECTED);
    }

    @Test
    void marketDefaultCurrencies() {
        assertThat(Market.SG.defaultCurrency()).isEqualTo(Currency.SGD);
        assertThat(Market.HK.defaultCurrency()).isEqualTo(Currency.HKD);
        assertThat(Market.AU.defaultCurrency()).isEqualTo(Currency.AUD);
        assertThat(Market.MY.defaultCurrency()).isEqualTo(Currency.MYR);
        assertThat(Market.TH.defaultCurrency()).isEqualTo(Currency.THB);
        assertThat(Market.ID.defaultCurrency()).isEqualTo(Currency.IDR);
    }
}
