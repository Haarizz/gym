# Member ↔ Staff Conversations

In-app chat between members and their gym's staff and trainers. This is the **Message** button on the member app's Staff & Trainers screens, plus a shared **front desk** inbox.

It is a separate thing from the existing `messaging` domain, which handles bulk SMS, email and WhatsApp sent by staff.

_Last updated: 2026-11-01_

## Progress

| Part | Status |
|---|---|
| Rules agreed | Done |
| Backend: migration, entities, services, APIs | Done, not committed |
| Backend unit tests (36 new) | Passing |
| Backend run against a real database | **Not done yet.** See [Before running the app](#before-running-the-app) |
| Mobile app: chat screens, staff Chats list, member Message buttons + front desk | Done, not committed, not yet tried on a device |
| Mobile app: chat switches (Settings), staff push registration and chat deep links | Done, not committed, not yet tried on a device |
| Web admin page for chat reports (Member Connect → Chat Reports, gym owners only) | Done, not committed |

## The rules

- **Who members can message:** the front desk, or any active staff member or trainer at their branch who has app access and has **Accept messages from members** turned on. It's on by default.
- **Who staff can message:** active members of their branch who have **Let staff start chats** turned on. It's on by default.
- **What the two switches do:** they stop *new* conversations only. Conversations that already exist carry on.
- **Unanswered messages:** at most 3 in a row from either side.
- **Daily limits:** 20 messages a day per member, and 20 new conversations a day per staff member.
- **Messages:** text only, up to 1000 characters.
- **Contact details:** phone numbers, emails and links are replaced with `[hidden]`. The original text is kept, and only admins can see it, through a report.
- **Quiet hours:** a member's message always gets through. If the staff member is off shift, the push notification waits until their shift starts. Shifts come from their schedule slots; staff with no schedule count as on duty from 6am to 10pm.
- **When someone leaves:**
  - A staff member who leaves, or loses app access, leaves their conversations read-only.
  - A member whose membership lapses can read their conversations for 30 days, after which they disappear for that member.
- **Mute and block:**
  - Staff can mute a member for 7 days.
  - Members can block a staff member and unblock them later. Blocking alerts the gym's admins, who don't see the conversation itself.
  - Members can't block the front desk; they report a message instead.
- **Reports:** either side can report a message from the other side. A report is the **only** way admins can see a conversation, and it shows the whole conversation up to the moment of the report. From there an admin can:
  - dismiss the report
  - close that conversation for good
  - ban the member from chat
- **Minors** can't use chat.
- **Deleting:** messages are only ever soft-deleted. They're hidden from both sides but kept for reports.

## Before running the app

### 1. Apply the migration to your local database

The `local` profile turns Flyway off (`spring.flyway.enabled=false`) and lets Hibernate update the schema instead. Hibernate creates the new tables, but it **won't**:

- drop the `NOT NULL` on `mobile_push_tokens.member_id`, so registering a staff device for push would fail
- create the partial unique indexes that stop duplicate conversations

Run the migration by hand once. It's safe to run more than once because every statement uses `IF NOT EXISTS` or can be repeated:

```bash
cd Gym-backend
psql -h localhost -U postgres -d GYMBIOS \
  -f src/main/resources/db/migration/V112__member_staff_conversations.sql
```

Check that it worked:

```bash
psql -h localhost -U postgres -d GYMBIOS -c "\d conversations" -c "\d mobile_push_tokens"
```

`mobile_push_tokens.member_id` should be nullable and there should be a `staff_id` column. `conversations` should list the two `uq_conversations_*` indexes.

Gym databases in other environments get V112 automatically through Flyway when the app starts.

### 2. Compile and run the tests

```bash
cd Gym-backend
mvn -o compile
mvn -o test -Dtest='Conversation*Test' -Dsurefire.failIfNoSpecifiedTests=false
```

Expected result: 24 policy tests and 12 service tests pass.

The full suite (`mvn -o test`) also has 7 tests that start the whole app. They need the local Postgres password, and they fail with `password authentication failed for user "postgres"` until `DB_PASSWORD` and `CONTROL_PLANE_DB_PASSWORD` are set. That failure has nothing to do with this feature.

### 3. Start the backend

```bash
cd Gym-backend
DB_PASSWORD=<your password> CONTROL_PLANE_DB_PASSWORD=<your password> \
  mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### 4. Quick checks once it's running

These need a valid token. For a staff token, also send `X-Active-Branch-Id` when the account works at more than one branch.

```bash
# Member: the Staff & Trainers list should now include can_message
curl -H "Authorization: Bearer $MEMBER_TOKEN" localhost:8080/api/mobile/member/staff

# Member: message the front desk
curl -X POST -H "Authorization: Bearer $MEMBER_TOKEN" -H "Content-Type: application/json" \
  -d '{"body":"Hi, is the pool open today?"}' localhost:8080/api/mobile/member/conversations

# Staff: the inbox, front desk included
curl -H "Authorization: Bearer $STAFF_TOKEN" localhost:8080/api/mobile/staff/conversations
```

## API

The JSON is snake_case, like the rest of the backend.

### Member: `/api/mobile/member/conversations`

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Conversations, latest activity first |
| GET | `/unread-count` | `{ "count": n }` |
| GET | `/lookup?staff_id=` | The existing thread, and whether a new one can be started. Leave out `staff_id` for the front desk |
| POST | `/` | `{ "staff_id"?, "body" }`: starts the thread or adds to it |
| GET | `/{id}` | One conversation |
| GET | `/{id}/messages?before_id=&limit=` | Newest first, 30 by default, up to 100 |
| POST | `/{id}/messages` | `{ "body" }` |
| POST | `/{id}/read` | Marks the conversation as read |
| DELETE | `/{id}/messages/{messageId}` | Own messages only |
| POST | `/{id}/messages/{messageId}/report` | `{ "reason", "details"? }`. Reason is one of `HARASSMENT`, `SPAM`, `INAPPROPRIATE`, `OFF_PLATFORM`, `OTHER` |
| POST / DELETE | `/{id}/block` | Block or unblock (not the front desk) |
| GET / PUT | `/settings` | `{ "allow_staff_chats" }` |

### Staff and trainers: `/api/mobile/staff/conversations`

Same as the member API, with these differences:

| Method | Path | Notes |
|---|---|---|
| GET | `/?inbox=all\|mine\|front_desk` | Trainers only ever see their own conversations |
| GET | `/members?search=&limit=` | Active members of the branch with an app login, by name (100 by default, up to 200), with `conversation_id`, `unread` and `can_start` / `cannot_start_code` per row. Feeds the app's Chats list |
| GET | `/lookup?member_id=` | |
| POST | `/` | `{ "member_id", "body" }`. Staff always start as themselves, never as the front desk |
| POST / DELETE | `/{id}/mute` | Stops the member sending for 7 days (instead of block) |
| GET / PUT | `/settings` | `{ "accepts_member_messages" }` |

Staff devices register for push at `PUT` / `DELETE /api/mobile/staff/push-tokens`, with the same body as the member endpoint.

### Admin: `/api/conversation-reports` (ADMIN and SUPER_ADMIN roles)

| Method | Path | Notes |
|---|---|---|
| GET | `/?status=OPEN&page=0&size=20` | Reports, with status counts |
| GET | `/{id}` | The report and the whole conversation up to the moment of the report |
| POST | `/{id}/resolve` | `{ "action": "DISMISS\|BLOCK_CONVERSATION\|BAN_MEMBER", "note"? }` |
| DELETE | `/members/{memberId}/chat-ban` | Lifts a member's chat ban |

### When the app can't send

Refusals come back as HTTP 409 with a readable message. The conversation and staff-card responses also carry one of these codes so the app can explain a disabled button up front. They're defined in `ConversationPolicyService`:

`MINOR`, `CHAT_BANNED`, `MEMBERSHIP_INACTIVE`, `STAFF_UNAVAILABLE`, `NOT_ACCEPTING`, `MEMBER_UNAVAILABLE`, `MEMBER_OPTED_OUT`, `NOT_AT_BRANCH`, `BLOCKED`, `BLOCKED_BY_YOU`, `BLOCKED_BY_MEMBER`, `MUTED`, `UNANSWERED_LIMIT`, `DAILY_LIMIT`

Push notifications for chat have `data.type = "conversation_message"` and `data.conversationId`.

## Where the code is

| What | Where |
|---|---|
| Migration | `src/main/resources/db/migration/V112__member_staff_conversations.sql` |
| Rules | `services/conversations/ConversationPolicyService.java` |
| Member and staff logic | `services/conversations/ConversationService.java` |
| Pushes and admin alerts | `services/conversations/ConversationNotifier.java` |
| Held pushes (quiet hours) | `services/conversations/ConversationQuietHoursScheduler.java` (every 10 minutes, every gym) |
| Reports | `services/conversations/ConversationReportService.java`, `controllers/ConversationReportController.java` |
| Mobile controllers | `controllers/mobile/conversations/` |
| Entities | `Conversation`, `ConversationMessage`, `ConversationReport`; new fields on `Staff`, `Member`, `MobilePushToken` |
| Tests | `src/test/java/.../services/conversations/` |

## Still to do

1. **Try it on devices:** member and staff chat end to end, push taps on a cold start, and the Android keyboard over the composer.
2. **Defaults to confirm with the product owner:** minors are blocked, both daily limits are 20, the front desk can't be blocked, and on-duty hours are 6am–10pm when no schedule is set.
3. **Not in v1:** a members' list of their own conversations (members reach chats from Staff & Trainers and the front-desk card), and same-gym multi-branch staff (chats follow the active branch).
