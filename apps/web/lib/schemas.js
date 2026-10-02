import { z } from 'zod'

export const DoctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.enum(['AUDIOLOGIST', 'SPEECH_THERAPIST', 'BOTH']),
  subTags: z.array(
    z.enum([
      'CHILD_SPEECH',
      'ADULT_SPEECH',
      'HEARING_TEST',
      'AUDIOLOGIST',
      'SPEECH_THERAPIST',
    ])
  ),
  qualification: z.string(),
  clinic: z.string(),
  locality: z.string(),
  city: z.string(),
  experienceYears: z.number(),
  languages: z.array(z.string()),
  consultModes: z.array(z.enum(['CLINIC', 'HOME_VISIT', 'ONLINE'])),
  phone: z.string(),
  whatsapp: z.string(),
  availability: z.enum(['AVAILABLE_TODAY', 'NEXT_2_DAYS', 'BUSY']),
})

export const DoctorListSchema = z.array(DoctorSchema)



