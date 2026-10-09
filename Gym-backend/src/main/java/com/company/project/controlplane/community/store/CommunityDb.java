package com.company.project.controlplane.community.store;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.util.function.Supplier;

/**
 * JDBC access to the global Community store in the control-plane database.
 *
 * Plain SQL (not JPA) because the store relies on INSERT ... ON CONFLICT,
 * atomic counter updates and keyset pagination, and the control plane runs
 * Hibernate with ddl-auto=validate. Transactions use a local
 * DataSourceTransactionManager that is deliberately NOT a Spring bean, so it
 * can't change how existing @Transactional methods pick their manager.
 */
@Component
public class CommunityDb {

    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate tx;

    @Autowired
    public CommunityDb(@Qualifier("controlPlaneDataSource") DataSource controlPlaneDataSource) {
        this.jdbc = new NamedParameterJdbcTemplate(controlPlaneDataSource);
        this.tx = new TransactionTemplate(new DataSourceTransactionManager(controlPlaneDataSource));
    }

    public NamedParameterJdbcTemplate jdbc() {
        return jdbc;
    }

    public <T> T inTransaction(Supplier<T> work) {
        return tx.execute(status -> work.get());
    }

    public void inTransaction(Runnable work) {
        tx.executeWithoutResult(status -> work.run());
    }
}
