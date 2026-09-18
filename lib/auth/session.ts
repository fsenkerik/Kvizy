import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const TEACHER_COOKIE = "kv_teacher";
export const STUDENT_COOKIE = "kv_student";

const TEACHER_MAX_AGE = 60 * 60 * 24 * 7; // 7 dní
const STUDENT_MAX_AGE = 60 * 60 * 12; // 12 hodin

export type TeacherSession = { tid: string };
export type StudentSession = { sid: string; cid: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("Chybí AUTH_SECRET (min. 16 znaků) v prostředí.");
  return new TextEncoder().encode(s);
}

export async function signToken(payload: Record<string, unknown>, maxAgeSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(secret());
}

export async function verifyToken<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function setTeacherSession(teacherId: string) {
  const token = await signToken({ tid: teacherId } satisfies TeacherSession, TEACHER_MAX_AGE);
  (await cookies()).set(TEACHER_COOKIE, token, cookieOptions(TEACHER_MAX_AGE));
}

export async function getTeacherSession() {
  return verifyToken<TeacherSession>((await cookies()).get(TEACHER_COOKIE)?.value);
}

export async function clearTeacherSession() {
  (await cookies()).delete(TEACHER_COOKIE);
}

export async function setStudentSession(studentId: string, classId: string) {
  const token = await signToken({ sid: studentId, cid: classId } satisfies StudentSession, STUDENT_MAX_AGE);
  (await cookies()).set(STUDENT_COOKIE, token, cookieOptions(STUDENT_MAX_AGE));
}

export async function getStudentSession() {
  return verifyToken<StudentSession>((await cookies()).get(STUDENT_COOKIE)?.value);
}

export async function clearStudentSession() {
  (await cookies()).delete(STUDENT_COOKIE);
}
