export const config = {
  matcher: "/l/:path*",
};

export default function middleware(request) {
  const incoming = new URL(request.url);
  const id = incoming.pathname.split("/").filter(Boolean)[1] ?? "";
  const target = new URL("/launderer-link.html", incoming.origin);
  if (id) target.searchParams.set("id", id);
  return Response.redirect(target, 307);
}
