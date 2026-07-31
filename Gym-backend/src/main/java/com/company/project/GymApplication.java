package com.company.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EnableAsync
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
