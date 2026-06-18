# Security Specification - H2O Studio

## Data Invariants
1. A consultation must have a valid name and phone number.
2. A user's role can only be modified by a Super Admin (configured in code).
3. Styles, Albums, and Photos are publicly readable but only editable by Staff/Admin.
4. Settings are publicly readable but only editable by Admin.
5. Users can only read/edit their own data (except staff/admin).

## The "Dirty Dozen" Payloads

### 1. Identity Spoofing (Consultation)
Attempt to create a consultation with a spoofed `ownerId` or `userId` (if we had one).
```json
{
  "id": "consult-123",
  "name": "Attacker",
  "phone": "0987654321",
  "status": "new",
  "userId": "some-other-user-id"
}
```

### 2. Privilege Escalation (User)
A normal user tries to update their own role to 'admin'.
```json
{
  "role": "admin"
}
```

### 3. Resource Poisoning (Consultation ID)
Injecting a massive string as a document ID.
Path: `/consultations/[1MB_STRING]`

### 4. Shadow Field Injection (Style)
Adding an unauthorized field to a style.
```json
{
  "isSecret": true
}
```

### 5. State Shortcutting (Consultation)
Directly setting status to 'registered' bypasses the workflow.
```json
{
  "status": "registered"
}
```

### 6. Value Poisoning (Settings)
Setting `watermarkOpacity` to 1000.
```json
{
  "watermarkOpacity": 1000
}
```

### 7. PII Leak (User)
A guest trying to read the entire `users` collection.

### 8. Denial of Wallet (Large Array)
Creating a consultation with a massive `tags` array.
```json
{
  "tags": ["A", "B", ... 10000 more]
}
```

### 9. Orphaned Write (Album)
Creating an album for a non-existent style.

### 10. Immutable Field Modification (User)
Updating `uid` after creation.

### 11. Temporal Integrity Breach (Consultation)
Providing a fake `createdAt` timestamp from the future.
```json
{
  "createdAt": "2030-01-01T00:00:00Z"
}
```

### 12. Query Scraping (User List)
Attempting to list all users without being staff.

## Test Results Expectation
All above payloads MUST return `PERMISSION_DENIED`.
