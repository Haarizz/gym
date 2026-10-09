package com.company.project.community.global;

import com.company.project.community.global.identity.CommunityActor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.function.Supplier;

/**
 * One structured log line per Community operation, so every request is
 * traceable to actor kind/ID, gym, operation, target and result — without
 * logging any post or comment text. Refusals are logged with their code
 * (403s, 404s, disabled features), unexpected failures at ERROR.
 *
 * Log format (logger "community.audit"):
 *   community op=POST_CREATE surface=MOBILE actor=GLOBAL:42 gym=gym-a target=post:1000000123 result=OK ms=18
 */
@Component
public class CommunityAuditLog {

    private static final Logger LOG = LoggerFactory.getLogger("community.audit");

    public <T> T run(String operation, String surface, CommunityActor actor, String gym, String target, Supplier<T> work) {
        long start = System.nanoTime();
        try {
            T result = work.get();
            log("OK", operation, surface, actor, gym, target, start, null);
            return result;
        } catch (CommunityException e) {
            log(e.getCode(), operation, surface, actor, gym, target, start, e.getStatus().value());
            throw e;
        } catch (RuntimeException e) {
            LOG.error("community op={} surface={} actor={} gym={} target={} result=ERROR ms={} error={}",
                    operation, surface, describe(actor), gym, target, elapsed(start), e.getClass().getSimpleName());
            throw e;
        }
    }

    private static void log(String result, String operation, String surface, CommunityActor actor, String gym,
                            String target, long start, Integer status) {
        LOG.info("community op={} surface={} actor={} gym={} target={} result={}{} ms={}",
                operation, surface, describe(actor), gym, target, result, status == null ? "" : " status=" + status,
                elapsed(start));
    }

    private static String describe(CommunityActor actor) {
        return actor == null ? "anonymous" : actor.describe();
    }

    private static long elapsed(long start) {
        return (System.nanoTime() - start) / 1_000_000;
    }
}
