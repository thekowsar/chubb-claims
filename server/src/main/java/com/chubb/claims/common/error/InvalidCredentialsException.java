package com.chubb.claims.common.error;

/** Login failed. The same message is used for an unknown user, a wrong password and a disabled user. */
public class InvalidCredentialsException extends ApiException {

    public InvalidCredentialsException() {
        super(ErrorCode.INVALID_CREDENTIALS, "Invalid username or password");
    }
}
