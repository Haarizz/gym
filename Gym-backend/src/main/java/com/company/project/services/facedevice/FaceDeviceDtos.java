package com.company.project.services.facedevice;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.OffsetDateTime;

/** GymOS › Face Device Configuration wire types (camelCase, like the other GymOS widgets' requests). */
public final class FaceDeviceDtos {

    private FaceDeviceDtos() {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record DeviceRequest(
            String name,
            String location,
            String middlewareUrl,
            String deviceKey,
            /** Blank on update keeps the saved secret. */
            String secret,
            Integer accessGroup,
            Integer verifyStyle,
            String timeZone,
            String photoBaseUrl,
            Boolean enabled,
            Boolean autoSync,
            /** Comma-separated; "" clears it, null leaves it unchanged. */
            String reportEmails) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Counts(
            int members,
            int allowedIn,
            int withPhoto,
            int enrolled,
            int noPhoto,
            int removed,
            int failed,
            int retry,
            int pending) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record DeviceResponse(
            Long id,
            Long branchId,
            String name,
            String location,
            String middlewareUrl,
            String deviceKey,
            boolean hasSecret,
            int accessGroup,
            int verifyStyle,
            String timeZone,
            String photoBaseUrl,
            boolean enabled,
            boolean autoSync,
            OffsetDateTime lastTestAt,
            Boolean lastTestOk,
            String lastTestMessage,
            OffsetDateTime lastSyncAt,
            String lastSyncMessage,
            boolean syncing,
            Counts counts,
            String reportEmails,
            /** Gym-local time the nightly report is sent, e.g. "23:30". */
            String reportTime,
            boolean mailConfigured,
            OffsetDateTime lastReportAt,
            String lastReportMessage,
            OffsetDateTime offlineSince) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record TestResult(boolean ok, String message, OffsetDateTime testedAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record ReportResult(String message) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record MemberStatus(
            Long memberId,
            String memberCode,
            String name,
            String membershipStatus,
            boolean allowedIn,
            boolean hasPhoto,
            String photoUrl,
            String state,
            boolean needsSync,
            String lastMessage,
            int attempts,
            OffsetDateTime lastAttemptAt,
            OffsetDateTime lastSuccessAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record MemberPage(int total, java.util.List<MemberStatus> items) {}
}
