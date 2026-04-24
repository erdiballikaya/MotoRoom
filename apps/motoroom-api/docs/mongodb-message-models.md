# MotoRoom MongoDB Message Models

## `group_messages`

```json
{
  "messageId": "msg_uuid",
  "groupId": "postgres-group-uuid",
  "senderUserId": "postgres-user-uuid",
  "type": "text",
  "text": "Anyone using Road 6 on MT-07?",
  "media": [],
  "replyToMessageId": null,
  "reactions": [],
  "delivery": {
    "deliveredTo": [],
    "readBy": []
  },
  "createdAt": "2026-04-25T10:30:00.000Z",
  "editedAt": null,
  "deletedAt": null
}
```

Indexes are created in `src/modules/chat/message.mongo-model.ts`.

## `dm_messages`

```json
{
  "messageId": "dm_uuid",
  "conversationKey": "dm:lower-user-id:higher-user-id",
  "senderUserId": "postgres-user-uuid",
  "recipientUserId": "postgres-user-uuid",
  "type": "text",
  "text": "Can I ask about your S40 setup?",
  "media": [],
  "replyToMessageId": null,
  "delivery": {
    "deliveredAt": null,
    "readAt": null
  },
  "createdAt": "2026-04-25T10:30:00.000Z",
  "deletedAt": null
}
```

