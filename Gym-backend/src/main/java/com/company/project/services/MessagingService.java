package com.company.project.services;

import com.company.project.dto.*;
import com.company.project.entities.*;
import com.company.project.repositories.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessagingService {

    private final MemberRepository memberRepository;
    private final StaffRepository staffRepository;
    private final LeadRepository leadRepository;
    private final MessageTemplateRepository templateRepository;
    private final MessageGroupRepository groupRepository;
    private final MessageCampaignRepository campaignRepository;
    private final MessageRecipientRepository recipientRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @Value("${gym.name:GymBios Fitness}")
    private String gymName;

    public MessagingService(MemberRepository memberRepository,
                            StaffRepository staffRepository,
                            LeadRepository leadRepository,
                            MessageTemplateRepository templateRepository,
                            MessageGroupRepository groupRepository,
                            MessageCampaignRepository campaignRepository,
                            MessageRecipientRepository recipientRepository,
                            EmailService emailService,
                            NotificationService notificationService,
                            ObjectMapper objectMapper) {
        this.memberRepository = memberRepository;
        this.staffRepository = staffRepository;
        this.leadRepository = leadRepository;
        this.templateRepository = templateRepository;
        this.groupRepository = groupRepository;
        this.campaignRepository = campaignRepository;
        this.recipientRepository = recipientRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }

    public List<MessagingRecipientDTO> getRecipients(String type, String search) {
        String lowered = search == null ? "" : search.toLowerCase();
        List<MessagingRecipientDTO> results = new ArrayList<>();

        if (type == null || type.equals("all") || type.equals("member") || type.equals("members")) {
            for (Member member : memberRepository.findAll()) {
                if (matchesSearch(member.getName(), member.getEmail(), member.getPhone(), lowered)) {
                    results.add(toRecipientDTO(member));
                }
            }
        }

        if (type == null || type.equals("all") || type.equals("staff")) {
            for (Staff staff : staffRepository.findAll()) {
                if (matchesSearch(staff.getName(), staff.getEmail(), staff.getPhone(), lowered)) {
                    results.add(toRecipientDTO(staff));
                }
            }
        }

        if (type == null || type.equals("all") || type.equals("prospect") || type.equals("prospects")) {
            for (Lead lead : leadRepository.findAll()) {
                if ("converted".equalsIgnoreCase(lead.getStatus()) || "lost".equalsIgnoreCase(lead.getStatus())) continue;
                String fullName = (lead.getFirstName() != null ? lead.getFirstName() : "")
                        + (lead.getLastName() != null ? " " + lead.getLastName() : "");
                if (matchesSearch(fullName.trim(), lead.getEmail(), lead.getPhone(), lowered)) {
                    results.add(toRecipientDTO(lead));
                }
            }
        }

        return results;
    }

    public List<MessageTemplateResponseDTO> getTemplates() {
        return templateRepository.findAll().stream()
                .map(this::toTemplateResponse)
                .collect(Collectors.toList());
    }

    public MessageTemplateResponseDTO createTemplate(MessageTemplateRequestDTO request) {
        MessageTemplate template = new MessageTemplate();
        template.setName(request.getName());
        template.setCategory(request.getCategory());
        template.setSubject(request.getSubject());
        template.setContent(request.getContent());
        template.setType(request.getType());
        template.setVariables(request.getVariables());
        template.setActive(Boolean.TRUE.equals(request.getActive()));
        return toTemplateResponse(templateRepository.save(template));
    }

    public MessageTemplateResponseDTO updateTemplate(Long id, MessageTemplateRequestDTO request) {
        MessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Template not found"));
        template.setName(request.getName());
        template.setCategory(request.getCategory());
        template.setSubject(request.getSubject());
        template.setContent(request.getContent());
        template.setType(request.getType());
        template.setVariables(request.getVariables());
        template.setActive(Boolean.TRUE.equals(request.getActive()));
        return toTemplateResponse(templateRepository.save(template));
    }

    public void deleteTemplate(Long id) {
        templateRepository.deleteById(id);
    }

    public List<MessageGroupResponseDTO> getGroups() {
        return groupRepository.findAll().stream()
                .map(this::toGroupResponse)
                .collect(Collectors.toList());
    }

    public MessageGroupResponseDTO createGroup(MessageGroupRequestDTO request) {
        MessageGroup group = new MessageGroup();
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setSystem(Boolean.TRUE.equals(request.getSystem()));

        List<String> members = request.getMembers() == null ? new ArrayList<>() : new ArrayList<>(request.getMembers());
        if ((members == null || members.isEmpty()) && request.getCriteria() != null) {
            members = resolveMembersFromCriteria(request.getCriteria());
        }
        group.setMembers(members);
        group.setMemberCount(members.size());
        if (request.getCriteria() != null) {
            group.setCriteriaJson(toJson(request.getCriteria()));
        }
        return toGroupResponse(groupRepository.save(group));
    }

    public MessageGroupResponseDTO updateGroup(Long id, MessageGroupRequestDTO request) {
        MessageGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setSystem(Boolean.TRUE.equals(request.getSystem()));
        group.setCriteriaJson(request.getCriteria() != null ? toJson(request.getCriteria()) : null);
        List<String> members = request.getMembers() == null ? new ArrayList<>() : new ArrayList<>(request.getMembers());
        if ((members == null || members.isEmpty()) && request.getCriteria() != null) {
            members = resolveMembersFromCriteria(request.getCriteria());
        }
        group.setMembers(members);
        group.setMemberCount(members.size());
        return toGroupResponse(groupRepository.save(group));
    }

    public void deleteGroup(Long id) {
        groupRepository.deleteById(id);
    }

    public List<MessageHistoryDTO> getHistory() {
        List<MessageCampaign> campaigns = campaignRepository.findTop200ByOrderByCreatedAtDesc();
        return campaigns.stream().map(this::toHistoryDTO).collect(Collectors.toList());
    }

    // Member-scoped view for the member analytics page — a campaign has no direct
    // member FK (it can target members/staff/prospects at once), so we resolve via
    // the recipient rows instead: find every campaign this member was sent to, then
    // reuse the same history mapping used for the unscoped list.
    public List<MessageHistoryDTO> getMemberHistory(Long memberId) {
        List<MessageRecipient> recipients = recipientRepository.findByRecipientTypeAndRecipientId(
                "member", String.valueOf(memberId));
        Set<Long> campaignIds = recipients.stream()
                .map(r -> r.getCampaign().getId())
                .collect(Collectors.toSet());
        if (campaignIds.isEmpty()) return List.of();

        return campaignRepository.findAllById(campaignIds).stream()
                .sorted(Comparator.comparing(MessageCampaign::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toHistoryDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteHistory(Long campaignId) {
        recipientRepository.deleteByCampaignId(campaignId);
        campaignRepository.deleteById(campaignId);
    }

    public MessagingAnalyticsDTO getAnalytics() {
        List<MessageCampaign> campaigns = campaignRepository.findTop200ByOrderByCreatedAtDesc();
        LocalDate today = LocalDate.now();
        int sentToday = (int) campaigns.stream()
                .filter(c -> c.getSentAt() != null && c.getSentAt().toLocalDate().isEqual(today))
                .count();
        int scheduled = (int) campaigns.stream().filter(c -> "scheduled".equalsIgnoreCase(c.getStatus())).count();
        int totalRecipients = campaigns.stream().map(MessageCampaign::getRecipientCount).filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
        double avgOpen = campaigns.isEmpty() ? 0.0 : campaigns.stream().mapToDouble(c -> c.getOpenRate() == null ? 0.0 : c.getOpenRate()).average().orElse(0.0);
        double avgClick = campaigns.isEmpty() ? 0.0 : campaigns.stream().mapToDouble(c -> c.getClickRate() == null ? 0.0 : c.getClickRate()).average().orElse(0.0);
        double totalCost = campaigns.stream().map(c -> c.getCost() == null ? 0.0 : c.getCost().doubleValue()).mapToDouble(Double::doubleValue).sum();

        MessagingAnalyticsDTO dto = new MessagingAnalyticsDTO();
        dto.setSentToday(sentToday);
        dto.setScheduledMessages(scheduled);
        dto.setTotalRecipients(totalRecipients);
        dto.setOpenRate(avgOpen);
        dto.setClickRate(avgClick);
        dto.setTotalCost(totalCost);
        return dto;
    }

    @Transactional
    public SendMessageResponseDTO sendMessage(SendMessageRequestDTO request) {
        if (!StringUtils.hasText(request.getType())) {
            throw new RuntimeException("Message type is required");
        }
        if (!StringUtils.hasText(request.getContent())) {
            throw new RuntimeException("Message content is required");
        }
        List<RecipientInfo> recipients = buildRecipients(request);
        if (recipients.isEmpty()) {
            throw new RuntimeException("No valid recipients found");
        }

        MessageCampaign campaign = new MessageCampaign();
        campaign.setType(request.getType());
        campaign.setSubject(StringUtils.hasText(request.getSubject()) ? request.getSubject() : "(No Subject)");
        campaign.setContent(request.getContent());
        campaign.setTemplateId(request.getTemplateId());
        campaign.setPersonalization(Boolean.TRUE.equals(request.getPersonalization()));
        if (request.getTemplateId() != null) {
            templateRepository.findById(request.getTemplateId()).ifPresent(template -> {
                template.setUsageCount(template.getUsageCount() == null ? 1 : template.getUsageCount() + 1);
                templateRepository.save(template);
            });
        }

        LocalDateTime scheduledAt = request.getScheduledAt();
        boolean isScheduled = scheduledAt != null && scheduledAt.isAfter(LocalDateTime.now());
        campaign.setStatus(isScheduled ? "scheduled" : "sending");
        campaign.setScheduledAt(isScheduled ? scheduledAt : null);
        campaign.setRecipientCount(recipients.size());
        campaignRepository.save(campaign);

        List<MessageRecipient> messageRecipients = new ArrayList<>();
        for (RecipientInfo info : recipients) {
            MessageRecipient recipient = new MessageRecipient();
            recipient.setCampaign(campaign);
            recipient.setRecipientId(info.id);
            recipient.setRecipientType(info.type);
            recipient.setName(info.name);
            recipient.setEmail(info.email);
            recipient.setPhone(info.phone);
            recipient.setMembershipPlan(info.membershipPlan);
            recipient.setMembershipStatus(info.membershipStatus);
            recipient.setLocation(info.location);
            recipient.setJoinDate(info.joinDate);
            recipient.setExpiryDate(info.expiryDate);
            recipient.setStatus(isScheduled ? "scheduled" : "sending");
            messageRecipients.add(recipient);
        }
        recipientRepository.saveAll(messageRecipients);

        if (!isScheduled) {
            processCampaignSend(campaign, messageRecipients);
        }

        SendMessageResponseDTO response = new SendMessageResponseDTO();
        response.setCampaignId(String.valueOf(campaign.getId()));
        response.setStatus(campaign.getStatus());
        response.setRecipientCount(campaign.getRecipientCount());
        return response;
    }

    @Transactional
    public void processScheduledCampaign(MessageCampaign campaign) {
        if (!"scheduled".equalsIgnoreCase(campaign.getStatus())) {
            return;
        }
        campaign.setStatus("sending");
        campaignRepository.save(campaign);
        List<MessageRecipient> recipients = recipientRepository.findByCampaignId(campaign.getId());
        processCampaignSend(campaign, recipients);
    }

    private void processCampaignSend(MessageCampaign campaign, List<MessageRecipient> recipients) {
        int sentCount = 0;
        int failedCount = 0;
        LocalDateTime now = LocalDateTime.now();

        for (MessageRecipient recipient : recipients) {
            RecipientInfo info = new RecipientInfo(recipient);
            String content = campaign.isPersonalization() ? applyPersonalization(campaign.getContent(), info) : campaign.getContent();
            String subject = campaign.getSubject();

            try {
                String providerId = sendToProvider(campaign.getType(), info, subject, content);
                recipient.setStatus("sent");
                recipient.setProviderMessageId(providerId);
                recipient.setSentAt(now);
                sentCount++;
            } catch (Exception ex) {
                recipient.setStatus("failed");
                recipient.setErrorMessage(ex.getMessage());
                failedCount++;
            }
        }

        recipientRepository.saveAll(recipients);

        campaign.setDeliveredCount(sentCount);
        campaign.setFailedCount(failedCount);
        campaign.setSentAt(now);
        if (failedCount == 0) {
            campaign.setStatus("sent");
        } else if (sentCount == 0) {
            campaign.setStatus("failed");
        } else {
            campaign.setStatus("partial");
        }
        campaignRepository.save(campaign);
    }

    private String sendToProvider(String type, RecipientInfo info, String subject, String content) {
        switch (type) {
            case "email":
                if (!StringUtils.hasText(info.email)) {
                    throw new RuntimeException("Recipient email missing");
                }
                String html = content.replace("\n", "<br/>");
                emailService.sendEmail(info.email, subject, html);
                return "email";
            case "sms":
                if (!StringUtils.hasText(info.phone)) {
                    throw new RuntimeException("Recipient phone missing");
                }
                return "sms-client";
            case "whatsapp":
                if (!StringUtils.hasText(info.phone)) {
                    throw new RuntimeException("Recipient phone missing");
                }
                return "whatsapp-client";
            case "in-app": {
                Long userId = resolveUserId(info);
                if (userId == null) {
                    throw new RuntimeException("Recipient has no linked app account");
                }
                notificationService.notifyUser(userId, StringUtils.hasText(subject) ? subject : "New Message",
                        content, "INFO", "MEDIUM", "MESSAGING", null, "/messaging",
                        "MESSAGE_" + info.type + "_" + info.id + "_" + System.currentTimeMillis());
                return "in-app";
            }
            default:
                throw new RuntimeException("Unsupported message type: " + type);
        }
    }

    private List<RecipientInfo> buildRecipients(SendMessageRequestDTO request) {
        Map<String, RecipientInfo> unique = new LinkedHashMap<>();

        if (request.getRecipients() != null) {
            for (MessageRecipientSelectionDTO selection : request.getRecipients()) {
                if (!StringUtils.hasText(selection.getId()) || !StringUtils.hasText(selection.getType())) continue;
                addRecipient(unique, selection.getType(), selection.getId());
            }
        }

        if (request.getGroupIds() != null) {
            for (String groupId : request.getGroupIds()) {
                if (!StringUtils.hasText(groupId)) continue;
                groupRepository.findById(Long.parseLong(groupId)).ifPresent(group -> {
                    for (String memberId : group.getMembers()) {
                        addRecipient(unique, "member", memberId);
                    }
                });
            }
        }

        return new ArrayList<>(unique.values());
    }

    /** Look up the app account linked to a recipient, for in-app delivery. */
    private Long resolveUserId(RecipientInfo info) {
        try {
            if ("member".equals(info.type)) {
                return memberRepository.findById(Long.parseLong(info.id)).map(Member::getUserId).orElse(null);
            } else if ("staff".equals(info.type)) {
                return staffRepository.findById(Long.parseLong(info.id)).map(Staff::getUserId).orElse(null);
            }
        } catch (NumberFormatException e) {
            // ignore — falls through to null below
        }
        return null;
    }

    private void addRecipient(Map<String, RecipientInfo> map, String type, String id) {
        String key = type + ":" + id;
        if (map.containsKey(key)) return;
        if ("member".equals(type) || "members".equals(type)) {
            memberRepository.findById(Long.parseLong(id)).ifPresent(member -> map.put(key, RecipientInfo.from(member)));
        } else if ("staff".equals(type)) {
            staffRepository.findById(Long.parseLong(id)).ifPresent(staff -> map.put(key, RecipientInfo.from(staff)));
        } else if ("prospect".equals(type) || "prospects".equals(type)) {
            leadRepository.findById(Long.parseLong(id)).ifPresent(lead -> map.put(key, RecipientInfo.from(lead)));
        }
    }

    private String applyPersonalization(String content, RecipientInfo recipient) {
        String fullName = recipient.name == null ? "" : recipient.name.trim();
        String firstName = fullName.isEmpty() ? "" : fullName.split(" ")[0];
        String lastName = fullName.isEmpty() ? "" : fullName.replaceFirst("^\\S+\\s*", "");
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
        String joinDate = recipient.joinDate == null ? "N/A" : recipient.joinDate.format(formatter);
        String expiryDate = recipient.expiryDate == null ? "N/A" : recipient.expiryDate.format(formatter);
        String phone = recipient.phone == null ? "" : recipient.phone;
        String membershipStatus = recipient.membershipStatus == null ? "N/A" : recipient.membershipStatus;
        String membershipPlan = recipient.membershipPlan == null ? "N/A" : recipient.membershipPlan;
        String location = recipient.location == null ? "Main Branch" : recipient.location;
        return content
                .replace("{FirstName}", firstName)
                .replace("{LastName}", lastName)
                .replace("{FullName}", fullName)
                .replace("{Email}", recipient.email == null ? "" : recipient.email)
                .replace("{Phone}", phone)
                .replace("{MembershipPlan}", membershipPlan)
                .replace("{MembershipStatus}", membershipStatus)
                .replace("{GymName}", gymName)
                .replace("{Location}", location)
                .replace("{JoinDate}", joinDate)
                .replace("{ExpiryDate}", expiryDate)
                .replace("{Amount}", "")
                .replace("{DueDate}", "")
                .replace("{ClassName}", "")
                .replace("{TrainerName}", "")
                .replace("{ClassTime}", "");
    }

    private boolean matchesSearch(String name, String email, String phone, String lowered) {
        if (!StringUtils.hasText(lowered)) return true;
        return (name != null && name.toLowerCase().contains(lowered))
                || (email != null && email.toLowerCase().contains(lowered))
                || (phone != null && phone.contains(lowered));
    }

    private MessagingRecipientDTO toRecipientDTO(Member member) {
        MessagingRecipientDTO dto = new MessagingRecipientDTO();
        dto.setId(String.valueOf(member.getId()));
        dto.setName(member.getName());
        dto.setEmail(member.getEmail());
        dto.setPhone(member.getPhone());
        dto.setType("member");
        dto.setMembershipStatus(member.getMembershipStatus());
        dto.setMembershipPlan(member.getMembershipPlan());
        dto.setMembershipExpiry(member.getExpiryDate());
        dto.setJoinDate(member.getJoinDate());
        dto.setPhotoUrl(member.getPhotoUrl());
        dto.setIsVip(false);
        dto.setTags(new ArrayList<>());
        return dto;
    }

    private MessagingRecipientDTO toRecipientDTO(Staff staff) {
        MessagingRecipientDTO dto = new MessagingRecipientDTO();
        dto.setId(String.valueOf(staff.getId()));
        dto.setName(staff.getName());
        dto.setEmail(staff.getEmail());
        dto.setPhone(staff.getPhone());
        dto.setType("staff");
        dto.setJoinDate(staff.getJoinDate() == null ? null : staff.getJoinDate().atStartOfDay());
        dto.setLocation(staff.getBranch());
        dto.setPhotoUrl(staff.getPhotoUrl());
        dto.setIsVip(false);
        dto.setTags(new ArrayList<>());
        return dto;
    }

    private MessagingRecipientDTO toRecipientDTO(Lead lead) {
        MessagingRecipientDTO dto = new MessagingRecipientDTO();
        dto.setId(String.valueOf(lead.getId()));
        dto.setName(((lead.getFirstName() != null ? lead.getFirstName() : "")
                + (lead.getLastName() != null ? " " + lead.getLastName() : "")).trim());
        dto.setEmail(lead.getEmail());
        dto.setPhone(lead.getPhone());
        dto.setType("prospect");
        dto.setMembershipStatus(lead.getStatus());
        dto.setIsVip(false);
        dto.setTags(lead.getTags() != null ? new ArrayList<>(lead.getTags()) : new ArrayList<>());
        return dto;
    }

    private MessageTemplateResponseDTO toTemplateResponse(MessageTemplate template) {
        MessageTemplateResponseDTO dto = new MessageTemplateResponseDTO();
        dto.setId(String.valueOf(template.getId()));
        dto.setName(template.getName());
        dto.setCategory(template.getCategory());
        dto.setSubject(template.getSubject());
        dto.setContent(template.getContent());
        dto.setType(template.getType());
        dto.setVariables(template.getVariables());
        dto.setUsageCount(template.getUsageCount());
        dto.setCreatedBy(template.getCreatedBy());
        dto.setCreatedDate(template.getCreatedAt());
        dto.setActive(template.isActive());
        return dto;
    }

    private MessageGroupResponseDTO toGroupResponse(MessageGroup group) {
        MessageGroupResponseDTO dto = new MessageGroupResponseDTO();
        dto.setId(String.valueOf(group.getId()));
        dto.setName(group.getName());
        dto.setDescription(group.getDescription());
        dto.setMemberCount(group.getMemberCount());
        dto.setMembers(group.getMembers());
        dto.setCriteria(fromJson(group.getCriteriaJson()));
        dto.setCreatedBy(group.getCreatedBy());
        dto.setCreatedDate(group.getCreatedAt());
        dto.setSystem(group.isSystem());
        return dto;
    }

    private MessageHistoryDTO toHistoryDTO(MessageCampaign campaign) {
        MessageHistoryDTO dto = new MessageHistoryDTO();
        dto.setId(String.valueOf(campaign.getId()));
        dto.setSubject(campaign.getSubject());
        dto.setContent(campaign.getContent());
        dto.setType(campaign.getType());
        dto.setStatus(campaign.getStatus());
        dto.setRecipientCount(campaign.getRecipientCount());
        dto.setSentDate(campaign.getSentAt());
        dto.setScheduledDate(campaign.getScheduledAt());
        dto.setOpenRate(campaign.getOpenRate());
        dto.setClickRate(campaign.getClickRate());
        dto.setDeliveryRate(campaign.getRecipientCount() == null || campaign.getRecipientCount() == 0
                ? 0.0
                : (campaign.getDeliveredCount() == null ? 0.0 : (campaign.getDeliveredCount() * 100.0 / campaign.getRecipientCount())));
        dto.setSentBy(campaign.getCreatedBy());
        dto.setCost(campaign.getCost() == null ? 0.0 : campaign.getCost().doubleValue());
        List<String> recipientIds = recipientRepository.findByCampaignId(campaign.getId())
                .stream()
                .map(MessageRecipient::getRecipientId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        dto.setRecipients(recipientIds);
        return dto;
    }

    private List<String> resolveMembersFromCriteria(Object criteria) {
        Map<String, Object> map = objectMapper.convertValue(criteria, new TypeReference<Map<String, Object>>() {});
        List<Member> members = memberRepository.findAll();

        if (map.containsKey("membershipStatus")) {
            List<String> statuses = toStringList(map.get("membershipStatus"));
            members = members.stream()
                    .filter(m -> statuses.contains(m.getMembershipStatus()))
                    .collect(Collectors.toList());
        }
        if (map.containsKey("membershipPlans")) {
            List<String> plans = toStringList(map.get("membershipPlans"));
            members = members.stream()
                    .filter(m -> plans.contains(m.getMembershipPlan()))
                    .collect(Collectors.toList());
        }
        if (map.containsKey("joinDateRange")) {
            Map<String, Object> range = objectMapper.convertValue(map.get("joinDateRange"), new TypeReference<Map<String, Object>>() {});
            LocalDateTime start = parseDateTime(range.get("start"));
            LocalDateTime end = parseDateTime(range.get("end"));
            if (start != null && end != null) {
                members = members.stream()
                        .filter(m -> m.getJoinDate() != null && !m.getJoinDate().isBefore(start) && !m.getJoinDate().isAfter(end))
                        .collect(Collectors.toList());
            }
        }

        return members.stream().map(m -> String.valueOf(m.getId())).collect(Collectors.toList());
    }

    private LocalDateTime parseDateTime(Object value) {
        if (value == null) return null;
        try {
            return LocalDateTime.parse(value.toString());
        } catch (Exception ignored) {
            try {
                LocalDate date = LocalDate.parse(value.toString());
                return LocalDateTime.of(date, LocalTime.MIN);
            } catch (Exception ignoredAgain) {
                return null;
            }
        }
    }

    private List<String> toStringList(Object value) {
        if (value == null) return new ArrayList<>();
        return objectMapper.convertValue(value, new TypeReference<List<String>>() {});
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }

    private Object fromJson(String value) {
        if (!StringUtils.hasText(value)) return null;
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return null;
        }
    }

    private static class RecipientInfo {
        private final String id;
        private final String type;
        private final String name;
        private final String email;
        private final String phone;
        private final String membershipPlan;
        private final String membershipStatus;
        private final String location;
        private final java.time.LocalDateTime joinDate;
        private final java.time.LocalDateTime expiryDate;

        private RecipientInfo(String id, String type, String name, String email, String phone,
                              String membershipPlan, String membershipStatus, String location,
                              java.time.LocalDateTime joinDate, java.time.LocalDateTime expiryDate) {
            this.id = id;
            this.type = type;
            this.name = name;
            this.email = email;
            this.phone = phone;
            this.membershipPlan = membershipPlan;
            this.membershipStatus = membershipStatus;
            this.location = location;
            this.joinDate = joinDate;
            this.expiryDate = expiryDate;
        }

        private RecipientInfo(MessageRecipient recipient) {
            this.id = recipient.getRecipientId();
            this.type = recipient.getRecipientType();
            this.name = recipient.getName();
            this.email = recipient.getEmail();
            this.phone = recipient.getPhone();
            this.membershipPlan = recipient.getMembershipPlan();
            this.membershipStatus = recipient.getMembershipStatus();
            this.location = recipient.getLocation();
            this.joinDate = recipient.getJoinDate();
            this.expiryDate = recipient.getExpiryDate();
        }

        static RecipientInfo from(Member member) {
            return new RecipientInfo(
                    String.valueOf(member.getId()),
                    "member",
                    member.getName(),
                    member.getEmail(),
                    member.getPhone(),
                    member.getMembershipPlan(),
                    member.getMembershipStatus(),
                    null,
                    member.getJoinDate(),
                    member.getExpiryDate()
            );
        }

        static RecipientInfo from(Lead lead) {
            String fullName = ((lead.getFirstName() != null ? lead.getFirstName() : "")
                    + (lead.getLastName() != null ? " " + lead.getLastName() : "")).trim();
            return new RecipientInfo(
                    String.valueOf(lead.getId()),
                    "prospect",
                    fullName,
                    lead.getEmail(),
                    lead.getPhone(),
                    null,
                    lead.getStatus(),
                    null,
                    null,
                    null
            );
        }

        static RecipientInfo from(Staff staff) {
            return new RecipientInfo(
                    String.valueOf(staff.getId()),
                    "staff",
                    staff.getName(),
                    staff.getEmail(),
                    staff.getPhone(),
                    null,
                    staff.getStatus(),
                    staff.getBranch(),
                    staff.getJoinDate() == null ? null : staff.getJoinDate().atStartOfDay(),
                    null
            );
        }
    }
}
