# Patient Dashboard - API Integration Guide

## Overview
This document provides comprehensive API documentation for integrating the patient dashboard frontend with the ECare+ backend.

---

## Base Configuration

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000` |
| Staging | `TBD` |
| Production | `TBD` |

### Common Headers
```
Content-Type: application/json
```

### Authenticated Requests
For protected endpoints, include the JWT token:
```
Authorization: Bearer <JWT_TOKEN>
```

### Standard Response Format
**Success Response:**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### Common HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing token) |
| 403 | Forbidden (invalid/expired token) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 1. AUTHENTICATION

### 1.1 Patient Registration (Email/Password)

Creates a new patient account and sends OTP for email verification.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/onboarding/auth` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "Password123"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "patientId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/onboarding/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Password123"
  }'
```

---

### 1.2 Verify OTP

Verifies the OTP sent to patient's email during registration.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/onboarding/verify-otp` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com",
  "otp": "123456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |
| otp | string | Yes | 6 digit OTP |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now proceed with onboarding.",
  "data": {
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "onboardingStep": "PERSONAL_INFO_COMPLETE"
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/onboarding/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "otp": "123456"
  }'
```

**Note:** OTP expires after 10 minutes.

---

### 1.3 Patient Login

Authenticates patient with email and password.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/login` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "Password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "patient@example.com",
    "name": "John Doe",
    "onboardingStep": "COMPLETE"
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Password123"
  }'
```

**Onboarding Steps:**
| Step | Description |
|------|-------------|
| `EMAIL_VERIFIED` | Email verified, personal info pending |
| `PERSONAL_INFO_COMPLETE` | Onboarding complete |

---

### 1.4 Google OAuth Login

Authenticates patient using Google OAuth token.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /auth/google/verify` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "googleToken": "ya29.a0AfH6SMBx...",
  "userType": "patient"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| googleToken | string | Yes | Access token from Google OAuth |
| userType | string | Yes | Must be `"patient"` |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "email": "patient@gmail.com",
    "name": "John Doe",
    "userType": "patient",
    "isNewUser": false,
    "isReturningIncompleteUser": false,
    "redirectTo": "/dashboard",
    "onboardingStep": "COMPLETE"
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/auth/google/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "googleToken": "ya29.a0AfH6SMBx...",
    "userType": "patient"
  }'
```

**Redirect Logic:**
| isNewUser | isReturningIncompleteUser | redirectTo |
|-----------|---------------------------|------------|
| true | - | `/onboarding` |
| false | true | `/onboarding` |
| false | false | `/dashboard` |

---

### 1.5 Forgot Password

Initiates password reset by sending OTP to email.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/forgot-password` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "OTP sent"
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com"
  }'
```

---

### 1.6 Verify Reset OTP

Verifies OTP for password reset.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/verify-reset-otp` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {}
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/verify-reset-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "otp": "123456"
  }'
```

---

### 1.7 Reset Password

Resets password after OTP verification.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/reset-password` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "email": "patient@example.com",
  "otp": "123456",
  "newPassword": "NewPassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "otp": "123456",
    "newPassword": "NewPassword123"
  }'
```

---

## 2. PATIENT PROFILE

### 2.1 Get Patient Profile

Retrieves patient profile information.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /patients/:patientId` |
| **Authentication** | Not Required |

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | UUID | Patient's unique identifier |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "patient@example.com",
    "name": "John Doe",
    "phone": "9876543210",
    "gender": "MALE",
    "age": 30,
    "city": "Mumbai",
    "state": "Maharashtra",
    "issues": ["diabetes", "hypertension"],
    "onboardingStep": "COMPLETE",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**cURL:**
```bash
curl -X GET "{{BASE_URL}}/patients/550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json"
```

---

### 2.2 Update Patient Profile

Updates patient's personal information.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/onboarding/personal-info` |
| **Authentication** | Not Required |

**Request Body:**
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "phone": "9876543210",
  "gender": "MALE",
  "age": 30,
  "city": "Mumbai",
  "state": "Maharashtra",
  "issues": ["diabetes", "hypertension"]
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| patientId | UUID | Yes | Valid patient ID |
| name | string | Yes | Min 2 characters |
| phone | string | Yes | Valid phone number format |
| gender | enum | Yes | `MALE`, `FEMALE`, `OTHER`, `PREFER_NOT_TO_SAY` |
| age | number | Yes | Between 1-120 |
| city | string | Yes | Min 2 characters |
| state | string | Yes | Min 2 characters |
| issues | string[] | No | Array of health issues |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "patient@example.com",
    "name": "John Doe",
    "phone": "9876543210",
    "gender": "MALE",
    "age": 30,
    "city": "Mumbai",
    "state": "Maharashtra",
    "issues": ["diabetes", "hypertension"],
    "onboardingStep": "COMPLETE"
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/onboarding/personal-info" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "phone": "9876543210",
    "gender": "MALE",
    "age": 30,
    "city": "Mumbai",
    "state": "Maharashtra",
    "issues": ["diabetes", "hypertension"]
  }'
