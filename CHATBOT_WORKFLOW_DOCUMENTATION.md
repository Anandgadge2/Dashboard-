# 📱 WhatsApp Chatbot - Complete Workflow Documentation

## 🎯 Overview

This document describes the complete workflow, chat flow, and technical architecture of the Zilla Parishad Amravati WhatsApp Chatbot system.

---

## 🔄 **Complete System Flow**

### **1. Message Reception Flow**

```
WhatsApp User → WhatsApp Business API → Webhook Endpoint → Message Processing
```

#### **Step-by-Step:**

1. **User sends message** via WhatsApp
2. **WhatsApp Business API** receives message
3. **Webhook POST** to `/webhook` or `/api/webhook/whatsapp`
4. **Idempotency Check** - Prevents duplicate processing (Redis-based, 48hr TTL)
5. **Message Type Detection:**
   - Text messages → `handleIncomingMessage()`
   - Interactive (buttons/lists) → `handleInteractiveMessage()`
   - Audio/Voice → Special handling
6. **Session Management:**
   - Get/create session from Redis (with MongoDB fallback)
   - Acquire distributed lock (prevents concurrent access)
   - Load session state (step, language, data)
7. **Message Processing** → `processWhatsAppMessage()`

---

## 💬 **Chat Flow & User Experience**

### **Phase 1: Initial Contact & Language Selection**

#### **User Action:**
- User sends any message (e.g., "Hi", "Hello", or just starts chatting)

#### **Bot Response:**
```
🇮🇳 Zilla Parishad Amravati - Official Digital Portal

Namaskar! Welcome to the official WhatsApp service of Zilla Parishad Amravati.

We are dedicated to providing transparent and efficient services to all citizens.

👇 Please select your preferred language:

[🇬🇧 English] [🇮🇳 हिंदी] [🇮🇳 मराठी]
```

#### **Technical Details:**
- **Session State:** `step: 'language_selection'`
- **Session Storage:** Redis (60min TTL) + MongoDB backup
- **Language Options:** English, Hindi, Marathi

---

### **Phase 2: Main Menu**

#### **User Action:**
- Selects language (button click or text: "1", "2", "3", "english", "hindi", "marathi")

#### **Bot Response:**
```
🏛️ Citizen Services Menu

Welcome to the Zilla Parishad Digital Helpdesk.

👇 Please select a service from the options below:

[📝 File Grievance] [📅 Book Appointment] [🔍 Track Status] [ℹ️ Help & Contact]
```

#### **Technical Details:**
- **Session State:** `step: 'main_menu'`
- **Available Services:**
  - Grievance Filing
  - Appointment Booking
  - Status Tracking
  - Help & Contact

---

## 📝 **GRIEVANCE FLOW - Complete Journey**

### **Step 1: Start Grievance**

**User:** Clicks "📝 File Grievance" button

**Bot:**
```
📝 Register a Grievance

You can file a formal complaint regarding any ZP department.

To begin, please provide the details as requested.

👤 Citizen Identification

Please enter your Full Name as it appears on official documents:
```

**Session State:** `step: 'grievance_name'`

---

### **Step 2: Enter Name**

**User:** Types name (e.g., "Rajesh Kumar")

**Validation:**
- Minimum 2 characters
- If invalid → Error message + retry

**Bot:** (After valid name)
```
🏢 Department Selection

Select the relevant department:

[View Departments] (List with all departments)
```

**Session State:** `step: 'grievance_category'`
**Session Data:** `{ citizenName: "Rajesh Kumar" }`

---

### **Step 3: Select Department**

**User:** Selects department from list/buttons

**Bot:**
```
✍️ Grievance Details

Please type a detailed description of your issue.

Tip: Include dates, location, and specific details for faster resolution.
```

**Session State:** `step: 'grievance_description'`
**Session Data:** 
```json
{
  citizenName: "Rajesh Kumar",
  departmentId: "ObjectId...",
  departmentName: "Health Department",
  category: "Health Department"
}
```

---

### **Step 4: Enter Description**

**User:** Types detailed description (e.g., "Water supply issue in Ward 5 for past 2 weeks")

**Validation:**
- Minimum 10 characters
- If invalid → Error message + retry

**Bot:**
```
📍 Location Details

Please provide the location associated with this issue.

👇 Select an option:

[✍️ Type Address] [⏭️ Skip]
```

**Session State:** `step: 'grievance_location'`
**Session Data:** `{ description: "Water supply issue..." }`

---

### **Step 5: Location (Optional)**

