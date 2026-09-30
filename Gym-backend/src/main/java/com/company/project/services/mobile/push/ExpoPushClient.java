package com.company.project.services.mobile.push;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sends push notifications through Expo's push service
 * (https://docs.expo.dev/push-notifications/sending-notifications/), which
 * forwards to FCM/APNs. Set mobile.push.expo.access-token only if the Expo
 * project has enhanced push security enabled.
 */
@Component
public class ExpoPushClient {

    private static final Logger log = LoggerFactory.getLogger(ExpoPushClient.class);

    private static final String SEND_URL = "https://exp.host/--/api/v2/push/send";
    // Expo's per-request message limit.
    private static final int MAX_BATCH = 100;

    private final RestClient restClient;

    public ExpoPushClient(@Value("${mobile.push.expo.access-token:}") String accessToken) {
        RestClient.Builder builder = RestClient.builder()
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE);
        if (accessToken != null && !accessToken.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + accessToken);
        }
        this.restClient = builder.build();
    }

    /** Outcome of a send: which tokens Expo accepted, and which are dead and should be forgotten. */
    public record SendResult(List<String> acceptedTokens, List<String> unregisteredTokens) {
        public boolean anyAccepted() { return !acceptedTokens.isEmpty(); }
    }

    /** Sends the same notification to every token. Never throws — failures are logged and reported as not accepted. */
    public SendResult send(List<String> tokens, String title, String body, Map<String, Object> data) {
        List<String> accepted = new ArrayList<>();
        List<String> unregistered = new ArrayList<>();

        for (int start = 0; start < tokens.size(); start += MAX_BATCH) {
            List<String> batch = tokens.subList(start, Math.min(start + MAX_BATCH, tokens.size()));
            List<Map<String, Object>> messages = batch.stream().map(token -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("to", token);
                m.put("title", title);
                m.put("body", body);
                m.put("data", data);
                m.put("sound", "default");
                return m;
            }).toList();

            try {
                JsonNode response = restClient.post()
                        .uri(SEND_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(messages)
                        .retrieve()
                        .body(JsonNode.class);

                // One ticket per message, in request order.
                JsonNode tickets = response != null ? response.path("data") : null;
                for (int i = 0; i < batch.size(); i++) {
                    JsonNode ticket = tickets != null ? tickets.path(i) : null;
                    if (ticket != null && "ok".equals(ticket.path("status").asText())) {
                        accepted.add(batch.get(i));
                    } else if (ticket != null && "DeviceNotRegistered".equals(ticket.path("details").path("error").asText())) {
                        unregistered.add(batch.get(i));
                    } else {
                        log.warn("Expo push rejected for a device: {}", ticket != null ? ticket.path("message").asText() : "no ticket");
                    }
                }
            } catch (Exception e) {
                log.error("Expo push send failed: {}", e.getMessage());
            }
        }
        return new SendResult(accepted, unregistered);
    }
}
