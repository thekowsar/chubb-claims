package com.chubb.claims.common.error;

import com.chubb.claims.common.api.ApiError;
import com.chubb.claims.common.api.ApiResponse;
import com.chubb.claims.common.api.FieldErrorDetail;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Comparator;
import java.util.List;

/**
 * Turns every exception into the failure envelope with the right HTTP status (CLAUDE.md "API response envelope").
 * 4xx are logged at WARN without bodies; anything unexpected is logged at ERROR with the stack trace,
 * and the client only gets a generic message.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    static final String VALIDATION_MESSAGE = "Request validation failed";
    static final String INTERNAL_MESSAGE = "An unexpected error occurred";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApi(ApiException ex) {
        log.warn("Request rejected code={} status={}", ex.getCode(), ex.getCode().status().value());
        return build(ex.getCode(), ex.getMessage(), ex.getDetails());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleBodyValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorDetail> details = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::toDetail)
                .sorted(Comparator.comparing(FieldErrorDetail::field))
                .toList();
        log.warn("Validation failed fields={}", details.stream().map(FieldErrorDetail::field).toList());
        return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE, details);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodValidation(HandlerMethodValidationException ex) {
        List<FieldErrorDetail> details = ex.getAllValidationResults().stream()
                .flatMap(result -> {
                    if (result instanceof org.springframework.validation.method.ParameterErrors errors) {
                        return errors.getFieldErrors().stream().map(GlobalExceptionHandler::toDetail);
                    }
                    String name = result.getMethodParameter().getParameterName();
                    var requestParam = result.getMethodParameter()
                            .getParameterAnnotation(org.springframework.web.bind.annotation.RequestParam.class);
                    if (requestParam != null && !requestParam.name().isEmpty()) {
                        name = requestParam.name();
                    }
                    String field = name;
                    return result.getResolvableErrors().stream()
                            .map(error -> new FieldErrorDetail(field, error.getDefaultMessage()));
                })
                .sorted(Comparator.comparing(FieldErrorDetail::field))
                .toList();
        log.warn("Parameter validation failed count={}", details.size());
        return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE, details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex) {
        List<FieldErrorDetail> details = ex.getConstraintViolations().stream()
                .map(v -> new FieldErrorDetail(lastNode(v.getPropertyPath().toString()), v.getMessage()))
                .toList();
        log.warn("Constraint violation count={}", details.size());
        return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE, details);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadable(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof com.fasterxml.jackson.databind.exc.MismatchedInputException mismatch
                && !mismatch.getPath().isEmpty()) {
            String field = mismatch.getPath().stream()
                    .map(ref -> ref.getFieldName() != null ? ref.getFieldName() : "[" + ref.getIndex() + "]")
                    .collect(java.util.stream.Collectors.joining("."));
            log.warn("Unreadable field in request body field={}", field);
            return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE,
                    List.of(new FieldErrorDetail(field, "has an invalid value")));
        }
        log.warn("Malformed request body");
        return build(ErrorCode.VALIDATION_FAILED, "Request body is missing or malformed", List.of());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Parameter type mismatch name={}", ex.getName());
        return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE,
                List.of(new FieldErrorDetail(ex.getName(), "has an invalid value")));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(MissingServletRequestParameterException ex) {
        log.warn("Missing parameter name={}", ex.getParameterName());
        return build(ErrorCode.VALIDATION_FAILED, VALIDATION_MESSAGE,
                List.of(new FieldErrorDetail(ex.getParameterName(), "is required")));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaType(HttpMediaTypeNotSupportedException ex) {
        log.warn("Unsupported content type");
        return build(ErrorCode.VALIDATION_FAILED, "Content type must be application/json", List.of());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthentication(AuthenticationException ex) {
        log.warn("Authentication failed type={}", ex.getClass().getSimpleName());
        return build(ErrorCode.UNAUTHORIZED, "Authentication required", List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied");
        return build(ErrorCode.ACCESS_DENIED, "You are not allowed to perform this action", List.of());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("Concurrent modification entity={}", ex.getPersistentClassName());
        return build(ErrorCode.CONCURRENT_MODIFICATION,
                "Claim was changed by another user. Reload and try again.", List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException ex) {
        log.warn("No route path={}", ex.getResourcePath());
        return build(ErrorCode.NOT_FOUND, "Resource not found", List.of());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethod(HttpRequestMethodNotSupportedException ex) {
        log.warn("Method not allowed method={}", ex.getMethod());
        return build(ErrorCode.METHOD_NOT_ALLOWED, "Method " + ex.getMethod() + " is not allowed", List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return build(ErrorCode.INTERNAL_ERROR, INTERNAL_MESSAGE, List.of());
    }

    private static ResponseEntity<ApiResponse<Void>> build(ErrorCode code, String message,
                                                           List<FieldErrorDetail> details) {
        return ResponseEntity.status(code.status())
                .body(ApiResponse.failure(new ApiError(code, message, details)));
    }

    /** A type-conversion failure (e.g. "type": "BOAT") gets a short message instead of the converter text. */
    private static FieldErrorDetail toDetail(FieldError error) {
        String message = error.isBindingFailure() ? "has an invalid value" : error.getDefaultMessage();
        return new FieldErrorDetail(error.getField(), message);
    }

    private static String lastNode(String path) {
        int dot = path.lastIndexOf('.');
        return dot < 0 ? path : path.substring(dot + 1);
    }
}