**Option A - User clicks "Type Address":**
- Bot asks: "📍 Please type the address:"
- User types address
- Session Data: `{ address: "Ward 5, Amravati" }`

**Option B - User clicks "Skip":**
- Location skipped
- Proceeds to next step

**Bot:**
```
📷 Supporting Evidence

Upload a photo or document to support your claim (Optional).

👇 Select an option:

[📤 Upload] [⏭️ Skip]
```

**Session State:** `step: 'grievance_photo'`

---

### **Step 6: Media Upload (Optional)**

**Option A - User clicks "Upload":**
- Bot: "📷 Please upload the image/document now:"
- User uploads image/document
- Media uploaded to Cloudinary
- Session Data: `{ media: ["cloudinary_url"] }`

**Option B - User clicks "Skip":**
- No media attached

**Bot:**
```
⚡ Urgency Level

Select the priority level for this issue:

[🟢 Low] [🟡 Medium] [🔴 High]
```

**Session State:** `step: 'grievance_priority'`

---

### **Step 7: Select Priority**

**User:** Selects priority (Low/Medium/High)

**Session Data:** `{ priority: "HIGH" }`

**Bot:**
```
📋 Confirm Submission

Please verify your details:

👤 Name: Rajesh Kumar
🏢 Dept: Health Department
📝 Issue: Water supply issue in Ward 5 for past 2 weeks...

👇 Is this correct?

[✅ Submit Grievance] [❌ Cancel]
```

**Session State:** `step: 'grievance_confirm'`

---

### **Step 8: Confirmation**

**User:** Clicks "✅ Submit Grievance"

**Backend Processing:**
1. **Atomic ID Generation:**
   - Uses MongoDB Counter collection
   - Generates unique ID: `GRV00000001` (prevents race conditions)
   
2. **Create Grievance:**
   ```javascript
   {
     grievanceId: "GRV00000001",
     companyId: ObjectId("..."),
     departmentId: ObjectId("..."),
     citizenName: "Rajesh Kumar",
     citizenPhone: "+91XXXXXXXXXX",
     citizenWhatsApp: "+91XXXXXXXXXX",
     description: "Water supply issue...",
     category: "Health Department",
     priority: "HIGH",
     location: { address: "Ward 5, Amravati" },
     media: ["cloudinary_url"],
     status: "PENDING",
     language: "en"
   }
   ```

3. **Notifications Sent:**
   - **WhatsApp** to Department Admin
   - **Email** to Department Admin
   - Both include grievance details and reference number

**Bot:**
```
✅ Grievance Registered Successfully

Your complaint has been logged in our system.

🎫 Ref No: GRV00000001
🏢 Dept: Health Department
📅 Date: 15/01/2024

You will receive updates via SMS/WhatsApp.

Thank you for helping us improve our services.
```

**Session:** Cleared (user can start new conversation)

---

## 📅 **APPOINTMENT FLOW - Complete Journey**

### **Step 1: Start Appointment**

**User:** Clicks "📅 Book Appointment" button

**Bot:**
```
📅 Book an Official Appointment

Schedule a meeting with government officials.

👇 Select the Department:

[View Departments] (List with all departments)
```

**Session State:** `step: 'appointment_department'`

---

### **Step 2: Select Department**

**User:** Selects department

**Bot:**
```
📅 New Appointment

Department: Health Department

Please enter your Full Name:
```

**Session State:** `step: 'appointment_name'`
**Session Data:** `{ departmentId: "...", departmentName: "Health Department" }`

---

### **Step 3: Enter Name**

**User:** Types name

**Validation:** Minimum 2 characters

**Bot:**
```
🎯 Purpose

Please specify the purpose of the visit (min 5 chars):
```

**Session State:** `step: 'appointment_purpose'`
**Session Data:** `{ citizenName: "Rajesh Kumar" }`

---

### **Step 4: Enter Purpose**

**User:** Types purpose (e.g., "Meeting regarding health camp registration")

**Validation:** Minimum 5 characters

**Bot:**
```
🗓️ Select Date

Choose a convenient date:

[Mon, 16 Jan] [Tue, 17 Jan] [Wed, 18 Jan]
```

**Session State:** `step: 'appointment_date'`
**Session Data:** `{ purpose: "Meeting regarding..." }`

---

### **Step 5: Select Date**

**User:** Selects date

**Bot:**
```
⏰ Select Time Slot

Choose a time for your visit:

[10:00 AM] [11:00 AM] [12:00 PM] [2:00 PM] [3:00 PM] [4:00 PM]
```

