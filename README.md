# PelliScope Europe

European product preview for patients, clinicians, and clinics.

## Pages

- `/` — patient experience
- `/doctors.html` — clinician experience
- `/clinics.html` — clinic partnership experience

The static site is deployed through GitHub Actions.

## Try Now screening

The home page contains a lazy-loaded screening modal. It calls
`POST /public/v1/screen` in the existing PelliScope LiteRT backend. With the
visitor's explicit Community permission, the backend sanitizes the photographs,
stores them in the existing protected Community upload bucket, and creates a
pending moderation packet. The marketing site does not create a patient account
or ordinary patient case, and nothing reaches the Doqlin partner API until an
authorized administrator approves that packet.

GitHub repository variables used by the production build:

- `PUBLIC_SCREENING_API_BASE` — the existing PelliScope Cloud Run URL.
- `PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` — the reCAPTCHA Enterprise site key
  registered for `pelliscope.eu` in Firebase App Check.

The backend route remains disabled until the Cloud Run deployment explicitly
sets `PUBLIC_SCREENING_ENABLED=true`. See the application repository document
`docs/try-now-public-screening.md` before enabling it.
