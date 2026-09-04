package com.company.project.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Phase 3 multi-tenant provisioning is the first @Async consumer in this codebase.
 * @EnableAsync (GymApplication) has run on Spring's default unbounded
 * SimpleAsyncTaskExecutor (a new OS thread per task, no reuse, no cap) since it was
 * added but never used - a real resource-exhaustion vector for a task that does
 * genuine blocking I/O (CREATE DATABASE, a full schema bootstrap, dozens of JDBC
 * inserts). This bean gives ONLY the tenant-provisioning job a small, named, bounded
 * pool; nothing else uses @Async yet, so nothing else is affected.
 *
 * Sizing: gym creation is an infrequent, admin-only, GYM_MANAGEMENT_CREATE-gated
 * action, not a high-QPS user-facing flow - core=2/max=4 comfortably covers realistic
 * concurrent-creation bursts without letting a scripted/malicious burst spawn
 * unbounded OS threads or Postgres connections. Queue capacity 20 gives headroom
 * before the executor's default AbortPolicy would reject excess submissions - a
 * rejection here should surface as a clear error on that one admin action, not
 * silently drop work.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "tenantProvisioningExecutor")
    public Executor tenantProvisioningExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("tenant-provision-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }
}