```

---

## 3. DOCTORS

### 3.1 List All Doctors

Retrieves paginated list of all available doctors with optional specialty filter.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /doctors/` |
| **Authentication** | Not Required |

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |
| specialty | string | No | - | Filter by specialty (case-insensitive) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "doctor@example.com",
      "name": "Dr. Jane Smith",
      "specialty": "Cardiology",
      "city": "Mumbai",
      "viewCount": 150
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "email": "doctor2@example.com",
      "name": "Dr. Robert Wilson",
      "specialty": "Dermatology",
      "city": "Delhi",
      "viewCount": 89
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

**cURL Examples:**

List all doctors:
```bash
curl -X GET "{{BASE_URL}}/doctors/?page=1&limit=10" \
  -H "Content-Type: application/json"
```

Filter by specialty:
```bash
curl -X GET "{{BASE_URL}}/doctors/?page=1&limit=10&specialty=cardiology" \
  -H "Content-Type: application/json"
```

---

### 3.2 Get Doctor Profile

Retrieves detailed doctor profile information.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /doctors/:doctorId` |
| **Authentication** | Required |

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| doctorId | UUID | Doctor's unique identifier |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "email": "doctor@example.com",
    "name": "Dr. Jane Smith",
    "age": 45,
    "gender": "FEMALE",
    "languages": ["English", "Hindi", "Marathi"],
    "specialty": "Cardiology",
    "yearsOfExperience": 15,
    "latestQualification": "MD Cardiology",
    "address": "123 Medical Center",
    "city": "Mumbai",
    "locality": "Andheri West",
    "state": "Maharashtra",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    "availableTiming": "09:00-17:00",
    "consultationFee": 100000,
    "viewCount": 150,
    "onboardingStep": "COMPLETE"
  }
}
```

**Note:** `consultationFee` is in **paise** (divide by 100 for INR).

**cURL:**
```bash
curl -X GET "{{BASE_URL}}/doctors/660e8400-e29b-41d4-a716-446655440001" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 3.3 Register Doctor Profile View

Records when a patient views a doctor's profile (generates a lead).

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /doctors/:doctorId/view` |
| **Authentication** | Required |

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| doctorId | UUID | Doctor's unique identifier |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "View registered"
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/doctors/660e8400-e29b-41d4-a716-446655440001/view" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "patientId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Note:** Call this endpoint when patient opens a doctor's profile page.

---

## 4. SAVED DOCTORS (FAVORITES)

### 4.1 Save Doctor to Favorites

Adds a doctor to patient's saved/favorites list.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /patients/saved-doctors` |
| **Authentication** | Required |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "doctorId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "savedDoctors": ["660e8400-e29b-41d4-a716-446655440001"]
  }
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/patients/saved-doctors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "doctorId": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

---

### 4.2 Get Saved Doctors

Retrieves list of patient's saved/favorite doctors.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /patients/:patientId/saved-doctors` |
| **Authentication** | Required |

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | UUID | Patient's unique identifier |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "doctor@example.com",
      "name": "Dr. Jane Smith",
      "specialty": "Cardiology",
      "city": "Mumbai",
      "consultationFee": 100000
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "email": "doctor2@example.com",
      "name": "Dr. Robert Wilson",
      "specialty": "Dermatology",
      "city": "Delhi",
      "consultationFee": 75000
    }
  ]
}
```

**cURL:**
```bash
curl -X GET "{{BASE_URL}}/patients/550e8400-e29b-41d4-a716-446655440000/saved-doctors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 4.3 Remove Doctor from Favorites

Removes a doctor from patient's saved list.

| Property | Value |
|----------|-------|
| **Endpoint** | `DELETE /patients/saved-doctors` |
| **Authentication** | Required |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "doctorId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "savedDoctors": []
  }
}
```

**cURL:**
```bash
curl -X DELETE "{{BASE_URL}}/patients/saved-doctors" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "doctorId": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

---

## 5. APPOINTMENTS

### 5.1 Get Patient's Appointments

