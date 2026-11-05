# Security Specification for TimeGiG

## Data Invariants
1. A user profile must have a valid `userId` matching their Auth UID.
2. A user's settings can only be accessed or modified by that user.
3. A gig must involve the current user as either the owner (hirer) or the seeker (worker).
4. Only the gig owner can mark a gig as 'completed'.
5. Once a gig is 'completed' or 'cancelled', no further status changes are allowed.
6. A referral is only valid if the `invitedBy` field matches the recruiter's UID.

## The "Dirty Dozen" Payloads

### 1. Identity Spoofing (User Profile)
Attempt to create a user profile for a different UID.
```json
{
  "userId": "attacker_uid",
  "email": "victim@example.com"
}
```
**Target**: `/users/victim_uid` (as `attacker_uid`)
**Expected**: PERMISSION_DENIED

### 2. Privilege Escalation (Activation)
Attempt to self-activate without payment.
```json
{
  "isActivated": true
}
```
**Target**: `/users/my_uid` (Partial update)
**Expected**: PERMISSION_DENIED (Must be whitelisted update action)

### 3. Orphaned Settings
Create settings for a non-existent user.
```json
{
  "userId": "non_existent_uid"
}
```
**Target**: `/settings/non_existent_uid`
**Expected**: PERMISSION_DENIED

### 4. Gig Hijacking
Attempt to read a gig between two other users.
**Target**: `/gigs/other_gig_id`
**Expected**: PERMISSION_DENIED

### 5. Seeker Impersonation
Create a gig where the current user is the seeker but someone else is the owner.
```json
{
  "ownerId": "victim_uid",
  "seekerId": "attacker_uid",
  "status": "pending"
}
```
**Target**: `/gigs/new_gig_id`
**Expected**: PERMISSION_DENIED (Owner must be request.auth.uid)

### 6. Unauthorized Completion
Seeker attempts to mark a gig as 'completed'.
```json
{
  "status": "completed"
}
```
**Target**: `/gigs/my_gig_id` (as seeker)
**Expected**: PERMISSION_DENIED

### 7. Post-Terminal Update
Attempt to change a 'completed' gig back to 'pending'.
```json
{
  "status": "pending"
}
```
**Target**: `/gigs/completed_gig_id`
**Expected**: PERMISSION_DENIED

### 8. Shadow Field Injection
Inject an unauthorized field into a user profile.
```json
{
  "isAdmin": true
}
```
**Target**: `/users/my_uid`
**Expected**: PERMISSION_DENIED (isValidUser must block shadow fields)

### 9. PII Leak (Email Listing)
Attempt to list all users to scrape emails.
**Target**: `/users` (No filters)
**Expected**: PERMISSION_DENIED (Rules must enforce list filters)

### 10. Resource Poisoning (ID)
Inject a massive string as a document ID.
**Target**: `/users/very_long_junk_string_...`
**Expected**: PERMISSION_DENIED (isValidId check)

### 11. Fake Referral
Attempt to list users they didn't invite.
**Target**: `/users` (where `invitedBy` == 'other_user')
**Expected**: PERMISSION_DENIED

### 12. System Field Tampering
Modify a server-side timestamp.
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
**Target**: `/users/my_uid`
**Expected**: PERMISSION_DENIED (Must match request.time)
