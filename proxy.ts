import { NextResponse, type NextRequest } from "next/server";
import { STUDENT_COOKIE, TEACHER_COOKIE, verifyToken, type StudentSession, type TeacherSession } from "@/lib/auth/session";

/**
 * Rychlá kontrola cookie před renderem. Vlastnictví dat se ověřuje až ve
 * stránkách a server actions (requireTeacher / requireStudent).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ucitel") && pathname !== "/ucitel/prihlaseni") {
    const session = await verifyToken<TeacherSession>(request.cookies.get(TEACHER_COOKIE)?.value);
    if (!session) {
      const url = new URL("/ucitel/prihlaseni", request.url);
      return NextResponse.redirect(url);
    }
  }

  const quizMatch = pathname.match(/^\/trida\/([^/]+)\/kviz\//);
  if (quizMatch) {
    const session = await verifyToken<StudentSession>(request.cookies.get(STUDENT_COOKIE)?.value);
    if (!session || session.cid !== quizMatch[1]) {
      return NextResponse.redirect(new URL(`/trida/${quizMatch[1]}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ucitel/:path*", "/trida/:path*"],
};
