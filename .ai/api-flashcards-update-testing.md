# Manual Testing Guide: PUT /api/flashcards/{id}

## Prerequisites

Before testing, ensure you have:

1. ✅ Supabase project set up with database migrations applied
2. ✅ Valid user account created in Supabase Auth
3. ✅ Access token (JWT) obtained from Supabase Auth
4. ✅ At least one test flashcard created in the database
5. ✅ Development server running (`npm run dev`)

---

## Setup Test Environment

### 1. Create Test User

```bash
# Using Supabase CLI or Dashboard, create a test user
# Example email: test@example.com
# Example password: TestPassword123!
```

### 2. Get Access Token

```javascript
// Use Supabase client to get access token
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY");

const { data, error } = await supabase.auth.signInWithPassword({
  email: "test@example.com",
  password: "TestPassword123!",
});

console.log("Access Token:", data.session.access_token);
```

### 3. Create Test Flashcards

Create a few test flashcards to work with:

```sql
-- Run in Supabase SQL Editor
INSERT INTO public.flashcards (user_id, front, back, source)
VALUES
  ('YOUR_USER_UUID', 'Test Question 1', 'Test Answer 1', 'manual'),
  ('YOUR_USER_UUID', 'Test Question 2', 'Test Answer 2', 'manual'),
  ('YOUR_USER_UUID', 'Unique Front Content', 'Some answer', 'ai-full');
```

---

## Test Scenarios

### ✅ Happy Path Tests

#### Test 1: Update Both Front and Back

**Objective:** Verify that both fields can be updated simultaneously.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Updated Question",
    "back": "Updated Answer"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Response body contains updated flashcard with new `front` and `back` values
- `updated_at` timestamp is current

**Verification:**

```sql
SELECT * FROM flashcards WHERE id = '{FLASHCARD_ID}';
-- Verify front and back are updated
-- Verify updated_at is recent
```

---

#### Test 2: Update Only Front Field

**Objective:** Verify partial updates work correctly.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Only Front Updated"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Response shows updated `front`
- `back` and `source` remain unchanged

---

#### Test 3: Update Only Back Field

**Objective:** Verify that only back can be updated.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "back": "Only Back Updated with more detailed explanation"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Response shows updated `back`
- `front` and `source` remain unchanged

---

#### Test 4: Update Source Field

**Objective:** Verify source tracking can be updated.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "source": "ai-edited"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Response shows updated `source` as `ai-edited`
- Other fields remain unchanged

---

#### Test 5: Update All Three Fields

**Objective:** Verify all fields can be updated together.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Completely New Question",
    "back": "Completely New Answer",
    "source": "manual"
  }'
```

**Expected Result:**

- Status: `200 OK`
- All three fields are updated

---

### ❌ Error Handling Tests

#### Test 6: Missing Authorization Header

**Objective:** Verify authentication is enforced.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -d '{
    "front": "This should fail"
  }'
```

**Expected Result:**

- Status: `401 Unauthorized`
- Error code: `unauthorized`
- Error message: "Wymagana autoryzacja"

---

#### Test 7: Invalid JWT Token

**Objective:** Verify invalid tokens are rejected.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_12345" \
  -d '{
    "front": "This should fail"
  }'
```

**Expected Result:**

- Status: `401 Unauthorized`
- Error code: `unauthorized`

---

#### Test 8: Expired JWT Token

**Objective:** Verify expired tokens are rejected.

**Setup:** Use a token that has expired (JWT with `exp` claim in the past).

**Expected Result:**

- Status: `401 Unauthorized`
- Error code: `unauthorized`

---

#### Test 9: Non-Existent Flashcard ID

**Objective:** Verify 404 for invalid IDs.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "This should fail"
  }'
```

**Expected Result:**

- Status: `404 Not Found`
- Error code: `not_found`
- Error message: "Fiszka nie została znaleziona"

---

#### Test 10: Invalid UUID Format

**Objective:** Verify graceful handling of malformed UUIDs.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/not-a-valid-uuid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "This should fail"
  }'
```

**Expected Result:**

- Status: `404 Not Found` (database query returns no results)
- Error code: `not_found`

---

#### Test 11: Update Another User's Flashcard

**Objective:** Verify ownership protection.

**Setup:**

1. Create a flashcard owned by User A
2. Get access token for User B
3. Try to update User A's flashcard with User B's token

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{USER_A_FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {USER_B_ACCESS_TOKEN}" \
  -d '{
    "front": "Trying to steal this flashcard"
  }'
```

**Expected Result:**

- Status: `404 Not Found` (service returns null when flashcard doesn't belong to user)
- Error code: `not_found`
- Error message: "Fiszka nie została znaleziona"

---

#### Test 12: Empty Request Body

**Objective:** Verify at least one field is required.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{}'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Error message: "Dane wejściowe są nieprawidłowe"
- Details: "Co najmniej jedno pole (front, back lub source) musi być dostarczone"

---

#### Test 13: Front Field Exceeds Max Length

**Objective:** Verify front length validation.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "'$(python3 -c "print('A' * 201)")'"
  }'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Details: `"front": ["Front może zawierać maksymalnie 200 znaków"]`