**Session State:** `step: 'appointment_time'`
**Session Data:** `{ appointmentDate: "2024-01-16" }`

---

### **Step 6: Select Time**

**User:** Selects time slot

**Bot:**
```
📋 Confirm Booking

Please verify your details:

👤 Name: Rajesh Kumar
🏢 Dept: Health Department
🎯 Purpose: Meeting regarding health camp registration
📅 Date: Monday, 16 January 2024
⏰ Time: 10:00 AM

👇 Is this correct?

[✅ Confirm Booking] [❌ Cancel]
```

**Session State:** `step: 'appointment_confirm'`
**Session Data:** `{ appointmentTime: "10:00 AM" }`

---

### **Step 7: Confirmation**

**User:** Clicks "✅ Confirm Booking"

**Backend Processing:**
1. **Atomic ID Generation:**
   - Generates unique ID: `APT00000001`
   
2. **Create Appointment:**
   ```javascript
   {
     appointmentId: "APT00000001",
     companyId: ObjectId("..."),
     departmentId: ObjectId("..."),
     citizenName: "Rajesh Kumar",
     citizenPhone: "+91XXXXXXXXXX",
     citizenWhatsApp: "+91XXXXXXXXXX",
     purpose: "Meeting regarding...",
     appointmentDate: Date("2024-01-16"),
     appointmentTime: "10:00 AM",
     status: "PENDING"
   }
   ```

3. **Notifications Sent:**
   - **WhatsApp** to Department Admin
   - **Email** to Department Admin

**Bot:**
```
✅ Appointment Booked Successfully

Your appointment has been confirmed.

🎫 Ref No: APT00000001
🏢 Dept: Health Department
📅 Date: Monday, 16 January 2024
⏰ Time: 10:00 AM

Please arrive 10 minutes before your scheduled time.

Thank you for using our services.
```

**Session:** Cleared

---

## 🔍 **STATUS TRACKING FLOW**

### **Step 1: Request Status**

**User:** Clicks "🔍 Track Status" button

**Bot:**
```
🔍 Status Inquiry

Enter your Reference Number below to check the current status.
```

**Session State:** `step: 'track_status'`

---

### **Step 2: Enter Reference Number**

**User:** Types reference number (e.g., "GRV00000001" or "APT00000001")

**Security Implementation:**
1. **Exact Match:** If format is `GRV00000001` or `APT00000001` → Direct lookup
2. **Phone Lookup:** Only if:
   - User provides phone number AND
   - Exactly ONE record exists for that phone
   - If multiple records → Requires exact reference number

**Bot Response (Grievance Found):**
```
📌 Grievance Status

Date: 15/01/2024
🎫 Ref No: GRV00000001

🏢 Dept: Health Department
📂 Category: Health Department
📊 Status: ✅ RESOLVED
⚡ Priority: HIGH

📝 Details: Water supply issue in Ward 5 for past 2 weeks...

For further assistance, contact the department directly.
```

**Bot Response (Appointment Found):**
```
🗓️ Appointment Status

Date: 16/01/2024
⏰ Time: 10:00 AM
🎫 Ref No: APT00000001

🏢 Dept: Health Department
👤 Name: Rajesh Kumar
📊 Status: ✅ CONFIRMED

🎯 Purpose: Meeting regarding health camp registration

Please arrive 10 minutes before your scheduled time.
```

**Bot Response (Not Found):**
```
⚠️ No Record Found

We could not find a record with reference number: GRV00000001

Please verify the reference number and try again.

[🔍 Track Another] [↩️ Main Menu]
```

**Session State:** `step: 'awaiting_menu'`

---

## 🔐 **Security & Data Protection Features**

### **1. Session Management**
- **Redis Storage:** Primary storage with 60-minute TTL
- **MongoDB Backup:** Persistent storage for recovery
- **In-Memory Fallback:** If Redis unavailable
- **Distributed Locking:** Prevents concurrent session corruption

### **2. Idempotency Protection**
- **Message Deduplication:** Tracks processed messageIds in Redis
- **48-Hour TTL:** Prevents duplicate webhook processing
- **Race Condition Prevention:** Atomic operations

### **3. Status Tracking Security**
- **Exact Reference Required:** For specific lookups
- **Phone Lookup Restriction:** Only if exactly ONE record exists
- **Multiple Records:** Forces reference number requirement
- **Privacy Protection:** Prevents unauthorized data access

