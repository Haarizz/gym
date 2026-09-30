package com.company.project.services.mobile.push;

import com.company.project.automation.handlers.OutstandingBalanceHandler;
import com.company.project.entities.AutomationWorkflow;
import com.company.project.entities.Currency;
import com.company.project.entities.Member;
import com.company.project.entities.MobilePushDelivery;
import com.company.project.entities.MobilePushToken;
import com.company.project.repositories.AutomationExecutionLogRepository;
import com.company.project.repositories.AutomationWorkflowRepository;
import com.company.project.repositories.mobile.push.MobilePushDeliveryRepository;
import com.company.project.repositories.mobile.push.MobilePushTokenRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Push delivery for "outstanding_balance" automation workflows whose action is
 * "send_push" — a channel AutomationExecutorService accepts from the UI but
 * doesn't deliver itself (it only executes send_in_app).
 *
 * The executor still decides WHEN a reminder is due: a push only goes out on a
 * day the executor ran the workflow successfully, so the workflow's configured
 * frequency is the cooldown. On such a day each qualifying member is pushed at
 * most once (mobile_push_deliveries), and qualification is re-checked at send
 * time, so a balance settled since the executor ran is never reminded.
 *
 * Like the executor, this runs without a tenant context (primary database).
 */
@Service
public class OutstandingBalancePushDispatcher {

    private static final Logger log = LoggerFactory.getLogger(OutstandingBalancePushDispatcher.class);

    // Same single-company constant as AutomationExecutorService.
    private static final Long COMPANY_ID = 1L;
    private static final String ACTION_SEND_PUSH = "send_push";

    private static final String DEFAULT_TITLE = "Outstanding Membership Payment";
    private static final String DEFAULT_BODY = "You have {OutstandingAmount} remaining on your membership.";

    private final AutomationWorkflowRepository workflowRepository;
    private final AutomationExecutionLogRepository logRepository;
    private final OutstandingBalanceHandler handler;
    private final MobilePushTokenRepository pushTokenRepository;
    private final MobilePushDeliveryRepository deliveryRepository;
    private final ExpoPushClient expoPushClient;
    private final TransactionTemplate isolatedTx;

    @PersistenceContext
    private EntityManager entityManager;