---

#### Test 14: Back Field Exceeds Max Length

**Objective:** Verify back length validation.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "back": "'$(python3 -c "print('B' * 501)")'"
  }'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Details: `"back": ["Back może zawierać maksymalnie 500 znaków"]`

---

#### Test 15: Empty String for Front

**Objective:** Verify minimum length validation for front.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": ""
  }'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Details: `"front": ["Front nie może być pusty"]`

---

#### Test 16: Empty String for Back

**Objective:** Verify minimum length validation for back.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "back": ""
  }'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Details: `"back": ["Back nie może być pusty"]`

---

#### Test 17: Invalid Source Value

**Objective:** Verify source enum validation.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "source": "invalid-source"
  }'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Details: Error indicating invalid enum value

---

#### Test 18: Duplicate Front Content

**Objective:** Verify unique constraint enforcement.

**Setup:**

1. User has flashcard with `front = "Existing Question"`
2. Try to update a different flashcard to have the same front

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{OTHER_FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Existing Question"
  }'
```

**Expected Result:**

- Status: `409 Conflict`
- Error code: `duplicate_front`
- Error message: "Fiszka z taką treścią front już istnieje"

---

#### Test 19: Invalid JSON Format

**Objective:** Verify JSON parsing error handling.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d 'invalid json here'
```

**Expected Result:**

- Status: `400 Bad Request`
- Error code: `validation_error`
- Error message: "Nieprawidłowy format JSON"

---

#### Test 20: Malformed Authorization Header

**Objective:** Verify proper Bearer token format is required.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Should fail"
  }'
```

**Expected Result:**

- Status: `401 Unauthorized`
- Error code: `unauthorized`

---

### 🔬 Edge Cases and Special Scenarios

#### Test 21: Unicode and Special Characters

**Objective:** Verify proper handling of Unicode characters.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Co to jest emoji? 🚀",
    "back": "Emoji to piktogramy używane w komunikacji elektronicznej 😊"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Unicode characters are properly stored and returned

---

#### Test 22: HTML/Script Injection Attempt

**Objective:** Verify input sanitization (if implemented).

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "<script>alert(\"XSS\")</script>",
    "back": "<img src=x onerror=alert(1)>"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Content is stored as-is (sanitization happens on display, not storage)
- Verify in database that exact strings are stored

---

#### Test 23: Whitespace-Only Strings

**Objective:** Verify trimming and empty validation.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "   "
  }'
```

**Expected Result:**

- Depends on Zod schema configuration
- Should fail validation if trimming is applied and results in empty string

---

#### Test 24: Exact Max Length Boundaries

**Objective:** Verify boundary conditions.

**Test 24a - Front at exactly 200 characters:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "'$(python3 -c "print('A' * 200)")'"
  }'
```

**Expected:** `200 OK` - Should succeed

**Test 24b - Back at exactly 500 characters:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "back": "'$(python3 -c "print('B' * 500)")'"
  }'
```

**Expected:** `200 OK` - Should succeed

---

#### Test 25: Case Sensitivity of Front Uniqueness

**Objective:** Verify if front uniqueness is case-sensitive.

**Setup:** User has flashcard with `front = "Test Question"`

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{OTHER_FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "test question"
  }'
```

**Expected Result:**

- Status: `200 OK` (PostgreSQL unique constraint is case-sensitive by default)
- Different case is allowed

---

#### Test 26: Newlines and Line Breaks

**Objective:** Verify multiline content handling.

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Question\nwith\nnewlines",
    "back": "Answer\n\nwith\n\nmultiple\n\nnewlines"
  }'
```

**Expected Result:**

- Status: `200 OK`
- Newlines are preserved in database and response

---

#### Test 27: Updating to Same Values

**Objective:** Verify idempotency.

**Setup:** Flashcard has `front = "Question"`, `back = "Answer"`

**Request:**

```bash
curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{
    "front": "Question",
    "back": "Answer"
  }'
```

**Expected Result:**

- Status: `200 OK`
- `updated_at` is still updated to current timestamp
- No errors even though values didn't change

---

#### Test 28: Concurrent Updates

**Objective:** Test race condition handling.

**Setup:** Send two identical update requests simultaneously.

**Expected Result:**

- Both should succeed (last write wins)
- Or one might fail with database lock timeout
- `updated_at` reflects the last successful update

---

#### Test 29: Very Long Request Processing

**Objective:** Verify timeout handling.

**Note:** Difficult to test without artificial delays. Check server timeout configuration.

---

#### Test 30: Database Connection Loss

**Objective:** Verify error handling when database is unavailable.

**Setup:**

1. Stop Supabase/PostgreSQL service
2. Attempt update

**Expected Result:**

- Status: `500 Internal Server Error`
- Error code: `internal_error`
- Error message: "Wystąpił błąd serwera. Spróbuj ponownie później."

---

## Performance Testing

### Test 31: Response Time Measurement

**Objective:** Verify response times are within acceptable limits.

**Tool:** Use `curl` with timing or Apache Bench (ab)

