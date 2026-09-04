package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAsync
// Phase 1 (control-plane groundwork): a second persistence unit now exists
// (see controlplane.config.ControlPlaneDataSourceConfig). Spring Boot's implicit
// "scan everything under com.company.project" default can no longer be trusted to
// keep control-plane entities out of the PRIMARY EntityManagerFactory, so this
// pins the primary unit's entity scope explicitly (repository scanning and the
// DataSource/EntityManagerFactory/TransactionManager beans themselves are now
// explicit too, in config.PrimaryDataSourceConfig — see that class for why).
// Every existing entity already lives flat under this package, so this is a
// no-op for existing behavior — it only excludes the new controlplane subtree.
@EntityScan("com.company.project.entities")
public class GymApplication {

	public static void main(String[] args) {
		// Every LocalDateTime.now() call across the app (Receipt.transactionDate,
		// BaseEntity.createdAt/updatedAt, Attendance check-in/out, etc.) derives from
		// the JVM's default timezone. Pinning it to UTC here — rather than leaving it
		// to whatever the host machine happens to default to — makes "now" a real,
		// unambiguous UTC instant everywhere, which JacksonConfig then labels as such
		// (a genuine trailing "Z") so every client browser, in whatever timezone it's
		// in, converts it to its own correct local time on display. Must run before
		// SpringApplication.run so no timestamp is captured under the old default.
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(GymApplication.class, args);
	}

}
