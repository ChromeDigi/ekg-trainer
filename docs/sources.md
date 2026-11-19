# Clinical sources

Every rhythm criterion in the app cites one of these ids (see `js/rhythms.js`). Add a
source here before using it. Verified 2026-11-19 through search results quoting each page;
direct page fetches were blocked by the build environment's network, so re-read the pages
themselves when the nurse reviews.

| Id | Source | Verified for |
|---|---|---|
| S1 | StatPearls: Electrocardiogram, https://www.ncbi.nlm.nih.gov/books/NBK549803/ | PR 120 to 200 ms (3 to 5 small squares); QRS under 120 ms (under 3 small squares), typically 60 to 100 ms |
| S2 | LITFL: Normal Sinus Rhythm, https://litfl.com/normal-sinus-rhythm-ecg-library/ | 60 to 100 bpm, regular, narrow; P before every QRS, upright in I and II; constant PR |
| S3 | LITFL: Sinus Bradycardia, https://litfl.com/sinus-bradycardia-ecg-library/ | Sinus rhythm under 60 bpm in adults |
| S4 | LITFL: Sinus Tachycardia, https://litfl.com/sinus-tachycardia-ecg-library/ | Sinus rhythm over 100 bpm in adults; at fast rates P may hide in the preceding T |
| S5 | 2023 ACC/AHA/ACCP/HRS AF guideline (ACC summary), https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2023/11/27/19/46/2023-acc-guideline-for-af-gl-af | ECG: irregular R-R (when AV conduction present), no distinct P waves, irregular atrial activity (fibrillatory waves) |
| S6 | LITFL: Atrial Fibrillation, https://litfl.com/atrial-fibrillation-ecg-library/ | Irregularly irregular, no P waves, fine (<0.5 mm) or coarse (>0.5 mm) f-waves; no pattern in R-R |
| S7 | StatPearls: Ventricular Tachycardia, https://www.ncbi.nlm.nih.gov/books/NBK532954/ | Wide complex tachycardia, 3 or more consecutive beats over 100/min |
| S8 | Diagnosis and management of VT (PMC review), https://pmc.ncbi.nlm.nih.gov/articles/PMC10541285/ | QRS over 120 ms, at least 3 beats over 100 bpm, usually regular |
| S9 | 2018 ACC/AHA/HRS Bradycardia Guideline, https://pubmed.ncbi.nlm.nih.gov/30412709/ | Uses sinus bradycardia under 50 bpm (seen in secondary summaries; confirm in the guideline's definitions) |
| S10 | McSharry et al. 2003, IEEE TBME 50(3):289-294; ECGSYN, https://physionet.org/content/ecgsyn/1.0.0/ | Sum-of-Gaussians P-QRS-T morphology approach used by the generator |

## Generator choices that are not shown to the user as facts
- AFib f-wave frequency 6 to 9 Hz (360 to 540/min): inside the commonly taught 350 to
  600/min, not verified against a primary source this session.
- QT scaled with rate using the Bazett form, QTc 0.38 to 0.43 s.
- Generated rates keep a margin from cutoffs (NSR 62 to 98, brady 40 to 54, tach 106 to
  148, VT 140 to 210) so no strip is borderline. Borderline strips are a later choice.

## Still to add
- AHA ACLS adult algorithms (phase 5 "what now").
- Temporary epicardial pacing and post-op AFib reviews (phase 6).