```bash
# Single request timing
time curl -X PUT http://localhost:4321/api/flashcards/{FLASHCARD_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -d '{"front": "Performance Test"}'

# Multiple requests
ab -n 100 -c 10 -T 'application/json' \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -p update.json \
  http://localhost:4321/api/flashcards/{FLASHCARD_ID}
```

**Expected:**

- P95 response time: < 200ms
- P99 response time: < 500ms

---

### Test 32: Load Testing

**Objective:** Verify endpoint handles concurrent requests.

**Tool:** Use Apache Bench or k6

```bash
ab -n 1000 -c 50 -T 'application/json' \
  -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" \
  -p update.json \
  http://localhost:4321/api/flashcards/{FLASHCARD_ID}
```

**Monitor:**

- Server CPU/Memory usage
- Database connection pool
- Error rate

---

## Checklist Summary

Use this checklist to track your testing progress:

### Happy Path

- [ ] Test 1: Update both front and back
- [ ] Test 2: Update only front
- [ ] Test 3: Update only back
- [ ] Test 4: Update source field
- [ ] Test 5: Update all three fields

### Authentication & Authorization

- [ ] Test 6: Missing authorization header
- [ ] Test 7: Invalid JWT token
- [ ] Test 8: Expired JWT token
- [ ] Test 11: Update another user's flashcard

### Not Found Errors

- [ ] Test 9: Non-existent flashcard ID
- [ ] Test 10: Invalid UUID format

### Validation Errors

- [ ] Test 12: Empty request body
- [ ] Test 13: Front exceeds max length
- [ ] Test 14: Back exceeds max length
- [ ] Test 15: Empty string for front
- [ ] Test 16: Empty string for back
- [ ] Test 17: Invalid source value
- [ ] Test 19: Invalid JSON format

### Conflict Errors

- [ ] Test 18: Duplicate front content

### Edge Cases

- [ ] Test 21: Unicode and special characters
- [ ] Test 22: HTML/Script injection attempt
- [ ] Test 23: Whitespace-only strings
- [ ] Test 24: Exact max length boundaries
- [ ] Test 25: Case sensitivity of front uniqueness
- [ ] Test 26: Newlines and line breaks
- [ ] Test 27: Updating to same values
- [ ] Test 28: Concurrent updates

### Performance

- [ ] Test 31: Response time measurement
- [ ] Test 32: Load testing

---

## Automated Testing Script

Here's a simple Node.js script to automate some tests:

```javascript
// test-flashcard-update.js
import fetch from "node-fetch";

const API_URL = "http://localhost:4321";
const ACCESS_TOKEN = "YOUR_ACCESS_TOKEN";
const FLASHCARD_ID = "YOUR_FLASHCARD_ID";

async function testUpdate(testName, body, expectedStatus) {
  console.log(`\n🧪 Testing: ${testName}`);

  try {
    const response = await fetch(`${API_URL}/api/flashcards/${FLASHCARD_ID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const passed = response.status === expectedStatus;

    console.log(`   Status: ${response.status} ${passed ? "✅" : "❌"}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));

    return passed;
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return false;
  }
}

async function runTests() {
  let passed = 0;
  let total = 0;

  // Test 1: Update both fields
  total++;
  if (
    await testUpdate(
      "Update both front and back",
      {
        front: "Updated Question",
        back: "Updated Answer",
      },
      200
    )
  )
    passed++;

  // Test 2: Update only front
  total++;
  if (
    await testUpdate(
      "Update only front",
      {
        front: "Only Front Updated",
      },
      200
    )
  )
    passed++;

  // Test 3: Empty body
  total++;
  if (await testUpdate("Empty request body", {}, 400)) passed++;

  // Test 4: Front too long
  total++;
  if (
    await testUpdate(
      "Front exceeds max length",
      {
        front: "A".repeat(201),
      },
      400
    )
  )
    passed++;

  // Add more tests...

  console.log(`\n\n📊 Results: ${passed}/${total} tests passed`);
}

runTests();
```

Run with:

```bash
node test-flashcard-update.js
```

---

## Troubleshooting

### Issue: All requests return 401

**Possible causes:**

- Token expired
- Wrong token format
- Middleware not properly extracting token

**Solution:**

- Generate new token
- Check Authorization header format: `Bearer <token>`
- Verify middleware is running

### Issue: All requests return 500

**Possible causes:**

- Database connection issue
- Supabase credentials incorrect
- Service layer throwing unhandled exceptions

**Solution:**

- Check server logs
- Verify `.env` variables
- Check database connection

### Issue: Updates succeed but data doesn't change

**Possible causes:**

- Cache issue
- Transaction not committed
- Reading from wrong database instance

**Solution:**

- Query database directly to verify
- Check for database triggers
- Verify no caching layer

---

## Notes

- Replace `{FLASHCARD_ID}`, `{YOUR_ACCESS_TOKEN}`, `{USER_UUID}` with actual values
- Some tests require specific setup (e.g., creating multiple users)
- Performance tests should be run on a production-like environment
- Consider implementing rate limiting before production deployment