### **4. Atomic ID Generation**
- **Counter Collection:** MongoDB-based atomic counters
- **No Race Conditions:** Guaranteed unique IDs
- **Format:** `GRV00000001`, `APT00000001`

---

## 📊 **Session State Machine**

```
start
  ↓
language_selection
  ↓
main_menu
  ↓
├─→ grievance_name → grievance_category → grievance_description → 
│   grievance_location → grievance_photo → grievance_priority → 
│   grievance_confirm → [CREATE] → clear
│
├─→ appointment_department → appointment_name → appointment_purpose → 
│   appointment_date → appointment_time → appointment_confirm → 
│   [CREATE] → clear
│
├─→ track_status → [DISPLAY] → awaiting_menu
│
└─→ help → main_menu
```

---

## 🔔 **Notification Flow**

### **On Grievance Creation:**
1. **Department Admin** receives:
   - **WhatsApp:** Grievance details + reference number
   - **Email:** Full grievance details with attachments

### **On Appointment Creation:**
1. **Department Admin** receives:
   - **WhatsApp:** Appointment details + reference number
   - **Email:** Full appointment details

### **On Status Change (Resolution):**
1. **Citizen** receives:
   - **WhatsApp:** Resolution update with remarks
2. **Hierarchy** receives (Email + WhatsApp):
   - Company Admin
   - Department Admin
   - Assigned User

---

## 🛠️ **Technical Architecture**

### **Components:**

1. **Webhook Handler** (`whatsapp.routes.ts`)
   - Receives WhatsApp webhooks
   - Idempotency checking
   - Message routing

2. **Chatbot Engine** (`chatbotEngine.ts`)
   - Main message processor
   - Flow management
   - State machine logic

3. **Session Service** (`sessionService.ts`)
   - Redis-based session storage
   - Distributed locking
   - Session persistence

4. **ID Generator** (`idGenerator.ts`)
   - Atomic counter operations
   - Unique ID generation

5. **Notification Service** (`notificationService.ts`)
   - WhatsApp notifications
   - Email notifications
   - Multi-channel delivery

6. **WhatsApp Service** (`whatsappService.ts`)
   - API integration
   - Message sending
   - Button/list rendering

---

## 📱 **User Commands & Responses**

### **Global Commands:**
- **"Hi" / "Hello"** → Restart conversation
- **"Menu"** → Show main menu
- **"Help"** → Show help information
- **"Exit" / "Bye"** → End conversation

### **Unrecognized Input:**
```
⚠️ Unrecognized Input

I didn't understand that. Please use the buttons provided or type one of these commands:

• "Hi" or "Hello" - Start over
• "Menu" - Show main menu
• "Help" - Get assistance
• "Track" - Track status

Or select an option from the buttons above.
```

---

## 🎨 **Multi-Language Support**

All messages support:
- **English** (en)
- **Hindi** (hi)
- **Marathi** (mr)

Language is selected at the start and persists throughout the session.

---

## ✅ **Error Handling**

1. **Invalid Input:** Clear error messages with retry options
2. **Session Expiry:** Automatic session cleanup (60 minutes)
3. **Service Unavailable:** Graceful degradation
4. **Network Errors:** Retry mechanisms
5. **Validation Errors:** User-friendly messages

---

## 🔄 **Complete Example Conversation**

```
User: Hi
Bot: [Language Selection]
User: [Clicks English]
Bot: [Main Menu]
User: [Clicks File Grievance]
Bot: Enter your full name
User: Rajesh Kumar
Bot: [Department List]
User: [Selects Health Department]
Bot: Enter grievance description
User: Water supply issue in Ward 5
Bot: [Location Options]
User: [Clicks Type Address]
Bot: Please type the address
User: Ward 5, Amravati
Bot: [Media Upload Options]
User: [Clicks Skip]
Bot: [Priority Selection]
User: [Clicks High]
Bot: [Confirmation Screen]
User: [Clicks Submit]
Bot: ✅ Grievance Registered Successfully
     🎫 Ref No: GRV00000001
     ...
```

---

## 📈 **Performance & Scalability**

- **Redis Caching:** Fast session access
- **Atomic Operations:** No race conditions
- **Distributed Locks:** Concurrent message handling
- **Idempotency:** Prevents duplicate processing
- **MongoDB Persistence:** Data reliability
- **Cloudinary:** Media storage optimization

---

This workflow ensures a smooth, secure, and user-friendly experience for citizens interacting with the Zilla Parishad Amravati WhatsApp chatbot system.
