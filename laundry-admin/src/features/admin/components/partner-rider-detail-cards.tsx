import type { AdminPartnerRider } from "@/features/admin/types/admin-partner-kyc";

type PartnerRiderDetailCardsProps = {
  riders: AdminPartnerRider[];
  responsibilityAcceptedAt?: string | null;
  formatDate?: (value: string | null) => string;
};

function defaultFormatDate(value: string | null): string {
  if (!value) return "Not recorded";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function PartnerRiderDetailCards({
  riders,
  responsibilityAcceptedAt = null,
  formatDate = defaultFormatDate,
}: PartnerRiderDetailCardsProps) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-white/65 sm:text-[13px]">
        Responsibility accepted: {formatDate(responsibilityAcceptedAt)}
      </p>

      {riders.length === 0 ? (
        <p className="text-[12px] text-white/60">No riders listed.</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {riders.map((rider, index) => (
            <li
              key={rider.id}
              className="rounded-xl border p-3.5 sm:p-4"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
                Rider {index + 1}
              </p>

              <dl className="mt-3 space-y-2.5 text-[13px] sm:text-[14px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/55">Name</dt>
                  <dd className="mt-0.5 font-medium text-white">{rider.name}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-white/55">Phone</dt>
                  <dd className="mt-0.5 text-white">{rider.phone}</dd>
                </div>
                {rider.createdAt ? (
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-white/55">Added on</dt>
                    <dd className="mt-0.5 text-white">{formatDate(rider.createdAt)}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
                  Face photo
                </p>
                {rider.photoUrl ? (
                  <div className="mt-2 space-y-2">
                    <div
                      className="relative h-44 w-44 overflow-hidden rounded-xl border bg-black/20"
                      style={{ borderColor: "rgba(255,255,255,0.15)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rider.photoUrl}
                        alt={`${rider.name} face photo`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <a
                      href={rider.photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-[12px] font-medium text-[#ABE9FE] underline"
                    >
                      Open full size
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-white/55">No photo uploaded</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