    public OutstandingBalancePushDispatcher(AutomationWorkflowRepository workflowRepository,
                                            AutomationExecutionLogRepository logRepository,
                                            OutstandingBalanceHandler handler,
                                            MobilePushTokenRepository pushTokenRepository,
                                            MobilePushDeliveryRepository deliveryRepository,
                                            ExpoPushClient expoPushClient,
                                            PlatformTransactionManager transactionManager) {
        this.workflowRepository = workflowRepository;
        this.logRepository = logRepository;
        this.handler = handler;
        this.pushTokenRepository = pushTokenRepository;
        this.deliveryRepository = deliveryRepository;
        this.expoPushClient = expoPushClient;
        this.isolatedTx = new TransactionTemplate(transactionManager);
        this.isolatedTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Scheduled(fixedDelayString = "${mobile.push.outstanding-balance.dispatch-interval-ms:900000}",
               initialDelayString = "${mobile.push.outstanding-balance.initial-delay-ms:120000}")
    public void dispatch() {
        List<AutomationWorkflow> workflows = workflowRepository.findByCompanyIdAndStatusAndTriggerType(
                COMPANY_ID, "active", OutstandingBalanceHandler.TRIGGER_TYPE);

        LocalDate today = LocalDate.now();
        for (AutomationWorkflow workflow : workflows) {
            if (!ACTION_SEND_PUSH.equals(workflow.getActionType())) continue;
            try {
                LocalDateTime startOfDay = today.atStartOfDay();
                if (!logRepository.hasSuccessfulRunToday(workflow.getId(), startOfDay, startOfDay.plusDays(1))) {
                    continue; // not due today — the workflow's frequency is the cooldown
                }
                dispatchWorkflow(workflow, today);
            } catch (Exception e) {
                log.error("Outstanding-balance push failed for workflow {}: {}", workflow.getId(), e.getMessage(), e);
            }
        }
    }

    private void dispatchWorkflow(AutomationWorkflow workflow, LocalDate today) {
        String currencySymbol = baseCurrencySymbol();

        // Fresh query: anyone who has paid since the executor ran no longer qualifies.
        for (Member member : handler.findQualifyingMembers(workflow)) {
            List<String> tokens = pushTokenRepository.findByMemberId(member.getId()).stream()
                    .map(MobilePushToken::getExpoPushToken)
                    .toList();
            if (tokens.isEmpty()) continue;

            String deliveryKey = "OUTSTANDING_BALANCE_W" + workflow.getId() + "_M" + member.getId() + "_" + today;
            if (!claimDelivery(deliveryKey, member.getId(), workflow.getId())) continue;

            String title = interpolate(blankTo(workflow.getActionTitle(), DEFAULT_TITLE), member, currencySymbol);
            String body = interpolate(blankTo(workflow.getActionContent(), DEFAULT_BODY), member, currencySymbol);
            // Expo Router path of the member payment screen — the app opens it on tap.
            Map<String, Object> data = Map.of(
                    "type", "outstanding_balance",
                    "membershipId", member.getId(),
                    "url", "/membership-payment/" + member.getId());

            ExpoPushClient.SendResult result = expoPushClient.send(tokens, title, body, data);
            if (!result.unregisteredTokens().isEmpty()) {
                isolatedTx.executeWithoutResult(s -> pushTokenRepository.deleteByExpoPushTokenIn(result.unregisteredTokens()));
            }
            if (!result.anyAccepted()) {
                // Nothing reached a device — release the claim so a later run today can retry.
                isolatedTx.executeWithoutResult(s -> deliveryRepository.deleteByDeliveryKey(deliveryKey));
            }
        }
    }

    /** Records the delivery before sending, so concurrent/overlapping runs can't both push it. */
    private boolean claimDelivery(String deliveryKey, Long memberId, Long workflowId) {
        if (deliveryRepository.existsByDeliveryKey(deliveryKey)) return false;
        try {
            isolatedTx.executeWithoutResult(s ->
                    deliveryRepository.saveAndFlush(new MobilePushDelivery(deliveryKey, memberId, workflowId)));
            return true;
        } catch (DataIntegrityViolationException e) {
            return false; // another run claimed it first
        }
    }

    // ── Merge fields — the executor's set plus {OutstandingAmount} ────────────

    private String interpolate(String template, Member member, String currencySymbol) {
        return template
                .replace("{FirstName}", firstName(member.getName()))
                .replace("{FullName}", member.getName() != null ? member.getName() : "")
                .replace("{MembershipPlan}", member.getMembershipPlan() != null ? member.getMembershipPlan() : "")
                .replace("{MembershipType}", member.getMembershipType() != null ? member.getMembershipType() : "")
                .replace("{ExpiryDate}", member.getExpiryDate() != null
                        ? member.getExpiryDate().toLocalDate().toString() : "")
                .replace("{OutstandingAmount}", formatAmount(member.getOutstandingBalance(), currencySymbol));
    }

    private static String formatAmount(BigDecimal amount, String currencySymbol) {
        String formatted = new DecimalFormat("#,##0.##").format(amount != null ? amount : BigDecimal.ZERO);
        return currencySymbol != null && !currencySymbol.isBlank() ? currencySymbol + formatted : formatted;
    }

    private static String firstName(String fullName) {
        if (fullName == null || fullName.isBlank()) return "";
        return fullName.split("\\s+")[0];
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String baseCurrencySymbol() {
        return entityManager.createQuery(
                        "SELECT c FROM Currency c WHERE c.baseCurrency = true AND c.active = true", Currency.class)
                .setMaxResults(1)
                .getResultStream()
                .findFirst()
                .map(Currency::getSymbol)
                .orElse(null);
    }
}
