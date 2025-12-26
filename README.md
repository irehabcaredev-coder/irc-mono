# eCare Plus - Patient Frontend

Frontend application for eCare Plus patient portal. Built with Next.js, TailwindCSS, Zustand, and TanStack Query.

## Tech Stack

- **Next.js 14** (App Router) with JavaScript (JSX)
- **TailwindCSS** for styling
- **Zustand** for state management (filters, saved doctors, intent events)
- **TanStack Query (React Query)** for data fetching (currently using mock data)
- **Zod** for schema validation
- **Lucide React** for icons

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000/patients](http://localhost:3000/patients) to view the patient landing page.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.jsx          # Root layout with providers
│   ├── providers.jsx        # TanStack Query provider setup
│   ├── globals.css          # Global styles with Tailwind
│   └── patients/
│       └── page.jsx         # Patient landing page
├── components/
│   └── patients/
│       ├── Header.jsx       # Top header with logo and city selector
│       ├── Sidebar.jsx      # Left sidebar (desktop) / horizontal tabs (mobile)
│       └── DoctorCard.jsx  # Individual doctor card component
├── lib/
│   ├── schemas.js           # Zod schemas for doctor objects
│   ├── mockData.js          # Mock doctor data (12 entries)
│   └── filterDoctors.js     # Client-side filtering logic
└── store/
    └── usePatientStore.js   # Zustand store for state management
```

## Features

- **Doctor Search & Filtering**: Search by name, clinic, or locality; filter by specialty, consult mode, and language
- **Tab Navigation**: Filter by specialist type (Audiologist, Speech Therapist, etc.)
- **Saved Doctors**: Save/unsave doctors (stored in Zustand)
- **Intent Tracking**: Track user actions (call, WhatsApp, view profile, save) for analytics
- **Responsive Design**: Mobile-first with horizontal tabs on mobile, sidebar on desktop
- **Prescription-Style UI**: Medical document aesthetic with clean, minimal design

## Brand Colors

- Primary Blue: `#1D689B`
- Accent Red: `#D12B2C`
- Background Paper: `#F7F8FA`

## Mock Data

The application currently uses mock data with 12 doctors across various Indian cities (Bangalore, Mumbai, Delhi, Hyderabad, Chennai, Pune, Kolkata, etc.). The data structure is validated using Zod schemas.

## Future API Integration

The code is structured to easily swap mock data with real API calls:

1. Replace the `filterDoctors` function in `lib/filterDoctors.js` with an API call
2. Update the `useQuery` hook in `app/patients/page.jsx` to use the new API endpoint
3. The query keys are already set up to handle all filter states

## Notes

- No backend implementation - frontend only
- All state is managed client-side with Zustand
- Intent events are tracked locally (ready to be sent to backend later)
- No external API keys required
- Accessible HTML with semantic elements and focus states


