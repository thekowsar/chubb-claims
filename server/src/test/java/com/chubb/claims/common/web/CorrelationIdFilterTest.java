package com.chubb.claims.common.web;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {

    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @Test
    void echoesValidIncomingIdAndPutsItInMdcDuringTheRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/menu");
        request.addHeader(CorrelationIdFilter.HEADER, "abc-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> seenInMdc = new AtomicReference<>();

        filter.doFilter(request, response, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                seenInMdc.set(MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        });

        assertThat(response.getHeader(CorrelationIdFilter.HEADER)).isEqualTo("abc-123");
        assertThat(seenInMdc.get()).isEqualTo("abc-123");
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void generatesUuidWhenHeaderMissing() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest("GET", "/api/menu"), response, new MockFilterChain());

        String id = response.getHeader(CorrelationIdFilter.HEADER);
        assertThat(UUID.fromString(id)).isNotNull();
    }

    @Test
    void replacesUnsafeOrTooLongIds() {
        assertThat(CorrelationIdFilter.resolve("bad id\nwith newline")).isNotEqualTo("bad id\nwith newline");
        assertThat(CorrelationIdFilter.resolve("x".repeat(65))).hasSize(36);
        assertThat(CorrelationIdFilter.resolve("x".repeat(64))).isEqualTo("x".repeat(64));
    }
}
