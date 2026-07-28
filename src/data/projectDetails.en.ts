import type { ProjectDetail } from '../types';

/**
 * Expanded project detail (overlay). The record key is the Project.id of the
 * card that opens it — a project with no entry here is simply not clickable.
 */
export const projectDetails: Record<string, ProjectDetail> = {
  tallerapp: {
    id: 'tallerapp',
    title: 'TallerApp',
    subtitle: 'Auto repair shop management system · Final degree project · Grade 9/10',
    badges: ['Angular 21', 'NestJS 11', 'PostgreSQL'],
    hero: {
      shot: 'login',
      alt: 'TallerApp sign-in screen with the workshop login form',
    },
    intro: [
      'TallerApp is my final degree project: a complete management application for a multi-brand auto repair shop, built to carry the real workload of a small-to-medium workshop, not a showcase demo.',
      'The differentiating core is the scheduler: when a mechanic is assigned to a repair order, the system automatically computes that mechanic’s next available slot within working hours (8-14 and 15-19, Monday to Friday) and chains the job right behind their current queue, with no overlaps possible, by design.',
      'The critical business rules are centralised in a cross-cutting layer: independent state machines for the repair order and for the invoice, each with its own guards (an unfinished order cannot be invoiced, a paid invoice can only be voided by issuing a corrective invoice under Spanish RD 1619/2012, and so on). Every important flow — login, logout, creations, modifications, voidings — is audited, with access restricted by role.',
      'The notification layer combines synchronous events (when something actionable happens right then: a new order, low stock, an issued invoice) with three scheduled tasks that review what is not instantaneous — overdue invoices, unassigned orders, unconfirmed appointments.',
      'The project is covered by 259 unit tests across 18 suites plus 5 smoke e2e tests, with 12 seed scripts sized on real industry statistics. It was deployed in production (Ubuntu VPS, nginx, systemd) during the defence, with the dissertation written in LaTeX. Final grade: 9.',
    ],
    sections: [
      {
        shot: 'login',
        alt: 'TallerApp sign-in screen with the workshop login form',
        title: 'Login and authentication',
        paragraphs: [
          'A single sign-in screen for the shop’s three roles (Administrator, Shop Manager, Mechanic) — the role travels already resolved inside the login response and signs the JWT.',
          'The central technical decision: the SPA never touches the token. The backend sets the JWT as an httpOnly + sameSite=strict cookie, secure in production, so no client-side script can read it — the natural protection against XSS. The interceptor only turns on withCredentials so the browser attaches the cookie automatically, and the authentication strategy also accepts a Bearer header as an alternative path for tools such as Swagger or curl during development.',
          'Authorisation is revalidated in two layers: the route guard in Angular filters what each role sees as a user-experience layer, and the backend revalidates the role on every request by reading the JWT, additionally reloading the user from the database to check they are still active.',
          'Every successful login and every logout is audited with the IP address. Failed attempts are not recorded individually — rate limiting (5 attempts per minute per IP) already contains brute force, so the audit trail focuses on the system’s legitimate activity.',
        ],
      },
      {
        shot: 'dashboard',
        alt: 'TallerApp dashboard with the month’s indicators and the weekly appointment calendar',
        title: 'Operational dashboard and appointment calendar',
        paragraphs: [
          'The panel’s four indicators (monthly revenue, vehicles in the shop, stock alerts, today’s appointments) are computed with direct aggregate queries against PostgreSQL on every load, with no intermediate cache layers.',
          'The stock alert threshold is configurable per part, and triggers both the dashboard counter and the corresponding notification.',
          'The weekly calendar shows customer appointments, colour-coded by status and with direct access to each one’s detail. The scheduler’s output — each job’s estimated completion date, computed by the assignment engine — is consulted in the detail of each repair order, where the heaviest logic of the project lives.',
          'Notifications combine events generated on the spot (a new order, low stock, an issued invoice) with three scheduled tasks covering what is not instantaneous: overdue invoices, orders unassigned for more than three days, and unconfirmed appointments. It is a system separate from the audit trail: one alerts a human about something actionable, the other leaves a forensic record of who did what.',
        ],
      },
      {
        shot: 'factura',
        alt: 'Detail of a TallerApp invoice with its line items and amounts (fictional data)',
        title: 'Invoicing and PDF generation (fictional data)',
        paragraphs: [
          'The invoice PDF is generated on the client itself and downloaded straight to the user’s machine. The email notice is a separate document: an HTML built on the backend with the invoice’s key data (number, amount, dates, IBAN), designed to notify without depending on attachments.',
          'The invoice state machine follows the Issued → Paid → Voided cycle, with a rule grounded in regulation: a paid invoice can be voided by issuing a corrective invoice, never by deleting it, in accordance with Spanish RD 1619/2012 on payment reversal.',
          'The due date is treated as a fact derived from the current date, not as a value that depends on a scheduled process updating it: every morning, the system reviews issued invoices whose due date has already passed and generates the corresponding notice.',
          'Every invoice line supports a percentage discount, correctly computed and applied to the final amount — the basis for special rates or one-off negotiations per customer.',
        ],
      },
      {
        shot: 'inventario',
        alt: 'TallerApp inventory list with the stock traffic light and the total value summary',
        title: 'Inventory and stock traceability',
        paragraphs: [
          'The parts list uses a traffic light based on proximity to the configured minimum: below the threshold it flags a low-stock alert, feeding both the dashboard counter and the notification system, with a second visual level that anticipates which parts are approaching that point.',
          'Every stock movement — consumption when a part is used in an order, reversal when a line is deleted, replenishment through the restocking flow — is recorded in a history with type and reason, which makes it possible to reconstruct at any moment how each reference reached its current level.',
          'The panel summarises at a glance the total stock value, the number of references and the parts below minimum, computed over the loaded catalogue.',
        ],
      },
      {
        shot: 'ordenes',
        alt: 'TallerApp repair orders with the mechanic assignment dropdown open',
        title: 'Mechanic assignment and scheduling engine',
        paragraphs: [
          'This dropdown is the centrepiece of the scheduler. When assigning (or reassigning) a mechanic to an order, the system computes that professional’s next available slot within working hours and chains the new job right behind their current queue, with no overlaps possible by construction. The result — start date, end date and estimated date — is audited and generates a notification to the mechanic with their start time.',
          'The order state machine follows the Created → Assigned → In Progress → Finished → Invoiced flow, with two backward transitions deliberately allowed: from Finished to In Progress, to reopen a job if a defect is found after closing, and from In Progress to Assigned, to correct an assignment. Invoiced is the only terminal state. Four business guards protect the flow: an unfinished order cannot be invoiced, an order admits a single invoice, and lines of an already closed order cannot be modified.',
          'Choosing "Invoiced" in the dropdown triggers the creation of the corresponding invoice, and it is the invoice that drags the order into that state — the state is always the consequence of a real business fact, never a direct, isolated change.',
          'The counters (Pending, In Shop, Finished) and the filters by status, mechanic and customer are resolved over the data already loaded on the client, with chained signals — instant filtering, with no round trip to the server.',
        ],
      },
      {
        shot: 'modo-oscuro',
        alt: 'TallerApp in dark theme showing the system audit panel',
        title: 'Dark theme and system audit trail',
        paragraphs: [
          'Dark mode combines PrimeNG with a set of custom CSS variables under a single switching point: a class on the root element that both systems consume at once, avoiding duplicated theme logic between the component library and the custom styles. The dashboard calendar, depending on an external library with its own visual system, observes that class change to stay in sync with the rest of the interface.',
          'The audit panel is read-only: there is no write path to that table anywhere in the application, and access is restricted to Administrator and Shop Manager through role guards enforced on the backend. Each record ties together date, user, action and affected entity, leaving a clear trace of who did what and when — login, logout, creations, modifications and voidings are all covered.',
        ],
      },
    ],
    stackFull:
      'Angular 21 with PrimeNG, FullCalendar, Chart.js and jsPDF · NestJS 11 with TypeORM, PostgreSQL, JWT + Passport + bcrypt · Docker Compose · Vitest and Jest',
    // TODO: the TallerApp showcase repo does not exist yet. Once published,
    // uncomment and the link shows up on its own in the modal footer:
    // repo: { label: 'View showcase repo', href: 'https://github.com/masanco7/...' },
  },

  'gym-tracker': {
    id: 'gym-tracker',
    title: 'Gym Tracker',
    subtitle: 'Personal training PWA · In production since April 2026',
    badges: ['Angular 21', 'FastAPI', 'WebAuthn'],
    hero: {
      shot: 'login',
      alt: 'Gym Tracker sign-in screen with the Face ID entry button',
    },
    intro: [
      'Gym Tracker is my personal training log, a PWA I have used daily since April 2026. It comes from a concrete need: keeping track of my routines with full control over how progress and progressions are computed, without depending on a generic app.',
      'The heart of the project is a deterministic progression engine: cyclic double progression around a per-routine rep target, which automatically decides when to add reps and when to add weight, working over each exercise’s full history. A local language model (Ollama) only writes the natural-language summary — the progression decision never depends on the LLM.',
      'Day-to-day access is completely passwordless: passkeys (WebAuthn) verified on the server itself, with Face ID as the gesture that unlocks the device. Rest between sets is announced with real push notifications, which arrive even with the phone locked and the app closed. And the progress charts are hand-drawn in SVG, with no charting library in between.',
      'Built with Angular 21 zoneless and signals on the frontend, FastAPI on the backend, and persistence in JSON and CSV with atomic writes.',
    ],
    sections: [
      {
        shot: 'login',
        alt: 'Gym Tracker sign-in screen on desktop, with Face ID access and the username form',
        phoneShot: {
          shot: 'login-phone',
          alt: 'The same Gym Tracker sign-in screen in the PWA installed on the phone',
        },
        title: 'Login and passkeys',
        paragraphs: [
          'Day-to-day access uses no password: it is a standard passkey (WebAuthn), with Face ID as the gesture that unlocks the credential on the device itself. Verification happens directly on the server, with no intermediate service — the backend validates the cryptographic assertion with the standard WebAuthn library in Python.',
          'Registering a new passkey is done from Profile, each device with its own credential, which makes it possible to enrol the phone and the laptop separately. The username and password form always coexists as an alternative path, in case the device does not support biometrics or that route is simply preferred.',
        ],
      },
      {
        shot: 'hoy',
        alt: 'Gym Tracker Today screen with the day’s routine and the sets in progress',
        title: 'Today and autosave',
        paragraphs: [
          'The day’s routine resolves itself: the system consults the weekly planner (the same one edited in Routines) and shows the session due right away, with no need to look for it.',
          'While training, progress is saved locally on the device continuously — every weight and rep entered, every completed set. Closing the application mid-session loses nothing: on reopening, the session is restored in full, including the rest timer, which recomputes the remaining time against the real clock instead of relying on a counter that would have been left running in the background. A new personal record is computed when the session closes, comparing the maxima achieved against the whole history. The application works offline: if the upload to the server fails, the session is queued and syncs as soon as the network is back.',
        ],
      },
      {
        shot: 'historial',
        alt: 'Gym Tracker session history grouped by month, with tonnage and records',
        title: 'History',
        paragraphs: [
          'Every session is recorded with its total tonnage moved — the sum of weight times reps of every completed set — and the personal records achieved that day, grouped visually by month. Cardio sessions (such as walking) share the same data model as strength ones, distinguished simply by their exercise type, which keeps the whole history in a single coherent place.',
        ],
      },
      {
        shot: 'rutinas',
        alt: 'Gym Tracker routine catalogue with the weekly planner by day',
        title: 'Routines and weekly planner',
        paragraphs: [
          'The routine catalogue supports real supersets: two linked exercises where rest does not start until both complete the corresponding set, exactly the way a superset is actually trained at the gym. Each routine is assigned to one or more days of the week from a simple planner, and that mapping is exactly what the Today screen consults to know what is due each day.',
          'The warm-up lives as its own checklist, independent from the strength routines, reachable at any moment from a shortcut.',
        ],
      },
      {
        shot: 'ejercicios',
        alt: 'Gym Tracker exercise catalogue grouped by muscle group',
        title: 'Exercise catalogue',
        paragraphs: [
          'The catalogue starts from a base set and grows with custom exercises at any time, each defined by its name, its muscle group and its type (weight and reps, or time). As soon as an exercise accumulates any record in the history, it automatically becomes available on the Progress screen, with no additional configuration step.',
        ],
      },
      {
        shot: 'coach',
        alt: 'Gym Tracker Coach screen with per-exercise progression recommendations',
        title: 'Coach: automatic progression',
        paragraphs: [
          'A single button triggers a complete analysis of the training history. The logic that decides what to progress is entirely deterministic: cyclic double progression around a per-exercise rep target — if the top has not been reached, it suggests adding reps; if the top holds for several sessions, it suggests adding weight and starting the cycle again from the base. Time exercises follow their own progression towards the duration target.',
          'A language model run locally (Ollama) writes the natural-language summary that accompanies the recommendations — its only function is the wording; the progression decision is already made before the model intervenes, which keeps the system reliable even if the language model is unavailable at that moment.',
        ],
      },
      {
        shot: 'progreso',
        alt: 'Gym Tracker progress chart drawn in SVG, with record, current and starting values',
        title: 'Progress: hand-drawn charts',
        paragraphs: [
          'The evolution charts are built in pure SVG, with no visualisation library in between — a deliberate decision against far heavier alternatives for what actually needs showing: a progress line, a record and the current point. Each chart automatically scales the value range, keeps the line thickness constant regardless of screen size, and responds to touch or cursor with a dot marking the exact value on any given week.',
          'The time axis is built by calendar weeks, showing the recent evolution of each selected exercise, with the unit of measure (kilos, seconds or minutes) choosing itself according to the exercise type.',
        ],
      },
      {
        shot: 'perfil',
        alt: 'Gym Tracker profile with global statistics, rest alert and Face ID management',
        title: 'Profile: statistics and rest alert',
        paragraphs: [
          'The global summary gathers total sessions, accumulated tonnage and records achieved. The rest alert uses real operating-system push notifications — not an alert inside the tab itself — so it arrives even with the phone locked or the application closed, with a custom sound cue designed to be audible on a phone speaker even in silent mode, plus vibration.',
          'Registered passkeys are also managed from here, along with dark mode, which persists across sessions with no need to set it up again every time.',
        ],
      },
    ],
    stackFull:
      'Angular 21 zoneless with signals and standalone · TypeScript · Service Worker/PWA · Web Push + Web Audio API · WebAuthn/passkeys · Python 3.12 + FastAPI · Pydantic · filelock · atomic CSV/JSON persistence · Ollama',
    // TODO: the Gym Tracker showcase repo does not exist yet (the real repo is private).
    // Once published, uncomment and the link shows up on its own in the modal footer:
    // repo: { label: 'View showcase repo', href: 'https://github.com/masanco7/...' },
  },
};
