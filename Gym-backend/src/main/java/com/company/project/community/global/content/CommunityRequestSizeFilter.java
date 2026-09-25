package com.company.project.community.global.content;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * C9: request bodies on global Community endpoints are capped at 3 MB (room
 * for one 1.5 MB image base64-encoded plus text), rejected with 413 before
 * the JSON is parsed. Chunked requests with no Content-Length are counted as
 * they are read.
 */
@Component
public class CommunityRequestSizeFilter extends OncePerRequestFilter {

    public static final long MAX_BODY_BYTES = 3L * 1024 * 1024;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !(uri.startsWith("/api/mobile/community/") || uri.startsWith("/api/community/global/"));
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        long declared = request.getContentLengthLong();
        if (declared > MAX_BODY_BYTES) {
            reject(response);
            return;
        }
        try {
            chain.doFilter(declared >= 0 ? request : new LimitedRequest(request), response);
        } catch (BodyTooLargeException e) {
            if (!response.isCommitted()) {
                reject(response);
            }
        }
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":413,\"error\":\"PAYLOAD_TOO_LARGE\",\"message\":\"Request is larger than 3 MB\"}");
    }

    static final class BodyTooLargeException extends IOException {
        BodyTooLargeException() {
            super("Request body exceeds " + MAX_BODY_BYTES + " bytes");
        }
    }

    private static final class LimitedRequest extends HttpServletRequestWrapper {
        LimitedRequest(HttpServletRequest request) {
            super(request);
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            ServletInputStream in = super.getInputStream();
            return new ServletInputStream() {
                private long read;

                @Override
                public int read() throws IOException {
                    int b = in.read();
                    if (b >= 0 && ++read > MAX_BODY_BYTES) {
                        throw new BodyTooLargeException();
                    }
                    return b;
                }

                @Override
                public int read(byte[] buf, int off, int len) throws IOException {
                    int n = in.read(buf, off, len);
                    if (n > 0 && (read += n) > MAX_BODY_BYTES) {
                        throw new BodyTooLargeException();
                    }
                    return n;
                }

                @Override
                public boolean isFinished() { return in.isFinished(); }

                @Override
                public boolean isReady() { return in.isReady(); }

                @Override
                public void setReadListener(ReadListener listener) { in.setReadListener(listener); }
            };
        }
    }
}
