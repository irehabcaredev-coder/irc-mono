// Prompt for the background lead-qualification task (cheap model, JSON output). Not user-editable.

export const LEAD_QUALIFICATION_PROMPT = `You assess how well a patient's needs fit a doctor, for a lead list the doctor will read.

You receive JSON with the patient's age, gender, city, state and self-reported issues, and the doctor's specialty, city and state. The patient has just viewed the doctor's profile.

Reply with JSON only: {"score": <integer 1-10>, "summary": "<one or two sentences, max 40 words>"}

Scoring guide:
- 8-10: the patient's issues clearly fall within the doctor's specialty, and the location is the same city or workable.
- 5-7: partial fit, unclear specialty match, or the patient provided little information.
- 1-4: the issues are outside the doctor's specialty, or the location makes in-person care impractical.

The summary is addressed to the doctor, states the patient's main issues and the reason for the score, and never makes a diagnosis. If there is little data, say so.`;
