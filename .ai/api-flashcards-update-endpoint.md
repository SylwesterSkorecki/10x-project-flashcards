# API Endpoint Documentation: Update Flashcard

## Endpoint Overview

**Method:** `PUT`  
**Path:** `/api/flashcards/{id}`  
**Description:** Updates an existing flashcard (front, back, and/or source field). Only the owner can modify their flashcards.

---

## Authentication

**Required:** Yes  
**Type:** JWT Bearer Token

Include the authentication token in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

---

## Request

### URL Parameters

| Parameter | Type | Required | Description                                      |
| --------- | ---- | -------- | ------------------------------------------------ |
| `id`      | UUID | Yes      | The unique identifier of the flashcard to update |

### Request Body

**Content-Type:** `application/json`

At least one field must be provided:

| Field    | Type   | Required | Constraints                              | Description                                |
| -------- | ------ | -------- | ---------------------------------------- | ------------------------------------------ |
| `front`  | string | No       | 1-200 characters                         | The front side of the flashcard (question) |
| `back`   | string | No       | 1-500 characters                         | The back side of the flashcard (answer)    |
| `source` | string | No       | One of: `ai-full`, `ai-edited`, `manual` | The source/origin of the flashcard         |

### Example Requests

#### Update both front and back

```bash
curl -X PUT https://your-domain.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "front": "Co to jest JavaScript?",
    "back": "JavaScript to interpretowany język programowania używany głównie do tworzenia interaktywnych stron internetowych."
  }'
```

#### Update only the back field

```bash
curl -X PUT https://your-domain.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "back": "Zaktualizowana odpowiedź z dodatkowymi szczegółami."
  }'
```

#### Update source after manual editing

```bash
curl -X PUT https://your-domain.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "front": "Poprawione pytanie",
    "back": "Poprawiona odpowiedź",
    "source": "ai-edited"
  }'
```

#### Using JavaScript Fetch API

```javascript
const response = await fetch("https://your-domain.com/api/flashcards/550e8400-e29b-41d4-a716-446655440000", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    front: "Co to jest TypeScript?",
    back: "TypeScript to typowany nadzbiór JavaScriptu, który kompiluje się do czystego JavaScriptu.",
  }),
});

const data = await response.json();
```

---

## Response

### Success Response (200 OK)

Returns the updated flashcard.

**Content-Type:** `application/json`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "front": "Co to jest JavaScript?",
  "back": "JavaScript to interpretowany język programowania używany głównie do tworzenia interaktywnych stron internetowych.",
  "source": "manual",
  "generation_id": null,
  "created_at": "2026-01-20T10:30:00.000Z",
  "updated_at": "2026-01-25T14:45:30.000Z"
}
```

### Error Responses

#### 400 Bad Request - Validation Error

Returned when the request body fails validation.

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dane wejściowe są nieprawidłowe",
    "details": {
      "front": ["Front może zawierać maksymalnie 200 znaków"],
      "back": ["Back nie może być pusty"]
    }
  }
}
```

**Common validation errors:**

- Empty request body or no fields provided
- `front` exceeds 200 characters
- `back` exceeds 500 characters
- `front` is an empty string
- `back` is an empty string
- Invalid JSON format
- Invalid `source` value (must be `ai-full`, `ai-edited`, or `manual`)

#### 401 Unauthorized

Returned when authentication fails or token is missing/invalid.

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Wymagana autoryzacja"
  }
}
```

**Common causes:**

- Missing `Authorization` header
- Invalid JWT token format
- Expired token
- Token not signed by Supabase

#### 404 Not Found

Returned when the flashcard doesn't exist or doesn't belong to the authenticated user.

```json
{
  "error": {
    "code": "not_found",
    "message": "Fiszka nie została znaleziona"
  }
}
```

**Common causes:**

- Invalid UUID format in URL
- Flashcard with given ID doesn't exist
- Flashcard belongs to a different user
- Flashcard was previously deleted

#### 409 Conflict - Duplicate Front

Returned when trying to update `front` to a value that already exists for this user.

```json
{
  "error": {
    "code": "duplicate_front",
    "message": "Fiszka z taką treścią front już istnieje"
  }
}
```

**Note:** The `(user_id, front)` combination must be unique. Each user can only have one flashcard with a given front content.

#### 500 Internal Server Error

Returned when an unexpected server error occurs.

```json
{
  "error": {
    "code": "internal_error",
    "message": "Wystąpił błąd serwera. Spróbuj ponownie później."
  }
}
```

---

## Business Rules

1. **Ownership Verification:** Only the flashcard owner can update it. The endpoint verifies ownership by checking `user_id` from the JWT token against the flashcard's `user_id`.

2. **Unique Front Content:** Each user can only have one flashcard with a given `front` content. If you try to update a flashcard's `front` to a value that already exists in your other flashcards, you'll get a `409 Conflict` error.

3. **Partial Updates:** You can update any combination of fields (`front`, `back`, `source`). You don't need to provide all fields - only the ones you want to change.

4. **Automatic Timestamp:** The `updated_at` field is automatically set to the current timestamp when the flashcard is updated.

5. **Source Tracking:** The `source` field tracks the origin of the flashcard:
   - `ai-full`: Generated by AI and accepted without modifications
   - `ai-edited`: Generated by AI but modified by the user
   - `manual`: Created manually by the user

---

## Security Considerations

1. **Authentication Required:** All requests must include a valid JWT token. Anonymous access is not allowed.

2. **Authorization:** The endpoint implements defense-in-depth:
   - Middleware validates the JWT token
   - Service layer checks ownership before updating
   - Database has RLS enabled (though policies are currently disabled)

3. **Input Sanitization:** All input is validated using Zod schemas before processing.

4. **SQL Injection Protection:** The Supabase client automatically parameterizes all queries.

---

## Performance Considerations

- **Indexes:** The database has indexes on `user_id` and a unique index on `(user_id, front)` for optimal performance.
- **Response Time:** Expected p95 response time: < 200ms
- **Rate Limiting:** Consider implementing rate limiting (e.g., 60 requests/minute per user) to prevent abuse.

---

## Related Endpoints

- `GET /api/flashcards` - List all flashcards for the authenticated user
- `GET /api/flashcards/{id}` - Get a single flashcard
- `POST /api/flashcards` - Create a new flashcard
- `DELETE /api/flashcards/{id}` - Delete a flashcard

---

## Version History

| Version | Date       | Changes                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| 1.0.0   | 2026-01-25 | Initial implementation with service layer and defense-in-depth security |
