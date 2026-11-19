# Future module: photo and image import

Status: **documented only, optional.** Not needed to ship the trainer. Build only when the
privacy and accuracy rules below can be met.

## What it would do
- Option A, choose from Photos: an authorized educational ECG strip, screenshot or study page.
- Option B, take a photo with the iPhone camera.
- Crop, rotate, zoom, brighten or sharpen.
- Save permitted educational images to a private, on-device study collection.
- Pull text from study material and turn it into flashcards or review questions.
- Compare an imported educational strip with rhythm criteria: the learner places calipers
  on the photo (after calibrating to its grid) and the app checks their measurements
  against criteria. The learner decides; the app never declares a diagnosis.
- "Practice similar": jump to generated strips of the rhythm being studied.

## iPhone implementation
- A plain `<input type="file" accept="image/*">`: Safari offers Photo Library, Take Photo
  or Choose File. No persistent camera permission.
- Edit on a `<canvas>`, store in IndexedDB on the device. Nothing leaves the phone by default.
- Text: first choice is iOS Live Text (the user copies text themselves). Fully local OCR
  (Tesseract.js, Apache-2.0, several MB) only if needed; that is a dependency decision.

## Privacy rules (hard)
- Before the first import, the learner confirms the image is educational and authorized,
  with no patient identifiers, real clinical patient strips, confidential hospital
  material, protected exam questions or internal documents.
- If local text detection finds name, date of birth, MRN or similar patterns, warn and
  block saving until cropped out.
- No automatic upload, ever.
- External AI explanation, if ever offered: explicit opt-in each time, a screen showing
  exactly what will be sent and to whom, and the same promises as the rest of the app.
  Note: this needs a server or API key, which the app doesn't have today. Decide later.

## Accuracy rules
- Never claim clinical-grade interpretation. Imported images are never for patient care.
- Show uncertainty; when unsure, ask the learner to verify instead of inventing findings.
- Photos of strips are often skewed, low-contrast or partial: say so instead of guessing.

## Open decisions
- Is local OCR worth the size?
- Is any external AI analysis acceptable at all for this learner?
