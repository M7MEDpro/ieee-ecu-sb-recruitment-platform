/**
 * @file route.ts
 * @brief Append-Only Applicant Ingestion Endpoint for IEEE ECU SB Recruitment.
 * @details Server-side execution guaranteeing:
 *          - Full input validation (Email, Phone, Egyptian 14-digit National ID).
 *          - Strict enforcement of Team Selection Rules (Max 1 Tech, Max 1 Non-Tech, Min 1 Total).
 *          - Atomic database transaction.
 *          - High concurrency resilience (100+ parallel submissions).
 *          - Append-only security: no public update or deletion.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-18
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateEgyptianNationalId,
  validateTeamSelection,
  validateEgyptianPhoneNumber,
} from '@ieee-recruitment/shared';
import { createApplicationAtomically, getRecruitmentStatus } from '@/lib/db';

const applicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, 'Full name must be at least 3 characters.')
    .max(100, 'Full name cannot exceed 100 characters.')
    .refine((val) => val.split(/\s+/).length >= 2, {
      message: 'Please provide at least your first and last name.',
    }),
  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^(010|011|012|015)\d{8}$/,
      'Please provide a valid Egyptian phone number (e.g. 01012345678, 011..., 012..., 015...).'
    ),
  email: z
    .string()
    .trim()
    .min(5, 'Email address is required.')
    .max(120, 'Email address is too long.')
    .email('Please enter a valid email address.'),
  nationalId: z.string().trim(),
  faculty: z.string().trim().min(1, 'Please select your faculty.'),
  academicLevel: z.string().trim().min(1, 'Please select your academic level.'),
  selectedTeamIds: z
    .array(z.string())
    .min(1, 'You must select at least one team.'),
});

export async function POST(request: Request) {
  try {
    const status = await getRecruitmentStatus();
    if (status === 'CLOSED') {
      return NextResponse.json(
        {
          success: false,
          error: 'Applications are currently closed for IEEE ECU Recruitment 2026-2027.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 1. Zod Base Validation
    const parsed = applicationSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input.';
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const {
      fullName,
      phoneNumber,
      email,
      nationalId,
      faculty,
      academicLevel,
      selectedTeamIds,
    } = parsed.data;

    // 2. Strict Egyptian National ID Validation
    const idValidation = validateEgyptianNationalId(nationalId);
    if (!idValidation.isValid) {
      return NextResponse.json(
        { success: false, error: idValidation.errorMessage },
        { status: 400 }
      );
    }

    // 2.1 Strict Egyptian Phone Validation (11 digits, starts with 0, valid prefix 010/011/012/015)
    const phoneValidation = validateEgyptianPhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.errorMessage },
        { status: 400 }
      );
    }

    // 3. Strict Team Selection Rules
    const teamValidation = validateTeamSelection(selectedTeamIds);
    if (!teamValidation.isValid) {
      return NextResponse.json(
        { success: false, error: teamValidation.errorMessage },
        { status: 400 }
      );
    }

    // 4. Atomic Ingestion
    const result = await createApplicationAtomically({
      fullName,
      phoneNumber,
      email,
      nationalId,
      faculty,
      academicLevel,
      selectedTeamIds: teamValidation.allSelectedTeams.map((t) => t.id),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your application has been received and safely stored.',
        applicantId: result.id,
        createdAt: result.createdAt,
        selectedTeams: teamValidation.allSelectedTeams.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.broadCategory,
        })),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API:apply] Submission error:', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err.message ||
          'An error occurred while processing your application. Please try again.',
      },
      { status: 400 }
    );
  }
}
