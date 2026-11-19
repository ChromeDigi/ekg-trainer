/* Rhythm library: data only. Criteria, generator ranges, teaching text, sources.
   Every clinical statement cites ids from docs/sources.md. review: "pending" until the
   nurse checks it. Generator ranges sit inside the criteria with a margin, so a strip is
   never borderline (borderline cases come in a later phase, on purpose). */
(function (root) {
  "use strict";

  // Feature criteria used by the answer key and the "why not" explanations.
  // rate: [min, max] in /min (inclusive), null = any. regular: true/false.
  // p: true = upright P before every QRS, false = no organized P waves.
  // wide: true = QRS 0.12 s or more.
  const rhythms = [
    {
      id: "nsr",
      name: "Normal sinus rhythm",
      short: "NSR",
      lethal: false,
      review: "pending",
      criteria: { rate: [60, 100], regular: true, p: true, wide: false },
      gen: { atrial: "sinus", rate: [62, 98], pr: [0.13, 0.19], qrs: [0.07, 0.10], jitter: 0.012 },
      teach: {
        rate: "60 to 100/min",
        regularity: "Regular",
        p: "Upright in lead II, one before every QRS, all alike",
        pr: "0.12 to 0.20 s and constant",
        qrs: "Narrow, under 0.12 s"
      },
      lookalikes: ["brady", "tach", "afib"],
      tellApart: "Same shape as sinus brady and sinus tach. Rate is the only difference, so measure it.",
      sources: ["S2", "S1"]
    },
    {
      id: "brady",
      name: "Sinus bradycardia",
      short: "Sinus brady",
      lethal: false,
      review: "pending",
      criteria: { rate: [0, 59], regular: true, p: true, wide: false },
      gen: { atrial: "sinus", rate: [40, 54], pr: [0.13, 0.19], qrs: [0.07, 0.10], jitter: 0.015 },
      teach: {
        rate: "Under 60/min",
        regularity: "Regular",
        p: "Upright in lead II, one before every QRS",
        pr: "0.12 to 0.20 s and constant",
        qrs: "Narrow, under 0.12 s"
      },
      lookalikes: ["nsr", "afib", "tach"],
      tellApart: "Everything looks like NSR except the rate. A long PR or dropped beats would mean a block, not plain brady.",
      note: "Exams and most nursing references use under 60. The 2018 ACC/AHA/HRS bradycardia guideline uses under 50 for its own definition, so don't be thrown if you see that number.",
      sources: ["S3", "S1", "S9"]
    },
    {
      id: "tach",
      name: "Sinus tachycardia",
      short: "Sinus tach",
      lethal: false,
      review: "pending",
      criteria: { rate: [101, 400], regular: true, p: true, wide: false },
      gen: { atrial: "sinus", rate: [106, 148], pr: [0.12, 0.17], qrs: [0.07, 0.10], jitter: 0.01 },
      teach: {
        rate: "Over 100/min",
        regularity: "Regular",
        p: "Upright, one before every QRS (at fast rates the P can sit on the end of the T wave)",
        pr: "0.12 to 0.20 s and constant",
        qrs: "Narrow, under 0.12 s"
      },
      lookalikes: ["nsr", "afib", "vt"],
      tellApart: "Narrow and regular with a P in front of each QRS. If you can't find any P waves at all, think of other tachycardias (more of those in phase 2).",
      sources: ["S4", "S1"]
    },
    {
      id: "afib",
      name: "Atrial fibrillation",
      short: "AFib",
      lethal: false,
      review: "pending",
      criteria: { rate: null, regular: false, p: false, wide: false },
      gen: { atrial: "fib", rate: [70, 145], qrs: [0.07, 0.10], irregularity: [0.16, 0.26] },
      teach: {
        rate: "Any. Over 100/min is called AFib with RVR (rapid ventricular response)",
        regularity: "Irregularly irregular: no pattern to the R-R intervals",
        p: "None. Wavy or flat baseline (fibrillatory waves, fine or coarse)",
        pr: "None to measure",
        qrs: "Usually narrow, under 0.12 s"
      },
      lookalikes: ["nsr", "tach", "brady"],
      tellApart: "Check the R-R intervals first. Truly random spacing with no P waves is AFib. Don't mistake the bumpy baseline for P waves.",
      sources: ["S5", "S6"]
    },
    {
      id: "vt",
      name: "Ventricular tachycardia (monomorphic)",
      short: "VT",
      lethal: true,
      review: "pending",
      criteria: { rate: [101, 400], regular: true, p: false, wide: true },
      gen: { atrial: "none", rate: [140, 210], qrs: [0.14, 0.18], jitter: 0.01 },
      teach: {
        rate: "Over 100/min (3 or more beats in a row)",
        regularity: "Usually regular",
        p: "Not seen, or not related to the QRS",
        pr: "None to measure",
        qrs: "Wide, 0.12 s or more, all the same shape"
      },
      lookalikes: ["tach", "afib", "nsr"],
      tellApart: "Wide and fast with every complex the same shape. A lethal rhythm on exams: never miss it. Check the patient first in real life.",
      sources: ["S7", "S8"]
    }
  ];

  const byId = {};
  rhythms.forEach(function (r) { byId[r.id] = r; });

  const sources = {
    S1: { label: "StatPearls: Electrocardiogram (NCBI Bookshelf)", url: "https://www.ncbi.nlm.nih.gov/books/NBK549803/" },
    S2: { label: "LITFL ECG Library: Normal Sinus Rhythm", url: "https://litfl.com/normal-sinus-rhythm-ecg-library/" },
    S3: { label: "LITFL ECG Library: Sinus Bradycardia", url: "https://litfl.com/sinus-bradycardia-ecg-library/" },
    S4: { label: "LITFL ECG Library: Sinus Tachycardia", url: "https://litfl.com/sinus-tachycardia-ecg-library/" },
    S5: { label: "2023 ACC/AHA/ACCP/HRS Atrial Fibrillation Guideline (ACC summary)", url: "https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2023/11/27/19/46/2023-acc-guideline-for-af-gl-af" },
    S6: { label: "LITFL ECG Library: Atrial Fibrillation", url: "https://litfl.com/atrial-fibrillation-ecg-library/" },
    S7: { label: "StatPearls: Ventricular Tachycardia (NCBI Bookshelf)", url: "https://www.ncbi.nlm.nih.gov/books/NBK532954/" },
    S8: { label: "Diagnosis and management of ventricular tachycardia (PMC review)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10541285/" },
    S9: { label: "2018 ACC/AHA/HRS Bradycardia Guideline (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/30412709/" },
    S10: { label: "McSharry et al. 2003, synthetic ECG model (PhysioNet ECGSYN)", url: "https://physionet.org/content/ecgsyn/1.0.0/" }
  };

  const approach = [
    ["Rate", "Regular: 1500 ÷ small boxes between two R waves. Irregular: count QRS in 6 seconds × 10."],
    ["Regularity", "Are the R-R intervals the same? Use the calipers or a paper edge."],
    ["P waves", "Is there one upright P before every QRS, all the same shape?"],
    ["PR interval", "0.12 to 0.20 s (3 to 5 small boxes), and the same every beat?"],
    ["QRS", "Narrow is under 0.12 s (under 3 small boxes). Wide is 0.12 s or more."]
  ];

  const api = { list: rhythms, byId: byId, sources: sources, approach: approach };
  root.EKG = root.EKG || {};
  root.EKG.rhythms = api;
})(typeof window !== "undefined" ? window : globalThis);