Retrieves paginated list of patient's appointments.

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /appointments/patient/my-appointments` |
| **Authentication** | Required |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | number | No | 1 | Page number |
| limit | number | No | 10 | Items per page |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "doctorId": "660e8400-e29b-41d4-a716-446655440001",
      "patientId": "550e8400-e29b-41d4-a716-446655440000",
      "doctor": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Dr. Jane Smith",
        "email": "doctor@example.com",
        "specialty": "Cardiology",
        "city": "Mumbai",
        "consultationFee": 100000
      },
      "scheduledAt": "2024-02-20T10:00:00.000Z",
      "scheduledEnd": "2024-02-20T10:30:00.000Z",
      "meetingName": "consultation-abc123",
      "status": "CONFIRMED",
      "createdAt": "2024-02-15T08:30:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

**Appointment Status Values:**
| Status | Description |
|--------|-------------|
| `PENDING` | Appointment scheduled, payment pending |
| `CONFIRMED` | Payment completed, appointment confirmed |
| `CANCELLED` | Appointment cancelled |
| `COMPLETED` | Consultation completed |

**cURL:**
```bash
curl -X GET "{{BASE_URL}}/appointments/patient/my-appointments?page=1&limit=10" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 6. PAYMENTS

### 6.1 Create Payment Order

Creates a Razorpay order for appointment payment.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /payments/create-order` |
| **Authentication** | Required |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "appointmentId": "770e8400-e29b-41d4-a716-446655440001"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": "order_NBhZgKqYtLz",
    "amount": 100000,
    "currency": "INR",
    "status": "created",
    "transfers": [
      {
        "account": "acc_OxDpYQdKKz",
        "amount": 90000,
        "on_hold": false
      }
    ]
  }
}
```

**Note:**
- Amount is in **paise** (100000 paise = ₹1000)
- 10% platform commission is deducted in transfers

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/payments/create-order" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "appointmentId": "770e8400-e29b-41d4-a716-446655440001"
  }'
```

---

### 6.2 Verify Payment

Verifies Razorpay payment signature and confirms payment.

| Property | Value |
|----------|-------|
| **Endpoint** | `POST /payments/verify-payment` |
| **Authentication** | Required |

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "razorpay_order_id": "order_NBhZgKqYtLz",
  "razorpay_payment_id": "pay_NBhZgKqYtLz",
  "razorpay_signature": "signature_string_from_razorpay"
}
```

| Field | Type | Description |
|-------|------|-------------|
| razorpay_order_id | string | Order ID from create-order response |
| razorpay_payment_id | string | Payment ID from Razorpay checkout |
| razorpay_signature | string | Signature from Razorpay checkout |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment verified and appointment confirmed"
}
```

**cURL:**
```bash
curl -X POST "{{BASE_URL}}/payments/verify-payment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "razorpay_order_id": "order_NBhZgKqYtLz",
    "razorpay_payment_id": "pay_NBhZgKqYtLz",
    "razorpay_signature": "signature_string_from_razorpay"
  }'
```

---

## JWT Token Structure

The JWT token contains the following payload:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "patient@example.com",
  "type": "patient",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "iat": 1708000000,
  "exp": 1708604800
}
```

| Field | Description |
|-------|-------------|
| id | User's unique identifier |
| email | User's email address |
| type | User type (`patient` or `doctor`) |
| patientId | Patient's UUID (only for patients) |
| iat | Token issued at timestamp |
| exp | Token expiry timestamp (7 days from issue) |

---

## Enums Reference

### Gender
```
MALE | FEMALE | OTHER | PREFER_NOT_TO_SAY
```

### Available Days
```
MONDAY | TUESDAY | WEDNESDAY | THURSDAY | FRIDAY | SATURDAY | SUNDAY
```

### Appointment Status
```
PENDING | CONFIRMED | CANCELLED | COMPLETED
```

### Onboarding Steps (Patient)
```
EMAIL_VERIFIED | PERSONAL_INFO_COMPLETE
```

---

## Error Handling

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "No token provided"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "message": "Patient not found"
}
```

---

## Postman Collection Variables

Set these variables in your Postman environment:

| Variable | Example Value |
|----------|---------------|
| `BASE_URL` | `http://localhost:3000` |
| `JWT_TOKEN` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `PATIENT_ID` | `550e8400-e29b-41d4-a716-446655440000` |
| `DOCTOR_ID` | `660e8400-e29b-41d4-a716-446655440001` |
| `APPOINTMENT_ID` | `770e8400-e29b-41d4-a716-446655440001` |

---

## Implementation Notes

### Features Currently Unavailable (Under Development)

1. **Patient Appointment Request**
   - Currently appointments can only be scheduled by doctors
   - Patient-initiated appointment request API is pending

2. **AI Chat**
   - No endpoints available yet
   - Under development

3. **Video Call Integration**
   - Agora integration pending
   - `meetingName` field exists in appointments for future use

---

## Contact

For API issues or questions, contact the backend team.

**Document Version:** 1.0
**Last Updated:** February 2024
