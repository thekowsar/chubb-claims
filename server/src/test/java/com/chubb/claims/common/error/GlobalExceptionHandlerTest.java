package com.chubb.claims.common.error;

import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.common.api.FieldErrorDetail;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void unexpectedExceptionGivesGeneric500WithoutLeakingDetail() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleUnexpected(new IllegalStateException("db password is hunter2"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        ApiResponse<Void> body = response.getBody();
        assertThat(body.success()).isFalse();
        assertThat(body.data()).isNull();
        assertThat(body.timestamp()).isNotNull();
        assertThat(body.error().code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
        assertThat(body.error().message()).isEqualTo("An unexpected error occurred").doesNotContain("hunter2");
        assertThat(body.error().details()).isEmpty();
    }

    @Test
    void apiExceptionUsesItsCodeStatusAndDetails() {
        var ex = new ApiException(ErrorCode.VALIDATION_FAILED, "Request validation failed",
                List.of(new FieldErrorDetail("settledAmount", "must not exceed assessed amount 5800.00")));

        ResponseEntity<ApiResponse<Void>> response = handler.handleApi(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().details())
                .containsExactly(new FieldErrorDetail("settledAmount", "must not exceed assessed amount 5800.00"));
    }

    @Test
    void eachErrorCodeMapsToItsHttpStatus() {
        assertThat(handler.handleApi(new InvalidCredentialsException()).getStatusCode().value()).isEqualTo(401);
        assertThat(handler.handleApi(new UnauthorizedException()).getStatusCode().value()).isEqualTo(401);
        assertThat(handler.handleApi(new ApiException(ErrorCode.CLAIM_NOT_FOUND, "Claim 42 not found"))
                .getStatusCode().value()).isEqualTo(404);
        assertThat(handler.handleApi(new ApiException(ErrorCode.INVALID_STATUS_TRANSITION, "x"))
                .getStatusCode().value()).isEqualTo(409);
    }

    @Test
    void accessDeniedGives403() {
        var response = handler.handleAccessDenied(new AccessDeniedException("no"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().error().code()).isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    void optimisticLockGives409ConcurrentModification() {
        var response = handler.handleOptimisticLock(new ObjectOptimisticLockingFailureException(Object.class, 1L));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().error().code()).isEqualTo(ErrorCode.CONCURRENT_MODIFICATION);
    }
}
