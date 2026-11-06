# YardCard

A software solution designed for managing yard greeting, celebration lawn sign, and event signage rental businesses—handling inventory tracking, booking lifecycles, route dispatching, and invoicing.

---

## System Architecture

```
                       +-------------------+
                       |    Client Apps    |
                       | (Web / Mobile UI) |
                       +---------+---------+
                                 | HTTPS / WSS
                                 v
                       +-------------------+
                       |    API Gateway    |
                       +---------+---------+
                                 |
        +------------------------+------------------------+
        |                        |                        |
        v                        v                        v
+---------------+        +---------------+        +---------------+
| Booking & CRM |        |   Inventory   |        | Routing/Fleet |
|    Service    |        |    Service    |        |    Service    |
+-------+-------+        +-------+-------+        +-------+-------+
        |                        |                        |
        +------------------------+------------------------+
                                 |
                                 v
                       +-------------------+
                       | PostgreSQL / PostGIS
                       +-------------------+
```

---

## Core Modules & Features

### 1. Booking & Reservation Engine
- **Calendar Scheduling:** Date-window reservations for setup (drop-off) and takedown (pickup).
- **Custom Phrase Configurator:** Dynamic phrase construction with real-time inventory allocation (e.g., "HAPPY 40TH BIRTHDAY SARAH").
- **Add-on Bundling:** Graphic flair components (stars, balloons, sports items, hobbies).
- **Payment Processing:** Integrated deposit, damage hold, and balance collection.

### 2. Inventory & Asset Management
- **SKU & Character Tracking:** Discrete letter/number inventory per colorway and theme.
- **Stock Depletion Forecasting:** Dynamic availability checks preventing double-booking during active date ranges.
- **Condition Grading:** Wear-and-tear tracking per unit (stake damage, weather fading, replacement status).

### 3. Route & Dispatch Optimization
- **Geocoding & Territory Mapping:** Zone-based pricing and delivery feasibility verification.
- **Daily Route Generation:** Automated sequence generation for evening setups and morning pickups via traveling salesperson problem (TSP) heuristics.
- **Driver Mobile View:** Turn-by-turn order manifest, placement photo verification upload, and gate code notes.

---

## Data Models

### Booking Schema (`bookings`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `customer_id` | `UUID` | Foreign key referencing customers table |
| `event_date` | `DATE` | Target display date |
| `setup_window_start` | `TIMESTAMPTZ` | Scheduled delivery and setup start |
| `takedown_window_end` | `TIMESTAMPTZ` | Scheduled yard clearance completion |
| `phrase` | `VARCHAR(120)`| Letter sequence reserved for display |
| `theme_id` | `UUID` | Theme identifier (palette/style) |
| `status` | `ENUM` | `pending`, `confirmed`, `dispatched`, `completed`, `cancelled` |
| `delivery_address` | `JSONB` | Normalized address with lat/long coordinates |
| `total_amount` | `NUMERIC(10,2)`| Billed total |

### Inventory Item Schema (`inventory_items`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key |
| `character` | `CHAR(1)` | Specific character or graphic symbol code |
| `colorway` | `VARCHAR(32)` | Color scheme identifier |
| `category` | `ENUM` | `letter`, `number`, `punctuation`, `accent`, `stake` |
| `condition` | `ENUM` | `new`, `good`, `fair`, `damaged`, `retired` |
| `storage_bin` | `VARCHAR(16)` | Warehouse/rack location ID |

---

## API Specifications

### Create Booking
- **Endpoint:** `POST /api/v1/bookings`
- **Request Body:**
```json
{
  "customer_id": "8f9b2c3a-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "event_date": "2026-11-15",
  "phrase": "CONGRATS LIAM",
  "theme_id": "th_blue_glitter_01",
  "flairs": ["star_silver_lg", "balloon_navy", "soccer_ball"],
  "delivery_address": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "OR",
    "postal_code": "97477",
    "lat": 44.0462,
    "lng": -123.0220
  }
}
```
- **Response:** `201 Created`
```json
{
  "booking_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "status": "confirmed",
  "reserved_skus_count": 15,
  "route_zone": "ZONE_WEST"
}
```

### Check Phrase Availability
- **Endpoint:** `GET /api/v1/inventory/availability`
- **Query Parameters:**
  - `start_date` (ISO 8601)
  - `end_date` (ISO 8601)
  - `phrase` (string)
  - `theme_id` (string)
- **Response:** `200 OK`
```json
{
  "available": true,
  "conflicts": [],
  "alternative_themes": []
}
```

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Application listener port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/yardcard` |
| `REDIS_URL` | Cache and job queue connection string | `redis://localhost:6379/0` |
| `GEOCODING_API_KEY` | Provider key for map routing services | - |
| `STRIPE_SECRET_KEY` | Payment processing secret key | - |
| `JWT_SECRET` | Secret key for auth token signing | - |

---

## Local Development & Setup

### Prerequisites
- Node.js >= 20.x or Go >= 1.22 (depending on service targets)
- PostgreSQL >= 15 with PostGIS extension enabled
- Redis >= 7.x

### Run Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/organization/yardcard.git
   cd yardcard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run database migrations:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
5. Start local services:
   ```bash
   npm run dev
   ```